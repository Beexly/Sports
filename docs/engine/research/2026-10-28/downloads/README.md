# Downloads ingest — 2026-10-28

Source: `C:\Users\Garrett\Downloads\`, 81 files named by the user.

**Deduplicated first.** 81 files hashed; 14 were byte-identical `- Copy` pairs, leaving 66 unique.
3 of those already existed in the repo by name. **62 ingested here.**

`.docx` files were converted to `.txt` with a stdlib zip+XML strip, not the docx skill script — the
kernel's `python` resolves to an interpreter without `python-docx` installed. Text is real, verified
by eye on a sample.

## Not ingested — 4 archives, 2.1 GB

Too large for git and not text:

| File | Size |
|---|---|
| `e472bd83-f662-4451-ad0b-9bf9aed7f244.zip` | 786.6 MB |
| `EYI Package_10-27-2026_1793067044.zip` | 657.7 MB |
| `EYI Package_10-24-2026_1792878207.zip` | 657.4 MB |
| `takeout-20261027T043625Z-1-001.zip` | — |

They stay in Downloads. Extract them separately if their contents matter.

## What is here

Session logs (`10_26_26 Agent Log*`), the coach-brain and coach-simulation documents, the sealed
architecture primary sources, the master execution reports, the consolidated master plan, the gap
report, the recon, the scheme layer, sharp money, the engine blueprint and reverse-engineering
script, the content OS, and the prior Hermes prompts.

Several of these are the same document at different revisions — `GSE Coach-Brain LLM & Engine` exists
in four variants and `Master Execution Report` in three. They were all unique by content, so all were
kept. **The newest revision is not marked**; treat them as a revision set, not as separate sources.

## Rendering quality — read this before quoting the coach-brain file

The `.docx` conversion strips tags and joins paragraphs, which **concatenates code lines**:
`MappingProxyTypeimport`, `Pathfrom`, `digestdef`. The `.txt` export of the same document keeps the
line structure (904 lines vs 567) and is word-for-word identical otherwise — verified, zero words
present in one and absent from the other.

`GSE_Coach-Brain_LLM_&_Engine.CLEAN.txt` is that `.txt` export and is the copy to quote. The
docx-derived `GSE_Coach-Brain_LLM_&_Engine*.txt` files are kept for the revision set but their code
blocks are run together.

The other docx-derived files here have the same flattening; it only bites where the source contains
code.
