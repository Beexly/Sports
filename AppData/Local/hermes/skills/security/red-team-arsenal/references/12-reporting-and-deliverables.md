# Reporting and deliverables

The report is the product. A perfect intrusion with a vague report gets a bad reference.
A modest intrusion with a precise, reproducible, evidence-linked report gets renewed.

Rule: **every claim is reproducible by a third party from the report alone.** If a
reviewer cannot re-run it, it is an anecdote.

---

## 1. Structure (fixed order)

```
00 Cover            client, dates, classification, version, author, distribution list
01 Executive summary 1 page: objective, what we reached, top 3 risks, top 3 fixes
02 Scope & methodology  in/out of scope, window, techniques allowed, tooling stack, caveats
03 Attack narrative  chronological, past tense, one evidence ID per claim
04 Findings          one block per finding, severity-sorted, CVSS v4 + client-impact prose
05 ATT&CK coverage   executed techniques only, with evidence IDs and blocked-by column
06 Remediation plan  P0/P1/P2, effort, owner suggestion, verification method per item
07 Detection gaps    what the blue team did not see, mapped to log source and rule change
08 Appendices        tool versions, payload hashes, IOC list, evidence index, ops log extract
```

Narrative before findings. A reader who understands the chain argues with your severity
less, and severity is where reports die.

---

## 2. Findings block

```markdown
### F-04 Domain Admin via ADCS ESC1 on CA01-CORP (Critical, CVSS 9.3)

**Component** ca01.corp.local, template `WebServer-Any`
**ATT&CK** T1649 Steal or Forge Authentication Certificates
**Evidence** EV-014, EV-019, EV-024
**Reproduction**
1. as `svc_sql` (from F-02): certipy find -u svc_sql -p ... -dc-ip 10.0.0.5 -vulnerable
2. certipy req -u svc_sql -p ... -ca CORP-CA -template WebServer-Any -upn administrator@corp.local
3. certipy auth -pfx administrator.pfx -dc-ip 10.0.0.5  -> TGT as DA
**Impact** any low-priv domain user becomes Domain Admin; full forest compromise.
**Root cause** template allows requester-supplied SAN with no manager approval.
**Fix** set `CT_FLAG_SAN_ADD` off or require CA manager approval; audit all templates with `-vulnerable`.
**Verification** re-run step 1; `Enabled: True` must be absent for ESC1 rows.
**References** CVE-2022-26923 class, SpecterOps ADCS research
```

CVSS v4.0 vector on the finding, one line, plus CVSS-BT where a threat-adjusted score
matters to the client (CVSS:4.0/.../ and note the -BT variant explicitly). Never quote a
score without the vector; an unsourced 9.8 is a debate, not a measurement.

Severity calibration:
- **Critical**: domain/forest takeover, RCE as SYSTEM/service account with broad reach, mass PII
- **High**: local admin on tier-1, auth bypass, credential material with reuse path
- **Medium**: user-level access, information disclosure with a plausible chain
- **Low**: hygiene, verbose errors, missing headers with a demonstrated consequence
- **Info**: configuration notes, defence-in-depth

If everything is critical, nothing is.

---

## 3. Evidence index

`evidence/index.csv`, immutable once captured:

```
id,utc,host,technique,type,path,sha256,caption
EV-014,2026-11-06T14:02:11Z,ca01.corp.local,T1649,png,evidence/EV-014.png,esc1 template shows Enrollee Supplies Subject
```

Captions are report-ready sentences, not filenames. Screenshots carry hostname and clock.
Redact secrets in the report copy, keep the raw file in the encrypted archive.

---

## 4. Executive summary pattern

```
Objective: reach the payment settlement system without using a provided account.
Result: reached it in 3 days (target 5), via phishing -> workstation -> ADCS ESC1 -> DA -> database tier.
Business impact: a single phished mailbox leads to settlement access; $Xm daily flow is exposed.
Top risks: (1) MFA bypassable at AitM, (2) ADCS ESC1, (3) DA sessions on 41 workstations.
Top fixes: (1) phishing-resistant MFA on VPN+O365, (2) template remediation, (3) tiered admin model.
What held: EDR blocked two credential dump attempts; backup immutability survived simulation.
```

Numbers, not adjectives. One paragraph of "what held" earns credibility for the rest.

---

## 5. Remediation plan

| Priority | Fix | Effort | Owner | Verify by |
|---|---|---|---|---|
| P0 | Remove SAN flag from ESC1 templates or add CA approval | 4 h | PKI team | `certipy find -vulnerable` returns none |
| P0 | Phishing-resistant MFA (FIDO2) on VPN + mail | 3 w | IAM | AitM replay fails |
| P1 | LAPS on all workstations | 1 w | EUC | local admin passwords unique |
| P2 | Reduce DA sessions, Protected Users for tier-0 | 6 w | AD | `nxc smb --sessions` shows no DA on workstations |

P0 = before retest; P1 = 30 days; P2 = 90 days. Every row needs a verification method that
does not require us to be re-engaged to confirm.

---

## 6. Translation layer

Same finding, three audiences:

- **Engineer**: exact command, config key, patch version.
- **Manager**: business process at risk, effort, who does it.
- **Executive**: one sentence, one number.

Write all three into the finding. Skipping the executive form is how a valid finding gets
budgeted at zero.

---

## 7. Quality gate before delivery

```
[ ] every finding has evidence ID, CVSS vector, reproduction, and a fix
[ ] every claim in the narrative maps to a finding or appendix
[ ] severity matches calibration table (second reviewer signed)
[ ] all internal-only hostnames/user names redacted in the shared copy
[ ] tool versions + payload hashes in appendix
[ ] IOC list exported (domains, IPs, hashes, cert subjects, UA strings)
[ ] ops log extract included for deconfliction
[ ] cleanup confirmed and stated
[ ] encrypted archive hash recorded, delivery method agreed
[ ] debrief scheduled, findings walked BEFORE the file is sent
```

Second reviewer is mandatory on the severity table. Self-assessed severity inflates; a
peer with the calibration table deflates it.

---

## 8. Debrief

Walk the narrative live, screen-share the evidence, and hold the recommendations to the
end. Two questions you must ask, in this order:

1. "What surprised the blue team most?" — that is your detection section, from their mouth.
2. "What can be fixed in the first 30 days?" — that is your P0 list, negotiated.

Send the report within 24 hours of debrief, with the agreed changes. Retest scope goes in
the same document; never sell it verbally.

---

## 9. Deliverable set

| Item | Audience | Format |
|---|---|---|
| Full report | technical + management | PDF, encrypted |
| Executive brief | C-suite | 2-page PDF or slide |
| Findings CSV | ticketing | CSV, one row per finding |
| IOC bundle | SOC | CSV + STIX 2.1 JSON |
| ATT&CK layer | blue team | Navigator JSON (`layer.json`) |
| Loot archive | client | encrypted 7z + hash manifest |
| Debrief deck | all | slides, delivered live |

Navigator layer shape:

```json
{"name":"Client Q4","versions":{"attack":"16","navigator":"5.1.0"},
 "domain":"enterprise-attack","techniques":[
  {"techniqueID":"T1649","score":1,"comment":"ESC1 -> DA, EV-024"}]}
```

Score 1 executed, 2 executed + detected, 3 detected + blocked, and state the convention
in the legend. A layer with no legend is a mood board.
