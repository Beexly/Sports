"""Toy rating atlas. Stdlib only. Not a pick.

Canonical vector: Glicko-2 only, and only by calling glicko2.py.
Colley, Massey, SRS, PageRank, Keener, TrueSkill, and Plackett-Luce
on the toy slate are not canonical.
TrueSkill ties are skipped.
"""

import math

import engine_math
import glicko2


def colley(games):
    """games: (winner, loser)."""
    teams = sorted({t for game in games for t in game})
    index = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    matrix = [[0.0] * n for _ in range(n)]
    wins = {t: 0.0 for t in teams}
    losses = {t: 0.0 for t in teams}
    played = {t: 0.0 for t in teams}
    for winner, loser in games:
        wins[winner] += 1.0
        losses[loser] += 1.0
        played[winner] += 1.0
        played[loser] += 1.0
        matrix[index[winner]][index[loser]] -= 1.0
        matrix[index[loser]][index[winner]] -= 1.0
    rhs = []
    for team in teams:
        i = index[team]
        matrix[i][i] = 2.0 + played[team]
        rhs.append(1.0 + (wins[team] - losses[team]) / 2.0)
    solved = engine_math.solve_linear(matrix, rhs)
    return {team: solved[index[team]] for team in teams}


def massey(games, ridge=1.0):
    """games: (home, away, home margin). Ridge normal equations, then mean zero."""
    teams = sorted({t for home, away, _m in games for t in (home, away)})
    raw = engine_math.market_strengths(teams, games, ridge=ridge)
    mean = sum(raw.values()) / len(raw)
    return {t: raw[t] - mean for t in teams}


def srs(games, damp=0.7, iters=40):
    """Damped 0.7, mean-zero each pass. games: (home, away, home margin)."""
    teams = sorted({t for home, away, _m in games for t in (home, away)})
    mov = {t: [] for t in teams}
    opps = {t: [] for t in teams}
    for home, away, margin in games:
        mov[home].append(margin)
        mov[away].append(-margin)
        opps[home].append(away)
        opps[away].append(home)
    rating = {t: 0.0 for t in teams}
    for _ in range(iters):
        target = {}
        for team in teams:
            avg_mov = sum(mov[team]) / len(mov[team])
            avg_opp = sum(rating[o] for o in opps[team]) / len(opps[team])
            target[team] = avg_mov + avg_opp
        mean = sum(target.values()) / len(target)
        for team in teams:
            centered = target[team] - mean
            rating[team] = damp * centered + (1.0 - damp) * rating[team]
    mean = sum(rating.values()) / len(rating)
    return {t: rating[t] - mean for t in teams}


def pagerank(teams, edges, damping=0.85, iters=80):
    """edges: loser -> winner, optional weight. The loser points at the winner."""
    index = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    adj = [[] for _ in range(n)]
    out_w = [0.0] * n
    for src, dst, weight in edges:
        adj[index[src]].append((index[dst], weight))
        out_w[index[src]] += weight
    vec = [1.0 / n] * n
    for _ in range(iters):
        nxt = [(1.0 - damping) / n] * n
        for i in range(n):
            if out_w[i] == 0.0:
                share = damping * vec[i] / n
                for j in range(n):
                    nxt[j] += share
            else:
                for j, weight in adj[i]:
                    nxt[j] += damping * vec[i] * weight / out_w[i]
        vec = nxt
    return {team: vec[index[team]] for team in teams}


def _power_right(matrix, iters=80):
    n = len(matrix)
    vec = [1.0 + 0.17 * i for i in range(n)]
    for _ in range(iters):
        nxt = [sum(matrix[i][j] * vec[j] for j in range(n)) for i in range(n)]
        scale = sum(abs(x) for x in nxt) or 1.0
        vec = [x / scale for x in nxt]
    total = sum(vec) or 1.0
    return [x / total for x in vec]


