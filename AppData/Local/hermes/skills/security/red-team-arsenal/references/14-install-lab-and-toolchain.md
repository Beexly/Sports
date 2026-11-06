# Build and run: Windows 11 + WSL2 + VMs

Kali paths (kali.org/get-kali): installer (bare metal), Live USB, pre-built VMs (VMware/VirtualBox/Hyper-V/QEMU), ARM, NetHunter, cloud, containers, WSL, build scripts. ParrotOS mirrors this: bare metal / USB / VM / WSL (Core Edition only; Security Edition = `apt` tools).

## Host baseline

Ludus minimums are the published floor (docs.ludus.cloud): x86_64 with `vmx`/`svm` in `/proc/cpuinfo`, Passmark > 6,000, 32 GB RAM, 200 GB disk (NVMe recommended), Ethernet only, Debian 12/13 or Proxmox 8/9. For the 3-VM + WSL layout below, 32 GB RAM is realistic with WSL capped; 100 GB free on the VM disk is a working floor **[UNVERIFIED sizing rule]**. WSL2 needs Windows 10 1903+ / Windows 11 (minimum Build 18362.1049; recommended 19041+) with VT-x/AMD-V enabled (kali.org/docs/wsl).

```powershell
winver
wsl --version
wsl --status
wsl --list --verbose  # columns: Name, State, Version
```

Nested virtualization: only if WSL2 runs inside a VM. In `%UserProfile%\.wslconfig`:

```ini
[wsl2]
nestedVirtualization=false
memory=8GB
processors=4
swap=8GB
swapfile=C:\temp\wsl-swap.vhdx
localhostforwarding=true
```

Keys from Microsoft Learn (wsl-config example). After editing: `wsl --shutdown`. "8 second rule": close ALL distro shells and wait ~8s for the subsystem to stop, or use `wsl --shutdown`. Check `wsl --list --running`.

Hyper-V vs VirtualBox: WSL2 runs in a Hyper-V lightweight VM. Use Hyper-V + WSL2 + Docker Desktop (one stack). Use VirtualBox only for VirtualBox-only labs (older GOAD provider). Coexistence varies by version **[UNVERIFIED]**; do not run all three fully active.

Defender exclusions (admin required). Exclusions are the fix, not disabling Defender:

```powershell
# PowerShell as Administrator
Add-MpPreference -ExclusionPath "C:\Users\Garrett\tools"
Add-MpPreference -ExclusionPath "C:\Users\Garrett\lab"
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```

Per Microsoft Learn (Defender / Add-MpPreference). Every exclusion weakens detection and is an attacker-abuse vector. Scope to lab/tool dirs only.

Snapshot discipline: `Checkpoint-Computer -Description "pre-arsenal-baseline" -RestorePointType "MODIFY_SETTINGS"` before first toolchain build **[UNVERIFIED cmdlet]**. Snapshot each VM after install + tools, before any lab run. Revert before each experiment, re-snapshot after known-good; chains bloat (Troubleshooting).

## WSL2 as kali

```powershell
wsl --install -d kali-linux
wsl --list --online
wsl --set-default-version 2
wsl --list --verbose
wsl --update
wsl --set-version kali-linux 2    # only if upgrading a WSL1 Kali
```

Kali docs: `wsl --install kali-linux` (or `wsl --update --pre-release` first for the newer distro arch). First launch prompts for a UNIX user (`kali`); then `wsl --set-default kali-linux` and `wsl -d kali-linux`. Export/import, never copy VHDX:

```powershell
wsl --export kali-linux C:\lab\backup\kali.tar
wsl --import kali-backup C:\lab\backup\kali-backup C:\lab\backup\kali.tar
wsl --export <Distribution Name> <FileName> --vhd
wsl --terminate <Distribution Name>
wsl --unregister <DistributionName>   # destructive
```

Store distro path under `%LOCALAPPDATA%\Packages\...` **[UNVERIFIED exact folder]**.

systemd in wsl.conf (needs Store WSL >= 0.67.6):

```bash
sudo nano /etc/wsl.conf
```

```ini
[boot]
systemd=true
```

