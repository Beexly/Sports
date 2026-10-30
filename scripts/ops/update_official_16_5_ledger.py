#!/usr/bin/env python3
"""
PRE-GAME builder for the Official New Engine ledger (writes 16-5 / 76.2% / +10.45u
and 21 PENDING card rows) plus the 360-degree CAR @ GB Master Bet Card.

DO NOT RUN THIS AS A REFRESH. It is a one-shot pre-game writer for the CAR @ GB
slate. The canonical artifacts have since been settled and hand-annotated
(31-11 / +18.56u, per-pick results, the OWNER-ATTESTED flag on the 16-5 base,
the merge resolution, the record reconciliation). Re-running it used to
overwrite all of that wholesale with the pre-game numbers, i.e. it would have
silently un-settled the card and republished a record the repo has already
disproved.

Two guards now stand in the way:
  * the JSON is merged, never replaced: every key this script does not write is
    carried through untouched (see merge_preserving / merge_card_rows);
  * the Markdown is only written when the file contains nothing but generated
    content. If it holds hand-written sections, annotations or settled columns,
    the write is REFUSED with a report of exactly what would be lost
    (see check_markdown_clobber). --force-write-md overrides, deliberately.

    python scripts/ops/update_official_16_5_ledger.py --dry-run
        report what would change and what would be preserved; touch nothing.
"""
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(r"C:\Users\Garrett\Sports")
EVAL_JSON = REPO / "data" / "engine" / "car_gb_360_full_market_evaluation_2026_10_29.json"
LEDGER_JSON = REPO / "data" / "engine" / "new_engine_official_ledger_2026.json"
LEDGER_MD = REPO / "docs" / "predictions" / "research" / "2026-10-29" / "NEW-ENGINE-OFFICIAL-LEDGER-16-5.md"
MASTER_MD = REPO / "docs" / "predictions" / "research" / "2026-10-29" / "COMPLETE-BET-CARD-AND-CONTENT-CREATION-SUITE-2026-10-29.md"

GENERATED_BEGIN = "<!-- LEDGER:GENERATED:BEGIN -->"
GENERATED_END = "<!-- LEDGER:GENERATED:END -->"

# Fields the settlement pass (settle_car_gb_card_2026_10_29.py) attaches to a
# card row after grading. A pre-game re-run must never strip them.
SETTLEMENT_FIELDS = ("status", "result", "settling_stat", "legs")
SETTLED_STATUSES = ("SETTLED", "GRADED")


class RefuseToClobber(RuntimeError):
    """Raised instead of overwriting an artifact that holds non-generated content."""


def ledger_is_settled(existing):
    """True once the card has been graded.

    Merging alone is not enough to make a pre-game rewrite safe: the generator
    owns `verified_record.wins/losses`, so on a settled file it would carry the
    stale 16-5 numbers back over 31-11 while leaving the settlement block and
    the per-row results in place -- a self-contradicting ledger. Once settled,
    this builder has nothing true left to say.
    """
    if not isinstance(existing, dict):
        return False
    if "settlement_2026-10-29" in existing:
        return True
    rows = existing.get("tonight_pending_card_car_at_gb") or []
    return any(isinstance(r, dict) and r.get("status") in SETTLED_STATUSES for r in rows)


def merge_preserving(existing, generated, nested=("verified_record",)):
    """Return `generated` with every key it does not own carried over from `existing`.

    `nested` names sub-dicts where the generator owns some fields and the file
    may hold others (e.g. verified_record.prior_record_verification). Those are
    merged field-wise, generator winning on its own fields.
    """
    if not isinstance(existing, dict):
        return dict(generated)
    out = dict(generated)
    for key, value in existing.items():
        if key not in out:
            out[key] = value
    for key in nested:
        gen_child, old_child = generated.get(key), existing.get(key)
        if isinstance(gen_child, dict) and isinstance(old_child, dict):
            merged = dict(old_child)
            merged.update(gen_child)
            out[key] = merged
    return out


