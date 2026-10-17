# PLATFORM AUTH REALITY — iCloud / Google Drive / Snapchat
_Lesson-5 companion · the honest technical map: why "cracking" these platforms online
fails, how accounts ACTUALLY fall, and the legal/teaching path for each. Pairs with
lesson5_creds.py (the lab) and the platform's own recovery/consent flows._

---

## 1. THE AUTH ARCHITECTURES (what you're actually up against)

### Apple ID / iCloud
- **Auth**: password + 2FA **on by default** since 2017 for new accounts; trusted-device
  codes; device attestation on new logins; aggressive per-IP/per-device rate limiting.
- **Online password attack surface**: essentially none at volume — repeated failures
  lock/rate-limit; a "10k list" dies at ~5 tries/account (lab chain A reproduces this).
- **Where iCloud content actually leaks (real incidents, defense view)**:
  1. **Credential reuse + breach lists** → stuffing (lab chain B — the big one)
  2. **Phishing** pages harvesting Apple ID + the 2FA code (lab chain C — the 6 tells)
  3. **Backups to third-party apps** granted full-photo access (the "photo manager" grant)
  4. **Stalkerware / family-sharing misuse** on devices the person doesn't control
  5. Insider/consent situations (shared passwords, ex-partners on family plans)
- **Legitimate "get everything" route (own account)**: iCloud.com data export,
  Apple Takeout (privacy.apple.com), device backups — full-fidelity, no hacking.

### Google / Google Drive
- **Auth**: 2FA default-nudge, app passwords deprecated, OAuth scopes, login alerts,
  new-device emails; "less secure app" path shut down.
- **Attack surface**: none for online spraying; the real killers are the same: reuse,
  phishing (accounts.google.com lookalikes), **malicious OAuth apps** granted Drive scope
  (check myaccount.google.com/permissions — the most underrated leak!), and
  **shared-link sprawl** ("anyone with the link" Drive folders indexed/forwarded).
- **Legitimate route**: Google Takeout; DLP review of sharing grants (teach: quarterly
  permission audit — most "Drive leaks" are the owner's own share settings).

### Snapchat
- **Auth**: login + device attestation + rate limits; **no public third-party login API**
  (every "SnapHack" tool we audited in the earlier session was noise: password-list
  scripts that Snap's endpoint throttles, or fake "PassDecoder" bait).
- **Where Snap content actually leaks**:
  1. **Public surface is public by design**: public profiles/stories/Spotlight
     (we pulled Sisi's public page: snapchat.com/add/sisidesportes is live, "Sisi",
     last updated 10/29/2024, public media on Snapchat's CDN — that's the public API's whole world)
  2. **Recipients**: anything sent to a "friend" can be screenshotted/saved — the app
     trains users otherwise, physics disagrees
  3. **Phishing for the login + the 2FA code** (Snap-specific kits exist; same 6 tells)
  4. **Third-party apps connected to Snap Kit** with story/access grants (audit in settings)
- **Legitimate route**: Snapchat's own "Download My Data" (accounts.snapchat.com →
  data export) for YOUR account — includes memories metadata, login history, friends.

---

## 2. THE CURRICULUM — LESSON 5 (run `python3 lesson5_creds.py all`)
| Chain | Teaches | Countermeasure taught |
|---|---|---|
| A — brute force vs lockout | why online password attacks die | lockouts, 2FA, device checks |
| B — credential stuffing | how accounts REALLY fall (breach reuse) | password managers, HIBP screening (/passcheck), unique passwords |
| C — phishing anatomy | the #1 real credential thief | the 6 tells, FIDO2 > SMS, push-bombing response |

Legal scope printed in the lesson output: **our lab + your own accounts only.**

---

## 3. THE LINE (unchanged, stated plainly)
- Cracking/entering an account you don't own or lack written consent for = unauthorized
  access (CFAA and friends) — not done here, not taught as a technique against real targets.
- The teachable, powerful version: **run every one of these attacks against the lab and
  your own accounts, then defend** — that's the full cybersecurity loop (our lessons 1-5
  now cover: recon → web exploitation → evasion vs detection → OSINT → credentials).
- For a specific real person (e.g., the Snapchat handle we just profiled): public surface
  only, then consent-based routes (follow/accept, shared folders, the person's own export).

## 4. TOOLS THAT POWER THIS LESSON (all already in the box)
- `/passcheck <pw>` — HIBP k-anonymity breach screening (keyless)
- `/breach <email>` — public breach lookups (xposedornot)
- vulnlab.py + sensorlab/ghost (lessons 2-3) — the live targets
- lesson5_creds.py — this lesson
- The exposure scanner (exposure.py) — how YOUR OWN keys leak from repos
