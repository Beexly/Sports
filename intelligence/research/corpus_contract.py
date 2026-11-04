"""Data contract for research-corpus manifest rows.

WHY THIS EXISTS

The corpus has no schema. Measured 2026-11-04: 45 scripts under scripts/research
and scripts/ops build ``{"source", "title", "text"}``-shaped dicts independently,
``intelligence/research/`` defines zero dataclasses or TypedDicts for them, and
``corpus_index.build_index`` reads every field with ``r.get(...)`` defaults.
Consequences, both observed:

  * a row with ``title: 12345`` crashed ``build_index`` outright, because
    ``sport_domain_of`` joined the parts with ``" ".join`` and an int is not a
    str. One bad row took the whole 6,495-record corpus down.
  * a row with no ``title`` was accepted and indexed as an empty document. It
    counts toward ``n``, contributes no terms, and is unretrievable. Silent.

Fixing the crash made the pipeline survive bad rows, but it did not stop bad
rows from being written. This module is the boundary: validate *before* the
record reaches a sink, and say exactly which field is wrong.

DESIGN NOTES

* Warnings vs errors. A missing ``title`` is an ERROR (the row is unretrievable).
  A missing ``year`` or ``doi`` is a WARNING (rankable, just thin). The split
  matters: if everything is fatal, callers stop validating.
* Unknown keys are preserved, never stripped. This is a corpus of 11 sources with
  their own fields; a contract that deletes data is worse than no contract.
* No third-party dependency. pydantic/jsonschema would be reasonable, but this
  repo's corpus tooling runs with the stdlib only and adding a validator library
  to a script that runs unattended at 3am is a new failure mode.
* ``allowed`` is a tuple of admitted source names. Unregistered sources are
  reported rather than dropped, so a new harvester gets noticed.

USAGE

    from intelligence.research.corpus_contract import validate_record, strict

    issues = validate_record(row)
    if strict(issues):
        raise ValueError(format_issues(issues, row))

    # whole-file audit, no mutation
    report = audit_manifest(path)
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Iterator, Sequence

# Fields that must be strings when present. A non-str here is always a bug:
# these are the fields the index tokenizes and displays.
STRING_FIELDS = ("title", "abstract", "full_text", "source", "source_id",
                 "venue", "doi", "url", "pdf_url", "backfill_method")

# Fields the index tolerates as missing, but which reduce retrievability.
SOFT_FIELDS = ("year", "abstract", "topics", "source")

# Sources that have a registered harvester. Extend deliberately.
ALLOWED_SOURCES = ("arxiv", "openalex", "local_pdf", "local_doc", "web_pdf",
                   "huggingface", "kaggle", "s2", "crossref", "pubmed", "other")

ERROR = "error"
WARNING = "warning"


@dataclass(frozen=True)
class Issue:
    field: str
    severity: str
    message: str

    def __str__(self) -> str:  # pragma: no cover - display helper
        return f"[{self.severity}] {self.field}: {self.message}"


@dataclass
class RecordReport:
    """Outcome of validating one row."""

    index: int
    issues: list[Issue] = field(default_factory=list)
    record: dict[str, Any] = field(default_factory=dict)

    @property
    def errors(self) -> list[Issue]:
        return [i for i in self.issues if i.severity == ERROR]

    @property
    def warnings(self) -> list[Issue]:
        return [i for i in self.issues if i.severity == WARNING]

    @property
    def ok(self) -> bool:
        return not self.errors


def _nonempty_str(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_record(record: Any, index: int = -1) -> RecordReport:
    """Validate one manifest row. Never raises, never mutates the input."""
    report = RecordReport(index=index)

    if not isinstance(record, dict):
        report.issues.append(
            Issue("<record>", ERROR, f"expected a JSON object, got {type(record).__name__}")
        )
        return report

    report.record = record

    # --- hard requirements -------------------------------------------------
    if not _nonempty_str(record.get("title")):
        if "title" not in record:
            report.issues.append(Issue("title", ERROR, "missing; the row is unretrievable"))
        elif not isinstance(record.get("title"), str):
            report.issues.append(
                Issue("title", ERROR,
                      f"must be a string, got {type(record.get('title')).__name__}")
            )
        else:
            report.issues.append(Issue("title", ERROR, "empty"))

    # A row with neither abstract nor full_text has no searchable body beyond
    # its title. That is degenerate, not fatal, so it is a warning.
    if not _nonempty_str(record.get("abstract")) and not _nonempty_str(record.get("full_text")):
        report.issues.append(
            Issue("abstract", WARNING, "no abstract and no full_text; title-only row")
        )

    # --- type discipline ---------------------------------------------------
    # `title` is handled above; re-checking it here reported the same defect
    # twice, which reads as two bugs in the log when there is one.
    for name in STRING_FIELDS:
        if name == "title" or name not in record:
            continue
        value = record[name]
        if value is None:
            continue  # explicit null is an accepted "absent"
        if not isinstance(value, str):
            report.issues.append(
                Issue(name, ERROR, f"must be a string or null, got {type(value).__name__}")
            )

    # topics is a list of strings. A string here silently indexes as characters.
    topics = record.get("topics")
    if topics is not None:
        if not isinstance(topics, list):
            report.issues.append(
                Issue("topics", ERROR, f"must be a list, got {type(topics).__name__}")
            )
        elif any(not isinstance(t, str) for t in topics):
            bad = {type(t).__name__ for t in topics if not isinstance(t, str)}
            report.issues.append(
                Issue("topics", ERROR, f"every topic must be a string; found {sorted(bad)}")
            )

    # authors is a list (of strings or of {name: ...} objects, both seen in the wild).
    authors = record.get("authors")
    if authors is not None and not isinstance(authors, list):
        report.issues.append(
            Issue("authors", ERROR, f"must be a list, got {type(authors).__name__}")
        )

    # year is an int when present. A str year breaks range filtering.
    # bool is checked FIRST because isinstance(True, int) is True in Python, so
    # an int-only guard silently admits True/False as years.
    year = record.get("year")
    if year is not None:
        if isinstance(year, bool):
            report.issues.append(
                Issue("year", ERROR, "must be an int year, got bool")
            )
        elif isinstance(year, int):
            pass
        elif isinstance(year, str):
            if not year.strip().isdigit():
                report.issues.append(Issue("year", ERROR, f"not numeric: {year!r}"))
        else:
            report.issues.append(
                Issue("year", ERROR,
                      f"must be an int or numeric string, got {type(year).__name__}")
            )

    # retracted must be a bool; the index bootstraps it with bool().
    retracted = record.get("retracted")
    if retracted is not None and not isinstance(retracted, bool):
        report.issues.append(
            Issue("retracted", WARNING,
                  f"coerced by bool(); pass a real bool, got {type(retracted).__name__}")
        )

    # --- provenance --------------------------------------------------------
    source = record.get("source")
    if source is None:
        report.issues.append(Issue("source", WARNING, "no source; lineage is unknown"))
    elif isinstance(source, str) and source not in ALLOWED_SOURCES:
        report.issues.append(
            Issue("source", WARNING,
                  f"{source!r} is not a registered source {list(ALLOWED_SOURCES)}")
        )

    return report


def strict(issues: Iterable[Issue]) -> bool:
    """True when any issue is fatal."""
    return any(i.severity == ERROR for i in issues)


def format_issues(issues: Sequence[Issue], record: Any = None, index: int = -1) -> str:
    """One-line-per-issue rendering suitable for a log or an exception."""
    where = f"row {index}" if index >= 0 else "row"
    if isinstance(record, dict) and record.get("source_id"):
        where += f" (source_id={record['source_id']!r})"
    lines = [f"{where}: {len(issues)} issue(s)"]
    lines.extend(f"  {i}" for i in issues)
    return "\n".join(lines)


def iter_manifest(path: Path | str) -> Iterator[tuple[int, Any]]:
    """Yield (line_number, parsed_or_raw) so malformed lines are reportable.

    ``corpus_index.build_index`` skips invalid JSON silently. An audit must not:
    a corpus that silently drops 200 lines looks identical to one that has them.
    """
    with Path(path).open("r", encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            if not line.strip():
                continue
            try:
                yield lineno, json.loads(line)
            except json.JSONDecodeError as exc:
                yield lineno, exc


@dataclass
class ManifestReport:
    path: str
    total_lines: int = 0
    valid: int = 0
    invalid: int = 0
    rows_with_errors: int = 0
    rows_with_warnings: int = 0
    error_count: int = 0
    warning_count: int = 0
    by_field: dict[str, int] = field(default_factory=dict)
    samples: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.rows_with_errors == 0

    def summary(self) -> str:
        return (
            f"{self.path}: {self.total_lines} line(s), {self.valid} valid, "
            f"{self.invalid} unparseable, {self.rows_with_errors} row(s) with errors "
            f"({self.error_count} error(s), {self.warning_count} warning(s))"
        )


def audit_manifest(path: Path | str, sample_limit: int = 10) -> ManifestReport:
    """Validate a whole manifest without mutating it."""
    report = ManifestReport(path=str(path))
    for lineno, row in iter_manifest(path):
        report.total_lines += 1
        if isinstance(row, json.JSONDecodeError):
            report.invalid += 1
            report.error_count += 1
            if len(report.samples) < sample_limit:
                report.samples.append(f"line {lineno}: invalid JSON ({row.msg})")
            continue
        rp = validate_record(row, index=lineno)
        if rp.ok:
            report.valid += 1
        else:
            report.rows_with_errors += 1
        if rp.warnings:
            report.rows_with_warnings += 1
        report.error_count += len(rp.errors)
        report.warning_count += len(rp.warnings)
        for issue in rp.issues:
            report.by_field[issue.field] = report.by_field.get(issue.field, 0) + 1
        if rp.errors and len(report.samples) < sample_limit:
            report.samples.append(format_issues(rp.errors, row, lineno))
    return report
