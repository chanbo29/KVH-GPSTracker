"""
KVH GPS Fleet — Simulator
Fakes a GT06 tracker sending login/heartbeat/GPS packets to tcp_server.py,
so you can test and demo the whole pipeline (TCP server -> Django API ->
Live Tracking map) without depending on the physical tracker or its SIM.
"""
import socket, time, struct
from datetime import datetime

IMEI = '865784056472668'   # must match a real vehicle's imei in your database
HOST = '127.0.0.1'         # '127.0.0.1' if running this ON the VPS itself,
                            # or '208.122.29.50' if running it from elsewhere
PORT = 443                  # must match tcp_server.py's current PORT

# ── CRC-16/X-25 — the exact algorithm tcp_server.py uses to validate and
#    build packets (reflected poly 0x8408, init 0xFFFF, inverted output) ──
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

# ── Encode IMEI as BCD (15 digits -> 8 bytes). Real GT06 devices pad with
#    a LEADING nibble, not a trailing one — confirmed from actual hardware
#    packets, and must match tcp_server.py's decode_imei() exactly or the
#    simulated vehicle's IMEI won't match any real vehicle record. ──────
def imei_bcd(imei: str) -> bytes:
    padded = '0' + imei          # 1 pad nibble + 15 real digits = 16 nibbles = 8 bytes
    return bytes.fromhex(padded)

# ── CRC covers [length byte + protocol + content + serial] — NOT the body
#    alone. pkt_len itself counts protocol+content+serial+CRC (NOT the
#    length byte or start/stop bytes) — matches tcp_server.py's parser. ──
def _wrap(protocol_and_body: bytes) -> bytes:
    pkt_len = len(protocol_and_body) + 2   # + 2 for the CRC that follows
    crc = crc16(bytes([pkt_len]) + protocol_and_body)
    return (
        bytes([0x78, 0x78])        +   # start
        bytes([pkt_len])           +   # length
        protocol_and_body          +   # protocol + content + serial
        struct.pack('>H', crc)     +   # CRC
        bytes([0x0D, 0x0A])            # end
    )

# ── Build GT06 login packet (0x01) ────────────────────────────
def build_login() -> bytes:
    body = bytes([0x01]) + imei_bcd(IMEI) + bytes([0x00, 0x01])  # protocol + imei + serial
    return _wrap(body)

# ── Build GT06 GPS packet (0x10) ──────────────────────────────
def build_gps(lat: float, lng: float, speed: int) -> bytes:
    now = datetime.now()
    lat_i = int(abs(lat) * 30000)
    lng_i = int(abs(lng) * 30000)

    body = (
        bytes([0x10])                           +  # protocol: GPS
        bytes([                                    # timestamp (BCD-ish, one byte each)
            now.year % 100,
            now.month,
            now.day,
            now.hour,
            now.minute,
            now.second,
        ])                                      +
        bytes([0xC4])                           +  # GPS info: 12 satellites, fixed
        struct.pack('>I', lat_i)                +  # latitude
        struct.pack('>I', lng_i)                +  # longitude
        bytes([speed & 0xFF])                   +  # speed
        bytes([0x00, 0x28])                     +  # course (north, GPS-real-time bits set)
        bytes([0x00, 0x01])                         # serial number
    )
    return _wrap(body)

# ── Build GT06 heartbeat packet (0x13) ────────────────────────
def build_heartbeat() -> bytes:
    body = bytes([0x13, 0x00, 0x01])   # protocol + serial
    return _wrap(body)

# ── GPS route around Phnom Penh ───────────────────────────────
ROUTE = [
    (11.5564, 104.9282,  0),   # Start — parked
    (11.5572, 104.9291, 25),
    (11.5583, 104.9305, 45),
    (11.5601, 104.9322, 58),
    (11.5624, 104.9344, 72),   # overspeed alert fires here
    (11.5648, 104.9368, 65),
    (11.5668, 104.9390, 50),
    (11.5684, 104.9412, 38),
    (11.5700, 104.9435, 20),
    (11.5710, 104.9450,  0),   # Stop — parked
]

print(f'\n🚗 KVH GPS Simulator')
print(f'   IMEI  : {IMEI}')
print(f'   Server: {HOST}:{PORT}')
print(f'   Route : {len(ROUTE)} waypoints around Phnom Penh\n')

sock = None
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((HOST, PORT))
    print('✅ Connected to TCP server')

    sock.send(build_login())
    time.sleep(1)
    print(f'📡 Login sent — IMEI {IMEI}')
    print(f'   Sending GPS every 10 seconds...\n')

    step = 0
    while True:
        lat, lng, spd = ROUTE[step % len(ROUTE)]

        if step % 5 == 0 and step > 0:
            sock.send(build_heartbeat())

        sock.send(build_gps(lat, lng, spd))

        status = '🔴 STOPPED' if spd == 0 else ('⚡ OVERSPEED' if spd > 60 else '🟢 MOVING')
        print(f'[{datetime.now().strftime("%H:%M:%S")}] {status} — Lat:{lat} Lng:{lng} Speed:{spd} km/h')

        step += 1
        time.sleep(10)

except ConnectionRefusedError:
    print('❌ Cannot connect — is tcp_server.py running on that host/port?')
except KeyboardInterrupt:
    print('\n⏹  Simulator stopped.')
finally:
    if sock:
        sock.close()
