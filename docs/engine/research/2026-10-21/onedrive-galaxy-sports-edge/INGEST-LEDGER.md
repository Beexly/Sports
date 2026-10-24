# OneDrive GSE ingest 2026-10-21

## Copied

- `Galaxy Sports Edge` is a Sports checkout at `166aa3eb8` on `Autonomous-Revenue-Engine`. 1,005 text files that are not in the audit worktree were copied here after a secret scan. Zero hits. Includes `gse-weather-edge-INTEGRATION_SPEC.md`.
- `Galaxy Sports Edge Launch Ready` and `gse_push_tmp` are broken git worktrees of that same checkout (their `.git` files point at a missing worktree dir). 273 and 271 additional text files not in the parent checkout were copied under `launch-ready/` and `gse-push-tmp/`. `.env.example` files were not copied.
- Zips, logs, `.git`, and files over 1 MB were not copied.

## Not copied, on purpose

- `GSN.url` is an Internet shortcut to a OneNote/OneDrive redirect. No document body.
- `C:\Program Files\Git`, `GitHub CLI`, `Google`, `Grok Bot`, `Hyper-V`, `nodejs`, and `PostgreSQL` are installed programs, not research. Grok Bot is a 414 MB Electron app. PostgreSQL and Chrome are not a corpus.
- `C:\Users\Garrett\AppData\Local` and `C:\Users\Garrett` were not swept wholesale. The Hermes tree was already harvested. Copying the rest of the profile would pull browser profiles, credentials, and unrelated personal files into a public repo.
