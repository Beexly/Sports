# fantasypoints.com — engineering

App bundles beautified: **1**  
JSON endpoints captured: **2**  
Client functions passing filter: **20**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://fantasypoints.com/__nuxt_island/${e}.json` | 202 |
| `https://fantasypoints.com/api/fn` | 165 |

## Response schemas

### `https://fantasypoints.com/__nuxt_island/${e}.json`
```
error: bool
url: str
statusCode: int
statusMessage: str
message: str
```

### `https://fantasypoints.com/api/fn`
```
error: bool
url: str
statusCode: int
statusMessage: str
message: str
```

## Client-side functions that passed the filter

### `Fde`
```js
Fde = (e, t, n) => { const a = e.starters.map(g => g.slot), r = new Map; n?.forEach((g, _) => { g.player && !r.has(g.player.id) && r.set(g.player.id, _) }); const i = []; if (e.starters.forEach((g, _) => { if (!g.player || g.player.locked) return; const w = t(g.player), b = n ? r.get(g.player.id) ?? 1 / 0 : _; i.push({ player: g.player, from: _, home: b, kickoff: typeof w == "number" && Number.isFinite(w) ? w : -1 / 0 }) }), i.length < 2 || !i.some(g => g.kickoff !== -1 / 0)) return e; const s = i.map(g => g.from), o = (g, _) => Xo(g.player.position, a[_]), l = (g, _) => { const w = new Map, b = (k, f) => g.some((y, v) => { if (f.has(v) || !o(y, k)) return !1; f.add(v); const S = w.get(v); 
```

### `Fn`
```js
Fn = (e, t, n, a, r, i) => ({ id: e, week: t, opponent: n, value: a, hitOver: r, label: i }), SG = { shape: "single", schema: { playerId: { faker: "string.uuid" }, statType: { value: "RECEIVING_YARDS" }, window: { value: "SEASON" }, windows: { value: [{ value: "SEASON", label: "This Season" }, { value: "LAST_5", label: "Last 5" }, { value: "LAST_10", label: "Last 10" }, { value: "H2H", label: "Head-to-Head" }, { value: "HOME_AWAY", label: "Home/Away" }] }, postedLine: { value: 75.5 }, average: { value: 78.6 }, hitRateAtPostedLine: { value: { line: 75.5, hits: 13, 
```

### `Nre`
```js
function Nre(e, t, n, a, r, i) { const s = L("FptsButton"); return I(), z("div", { class: pe(["fpts-ui--media-player", [`fpts-ui--media-player--${n.variant}`, `fpts-ui--media-player--size-${n.size}`, n.compact ? "fpts-ui--media-player--compact" : "", n.disabled ? "fpts-ui--media-player--disabled" : ""]]), role: "region", "aria-label": "Media controls" }, [U("div", Are, [n.showVolume ? (I(), Z(s, { key: 0, variant: "ghost", size: "md", icon: a.volumeIcon, disabled: n.disabled, "aria-label": n.isMuted ? "Unmute" : "Mute", onClick: a.handleMuteToggle }, null, 8, ["icon", "disabled", "aria-label", "onClick"])) : J("v-if", !0), n.showSkipBackward ? (I(), Z(s, { key: 1, variant: "ghost", size: "md
```

### `c1e`
```js
c1e = (e, t) => { const n = t.filter(l => l.value > 0 && !l.locked).sort((l, c) => c.value - l.value); if (!n.length) return e; const a = new Set, r = [...e.bench]; let i = !1; const s = e.starters.map(l => { const c = l.player; if (c && (c.value > 0 || c.locked)) return l; const u = n.find(d => !a.has(d.id) && Xo(d.position, l.slot)); return u ? (a.add(u.id), i = !0, c && r.push(c), { slot: l.slot, player: { ...u, waiver: !0 } }) : l }); for (const l of n) { if (a.has(l.id)) continue; let c = -1; s.forEach((u, d) => { const p = u.player; !p || p.locked || p.waiver || !Xo(l.position, u.slot) || l.value - p.value < Dde || (c < 0 || p.value < (s[c].player?.value ?? 0)) && (c = d) }), !(c < 0) 
```

### `fwe`
```js
fwe = (e, t, n) => { const a = cme(e, t); return a ? wfe(a, n) : null }, pwe = (e, t) => { const n = ome(e, t); return n && Number.isFinite(n.rank) ? n.rank : null }, mwe = (e, t) => { const n = new Map; for (const i of t || []) { if (!i) continue; const s = Vc(i.fullName, i.fantasyPosition); n.has(s) || n.set(s, i) } const a = Number.MAX_SAFE_INTEGER, r = e.map((i, s) => { const o = n.get(Vc(i.fullName, i.fantasyPosition)), l = o && Number.isFinite(o.rank) ? o.rank : a; return { row: i, idx: s, sortKey: l } }); return r.sort((i, s) => i.sortKey !== s.sortKey ? i.sortKey - s.sortKey : i.idx - s.idx), r.map((i, s) => ({ ...i.row, rank: s + 1 })) }, ume = [ ["kenneth", "kenny", "ken"], ["micha
```

