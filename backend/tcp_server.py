"""
KVH GPS Fleet — TCP Server
Protocol: GT06 / GT06N
Port: 5023
"""
import socket, threading, struct, requests, json
from datetime import datetime

HOST     = '0.0.0.0'
# Back to 443 — confirmed via journalctl that the tracker DID silently accept
# the SERVER,...,443,0# SMS command (no "OK" reply, but it actually applied,
# same as the earlier RESET# case): we saw real successful LOGIN + heartbeat
# exchanges from this device while the server was running on 443. Don't flip
# this back to 5023 again without checking the device's current SERVER config.
PORT     = 443
API_BASE = 'http://127.0.0.1:8000/api'
TIMEOUT  = 120   # seconds before idle connection closes

# ── CRC-16/X-25 (what GT06 actually uses — reflected poly 0x1021,
#    i.e. 0x8408 bit-reversed, with inverted output). The earlier
#    non-reflected version here computed a different checksum than
#    the tracker does, so every login ACK we sent back had a wrong
#    CRC — the tracker silently rejected it and just kept retrying
#    login forever instead of ever sending GPS data. ────────────
def crc16(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 0x0001:
                crc = (crc >> 1) ^ 0x8408
            else:
                crc >>= 1
    return (~crc) & 0xFFFF

# ── Build response packet ──────────────────────────────────────
def build_response(protocol: int, serial: int) -> bytes:
    body  = struct.pack('>BH', protocol, serial)   # [protocol] [serial 2B]
    crc   = crc16(struct.pack('>B', len(body)+2) + body)
    return (
        bytes([0x78, 0x78])             +   # start
        struct.pack('>B', len(body)+2)  +   # length
        body                            +   # protocol + serial
        struct.pack('>H', crc)          +   # CRC
        bytes([0x0D, 0x0A])                 # end
    )

# ── Decode BCD-encoded IMEI (8 bytes → 15-digit string) ───────
def decode_imei(raw: bytes) -> str:
    # 8 raw bytes = 16 hex nibbles for a 15-digit IMEI — the LEADING nibble is the
    # padding/type nibble (always comes out as '0' here), not the trailing one.
    # e.g. raw hex '0865784056472668' -> real IMEI is '865784056472668'.
    hex_str = raw.hex()
    return hex_str[1:]             # drop the leading padding nibble, keep all 15 real digits

# ── Parse latitude / longitude ────────────────────────────────
# Raw is in units of 1/30000 of a minute of arc, i.e. raw/1,800,000 = degrees
# directly. (The previous version here did `raw // 30000` and called that
# "degrees" — but raw/30000 is actually *total minutes*, not degrees, so it
# produced values like 6296° instead of ~104°. This was never caught before
# because gps_simulator.py encoded coordinates with the same inverted math,
# so simulated data round-tripped fine while real hardware data — encoded
# per the actual GT06 spec — decoded as garbage.)
def decode_coord(raw: int, is_south_or_west: bool) -> float:
    val = raw / 1_800_000.0
    return -val if is_south_or_west else val

# ── Parse a full GT06 packet from buffer ──────────────────────
def parse_packet(data: bytes):
    """
    Returns dict with parsed fields, or None if packet invalid.
    Modifies nothing — pure parsing only.
    """
    if len(data) < 10:
        return None

    # Find start bytes
    idx = data.find(b'\x78\x78')
    if idx == -1:
        return None

    data = data[idx:]
    if len(data) < 5:
        return None

    pkt_len  = data[2]            # length byte
    total    = pkt_len + 5        # start(2) + len(1) + body + crc(2) + end(2)
    if len(data) < total:
        return None               # wait for more data

    protocol = data[3]
    payload  = data[4 : 4 + pkt_len - 4]   # strip protocol + serial + crc
    serial_b = data[4 + pkt_len - 4 : 4 + pkt_len - 2]
    serial   = struct.unpack('>H', serial_b)[0] if len(serial_b)==2 else 0

    # CRC check — covers the length byte + protocol + content + serial
    # (everything up to but not including the CRC field itself). The
    # previous slices here were both shifted one byte too far: crc_data
    # was swallowing the first CRC byte, and received_crc was reading the
    # second CRC byte + the first stop byte instead of the real 2 CRC
    # bytes. This never blocked login/GPS/ack handling (crc_ok is only
    # logged, never checked), but it meant the CRC: ✅/❌ log line was
    # never trustworthy.
    crc_data     = data[2 : pkt_len + 1]
    received_crc = struct.unpack('>H', data[pkt_len+1 : pkt_len+3])[0]
    computed_crc = crc16(crc_data)
    crc_ok       = received_crc == computed_crc

    result = {
        'protocol':  protocol,
        'serial':    serial,
        'crc_ok':    crc_ok,
        'raw':       data[:total].hex(),
        'consumed':  total,
    }

    # ── 0x01 LOGIN ───────────────────────────────────────────
    if protocol == 0x01 and len(data) >= 18:
        imei_raw = data[4:12]
        result['type'] = 'login'
        result['imei'] = decode_imei(imei_raw)

    # ── 0x10 / 0x12 GPS DATA ──────────────────────────────────
    # Both protocol numbers carry the exact same field layout for the parts
    # we need (date/time, satellites, lat, lng, speed, course) — 0x12 just
    # has extra LBS/cell-tower bytes tacked on after, which we ignore. This
    # device sends 0x12, not 0x10 — before this fix 0x12 fell into the
    # "unknown" branch below and every real GPS fix was silently dropped.
    elif protocol in (0x10, 0x12) and len(data) >= 30:
        try:
            d  = data[4]
            mo = data[5]
            dy = data[6]
            hr = data[7]
            mn = data[8]
            sc = data[9]
            year = 2000 + d
            ts = f'{year:04d}-{mo:02d}-{dy:02d} {hr:02d}:{mn:02d}:{sc:02d}'

            gps_info = data[10]
            sats     = gps_info & 0x0F

            lat_raw  = struct.unpack('>I', data[11:15])[0]
            lng_raw  = struct.unpack('>I', data[15:19])[0]
            speed    = data[19]
            course   = struct.unpack('>H', data[20:22])[0]

            # Bit 2 of the course/status high byte: 0=south, 1=north.
            # Bit 3: confirmed from this device's real packets to be
            # 0=east, 1=west (the opposite of what was assumed before —
            # every real fix from this tracker had bit3=0 while the
            # device is physically in Cambodia, i.e. east, so the old
            # `is_east = bool(... & 0x08)` had every fix landing as a
            # negative/west longitude).
            course_high = data[20]
            is_north = bool(course_high & 0x04)
            is_east  = not bool(course_high & 0x08)

            lat = decode_coord(lat_raw, not is_north)
            lng = decode_coord(lng_raw, not is_east)

            result['type']      = 'gps'
            result['timestamp'] = ts
            result['lat']       = round(lat, 6)
            result['lng']       = round(lng, 6)
            result['speed']     = speed
            result['course']    = course & 0x01FF
            result['satellites']= sats
        except Exception as e:
            result['type']  = 'gps'
            result['error'] = str(e)

    # ── 0x13 HEARTBEAT ───────────────────────────────────────
    elif protocol == 0x13:
        result['type'] = 'heartbeat'

    # ── 0x16 ALARM ───────────────────────────────────────────
    elif protocol == 0x16:
        result['type']       = 'alarm'
        result['alarm_type'] = data[4] if len(data) > 4 else 0xFF

    else:
        result['type'] = f'unknown_0x{protocol:02X}'

    return result

# ── Update Django via API ──────────────────────────────────────
def api_update_gps(imei: str, lat: float, lng: float, speed: int, course: int):
    try:
        requests.post(
            f'{API_BASE}/vehicles/receive-gps/',
            json={ 'imei':imei, 'lat':lat, 'lng':lng, 'speed':speed, 'course':course },
            timeout=3,
        )
    except Exception:
        pass   # API might not be ready — silently skip

def api_update_device_status(imei: str, status: str):
    try:
        requests.post(
            f'{API_BASE}/vehicles/device-status/',
            json={ 'imei':imei, 'status':status },
            timeout=3,
        )
    except Exception:
        pass

# ── Handle one connected client ────────────────────────────────
def handle_client(conn: socket.socket, addr):
    ip    = addr[0]
    imei  = None
    buf   = b''

    log = lambda msg: print(f'[{datetime.now().strftime("%H:%M:%S")}] {msg}')
    log(f'🔌 Connected: {ip}')

    conn.settimeout(TIMEOUT)

    try:
        while True:
            try:
                chunk = conn.recv(1024)
            except socket.timeout:
                log(f'⏰ Timeout — {ip} ({imei or "no login"})')
                break

            if not chunk:
                break

            buf += chunk
            log(f'📥 RAW ({len(chunk)} bytes): {chunk.hex()}')

            # Parse all complete packets in the buffer
            while len(buf) >= 10:
                pkt = parse_packet(buf)

                if pkt is None:
                    # Not enough data yet — wait for more
                    break

                buf = buf[pkt['consumed']:]   # remove processed bytes
                t   = pkt.get('type', '?')

                # ── LOGIN ──────────────────────────────────────
                if t == 'login':
                    imei = pkt['imei']
                    log(f'🔑 LOGIN — IMEI: {imei} | CRC: {"✅" if pkt["crc_ok"] else "❌"}')
                    # Send login ACK
                    resp = build_response(0x01, pkt['serial'])
                    conn.send(resp)
                    log(f'📤 Login ACK sent')
                    api_update_device_status(imei, 'online')

                # ── GPS ────────────────────────────────────────
                elif t == 'gps':
                    if 'error' in pkt:
                        log(f'⚠️  GPS parse error: {pkt["error"]}')
                        continue

                    lat, lng, spd = pkt['lat'], pkt['lng'], pkt['speed']

                    if lat == 0 and lng == 0:
                        log(f'⚠️  GPS: 0,0 — no satellite fix yet (satellites={pkt.get("satellites",0)})')
                    else:
                        log(f'📍 GPS — Lat:{lat} Lng:{lng} Speed:{spd}km/h Sats:{pkt.get("satellites",0)} | {pkt.get("timestamp","")}')
                        api_update_gps(imei or '', lat, lng, spd, pkt.get('course',0))

                    # Send GPS ACK — echo back whichever protocol (0x10 or
                    # 0x12) the device actually used, not a hardcoded 0x10.
                    conn.send(build_response(pkt['protocol'], pkt['serial']))

                # ── HEARTBEAT ──────────────────────────────────
                elif t == 'heartbeat':
                    log(f'💓 Heartbeat — {imei or ip}')
                    conn.send(build_response(0x13, pkt['serial']))

                # ── ALARM ──────────────────────────────────────
                elif t == 'alarm':
                    alarm_names = { 0x01:'SOS', 0x02:'Power cut', 0x03:'Shock', 0x04:'Fence in', 0x05:'Fence out' }
                    aname = alarm_names.get(pkt.get('alarm_type'), f"0x{pkt.get('alarm_type',0):02X}")
                    log(f'🚨 ALARM — {aname} | IMEI: {imei or "?"}')
                    conn.send(build_response(0x16, pkt['serial']))

                else:
                    log(f'❓ Unknown packet type: {t}')

    except ConnectionResetError:
        log(f'❌ Connection reset by {ip}')
    except Exception as e:
        log(f'💥 Error from {ip}: {e}')
    finally:
        conn.close()
        if imei:
            api_update_device_status(imei, 'offline')
        log(f'🔌 Disconnected: {ip} ({imei or "no login"})')

# ── Main ───────────────────────────────────────────────────────
if __name__ == '__main__':
    print('\nKVH GPS Fleet — TCP Server')
    print(f'  Port: {PORT}')
    print(f'  API:  {API_BASE}/vehicles/receive-gps/')
    print('=' * 60)
    print('  Waiting for GPS devices...')
    print('=' * 60 + '\n')

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(50)

    try:
        while True:
            conn, addr = server.accept()
            t = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
            t.start()
    except KeyboardInterrupt:
        print('\n⏹  Server stopped.')
    finally:
        server.close()
