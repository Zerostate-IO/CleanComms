# TX-500 + DigiRig + fldigi Setup Guide (macOS)

This runbook covers the complete setup for running CleanComms with a Lab599 TX-500 transceiver and DigiRig mobile interface on macOS.

## Prerequisites

### Hardware

| Item | Notes |
|------|-------|
| Lab599 Discovery TX-500 | Primary radio |
| DigiRig Mobile | Audio + CAT interface |
| USB cable (A to micro-B) | DigiRig to computer |
| DB9 to 3.5mm cable | DigiRig to TX-500 ACC port |
| Antenna | Suitable for operating band |

**DigiRig Documentation:** https://digirig.net/

### Software (Pre-installed)

This guide assumes the following are already installed:

- **Hamlib** (includes `rigctld`)
- **fldigi** (digital mode modem)
- **CleanComms** (this project)

## Port Map

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| rigctld | 4532 | TCP | CAT control daemon |
| fldigi XML-RPC | 7362 | HTTP/XML | Modem control |
| CleanComms | 8080 | HTTP | Main API server |

---

## Step 1: Physical Connections

1. **Connect DigiRig to TX-500:**
   - DB9 connector → TX-500 ACC port
   - Ensure DigiRig jumper is configured for TX-500 (see DigiRig documentation)

2. **Connect DigiRig to Mac:**
   - USB-A to micro-B cable from DigiRig to Mac USB port

3. **Power on TX-500**

---

## Step 2: Identify Serial Port

macOS creates serial ports under `/dev/cu.*` for outgoing connections.

```bash
# List all serial ports
ls /dev/cu.*

# Example output:
# /dev/cu.usbserial-DI00ABC1
```

Look for a device matching `usbserial-*`. This is your DigiRig serial port.

**Troubleshooting:** If no port appears:
- Check USB cable connection
- Try a different USB port
- Allow USB accessory in System Settings > Privacy & Security

---

## Step 3: Start rigctld

rigctld provides CAT control via a TCP socket. Start it with TX-500 settings:

```bash
rigctld -m 2054 -r /dev/cu.usbserial-xxx -s 9600 -t 4532
```

| Flag | Value | Description |
|------|-------|-------------|
| `-m` | 2054 | TX-500 Hamlib model ID |
| `-r` | `/dev/cu.usbserial-xxx` | Serial port (replace `xxx` with your device) |
| `-s` | 9600 | Baud rate (TX-500 fixed at 9600) |
| `-t` | 4532 | TCP port for rigctld |

**Verify rigctld is running:**

```bash
# Test connection
echo '\get_freq' | nc localhost 4532

# Expected response: frequency in Hz
# Example: 14070000
```

---

## Step 4: Configure fldigi Audio (Manual Setup)

Audio routing on macOS must be configured manually. CleanComms does not automate this step.

### 4.1 Open fldigi Audio Settings

1. Launch fldigi
2. Go to **Configure > Audio > Devices**

### 4.2 Configure Audio Devices

| Setting | Value |
|---------|-------|
| **Capture** | DigiRig USB Audio (or similar name) |
| **Playback** | DigiRig USB Audio (or similar name) |

### 4.3 Adjust Audio Levels

1. Open **System Settings > Sound**
2. Select DigiRig as input/output device
3. Set input level to ~50% as starting point
4. Adjust in fldigi waterfall display:
   - Aim for signals at -20 to -10 dB on the waterfall
   - Avoid clipping (red peaks)

**Note:** Proper audio levels are critical for digital mode operation. Too low = weak decode; too high = distortion.

---

## Step 5: Configure fldigi for PSK31

### 5.1 Set Operating Mode

1. Go to **Configure > Modem > PSK**
2. Select **PSK31**
3. Click **Save**

### 5.2 Configure XML-RPC

1. Go to **Configure > Misc > XML-RPC**
2. Enable **XML-RPC server**
3. Set port to **7362**
4. Click **Save**

### 5.3 Verify XML-RPC

```bash
# Test fldigi XML-RPC
curl -X POST http://127.0.0.1:7362/RPC2 \
  -H "Content-Type: text/xml" \
  -d '<?xml version="1.0"?><methodCall><methodName>fldigi.version</methodName></methodCall>'

# Expected: XML response with version string
```

---

## Step 6: Start CleanComms Daemon

```bash
# From project root
./cleancomms --config configs/tx500-digirig-macos.yaml
```

**Or with Go run:**

