# Research Archive Audit Script

**Status:** Engineering utility.
**Related decision:** DEC-NEXT-049

## DEC-NEXT-049 - Add reusable research archive audit script

**Decision:** Add a local script that fingerprints an uploaded zip, extracts it to a temporary folder, records file metadata and text line counts, and then deletes the temporary extraction.

**Why now:** The XXX archive inspection should not remain a one-off manual ritual. Future competitor/research archives need the same discipline: hash, inventory, line counts, and no silent code import.

## Script

[audit-research-archive.ps1](../../../scripts/audit-research-archive.ps1)

Example:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\audit-research-archive.ps1 -ZipPath "C:\Users\Garrett\Downloads\XXX-main (1).zip" -OutputPath .\docs\monetization-v3\audit\xxx-main-archive-inventory-2026-05-23.json
```

## Output

- Absolute source zip path.
- SHA256 fingerprint.
- Audit timestamp.
- File count.
- Text-file count.
- Total text line count.
- Per-file path, byte size, extension, text flag, and line count.

## Guardrail

The script does not import, execute, install, or copy archive code into the app. It extracts to a temporary folder, emits metadata, and removes the temporary folder.
