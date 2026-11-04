"""Six-dimension data quality suite for research-corpus manifests.

WHY THIS EXISTS

corpus_contract validates SHAPE - a field's type, presence, and basic sanity.
That covers the Validity dimension and part of Completeness, and nothing else.
Four of the six standard dimensions were simply unchecked:

  Completeness  are required fields present, and how much of each row is filled?
  Uniqueness    is the primary key actually unique?
  Validity      are values in range and correctly typed?          (contract only)
  Consistency   do fields contradict each other?
  Timeliness    is the data recent enough to be useful?
  Volume        is the row count in a sane band?

A manifest can be 100% contract-valid and still carry duplicate keys, stale rows,
contradictory flags, or a collapsed row count. This suite checks the other five.

DESIGN

  * Every check returns a Result with the OBSERVED value, not just a boolean.
    "passed" without a number cannot distinguish a healthy corpus from a check
    that silently stopped inspecting anything.
  * Thresholds are arguments with measured defaults, per the playbook's "don't
    hardcode thresholds" rule. A corpus that legitimately grows past a bound
    should be re-baselined deliberately, not by editing a literal.
  * Checks are independent: one failing dimension does not suppress the others.
  * Exit codes: 0 all pass, 1 at least one hard check failed, 2 cannot run.
    Warnings never change the exit code - a corpus with thin rows is normal.

USAGE
    python scripts/ops/data_quality.py --manifest <path>
    python scripts/ops/data_quality.py --manifest <path> --json
    python scripts/ops/data_quality.py --manifest <path> --max-age-hours 48
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from intelligence.research.corpus_contract import validate_record  # noqa: E402

# Fields every record must carry to be retrievable at all.
REQUIRED_FIELDS = ("source", "source_id", "title")
# Fields whose presence materially improves retrieval.
EXPECTED_FIELDS = ("abstract", "year", "url", "retrieved_at")

PASS, WARN, FAIL = "pass", "warn", "fail"


@dataclass
class Result:
    dimension: str
    check: str
    status: str
    observed: object
    threshold: object = None
    detail: str = ""
    samples: list[str] = field(default_factory=list)

    @property
    def failed(self) -> bool:
        return self.status == FAIL


@dataclass
class Report:
    manifest: str
    rows: int
    results: list[Result] = field(default_factory=list)

    def add(self, r: Result) -> None:
        self.results.append(r)

    @property
    def failures(self) -> list[Result]:
        return [r for r in self.results if r.status == FAIL]

    @property
    def warnings(self) -> list[Result]:
        return [r for r in self.results if r.status == WARN]

    @property
    def ok(self) -> bool:
        return not self.failures

    def to_dict(self) -> dict:
        return {
            "manifest": self.manifest,
            "rows": self.rows,
            "ok": self.ok,
            "counts": {
                PASS: sum(1 for r in self.results if r.status == PASS),
                WARN: len(self.warnings),
                FAIL: len(self.failures),
            },
            "results": [
                {"dimension": r.dimension, "check": r.check, "status": r.status,
                 "observed": r.observed, "threshold": r.threshold,
                 "detail": r.detail, "samples": r.samples[:5]}
                for r in self.results
            ],
        }


def load(path: Path) -> tuple[list[dict], list[str]]:
    """Parse rows; unparseable lines are returned separately, never dropped."""
    rows, bad = [], []
    with path.open("r", encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as exc:
                bad.append(f"line {lineno}: {exc.msg}")
                continue
            if isinstance(obj, dict):
                rows.append(obj)
            else:
                bad.append(f"line {lineno}: {type(obj).__name__}, not an object")
    return rows, bad


# --- dimensions -----------------------------------------------------------

def check_completeness(rows: list[dict], min_title_rate: float) -> list[Result]:
    out = []
    n = len(rows) or 1

    for name in REQUIRED_FIELDS:
        present = sum(1 for r in rows if isinstance(r.get(name), str) and r[name].strip())
        rate = present / n
        out.append(Result(
            "completeness", f"{name}_present",
            FAIL if rate < min_title_rate else PASS,
            f"{present}/{len(rows)} ({rate:.1%})", f">= {min_title_rate:.0%}",
            f"required field {name!r} missing or blank on {len(rows)-present} row(s)",
        ))

    for name in EXPECTED_FIELDS:
        present = sum(1 for r in rows if r.get(name) not in (None, "", [], {}))
        rate = present / n
        out.append(Result(
            "completeness", f"{name}_coverage",
            WARN if rate < 0.95 else PASS,
            f"{present}/{len(rows)} ({rate:.1%})", ">= 95%",
            f"optional-but-useful field {name!r} absent on {len(rows)-present} row(s)",
        ))

    # Rows with neither abstract nor full text are title-only: rankable, thin.
    # str() coercion on both sides because either field may arrive as null.
    thin = [r for r in rows if not str(r.get("abstract") or "").strip()
            and not str(r.get("full_text") or "").strip()]
    rate = len(thin) / n
    out.append(Result(
        "completeness", "has_searchable_body",
        WARN if rate > 0.25 else PASS,
        f"{len(thin)}/{len(rows)} title-only ({rate:.1%})", "<= 25%",
        "rows with no abstract and no full_text carry only their title",
        [str(r.get("source_id")) for r in thin[:5]],
    ))
    return out


def check_uniqueness(rows: list[dict]) -> list[Result]:
    out = []
    ids = [r.get("source_id") for r in rows]
    seen = Counter(ids)
    dupes = {k: v for k, v in seen.items() if v > 1 and k}
    out.append(Result(
        "uniqueness", "source_id_unique",
        FAIL if dupes else PASS,
        f"{len(dupes)} duplicated key(s)", "0",
        "duplicate primary keys would double-count rows downstream",
        [f"{k} x{v}" for k, v in list(dupes.items())[:5]],
    ))

    # str() coercion is load-bearing: title may be a non-string on malformed
    # rows, and a quality suite that crashes on bad data is worse than useless.
    # This exact line raised AttributeError on an int title during self-test.
    titles = Counter(str(r.get("title") or "").strip().lower() for r in rows)
    dup_titles = {k: v for k, v in titles.items() if v > 1 and k}
    out.append(Result(
        "uniqueness", "title_not_duplicated",
        WARN if dup_titles else PASS,
        f"{len(dup_titles)} duplicated title(s)", "0",
        "same title under different ids usually means a cross-source duplicate",
        [f"{k[:58]} x{v}" for k, v in list(dup_titles.items())[:5]],
    ))
    return out


def check_validity(rows: list[dict], year_min: int, year_max: int) -> list[Result]:
    out = []
    bad_rows, by_field = 0, Counter()
    for i, r in enumerate(rows):
        rep = validate_record(r, index=i)
        if rep.errors:
            bad_rows += 1
            for issue in rep.errors:
                by_field[issue.field] += 1
    out.append(Result(
        "validity", "contract_compliance",
        FAIL if bad_rows else PASS,
        f"{bad_rows}/{len(rows)} row(s) with contract errors", "0",
        "shape and type violations per the data contract",
        [f"{k}={v}" for k, v in by_field.most_common(5)],
    ))

    # Coerce numeric strings. Measured 2026-11-04: the corpus stores year as
    # int on 4,878 rows and as str on 1,789. Counting only ints made this check
    # silently inspect 73% of the data while reporting a clean result.
    years: list[int] = []
    for r in rows:
        raw = r.get("year")
        if isinstance(raw, bool):
            continue
        if isinstance(raw, int):
            years.append(raw)
        elif isinstance(raw, str) and raw.strip().isdigit():
            years.append(int(raw.strip()))
    out_of_range = [y for y in years if not (year_min <= y <= year_max)]
    out.append(Result(
        "validity", "year_in_range",
        FAIL if len(out_of_range) > len(years) * 0.01 else
        (WARN if out_of_range else PASS),
        f"{len(out_of_range)}/{len(years)} outside [{year_min},{year_max}]",
        "<= 1%",
        "impossible years usually mean a parse or harvest error",
        [str(y) for y in out_of_range[:5]],
    ))
    return out


def check_consistency(rows: list[dict]) -> list[Result]:
    out = []
    # A has_full_text flag that disagrees with the field itself is a contradiction.
    contradictions = [r for r in rows
                      if "has_full_text" in r
                      and bool(r["has_full_text"]) != bool(str(r.get("full_text") or "").strip())]
    out.append(Result(
        "consistency", "full_text_flag_matches_value",
        FAIL if contradictions else PASS,
        f"{len(contradictions)} contradictory row(s)", "0",
        "has_full_text disagrees with whether full_text has content",
        [str(r.get("source_id")) for r in contradictions[:5]],
    ))

    # Every row should carry provenance from exactly one stage.
    stamped = [r for r in rows if r.get("_validated_at") or r.get("_repaired_at")]
    unstamped = len(rows) - len(stamped)
    both = sum(1 for r in rows if r.get("_validated_at") and r.get("_repaired_at"))
    out.append(Result(
        "consistency", "provenance_present",
        WARN if unstamped else PASS,
        f"{len(stamped)}/{len(rows)} stamped, {both} double-stamped", "all stamped",
        "rows that bypassed ingest carry no validation or repair stamp",
    ))

    # One field, two types. year arrives as int on some rows and str on others;
    # downstream range filters and sorts break on a mixed column even though each
    # row individually passes the contract.
    year_types = Counter(
        type(r.get("year")).__name__ for r in rows if r.get("year") is not None
    )
    mixed = len([t for t, c in year_types.items() if c]) > 1
    out.append(Result(
        "consistency", "year_single_type",
        WARN if mixed else PASS,
        ", ".join(f"{t}={c}" for t, c in year_types.most_common()), "1 type",
        "mixed int/str year breaks range filters and sorts",
    ))

    # full_text without a pdf_path is plausible; pdf_path without full_text is not.
    orphan_pdf = [r for r in rows
                  if str(r.get("pdf_path") or "").strip()
                  and not str(r.get("full_text") or "").strip()]
    rate = len(orphan_pdf) / (len(rows) or 1)
    out.append(Result(
        "consistency", "pdf_path_implies_extracted_text",
        WARN if rate > 0.05 else PASS,
        f"{len(orphan_pdf)} row(s) with pdf_path but no full_text ({rate:.1%})", "<= 5%",
        "a downloaded PDF that produced no text is an extraction failure",
        [str(r.get("source_id")) for r in orphan_pdf[:5]],
    ))
    return out


def check_timeliness(rows: list[dict], max_age_hours: float) -> list[Result]:
    now = datetime.now(timezone.utc)
    ages: list[float] = []
    unparsed = 0
    for r in rows:
        raw = r.get("retrieved_at")
        if not raw:
            continue
        try:
            d = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            if d.tzinfo is None:
                d = d.replace(tzinfo=timezone.utc)
            ages.append((now - d).total_seconds() / 3600)
        except ValueError:
            unparsed += 1

    out = []
    if ages:
        ages.sort()
        median = ages[len(ages) // 2]
        stale = sum(1 for a in ages if a > max_age_hours)
        out.append(Result(
            "timeliness", "median_age_hours",
            WARN if median > max_age_hours / 2 else PASS,
            f"{median:.1f}h (max {ages[-1]:.1f}h)", f"<= {max_age_hours:.0f}h",
            "how long ago the median record was harvested",
        ))
        out.append(Result(
            "timeliness", "stale_rows",
            FAIL if stale else PASS,
            f"{stale}/{len(ages)} older than {max_age_hours:.0f}h", "0",
            "records older than the freshness SLA",
        ))
    missing = len(rows) - len(ages) - unparsed
    out.append(Result(
        "timeliness", "retrieved_at_parseable",
        WARN if unparsed else PASS,
        f"{unparsed} unparseable, {len(rows)-len(ages)} absent", "0 unparseable",
        "freshness cannot be judged for rows with no usable timestamp",
    ))
    return out


def check_volume(rows: list[dict], min_rows: int, max_rows: int) -> list[Result]:
    n = len(rows)
    status = FAIL if n < min_rows or n > max_rows else PASS
    return [Result(
        "volume", "row_count_in_band",
        status, f"{n} rows", f"[{min_rows}, {max_rows}]",
        "a collapsed or exploded row count usually means an upstream failure",
    )]


# --- driver ---------------------------------------------------------------

def evaluate(rows: list[dict], *, min_title_rate=0.98, year_min=1900, year_max=2027,
             max_age_hours=168.0, min_rows=1, max_rows=5_000_000) -> list[Result]:
    return [
        *check_completeness(rows, min_title_rate),
        *check_uniqueness(rows),
        *check_validity(rows, year_min, year_max),
        *check_consistency(rows),
        *check_timeliness(rows, max_age_hours),
        *check_volume(rows, min_rows, max_rows),
    ]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Six-dimension corpus quality suite")
    ap.add_argument("--manifest", type=Path, required=True)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--min-title-rate", type=float, default=0.98)
    ap.add_argument("--year-min", type=int, default=1900)
    ap.add_argument("--year-max", type=int, default=2027)
    ap.add_argument("--max-age-hours", type=float, default=168.0)
    ap.add_argument("--min-rows", type=int, default=1)
    ap.add_argument("--max-rows", type=int, default=5_000_000)
    args = ap.parse_args(argv)

    if not args.manifest.exists():
        print(f"missing manifest: {args.manifest}", file=sys.stderr)
        return 2

    rows, bad = load(args.manifest)
    report = Report(manifest=str(args.manifest), rows=len(rows))
    if bad:
        report.add(Result(
            "validity", "lines_parseable",
            FAIL if len(bad) > len(rows) * 0.01 else WARN,
            f"{len(bad)} unparseable line(s)", "<= 1%",
            "lines that are not JSON objects are invisible to every other check",
            bad[:5],
        ))
    for r in evaluate(rows, min_title_rate=args.min_title_rate,
                      year_min=args.year_min, year_max=args.year_max,
                      max_age_hours=args.max_age_hours,
                      min_rows=args.min_rows, max_rows=args.max_rows):
        report.add(r)

    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        c = report.to_dict()["counts"]
        print(f"{args.manifest.name}: {len(rows)} rows  "
              f"pass={c[PASS]} warn={c[WARN]} fail={c[FAIL]}")
        print()
        print(f"{'dimension':<14} {'check':<32} {'status':<6} {'observed':<34}")
        print("-" * 92)
        for r in report.results:
            print(f"{r.dimension:<14} {r.check:<32} {r.status:<6} {str(r.observed):<34}")
            for s in r.samples[:3]:
                print(f"{'':<14}   - {s}")
        if report.failures:
            print()
            print("FAILURES:")
            for r in report.failures:
                print(f"  {r.dimension}/{r.check}: {r.detail}")

    return 0 if report.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
