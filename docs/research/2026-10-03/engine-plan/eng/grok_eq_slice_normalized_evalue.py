def slice_normalized_evalue(score_obs, score_refs):
    """Guarded normalized-score e-value factor from Cortinovis et al arXiv:2610.13855.
    E = score_obs / mean(score_obs + score_refs)
    Fail-closed: returns None on invalid input (non-positive scores, empty refs, etc.).
    """
    try:
        s_obs = float(score_obs)
        if s_obs <= 0:
            return None
        refs = [float(r) for r in score_refs]
        if not refs or any(r <= 0 for r in refs):
            return None
        all_scores = [s_obs] + refs
        mean_s = sum(all_scores) / len(all_scores)
        if mean_s <= 0:
            return None
        return s_obs / mean_s
    except (TypeError, ValueError):
        return None
