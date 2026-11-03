# Ledger Pre-Repair Snapshot (Week 8)

Captured before any ledger repair. No ledger files were modified to produce this snapshot.

## (a) Baseline ledger commit

`git -C C:\c\wt-week8-fail-remediation log -1 --format='%H' -- data/engine/new_engine_official_ledger_2026.json`

```text
0417e6d9d7b5c16f6ce909597aa18aba53bd0092
```

## (b) SHA256 of data/engine/new_engine_official_ledger_2026.json

```text
027f2a61abde6b66c56ed4e6f6351e9a81fc6269616b29f100c98ad865a1175c
```

## (c) tnf_settlement.banner_retraction (verbatim)

```text
Prior tonight_result 15-6 and verified_record 31-11 are not reconcilable to this box score. They are retained below as superseded, not as the live record.
```

## (d) verified_record.tonight_result (verbatim)

```text
15-6-0 (71.4%) · +8.11u on TNF CAR@GB official 21-play card
```

## (e) Figure table lines 28-32 (verbatim)

Source: `C:\Users\Garrett\Sports\docs\predictions\research\2026-11-02\2026-11-02-WEEK8-SUNDAY-COMPLETE-SETTLEMENT-AND-LEDGER.md` (untracked in this worktree; read-only reference).

```markdown
| **1. Primary Official Record (Main + Deriv + TNF Single-Stake)** | `16-5-0` (`+10.45u`) | `14-6-1` (`+7.19u`) | `6-2-0` (`+2.50u`) | *Tracked separately* | *Excluded (NFL only)* | **`36-13-1`** | **`73.5%`** | **`+20.14u`** |
| **2. All-Inclusive Official NFL (With Route-Gated Qualified Props)** | `16-5-0` (`+10.45u`) | `14-6-1` (`+7.19u`) | `6-2-0` (`+2.50u`) | `7-4-0` (`+2.42u` / `+2.33u`) | *Excluded (NFL only)* | **`43-17-1`** | **`71.7%`** | **`+22.56u` / `+22.47u`** |
| **3. All-Inclusive Official NFL (With Raw Ungated 15 Props)** | `16-5-0` (`+10.45u`) | `14-6-1` (`+7.19u`) | `6-2-0` (`+2.50u`) | `7-8-0` (`-1.58u` / `-1.67u`) | *Excluded (NFL only)* | **`43-21-1`** | **`67.2%`** | **`+18.56u` / `+18.47u`** |
| **4. Prior `31-11` Banner Continuity (Main + Deriv)** | `16-5-0` (`+10.45u`) | `15-6-0` (`+8.11u`) | `6-2-0` (`+2.50u`) | *Tracked separately* | *Excluded (NFL only)* | **`37-13-0`** | **`74.0%`** | **`+21.06u`** |
| **5. Prior `31-11` Banner Continuity (All-Inclusive Raw Props)** | `16-5-0` (`+10.45u`) | `15-6-0` (`+8.11u`) | `6-2-0` (`+2.50u`) | `7-8-0` (`-1.58u` / `-1.67u`) | *Excluded (NFL only)* | **`44-21-0`** | **`67.7%`** | **`+19.48u` / `+19.39u`** |
```