```bash
go run ./cmd/cleancomms --config configs/tx500-digirig-macos.yaml
```

### Configuration File Reference

The config file `configs/tx500-digirig-macos.yaml` contains:

```yaml
server:
  http_addr: "127.0.0.1:8080"

rigctld:
  host: "127.0.0.1"
  port: 4532
  model_id: 2054
  serial_port: "/dev/cu.usbserial-xxx"
  baud_rate: 9600

fldigi:
  xmlrpc_addr: "http://127.0.0.1:7362"
  default_mode: "PSK31"

safety:
  ptt_timeout_seconds: 60
```

---

## Step 7: Verify Complete System

### Health Check

```bash
# Check CleanComms health endpoint
curl http://127.0.0.1:8080/health

# Expected response:
# {"status":"ok","rigctld":"connected","fldigi":"connected"}
```

### PTT Test

```bash
# Request transmit
curl -X POST http://127.0.0.1:8080/api/v1/rig/ptt \
  -H "Content-Type: application/json" \
  -d '{"state":"tx"}'

# Expected: {"status":"tx"}

# Return to receive
curl -X POST http://127.0.0.1:8080/api/v1/rig/ptt \
  -H "Content-Type: application/json" \
  -d '{"state":"rx"}'

# Expected: {"status":"rx"}
```

### Frequency Read

```bash
# Get current frequency
curl http://127.0.0.1:8080/api/v1/rig/frequency

# Expected: {"frequency_hz":14070000}
```

---

## Troubleshooting Matrix

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| **rigctld fails to start** | Serial port in use | Check for other apps using the port: `lsof /dev/cu.usbserial-*` |
| **rigctld: Connection refused** | rigctld not running | Start rigctld first, verify with `nc localhost 4532` |
| **No audio in fldigi waterfall** | Wrong audio device | Re-check fldigi audio settings, verify in System Settings > Sound |
| **fldigi XML-RPC timeout** | XML-RPC disabled | Enable in Configure > Misc > XML-RPC, set port 7362 |
| **PTT does not trigger radio** | DigiRig wiring or config | Verify DigiRig jumpers for TX-500, check ACC cable |
| **CleanComms: rigctld unhealthy** | Wrong serial port | Update `serial_port` in config file to match your device |
| **CleanComms: fldigi unhealthy** | fldigi not running or XML-RPC off | Start fldigi, verify XML-RPC enabled on port 7362 |
| **Distorted audio in waterfall** | Audio level too high | Reduce input gain in System Settings or fldigi |
| **Weak/no decode** | Audio level too low | Increase input gain, check antenna connection |
| **Serial port disappears** | USB power management | Try different USB port, disable USB sleep in Energy Saver |
| **Frequency shows 0** | rigctld communication error | Check baud rate (must be 9600), verify serial cable |

### Diagnostic Commands

```bash
# Check if serial port exists
ls -la /dev/cu.usbserial-*

# Check what's using the serial port
lsof /dev/cu.usbserial-*

# Test rigctld directly
nc localhost 4532
\get_freq
\get_mode
\get_ptt

# Check if ports are listening
lsof -i :4532   # rigctld
lsof -i :7362   # fldigi
lsof -i :8080   # CleanComms

# View CleanComms logs
# Logs are output to stdout when running the daemon
```

---

## Startup Sequence Summary

1. Power on TX-500
2. Connect DigiRig USB
3. Start rigctld: `rigctld -m 2054 -r /dev/cu.usbserial-xxx -s 9600 -t 4532`
4. Start fldigi (configure audio and XML-RPC if first run)
5. Start CleanComms: `./cleancomms --config configs/tx500-digirig-macos.yaml`
6. Verify: `curl http://127.0.0.1:8080/health`

---

## Shutdown Sequence

1. Return radio to RX: `curl -X POST http://127.0.0.1:8080/api/v1/rig/ptt -d '{"state":"rx"}'`
2. Stop CleanComms (Ctrl+C)
3. Close fldigi
4. Stop rigctld (Ctrl+C)
5. Power off TX-500

---

## References

- [DigiRig Documentation](https://digirig.net/)
- [LAB599 CAT Protocol Specification](https://downloads.lab599.com/Lab599-CAT-protocol.pdf)
- [TX-500 User Manual](https://www.manualslib.com/manual/1818895/Lab599-Discovery-Tx-500.html)
- [Hamlib Documentation](https://hamlib.sourceforge.net/)
- [fldigi Documentation](http://www.w1hkj.com/)
