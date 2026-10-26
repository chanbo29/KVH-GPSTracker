# import socket, time, struct
# from datetime import datetime

# IMEI = '865784056472668'
# HOST = '127.0.0.1'
# PORT = 5023

# # ── CRC-ITU-T (used by GT06) ──────────────────────────────────
# def crc16(data: bytes) -> int:
#     crc = 0xFFFF
#     for byte in data:
#         crc ^= byte << 8
#         for _ in range(8):
#             crc = (crc << 1) ^ 0x1021 if crc & 0x8000 else crc << 1
#     return crc & 0xFFFF

# # ── Encode IMEI as BCD (15 digits → 8 bytes, pad with 0) ──────
# def imei_bcd(imei: str) -> bytes:
#     padded = imei + '0'          # 15 digits → 16 nibbles = 8 bytes
#     return bytes.fromhex(padded)

# # ── Build GT06 login packet (0x01) ────────────────────────────
# def build_login() -> bytes:
#     body = bytes([0x01]) + imei_bcd(IMEI) + bytes([0x00, 0x01])
#     crc  = crc16(body)
#     return (
#         bytes([0x78, 0x78])          +  # start
#         bytes([len(body) + 2])       +  # length (body + crc)
#         body                         +  # protocol + imei + serial
#         struct.pack('>H', crc)       +  # CRC
#         bytes([0x0D, 0x0A])             # end
#     )

# # ── Build GT06 GPS packet (0x10) ──────────────────────────────
# def build_gps(lat: float, lng: float, speed: int) -> bytes:
#     now  = datetime.now()
#     # Coordinates encoded as (degrees * 30000) unsigned int
#     lat_i = int(abs(lat) * 30000)
#     lng_i = int(abs(lng) * 30000)

#     body = (
#         bytes([0x10])                           +  # protocol: GPS
#         bytes([                                    # timestamp (BCD)
#             now.year  % 100,
#             now.month,
#             now.day,
#             now.hour,
#             now.minute,
#             now.second,
#         ])                                      +
#         bytes([0xC4])                           +  # GPS info: 12 sats, fixed
#         struct.pack('>I', lat_i)               +  # latitude
#         struct.pack('>I', lng_i)               +  # longitude
#         bytes([speed & 0xFF])                  +  # speed
#         bytes([0x00, 0x28])                    +  # course (north=0x28)
#         bytes([0x00, 0x01])                        # serial number
#     )
#     crc = crc16(body)
#     return (
#         bytes([0x78, 0x78])          +
#         bytes([len(body) + 2])       +
#         body                         +
#         struct.pack('>H', crc)       +
#         bytes([0x0D, 0x0A])
#     )

# # ── Build GT06 heartbeat packet (0x13) ────────────────────────
# def build_heartbeat() -> bytes:
#     body = bytes([0x13, 0x00, 0x01])
#     crc  = crc16(body)
#     return bytes([0x78,0x78,0x03]) + body + struct.pack('>H',crc) + bytes([0x0D,0x0A])

# # ── GPS route around Phnom Penh ───────────────────────────────
# ROUTE = [
#     (11.5564, 104.9282,  0),   # Start — parked
#     (11.5572, 104.9291, 25),
#     (11.5583, 104.9305, 45),
#     (11.5601, 104.9322, 58),
#     (11.5624, 104.9344, 72),   # overspeed alert fires here
#     (11.5648, 104.9368, 65),
#     (11.5668, 104.9390, 50),
#     (11.5684, 104.9412, 38),
#     (11.5700, 104.9435, 20),
#     (11.5710, 104.9450,  0),   # Stop — parked
# ]

# print(f'\n🚗 KVH GPS Simulator')
# print(f'   IMEI  : {IMEI}')
# print(f'   Server: {HOST}:{PORT}')
# print(f'   Route : {len(ROUTE)} waypoints around Phnom Penh\n')

# try:
#     sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
#     sock.connect((HOST, PORT))
#     print('✅ Connected to TCP server')

#     # Send login
#     sock.send(build_login())
#     time.sleep(1)
#     print(f'📡 Login sent — IMEI {IMEI}')
#     print(f'   Sending GPS every 10 seconds...\n')

#     step = 0
#     while True:
#         lat, lng, spd = ROUTE[step % len(ROUTE)]

#         # Every 5 steps send a heartbeat first
#         if step % 5 == 0 and step > 0:
#             sock.send(build_heartbeat())

#         sock.send(build_gps(lat, lng, spd))

#         status = '🔴 STOPPED' if spd == 0 else ('⚡ OVERSPEED' if spd > 60 else '🟢 MOVING')
#         print(f'[{datetime.now().strftime("%H:%M:%S")}] {status} — Lat:{lat} Lng:{lng} Speed:{spd} km/h')

#         step += 1
#         time.sleep(10)

# except ConnectionRefusedError:
#     print('❌ Cannot connect — is tcp_server.py running?')
#     print('   Run: python tcp_server.py')
# except KeyboardInterrupt:
#     print('\n⏹  Simulator stopped.')
# finally:
#     sock.close()