# nflsavant.com — engineering

Bundles beautified: **1**  
Bytes read: **1,567,958**  
Endpoints called: **13**

## Numeric weight arrays

```
[9, 13, 27, 32]
[-20, -10, 0, 10, 20]
[0, 5, 10, 15, 20]
[0, 1, 2, 3, 4, 5]
[1, 2, 3, 4, 5]
[1, 2, 3, 4]
[5, 10, 15, 20, 25, 30]
[1, 2, 3, 4, 5, 6, 7]
[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013]
```

## Sort comparators (ranking order)

```
n r n.score !== r.score ? r.score - n.score : qR(n.routesMeta.map(s => s.childrenIndex), r.routesMeta.map(s => s.childrenIndex)))
i o s.get(i.key) - s.get(o.key))
S R S.y - R.y);
    for (let S = 1; S < v.length; S++) {
      const R = v[S],
        C = v[S - 1];
      R.y - C.y < y && (R.y = C.y + y)
w v x(w) - x(v) || v.count - w.count).map(w => w.id);
  return {
    prepared: u,
    labels: g.map(({
      id: w,
      x: v,
      y: S,
      anchor: R,
      text: C
z L L[1] - z[1])[0], [x]), w = j ? ((I = s.find(z => z.baseId === j[0])) == null ? void 0 : I.name) ?? "" : "", v = j && u > 0 ? j[1] / u * 100 : 0, S = [{
      num: String(u),
      lab: "Routes"
L P P.count - L.count).slice(0, 6)
g y y[1] - g[1])[0],
    d = ((h = n.find(g => g.baseId === l[0])) == null ? void 0 : h.name) ?? "",
    p = r > 0 ? l[1] / r * 100 : 0,
    u = [{
      num: String(r),
      lab: s ? "Throws" : "Rou
j w w.count - j.count), [r]);
  return t.jsxs("div", {
    children: [t.jsxs("div", {
      style: {
        ...m,
        fontSize: 9.5,
        letterSpacing: "0.2em",
        textTransform: "upperc
r s s.year - r.year)[0].year
d p p.year - d.year), l.length === 0 ? null : t.jsxs("div", {
    className: "pp-year-bar",
    style: {
      marginTop: 18,
      display: "flex",
      alignItems: "center",
      gap: 4,
      pad
d p (p.pct ?? 0) - (d.pct ?? 0)).slice(0, 8);
    return t.jsxs("div", {
      ref: o,
      style: {
        width: sz,
        height: iz,
        background: n.name === "dark" ? "#04060b" : "#fffff
x j cz(x[o.key], j[o.key], o.dir)) : r, [r, o]), y = x => {
    l(j => !j || j.key !== x ? {
      key: x,
      dir: "desc"
h g h.year - g.year),
    d = l.map(h => ({
      year: h.year,
      team: h.team,
      v: Number(h.metrics[o.k] ?? 0) || 0
v S S.n - v.n || v.label.localeCompare(S.label))
g y y.netEpa - g.netEpa)[0]) == null ? void 0 : h.abbr
d p p.pct - d.pct).slice(0, 8);
  return t.jsxs("div", {
    ref: o,
    style: {
      width: KF,
      height: qF,
      background: n.name === "dark" ? "#04060b" : "#ffffff",
      color: n.fg,
   
B U U.season - B.season || U.week - B.week)
l d d.att - l.att || (l.label < d.label ? -1 : 1))
l d d.att - l.att || (l.key < d.key ? -1 : 1)), o.forEach((l, d) => i.set(l.key, d));
  return i
u h u.abbr.localeCompare(h.abbr));
  return t.jsxs("div", {
    ref: d,
    style: {
      position: "absolute",
      top: "calc(100% + 8px)",
      ...l === "right" ? {
        right: 0
```

## API paths

```
/api/teams
/api/pulse
/api/slate
/api/ticker
/api/route-spotlight
/api/explore/featured
/api/featured-stat
/api/featured-stat/candidates
/api/player-compare/${e}
/api/team-compare
/api/insights
/api/qb-routes
/api/wr-routes
/api/meta
/api/leaderboard/options
/api/players
/api/games
/api/referees
/api/coaches
/api/seasons
/api/explore/csv
/api/leaderboard/kicking
/api/leaderboard/punting
/api/madden${n}
/api/combine
/api/league
```

## Fetch call sites

```
brand
set-cookie
content-type
/api/teams
/api/pulse
/api/leaders/${e}?limit=5
/api/movers?limit=8
/api/ticker
/api/route-spotlight
/api/explore/featured
/api/featured-stat/candidates
/api/player-compare/${e}
/api/trending?limit=${e}
/api/team-compare
/api/search?${$.toString()}
tab
Content-Type
/api/insights
/api/insights/entity/${e}/${encodeURIComponent(n??
${o}/${encodeURIComponent(e)}${d}
/api/meta
/api/leaderboard/options
/api/leaderboard/leaders/${e}${s?
/api/leaderboard/movers${r?
/api/leaderboard/plays?${i}
season
team
position
/api/players/${encodeURIComponent(e??
/api/teams/${encodeURIComponent(e??
/api/fantasy/player/${encodeURIComponent(e)}?${i.toString()}
/api/pass-chart/${encodeURIComponent(e??
/api/qb-drive-chart/${encodeURIComponent(e??
/api/usage/player/${encodeURIComponent(e??
/api/usage/team/${encodeURIComponent(e??
/api/usage/game/${encodeURIComponent(e??
/api/qb-concepts/${encodeURIComponent(e)}?season=${n}
${s.key}|${i.key}
/api/rb-splits/${encodeURIComponent(e)}?season=${n}
/api/special-teams/${encodeURIComponent(e??
/api/kick-chart/${encodeURIComponent(e??
/api/seasons
year
/api/teams/${encodeURIComponent(e)}${r}
/api/team-identity/${encodeURIComponent(e)}?season=${n}
/api/team-pass-chart/${encodeURIComponent((e??
/api/team-situational/${encodeURIComponent(e)}?season=${n}&side=${r}
/api/ol-grades/${encodeURIComponent(e)}?season=${n}
/api/ol-grades?season=${e}
/api/tendency/${encodeURIComponent((e??
```

## Captured responses

| Endpoint | Bytes |
|---|---|
| `https://nflsavant.com/api/teams` | 4,063 |
| `https://nflsavant.com/api/pulse` | 389 |
| `https://nflsavant.com/api/leaders/${e}?limit=5` | 39 |
| `https://nflsavant.com/api/movers?limit=8` | 1,158 |
| `https://nflsavant.com/api/ticker` | 1,767 |
| `https://nflsavant.com/api/route-spotlight` | 30 |
| `https://nflsavant.com/api/explore/featured` | 12,309 |
| `https://nflsavant.com/api/featured-stat/candidates` | 378 |
| `https://nflsavant.com/api/player-compare/${e}` | 28 |
| `https://nflsavant.com/api/trending?limit=${e}` | 696 |
| `https://nflsavant.com/api/team-compare` | 15,719 |
| `https://nflsavant.com/api/search?${$.toString()}` | 42 |
| `https://nflsavant.com/api/insights` | 2,577 |