Then `wsl --shutdown`, relaunch, verify: `systemctl status`, `systemctl list-unit-files --type=service`. Debian/Kali Rolling: `sudo apt-get update -y && sudo apt-get install systemd systemd-sysv -y` (Microsoft Learn). Parrot WSL docs give the identical fix. systemd does NOT keep WSL alive.

USB passthrough: WSL has no native USB. Use usbipd-win (Microsoft Learn / dorssel/usbipd-win). Needs Windows 11 Build 22000+, x64/ARM64, WSL2, kernel >= 5.10.60.1 (`wsl --update` if not):

```powershell
winget install --interactive --exact dorssel.usbipd-win
usbipd list
usbipd bind --busid 4-4         # admin; persistent
usbipd list                     # confirm "Shared"
usbipd attach --wsl --busid 4-4 # non-admin; keep a WSL shell open
```

From WSL: `lsusb` should list it. Detach: `usbipd detach --busid 4-4`. Limits: one WSL2 VM owns it; while attached Windows cannot use it; unsupported devices need a custom kernel (wiki) **[UNVERIFIED details]**; udev rules may be needed. For RF gear (HackRF-class), smartcards, flashing.

GUI via WSLg: WSLg runs Linux GUI apps as Windows windows. Full Kali desktop = Win-KeX (kali.org/docs/wsl/win-kex):

```bash
sudo apt update
sudo apt install -y kali-win-kex
kex --win -s        # window + sound
kex --sl -s         # seamless
kex --esm --ip -s   # enhanced session (RDP)
```

Or `wsl -d kali-linux kex --win -s`. Optional: `sudo apt install -y kali-linux-large`. Needs Kali in WSL2 + Windows Terminal.

Why not a teamserver in WSL: WSL2 is a NAT'd Hyper-V lightweight VM — `localhostforwarding` breaks with Docker/VPN/firewall; raw sockets / promiscuous capture need privileges WSL does not grant; inbound reachability is fragile; WSL stops when the last shell closes (systemd will not keep it alive). Run listeners in the Kali VM; WSL is for tooling, scripting, Win-KeX.

## VM layout

Hypervisor: Hyper-V (or Docker Desktop Hyper-V backend). VirtualBox only for VirtualBox-only labs. Keep one stack active.

| VM | Role | Starting allocation **[UNVERIFIED sizing]** |
|---|---|---|
| `kali-attacker` | Offense, listener, tools | 4 vCPU, 8 GB RAM, dynamic VHDX 80 GB |
| `win11-victim` | Dev + EDR victim, Atomic host | 4 vCPU, 8 GB RAM, dynamic VHDX 120 GB |
| `srvcore-dc` | Server Core DC (Desktop if RSAT needed) | 2 vCPU, 4 GB RAM, dynamic VHDX 80 GB |

32 GB RAM total with WSL capped. Disable auto Windows Update in victims during a run; patch from snapshot. Install eval EDR after the clean snapshot so you can revert to no-EDR.

Snapshot matrix:

| State | Kali | Win11 | DC |
|---|---|---|---|
| `00-clean` | yes | yes | yes |
| `01-labjoin` | yes | yes | yes |
| `02-experiment` | yes | yes | yes |

Revert victims to `02-experiment` before every run. Never snapshot a DC mid-provision; snapshot after first boot and after promotion separately.

Networking: dual NIC. NIC1 host-only / Hyper-V Internal (e.g. `192.168.56.0/24`) — no internet, no route to host LAN; SMB/Kerberos/RDP/WinRM here. NIC2 NAT (download/patch) — initial fetch only, disconnect for the run.

## Lab topologies

### GOAD full forest (Orange-Cyberdefense/GOAD)

Full AD forest builder. Providers: `virtualbox / vmware / proxmox / ludus / aws / azure`. Labs: `GOAD / GOAD-Light / MINILAB / NHA / SCCM`. TLDR (Ubuntu 22.04 host):

```bash
sudo apt install virtualbox
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install vagrant
vagrant plugin install vagrant-reload vagrant-vbguest winrm winrm-fs winrm-elevated
sudo apt install sshpass lftp rsync openssh-client python3.10-venv
git clone https://github.com/Orange-Cyberdefense/GOAD.git
cd GOAD
./goad.sh -t check -l GOAD -p virtualbox
./goad.sh -t install -l GOAD -p virtualbox
./goad.sh
```