def keener(score, eps=1e-3):
    """Column-normalized Perron vector.

    Row-normalization of the same scores has uniform right eigenvector.
    That flat vector is the bug, not the rating.
    """
    n = len(score)
    smoothed = [[score[i][j] + eps for j in range(n)] for i in range(n)]
    col = [[0.0] * n for _ in range(n)]
    row = [[0.0] * n for _ in range(n)]
    for j in range(n):
        total = sum(smoothed[i][j] for i in range(n))
        for i in range(n):
            col[i][j] = smoothed[i][j] / total
    for i in range(n):
        total = sum(smoothed[i][j] for j in range(n))
        for j in range(n):
            row[i][j] = smoothed[i][j] / total
    return {"column": _power_right(col), "row": _power_right(row)}


def trueskill_update(mu_w, sig_w, mu_l, sig_l, beta=25.0 / 6.0):
    c2 = 2.0 * beta * beta + sig_w * sig_w + sig_l * sig_l
    c = math.sqrt(c2)
    t = (mu_w - mu_l) / c
    pdf = math.exp(-0.5 * t * t) / math.sqrt(2.0 * math.pi)
    cdf = max(engine_math.normal_cdf(t), 1e-12)
    v = pdf / cdf
    w = v * (v + t)
    mu_w2 = mu_w + (sig_w * sig_w / c) * v
    mu_l2 = mu_l - (sig_l * sig_l / c) * v
    sig_w2 = math.sqrt(max(sig_w * sig_w * (1.0 - (sig_w * sig_w / c2) * w), 1e-8))
    sig_l2 = math.sqrt(max(sig_l * sig_l * (1.0 - (sig_l * sig_l / c2) * w), 1e-8))
    return mu_w2, sig_w2, mu_l2, sig_l2


def trueskill_fit(teams, games, mu0=25.0, sigma0=25.0 / 3.0):
    """games: (a, b, score). score 1 if a wins, 0 if b wins, None if tie.

    Ties are skipped. They are not a draw-margin update.
    """
    state = {t: [mu0, sigma0] for t in teams}
    skipped = 0
    for a, b, score in games:
        if score is None:
            skipped += 1
            continue
        if score == 1:
            mw, sw, ml, sl = trueskill_update(state[a][0], state[a][1], state[b][0], state[b][1])
            state[a] = [mw, sw]
            state[b] = [ml, sl]
        elif score == 0:
            mw, sw, ml, sl = trueskill_update(state[b][0], state[b][1], state[a][0], state[a][1])
            state[b] = [mw, sw]
            state[a] = [ml, sl]
        else:
            raise ValueError("score must be 1, 0, or None")
    return state, skipped


def plackett_luce(rankings, iters=60):
    """MM. Numerator is wins (chosen from a set of size > 1), not appearances."""
    items = sorted({item for ranking in rankings for item in ranking})
    gamma = {item: 1.0 for item in items}
    wins = {item: 0.0 for item in items}
    appearances = {item: 0.0 for item in items}
    for ranking in rankings:
        for item in ranking:
            appearances[item] += 1.0
        for item in ranking[:-1]:
            wins[item] += 1.0
    for _ in range(iters):
        denom = {item: 0.0 for item in items}
        for ranking in rankings:
            for k in range(len(ranking)):
                remaining = ranking[k:]
                mass = sum(gamma[item] for item in remaining)
                for item in remaining:
                    denom[item] += 1.0 / mass
        nxt = {}
        for item in items:
            if wins[item] <= 0.0:
                nxt[item] = 1e-8
            else:
                nxt[item] = wins[item] / denom[item]
        mean = sum(nxt.values()) / len(nxt)
        gamma = {item: nxt[item] / mean for item in items}
    return gamma, wins, appearances


def ensemble_margin(views):
    """Spread of point-scale views. Not a consensus pick."""
    point = [views[name] for name in ("massey", "srs") if name in views]
    spread = max(point) - min(point) if point else float("nan")
    return {
        "views": views,
        "point_spread": spread,
        "note": "spread of views, not a pick",
    }


def _fmt(table):
    return " ".join("%s=%.3f" % (k, table[k]) for k in sorted(table))