def merge_card_rows(existing_rows, generated_rows):
    """Merge card rows by id.

    A settled row is never downgraded back to PENDING: if the file already
    grades a row, its status/result/settling_stat/legs survive the pre-game
    rewrite. Rows that exist only in the file are kept.
    """
    previous = {r.get("id"): r for r in existing_rows or [] if isinstance(r, dict)}
    merged_rows = []
    for row in generated_rows:
        merged = dict(row)
        old = previous.get(row.get("id"))
        if old:
            # Any annotation the file carries that the generator does not emit.
            for key, value in old.items():
                merged.setdefault(key, value)
            # A graded row outranks the generator's PENDING placeholder.
            if old.get("status") in SETTLED_STATUSES:
                for field in SETTLEMENT_FIELDS:
                    if field in old:
                        merged[field] = old[field]
        merged_rows.append(merged)
    generated_ids = {r.get("id") for r in generated_rows}
    merged_rows.extend(
        r for r in existing_rows or [] if isinstance(r, dict) and r.get("id") not in generated_ids
    )
    return merged_rows


def _first_cell(line):
    """First cell of a markdown table row, un-marked, or None if not a data row."""
    if not line.startswith("|") or line.startswith("| :") or line.startswith("|:"):
        return None
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if not cells or not cells[0]:
        return None
    return cells[0].strip("*` ")


def check_markdown_clobber(existing_text, generated_text):
    """Describe what writing `generated_text` over `existing_text` would destroy.

    Returns [] when the write is lossless. Otherwise a list of human-readable
    losses: hand-written blockquotes, table rows, extra card columns, and
    trailing sections. Empty list => safe to write.
    """
    if not existing_text:
        return []
    if GENERATED_BEGIN in existing_text and GENERATED_END in existing_text:
        return []  # explicit markers: only the marked region is rewritten

    losses = []
    ex_lines = existing_text.splitlines()
    gen_lines = generated_text.splitlines()

    gen_labels = {_first_cell(l) for l in gen_lines} - {None}
    extra_rows = [l for l in ex_lines if _first_cell(l) and _first_cell(l) not in gen_labels]
    if extra_rows:
        losses.append(f"{len(extra_rows)} table row(s) the generator does not produce")

    gen_quotes = {l for l in gen_lines if l.lstrip().startswith(">")}
    extra_quotes = [l for l in ex_lines if l.lstrip().startswith(">") and l not in gen_quotes]
    if extra_quotes:
        losses.append(f"{len(extra_quotes)} hand-written blockquote line(s)")

    gen_headings = {l.strip() for l in gen_lines if l.lstrip().startswith("## ")}
    ex_headings = [l.strip() for l in ex_lines if l.lstrip().startswith("## ")]
    extra_headings = [h for h in ex_headings if h not in gen_headings]
    if extra_headings:
        losses.append(f"{len(extra_headings)} section(s): " + "; ".join(extra_headings))

    gen_cols = max((l.count("|") for l in gen_lines if l.strip().startswith("|")), default=0)
    ex_cols = max((l.count("|") for l in ex_lines if l.strip().startswith("|")), default=0)
    if ex_cols > gen_cols:
        losses.append(f"card table widened from {gen_cols - 1} to {ex_cols - 1} columns")

    return losses


def write_markdown(path, generated_text, dry_run=False, force=False):
    """Write the generated Markdown only if doing so loses nothing, else refuse."""
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    losses = check_markdown_clobber(existing, generated_text)
    if losses and not force:
        raise RefuseToClobber(
            "Refusing to overwrite %s -- it holds content this generator does not produce:\n  - %s\n"
            "Re-run with --dry-run for a full report, or --force-write-md to discard those on purpose."
            % (path, "\n  - ".join(losses))
        )
    if dry_run:
        return False
    path.write_text(generated_text, encoding="utf-8")
    return True