Phases: Templating (Proxmox/Ludus) → Providing (build VMs) → Provisioning (Ansible). Config `~/.goad/goad.ini`. Python: `rich, psutil, Jinja2, pyyaml` + `ansible-core` pinned by Python (2.12.6 for <3.11, 2.18.0 for >=3.11), `pywinrm`, `ansible_runner`. Windows/WSL host prep is documented — check the site's "Linux / Windows" pages; WSL2 deep-dive **[UNVERIFIED]**. On this host run GOAD from WSL2 Kali against the VirtualBox provider; do not expect VirtualBox flags to translate to Hyper-V.

### Ludus on Proxmox (badsectorlabs/ludus)

Not a Windows box. Needs Debian 12/13 or Proxmox 8/9, 32 GB RAM, 200 GB disk, Ethernet, root, no Docker on host, no Wi-Fi. Clean dedicated host only:

```bash
ssh user@debian
su -
apt update && apt install curl sudo ca-certificates
curl --proto '=https' --tlsv1.2 -sSf https://ludus.cloud/install | bash
# inspect first: curl https://ludus.cloud/install > install.sh; cat install.sh; chmod +x install.sh; ./install.sh
ludus-install-status   # after reboot, SSH as root
```

`/opt/ludus/config.yml`: `proxmox_node, proxmox_interface, proxmox_local_ip, proxmox_gateway, proxmox_netmask, proxmox_vm_storage_pool/format, ludus_nat_interface, wireguard_port (51820), port (8080), admin_port (8081)`. Apply with `systemctl restart ludus` + `systemctl restart ludus-admin`. Assumes a single standard interface; bonded NICs break it. Keep on a second machine or Proxmox host — never on the Windows 11 + WSL2 operator host.

### Minimal 1-DC 2-client lab

No upstream installer for this exact shape. Recipe **[UNVERIFIED operator-built]**: `srvcore-dc` + two domain-joined clients on the host-only subnet, DHCP/DNS on the DC, for Kerberoasting / AS-REP / lateral movement without a full GOAD build. If the drill needs much more than 3 hosts, use GOAD or Ludus instead.

### Web-only lab

All Docker, no Windows VMs. One stack per exercise; `down -v` after.

```bash
# Vulhub: one CVE per dir (vulhub.org)
git clone --depth 1 https://github.com/vulhub/vulhub.git
cd vulhub/spring/CVE-2022-22947
docker compose up -d
docker compose down -v
```

```bash
# Juice Shop (juice-shop/juice-shop)
docker pull bkimminich/juice-shop
docker run --rm -p 127.0.0.1:3000:3000 bkimminich/juice-shop
# http://localhost:3000
```

```bash
# DVWA (digininja/DVWA)
git clone https://github.com/digininja/DVWA.git
docker version && docker compose version   # expect client + Compose v2
```

PortSwigger Web Security Academy (portswigger.net/web-security) is not a container: free interactive labs + Burp Community Edition. Pair with Juice Shop/DVWA.

### Cloud lab (LocalStack / floci) and free-tier caution

Local AWS in Docker via LocalStack and floci (floci.io/aws). Exact floci Docker run invocation **[UNVERIFIED — check floci.io/aws + github.com/floci-io/floci]**; wire AWS CLI to a local endpoint (LocalStack convention `--endpoint-url http://localhost:4566`) **[UNVERIFIED port]**. Free-tier AWS/Azure suit identity/IAM drills but carry cost, termination, and evidence risk: tag everything, set billing alarms day one, tear down programmatically (`terraform destroy` / `az group delete`), never replay production-like secrets.

### Blue-side: DetectionLab + Splunk + Atomic Red Team

DetectionLab (clong/DetectionLab — Packer+Vagrant AD with logging): Splunk forwarder, Sysmon (Hartong), WEF (Palantir), osquery+Fleet, Zeek/Suricata, Guacamole, transcript logging to `\\wef\pslogs`. Needs VirtualBox or VMware Workstation; also AWS/Azure/ESXi/HyperV/LibVirt/Proxmox. Run `prepare.[sh|ps1]` in `Vagrant/` first. Deliberately insecure, default Vagrant creds — keep off any network you care about. Repo states it is *no longer actively maintained* — pin a commit. Docs: detectionlab.network.