def self_check():
    # Toy slate only. Not a canonical vector, except the Glicko-2 re-call below.
    margin_games = [("A", "B", 14.0), ("A", "C", 4.0), ("B", "C", 14.0)]
    win_games = [("A", "B"), ("A", "C"), ("B", "C")]
    col = colley(win_games)
    mas = massey(margin_games)
    rating = srs(margin_games, damp=0.7)
    pr = pagerank(
        ["A", "B", "C"],
        [("B", "A", 1.0), ("C", "A", 1.0), ("C", "B", 1.0)],
    )
    scores = [
        [0.0, 24.0, 21.0],
        [10.0, 0.0, 28.0],
        [17.0, 14.0, 0.0],
    ]
    keen = keener(scores)
    ts, skipped = trueskill_fit(
        ["A", "B", "C"],
        [("A", "B", 1), ("A", "C", 1), ("B", "C", 1), ("A", "B", None)],
    )
    rankings = [("W", "M", "L")] * 2 + [("M", "L", "W")] + [("L", "M", "W")] * 0
    # L appears often and always finishes last. Appearances exceed wins.
    rankings = [("W", "M", "L")] * 2 + [("X", "L")] * 6
    pl, wins, appearances = plackett_luce(rankings)
    print("toy Colley (not canonical)", _fmt(col))
    print("toy Massey (not canonical)", _fmt(mas))
    print("toy SRS damped 0.7 mean-zero (not canonical)", _fmt(rating))
    print("toy PageRank loser->winner (not canonical)", _fmt(pr))
    print(
        "Keener column %s row %s"
        % (
            " ".join("%.3f" % v for v in keen["column"]),
            " ".join("%.3f" % v for v in keen["row"]),
        )
    )
    print("TrueSkill ties skipped=%d (draw margin not applied)" % skipped)
    print("Plackett-Luce", _fmt(pl), "wins", wins, "appearances", appearances)

    assert col["A"] > col["B"] > col["C"]
    assert all(0.0 < col[t] < 1.0 for t in col)
    assert abs(sum(mas.values())) < 1e-8
    assert mas["A"] > mas["C"]
    assert abs(sum(rating.values())) < 1e-8
    assert rating["A"] > rating["C"]
    assert pr["A"] > pr["B"] > pr["C"]
    row_spread = max(keen["row"]) - min(keen["row"])
    col_spread = max(keen["column"]) - min(keen["column"])
    assert row_spread < 1e-8
    assert col_spread > 0.02
    assert skipped == 1
    tie_only, skipped_one = trueskill_fit(["A", "B"], [("A", "B", None)])
    assert skipped_one == 1
    assert abs(tie_only["A"][0] - 25.0) < 1e-12
    assert abs(tie_only["B"][0] - 25.0) < 1e-12
    assert ts["A"][0] > ts["C"][0]
    assert wins["L"] == 0.0
    assert appearances["L"] > wins["W"]
    assert pl["W"] > pl["L"]
    assert wins["W"] != appearances["W"] or wins["L"] != appearances["L"]

    views = {
        "massey": mas["A"] - mas["B"],
        "srs": rating["A"] - rating["B"],
        "colley_diff": col["A"] - col["B"],
        "pagerank_diff": pr["A"] - pr["B"],
    }
    ens = ensemble_margin(views)
    print(
        "ensemble A-B point spread %.3f (%s)"
        % (ens["point_spread"], ens["note"])
    )
    assert ens["point_spread"] >= 0.0
    assert ens["views"]["massey"] > 0.0 and ens["views"]["srs"] > 0.0
    assert "not a pick" in ens["note"]

    games = [(1400.0, 30.0, 1.0), (1550.0, 100.0, 0.0), (1700.0, 300.0, 0.0)]
    via = glicko2.glicko2_parallel(1500.0, 200.0, 0.06, games)
    print(
        "Glicko-2 via glicko2.py %.2f / %.2f / %.6f (canonical; scale off-by-0.01 vs paper 1464.06 is acceptable)"
        % (via["rating"], via["rd"], via["sigma"])
    )
    assert abs(via["rating"] - 1464.05) < 0.02
    assert abs(via["rd"] - 151.52) < 0.02
    assert abs(via["sigma"] - 0.059996) < 1e-5
    print("ratings2 self_check ok")


if __name__ == "__main__":
    self_check()
