# PROVENANCE — gse-intelligence-build / qb / luck.py
# Implements SYS-24 — Luck-layer margin pricer (edge-sheet).
#
# Research: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md §SYS-24
#   (source: predictions/research/2026-09-17/edge-sheet/README.md
#    :13,41,48,50,57,101,103). Corroborated by dossier-v2 (r41) — two
#   independent sources agree on ~4.5 points per turnover and ~0.00
#   fumble-recovery year-over-year correlation.
#
# DATA BASIS: closed-form research formulas and priors — no dataset. Inputs
# (net EPA/play) are garbage-time/kneel/spike/WP<0.05-excluded per the
# edge-sheet definition; OT retained.

"""Edge-sheet luck layer (SYS-24): fair margin, turnover priors, neutral band."""


def fumble_recovery_is_noise():
    """True — fumble recovery is pure noise (YoY correlation ~0.00).

    Data basis: edge-sheet prior (flat 50% recovery), corroborated by
    dossier-v2 (r41). Never model recovery as a repeatable team/QB skill.
    """
    return True


def turnover_to_points():
    """~4.5 points per turnover (edge-sheet; corroborated by dossier-v2 r41).

    Data basis: research prior, not estimated here. Used to convert
    expected-turnover differentials into margin points.
    """
    return 4.5


def fair_margin(home_net_epa, away_net_epa):
    """Fair margin = (home net EPA/play − away net EPA/play) × 63 + 2.0.

    Data basis: edge-sheet formula (SYS-24). 63 ≈ expected non-garbage plays
    per team-game in the sheet's calibration; +2.0 is the home-field constant.
    Inputs must be garbage-time/kneel/spike/WP<0.05-excluded net EPA/play.
    """
    return (home_net_epa - away_net_epa) * 63 + 2.0


NEUTRAL_BAND_HALF_WIDTH = 1.5


def luck_band(actual_margin, expected_margin,
              half_width=NEUTRAL_BAND_HALF_WIDTH):
    """Publish gate: only act outside the |actual − expected| < 1.5 neutral band.

    Data basis: edge-sheet expected-turnover band rule (SYS-24) — inside the
    band the luck differential is not distinguishable from noise, so nothing
    publishes. Returns "neutral" or "publish".
    """
    if abs(actual_margin - expected_margin) < half_width:
        return "neutral"
    return "publish"


def luck_adjusted_margin(home_net_epa, away_net_epa, home_takeaways,
                         away_takeaways, expected_home_takeaways,
                         expected_away_takeaways):
    """Fair margin with the turnover-luck layer applied, plus publish gate.

    Turnover luck lives on the *takeaway* side (forced turnovers — fumble
    recoveries and INTs are the noisy components per the 50%/0.00 priors):
    luck = (takeaways − expected takeaways) × 4.5 pts. Lucky takeaways
    flattered the team's EPA-based margin, so the luck points are removed.
    (Giveaway luck is the mirror image; express it through the opponent's
    takeaways.) Publishes only outside the neutral band.
    Data basis: SYS-24 formulas throughout.
    """
    base = fair_margin(home_net_epa, away_net_epa)
    home_luck_pts = (home_takeaways - expected_home_takeaways) * turnover_to_points()
    away_luck_pts = (away_takeaways - expected_away_takeaways) * turnover_to_points()
    # lucky takeaways flattered the team: remove the luck from their margin
    adjusted = base - (home_luck_pts - away_luck_pts)
    return {
        "fair_margin": base,
        "home_turnover_luck_pts": float(home_luck_pts),
        "away_turnover_luck_pts": float(away_luck_pts),
        "luck_adjusted_margin": float(adjusted),
        "band": luck_band(adjusted, base),
        "data_basis": "SYS-24: fair margin, 4.5 pts/turnover, 1.5 neutral band",
    }