### `pwe`
```js
pwe = (e, t) => { const n = ome(e, t); return n && Number.isFinite(n.rank) ? n.rank : null }, mwe = (e, t) => { const n = new Map; for (const i of t || []) { if (!i) continue; const s = Vc(i.fullName, i.fantasyPosition); n.has(s) || n.set(s, i) } const a = Number.MAX_SAFE_INTEGER, r = e.map((i, s) => { const o = n.get(Vc(i.fullName, i.fantasyPosition)), l = o && Number.isFinite(o.rank) ? o.rank : a; return { row: i, idx: s, sortKey: l } }); return r.sort((i, s) => i.sortKey !== s.sortKey ? i.sortKey - s.sortKey : i.idx - s.idx), r.map((i, s) => ({ ...i.row, rank: s + 1 })) }, ume = [ ["kenneth", "kenny", "ken"], ["michael", "mike", "mikey"], ["william", "will", "willie", "bill", "billy"], ["
```

### `ywe`
```js
ywe = (e, t) => { if (!t) return !1; const n = e?.playerId; if (n != null && String(n) !== "" && t.ids.has(String(n))) return !0; const a = M6(e); if (!a) return !1; if (t.nameKeys.has(a)) return !0; const r = B6(e); return r ? (t.looseNames.get(r.key) ?? []).some(i => D6(r.first, i)) : !1 }, j6 = ["[data-elias-id]", "[data-player-id]", ".fli-player-row"], yh = "fphq-highlight-my-roster", vh = "fphq-highlight-opponent-roster", vwe = "fphq-highlight-free-agent", bwe = "fphq-highlight-focus-roster", Eme = e => { const t = e; return t.dataset.eliasId ?? t.dataset.playerId ?? t.getAttribute("data-elias-id") ?? t.getAttribute("data-player-id") ?? "" }, Ime = (e, t) => { const n = Eme(e), a = N6(n
```

### `dF`
```js
dF = (e, t) => { const n = e.trim().toLowerCase(); if (!n || n.length < 2) return null; const a = (t || "").toLowerCase(); if (!a) return null; const r = n.split(/\s+/).filter(Boolean); if (r.length === 0) return null; for (const s of r) if (!a.includes(s)) return null; if (a.startsWith(n)) return 0; const i = r[0]; return a.split(/[\s'']+/).some(s => s.startsWith(i)) ? 1 : 2 }, Dwe = (e, t, n = 10) => { const a = []; for (const [r, i] of t) { if (r.startsWith("PICK_")) continue; const s = dF(e, i.name || ""); s !== null && a.push({ entry: { assetId: r, name: i.name, position: i.position, mvs: i.mvs }, rank: s }) } return a.sort((r, i) => r.rank !== i.rank ? r.rank - i.rank : i.entry.mvs - r
```

### `Dwe`
```js
Dwe = (e, t, n = 10) => { const a = []; for (const [r, i] of t) { if (r.startsWith("PICK_")) continue; const s = dF(e, i.name || ""); s !== null && a.push({ entry: { assetId: r, name: i.name, position: i.position, mvs: i.mvs }, rank: s }) } return a.sort((r, i) => r.rank !== i.rank ? r.rank - i.rank : i.entry.mvs - r.entry.mvs), a.slice(0, n).map(r => r.entry) }, xwe = (e, t) => { if (t === "total" || t === "playerTotal" || t === "pickTotal" || t === "starterTotal") return Number(e[t]) || 0; const n = e.byPosition.find(a => a.position === t); return n ? n.value : 0 }, Rwe = { QB: "tw-bg-brand-position-qb-500", RB: "tw-bg-brand-position-rb-500", WR: "tw-bg-brand-position-wr-500", TE: "tw-bg-b
```

### `bn`
```js
bn = (e, t) => [`${e} enters 2026 as one of the names our staff keeps coming back to at ${t}. The projection reflects a full season in the same system, with the volume and efficiency profile that has held up across our film study and advanced metrics.`, "This write-up is placeholder copy for the rebuild. The published guide carries the full multi-paragraph outlook our analysts wrote for every player on the board."], XW = [hn({ posRank: 1, name: "Brad Jackson", position: "QB", team: "Texas State Bobcats", classYear: "Junior", adpPosition: "1.1", adpOverall: "13.5", fantasyPoints: "384.2", fantasyPointsPerGame: "24.1", statGroups: [El("482", "312", "3,842", "34", "8"), mn("482", "3,842", "34")
```

