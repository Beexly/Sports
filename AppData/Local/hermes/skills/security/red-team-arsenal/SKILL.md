---
name: red-team-arsenal
version: 1.0.0
description: Use when planning or running an offensive engagement end to end - recon, initial access, C2, AD, cloud, evasion, hardware, reporting - and when a specific tool needs exact syntax instead of a link.
meta:
  hermes:
    tags: [red-team, pentest, recon, active-directory, c2, evasion, cloud, hardware, osint]
    related_skills: [aggressive-hacker-stack, defensive-hacking-optimization]
author: Garrett + Hermes
license: MIT
---

Sixteen reference files, source-read and file:line cited, ordered the way an engagement runs.
Load the one that matches the phase in front of you; do not read the whole set.

Every dossier carries a verdict, so a tool that is dead or licence-trapped says so instead of
quietly sitting in a list. UNVERIFIED marks a claim that could not be checked from the source at
write time: re-check those before relying on them.

## Routing

| Phase | File |
|---|---|
| Scoping, recon, attack surface | `references/01-recon-and-asm.md` |
| Network, L2/L3, poisoning, relay | `references/13-network-and-protocol-attacks.md` |
| Credentials, cracking, phishing | `references/10-credentials-cracking-and-phishing.md` |
| Windows and Active Directory | `references/02-active-directory-windows.md` |
| Evasion, injection, post-exploitation | `references/06-evasion-and-postex.md` |
| C2, redirectors, tunnelling | `references/03-c2-and-tunneling.md` |
| Cloud, containers, identity | `references/04-cloud-security.md` |
| OSINT, web extraction, people | `references/05-osint-and-web-extraction.md` |
| Hardware, RF, physical | `references/07-hardware-and-physical.md` |
| Building the lab and toolchain | `references/14-install-lab-and-toolchain.md` |
| Mapping to MITRE ATT&CK | `references/08-attack-mapping.md` |
| Engagement shape, rules of engagement | `references/09-engagement-playbook.md` |
| Licence, OPSEC, legal exposure | `references/11-licensing-opsec-and-legal.md` |
| Deliverables and report structure | `references/12-reporting-and-deliverables.md` |
| Knowledge bases to search mid-job | `references/15-reference-libraries.md` |
| One-page command recall | `references/16-quick-reference.md` |

## The ladder discipline

Every technique file is written as a ladder: rung, mechanism, artefact it leaves, what it beats,
what beats it. Pick the lowest rung that the target's defensive generation forces. Escalating past
what the sensor watches burns time and adds artefacts for nothing.

The same rule applies to tiers of aggression. Read `references/09-engagement-playbook.md` before
the first packet: passive, standard scrape, fingerprint evasion, ToS-violating but unauthenticated,
and authenticated abuse are different legal exposures and belong in the log before they happen.

## Evidence bar

- Every claim reproducible by a third party from the note alone: command, request and response,
  file hash, or screenshot.
- Mark findings CONFIRMED, LIKELY, or INFERRED. Never promote an inference by wording.
- A 200 that matches the 404 baseline is not a finding. Diff the bodies.
- Read-only wherever possible; prove write access rather than exercising it.

## Ground rules that apply to every file here

- Cap bursts at 20 concurrent, back off on 403/429/503, and record the ceiling you found.
- Identify honestly in the user agent unless the engagement says otherwise.
- The licence of each tool is in its dossier. Copyleft and non-commercial terms travel with the
  deliverable if the tool ships in it; `references/11-licensing-opsec-and-legal.md` covers the
  traps.
- Nothing here publishes on its own. Output is a note plus an artefact, and a human decides.

## What this skill is not

Not a substitute for reading the tool's own docs at the version in front of you. Flags drift,
paths move, and a dossier written against one release will mislead on another. Where a file says
UNVERIFIED, that is exactly the part to confirm first.