Splunk Enterprise in Docker (Splunk Help + hub.docker.com/r/splunk/splunk):

```bash
docker pull splunk/splunk:latest
docker run -d -p 8000:8000 \
  -e "SPLUNK_START_ARGS=--accept-license" \
  -e "SPLUNK_GENERAL_TERMS=--accept-sgt-current-at-splunk-com" \
  -e "SPLUNK_PASSWORD=<password>" \
  --name splunk splunk/splunk:latest
docker ps
# http://localhost:8000 — admin:<password>
```

`docker container stop/start <container_id>`, `docker exec -it <container_id> bash`. Needs Linux, x86-64, kernel > 4.0, Docker Engine >= 17.06.2, `overlay2`.

Atomic Red Team (redcanaryco/invoke-atomicredteam, PowerShell >= 5.0):

```powershell
Install-Module -Name invoke-atomicredteam,powershell-yaml -Scope CurrentUser
# alternative:
IEX (IWR 'https://raw.githubusercontent.com/redcanaryco/invoke-atomicredteam/master/install-atomicredteam.ps1' -UseBasicParsing)
Install-AtomicRedTeam
Install-AtomicRedTeam -getAtomics
Install-AtomicRedTeam -getAtomics -Force -noPayloads
Install-AtomicsFolder -noPayloads -Force
Install-AtomicRedTeam -InstallPath "c:\tools"
```

Framework install does NOT fetch the Atomics Folder by default (trips AV). Whitelist `<BASEPATH>\AtomicRedTeam` (default `C:\AtomicRedTeam`) or stage only the tests you run. Pair Atomic (simulate) with DetectionLab/Splunk (detect).

## Toolchain

APT (Kali WSL starts minimal). Verified loop:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y kali-linux-large   # optional: full toolset
sudo apt install -y seclists tmux zsh
```

`ls /etc/apt/sources.list.d/` / `deb-src` layout **[UNVERIFIED — inspect your image]**.

Go (go.dev/doc/install). MSI on Windows; tarball + `PATH` on Linux:

```bash
export PATH="$PATH:$(go env GOPATH)/bin"   # Linux: ~/.bashrc or ~/.profile
go version    # expect "go version go1.X.Y linux/amd64"
go env GOPATH GOBIN GOMODCACHE
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest   # [UNVERIFIED path — verify on GitHub]
```

`go install` writes to `$GOPATH/bin` (`GOBIN` overrides). On Windows reopen the terminal after the MSI so `PATH` takes effect. Pin with `@vX.Y.Z`, not `@latest`, during a lab epoch.

Rust (rust-lang.org/install). WSL/Linux: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`. Windows: `rustup-init.exe` (needs Visual Studio C++ Build Tools >= 2013). Tools in `%USERPROFILE%\.cargo\bin` / `~/.cargo/bin`:

```powershell
rustup update
rustc --version
cargo --version
```

If `rustc --version` fails, that dir is not on `PATH` — restart the console (docs warning).

Python: uv / pipx (docs.astral.sh/uv):

```powershell
winget install --id=astral-sh.uv -e
scoop install main/uv
pipx install uv      # preferred over: pip install uv
uv --version
uv self update       # standalone-installer installs only
```

`uv tool run` / `uvx` runs isolated tools; `uv pip` manages venvs. One Python per lab: pin inside Kali (`uv python pin <version>` **[UNVERIFIED subcommand]**).

nuclei/subfinder with Go on `PATH`:

```bash
nuclei -version
nuclei -update-templates   # [UNVERIFIED flag — confirm in nuclei -help]
subfinder -version
```

SecLists: `git clone https://github.com/danielmiessler/SecLists.git` **[UNVERIFIED path/case — verify on GitHub]**.

tmux/zellij: one session per lab (`tmux new -s kali`) — panes for `nmap`, `tshark`, `nuclei`, `ssh victim`. Keep the layout file in the lab repo. Binding mnemonics **[UNVERIFIED — personal config]**.

Notes: Obsidian (local Markdown, offline) or Joplin (syncable), outside the lab segment, via winget/msi **[UNVERIFIED package IDs]**.

Evidence hashing:

