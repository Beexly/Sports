"""Score-distribution engine v1: joint (margin, total) from the market lines plus empirical joint residuals.
P(margin=m, total=t | spread s, total line L) = P_resid(m - s, t - L), estimated from prior seasons (key numbers come for free).
Market anchor: location-shift the margin sample so fair cover at the quoted spread is 0.5, and the total sample so fair over is 0.5. Key-number mass moves with the mean. An engine point-shift is added only when |p-q| >= 0.01. Reweighting the moneyline alone is not allowed.
Test: ML implied by (spread, residuals) vs the de-vigged ML, walk-forward 2019-2026."""
import os, json, numpy as np, pandas as pd
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = pd.read_parquet(os.path.join(R, 'eng', 'features_v1.parquet'))
H = F[F.y.notna() & F.spread_line.notna() & F.total_line.notna() & F.result.notna()].copy()
H['rm'] = H.result - H.spread_line; H['rt'] = H.total - H.total_line

def neighborhood(hist, spread, total, bw_s=1.0, bw_t=1.5, min_n=150):
    """Joint (margin, total) sample for a game: historical games with a similar spread (margins NOT shifted, so key numbers
    3/7/10 keep their real mass), totals shifted by the line difference."""
    for k in (1, 1.5, 2, 3, 4, 6):
        nb = hist[(hist.spread_line - spread).abs() <= bw_s * k]
        if len(nb) >= min_n: break
    m = nb.result.values.astype(float)
    t = np.round(nb.total.values + (total - nb.total_line.values)).astype(float)
    return m, t
def fair_side(values, line, shift=0.0):
    v = values + shift
    return float(((v > line).sum() + 0.5 * (v == line).sum()) / len(v))
def shift_to_fair(values, line):
    """Location shift closest to fair 0.5. Margins are discrete, so search the shifts that put a
    sample point on the line and keep the closer side of that jump. A continuous search lands on
    the wrong side of the step and the published cover drifts."""
    import numpy as np
    best_s, best_d = 0.0, abs(fair_side(values, line, 0.0) - 0.5)
    for c in np.unique(line - values):
        for s in (float(c), float(c) + 1e-6):
            d = abs(fair_side(values, line, s) - 0.5)
            if d < best_d - 1e-12 or (abs(d - best_d) <= 1e-12 and abs(s) < abs(best_s)):
                best_s, best_d = s, d
    return best_s
def mk(m, t, spread, total, shift=0.0, total_shift=0.0):
    m = m + shift
    t = t + total_shift
    hp, ap = (t + m) / 2, (t - m) / 2
    home_win = float(((m > 0).sum() + 0.5 * (m == 0).sum()) / len(m))
    return dict(p_home_win=home_win, p_home_cover=float((m > spread).mean()), p_push_spread=float((m == spread).mean()),
                p_over=float((t > total).mean()), p_push_total=float((t == total).mean()),
                home_pts_median=float(np.median(hp)), away_pts_median=float(np.median(ap)), margin_mean=float(m.mean()), total_mean=float(t.mean()))
def shift_to(m, target):
    lo, hi = -14.0, 14.0
    for _ in range(40):
        mid = (lo + hi) / 2; ph = (((m + mid) > 0).sum() + 0.5 * ((m + mid) == 0).sum()) / len(m)
        if ph < target: lo = mid
        else: hi = mid
    return (lo + hi) / 2

if __name__ == '__main__':
    def ll(p, y): p = np.clip(p, 1e-6, 1 - 1e-6); return -(y * np.log(p) + (1 - y) * np.log(1 - p))
    rows = []
    for T in range(2019, 2027):
        tr = H[(H.season < T) & (H.season >= T - 8)]; te = H[H.season == T]
        for g in te.itertuples():
            m, t = neighborhood(tr, g.spread_line, g.total_line); x = mk(m, t, g.spread_line, g.total_line)
            cov = np.nan if g.result == g.spread_line else float(g.result > g.spread_line)
            ov = np.nan if g.total == g.total_line else float(g.total > g.total_line)
            pc = x['p_home_cover'] / max(1e-9, 1 - x['p_push_spread']); po = x['p_over'] / max(1e-9, 1 - x['p_push_total'])
            rows.append(dict(season=T, y=g.y, p_spread=x['p_home_win'], q=g.q, cover=cov, p_cover=pc, over=ov, p_over=po))
    D = pd.DataFrame(rows)
    r = dict(n=len(D), ll_ml_from_spread=round(float(ll(D.p_spread.values, D.y.values).mean()), 4), ll_devig_ml=round(float(ll(D.q.values, D.y.values).mean()), 4),
             ll_avg_of_both=round(float(ll((D.p_spread.values + D.q.values) / 2, D.y.values).mean()), 4),
             corr_spread_vs_ml=round(float(np.corrcoef(D.p_spread, D.q)[0, 1]), 4), mean_abs_gap=round(float((D.p_spread - D.q).abs().mean()), 4))
    c = D.dropna(subset=['cover']); o = D.dropna(subset=['over'])
    r['ats_home_cover_rate'] = round(float(c.cover.mean()), 4); r['ats_pred_mean'] = round(float(c.p_cover.mean()), 4); r['ats_ll'] = round(float(ll(c.p_cover.values, c.cover.values).mean()), 4)
    r['over_rate'] = round(float(o.over.mean()), 4); r['over_pred_mean'] = round(float(o.p_over.mean()), 4); r['over_ll'] = round(float(ll(o.p_over.values, o.over.values).mean()), 4)
    print(json.dumps(r, indent=1)); json.dump(r, open(os.path.join(R, 'eng', 'scoredist_results.json'), 'w'), indent=1)
