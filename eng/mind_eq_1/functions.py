"""Complex equations from equations_stated.jsonl lines 8001-end.

Each function is home minus away of a formula whose every input is an
exact column already on disk. Caller must pass point-in-time values
lagged by at most 2 seasons. No h_qb_act. No FTN fields. No score.
"""

def _num(row, name):
    if row is None:
        return None
    try:
        v = row[name]
    except Exception:
        return None
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None



FUNCTIONS = {
}

