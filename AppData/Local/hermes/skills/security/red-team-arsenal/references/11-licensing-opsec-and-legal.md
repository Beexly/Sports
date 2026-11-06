# Licensing, legal, and operator OPSEC

Three ways a good engagement turns into a bad one: you shipped a license violation, you
touched a host outside the RoE, or the blue team found your tooling by its default
artifact instead of your tradecraft. This file covers all three.

---

## 1. License traps

### Copy-left that bites on delivery

| License | Tools | The trap | Do this instead |
|---|---|---|---|
| GPL-3.0 / AGPL-3.0 | BloodHound (GPL-3), Sliver (GPL-3), several recon scripts | AGPL triggers on network use: bundling a modified AGPL tool into a client-facing SaaS can compel source release | ship the tool as a separate process/container, or hand over upstream binaries |
| "Source available, non-commercial" | Nessus Essentials, some vendors' free tiers | fine for lab, not for billed work | check the tier before the kickoff call |
| Per-seat commercial | Cobalt Strike, Brute Ratel, Outflank OST, Burp Suite Pro | one license, one operator. Sharing a teamserver login is the usual violation | count seats in the SOW; budget one per operator |
| Trial/eval builds | CS trial, BRC4 trial | expire mid-engagement, phone home, watermark artifacts | never put a trial build on a client's production path |
| API-tier terms | Shodan, VirusTotal, HIBP, SecurityTrails, Hunter | free tier forbids commercial use and/or bulk storage; VT's terms restrict re-distribution and model training | paid tier for client work; cache results, don't republish raw dumps |

Rule: read `LICENSE` at the repo root before install, not after. `gh api repos/O/R --jq .license.spdx_id` gives it in one call, and reference files in this skill carry the field for that reason.

### Commercial stack cost reality (2026)

| Product | Model | Notes |
|---|---|---|
| Cobalt Strike 4.13 | per-seat, annual, quote-only | current line adds Beacon Interpreter, BOF-PE, LLVM Beacon, Payload Store; community forks (e.g. 4.x leaks) are usable for labs but drift from vendor builds |
| Brute Ratel C4 | per-seat, tiered, quote-only | DoH C2, External C2 over Slack/Teams/Discord, indirect syscalls, EDR hook hunter, LDAP Sentinel; licensing check phones home — air-gapped teamservers need the offline flow |
| Outflank OST | per-operator subscription, quote-only | lookalike DLLs and COM-hijack primitives; strongest when paired with CS, near-useless standalone |
| Burp Suite Pro | per-seat annual | Community edition is missing the scanner; Caido is the cheaper challenger |

Everything else in this arsenal is free and open source. Cost is not the constraint; seat compliance is.

---

## 2. Legal frame

### Authorization artifacts, in order of usefulness

1. **Signed SOW + RoE** naming: in-scope hosts/CIDRs/domains/cloud accounts, out-of-scope, test window in the client's timezone, allowed techniques (phishing? DoS? physical? social engineering?), emergency contacts, and the signer's authority.
2. **Written permission for third-party hosting** if you touch SaaS the client uses but does not own.
3. **Testing notice** to the SOC with a named operator and a phone number, unless the engagement is explicitly covert — and if it is covert, get that in writing with a blind-list of who may know.
4. **Data handling addendum**: where loot lives, retention period, encryption, destruction certificate.

### Non-negotiables

- Scope by resolved IP *and* hostname. Wildcard `*.client.com` does not cover the acquired subsidiary.
- Cloud: a client's AWS account does not imply its other accounts, and never the provider's control plane.
- Third-party dependencies: exploiting a vendor's shared service is fine with the client's sign-off; causing an outage on it usually is not without notice.
- Wireless and physical: check local radio regulation (transmit power, DFS bands) and building access rules.
- Deconfliction: if another team is testing simultaneously, exchange source IPs and a deconfliction token before the first packet.
- Report a critical finding (domain admin, PII exposure) within hours, in writing, not at debrief.
- Deletion: wipe loot at the agreed date and issue a certificate. Hash the manifest before wiping.

### Public disclosure

Client owns the narrative by default. Get written permission before naming them, before
publishing screenshots (redact internal hostnames, ticket numbers, user names), and before
reusing a novel technique. If permission is refused, publish technique-only with synthetic
hostnames.

### Cloud and identity specifics