```bash
sha256sum evidence.zip
sha256sum -c evidence.SHA256SUMS
sha256sum -c --quiet evidence.SHA256SUMS
```

Windows-built evidence: `Get-FileHash .\evidence.zip -Algorithm SHA256` **[UNVERIFIED cmdlet]** . Hash at capture, ship the `.SHA256SUMS`.

## Portable ops kit

One encrypted USB carried between host and Kali VM. Component picks are operator-standard **[UNVERIFIED as a kit]**:

- VeraCrypt volume (verify installer hash; mount read-only when pulling evidence).
- Hash-verified binaries: `binaries.SHA256SUMS` beside every pinned tool; `sha256sum -c` before first run on a new host. Never fetch over plain HTTP.
- Offline mirrors: `apt` cache / `pip download` wheelhouse / Go module cache **[UNVERIFIED tooling]** for air-gapped runs. Test one full offline install on the Kali VM before field use.
- WireGuard profile: bring your own tunnel; test MTU (Troubleshooting) on the lab segment first.

Kit rule: if it does not boot and verify on a fresh Windows 11 + WSL2 install in under an hour, shrink it until it does.

## Container side

Docker Desktop on WSL2 (docs.docker.com/desktop/features/wsl): WSL 2 is a full Microsoft Linux kernel; the WSL 2 engine requests only the CPU/memory it needs. Enable:

1. Docker Desktop → "Use WSL 2 based engine" (default on WSL2 systems).
2. Settings → Resources → WSL Integration → enable your distro (or the default, Ubuntu).
3. Check/upgrade mode: `wsl.exe -l -v`, `wsl.exe --set-version <distro> 2`, `wsl.exe --set-default-version 2`.

Good for Vulhub, DVWA, Juice Shop, Splunk, LocalStack/floci — all verified above. Bad for C2 teamservers/listeners: container port publishing + NAT + no raw-socket privileges + image sprawl make listeners fragile and loud. Run listeners in the Kali VM; containers are victims/services, not the operator plane.

## Version pinning and update cadence

- Kali: track `kali-rolling` weekly; record image date + SHA256 from `kali.org/get-kali` for your exact file (do not hardcode a hash from a blog). After `apt upgrade`, re-snapshot `00-clean`.
- GOAD: pin a git commit tag per exercise (`git checkout <tag>`); `~/.goad/goad.ini` records lab + provider + ip_range. Rebuild from tag, never `master` mid-exercise.
- Ludus: installer picks latest stable (ignores `-beta`); record `ludus-install-status` + `/opt/ludus/config.yml`. No mid-range auto-upgrade.
- Docker targets: pin tags (`bkimminich/juice-shop:vX.Y.Z`, `splunk/splunk:10.4`) not `:latest` (Vulhub tracks its own per-CVE dirs).
- Go/Rust/Python: `@vX.Y.Z` / versioned installs where supported **[UNVERIFIED flags]**; re-hash after every install.

Pin per exercise, rebuild weekly (daily during an active lab), snapshot after every rebuild.

## Troubleshooting

