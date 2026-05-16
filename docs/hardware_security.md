# Hardware Security (Raspberry Pi Phase)

This document outlines the vision for Phase B (Local Raspberry Pi hosting).

## Physical Access Control
To ensure the hardware is as secure as the software, we can implement physical locks:

### 1. Hardware Key (YubiKey / USB Key)
- The Linux OS on the Pi can be configured using **LUKS** (Linux Unified Key Setup) to require a USB key to decrypt the partition during boot.
- Alternatively, the Rust backend can be configured to check for the presence of a specific hardware token via a system call before starting.

### 2. NFC / RFID Card
- Using an NFC reader module connected to the Pi's GPIO pins.
- A script can be written to "unlock" the backend service only when a authorized card is tapped.

### 3. Power Management
- **Wake-on-LAN:** The Pi can stay in a low-power state and be "woken up" by a special packet sent from your PC when you need to sync your vault.
- **Battery Backup (UPS):** To prevent database corruption during power outages, a small UPS hat for the Raspberry Pi is recommended.

## CLI Environment
The Pi should run a headless (no GUI) version of Linux (e.g., Raspberry Pi OS Lite) to minimize the attack surface and maximize performance for the Rust backend.
