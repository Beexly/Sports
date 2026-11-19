"""Bridge helper allowing CLI and scripts to invoke Lineup Doctor with sample data."""

from __future__ import annotations

from gse_engine.lineup_doctor import LineupAuditReport, audit_and_repair_lineup
from gse_engine.models import DfsPlayerPoolItem


def quick_doctor_selftest() -> LineupAuditReport:
    """Executes an offline deterministic Lineup Doctor sanity check."""
    pool = [
        DfsPlayerPoolItem(
            "qb1", "C.J. Stroud", "HOU", "QB", 5900, "2026-11-15T18:00Z", 22.5, 2.6, 62.0
        ),
        DfsPlayerPoolItem(
            "rb1", "James Cook III", "BUF", "RB", 7400, "2026-11-15T18:00Z", 22.4, 2.5, 48.0
        ),
        DfsPlayerPoolItem(
            "rb2", "Christian McCaffrey", "SF", "RB", 8500, "2026-11-15T21:25Z", 21.1, 2.4, 58.0
        ),
        DfsPlayerPoolItem(
            "wr1", "Matthew Golden", "GB", "WR", 7300, "2026-11-15T18:00Z", 15.7, 2.2, 54.0
        ),
        DfsPlayerPoolItem(
            "wr2", "Khalil Shakir", "BUF", "WR", 5300, "2026-11-15T18:00Z", 11.6, 2.3, 49.0
        ),
        DfsPlayerPoolItem(
            "wr3", "Xavier Hutchinson", "HOU", "WR", 4000, "2026-11-15T18:00Z", 11.6, 2.4, 41.0
        ),
        DfsPlayerPoolItem(
            "te1", "Dalton Schultz", "HOU", "TE", 3400, "2026-11-15T18:00Z", 12.9, 2.5, 46.0
        ),
        DfsPlayerPoolItem(
            "rb3", "Ashton Jeanty", "LV", "RB", 5400, "2026-11-15T21:05Z", 16.6, 2.4, 51.0
        ),
        DfsPlayerPoolItem(
            "dst1", "Vikings", "MIN", "DST", 2800, "2026-11-15T18:00Z", 7.6, 2.3, 60.0
        ),
    ]
    return audit_and_repair_lineup(pool, pool)
