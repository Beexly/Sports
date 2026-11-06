# Engagement playbook

The arsenal is a parts bin. This is the engine. Read it before the first packet and keep
it open while you work.

Operating rule: **one hypothesis, one action, one evidence line.** An action without a
recorded evidence line did not happen, and a hypothesis you cannot state in one sentence
is not ready to test.

---

## 0. Start-of-day ritual (10 minutes, every day)

```
1. date -u; ntpq -p                 # clock, UTC, skew < 1s before any Kerberos work
2. cat ops-log.md | tail -30        # where you actually stopped
3. cat scope.txt                    # in-scope, out-of-scope, exclusions
4. curl -s ifconfig.me              # confirm your source IP matches the deconfliction sheet
5. sessions/beacons check in C2     # who is alive, who is dark, who needs a new channel
6. pick 3 objectives for today, write them at the top of the log
```

End-of-day mirror: 3 lines on what moved, what is blocked, what the client must know
tomorrow. Never leave a long-running scan unattended across a scope boundary.

---

## 1. Phase gates

Each gate has an entry condition and an exit criterion. Do not skip forward; skipping is
how engagements produce a pretty report with no path.

| Phase | Enter when | Exit criterion | Typical duration |
|---|---|---|---|
| P0 Scoping | SOW signed | assets resolved, RoE read aloud on the call | 1-2 h |
| P1 Passive recon | P0 exit | asset graph with confidence grades, no packets to client | 2-6 h |
| P2 Active recon | P1 exit + window open | live hosts, services, versions, auth surfaces | 2-8 h |
| P3 Initial access | P2 exit + attack surface ranked | one foothold, or every vector tried and documented | 4-24 h |
| P4 Foothold consolidation | P3 exit | stable channel, local recon, privesc path known | 1-3 h |
| P5 Privilege escalation | P4 exit | local admin / SYSTEM, or all paths exhausted | 2-12 h |
| P6 Lateral + AD | P5 exit | tier-0 proof path or crown-jewel access | 4-72 h |
| P7 Objective | P6 exit + client objective | objective evidence captured, or objective renegotiated | 1-8 h |
| P8 Cleanup + report | P7 exit | state rolled back, loot encrypted, draft delivered | 4-12 h |

P1 is the only phase where "no packets to client" is a hard rule. Everything after it is
noise you must own.

---

## 2. P1 -> P2: asset graph discipline

Build `assets.csv`: `asset,type,source,confidence,notes` where confidence is:
- **A** directly observed (cert SAN, DNS record you resolved, HTTP 200 body)
- **B** inferred from corroborated third-party data
- **C** guessed from naming convention

Attack only A and B until A is exhausted. Grade-C hosts are where the timeouts live.

Stop P1 when a new query returns < 10% new assets three times in a row. That is the
saturation signal, not a feeling.

---

## 3. P2: ranking the surface

Score each live service on four axes, 1-5, multiply:

```
reach   (external 5 ... internal-only 1)
auth    (none 5 ... MFA+conditional 1)
age     (EOL/legacy 5 ... current 1)
impact  (tier-0 adjacent 5 ... brochure site 1)
```

Work top-down. Re-score after every 90 minutes; the board changes as you learn.

Always run these before bespoke attacks:
1. unauth endpoints with `nuclei -severity critical,high` and `-tags rce,lfi,sqli,ssrf`
2. default creds (see `10-credentials-cracking-and-phishing.md`)
3. exposed VCS/config (`.git/HEAD`, `.env`, `swagger.json`, `actuator/env`, `phpinfo.php`)
4. TLS/cert SAN harvest for new hostnames
5. vhost fuzz if the target is shared hosting

---

## 4. P3: initial access decision tree

```
External web app?
├─ known CVE on version spread  -> PoC -> verify -> shell
├─ auth portal                  -> default creds -> spray (lockout-aware) -> AitM phish
├─ file upload                  -> extension/content-type bypass -> webshell
├─ SSRF                         -> IMDS / internal port scan -> creds -> cloud plane
└─ nothing                      -> vhost/backup/source leak -> re-enter tree

Remote service (VPN/RDP/SSH/WinRM)?
├─ creds from breach/OSINT      -> spray with jitter -> MFA? -> AitM or session steal
└─ appliance version            -> CVE check -> exploit -> appliance cred store

People-first?
├─ MFA present                  -> evilginx2 phishlet, cookie capture, replay
├─ no MFA                       -> gophish credential capture -> VPN/webmail login
└─ leadership target            -> pretext + ISO/LNK + donut loader
```

Timebox: 90 minutes per vector, then park it with a note and move. Return only with new
information. Two failed attempts at the same vector with the same technique is a signal,
three is stubbornness.

---

## 5. P4: the first hour on a box

In order, and log each:

```
whoami /priv; whoami /groups; systeminfo; hostname; ipconfig /all
net user; net localgroup administrators; net group "Domain Admins" /domain
tasklist /v | findstr /i "av edr crowdstrike sentinelone cylance defender"
netstat -ano; route print; arp -a
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
dir C:\Users\*\.ssh, *.kdbx, *.pfx, unattend.xml, sysprep.inf
winPEASx64.exe quiet > %TEMP%\w.txt
```

Then, in this order of value: credential material (`LaZagne`, browser stores, `Snaffler`
targeted), local privesc (`whoami /priv` -> SeImpersonate -> potato; service ACLs;
unquoted paths; `AlwaysInstallElevated`), session/credential reuse, and only then AD
enumeration via BloodHound if the host is domain-joined.

