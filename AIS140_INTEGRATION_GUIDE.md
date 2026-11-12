# Axona AIS-140 Telematics & Hardware Integration Guide
**Developed by Axona Software LLP**

## 1. AIS-140 Standard Overview
AIS-140 (Automotive Industry Standard 140) was drafted by the Automotive Research Association of India (ARAI) and mandated by the Ministry of Road Transport and Highways (MoRTH) for public transport vehicles and commercial fleets.

Key mandated capabilities:
- Dual-SIM support (eSIM + physical SIM)
- IRNSS (NavIC) and GPS satellite positioning
- Emergency SOS physical panic buttons with dedicated alerting
- Internal backup battery (minimum 4-hour operation)
- Health telemetry (main power disconnect, enclosure tamper switch)
- Configurable reporting intervals (e.g., 5 seconds moving, 10 minutes stopped)

---

## 2. Packet Specifications

### 2.1 Standard AIS-140 ASCII PVT Packet
Format:
```
$PVT,<IMEI>,<DATE>,<TIME>,<LAT>,<LAT_DIR>,<LON>,<LON_DIR>,<SPEED>,<HEADING>,<SATS>,<ALTITUDE>,<IGNITION>,<MAIN_POWER>,<EMERGENCY>,<TAMPER>*<CHECKSUM>
```

Field Definitions:
1. `$PVT`: Header (Position, Velocity, Time)
2. `<IMEI>`: 15-digit International Mobile Equipment Identity
3. `<DATE>`: DDMMYYYY
4. `<TIME>`: HHMMSS (UTC or IST)
5. `<LAT>`: Latitude (e.g. `18.591200`)
6. `<LAT_DIR>`: Latitude direction (`N` or `S`)
7. `<LON>`: Longitude (e.g. `073.738900`)
8. `<LON_DIR>`: Longitude direction (`E` or `W`)
9. `<SPEED>`: Speed over ground in km/h (`000.0` to `999.9`)
10. `<HEADING>`: Compass heading in degrees (`000.0` to `359.9`)
11. `<SATS>`: Number of satellites locked (`00` to `32`)
12. `<ALTITUDE>`: Altitude above sea level in meters
13. `<IGNITION>`: Digital Input 1 (`1` = ON, `0` = OFF)
14. `<MAIN_POWER>`: External power status (`1` = Connected, `0` = Disconnected/Battery)
15. `<EMERGENCY>`: Hardware panic button (`1` = SOS Active, `0` = Normal)
16. `<TAMPER>`: Enclosure tamper switch (`1` = Tampered, `0` = Normal)
17. `*<CHECKSUM>`: XOR checksum of all characters between `$` and `*` in 2-digit hex

Example:
```
$PVT,864201045892110,12112026,143000,18.591200,N,073.738900,E,48.5,85.0,14,560,1,1,0,0*7F
```

---

## 3. Remote Immobilisation Safety Architecture

### 3.1 Strict Safety Requirements
- **NO IN-MOTION CUTOFF**: The server-side safety validator strictly checks that the vehicle speed is exactly `0.0 km/h` and that the vehicle has been stationary before dispatching any starter relay command.
- **START PREVENT ONLY**: The output relay controls the vehicle starter circuit (crank signal), NOT the fuel pump or ignition coil while driving. This prevents engine start when parked, without cutting an active engine on a highway.
- **TWO-FACTOR AUTHENTICATION**: A 4-digit security PIN is verified before the server dispatches the command.
- **AUDIT LOG**: Every command, user ID, IP address, timestamp, vehicle speed, and device ACK response is permanently recorded in `remote_commands` and `audit_logs`.

---

## 4. Testing & Verification
You can test packet ingestion via the **Device Management** screen in the Axona UI using the **AIS-140 Packet Tester**, or via curl:

```bash
curl -X POST http://localhost:5055/api/devices/ingest \
  -H "Content-Type: application/json" \
  -d '{"packet": "$PVT,864201045892110,12112026,143000,18.591200,N,073.738900,E,52.0,85.0,14,560,1,1,0,0*7F"}'
```

Response:
```json
{
  "status": "PROCESSED",
  "imei": "864201045892110",
  "vehicle_id": "veh_1",
  "registration_number": "MH-12-RN-2024",
  "speed": 52.0,
  "heading": 85.0,
  "movementStatus": "moving",
  "ack": "$ACK,864201045892110,SUCCESS*79"
}
```
