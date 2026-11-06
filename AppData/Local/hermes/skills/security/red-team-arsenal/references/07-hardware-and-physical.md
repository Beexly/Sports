# 07 — Hardware and Physical Layer

Scope: authorized red-team / penetration-test use only, under written RoE naming target, bands, and hardware. UNVERIFIED = not confirmed against a primary source this pass.

## Repo registry (gh api repos/O/R, 2026-11-06)

- `RfidResearchGroup/proxmark3` — 6210 stars, master, GPL-3.0, "Iceman Fork - Proxmark3", pushed 2026-11-06.
- `greatscottgadgets/hackrf` — 8202 stars, main, GPL-2.0, "low cost software radio platform", pushed 2026-11-06.
- `flipperdevices/flipperzero-firmware` — 16844 stars, dev, GPL-3.0, pushed 2026-10-30.
- `aircrack-ng/aircrack-ng` — 7869 stars, master, GPL-2.0, "WiFi security auditing tools suite", pushed 2026-10-09.
- `RoganDawes/P4wnP1_aloa` — 4450 stars, pushed 2023-10-26 (desc: turns Raspberry Pi Zero W into "flexible, low-cost platform for pentesting, red teaming and physical engagements … A Little Offensive Appliance").
- `djsime1/awesome-flipperzero` — 24624 stars (app/resource list, UNVERIFIED contents depth).
- `fO-000/bluing` — 1029 stars ("An intelligence gathering tool for hacking Bluetooth").
- `greatscottgadgets/ubertooth` — 2156 stars. `ZerBea/hcxdumptool` — 2223 stars, pushed 2026-10-25.

## 1. Proxmark3 (Iceman)