def main(argv=None):
    args = _parse_args(sys.argv[1:] if argv is None else argv)
    eval_data = json.loads(EVAL_JSON.read_text(encoding="utf-8"))
    markets = eval_data["ou_and_spread_markets"]
    td_markets = eval_data["td_scorer_markets"]

    ledger = {
        "engine_version": "GSE v5.3.0 / 5-Stage JEV 10k-World Snap-by-Snap Engine",
        "as_of": "2026-10-29T18:18:00-05:00",
        "verified_record": {
            "wins": 16,
            "losses": 5,
            "pushes": 0,
            "total_graded": 21,
            "win_pct": 76.19,
            "net_units": "+10.45u",
            "roi_pct": "+49.76%",
            "display_banner": "16-5 (76.2%) · +10.45 UNITS WITH THE NEW ENGINE",
        },
        "tonight_pending_card_car_at_gb": [
            {"id": "CAR-GB-01", "category": "Game Line", "pick": "Green Bay Packers -3.5 (-112)", "units": 1.0, "rating": "61/100", "edge": "+8.62c", "status": "PENDING"},
            {"id": "CAR-GB-02", "category": "Game Line", "pick": "CAR @ GB UNDER 46.5 (+102)", "units": 1.0, "rating": "58/100", "edge": "+5.62c", "status": "PENDING"},
            {"id": "CAR-GB-03", "category": "1H Derivative", "pick": "Green Bay Packers 1H -2.5 (-110)", "units": 1.0, "rating": "65/100", "edge": "+13.40c", "status": "PENDING"},
            {"id": "CAR-GB-04", "category": "1H Team Total", "pick": "Carolina Panthers 1H Team Total UNDER 10.5 (-115)", "units": 1.0, "rating": "66/100", "edge": "+13.66c", "status": "PENDING"},
            {"id": "CAR-GB-05", "category": "1Q Prop (Flagship)", "pick": "Tucker Kraft OVER 6.5 1st Quarter Receiving Yards (-114)", "units": 1.0, "rating": "68/100", "edge": "+15.20c", "status": "PENDING"},
            {"id": "CAR-GB-06", "category": "Skill Prop", "pick": "Chuba Hubbard OVER 15.5 / 16.5 Receiving Yards (-110)", "units": 1.0, "rating": "66/100", "edge": "+13.62c", "status": "PENDING"},
            {"id": "CAR-GB-07", "category": "Skill Prop", "pick": "Josh Jacobs OVER 17.5 / 18.5 Receiving Yards (-110)", "units": 1.0, "rating": "66/100", "edge": "+13.35c", "status": "PENDING"},
            {"id": "CAR-GB-08", "category": "QB Prop", "pick": "Bryce Young UNDER 253.5 Passing Yards (-110)", "units": 1.0, "rating": "66/100", "edge": "+13.41c", "status": "PENDING"},
            {"id": "CAR-GB-09", "category": "QB Turnover Prop", "pick": "Bryce Young OVER 0.5 Interceptions (-125)", "units": 1.0, "rating": "63/100", "edge": "+8.50c", "status": "PENDING"},
            {"id": "CAR-GB-10", "category": "QB Volume Prop", "pick": "Jordan Love UNDER 35.5 Passing Attempts (-110)", "units": 1.0, "rating": "69/100", "edge": "+16.80c", "status": "PENDING"},
            {"id": "CAR-GB-11", "category": "Skill Prop", "pick": "Christian Watson OVER 70.5 / 71.5 Receiving Yards (-110)", "units": 1.0, "rating": "63/100", "edge": "+11.10c", "status": "PENDING"},
            {"id": "CAR-GB-12", "category": "Skill Prop", "pick": "Tetairoa McMillan UNDER 72.5 Receiving Yards (-110)", "units": 1.0, "rating": "65/100", "edge": "+12.74c", "status": "PENDING"},
            {"id": "CAR-GB-13", "category": "Skill Prop", "pick": "Chuba Hubbard OVER 67.5 Rushing Yards (-110)", "units": 1.0, "rating": "63/100", "edge": "+10.35c", "status": "PENDING"},
            {"id": "CAR-GB-14", "category": "Skill Prop", "pick": "Tucker Kraft OVER 44.5 Receiving Yards (-110)", "units": 1.0, "rating": "62/100", "edge": "+9.75c", "status": "PENDING"},
            {"id": "CAR-GB-15", "category": "Skill Prop", "pick": "Josh Jacobs OVER 60.5 / 61.5 Rushing Yards (-110)", "units": 1.0, "rating": "61/100", "edge": "+8.97c", "status": "PENDING"},
            {"id": "CAR-GB-16", "category": "Kicking Prop", "pick": "Ryan Fitzgerald (CAR PK) OVER 1.5 Field Goals Made (-105)", "units": 0.75, "rating": "64/100", "edge": "+12.10c", "status": "PENDING"},
            {"id": "CAR-GB-17", "category": "Kicking Prop", "pick": "Trey Smack (GB PK) OVER 1.5 Field Goals Made (-110) / OVER 7.5 Kicking Pts (-110)", "units": 0.75, "rating": "61/100", "edge": "+8.85c", "status": "PENDING"},
            {"id": "CAR-GB-18", "category": "IDP / Defense Prop", "pick": "Bobby Okereke (CAR LB) OVER 6.5 Tackles + Assists (-115)", "units": 0.75, "rating": "66/100", "edge": "+13.16c", "status": "PENDING"},
            {"id": "CAR-GB-19", "category": "IDP / Defense Prop", "pick": "Lukas Van Ness (GB DE) OVER 0.25 Sacks (-115)", "units": 0.75, "rating": "62/100", "edge": "+9.53c", "status": "PENDING"},
            {"id": "CAR-GB-20", "category": "IDP / Defense Prop", "pick": "Keisean Nixon (GB CB) OVER 4.5 Tackles + Assists (-110)", "units": 0.5, "rating": "61/100", "edge": "+9.87c", "status": "PENDING"},
            {"id": "CAR-GB-21", "category": "Anytime TD", "pick": "Tucker Kraft Anytime TD (+185) / Christian Watson Anytime TD (+155)", "units": 0.5, "rating": "64/100", "edge": "+4.75c", "status": "PENDING"},
        ]
    }
    # Merge, never replace: the canonical file carries the settlement, the
    # merge resolution, the record reconciliation and the OWNER-ATTESTED flag
    # on the 16-5 base, none of which this pre-game builder produces.
    existing_ledger = {}
    if LEDGER_JSON.exists():
        try:
            existing_ledger = json.loads(LEDGER_JSON.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Refusing to overwrite unparseable {LEDGER_JSON}: {exc}")
    owned_top = {"engine_version", "as_of", "verified_record", "tonight_pending_card_car_at_gb"}
    owned_vr = set(ledger["verified_record"])
    kept_top = sorted(set(existing_ledger) - owned_top)
    kept_vr = sorted(set(existing_ledger.get("verified_record", {})) - owned_vr)
    ledger = merge_preserving(existing_ledger, ledger)
    ledger["tonight_pending_card_car_at_gb"] = merge_card_rows(
        existing_ledger.get("tonight_pending_card_car_at_gb", []),
        ledger["tonight_pending_card_car_at_gb"],
    )
    print(f"[ledger-json] preserving {len(kept_top)} file-only top-level key(s): {kept_top}")
    print(f"[ledger-json] preserving {len(kept_vr)} file-only verified_record field(s): {kept_vr}")

    settled = ledger_is_settled(existing_ledger)
    if settled and not args.force:
        survey_record = existing_ledger.get("verified_record", {})
        banner = survey_record.get("display_banner") or f"{survey_record.get('wins')}-{survey_record.get('losses')}"
        message = (
            "Refusing to rewrite %s: the card is already SETTLED (%s).\n"
            "This is a PRE-GAME builder; re-running it would regenerate the stale 16-5 numbers over the\n"
            "settled record and its per-row results. Use --dry-run to inspect, or --force to override on purpose."
            % (LEDGER_JSON, banner)
        )
        if args.dry_run:
            print("[dry-run] REFUSED (settled ledger): " + message.splitlines()[0])
        else:
            raise SystemExit(message)

    if not args.dry_run:
        LEDGER_JSON.write_text(json.dumps(ledger, indent=2), encoding="utf-8")
    elif not settled:
        print(f"[dry-run] would write {LEDGER_JSON}")

    # Write NEW-ENGINE-OFFICIAL-LEDGER-16-5.md
    ledger_md_lines = [
        "# OFFICIAL NEW ENGINE VERIFIED LEDGER (`16-5` · `76.2%` · `+10.45u`)",
        "",
        "> **STANDING RECORD RULE (Garrett — HARD):** We track only the **New Engine** record: **`16-5 (76.2%) · +10.45 Units (+49.8% ROI)`** entering Tonight's `Carolina Panthers @ Green Bay Packers` game (`Thu Oct 29, 2026 · 8:15 PM ET`).",
        "",
        "| Metric | Official Verified Value |",
        "| :--- | :--- |",
        "| **Wins – Losses – Pushes** | **`16 - 5 - 0`** |",
        "| **Win Percentage** | **`76.2%` (`16 / 21`)** |",
        "| **Net Units Won** | **`+10.45 Units`** |",
        "| **Return on Investment (ROI)** | **`+49.8%`** |",
        "| **Active Pending Slate (`CAR @ GB`)** | **21 Official Tracked Plays (Graded Post-Game Tonight)** |",
        "",
        "## Tonight's Official Tracked Card (`CAR @ GB` — Thu Oct 29, 2026)",
        "",
        "| ID | Category | Official Tracked Pick | Units | Rating | Edge / CLV | Status |",
        "| :--- | :--- | :--- | :---: | :---: | :---: | :---: |",
    ]
    for item in ledger["tonight_pending_card_car_at_gb"]:
        ledger_md_lines.append(
            f"| `{item['id']}` | {item['category']} | **{item['pick']}** | `{item['units']:.2f}u` | **`{item['rating']}`** | `{item['edge']}` | `{item['status']}` |"
        )
    generated_md = "\n".join(ledger_md_lines) + "\n"
    if args.dry_run:
        existing_md = LEDGER_MD.read_text(encoding="utf-8") if LEDGER_MD.exists() else ""
        losses = check_markdown_clobber(existing_md, generated_md)
        if losses:
            print(f"[dry-run] REFUSED to write {LEDGER_MD.name}; it would destroy:")
            for loss in losses:
                print(f"  - {loss}")
        else:
            print(f"[dry-run] {LEDGER_MD.name} is safe to regenerate")
    else:
        try:
            write_markdown(LEDGER_MD, generated_md, force=args.force)
        except RefuseToClobber as exc:
            raise SystemExit(str(exc))

    by_cat = {}
    for m in markets:
        by_cat.setdefault(m["category"], []).append(m)

    sec_lines = [
        "\n---\n",
        "\n".join(ledger_md_lines),
        "\n---\n",
        "## COMPLETE 360-DEGREE BOARD REVIEW — ALL 85 MARKETS (`1Q–4Q`, `1H/2H`, `KICKING`, `DEFENSE/IDP`, `INTs`, `TDs`, `PROPS`)\n",
    ]
    for cat, rows in by_cat.items():
        sec_lines.append(f"### {cat}\n")
        sec_lines.append("| Subject | Market | Live DK Line (Open) | 10k-Sim Mean | Official Call | Rating | Edge / CLV | Tactical & Film Rationale |")
        sec_lines.append("| :--- | :--- | :--- | :---: | :--- | :---: | :---: | :--- |")
        for r in rows:
            sec_lines.append(
                f"| **{r['subject']}** | {r['market']} | `{r['line']}` (`{r['open_line']}`) | `{r['sim_mean']}` | **{r['official_call']}** | **`{r['rating']}`** | `{r['edge_cents']}` | {r['rationale']} |"
            )
        sec_lines.append("")

    sec_lines.append("### 8. Touchdown Scorer Props (`Anytime TD`, `1Q TD`, `D/ST TD`)\n")
    sec_lines.append("| Player / Unit | Market | Live DK Odds | 10k-Sim Prob | Fair Odds | Official Call | Rating | Edge / CLV | Rationale |")
    sec_lines.append("| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |")
    for t in td_markets:
        sec_lines.append(
            f"| **{t['player']}** | {t['market']} | `{t['live_dk_odds']}` | `{t['sim_prob_pct']}%` | `{t['fair_odds']}` | **{t['decision']}** | **`{t['rating']}`** | `{t['edge_cents']}` | {t['rationale']} |"
        )

    if not args.dry_run:
        cur_text = MASTER_MD.read_text(encoding="utf-8")
        if "# OFFICIAL NEW ENGINE VERIFIED LEDGER" in cur_text:
            cur_text = cur_text.split("# OFFICIAL NEW ENGINE VERIFIED LEDGER")[0]
        MASTER_MD.write_text(cur_text + "\n".join(sec_lines) + "\n", encoding="utf-8")

    # ---------------------------------------------------------------------
    # This builder is a PRE-GAME generator: every card row above is written
    # `PENDING` from a hardcoded list and it never reads a result. Once the
    # game is settled that is a false statement, so the settlement pass must
    # run straight after it. Failing here is better than silently republishing
    # 21 PENDING rows on a settled slate.
    # ---------------------------------------------------------------------
    if args.dry_run:
        if settled and not args.force:
            print("[dry-run] settled ledger: the settlement pass would not be run. Nothing written.")
        else:
            print("[dry-run] would run the settlement pass; nothing written.")
        return 0

    settlement_pass = REPO / "scripts" / "ops" / "settle_car_gb_card_2026_10_29.py"
    if not settlement_pass.exists():
        raise SystemExit(f"Settlement pass missing: {settlement_pass}. Refusing to leave the card PENDING.")
    subprocess.run([sys.executable, str(settlement_pass)], check=True)

    print(f"Saved Official 16-5 Ledger to {LEDGER_JSON}, {LEDGER_MD}, and updated {MASTER_MD}")
    return 0


def _parse_args(argv):
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="report what would be written and what would be preserved; write nothing",
    )
    parser.add_argument(
        "--force",
        "--force-write-md",
        dest="force",
        action="store_true",
        help="overwrite a settled ledger / annotated Markdown even though it holds content this builder does not produce",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    main(sys.argv[1:])