- AWS: `sts get-caller-identity` first, every session, and log the account ID in the ops log so you can prove which account you were in.
- Entra: guest-invite testing changes tenant state — note it.
- SaaS admin consoles: MFA enrolment and API keys you create are persistent; tag them `redteam-<date>` and clean up.

---

## 3. Operator OPSEC

### Fingerprint surface you leak by default

| Leak | Who leaks it | Fix |
|---|---|---|
| Default TLS cert (`CN=localhost`, self-signed) | `sliver`, `ligolo-ng`, `chisel` | real cert from Let's Encrypt on the redirector; `-selfcert` only for lab |
| Default ports 8888/31337/5000/8080 | C2 defaults | map to 443/8443/53 and a synthetic service on 80 |
| Default User-Agent (`Go-http-client`, `python-requests`, `Nuclei`) | every CLI | rotate UA per operator profile; keep a UA per target-tenant realism |
| Nuclei template ordering + `-stats` telemetry | nuclei | `-stats=false`, randomise template order with `-shuffle` (verify flag in your build) |
| Interactsh/Burp Collaborator DNS | OOB checks | dedicated interactsh server with a client-owned domain |
| `X-Forwarded-For` chain, redirector hostname | proxies | strip via nginx `proxy_set_header` and `more_clear_headers` |
| Beacon sleep jitter 0 / 1-second callbacks | default profiles | 60s sleep, 40% jitter, working-hours-aware schedule |
| Named-pipe names, mutexes, service names | implants | rename per engagement in the profile, never `sliver`/`beacon` |
| Hostname of the teamserver | reverse DNS | PTR to a plausible corporate name |
| `CobaltStrike` TeamServer jar HTTP headers | CS | malleable profile, `trusted.x509cert`, strip `Server:` |
| Kerberos clock skew checks | Kerberos tooling | NTP sync the attack host to the DC before any Kerberos op |
| Tool binaries on disk (name + hash) | any drop | rename, compile from source, or run reflective |
| PowerShell 4104 script block logging | every PS one-liner | `-enc`, AMSI patch, or .NET assembly instead |

### Infrastructure hygiene

- One domain per engagement, aged ≥ 2 weeks, categorised (submit to Blue Coat/Symantec/WeChat) before the campaign.
- Separate VPS roles: redirector, teamserver, payload host, phishing. Never co-locate teamserver with the redirector.
- Redirector-only inbound; teamserver accepts only redirector egress on a non-standard port over mTLS.
- Log the public IP of every hop and hand it to the SOC in the deconfliction sheet.
- Tear down DNS before certificates expire; abandoned C2 domains are a fingerprint.

### Attribution hygiene

- Never reuse the same cert subject, JA3S, or payload hostname pattern across clients.
- Compile payloads from a build host that does not carry client identity in its toolchain paths (strip PDB paths: `-ldflags "-s -w"` in Go, `/DEBUG:NONE` in MSVC).
- Keep a per-engagement `ops-log.md` with UTC timestamps, source IP, host touched, command, and result. It is your alibi and your report skeleton.

---

## 4. Data handling

- Loot encrypts at rest from the first byte: `age -r <pubkey>` or `7z a -p` with a 32-char pass in the password manager.
- Separate `loot/` (client data), `evidence/` (screenshots, pcaps, logs), `payloads/`, `notes/`.
- Name evidence `EV-<nnn>-<technique-id>-<utc>-<short>.png` from creation, never rename later.
- PII: keep a `pii-index.csv` of file, owner, type, count so the client's DPO gets a real answer at debrief.
- Never test on live PII you do not need; sample 5 rows per table and say so.
- Final handover: encrypted archive, hash manifest, then wipe.

---

## 5. Pre-flight checklist

```
[ ] SOW signed, RoE attached, window in client TZ
[ ] Scope list resolved to IPs, out-of-scope confirmed
[ ] Deconfliction contacts + token exchanged
[ ] SOC blind or notified (as agreed)
[ ] Emergency stop contact tested (one live call)
[ ] Licenses/seats counted and assigned
[ ] Infrastructure deployed, certs valid, categorisation submitted
[ ] UA + cert + pipe naming per engagement
[ ] Ops log opened, UTC, clock synced
[ ] Loot encryption key generated and stored
[ ] Rollback plan for every state change (accounts, DNS, firewall, AD)
```
