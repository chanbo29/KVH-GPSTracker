"""
KVH GPS Fleet — TCP Server
Protocol: GT06 / GT06N
Port: 5023
"""
import socket, threading, struct, requests, json
from datetime import datetime

HOST     = '0.0.0.0'
PORT     = 5023
API_BASE = 'http://127.0.0.1:8000/api'
TIMEOUT  = 120   # seconds before idle connection closes

# ── CRC-ITU-T (GT06 standard) ─────────────────────────────────
def crc16(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc ^= b << 8
        for _ in range(8):
            crc = (crc << 1) ^ 0x1021 if crc & 0x8000 else crc << 1
    return crc & 0xFFFF

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
    hex_str = raw.hex()            # e.g. '865784056472668 0'
    return hex_str[:15]            # drop the trailing padding nibble

# ── Parse latitude / longitude ────────────────────────────────
def decode_coord(raw: int, is_south_or_west: bool) -> float:
    degrees = raw // 30000
    minutes = (raw % 30000) / 30000 * 60
    val = degrees + minutes / 60
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

    # CRC check
    crc_data     = data[2 : 2 + pkt_len]
    received_crc = struct.unpack('>H', data[2+pkt_len:2+pkt_len+2])[0]
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

    # ── 0x10 GPS DATA ────────────────────────────────────────
    elif protocol == 0x10 and len(data) >= 30:
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

            # Bit 2 of course high byte: 0=south, 1=north
            # Bit 3 of course high byte: 0=west,  1=east
            course_high = data[20]
            is_north = bool(course_high & 0x04)
            is_east  = bool(course_high & 0x08)

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

                    # Send GPS ACK
                    conn.send(build_response(0x10, pkt['serial']))

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