### `4`
```js
4 = (e, t, n = "dynasty") => e + j4(t, n), l1e = (e, t, n, a) => { if (n === "proj") return a([...e], [...t]); const r = new Map; [...t, ...e].forEach(u => r.set(u.id, u.value)); const i = a(e.map(u => ({ ...u, value: _2(u)[n] })), t.map(u => ({ ...u, value: _2(u)[n] }))), s = u => ({ ...u, value: r.get(u.id) ?? u.value }), o = i.starters.map(u => ({ slot: u.slot, player: u.player ? s(u.player) : null })), l = i.bench.map(s), c = o.reduce((u, d) => u + (d.player?.value ?? 0), 0); return { starters: o, bench: l, startersTotal: c, benchTotal: l.reduce((u, d) => u + d.value, 0), startersPlusTwoTotal: $4(c, l) } }, Cde = e => e == null || e === "0" || e === 0 || e === "", Fde = (e, t, n) => { co
```

### `m`
```js
m = (g, _) => { d.set(g, _.player), p = p.filter(w => w !== _) }; for (const g of c) { const _ = s.filter(k => k !== g && !d.has(k)), b = p.filter(k => o(k, g)).sort((k, f) => f.kickoff - k.kickoff || +(f.home === g) - +(k.home === g) || k.home - f.home || k.from - f.from).find(k => l(p.filter(f => f !== k), _)); if (!b) return e; m(g, b) } for (const g of u) { const _ = p.find(w => w.home === g && o(w, g)); _ && m(g, _) } p.sort((g, _) => g.home - _.home || g.from - _.from); for (const g of u) { if (d.has(g)) continue; const _ = p.find(w => o(w, g)); if (!_) return e; m(g, _) } const h = e.starters.map((g, _) => d.has(_) ? { slot: g.slot, player: d.get(_) ?? null } : g); return h.every((g, 
```

### `Xo`
```js
Xo = (e, t) => $i(t).includes(Va(e)), Dde = .5, c1e = (e, t) => { const n = t.filter(l => l.value > 0 && !l.locked).sort((l, c) => c.value - l.value); if (!n.length) return e; const a = new Set, r = [...e.bench]; let i = !1; const s = e.starters.map(l => { const c = l.player; if (c && (c.value > 0 || c.locked)) return l; const u = n.find(d => !a.has(d.id) && Xo(d.position, l.slot)); return u ? (a.add(u.id), i = !0, c && r.push(c), { slot: l.slot, player: { ...u, waiver: !0 } }) : l }); for (const l of n) { if (a.has(l.id)) continue; let c = -1; s.forEach((u, d) => { const p = u.player; !p || p.locked || p.waiver || !Xo(l.position, u.slot) || l.value - p.value < Dde || (c < 0 || p.value < (s[
```

### `cme`
```js
cme = (e, t) => { const n = F6(e.weeklyById, e.weeklyByName, t); return n || (Fr(t.fantasyPosition) ? lme(e, t) : null) }, fwe = (e, t, n) => { const a = cme(e, t); return a ? wfe(a, n) : null }, pwe = (e, t) => { const n = ome(e, t); return n && Number.isFinite(n.rank) ? n.rank : null }, mwe = (e, t) => { const n = new Map; for (const i of t || []) { if (!i) continue; const s = Vc(i.fullName, i.fantasyPosition); n.has(s) || n.set(s, i) } const a = Number.MAX_SAFE_INTEGER, r = e.map((i, s) => { const o = n.get(Vc(i.fullName, i.fantasyPosition)), l = o && Number.isFinite(o.rank) ? o.rank : a; return { row: i, idx: s, sortKey: l } }); return r.sort((i, s) => i.sortKey !== s.sortKey ? i.sortKey
```

### `component`
```js
component: () => H(() => import("./AGyiA57f.js"), __vite__mapDeps([40, 31, 37, 13, 38, 20, 21, 1, 41]), import.meta.url) }, { name: "ufl-media-schedule", path: "media/schedule", meta: { id: "media.schedule" }, component: () => H(() => import("./CqjxLg31.js"), __vite__mapDeps([42, 31, 43, 27, 28, 7, 44, 1, 45]), import.meta.url) }, { name: "ufl-media-home", path: "media", meta: { id: "media.home" }, component: () => H(() => import("./C8QAJ1r4.js"), __vite__mapDeps([46, 31, 43, 27, 28, 7, 44, 26, 13, 23, 12, 37, 38, 1, 24, 6, 33, 47]), import.meta.url) }, { name: "ufl-article-by-season-slug", path: "articles/:season(\\d+)/:slug", meta: { id: "articles.by-season-slug" }, component: () => H(() =
```

