# MANIFEST — Turner evidence collection

**Matter:** Baxley v. Turner Construction Company / CTS Lonestar JV (EEOC charge pending)
**Custodian:** Garrett Baxley — `baxley.garrett@gmail.com` (former work address `gbaxley@tcco.com`)
**Destination:** `C:\Users\Garrett\Downloads\turner_pull\`
**Collected:** 2026-08-12
**Sources:** Google Drive (folder "Turner" `1fgah7FadnY0khxJxTeVpXOUfThrE8ucL`, its subfolder, and files located elsewhere in the same Drive) and Gmail.

**Handling:** Copy/read only. Nothing in Drive or Gmail was deleted, moved, renamed, re-labelled, trashed, or modified. Original filenames and native formats preserved; no image was converted or re-compressed.

**Integrity method:** every downloaded file was checked against the byte-size Google Drive reports for it, and against its file-type magic bytes. Any file whose decoded size did not match exactly was deleted rather than kept — a mis-decoded byte stream is not evidence. **Every SHA-256 below was computed locally on the delivered file**, not copied from an intermediate report. (One intermediate report did contain a truncated hash; it was caught and discarded. The underlying file was intact.)

---

## 1. Files collected

| File | Bytes | SHA-256 | Drive source |
|---|---|---|---|
| `IMG_5715.jpeg` | 144,965 | `392cee0cb89d8533077ab9a7eac20d5f91bbad7a395768bd4a91bea61e56632d` | `1vpjQ0TjMWANiUIfFpd0utfSvlfwUSIPz` — Turner ▸ project files deduplicated (Unzipped Files) |
| `Turner/IMG_6073.PNG` | 91,073 | `9dfc2d9614ee5da03599917faa2cf89fab1b559675b9b1d163d642984a30d4e0` | `1GsHhEMJqGqpHm2Ux_s6kuIhY2UcZCQVw` — Turner |
| `Turner_unzipped/IMG_6073.png` | 86,012 | `c9531c9a29c91be34f7d44a26b3d1ae000c68d38873c66c7155e6be3fdd8a925` | `1AZZ05yN-SLJgHEkGgMkku-IRKo3qm5g7` — Turner ▸ Unzipped Files |
| `Turner/Corina Edited message.eml` | 191,460 | `b98d1189b61266f67190f8680cfa05414210e3f47f496f829f6611b4d5d4d4cb` | `1n3SEbEKJMJGJfB0hT_Ho_jpvgFD7T13r` — Turner |
| `Turner/original_msg.eml` | 219,392 | `82209ba3d4a529829abb8277f3c739d4c1b969b8c939293da242a43b858eb1b0` | `1agtBfghaYnVKI4f1AcsH8EBMRmbuOGrF` — Turner |
| `Turner/Turner2.zip` | 3,396,525 | `bbcc5c036a9564380bc90ad07ddaf47e395acbc8c74a4e5d3021fe9d4c51a3a1` | `1Kt77QyX6_v89omNz4AS36e8SWbNgXHdw` — Turner |
| `Turner/project files deduplicated.zip` | 8,835,974 | `ad2b1036c33e1d55f0009c751d55083f7dc48d55bce01d63d6345b5a24ff3b9d` | `1x3jYB29DyXKSFPkoUEP5sGrnw62csKsb` — Turner |
| `Turner/CTS_Lonestar_SPO_FINAL_LARGE_QR_NO_POWERPOINT.zip` | 7,440,158 | `dad35b9b8be6027c09582d6e17270deb35d94de13fec1ab715ac086c839a7836` | `1rwwurpRJ2MxWaUx-9X5PtFE4cxA0xDlJ` — Turner |
| `Turner/Fw_ CTS Intern Experience.eml` | 2,273,446 | `0a9ffcf64cbd461bb1c9797e65a63c7f0dd801fe43545d9a5c19f53d76df2684` | `15l_ADBvLxYyFdXsJ81Fy8lpePyjynvxs` — Turner |
| `Saved_from_Chrome/Severance.pdf` | 481,636 | `2fe08b7fe9d88ac5f3e3269ac5ac39638e70fb4037fb71a3679cfd3056fd5be3` | `1oskWS_UbdVf3M_5HHsrd46XUKOLbY2Y2` — folder "Saved from Chrome" |
| `Saved_from_Chrome/INTAKE~1.PDF` | 253,328 | `bb735ae9e59ab090e419fdae5d3dbb681cbdb9c786ea6560604a195fca18e8c8` | `16S_01eOEcFy9RZFWk0o67Swvc7BlyK7w` — "Saved from Chrome" |
| `Saved_from_Chrome/Owners Manual - mv.pdf` | 282,127 | `a148eee606157d0299a09271106656bf0cf43da96f88dc5d516fcbc3d5ffeabb` | `13SeNeiVuprMHd5Uct6C7LDP5HI_ig5_j` — "Saved from Chrome" |
| `Shared/Critical Event Resources.pdf` | 603,114 | `fe4d044d6006e8a6dbcc54616bf22c9b9d130964a0453ce3bc2b2bce2f4225b9` | `1isa2qNKN-7whreP4Z5AdjM47Bj7lus4pD5FnuTZ5mO0` — **exported**, see note |
| `Shared/Critical Event Resources.docx` | 799,338 | `97403db843a9003e3fd8caa58087e39d64fc86df317d6de497ab9b8e02430ebd` | same file, second export format |

A working subfolder `_screening/` may also be present. It holds images downloaded solely to be viewed during review. It is **not** part of the production set.

### Notes on specific files

**`IMG_5715.jpeg` — Item 1, confirmed.** Text thread with Joe Glowacki. OCR contains verbatim: *"Will do. I complimented your engagement and appreciated you asking for assistance with the issue."*

**The two `IMG_6073` files — Item 4, confirmed.** Microsoft Teams exchange with Corina Murguia showing the meeting-recap message, the "Edited" marker, and the direction to change Teams status. **They are not identical** — different sizes, different hashes, and the copy from the unzipped folder is a **JPEG despite its `.png` extension** (re-encoded at some point). Both are produced. The Turner-folder PNG is the better copy. They sit in separate subfolders only because Windows cannot hold `IMG_6073.PNG` and `IMG_6073.png` in one directory; **neither file was renamed.**

**`Corina Edited message.eml`** — genuine RFC-822. `Date: Fri, 8 May 2026 17:02:50 -0500`, `Message-ID: <CANApfyfempMynT4ZQTuGqQoJFqN_dz_Fm_x8wtkN2iN82APurw@mail.gmail.com>`, From Garrett Baxley. Carries two attachments: **`image.png`** and **`GB.5.4.docx`**. Same date as the Item 4 Teams exchange.

**`original_msg.eml`** — genuine RFC-822 with a full inbound `Received:` chain (`Delivered-To:`, `Received: by 2002:… Mon, 9 Feb 2026 15:26:10 -0800 (PST)`, `X-Received:`). Strongest header provenance in the collection.

**`Turner2.zip`** — 24 entries under `Turner1/`, all HR/policy/audit documents (docx, pptx, xlsx, pdf, txt). **No image files, no phone screenshots.**

**`project files deduplicated.zip`** — 75 entries, of which 24 are images: `IMG_5682`, `IMG_5715`, `IMG_0850`–`0852`, `IMG_6054`–`IMG_6074`. **These are the same images already present unpacked in the Drive subfolder "project files deduplicated (Unzipped Files)" and already screened — no new material, and neither Item 2 nor Item 3 is among them.** The remaining ~50 entries are the generated work product described in §8.

**`CTS_Lonestar_SPO_FINAL_LARGE_QR_NO_POWERPOINT.zip`** — 13 entries, all recruiting-flyer graphics and QR contact sheets. No message screenshots.

**`Fw_ CTS Intern Experience.eml`** — genuine RFC-822 with a full inbound `Received:` chain (`Delivered-To:`, `Received: by 2002:… Tue, 5 May 2026 10:31:50 -0700 (PDT)`). Attachments: `CTS Intern Experience .pptx`, `CTS Intern Review Form.xlsx`, and two Outlook-generated inline images (signature/logo artefacts, not screenshots).

**`Severance.pdf` — key document.** Turner Construction Company severance agreement dated **May 19, 2026**, signed by **Jeff Dolan, VP / Senior Director of HR**. Termination effective May 19; final paycheck May 29; benefits end May 31. **21-day review period.** ¶4 Waiver and Release covers ADEA, Title VII, ADA, 42 U.S.C. §1981, FMLA, ERISA, Texas Labor Code Ch. 21, Texas Payday Law and TCHRA, with a covenant not to sue, **but expressly preserves the right to file an EEOC charge.** ¶8 imposes confidentiality and non-disparagement.

**`INTAKE~1.PDF`** — TB Robinson Law Group intake form naming Turner Construction Company (CTS Lonestar JV), 8080 Park Lane Suite 400, Dallas TX. **This matter, not the other one.**

**`Critical Event Resources` (both formats) — Item 2 corroboration.** Project support document issued "following the recent incident." Lists **"David – BuildWell Health, On-Site Mental Health Counselor"** with a direct phone line; on-site Lyra counseling in the Safety Trailer (Mar 23 – Apr 3); the Turner/JV Lyra hotline `833-872-0252` / `lyrahealth.com/turner`; Guardian EAP (TW Constructors); GuidanceResources (Clayco).
⚠️ **(a)** Native Google Doc **owned by `gbaxley@temp-palmettotri-v.com` and shared in** — not owned by the custodian. If that domain lapses, access is lost; preserved here for that reason. **(b)** Being Google-native, it has no byte-original — these two files are **generated exports, not bit-for-bit copies**, gated on format magic bytes only. Label them as exports if produced. **(c)** Its on-site counseling dates run late March–April while the Goings exchange is dated Feb 28; the BuildWell/David entry carries no date range and reads as a standing resource, but **when BuildWell first came on site should be pinned down.**

---

## 2. The four requested items

| # | Item | Status |
|---|---|---|
| 1 | IMG_5715 — Glowacki, "I complimented your engagement…" | **FOUND & COLLECTED** — quote matches verbatim |
| 2 | Goings thread, Feb 28 2026, BuildWell / David Peightal | **FOUND & COLLECTED** — `IMG_7239.PNG` + `IMG_7240.PNG`, contact "Brandon", David Peightal / BuildWell Health contact card visible |
| 3 | Texts to mother and to Rayne, Feb 27–28 2026 | **FOUND & COLLECTED** — `IMG_7299.PNG` (Lori, "Fri, Feb 27 at 7:13 PM", complete text). EAP message still outstanding |
| 4 | Murguia Teams exchange, May 7–8 2026 | **FOUND & COLLECTED** — `IMG_6073` ×2, `IMG_7259.PNG` (Teams-status directive verbatim), plus `Corina Edited message.eml` |

**Item 4 additional capture — `screenshots\_CONFIRMED_Item4\IMG_7259.PNG`** — 280,992 bytes — SHA-256 `36d6c388607b6ca37b0b0589827f9065295e222aa82b5e2e6dcdd6fb4608b994` (JPEG data despite `.PNG` extension). Microsoft Teams thread headed **"Murguia, Corina"**, showing her message at **12:28 PM** and his reply at **1:52 PM**. Verbatim from Murguia:
> "It would helpful if your Teams status showed when they are available. Right now, it reflects 'Out of Office' or at times 'Offline,' and having availability updated helps everyone better understand when team members are available and working. Also, make sure leadership at the CTS know when you and Jordyn are traveling or working remotely. When communicating this just cc me for awareness."

Note: the custodian recalled this message at 12:49 PM; the capture shows 12:28 PM. Minor and immaterial, but worth knowing before a declaration fixes a time. The "Edited" marker and the meeting-recap praise appear in `IMG_6073`, not in this capture — the two together make up Item 4.

### Item 2 — FOUND AND CONFIRMED

**`screenshots\_CONFIRMED_Item2\IMG_7239.PNG`** — 358,850 bytes — SHA-256 `a7975e45874238092f5f36ed3ac6bb17a192e73e688c972b529c573c60ff5074`
**`screenshots\_CONFIRMED_Item2\IMG_7240.PNG`** — 313,877 bytes — SHA-256 `90b8c752a519619b62c9137bb1745c03201fdba47a28327ad0a294f7ff21b099`
*(Both are JPEG data despite the `.PNG` extension — magic bytes `ffd8ffe0`. Filenames preserved as-is; noted here so the discrepancy is disclosed rather than discovered.)*

iMessage thread with contact **"Brandon"**. Date header partially obscured by the contact-name overlay but legible as Sat, Feb 2_ at 1:4_ PM. Verbatim:

> **Baxley:** "Do we have an on-site mental health counsel or coach?" / "Having an episode and struggling really bad bro."
> **Brandon:** "Yes" / "Will get the info asap"
> **Baxley:** "Text is best"
> **Brandon:** "Ok" → *contact card:* **"David Peightal — BuildWell Health"** → "Here's Dave's number is there anything I can help with bro?" / "We can get a beer shoot the shit. I've been through a lot myself, man."
> **Baxley:** "I've been in a panic attack since 5 yesterday. Trying to just get grounded and out of it." / "Struggling with identity and purpose. Bad."

Every element the custodian described is present, including the surname **Peightal** — which returned zero results across the entire Drive and Gmail, and exists only here.

### Item 2 — additional independent corroboration
- `Critical Event Resources` documents BuildWell Health, a counselor named David, and the on-site mental-health counselor role on this project.
- The Feb 28 2026 thread with the custodian's mother (supplied directly) contains *"We also have one on site that I might be able to use for free"* — same date, same subject.
- The surname **"Peightal"** returns **zero results** across the entire Drive and mailbox. **Brandon Goings** is confirmed a real CTS Lonestar Safety-side manager (named as supervisor of record for multiple employees in the CTS outreach-tracking sheet, and as an orientation trainer in `IMG_5973`), but no message thread with him was located.

### Item 3 — FOUND AND CONFIRMED, exactly as originally described

**`screenshots\_CONFIRMED_Item3\IMG_7299.PNG`** — 1,008,483 bytes — SHA-256 `f0faf7ef9d1518725406c935f8e3275154cd2bcbfe3788c62c94a545c4a31d19`

Contact **"Lori"** (the custodian's mother). The thread's own date header reads **"Fri, Feb 27 at 7:13 PM"** — the message timestamp, matching the custodian's account precisely. Complete text:

> "I haven't even told you but Corina is coming into town to take over the project"
> "I said something that I had no idea it had bad context so **Jeff put me on a final warning**"
> "Asking if I want to be here"
> "All while saying I'm doin a job"
> "No matter how much I try to communicate with people, no matter how much I try to ask questions to understand — **my mind will never work like a normal person.** I'm always going to be alone and end up without a job."
> "It's been eating me alive for a week but I got the call today to close it all out."
> "I have nothing. And now I'm going to lose the one thing I have. Why couldn't God make my brain work. Why can't anyone understand me. I'm hurting mom."
> *(2 replies)* "I'm going to turn off my phone. Having a hard time controlling my emotions."

**Corroborating partial:** `screenshots\2026-02-27-28_Items2-3\IMG_5093.PNG` (3,032,431 bytes, SHA-256 `73c24d71e64662f8f68c126c57ff0144b5860b4991b69079fa6876bc82a0ee60`) shows the same message sent to **"Rayne"** (the custodian's partner). Its date header is obscured and the text is cut off mid-sentence, so `IMG_7299` is the better exhibit; `IMG_5093` establishes the message went to two recipients.

**⚠️ Correction to an earlier draft of this manifest.** A prior version stated that the Feb 27 / 7:13 PM detail was mistaken and that "7:13" was the iPhone status-bar capture clock rather than a message time. **That was wrong.** It was an inference drawn from `IMG_5093`, whose date header happens to be hidden behind the contact-name overlay and whose status bar reads 7:14 (captured about a minute after sending). `IMG_7299` displays the actual date header. **The custodian's original account — date, time, wording, and recipient — was accurate in every respect, and no correction to any declaration is required on this point.**

### Item 3 (third part) — additional Rayne screenshot, FOUND

**`screenshots\_CONFIRMED_Item3\IMG_7334.PNG`** — 1,011,903 bytes — SHA-256 `d0dbf420c5079d132bee52b0c17488aaf6270b411e950dc24280f2c6d68b6e1c`

Contact **"Rayne."** Date header **"Tue, Apr 28 at 5:11 PM."** Contains suicidal-ideation language (*"I want to die"*) — this is the file behind the images the custodian pasted directly into this session earlier; it is now on disk and hashed. Same handling applies as to the rest of Item 3: **counsel decides on production, not the custodian, not this session.**

### Item 3 (second part) — the EAP message, FOUND AND CONFIRMED

**`screenshots\_CONFIRMED_Item3\IMG_7302.PNG`** — 946,534 bytes — SHA-256 `154706f06bafff9cb4a8dd998ba5252d246fcd9d0225d38d31552b7eb6d1cd32`

Contact **"Lori"**. Date header reads **"Sat, Feb 28 at 1:54 PM"** — again matching the custodian's account exactly. Verbatim:

> "**I called my emergency EAP.** Scheduled an appointment for new medicine. We have an on-site mental health therapist that I'm trying to go see today."

Mother's reply: *"Ok that's great I'm praying for you, sweetheart… I understand you just need someone to listen right now."*

**This message interlocks precisely with Lyra's own third-party records (§3):**

| Local time, Sat Feb 28 2026 | Source | Event |
|---|---|---|
| 1:35 PM | Lyra (`19ca5bf52a7ba2c2`) | "Lyra Appointment Confirmation for Garrett Baxley" |
| **1:54 PM** | **`IMG_7302.PNG`** | **"I called my emergency EAP. Scheduled an appointment for new medicine."** |
| 2:15 PM | Lyra (`19ca5e3e61ff51ec`) | "Thank you for speaking with us" |

The custodian's contemporaneous text sits nineteen minutes after the employer-sponsored EAP's own appointment confirmation and twenty-one minutes before its follow-up — and independently references the **on-site mental health therapist**, tying Item 3 to Item 2 and to the `Critical Event Resources` document.

⚠️ These images are psychiatric records (medication history, suicidal ideation, treatment). Probative of emotional-distress damages, **and** likely to waive privacy over the entire mental-health record and invite an independent medical examination. **Production decision belongs to counsel.** They were supplied in-conversation and are **not** in this folder; the custodian must save them in himself.

---

## 3. Gmail findings

**Lyra Health — 95 distinct messages, 2025-11-05 to 2026-08-06.** Employer-sponsored EAP; employer portal `turner.lyrahealth.com`. The load-bearing sequence:

| Local (CST) | Message ID | What |
|---|---|---|
| Feb 16 2026, 5:42 PM | `19c68d5e13e147bf` | Lyra account email confirmation `3Y7S94` |
| Feb 16 2026, 5:44 PM | `19c68d6f2bd29732` | "Welcome to Lyra, Garrett!" |
| Feb 16 2026, 6:37 PM | `19c69084a3b97d27` | care@ — "Follow up from our call" |
| Feb 16 2026, 6:40 PM | `19c690a5f1a119cc` | First session booked for Mon Feb 23, 11:00 AM |
| **Feb 23 2026, 11:18 AM** | `19c8b82e4dfd9a2e` | **"Late cancellation/no-show payment"** — session missed |
| **Feb 28 2026, 1:35 PM** | `19ca5bf52a7ba2c2` | **"Lyra Appointment Confirmation for Garrett Baxley"** |
| **Feb 28 2026, 2:15 PM** | `19ca5e3e61ff51ec` | **"Thank you for speaking with us"** |

**This brackets the Item 3 "emergency EAP" message.** The custodian places that text at **1:54 PM on Feb 28** — nineteen minutes after Lyra's appointment confirmation, twenty-one minutes before Lyra's "thank you for speaking with us." **These are third-party business records generated by Lyra, not by the custodian.** Evidentially stronger than the screenshot would have been.

The Feb 23 no-show falls on the same day as `IMG_6119` and `IMG_6118`, iMessage threads with Jeff Dolan (`IMG_6118` shows **Mon, Feb 23 at 3:57 PM**). The custodian states the session was missed because of a work issue.

**Located, not yet exported:** a treating-provider thread with `info@mbspsych.org`, subject "NEW PATIENT INTAKE FORM - LYRA"; and a self-sent email carrying `Baxley_Turner_Exhibit_Index.docx` and `Baxley_Turner_Evidence_and_Chronology_Packet.docx`.

---

## 4. NOT FOUND — searched thoroughly, does not exist

1. **Email with subject "Alignment," April 2026 — not in this Gmail mailbox, but the underlying thread is REAL.** Searched `subject:Alignment`, `subject:align`, free-text, trash and spam, and every date variant. **The entire mailbox contains exactly ONE tcco.com email in all of April 2026** (`19db0d1274a3ce60`, 2026-04-21), with a **blank subject** and unrelated content.
   **However — two Drive screenshots capture the Alignment correspondence itself:**
   - `IMG_0682.PNG` (`1KwceeuczckxjcRPlPvo3RitCkjIj5CYF`) — an email **"Re: Alignment" from Garrett Baxley to Kevin Ward**
   - `IMG_0683.PNG` (`1nNpOOOc63oG2eH9QPvYu_OLHQU75_yJ-`) — an email **from Kevin Ward** regarding an alignment call and a Haskell visit
   The thread was Outlook mail on the work account `gbaxley@tcco.com` and was never forwarded to the personal Gmail account, which is why no search of this mailbox could ever have found it. **The native email resides on Turner Construction's systems and should be requested in discovery**; these two screenshots evidence its existence, its participants, and its subject line.
2. **Correspondence to/from `cmurguia@tcco.com` on Jan 26 2026 or Feb 17 2026 — none.** That address never appears as a real envelope From/To header anywhere in the mailbox; Corina Murguia appears only inside forwarded copies. Only two messages reference her address at all, both **May 2026** self-forwards (`19df93230e3701ad`, `19e291f427050db9`). **The significance of "Feb 17" appears to be the Lyra enrollment (§3), not a Murguia email.**
3. **Item 2 screenshot (Goings)** — not in Drive, not in Gmail, not in `Turner2.zip`.
4. **Item 3 screenshots** — not in Drive, not in Gmail, not in `Turner2.zip`.
5. **"Peightal"** — zero results across the entire Drive and mailbox.
6. **"Rayne"** — zero results in Drive.

---

## 5. Gaps — files that exist but could NOT be examined

**RESOLVED — the sixteen previously unreadable images have now been screened.** The OCR tool returned empty on all of them across 32 attempts; they were instead downloaded and viewed directly. All sixteen decoded byte-exact and were examined. **None depicts personal or intimate content. None is Item 2 or Item 3.** Copies are held in the working subfolder `_screening/` (not part of the production set).

| File | What it is |
|---|---|
| `IMG_0468.PNG` | Email — Andy Tandon to Baxley, "Leadership meeting – Requirements – Haskell," **Feb 9 2026** |
| `IMG_0470.PNG` | Email — "Fw: Analytics" from Joseph Glowacki, Turner staff YOE analytics |
| `IMG_0547.PNG` | **Voicemail transcript** from "Merrill," **Feb 27 2026**, candidate travel logistics |
| `IMG_5894.PNG` / `IMG_5895.PNG` | Screenshots of an unrelated AI coding session |
| `IMG_0641.jpg` | iMessage thread with **Kira Mallory** — Good Friday holiday pay across business units |
| `IMG_0650.PNG` | Email — "2026 Merit," Lauren Colella (HR), **Mar 31** |
| `IMG_0651.PNG` | Email — "Cost of Living / Merit Letter," Lauren Colella |
| **`IMG_0682.PNG`** | **Email "Re: Alignment" — Baxley to Kevin Ward** (see §4 item 1) |
| `IMG_0721.PNG` | Email — "Introduction: Coordination on Employee Matter," Steph Curran, **Apr 23** |
| `IMG_0724.PNG` | Email — "Re: HR Connect Mtg.," Corey Ketchum, **Mar 27** |
| `IMG_0759.PNG` | Email — "THM – Staff Augmentation – SGTR – PSA" |
| `IMG_0850.jpg` | Email — "Intern follow up questions," Baxley, **May 11**; bears hand-drawn annotation circles |
| `IMG_0876.PNG` | Email — "Re: SPO Fliers Haskell," Jordyn Waters (thread references **May 14 2026**) |
| `IMG_0881.PNG` | Email — "SPO Fliers Haskell," Kitt DiLoreti, quoting Tracy Hagen, **May 13 2026** |
| `IMG_0887.PNG` | Email — "SPO Fliers Haskell," Google contact reply quoting Lex Kondratyk, **May 14 2026** |

**Gmail attachments could not be retrieved at all.** The Gmail tooling exposes attachment filenames and IDs but has **no method to fetch attachment bytes** — a capability gap, not a choice. Affected: ten images across three self-sent emails of Feb 27 2026 (`IMG_0267`, `IMG_6399`, `IMG_6314`, `IMG_2820`, `IMG_3396`, `IMG_2869`, `IMG_2873`, `IMG_3264`, `IMG_5088.jpg`, plus a headshot) and the `image.png` on the "Corina Edited message" thread. Retrieve via Gmail in a browser or Google Takeout.

**Google Photos is unreachable from this session** — no connector exists. If Items 2 and 3 live in Photos, they cannot be retrieved by this route.

---

## 6. Deliberately NOT downloaded

Per instruction, anything not clearly one of the four items was skipped and listed rather than collected.

**Camera photos / non-screenshot images, skipped unreviewed** (the OCR tool does not support HEIC in any case):
`IMG_0558.HEIC`, `IMG_0611.HEIC`, `IMG_0612.HEIC`, `IMG_0853.heic`, `IMG_1536.HEIC`, `IMG_5682.heic`, `IMG_5966.JPG`, `IMG_6108.HEIC`, `IMG_6109.HEIC`, `IMG_6110.HEIC`, `IMG_6111.HEIC`, `IMG_6112.HEIC`, `IMG_6113.HEIC`, `IMG_6114.HEIC`, `IMG_13EA362B-CBD2-459B-823A-1C8EEE13894B.JPG`, `FullSizeRender.HEIC`.

**Apparent separate personal legal matter — flagged for conscious exclusion:**
`ExpunctionsInTexas.pdf` (`1wZogvxv_cjpORfBCD5iCXA6zhM4rSx9L`), `HPD Personal-History-Statement.pdf` (`1OIRz6YkRWJ7y995Jby2CK5Yj8XQFrzwS`).

---

## 7. ⚠️ SECOND MATTER INTERLEAVED — segregate before producing anything

This Drive and mailbox contain a **second, unrelated employment matter**: **Garrett Baxley v. Landry Holding LLC dba Casinotech**, FEPA# 1A26065 / EEOC# 31C-2025-00931, Texas Workforce Commission Civil Rights Division, investigator James Harris. Employment began April 2025; TWC interview 2/20/2026; RFI 2/24/2026; RFI response 2/27/2026.

**Files a keyword search flags as "high relevance to Turner" that are probably Casinotech:**

| File | Drive ID | Why |
|---|---|---|
| `NoticeofEmploymentTermination.eml` | `10AKH0JeuaRtP7Muj3dB56Wpmj8Z-FYrG` | Dated **June 2025**; Turner employment ran into 2026 |
| `EEOC8.pdf` | `1abIyvwcBHulXmpZbv-xxoi0RerHeBsOY` | Created **2026-02-21**, one day after the TWC Casinotech interview |
| `EEOC11.pdf` | `1S-GWaj5txkqJRnvYqYSQ6cS8j_1dQ72b` | Same creation timestamp |
| `D.Baxley HR Response` | `1FwQr6tBS89tqQS16VPG_Dui4z9jkK_bpE3KS7dYR2PQ` | **Doug Baxley** — a third person's HR matter (Elite Material Handling, 2025) |

The three Feb 27 2026 self-sent image emails were sent the same afternoon as the Casinotech RFI response and may belong to that matter. Timing note: they were sent 5:24–5:42 PM Central, **before** the 7:13 PM message described in Item 3, so they cannot contain it.

**Recommendation: split the two matters into separate folders before anything goes to counsel or into a production.**

---

## 8. Primary evidence vs. generated work product

The Turner folder mixes contemporaneous records with AI-assisted narrative documents the custodian generated later while organising the case. These are **not** the same evidentiary category and should not travel to opposing counsel in one undifferentiated bundle.

**Generated work product** (many near-duplicate copies), identifiable by filename:
`Garrett_EEOC_Evidence_Reconstruction_*`, `*_Historical_Narrative_Reconstruction*`, `Enterprise_Narrative_Reconstruction*`, `turner_investigation_reconstruction_*`, `Stage_1_/Stage_2_*`, `evidence_reconstruction_stage1_report`, `expanded_evidence_reconstruction_connector_review`, `reconstructed_narrative_current_thread_only*`, `Termination_Evidence_Reconstruction_Prompts_*`, `HRDOS_Work_Product_Evidence_Record_*`, `enterprise_discovery_prompt_connector_search*`.

Many Drive screenshots (`IMG_6054`–`IMG_6074`, `IMG_5880`–`IMG_5895`, `IMG_6103`–`IMG_6107`) are **screenshots of ChatGPT and Claude sessions about this case**, not contemporaneous business records — self-authored work product.

**Primary contemporaneous evidence** is the far smaller set: the Severance agreement, the two `.eml` files, `IMG_5715`, `IMG_6073`, the Lyra correspondence, `Critical Event Resources`, and the iMessage screenshots (`IMG_6115`–`IMG_6119` with Jeff Dolan; the Lori and Rayne threads).

---

## 9. Method and limitations

- **The Drive connector caps downloads at 10 MB per file.** Anything larger is rejected outright — no partial transfer, no workaround available in this session. This is why four archives and one large `.eml` are unretrieved (§10).
- For files under that cap, payload bytes were decoded on disk (`jq` + `base64 -d`) without passing through a language model, so byte-exact recovery is trustworthy.
- **No local Google Drive mount, no `rclone`, no `gdown`** on this machine.
- **Gmail messages cannot be exported as true `.eml` from this session.** The tooling returns parsed fields but **not** raw RFC-822 source — no `Received:` chain, no `Message-ID`, no DKIM/SPF. **No reconstructed `.eml` was fabricated.** The two `.eml` files here are genuine only because the custodian had already exported them to Drive. For header-complete exports of other Gmail messages, use Gmail's "Download message" or Google Takeout.
- **Google-native files** (Docs/Sheets) have no byte-original; any copy is a generated export. Only `Critical Event Resources` was exported, and it is labelled as such.

---

## 10. Still to retrieve — requires a browser download

Over the 10 MB connector cap; download from drive.google.com and drop into this folder, then re-hash:

| File | Bytes | Drive ID |
|---|---|---|
| `Turner-20260522T005216Z-3-001.zip` | 118,562,478 | `1Jn6THB0Z9ghaMzFNoAiv4mlxG-ulKl8Q` |
| `Turner-20260522T002821Z-3-001.zip` | 87,492,786 | `1yK6y4rrgDYOJ5jDTEmWR0Gufr4CVGCJU` |
| `Turner-20260521T224229Z-3-001.zip` | 25,787,718 | `1Px-2VibsW3rA92JERJGaLFB4xcS5sJAq` |
| `CTS_Lonestar_SPO_FINAL_DIRECT_TURNER_QR_NO_POWERPOINT.zip` | 19,960,040 | `1zEq5fd3tHsuQ09x6KxqqAGUMUFDOXlj1` |
| `Fw_ SPO Fliers Haskell.eml` | 16,521,754 | `10ls1Ka0K0oUhea95YsqUnBPOvuLSQO9J` |

Everything else retrievable under the 10 MB cap has been collected.

**Collection totals:** 14 files, 32,256,999 bytes delivered, every hash computed locally on the delivered file. Plus 16 screening copies in `_screening/` (review aid, not production).
**Drive folder totals for reference:** 357 files, 420,896,083 bytes across the Turner folder and its subfolder.

---

## 10.4 ★ TRUE .eml EXPORTS WITH FULL HEADERS — from the local Gmail Takeout archive

**This supersedes the limitation recorded in §9.** That section states Gmail messages could not be exported as true `.eml` from this session, because the Gmail connector returns only parsed fields. That remains true of the connector — but the custodian already had a complete **Google Takeout mbox** on local disk (`C:\Users\Garrett\Downloads\All mail Including Spam and Trash-002.mbox`, 13.5 GB, **189,064 messages**), which contains full raw RFC-822 source. **No headers were fabricated; these are byte-for-byte original messages.**

**Method.** The mbox was streamed read-only and messages matching case terms were written out as individual `.eml` files with the mbox `From ` separator stripped and nothing else altered. Index at `eml\_eml_index.tsv` records filename, byte length, SHA-256, matched term, `Date`, `From`, `To`, `Subject`, `Message-ID`, `X-Gmail-Labels`, and whether a `Received:` chain survived.

**Result: 238 messages extracted, 18 MB. 217 of 238 (91%) retain a complete `Received:` chain.** The 21 without are the custodian's own outbound messages, where no inbound hop exists — expected, not a defect.

| Matched term | Messages |
|---|---|
| lyrahealth (EAP vendor) | 166 |
| robwiley.com (counsel) | 42 → **segregated, privileged** |
| Request for Executive Review (Davoren) | 16 |
| tbrobinsonlaw.com (counsel) | 9 → **segregated, privileged** |
| GB HR Concerns | 3 |
| CTS ER Concern | 1 |
| cmurguia@tcco.com | 1 |

### ⚠️ Privileged material segregated automatically
**51 attorney-client emails** (Rob Wiley P.C. and TB Robinson Law Group) were moved to **`eml\_PRIVILEGED_attorney_client\`** with a README, so they cannot be swept into a production set. 187 remain in `eml\`. Counsel must make any privilege determination.

### The Feb 28 2026 sequence now has header-verified provenance
| File | Date header (UTC) | Headers |
|---|---|---|
| `0138_Lyra Appointment Confirmation for Garrett Baxley.eml` | Sat, 28 Feb 2026 19:35:04 +0000 | RECEIVED_CHAIN |
| *(custodian's text to "Lori" — `IMG_7302.PNG`)* | **1:54 PM Central = 19:54 UTC** | — |
| `0140_Thank you for speaking with us.eml` | Sat, 28 Feb 2026 20:15:00 +0000 | RECEIVED_CHAIN |

Sample verified headers from `0138`: `Return-Path: <msprvs1=…@notifications.lyrahealth.com>`, `Received: from mta-223-191.sparkpostmail.com … [147.253.223.191]`, `Authentication-Results: mx.google.com`, `DKIM-Signature: v=1; a=rsa-sha256`. **These are authenticable third-party business records with intact DKIM signatures**, not screenshots and not reconstructions.

The Feb 16–17 enrollment sequence and the Feb 23 `Late cancellation/no-show payment` message are likewise present with full `Received:` chains.

### ⚠️ What these extracts do NOT contain — correcting a possible misreading
The single `CTS ER Concern` hit and all three `GB HR Concerns` hits are **self-sent emails carrying the AI-generated reconstruction documents**, which merely quote those subject lines in their body text. They all show `NO_RECEIVED`. **They are not the original Turner emails.** The finding in §4 stands unchanged: the genuine "CTS ER Concern - Alignment" and "GB HR Concerns" messages exist only on Turner's Outlook servers and must be obtained through the discovery requests in §11.

---

## 10.5 Full iMessage sweep — bulk OCR of the local photo library

**Method.** All 4,259 images in the synced iCloud Photos library (`C:\Users\Garrett\iCloudPhotos`) were OCR'd locally using the Windows built-in `Windows.Media.Ocr` engine, run across nine parallel workers (four scanning forward, five scanning backward, converging in the middle with path-based deduplication). No image left the machine; no cloud OCR service was used. 4,248 of 4,259 succeeded (99.7%); the remainder are almost certainly non-image or corrupt files. The resulting text index was searched for target phrases, then for every known contact name, then for a `iMessage`/weekday-date-header signature to catch message threads regardless of content.

**Result: 375 screenshots matched an iMessage-thread signature.** Breakdown by identified contact:

| Contact | Screenshots | Note |
|---|---|---|
| Rayne | 94 | Personal relationship thread, Aug 2025 – Aug 2026. The vast majority predate the dispute and are ordinary conversation. Two are case-relevant and already listed above (Item 3, Apr 28 and the Feb 27 cross-post). |
| Lori | 19 | Mother. Includes the confirmed Item 3 messages above. |
| Dolan | 8 | Jeff Dolan — see new finding below. |
| Jake | 6 | Personal, unrelated to either matter. |
| Jasmin | 5 | Work-adjacent (Jasmin Pintor), routine coordination — see §1 notes. |
| Meghan | 3 | Work-adjacent (Meghan Davis), routine coordination. |
| Brandon | 3 | Confirmed Item 2, plus duplicate captures. |
| Peightal | 1 | Confirmed Item 2. |
| Carlos | 1 | Personal/routine, unrelated. |
| *(unidentified — contact name obscured or not in known list)* | 241 | Swept for keywords; see below. |

**New finding — `screenshots\_TURNER_jeff_dolan_checkin\IMG_6119.PNG`** — 364,476 bytes — SHA-256 `ed3cda2fd99d2d7f4eb663c60708b28df1f61ee4beea8143a4ba06ee60d751e4`

Full text was previously only visible in fragments; the complete exchange:

> **Jeff Dolan, Mon Feb 23 at 12:51 PM:** "This is Jeff. I want you to know you have been doing great things for us under a difficult situation. Corina let me know you texted her and left your work phone at the office. I know you are a good person and you have good intentions. Please know you are appreciated and I have an interest in helping navigate this issue. Please do your best to stay positive."
> **Custodian, 3:57 PM:** "Thank you. So glad to hear from you. I was starting to worry. I'm sorry — not my intention at all. I just needed to disconnect."

This is **Turner's VP/Senior Director of HR — the same person who later signed the May 19 severance agreement — proactively acknowledging a workplace crisis in writing**, the same day as the Lyra no-show recorded in §3. This is contemporaneous, employer-authored, and corroborates the custodian's account independent of anything he wrote himself.

**The 241 unidentified screenshots were keyword-swept, not individually opened**, for: Turner, Jeff Dolan, Corina, Brandon, warning, EAP, BuildWell, severance, terminat[ion], HR, attorney, EEOC. Two categories of hit were found and resolved:

- Duplicate captures of already-confirmed material (the Feb 27 Lori message, the Dolan Feb 23 exchange, Lyra notification emails) — no new content.
- **One thread flagged and deliberately NOT collected**: a personal dispute (contact "Melissa") mixing explicit/relationship content with a reference to declining a transfer to an Ohio project. Ohio has no apparent connection to Turner/CTS Lonestar (a Texas operation) or to Casinotech. Origin and relevance are unclear; it was not copied into this collection and is not described further here. If it matters, the custodian should locate and review it directly — file identified in session notes, not reproduced in this manifest out of respect for the personal/explicit content of an unrelated third party.

**Not opened individually:** routine work-coordination threads with Jasmin Pintor, Meghan Davis, and Kira Mallory, and the ~90 non-case Rayne screenshots, since keyword sweeps of their OCR text returned nothing case-relevant beyond what is already documented.

---

## 11. ★ DISCOVERY REQUEST LIST — records held by Turner, not by the custodian

**How these were identified.** The file titled `Note` (`1L88DmGbaH_J9sWs6lJMcBcgVZ1cy07F5`, Turner ▸ Unzipped Files) is **not an Apple Note** — it is a saved transcript of a prior AI session analysing this matter. It is work product, **not** evidence. But it names specific Outlook records by subject line, date, and recipient. Those records live on **Turner Construction's mail servers**, were never forwarded to the personal Gmail account, and therefore could not have been found by any search of the custodian's own accounts.

⚠️ **Treat the characterisations in that transcript as unverified.** The actionable content is the identifying metadata below — subject lines, dates, participants — which is what a document request targets.

| # | Record | Date | Participants |
|---|---|---|---|
| 1 | **"CTS ER Concern - Alignment"** | Apr 22–23 2026 | Baxley → Corina Murguia, Kevin Ward; Andy Tandon later adds Jeff Dolan |
| 2 | **"GB HR Concerns"** (23:04 UTC) forwarding **"Ahead of tomorrow's meeting"** | May 4 2026 | Baxley → Andy Tandon; inner note Baxley → Kevin Ward |
| 3 | **"Memorandum — Operating Model Reset — CTS LoneStar (v12)"** + version trail | May 4 2026, ~22:17–22:18 UTC | Baxley |
| 4 | Google hiring-account / **employer-of-record** chain | Feb 18 2026 | Sarah Bundy, Baxley, Corina Murguia |
| 5 | **"Next Steps for CTS JV Ethics & Compliance Training"** | Mar 26 2026 | Corina Murguia → Dan Fine, Corey Ketchum, Andy Tandon, Baxley; re: Ken Winfield |
| 6 | Ethics/compliance status follow-up | Apr 21 2026 | Andy Tandon; Corina → Ken Winfield |
| 7 | **"Follow-up"** with attachment `Document1.docx` | Feb 5 2026 | Corina Murguia → Baxley |
| 8 | **"Re: Quick help"** | Feb 11–12 2026 | Baxley → Jasmin, Sydney; Corina copied |
| 9 | Email to **Alex Willis** attaching CTS baseline workbook, **safety incident tracker from Brandon Goings / Robert Daniels**, and org chart | May 7 2026, 10:06 PM CT | Baxley → Alex Willis |
| 10 | **Microsoft Teams message history with Corina Murguia**, including server-side **edit history** for the May 7–8 2026 recap message | May 7–8 2026 | Baxley ↔ Corina Murguia |
| 11 | Personnel file, including any **final-warning** documentation and the decision record behind the May 19 2026 termination | 2026 | Turner HR / Jeff Dolan |

**Why #1 matters most.** The custodian recalled an April 2026 email titled *"Alignment."* Exhaustive Gmail searching found nothing, because the subject is **"CTS ER Concern - Alignment"** and it existed only on the work account. Item #1 both explains the negative finding in §4 and converts it into a specific, targetable request.

**Why #4 matters.** In that chain Corina Murguia reportedly **agreed with the custodian's position in writing** and called his timing *"exactly the right timing."* Contemporaneous written validation by the same manager who later raised performance concerns is materially useful.

**Why #10 matters.** Teams retains server-side edit history. The "Edited" marker visible in `IMG_6073` can be corroborated — or not — from Turner's own tenant data rather than from a screenshot.

---

## 12. Recommended next steps

1. **Download the five over-cap files** listed in §10 from drive.google.com into this folder; they can then be hashed and their contents listed.
2. **Save the Lori and Rayne screenshots into this folder** so they can be hashed and entered as Item 3 — they were supplied in conversation and are not on disk.
3. **Correct the Item 3 dates** before any declaration or interrogatory response is drafted (§2).
4. **Request the "Alignment" thread from Turner in discovery** — it lives on their Outlook servers, not in this mailbox (§4 item 1).
5. **Separate the Casinotech matter** from this collection (§7).
6. **Have counsel decide** on producing the mental-health screenshots (§2).
7. Consider requesting from Turner: the Microsoft Teams message history with Corina Murguia (including edit history for the May 8 message), and the personnel file including any final-warning documentation.
