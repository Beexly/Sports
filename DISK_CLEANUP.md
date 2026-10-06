# Disk cleanup — 2026-10-02

Baseline: `df` reported 4.2G free of 476G (100% used). `Get-PSDrive C` reported 4.1 GB free.

A full-volume scan (816 roots, read-only) attributed 431.8 GB. The largest roots were not caches:

- `C:\Users\Garrett\Apple\MobileSync` 68.85 GB — iPhone backups. Not deleted.
- `C:\Users\Garrett\Documents\Codex` 29.31 GB — not deleted.
- `C:\Users\Garrett\AppData\Local\Packages` 23.35 GB — not deleted.
- `C:\Users\Garrett\AppData\Local\uv\cache` 20.97 GB — regenerable. Cleaned.
- `C:\Users\Garrett\AppData\Local\Docker\wsl` 13.25 GB — not deleted. A Docker prune was not run; the daemon was not confirmed idle, and a vhdx compact needs a human.
- `C:\Users\Garrett\Turner_Case_AI` 5.39 GB and `XXX_RECOVERY_CONTROL` 5.51 GB — not deleted.

Removed, all regenerable:

| Step | Exit | Freed |
|---|---|---|
| `uv cache clean` | 0 | 3.81 GB |
| `npm cache clean --force` | 0 | 2.21 GB |
| old `~/.cache/codex-runtimes/codex-runtime-install-*` (kept `codex-primary-runtime`) | removed | 0.69 GB |

A stale `du.exe` (PID 32212, started 04:10, 828 CPU-seconds, scanning the home directory) was killed. It was not making progress that this cleanup needed.

After: cleanup log end free 10.6 GB. A later `df` read 9.9G free of 476G (98%). The drop from 10.6 to 9.9 is the nflverse parquet download that followed (about 0.08 GB) plus ordinary system use; it is not a failed delete.

Not removed: source, migrations, committed data, seeds, any git worktree, iPhone backups, case files, Docker WSL.

Machine-readable log: the cleanup script wrote `disk_cleanup.json` under the local temp survey dir. It is not committed; the table above is the record.