### `Xm`
```js
Xm = (e, t) => Math.max(.12, 1 - (e - 1) / t), TK = ["Third Team All-American (2024, 2025)", "First Team All-Big 12 (2024, 2025)", "Big 12 Offensive Newcomer of the Year (2024)", "85.3 PFF Grade in 2025"], Qs = { lead: "A+ physical profile.", body: "A twitchy athlete who is explosive in his get-off and has decent long speed, but the crowning jewel of his athleticism is his short-area quickness. Whether as a runner or after the catch, he shows the ability to stop on a dime and reaccelerate instantly." }, dk = "Is there prospect fatigue here? This player has been discussed so much by the dynasty community that enthusiasm has seemed to wane since the hysteria of early fall. There is still a lot
```

### `Mc`
```js
Mc = (e, t, n, a = 0) => { const r = n - t, i = t + Yo(e) % 10007 / 10007 * r, s = 10 ** a; return Math.round(i * s) / s }, vt = (e, t, n) => Mc(e, t, n, 0), $Y = [{ key: "pointsPerGame", label: "Points Per Game", min: 14, max: 32, decimals: 1, higherIsBetter: !0 }, { key: "epaPerPlay", label: "EPA /Play", min: -.14, max: .24, decimals: 2, higherIsBetter: !0 }, { key: "epaPerPassPlay", label: "EPA / Pass Play", min: -.18, max: .36, decimals: 2, higherIsBetter: !0 }, { key: "epaPerRunPlay", label: "EPA / Run Play", min: -.24, max: .14, decimals: 2, higherIsBetter: !0 }, { key: "overallYardsPerGame", label: "Overall YPG", min: 268, max: 418, decimals: 1, higherIsBetter: !0 }, { key: "passingYa
```

### `vt`
```js
vt = (e, t, n) => Mc(e, t, n, 0), $Y = [{ key: "pointsPerGame", label: "Points Per Game", min: 14, max: 32, decimals: 1, higherIsBetter: !0 }, { key: "epaPerPlay", label: "EPA /Play", min: -.14, max: .24, decimals: 2, higherIsBetter: !0 }, { key: "epaPerPassPlay", label: "EPA / Pass Play", min: -.18, max: .36, decimals: 2, higherIsBetter: !0 }, { key: "epaPerRunPlay", label: "EPA / Run Play", min: -.24, max: .14, decimals: 2, higherIsBetter: !0 }, { key: "overallYardsPerGame", label: "Overall YPG", min: 268, max: 418, decimals: 1, higherIsBetter: !0 }, { key: "passingYardsPerGame", label: "Passing YPG", min: 148, max: 292, decimals: 1, higherIsBetter: !0 }, { key: "rushingYardsPerGame", labe
```

### `p`
```js
function p(m) { if (!s.value) return; let h = xC(e.containers); xe(r) instanceof HTMLElement && h.add(xe(r)); let g = m.relatedTarget; g instanceof HTMLElement && g.dataset.headlessuiFocusGuard !== "true" && (OC(h, g) || (u.value ? Qa(xe(r), Kt(l.value, { [_a.Forwards]: () => Ln.Next, [_a.Backwards]: () => Ln.Previous }) | Ln.WrapAround, { relativeTo: m.target }) : m.target instanceof HTMLElement && Ps(m.target))) } return () => { let m = {}, h = { ref: r, onKeydown: d, onFocusout: p }, { features: g, initialFocus: _, containers: w, ...b } = e; return $e(ve, [!!(g & 4) && $e(di, { as: "button", type: "button", "data-headlessui-focus-guard": !0, onFocus: c, feature
```

### `Qfe`
```js
Qfe = (e, t) => f6(e.reduce((n, a) => y6(a.key, t) >= a.target ? n + a.points : n, 0)), lc = 3600, epe = (e, t, n) => { const a = Number.isFinite(e) ? e : 0, r = Number.isFinite(t) ? t : 0, i = Math.max(0, Math.min(lc, Number.isFinite(n) ? n : lc)), s = r / lc * i; return Math.round((a + s) * 100) / 100 }, q1e = e => Math.round(e.reduce((t, n) => t + (Number.isFinite(n.updatedProjection) ? n.updatedProjection : 0), 0) * 100) / 100, G1e = e => Math.round(e.reduce((t, n) => t + (Number.isFinite(n.points) ? n.points : 0), 0) * 100) / 100, K1e = e => Math.round(e.reduce((t, n) => t + (Number.isFinite(n.projection) ? n.projection : 0), 0) * 100) / 100, tpe = { GBP: "GB", KCC: "KC", NEP: "NE", NOS
```
