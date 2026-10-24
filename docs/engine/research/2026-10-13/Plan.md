# EXTRACTION PLAN — Turner evidence collection

**Matter:** Baxley v. Turner Construction Company / CTS Lonestar JV (EEOC charge pending)
**Written:** 2026-08-12, after the Drive/Gmail collection documented in `MANIFEST.md`
**Target folder:** `C:\Users\Garrett\Downloads\turner_pull\`

---

## The governing principle

**Preserve broadly. Produce narrowly.**

Pull a complete copy of the relevant date range so nothing is lost or later alleged to have been destroyed — then hand your attorney only what is responsive. These are two different sets and they belong in two different folders. Opposing counsel has already put device media at issue; a full phone dump handed over undifferentiated is how you lose control of scope.

Everything below is scoped to **February–June 2026**, the employment-dispute window.

---

## Phase 0 — Make the backup (10 min) ⬅ NOTHING WORKS UNTIL THIS EXISTS

Every tool evaluated reads an iPhone backup. **You do not have one.** Both MobileSync paths on this machine are empty.

1. Plug the iPhone into this PC with a cable.
2. Open **Apple Devices** (Windows 11's replacement for iTunes; you have both installed).
3. Select the device → **Back Up Now**.
4. **Leave "Encrypt local backup" UNCHECKED.**
   Unencrypted backups still contain all SMS/iMessage. Encryption only adds Health, keychain, and some call history — none of which you need. Skipping it means no password has to be handled by anyone, including me.
5. Wait for completion — a first full backup takes 20–45 minutes.

**Verify it landed.** The backup is a GUID-named folder in one of:
```
%USERPROFILE%\Apple\MobileSync\Backup\          (Apple Devices / Store build)
%APPDATA%\Apple Computer\MobileSync\Backup\     (classic iTunes)
```
Tell me when it's there and I'll confirm the path and contents.

---

## Phase 1 — Messages (30 min)

**Tool: `imessage-exporter`** — https://github.com/ReagentX/imessage-exporter
The only mature tool that reads an *iOS backup* on Windows rather than a Mac's `chat.db`. GPL-3.0, 5.5k★.

Prefer a **prebuilt release binary** over `cargo install` — that avoids installing a Rust toolchain entirely. Run `imessage-exporter --help` once to confirm flag names for your version before trusting the commands below.

### 1a. Preservation copy — full window, held back
```bash
imessage-exporter -f html -c full -a iOS -p "<BACKUP_PATH>" -s 2026-02-01 -e 2026-06-30 -o "C:\Users\Garrett\Downloads\turner_pull\_preserve\messages_full"
```
Your safety net. **Do not produce this folder.** It exists so nothing is lost.

### 1b. Targeted export — Items 2 and 3
```bash
imessage-exporter -f html -c full -a iOS -p "<BACKUP_PATH>" -s 2026-02-16 -e 2026-03-05 -o "C:\Users\Garrett\Downloads\turner_pull\messages_feb"
```
Covers Lyra enrollment (Feb 16) → Jeff Dolan threads (Feb 23) → the Goings exchange and the EAP call (Feb 28).

### 1c. Targeted export — Item 4 and the termination arc
```bash
imessage-exporter -f html -c full -a iOS -p "<BACKUP_PATH>" -s 2026-04-20 -e 2026-05-25 -o "C:\Users\Garrett\Downloads\turner_pull\messages_may"
```
Covers the "CTS ER Concern - Alignment" escalation (Apr 22–23), the Rayne thread (Apr 28), the Murguia Teams exchange (May 7–8), and the severance agreement (May 19).

### Threads to locate in the output
| Contact | Why |
|---|---|
| **Brandon Goings** | Item 2 — on-site counselor / BuildWell |
| **"Lori"** (mother) | Item 3 — Feb 28 thread |
| **"Rayne"** (partner) | Item 3 — Apr 28 thread |
| **Jeff Dolan** | Feb 23 threads; signed the severance |
| Corina Murguia · Jordyn Waters · Kevin Ward · Andy Tandon | Corroborating work threads |

**What this buys you:** true send/receive timestamps. That resolves the Feb 27 / 7:13 PM discrepancy in `MANIFEST.md` §2 — a status-bar clock in a screenshot becomes an actual message time, and cropping arguments evaporate.

### Fallbacks
- **iTunes-Backup-Explorer** — https://github.com/MaxiHuHe04/iTunes-Backup-Explorer — MIT, 1,000+★, Windows GUI, Java 18+. Pull `sms.db` and attachment blobs out manually, then render with imessage-exporter or `aaronpk/imessage-export`.
- **iMazing** (~$45/sub) — exports Messages straight to PDF/CSV. Costs money, saves an hour, and PDFs are the format attorneys prefer.

---

## Phase 2 — Images and screenshots (20 min)

iCloud Photos is syncing to this PC. **Do not bulk-copy the library.** Filter.

**Useful fact:** iOS screenshots save as **`.PNG`**; camera photos save as **`.HEIC`/`.JPG`**. That single distinction separates evidence from personal photos almost perfectly — the same filter used throughout the Drive collection.

1. Locate the local iCloud Photos folder (likely under `C:\Users\Garrett\Pictures\`).
2. Copy **only PNGs** in these ranges into `turner_pull\screenshots\`:
   - **Feb 23 2026** — Jeff Dolan threads
   - **Feb 27–28 2026** — Items 2 and 3
   - **Apr 28 2026** — Rayne thread
   - **May 7–8 2026** — Item 4 Teams exchange
   - **May 19 2026** — severance delivery
3. Leave HEIC/JPG camera photos alone. Anything ambiguous: list the filename, don't copy it.

Phase 1 with `-c full` also recovers sent/received attachments, so this phase mainly catches screenshots never sent to anyone.

---

## Phase 3 — The five over-cap Drive files (15 min)

The Drive connector caps downloads at 10 MB. These need a browser:

| File | Bytes |
|---|---|
| `Turner-20260522T005216Z-3-001.zip` | 118,562,478 |
| `Turner-20260522T002821Z-3-001.zip` | 87,492,786 |
| `Turner-20260521T224229Z-3-001.zip` | 25,787,718 |
| `CTS_Lonestar_SPO_FINAL_DIRECT_TURNER_QR_NO_POWERPOINT.zip` | 19,960,040 |
| `Fw_ SPO Fliers Haskell.eml` | 16,521,754 |

https://drive.google.com/drive/folders/1fgah7FadnY0khxJxTeVpXOUfThrE8ucL → select → right-click → Download → save into `turner_pull\`.

---

## Phase 4 — Verify and manifest (my job)

Once Phases 1–3 land, I will:
- Hash every new file locally (SHA-256 computed on the delivered file, never relayed)
- Verify byte sizes and format magic bytes
- List archive contents
- Search the message exports for the Item 2 and 3 language and record **actual timestamps**
- Extend `MANIFEST.md`, and correct §2's Item 3 dates with real values

---

## Phase 5 — Segregate (30 min — needs your judgment)

Three piles. This step is what protects you.

**A. Turner primary evidence** → produce
Severance agreement, the `.eml` files, `IMG_5715`, `IMG_6073`, Lyra correspondence, Critical Event Resources, the message exports, the iMessage screenshots.

**B. Casinotech / Landry Holding** → separate folder, never mixed
`NoticeofEmploymentTermination.eml` (June 2025), `EEOC8.pdf`, `EEOC11.pdf`, `D.Baxley HR Response` (your father's matter, not yours), and the Feb 27 2026 self-sent image emails. See `MANIFEST.md` §7.

**C. AI-generated work product** → hold back
`*_Evidence_Reconstruction_*`, `*_Historical_Narrative_Reconstruction*`, `Enterprise_Narrative_Reconstruction*`, the `Note` file, and the ChatGPT/Claude session screenshots (`IMG_6054`–`6074`, `IMG_5880`–`5895`, `IMG_6103`–`6107`). Not contemporaneous records; should not travel with things that are.

---

## Phase 6 — Deliver to Rob Wiley P.C.

Send the **Phase 5-A folder**, `MANIFEST.md`, and — flagged separately — **`MANIFEST.md` §11, the discovery-request list**. That section names eleven records held on Turner's own servers, including **"CTS ER Concern - Alignment"** (Apr 22–23 2026), which no search of your own accounts could have surfaced.

---

## Do NOT

- ❌ Encrypt the backup — adds nothing you need, creates a password problem
- ❌ Bulk-copy the photo library into the collection folder
- ❌ Produce the mental-health screenshots without counsel's decision
- ❌ Mix the Casinotech matter into a Turner production
- ❌ Delete, move, or rename anything in Drive or Gmail — this collection is copy-only and stays that way
- ❌ Hand over `_preserve\` — it exists for preservation, not production

---

## Decisions only you and your attorney can make

1. **The Lori and Rayne threads.** Strong emotional-distress evidence — and producing them likely waives privacy over your entire mental-health record and invites an independent medical exam. **Counsel decides. Not you at 2am, and not me.**
2. **Whether the severance was signed.** The 21-day review window from May 19 2026 has long closed. Your attorney needs to know what you did with it before anything else is filed.
3. **Scope of the discovery request** built from `MANIFEST.md` §11.

---

## Quick reference

| Phase | Time | Who | Blocked on |
|---|---|---|---|
| 0 · Unencrypted backup | 10 min + wait | You | physical device |
| 1 · Message export | 30 min | You | Phase 0 |
| 2 · Screenshots (PNG, date-filtered) | 20 min | You / me | iCloud sync finishing |
| 3 · Five Drive files via browser | 15 min | You | browser |
| 4 · Hash, verify, manifest | — | Me | Phases 1–3 |
| 5 · Segregate into three piles | 30 min | You | Phase 4 |
| 6 · Deliver to counsel | — | You | Phase 5 |

**Start at Phase 0. Nothing else works until the backup exists.**