Consolidation rules:
- rename the implant, set 60s/40% jitter, move off `%TEMP%`
- create a second channel over a different transport before doing anything loud
- snapshot `systeminfo` output at t0 so you can prove what you changed later

---

## 6. P5 -> P6: escalation and the AD graph

Local admin is not the goal; tier-0 is. Map every finding to a next hop:

| Finding | Next action |
|---|---|
| Domain user creds | BloodHound collect, kerberoast, ADCS `find`, share hunt |
| Local admin on a workstation | `secretsdump -sam -lsa`, hunt DA sessions (`nxc smb --sessions`), relay target |
| SMB signing off | `ntlmrelayx` + coercion (`PetitPotam`/`Coercer`) to LDAP/SMB |
| ADCS misconfig (ESC1/8/11) | `certipy req` for DA, then `auth` for a TGT |
| Writable `msDS-KeyCredentialLink` | shadow credentials -> PKINIT TGT |
| `GenericAll` on a computer | RBCD -> impersonate -> local admin |
| `GenericWrite` on a user | targeted kerberoast |
| MSSQL `sysadmin` | `xp_cmdshell` -> service account -> repeat |
| Cloud creds on host | `sts get-caller-identity` -> `cloudfox` -> privesc catalog (see `04-cloud-security.md`) |
| Backup/AV service account | `SeBackupPrivilege` -> `reg save` hives -> offline DCSync |

Stop rule for P5/P6: when three consecutive hops require the same privilege you already
have and add no new capability, you have saturated. Document the ceiling.

Persistence: pick exactly two, one userland and one machine-level, and record removal
commands for both in the ops log as you create them.

---

## 7. P7: objective

Objectives are client-defined (domain admin, specific file, payment system access, source
code, PII sample). When the objective is "prove impact", the proof is a *legitimate*
artifact, not a screenshot of `whoami`:

- file store: the actual document hash + a redacted copy
- payment: a test transaction in the sandbox or a screenshot of the terminal with amount
- code: the repo path, branch, and a signed commit you pushed to a throwaway branch
- SaaS admin: the audit log entry with your operator identity

If you can reach the objective but only through an unrealistic chain, say so and grade the
realism. Clients buy the caveat; they hate discovering it after the retest.

---

## 8. P8: cleanup

```
[ ] implants removed, services deleted, tasks deleted, registry keys removed
[ ] accounts created during testing disabled or deleted
[ ] firewall rules, DNS records, certs reverted
[ ] cloud resources terminated (check billing console, not just the API)
[ ] password resets for accounts you changed, handed to the client
[ ] loot encrypted, manifest hashed, retention date agreed
[ ] ops log + evidence index finalised
```

Then the report (`12-reporting-and-deliverables.md`). Cleanup first: the debrief happens
whether or not the report is ready.

---

## 9. Scenario playbooks

### External-only, no creds
Recon saturation -> surface ranking -> unauth exploit / default creds / AitM phish ->
foothold -> DMZ pivot -> internal via dual-homed host. Expect to spend 70% of the time in
P1/P2 and to earn the shell in P3.

### Assumed breach (workstation)
Start at P4. First hour list is the whole engagement. Two channels, then BloodHound,
then the shortest path to tier-0; capture the path as the deliverable even if you cannot
execute it.

### Phishing-led
Domain + categorisation + phishlet -> small batch (10-15 targets) -> MFA cookie capture ->
replay from a clean IP in the target geography -> mailbox rules for persistence ->
`MailSniper`/Graph for the internal map. Every captured session gets a 15-minute clock.

### Cloud-led
`sts get-caller-identity` -> `cloudfox aws all-checks` -> `pacu` privesc module ->
`stratus` to prove detections -> persistence via a second access key and a role trust
policy -> data proof in S3. Watch CloudTrail volume; batch `describe` calls.

### Internal wireless
Adapter in monitor mode, `airmon-ng`, capture handshakes/PMKID, `bettercap wifi.recon`
for the client inventory, rogue AP + `Responder` for captive-portal creds, then treat the
captured PSK as a foothold into the wired VLAN.

### Ransomware-simulation day
Shadow copy deletion, backup agent kill, DA -> mass encryption script, then measure
detection time and recovery. See `13-impact-and-simulation.md`.

---

## 10. When you are stuck

In order, always:

1. Re-read the ops log. Half of "stuck" is a forgotten finding.
2. Check the assumption that failed silently: DNS, proxy, clock skew, expired ticket, dead session.
3. Change layer, not tool: web -> mail -> VPN -> wireless -> physical -> people.
4. Go back to P1 with the new knowledge; fresh recon on a known target is cheap and usually fertile.
5. Ask the client a scoped question (what changed in the last 30 days? any new acquisition? M&A? new SaaS?).
6. Only then escalate technique complexity.

Hard stop: 4 hours on one vector without a new fact means write it up as blocked and move.

---

## 11. Evidence discipline

- screenshot full screen with the clock and hostname visible, crop only for the report copy
- command output goes to a file *and* the ops log; `tee` everything
- pcaps for anything network-layer, `-w` always, rotate at 200 MB
- every evidence file gets a line in `evidence/index.csv`: `id,utc,host,technique,path,sha256`
- hash on capture, not on delivery; a re-hashed file proves nothing
- never edit a capture; annotate beside it