1. **USB not passed.** `usbipd list` shows it but `lsusb` in WSL is empty. Keep a WSL shell open; re-run `usbipd bind --busid <id>` (admin) then `usbipd attach --wsl --busid <id>` (non-admin); `wsl --update` (needs kernel >= 5.10.60.1); check the usbipd test list. Attach is non-persistent — re-attach after every replug/reboot.
2. **Nested virt missing.** WSL2 features unavailable or VM-in-VM fails to boot. Enable VT-x/AMD-V in BIOS/UEFI; set `nestedVirtualization=true` + `wsl --shutdown` only when WSL2 runs inside a VM.
3. **Clock skew.** Kerberos `KRB_AP_ERR_SKEW`, TLS "not yet valid", out-of-order Splunk ingests. Enable hypervisor time sync; sync guests (`w32time` on Windows; `timedatectl set-ntp true` on Kali) **[UNVERIFIED guest recipe]**; never hand-edit a DC clock — revert instead.
4. **DNS leaks / wrong resolver.** `cat /etc/resolv.conf` points to a VPN DNS or fails to resolve lab names. Check `[network] generateResolvConf=false` + manual `/etc/resolv.conf` **[UNVERIFIED key]** or drop the VPN DNS hijack during the run; lab names must resolve only on the host-only segment.
5. **Defender eats binaries.** Just-built payload or `nuclei` binary quarantined in seconds. (Admin) `Add-MpPreference -ExclusionPath "C:\Users\Garrett\tools"`, verify with `Get-MpPreference`, rebuild from source. Never disable real-time protection host-wide.
6. **Ports bound on 0.0.0.0.** "Address already in use", or listeners bound to `0.0.0.0:3000` when you wanted `127.0.0.1`. Check `docker ps`, `netstat -ano | findstr :3000`, `ss -tlnp`. Prefer `127.0.0.1:3000:3000` for web targets; reserve `0.0.0.0` for deliberate LAN exposure.
7. **MTU / WireGuard fragmentation.** Small packets work, bulk transfer dies (RDP/TLS stalls). Drop WireGuard interface MTU (typical `MTU = 1280`) **[UNVERIFIED value]**; test `ping -M do -s 1460 <peer>` on Kali.
8. **Hyper-V network conflict.** Kali VM and WSL both on `172.x` NAT gateways shadow each other. One hypervisor stack active, WSL caps applied with `wsl --shutdown`, lab VMs on a named Internal/Host-only switch — never the Default Switch. Check `Get-VMSwitch` + `wsl --list --verbose`.
9. **Expired lab certs.** WinRM / `https://localhost:8000` TLS errors after a revert ages the guest. Re-issue from the lab CA (GOAD/DetectionLab GPO) or re-seed (`Get-PfxCertificate` expiry check) **[UNVERIFIED — lab-specific]**; never extend a production CA for the lab.
10. **Snapshot bloat.** VHDX/VMDK archives > 200 GB, slow reverts. Inspect disk paths (`Get-VMHardDiskDrive`), export evidence, merge chains (export + reimport the clean state, or Hyper-V Merge), delete `02-experiment` older than the epoch, keep only `00-clean` + one working snapshot per VM.

## Sources (primary)

- kali.org/get-kali/, kali.org/docs/wsl/, kali.org/docs/wsl/wsl-preparations/, kali.org/docs/wsl/win-kex/
- learn.microsoft.com/windows/wsl/basic-commands, /wsl/systemd (`[boot] systemd=true`), /wsl/wsl-config, /wsl/connect-usb
- github.com/dorssel/usbipd-win — `winget install --interactive --exact dorssel.usbipd-win`, `usbipd bind/attach --wsl --busid`
- orange-cyberdefense.github.io/GOAD/installation + github.com/Orange-Cyberdefense/GOAD — `./goad.sh -t check/install -l GOAD -p virtualbox`
- docs.ludus.cloud/docs/quick-start/install-ludus + github.com/badsectorlabs/ludus — `curl --proto '=https' --tlsv1.2 -sSf https://ludus.cloud/install | bash`
- vulhub.org + github.com/vulhub/vulhub — `docker compose up -d/down -v`
- github.com/juice-shop/juice-shop — `docker run --rm -p 127.0.0.1:3000:3000 bkimminich/juice-shop`
- github.com/digininja/DVWA — `git clone https://github.com/digininja/DVWA.git`
- portswigger.net/web-security; github.com/clong/DetectionLab + detectionlab.network (`prepare.[sh|ps1]`, not actively maintained)
- help.splunk.com + hub.docker.com/r/splunk/splunk — `docker pull splunk/splunk:latest`, `docker run -d -p 8000:8000 -e SPLUNK_START_ARGS=--accept-license -e SPLUNK_GENERAL_TERMS=--accept-sgt-current-at-splunk-com -e SPLUNK_PASSWORD=<password>`
- github.com/redcanaryco/invoke-atomicredteam/wiki/Installing-Invoke-AtomicRedTeam
- docs.docker.com/desktop/features/wsl/ — WSL Integration, `wsl.exe -l -v`
- parrotsec.org/docs/containers/wsl/; go.dev/doc/install; rust-lang.org/install
- docs.astral.sh/uv/getting-started/installation/ — `winget install --id=astral-sh.uv -e`, `scoop install main/uv`
- learn.microsoft.com/defender-endpoint (Add-MpPreference); floci.io/aws + github.com/floci-io/floci (verify before running)