**What.** LF/HF RFID/NFC reader/emulator. Commands in `client/src/cmdhf*.c`, `cmdlf*.c`. Verified: `cmdhf.c:75` `hf search`, `cmdhf.c:678` registers search; `cmdhf14a.c:837` `hf 14a reader`, `cmdhf14a.c:1073` `hf 14a sim`, `cmdhf14a.c:993` info; `cmdhfmf.c:2994` `hf mf autopwn`, `cmdhfmf.c:1697` dump, `cmdhfmf.c:1302` darkside, `cmdhfmf.c:2082` nested, `cmdhfmf.c:2739` hardnested; `cmdhficlass.c:1876` reader, `cmdhficlass.c:2814` dump, `cmdhficlass.c:1064` sim; `cmdhfmfdes.c:998` `hf mfdes info`, `cmdhfmfdes.c:1615` chk (note: file is `cmdhfmfdes.c`, not `cmdhfdes.c`); `cmdlf.c:1957` `lf search`; `cmdlfem410x.c:625` `lf em 410x clone` ("clone EM410x Tag ID to T55x7, Q5/T5555 or EM4305/4469"), `cmdlfem410x.c:400` reader; `cmdlfhid.c:415` `lf hid clone -w H10301 --fc 118 --cn 1603 --em`, `cmdlfhid.c:267` reader, `cmdlfhid.c:321` sim.
**Install.** Clone, `make -C client` + firmware; Proxmark3 Easy/RDV4. Check LF+HF antennas; HF range 1–3 cm.
**Surface.** 125 kHz LF (EM410x, HID Prox, Indala, T55xx); 13.56 MHz HF (ISO 14443A/14a, MIFARE Classic, DESFire, iCLASS, FeliCa, 15693). Sniff: `hf 14a sniff` (`cmdhf14a.c:1258`), `hf iclass sniff` (`cmdhficlass.c:1013`).
**Recipes.** Unknown: `hf search`/`lf search` → tech+UID. MIFARE: `hf mf autopwn` → `hf mf dump --4k`. LF: `lf em 410x reader`/`lf hid reader` → `clone` to T55x7/EM4305 → reader again. iCLASS: `hf iclass info` → dump → `hf iclass sim -t 7` (hint `cmdhficlass.c:1072`).
**Limits.** Nested/hardnested need valid key + correct variant; iCLASS elite-key needs elite key/LoCLASS (`cmdhficlass.c:1192`); DESFire EV2/EV3 with strong keys not autobroken (`mfdes chk` tests keys, doesn't bypass AES).
**Cost.** Easy-class US$90–150 UNVERIFIED; blanks extra UNVERIFIED.
**OPSEC.** Reader field conspicuous; cloned cards are bearer credentials — chain of custody.

## 2. HackRF

**What.** TX/RX SDR; vendor: "capable of transmission or reception of radio signals from 1 MHz to 6 GHz" (greatscottgadgets.com/hackrf/one/). Tools in `host/hackrf-tools/src/`: `hackrf_transfer.c`, `hackrf_sweep.c`, `hackrf_info.c`, `hackrf_clock.c`, `hackrf_operacake.c`.
**Install.** Build `host/libhackrf` + `host/hackrf-tools` (CMake) or distro pkg. `hackrf_info` prints serial/firmware (`hackrf_info.c:120-141,186`).
**Surface.** `hackrf_transfer.c:650-692` usage: `-f freq_hz` (659), `-a amp_enable` (673), `-l` LNA 0–40 dB (675), `-g` VGA 0–62 dB (676), `-x` TX VGA 0–47 dB (677), `-s sample_rate` (678); limits `hackrf_transfer.c:100-102` 2–20 Msps, default 10 MHz; 8-bit I/Q `wBitsPerSample 8 fixed` (146), I then Q (153). `hackrf_sweep.c` FFT sweep survey.
**Recipes.** `hackrf_transfer -r out.iq -f <hz> -s <hz> -a 1 -l 32 -g 40` → GNU Radio/URH/gqrx. TX `-t in.iq`, `-c` CW amplitude 0–127 (689) — RoE bands only.
**Limits.** Half-duplex; 8-bit (~48 dB dynamic range); 20 Msps max; low TX power (UNVERIFIED dBm); ≥1 MHz excludes LF/HF.
**Cost.** HackRF One UNVERIFIED this pass.
**OPSEC.** TX detectable on spectrum monitor. RX survey quiet; log TX minutes/frequencies.

## 3. Flipper Zero

**What.** Sub-GHz, NFC, LF RFID, iButton, IR, BadUSB. Firmware `applications/main/` = `bad_usb`, `gpio`, `ibutton`, `infrared`, `lfrfid`, `nfc`, `onewire`, `subghz`, `u2f` (gh contents API). Debug: `applications/debug/subghz_test/` (frequency + Princeton test protocols), `applications/debug/infrared_test/infrared_test.c`, `applications/debug/unit_tests/resources/unit_tests/subghz/*`, `…/nfc/*`.
**Install.** Official firmware via Flipper app/qFlipper UNVERIFIED; microSD holds apps/payloads. GPL-3.0.
**Surface.** `.sub` format (verified `…/unit_tests/subghz/came.sub`): `Filetype: Flipper SubGhz Key File / Version: 1 / Frequency: 433920000 / Preset: FuriHalSubGhzPresetOok650Async / Protocol: CAME / Bit: 24 / Key: 00 00 00 00 00 6A B2 34`. `*_raw.sub` = raw capture; plain `*.sub` = decoded. Other fixtures: `ansonic.sub`, `bett.sub`, `clemsa.sub`.
**Recipes.** Sub-GHz read → save/replay; NFC read → `.nfc` → write/emulate; LF RFID read → emulate/write; IR learn → `.ir`; BadUSB from SD file (HID event — see USB/HID).
**Limits.** Regional Sub-GHz variants (UNVERIFIED exact range); low power; rolling code defeats dumb replay; NFC cm-range.
**Cost.** US$169 (flipper.net snippet).
**OPSEC.** Instantly recognisable (orange). Captured `.sub`/`.nfc` are credential material.

**awesome-flipperzero.** `djsime1/awesome-flipperzero`, 24624 stars — community index, verify each listed app before use.

## 4. WiFi suite (aircrack-ng + hcxdumptool)

**What.** `src/` binaries: `airodump-ng`, `aireplay-ng`, `airbase-ng`, `aircrack-ng`, `airdecap-ng`, `airserv-ng`, `airtun-ng`, `wpaclean`, `besside-ng`, `wesside-ng`. Wrapper `scripts/airmon-ng.linux`; manpages `manpages/airmon-ng.8.in`, `airodump-ng.8.in`, `aireplay-ng.8.in`. PMKID fixtures `test/test-pmkid.pcap`. `ZerBea/hcxdumptool` is the PMKID/handshake capture tool; hcxtools converts to hashcat (hash IDs UNVERIFIED).
**Install.** Distro `aircrack-ng` or build; `airmon-ng check kill` first.
**Surface.** Adapters supporting monitor + injection (confirm `aireplay-ng --test`): Atheros AR9271, Ralink RT3070 (UNVERIFIED per-SKU). If injection fails, card is RX-only.
**Recipes.** `airmon-ng start wlan0` → `airodump-ng -c 6 --bssid <B> -w cap wlan0mon` → handshake: `aireplay-ng --deauth 5 -a <B> -c <client>` → `aircrack-ng -w rockyou.txt`. PMKID (no client): `hcxdumptool -i wlan0mon -o hs.pcapng` → `hcxpcapngtool` → hashcat. Evil twin `airbase-ng -e <ssid> -c 6 -a <B>` — verify flags in manpage before live use (UNVERIFIED here).
**Limits.** Handshake needs client; deauth is disruptive/WIPS-logged. PMKID only if AP emits RSN PMKID; still needs weak PSK. WPA3-SAE: no offline handshake attack UNVERIFIED outcome.
**Cost.** Adapter US$15–35 UNVERIFIED; WiFi Pineapple "Sample plans for $250.00" (Hak5 snippet) UNVERIFIED as price.
**OPSEC.** Deauth/evil-twin windows are blue-team-visible — co-ordinate and log timestamps.

## 5. BLE tooling

**What.** bettercap BLE module (docs bettercap.org/modules/ble/, retrieved live): `ble.recon on/off`, `ble.show`, `ble.clear`, `ble.enum MAC` (services+characteristics), `ble.write MAC UUID HEX_DATA` (unauthenticated characteristic write; example writes `ffffffffffffffff` to `234bfbd5e3b34536a3fe723620d4b78d`). Params `ble.device` (HCI, -1 autodetect), `ble.timeout 5`, `ble.ttl 30`. `fO-000/bluing` (1029 stars). `greatscottgadgets/ubertooth` (2156 stars) = Bluetooth Classic + BLE sniffer hardware.
**Install.** bettercap single binary + BT4/5 HCI dongle; bluing over bluez/HCI; Ubertooth firmware + `ubertooth-btle`.
**Surface.** Advertisement enum (MAC/name/RSSI), GATT walk, unauthenticated writes.
**Recipes.** bettercap: `ble.recon on` → `ble.show` → `ble.enum <MAC>` → (RoE only) `ble.write …`. Ubertooth: `ubertooth-btle -f` → Wireshark.
**Limits.** HCI host can't passively sniff BLE like Ubertooth; Ubertooth can't capture full connection traffic; encrypted/bonded GATT resists replay.
**Cost.** Dongle US$10–25 UNVERIFIED; Ubertooth UNVERIFIED.
**OPSEC.** Listening quiet; `enum`/`write` are logged connections.

## 6. SDR workflow

**What.** GNU Radio (DSP, UNVERIFIED version), Universal Radio Hacker (protocol inference, UNVERIFIED metadata), gqrx (receiver GUI), `rtl_433` (ISM/TPMS decoder: `-F json`). PortaPack H2 is common HackRF companion (UNVERIFIED).
**Install.** GNU Radio via apt (large); `rtl_433` apt/source; RTL-SDR dongle + `librtlsdr`.
**Surface.** IQ → demod → bits → decode. TPMS/weather/meters/keyfobs at 315/433/868/915 MHz.
**Recipes.** `rtl_433 -f 433920000 -F json` survey; gqrx eyeball; URH import IQ → derive protocol → export bits.
**Limits.** rtl_433 only decodes known protocols; RTL-SDR RX-only ~2.4 MHz 8-bit.
**Cost.** RTL-SDR US$25–40 UNVERIFIED.
**OPSEC.** RX passive; TX replays are transmissions — RoE bands only.

## 7. USB/HID implants (O.MG)

**What.** Hak5 O.MG Cable. Vendor tier table (shop.hak5.org/products/omg-cable): Basic Gen1 = DuckyScript 2, 8 payload slots, 4,000 keystrokes max, 120 keys/sec; Elite Gen3 = DuckyScript 3, 50–300 slots, 1,500,000 keystrokes, 890 keys/sec, plus mouse injection, self-destruct, geo-fencing, WiFi triggers, hardware keylogger, HIDX StealthLink, encrypted C2, extended WiFi range. "Latest Beta firmware" caveat on page.
**Install.** Author DuckyScript payloads; flash to slots (flow UNVERIFIED). C2 setup UNVERIFIED.
**Surface.** USB HID keyboard/mouse; optional WiFi C2; geofence-trigger.
**Recipes.** Lab VM first → slot → auto-trigger on enumeration. Geofence only in RoE area.
**Limits.** Gen1 lacks Elite C2/geofence depth. Locked-screen success depends on OS policy (see below).
**Cost.** UNVERIFIED (shop page extracted without price; community US$120 figure UNVERIFIED).
**OPSEC.** Implant until removed; C2 is network-visible; HID bursts are UEBA-visible.

## 8. Drop boxes

**P4wnP1 ALOA** (`RoganDawes/P4wnP1_aloa`). Pi Zero W gadget: HID injection + Ethernet-over-USB reverse C2 + WiFi AP/client + WiFi covert channel (see `mame82/P4wnP1_WiFi_covert_channel_client`). OLED/menu builds exist (UNVERIFIED module names). **Install:** Pi Zero W image. **Surface:** one USB cable = HID + network to host. **Recipes:** drop → safe proof payload (notepad-class) → C2 → escalate per RoE. **Limits:** 2.4 GHz WiFi only, no Ethernet, USB-gadget policy varies. **Cost:** US$25–60 UNVERIFIED. **OPSEC:** physical implant; C2 SSID is a signature.

**Rucky.** "USB HID Rubber Ducky LaunchPad" in Kali NetHunter app store (Kali 2019.3 blog) — feature set, hardware, cost UNVERIFIED. No primary repo verified.
**WHID.** UNVERIFIED entirely — no feature set cited.

## 9. Physical entry kit (class)

- **Lock bypass** (picks/bump/bypass guns) — UNVERIFIED sets; practice on training lock only.
- **Keystroke implant** (keyboard wedge, e.g. Key Grabber class) — UNVERIFIED models; collects third-party credentials if mistimed.
- **USB condom** (charge-only blocker) — UNVERIFIED models; test before use.
- **Screen crab** (thin bezel camera / "crab") — UNVERIFIED models; photo-discipline applies.

Costs: picks US$20–80 UNVERIFIED; condom US$10–20 UNVERIFIED; wedge US$100+ UNVERIFIED; crab US$30+ UNVERIFIED. OPSEC: log implant install/remove times; lock work needs RoE-named doors + witness.

## RFID/NFC ladder

| Band | Tech | Tool + command | Get |
|---|---|---|---|
| 125 kHz | EM4100 | `lf em 410x reader` → `clone --id …` | UID clone to T55x7/EM4305 |
| 125 kHz | HID Prox | `lf hid reader` → `clone -w H10301 …` | 26-bit clone, no crypto |
| 13.56 MHz | MIFARE Classic | `hf mf autopwn`, `darkside`, `nested`, `hardnested`, `dump` | Sector keys → dump |
| 13.56 MHz | DESFire | `hf mfdes info/chk/auth` | Key test + file ops; no universal break |
| 13.56 MHz | iCLASS legacy | `hf iclass info/reader/dump/sim` | Dump + elite-key (LoCLASS) path; iCLASS SE/SEOS not cloneable without keys |

## Sub-GHz

- **Fixed-code:** Flipper read → `.sub` (see §3 fields) → replay in-RoE. Also HackRF+URH path. `applications/debug/subghz_test/` test protocols.
- **Rolling code:** KeeLoq/HCS counter window — captured press replays limited times, desync re-sync needed; not dumb-replay.
- **Jammer caveats:** noise jamming likely illegal, and `hackrf_transfer -c` CW is a carrier, not a jammer. Mark jammer technique UNVERIFIED out-of-scope.
- **Region bands:** 315 MHz US, 433.05–434.79 MHz EU, 863–870 MHz EU SRD, 902–928 MHz US ISM. Wrong-band TX = FCC/ETSI compliance risk.

## WiFi

Adapter classes with monitor+injection (confirm `aireplay-ng --test`): AR9271, RT3070/RT3572, RTL8812AU patched-driver (UNVERIFIED per-SKU). Monitor: `airmon-ng start`. Handshake = client + deauth, WIPS-logged. PMKID = AP-side, `hcxdumptool` → hcxtools → hashcat, needs weak PSK. WPA3-SAE: no offline handshake attack (outcome UNVERIFIED). Evil twin `airbase-ng` clone — loudest event, co-ordinate.

## BLE

Enum via bettercap (`ble.recon/show/enum`); GATT via `ble.enum`; write via `ble.write` on unauthenticated characteristics only. Replay limited by encrypted/bonded links; Ubertooth sniffs ads only.

## SDR survey

HackRF: RX/TX 1 MHz–6 GHz, 2–20 Msps, 8-bit, half-duplex ( §2 ). Cannot: full-duplex, 16-bit range, >20 MHz BW, <1 MHz, high power (UNVERIFIED dBm). `rtl_433` covers TPMS/ISM/meter protocols. Use RTL-SDR for RX-only 433 MHz/TPMS survey — cheaper, no TX foot-gun.

## USB/HID implants

DuckyScript: `REM/STRING/DELAY/<GUI>/ENTER` lines, slot-indexed. Tiers: Basic 8 slots/4k/120 k/s; Elite 50–300/1.5M/890 k/s (§7). Elite C2/geofence UNVERIFIED procedure. Locked-screen / BYOD: payload assumes unlocked desktop at peril of typing into password field (lockout), and Windows/macOS lock screens filter HID differently. Test on lab VM; BYOD needs owner written consent.

## Drop boxes (ladder)

P4wnP1 ALOA (Pi Zero W HID+Ethernet-over-USB+WiFi) > Rucky (phone HID launcher, UNVERIFIED depth) > WHID (UNVERIFIED). All are wired implants — remove with checklist custody.

## Physical engagement checklist

1. **Access rules:** written RoE (buildings, doors, hours, bands). Verbal ≠ permission. On-site approver + phone.
2. **Tamper evidence:** timestamped photos before/after every door and port; note seals/disturbance.
3. **Photo discipline:** no faces/credential screens; SHA-256 hash photos at capture, log hash.
4. **Chain of custody:** every implant (cable, Pi, clone card, wedge) — photo, location, install/remove time, custodian initials, written removal confirmation.
5. **Data handling:** clones/dumps/key logs are credential material — encrypt, single location, delete on RoE date.
6. **Safety:** no mains work, no off-band TX, no jamming.

## Cost table (2026 street; UNVERIFIED where noted)

| Item | Price |
|---|---|
| Flipper Zero | US$169 (flipper.net) |
| Proxmark3 Easy/RDV4 | US$90–150 UNVERIFIED |
| HackRF One | UNVERIFIED |
| RTL-SDR | US$25–40 UNVERIFIED |
| WiFi adapter | US$15–35 UNVERIFIED |
| O.MG Cable | UNVERIFIED |
| WiFi Pineapple Mark-VII | $250 "sample plans" UNVERIFIED as price |
| Pi Zero W base | UNVERIFIED |
| BT dongle | US$10–25 UNVERIFIED |
| Ubertooth One | UNVERIFIED |

## Detection and blue-team visibility (per layer)

- **LF/HF:** silent until door controller logs duplicate/impossible-travel. Clone *use* is the detection.
- **Sub-GHz/SDR TX:** spectrum-visible; receiver logs successful open — correlate CCTV. RX silent.
- **WiFi:** deauth rate, BSSID-mismatch, roaming abnormals all WIPS-logged. Listening silent.
- **BLE:** listening silent; `enum`/`write` are logged connections.
- **USB/HID:** new HID enumeration (OS/EDR), HID-burst UEBA, P4wnP1 CDC/network enumeration, C2 traffic. Condom physically visible.
- **Drop boxes:** physical find + unmanaged device on switch / AP client list; C2 SSID/BSSID signature.
