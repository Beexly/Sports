# Evidence-Collection Window Audit — Baxley v. Turner Construction

Window: 2025-10-06 through 2026-06-16 (termination 2026-05-19)
Sources: `_index/_merged.tsv` (4,248 OCR'd images), `eml/_eml_index.tsv` (238 extracted emails), working folder tree under `turner_pull/`
Method: grep/awk against the two TSVs; 0 image files were opened for visual confirmation (none were needed — OCR text was unambiguous for every hit discussed below).
Report generated: 2026-08-13.

Calibration misses (not re-litigated, used only as a baseline): the 2026-02-17 "Personal Owners Manuel" email to Corina Murguia; the Omaha conversation (Jill LaRuse + Jeff Dolan) about the plaintiff's diagnosis; an October 2025 Jake Overman owner's-manual chain.

---

## Methodology caveat found during this audit (read this before the tables)

**The `mtime` column in `_merged.tsv` is not a reliable proxy for "when the underlying event happened."** It looks like a file-copy/export/sync timestamp, not a photo-taken or screenshot-taken date. Evidence:

- 177 files share the identical mtime `2026-08-04 22:18`, down to the minute. 125 share `2026-07-30 06:32`. 84 share `2026-07-15 21:11`. 47 share `2025-10-16 01:00`. These are batch-processing timestamps, not 177 photos taken in the same 60 seconds.
- Concretely: `IMG_5093.PNG` (mtime 2026-02-27) and `IMG_5092.PNG` (mtime 2026-08-04 22:18) contain **identical OCR text** ("...Jeff put me on a final warning..."). Same for `IMG_7254`/`IMG_7255` (both stamped 2026-08-04 15:43) and `IMG_7299` (2026-08-12). These are the same screenshot, re-saved/re-exported multiple times, each save getting a new mtime.
- The cluster of images discussing Jeff Dolan/Jill (texts whose in-image dates read "Fri, Mar 6," "Fri, Mar 20," etc. — inside the window) carry mtimes of 2026-08-02 and 2026-08-04 — **outside** the 6/16/26 window close.
- Several images that narrate the plaintiff's own case-prep work (an AI assistant discussing the Feb 17 email and the October Overman chain — see next section) are stamped 2026-08-04 to 2026-08-12, i.e., last week, even though the events they describe are from within the window.

**Practical consequence:** any future automated filter that trusts `mtime` to decide "in window / out of window" will silently drop in-window content and silently include out-of-window content. Date relevance has to be read from the visible in-image timestamp/content, not the file's mtime. This is a plausible mechanism for how the known misses happened, and a live risk for more.

---

## (a) New evidence candidates — grouped by finding

All snippets are verbatim OCR (typos, OCR mangling, and garbled characters are the scanner's, not mine). Dates are the file's `mtime` (yyyy-MM-dd HH:mm); treat with the caveat above.

### A1. Jacob "Jake" Overman thread (HR Director – Omaha) — none of these are yet in the collection folder tree
| File | mtime | Snippet |
|---|---|---|
| IMG_0004.PNG | 2025-10-14 08:53 | "8:53 Overman, Jacob To Timeka J. Scott and You Hi Timeka, 8:51 AM Thank you for reaching out about your upc[oming vacation]..." — signature block reads "Human Resources Director - Omaha Jacob (Jake) A. Overman Business Unit" |
| IMG_0013.PNG | 2025-10-22 08:47 | "8:47 Overman, Jacob To You Hi Garrett, 8:35AM Hope your KC trip was good! Regarding lodging, it really depe[nds]..." |
| IMG_0033.PNG | 2025-10-29 17:15 | "5:14 Holiday Time off 1. To Respond Overman, Jacob To Pintor, Jasmin - (TEXAS), +5 ... Hi Team, I h[ope]..." |
| IMG_0042.PNG | 2026-08-04 22:18 | "1. To Respond Pintor, Jasmin - (TEXAS) To You and Overman, Jacob CW Missing Relo $$ EML - 320 KB ..." |
| IMG_0045.PNG | 2025-10-30 17:05 | "5 New Message Pintor, Jasmin - (TEXAS) To You and Overman, Jacob Thanks. 5:04 PM 'Travel Incentive Allo' st[ands for]..." |
| IMG_0046.PNG | 2025-10-30 17:41 | "1 New Message Pintor, Jasmin - (TEXAS) To You and Overman, Jacob 5:25PM I am not in a position to look into..." |
| IMG_0047.PNG | 2025-10-30 17:45 | "Re: Chris Wallitsch - Haskell Travel Pkg. ... To You and Overman, Jacob CW Missing Relo $$ EML - 241 KB..." — signature: "Jasmin Pintor, HR Manager Turner Construction Company 214.885.9347" |
| IMG_0049.PNG | 2026-08-04 22:18 | duplicate/re-save of IMG_0045's thread |
| IMG_0053.PNG | 2025-10-30 17:45 | "5:45 Pintor, Jasmin - (TEXAS) To You and Overman, Jacob ... 5:25 PM I am not in a position to look into the..." |
| IMG_0054.PNG | 2026-08-04 22:18 | "gbaxley@tcco.com Mobile 214.870.1145 ... Overman, Jacob To Pintor, Jasmin - (TEXAS) and You I'm go[ing]..." |
| IMG_0116.PNG | 2025-11-18 08:12 | "8:12 joverman@tcco.com You gbaxley@tcco.com ... Matamoros, Jose jmatamoros@tcco.com Tuesday, November 18, 8[am]..." |
| IMG_0156.PNG | 2026-08-09 09:52 | "Turner Corp Payroll TC To You, Overman, Jacob, +1 Hello, 3:23 PM These have been processed for 12/5/25 depo[sit]..." |

None of these are duplicates of the "October Jake owner's-manual chain" known miss by content — that specific chain (about an owner's manual document, not PTO/travel-expense administration) does not appear anywhere in the 4,248-image OCR index under any of the terms swept. See Section (c) — the actual owner's-manual cover chain isn't in this index at all, images or email.

### A2. Jill LaRuse
Only one hit in the whole 4,248-image index, and it is not a primary-source screenshot of a conversation — it is a screenshot of an AI assistant's narrative summary (see A4):

| File | mtime | Snippet |
|---|---|---|
| IMG_6062.PNG | 2026-05-19 15:47 | "...resentation that would be presented by Corina and Jill LaRuse. Garrett said he respected the need for some dire[ct]..." |

No image in the index shows a primary conversation between Jill LaRuse and Jeff Dolan discussing a diagnosis. That known miss remains genuinely absent from this corpus (images and emails both) — consistent with it being a known miss.

### A3. Jeff Dolan (not on the task's original term list, added because he is named in the calibration miss)
| File | mtime | Snippet |
|---|---|---|
| IMG_5231.PNG | 2026-03-11 08:02 | "Edit Messages Syncing with iCloud Paused Jeff Dolan Thanks for the heads up!..." — **not in the collected folder tree** |
| IMG_6107.PNG | 2026-05-21 18:02 | "...The Jeff Dolan statement cannot be reconstructed in week three..." (AI-assistant meta screenshot, see A4) — collected, in `screenshots/2026-05-18-25_captures/` |
| IMG_6115.PNG | 2026-05-21 19:44 | Group iMessage w/ Jeff Dolan re: JV/Clayco/Abrar address-sharing — collected |
| IMG_6116.PNG | 2026-05-21 19:45 | Same thread, "...Jeff Dolan No worries at all Coaching for garrett is to start with yes..." — collected |
| IMG_6345/6346/6347.PNG | 2026-08-04/06-06 | Re-saves of the same 6115/6116 thread — **not in collected folder tree** (duplicative content, low priority) |
| IMG_7222/7223/7224/7229.PNG | 2026-08-02 | Further re-saves of the same thread, plus a new segment: "I have asked Jill to take the lead on counseling services..." — **not in collected folder tree** |
| IMG_0683.PNG | 2026-08-04 22:18 | "Alignment Ward, Kevin - WK To Dolan, Jeff - Hey Garrett..." — **not collected** |

Note: the Dolan/Jill iMessage threads found here are about a JV workforce-data/address-sharing situation and post-termination "counseling services," not visibly about the plaintiff's diagnosis. They are relevant Dolan/LaRuse material but do not appear to be *the* known-miss conversation.

### A4. Self-referential "case-prep" screenshots (important, but flag before use)
Six images contain screenshots of what reads as the plaintiff's own AI-assistant (ChatGPT and/or Claude) conversations analyzing his case — not primary evidence. They explicitly narrate the known misses and are why several of the sweep terms hit at all:

| File | mtime | What it says (verbatim excerpt) |
|---|---|---|
| IMG_6054.JPG | 2026-08-09 09:52 | "I added the full February 17 email text to Corina and confirmed the attached file source as 'GB - Owners Manual .docx' from the 'Personal Owners Manuel' email. I also added the October Jake owner's-manual chain, the HRM Bootcamp pre-work language requiring Owner's Manuals, March bootcamp follow-up records..." — **not collected** |
| IMG_6060.PNG | 2026-08-04 22:18 | "...I won't rely on inaccessible documents; I found the February 17 Owner's Manual attachment as raw connector data...I've now found the attachment name and snippet indicating a direct spectrum disclosure..." — **not collected** |
| IMG_6062.PNG | 2026-05-19 15:47 | Discusses Corina/Jordyn/Jill LaRuse presentation, "Cm personal" self-note, ethics/compliance training — **collected** |
| IMG_6056.PNG | 2026-08-04 22:18 | "I used the key recovered sources: Personal Owners Manuel, Alignment, Cm personal, Proof, GB HR Concerns..." — **not collected** |
| IMG_6071.JPG | 2026-08-04 22:18 | Same body text as IMG_6054 — **not collected** |
| IMG_6104.PNG | 2026-05-21 17:34 | "...Corina's deck Personal Owners Manuel email body (Feb 17, 2026) — the cover email; the attachment GB Owners Manual.docx IS in the zip..." lists a file manifest — **collected** |

**Caution:** these look like attorney work-product / self-directed research notes (one footer literally reads "Reply to Claude + Opus 4.7 Adaptive"), not underlying facts. They're useful as a map of what the plaintiff's prior AI session believed it had found and where — but every claim in them needs to be verified against a primary source before being treated as evidence. I'm flagging them, not certifying them.

### A5. Diagnosis-adjacent language ("my brain" / "my mind" / ADHD / autism)
| File | mtime | Snippet |
|---|---|---|
| IMG_5092.PNG | 2026-08-04 22:18 | "...lose the one thing I have. Why couldn't God make my brain work. Why can't anyone understand me. I'm hurting..." — already known (final-warning cluster) |
| IMG_5093.PNG | 2026-02-27 19:14 | Same text, earlier mtime — already known |
| IMG_7254/7255/7299.PNG | 2026-08-04/08-12 | Same text, later re-saves — already known |
| IMG_4872.PNG / IMG_4873.PNG | 2026-02-07 10:34 | "...But I'm weird, my brain works different, I see things differently and pro[cess]..." — **new, not previously flagged as a known miss**, within window |
| IMG_5606.PNG | 2026-04-08 19:28 | "...struggles to handle Non-linear thinkers People with ADHD, autism, dyslexia They don't follow standard playbooks..." — a general post about neurodivergent traits at work, not a first-person disclosure; within window |
| IMG_6443.PNG | 2026-08-04 22:18 | "...My mind is in a very bad place and I tried to communicate..." — new |
| IMG_2951, IMG_3625, IMG_4393, IMG_6351, IMG_6575 | Oct 2025 – Jun 2026 | "my brain"/"my mind" phrasing, but read in context as ordinary emotional expressions in personal-relationship texts (Rayne Brown thread), not disability-adjacent — included for completeness, low relevance |

No hits at all for "neurodiver[gent]" as a standalone term.

### A6. "Feb 17" / "February 17"
| File | mtime | Snippet |
|---|---|---|
| IMG_4947.PNG | 2026-02-17 20:43 | Sports-betting screenshot, "Feb 17 2026 8:00 PM EST" — unrelated, false positive |
| IMG_4948.PNG | 2026-02-17 11:49 | Sports-betting screenshot — unrelated, false positive |
| IMG_6104.PNG | 2026-05-21 17:34 | "...Personal Owners Manuel email body (Feb 17, 2026) — the cover email..." — see A4 |
| IMG_6054.JPG / IMG_6071.JPG | 2026-08-09 / 2026-08-04 | "I added the full February 17 email text to Corina..." — see A4 |

No primary-source (email or screenshot of the actual email) dated Feb 17, 2026 exists anywhere in this 4,248-image index or the 238-email index. Only the after-the-fact AI-summary screenshots reference it.

### A7. HRM Bootcamp / bootcamp / "business unit"
Only found inside the A4 meta-screenshots (IMG_6054, IMG_6071) and inside IMG_0004's Overman signature block ("Business Unit" as an org-title fragment, not the phrase "business unit" in prose). No standalone bootcamp material in the image index.

### A8. "final warning"
Exactly the 5 already-known files (IMG_5092, IMG_5093, IMG_7254, IMG_7255, IMG_7299) — **zero new files**. All 5 are the same screenshot re-saved at different times (see methodology caveat).

### A9. "owners manual" / "owner's manual" / "Manuel"
Confined to the A4 meta-screenshots plus fantasy-football player name "Emanuel Wilson" (11 files, clearly unrelated — false positive) and two unrelated arrest-record screenshots ("Mid: MANUEL," IMG_0667/0668, false positive). No primary owner's-manual email or chain exists in the image index.

---

## (b) October 2025 census

271 images carry an mtime in 2025-10. 65 term-hits across 50 distinct images matched Turner/tcco/Dolan/Overman/HR/Omaha/warning/PTO. Read the caveat above — mtime for this month looks more trustworthy than the Aug-2026 batch stamps (no huge duplicate clusters inside October), but it is still a copy/OCR-run artifact, not verified against EXIF.

**Genuinely Turner/case-relevant (15 images):**

| File | mtime | Why relevant |
|---|---|---|
| IMG_0004.PNG | 2025-10-14 08:53 | Overman PTO email, "HR Director - Omaha" signature |
| IMG_0013.PNG | 2025-10-22 08:47 | Overman, re: KC trip lodging + expense reports |
| IMG_0014.PNG | 2025-10-22 11:30 | Dallas staffing call, Haskell candidates (Jasmin Pintor) |
| IMG_0032.PNG | 2025-10-29 14:41 | Lessly Stallings — onboarding paperwork completion |
| IMG_0033.PNG | 2025-10-29 17:15 | Overman "Holiday Time off" chain, Omaha |
| IMG_0034.PNG | 2025-10-29 18:01 | Turner reimbursement / BU Meeting & Expense AMEX |
| IMG_0045.PNG | 2025-10-30 17:05 | Jasmin Pintor (HR Manager) + Overman, Travel Incentive Allowance |
| IMG_0046.PNG | 2025-10-30 17:41 | Same chain, "poor time management" |
| IMG_0047.PNG | 2025-10-30 17:45 | "CW Missing Relo $$," HR Manager signature, Turner Construction Company |
| IMG_0048.PNG | 2025-10-30 17:45 | Same chain continuation |
| IMG_0050.PNG | 2025-10-30 17:45 | Same chain, Jasmin Pintor HR Manager |
| IMG_0052.PNG | 2025-10-30 17:45 | "Human Resource Manager" Turner Construction Company signature block |
| IMG_0053.PNG | 2025-10-30 17:45 | Same chain, Overman |
| IMG_0057.PNG | 2025-10-31 17:14 | "RE: Turner Construction Offer for Proj..." (Joseph Glowacki) |
| IMG_3186.PNG | 2025-10-30 07:34 | Glassdoor alert, "Human Resources Business Partner" job posting — personal job-search signal, not Turner-internal; borderline relevance |

**Not case-relevant — OCR substring false positives (35 images):** the "HR"/"PTO"/"Turner" hits below are two-letter/three-letter substring collisions, not the acronym or word. Listed so nothing is silently dropped, but none warrant follow-up:
- "HR" matched inside "throu**gh**"/"throu**gh**out" in personal-relationship texts with "(Lena) *Rayne* Brown": IMG_2840, IMG_2849, IMG_2942, IMG_2954, IMG_2957, IMG_2958, IMG_2961, IMG_2975, IMG_2976, IMG_2979, IMG_2983, IMG_2984, IMG_2990, IMG_2991, IMG_3010 (Oct 5–16, 2025)
- "HR" matched inside "**hr**s"/"Hig**h**way" in Maps/driving-ETA screenshots: IMG_2775, IMG_2777, IMG_2779, IMG_2920, IMG_3171, IMG_3180, IMG_3181
- "HR" matched inside "C**hr**is"/"rus**h**ing" in fantasy-football/DFS screenshots: IMG_2762, IMG_2764, IMG_2765, IMG_2769, IMG_2770, IMG_2771, IMG_2810, IMG_3128
- "Turner" matched inside DFS username "burner**turner**": IMG_3050
- "PTO" matched inside fantasy-football roster noise: IMG_2766, IMG_2774, IMG_2876, IMG_2878

No hits for "Dolan" or "warning" in October 2025.

---

## (c) Uncollected files — in the OCR index but not copied anywhere under `turner_pull/`

Checked every file-name hit from Overman / LaRuse / Omaha / owner's-manual sweeps against every file under `turner_pull/` (235 files across `screenshots/`, `_excluded_from_packet/`, `_withdrawn_from_packet/`, `eml*/`, etc.). Confirmed: none of the files below appear in *any* subfolder, including the exclusion/withdrawal folders — meaning they were never triaged at all, not reviewed-and-rejected.

**Overman (12 files, all uncollected):**
IMG_0004.PNG, IMG_0013.PNG, IMG_0033.PNG, IMG_0042.PNG, IMG_0045.PNG, IMG_0046.PNG, IMG_0047.PNG, IMG_0049.PNG, IMG_0053.PNG, IMG_0054.PNG, IMG_0116.PNG, IMG_0156.PNG

**LaRuse (0 uncollected)** — the one LaRuse hit (IMG_6062.PNG) is already in `screenshots/2026-05-18-25_captures/`.

**Omaha (3 of 5 uncollected):**
IMG_0004.PNG (also above), IMG_0880.PNG, IMG_4610.PNG uncollected. IMG_0033.PNG (also above) and IMG_0741.PNG are already collected (`screenshots/2026-04-28_Rayne/`).
- Caveat on IMG_4610.PNG: this is a vehicle-finance contract referencing a servicer's Omaha, NE P.O. box — not Turner's Omaha office. Not case-relevant despite the term match.

**Owner's-manual meta-screenshots (4 of the 6 in Section A4 uncollected):**
IMG_6054.JPG, IMG_6060.PNG, IMG_6056.PNG, IMG_6071.JPG uncollected. IMG_6062.PNG and IMG_6104.PNG already collected.

**eml cross-check:** searched the 238-row `_eml_index.tsv` for Overman / owner / manual / LaRuse / Omaha / Dolan in the subject/from/to/matched-term fields — **zero rows match any of these terms.** The `eml_owners_manual/` folder exists but its 3 files are unrelated (a self-sent no-subject email, a "Call of Duty" marketing email, and a Valvoline oil-change receipt) and its `_index.tsv` is empty. `owners_manual_extract/` does hold the actual `GB - Owners Manual .docx` and its extracted text, but **not** the Feb 17, 2026 cover email itself. So: the primary-source Feb 17 email, and the primary-source October Overman owner's-manual chain, are absent from this entire collection (images and emails) — not just uncopied from one folder to another. They still need to be pulled from the live mailbox/Outlook, not just re-sorted from what's already on disk.

**Supplementary (not part of the required term list, but directly tied to the Jill LaRuse/Jeff Dolan calibration miss) — Dolan cluster uncollected:**
IMG_0683.PNG, IMG_5231.PNG, IMG_0678.PNG, IMG_6061.PNG, IMG_6063.PNG, IMG_6064.PNG, IMG_6345.PNG, IMG_6346.PNG, IMG_6347.PNG, IMG_7222.PNG, IMG_7223.PNG, IMG_7224.PNG, IMG_7229.PNG. (IMG_6107, IMG_6115, IMG_6116, IMG_6062 are already collected in `screenshots/2026-05-18-25_captures/`.) None of the Dolan material found visibly discusses the plaintiff's diagnosis — it concerns a JV/workforce-data matter and post-termination "counseling services." The actual Jill LaRuse + Jeff Dolan diagnosis conversation remains absent from every source checked.

---

## (d) What the OCR index cannot see

- **`_merged.tsv` only covers PNG/JPG/JPEG** (3,238 + 879 + 131 = 4,248 files, an exact match). It contains **zero** HEIC, video, GIF, WEBP, or RAW entries.
- The raw `C:\Users\Garrett\iCloudPhotos\Photos\` library actually holds **6,827 files**: 3,239 PNG, 1,568 HEIC, 890 JPG, 761 MOV, 207 MP4, 131 JPEG, 11 GIF, 10 WEBP, 9 RAF, 1 ini.
- That means **1,568 HEIC photos and 968 videos (761 MOV + 207 MP4) — 2,579 files, 38% of the library — were never OCR'd and are invisible to any text search of `_merged.tsv`.** HEIC is the iPhone's native photo format for camera-shot (non-screenshot) images, so this gap likely skews toward camera photos rather than screenshots — but nothing confirms that without opening them.
- Even within the 4,248 files that were run through OCR, **890 (21%) produced zero extracted text** (`chars=0`) — blank, illegible, or OCR-failed images that are silently unsearchable by any term sweep, this one included.
- Net: of the full 6,827-file library, only 3,358 files (49%) both went through OCR and yielded searchable text. Everything else — 51% of the library — cannot be found by grepping `_merged.tsv`, regardless of what it shows.
- Audio-only content (e.g., a recorded conversation, a voicemail) is not covered by any source examined here — no audio-transcript index exists in this working tree.
- The email side is bounded too: `_eml_index.tsv` has 238 rows, each with a `matched_term` field, implying it was built from a keyword search against a mailbox export, not a full mailbox dump — anything the original search terms didn't catch (e.g., an email with a different subject that never mentioned "Overman" or "owners manual" in a searched field) would not appear here even if it exists in the mailbox.
- This audit did not open the raw HEIC/MOV/MP4 files, did not access iCloud directly, and did not attempt any OCR of its own — it is strictly a grep pass over the two already-built indexes plus a filesystem cross-check of the working folder tree.

---

## Summary

- Zero new "final warning" files beyond the 5 already known.
- Zero new diagnosis-disclosure files rise to the same weight as the known "my brain"/"my mind" final-warning cluster; a few adjacent-but-lower-confidence items are listed in A5 for the record.
- The Feb 17, 2026 "Personal Owners Manuel" email and the October 2025 Overman owner's-manual chain are confirmed absent from both the image OCR index and the extracted-email index — they exist only as after-the-fact narration inside the plaintiff's own AI-assistant screenshots (Section A4), which are not a substitute for the primary documents and should not be cited as such.
- 12 Overman-thread images, 3 Omaha-adjacent images, and 4 owner's-manual-meta images are sitting in the OCR index but have never been copied into any working folder, including the exclusion folders — meaning they were never triaged, not that they were reviewed and rejected. They're listed by filename in Section (c) for pickup.
- The biggest structural risk found is not a missed keyword — it's that **file mtime is an unreliable date signal** (batch-copy timestamps, some shared by 100+ unrelated files) and **38% of the phone library (HEIC + video) was never OCR'd at all.** Both should be fixed before this index is trusted as a complete picture of the phone.
