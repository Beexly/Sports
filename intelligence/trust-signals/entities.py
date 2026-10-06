# Provenance: beat-desk spec Layer 3 "entity-resolve to team/player/game"
# (2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md, line 68).
# Verified in deep/c05/verified-claims.md §1.
# Honesty: challenges.md C9 — the spec gives no resolution method. This is a
# deterministic alias-table resolver. Unresolved entities → data_gap, never a guess.
# Fuzzy/LLM resolution is a future lane, not shipped.

"""Deterministic entity resolution: team aliases + caller-supplied player roster."""

from __future__ import annotations

import re
import unicodedata

# All 32 teams: code → alias list (city, name, abbreviation, common variants).
TEAM_ALIASES: dict[str, tuple[str, ...]] = {
    "ARI": ("arizona", "cardinals", "arizona cardinals", "ari", "cards"),
    "ATL": ("atlanta", "falcons", "atlanta falcons", "atl"),
    "BAL": ("baltimore", "ravens", "baltimore ravens", "bal"),
    "BUF": ("buffalo", "bills", "buffalo bills", "buf"),
    "CAR": ("carolina", "panthers", "carolina panthers", "car"),
    "CHI": ("chicago", "bears", "chicago bears", "chi"),
    "CIN": ("cincinnati", "bengals", "cincinnati bengals", "cin"),
    "CLE": ("cleveland", "browns", "cleveland browns", "cle"),
    "DAL": ("dallas", "cowboys", "dallas cowboys", "dal"),
    "DEN": ("denver", "broncos", "denver broncos", "den"),
    "DET": ("detroit", "lions", "detroit lions", "det"),
    "GB": ("green bay", "packers", "green bay packers", "gb", "gnb"),
    "HOU": ("houston", "texans", "houston texans", "hou"),
    "IND": ("indianapolis", "colts", "indianapolis colts", "ind"),
    "JAX": ("jacksonville", "jaguars", "jacksonville jaguars", "jax", "jac"),
    "KC": ("kansas city", "chiefs", "kansas city chiefs", "kc"),
    "LV": ("las vegas", "raiders", "las vegas raiders", "lv", "oak"),
    "LAC": ("los angeles chargers", "chargers", "lac", "sd"),
    "LAR": ("los angeles rams", "rams", "lar", "stl"),
    "MIA": ("miami", "dolphins", "miami dolphins", "mia"),
    "MIN": ("minnesota", "vikings", "minnesota vikings", "min"),
    "NE": ("new england", "patriots", "new england patriots", "ne"),
    "NO": ("new orleans", "saints", "new orleans saints", "no"),
    "NYG": ("giants", "new york giants", "nyg"),
    "NYJ": ("jets", "new york jets", "nyj"),
    "PHI": ("philadelphia", "eagles", "philadelphia eagles", "phi"),
    "PIT": ("pittsburgh", "steelers", "pittsburgh steelers", "pit"),
    "SF": ("san francisco", "49ers", "niners", "san francisco 49ers", "sf"),
    "SEA": ("seattle", "seahawks", "seattle seahawks", "sea"),
    "TB": ("tampa bay", "buccaneers", "bucs", "tampa", "tb"),
    "TEN": ("tennessee", "titans", "tennessee titans", "ten"),
    "WAS": ("washington", "commanders", "washington commanders", "was", "wsh"),
}

# Build a longest-match-first lookup: alias → code.
_ALIAS_TO_CODE: list[tuple[str, str]] = sorted(
    ((alias, code) for code, aliases in TEAM_ALIASES.items() for alias in aliases),
    key=lambda kv: -len(kv[0]),
)


def normalize_name(name: str) -> str:
    """Lowercase, strip accents/punctuation/suffixes (Jr/Sr/II/III/IV/V)."""
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = name.lower()
    name = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b\.?", "", name)
    name = re.sub(r"[^a-z ]", " ", name)
    return re.sub(r"\s+", " ", name).strip()


def resolve_teams(text: str) -> list[str]:
    """All team codes mentioned in the text, in order of appearance.

    Short aliases (<=3 chars) only match in UPPERCASE — "no", "was", "sea", "ten",
    "pit", "car", "den", "min" are ordinary English words in lowercase. Longer
    aliases (team names, cities) match case-insensitively.
    """
    hits: list[tuple[int, str]] = []
    for alias, code in _ALIAS_TO_CODE:
        if len(alias) <= 3:
            pattern = r"(?<![A-Z])" + re.escape(alias.upper()) + r"(?![A-Z])"
            haystack = text
        else:
            pattern = r"(?<![a-z])" + re.escape(alias) + r"(?![a-z])"
            haystack = text.lower()
        for m in re.finditer(pattern, haystack):
            hits.append((m.start(), code))
    hits.sort(key=lambda h: h[0])
    found: list[str] = []
    for _, code in hits:
        if code not in found:
            found.append(code)
    return found


def resolve_player(text: str, roster: dict[str, str]) -> tuple[str | None, str | None]:
    """Match a player name in text against a caller-supplied roster.

    roster: {normalized_name: player_id}. Returns (player_id, matched_name).
    No match → (None, None); the caller records data_gap. Never guesses.
    """
    normalized_roster = {normalize_name(k): v for k, v in roster.items()}
    lowered = " " + normalize_name(text) + " "
    # Longest names first so "jaylen warren" beats "warren" alone.
    for name in sorted(normalized_roster, key=len, reverse=True):
        if len(name) < 4:
            continue
        if f" {name} " in lowered:
            return normalized_roster[name], name
    return None, None
