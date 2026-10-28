# rotowire.com — engineering

App bundles beautified: **2**  
JSON endpoints captured: **0**  
Client functions passing filter: **11**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `Ze`
```js
function Ze(e) { let t = e.toLowerCase(); return `/myleagues/${Xe[t]??t}/add.php` } function Qe(e) { let t = (0, b.c)(6), { sectionTitle: n } = e, r, i; t[0] === Symbol.for(`react.memo_cache_sentinel`) ? (r = (0, E.jsx)(`h3`, { className: `rwn:body-semi-2xl rwn:text-white rwn:text-balance`, children: `Get Personalized Advice For Your Leagues` }), i = (0, E.jsx)(`p`, { className: `rwn:body-base rwn:text-neutral-100`, children: `Sync your league to get custom tools, advice, and data that will help you win week after week.` }), t[0] = r, t[1] = i) : (r = t[0], i = t[1]); let a; t[2] === n ? a = t[3] : (a = Ze(n), t[2] = n, t[3] = a); let o; return t[4] === a ? o = t[5] : (o = (0, E.jsxs)(`div`,
```

### `Qe`
```js
function Qe(e) { let t = (0, b.c)(6), { sectionTitle: n } = e, r, i; t[0] === Symbol.for(`react.memo_cache_sentinel`) ? (r = (0, E.jsx)(`h3`, { className: `rwn:body-semi-2xl rwn:text-white rwn:text-balance`, children: `Get Personalized Advice For Your Leagues` }), i = (0, E.jsx)(`p`, { className: `rwn:body-base rwn:text-neutral-100`, children: `Sync your league to get custom tools, advice, and data that will help you win week after week.` }), t[0] = r, t[1] = i) : (r = t[0], i = t[1]); let a; t[2] === n ? a = t[3] : (a = Ze(n), t[2] = n, t[3] = a); let o; return t[4] === a ? o = t[5] : (o = (0, E.jsxs)(`div`, { className: `rwn:flex-1 rwn:flex rwn:flex-col rwn:gap-6 rwn:px-4 rwn:py-6`, childr
```

### `On`
```js
function On(e, t) { let n = (0, b.c)(4), [r, i] = (0, x.useState)(t === void 0 ? 0 : t), a, o; return n[0] !== r || n[1] !== e ? (a = () => { let t = t => { let n = e[t]; if (!n?.ref.current) return; let r = n.ref.current; if (`focus` in r && typeof r.focus == `function` && !(r instanceof HTMLElement)) { r.focus(); return } if (r instanceof HTMLElement) { let e = n.focusableSelector ?? Dn; r.querySelector(e)?.focus() } }, n = n => { if (!(n.target instanceof HTMLInputElement || n.target instanceof HTMLTextAreaElement)) { if (n.key === `ArrowRight` && r < e.length - 1) { n.preventDefault(); let e = r + 1; i(e), setTimeout(() => t(e), 0) } else if (n.key ===
```

### `a`
```js
a = () => { let t = t => { let n = e[t]; if (!n?.ref.current) return; let r = n.ref.current; if (`focus` in r && typeof r.focus == `function` && !(r instanceof HTMLElement)) { r.focus(); return } if (r instanceof HTMLElement) { let e = n.focusableSelector ?? Dn; r.querySelector(e)?.focus() } }, n = n => { if (!(n.target instanceof HTMLInputElement || n.target instanceof HTMLTextAreaElement)) { if (n.key === `ArrowRight` && r < e.length - 1) { n.preventDefault(); let e = r + 1; i(e), setTimeout(() => t(e), 0) } else if (n.key === `ArrowLeft` && r > 0) { n.preventDefault(); let e = r - 1; i(e), setTimeout(() => t(e), 0) } 
```

### `Yn`
```js
function Yn(e) { let t = (0, b.c)(19), { player: n, index: r, isSelected: i, hasAnyLogos: a, subtitle: o, onSelect: s } = e, c = n.text === `Free Agent`, l = `${n.link}`, u = `player-option-${r}`, d = `rwn:flex rwn:items-center rwn:p-2 rwn:hover:bg-neutral-800 rwn:border-b rwn:border-neutral-800 rwn:last:border-0 rwn:transition-colors rwn:group ${c?`rwn:opacity-50 rwn:hover:opacity-90 rwn:grayscale`:``} ${i?`rwn:bg-neutral-800`:``}`, f; t[0] !== a || t[1] !== n.alt || t[2] !== n.logo ? (f = a ? (0, E.jsx)(`div`, { className: `rwn:size-7 rwn:shrink-0 rwn:ml-0.5 rwn:mr-2.5 rwn:flex rwn:items-center rwn:justify-center rwn:rounded-lg rwn:bg-[linear-gradient(to_bottom,white,#BFBFBF)] rwn:ring-1 r
```

### `ir`
```js
function ir(e, t, n) { return [...e].sort((e, r) => { let i = e.text === `Free Agent`, a = r.text === `Free Agent`; if (i && !a) return 1; if (!i && a) return -1; if (t === `NFL` || t === `CFB`) { let t = e.span, n = r.span, i = rr.includes(t), a = rr.includes(n); if (i && !a) return -1; if (!i && a) return 1 } if (t === `ALL`) { let t = e => { let t = Gn(e.link), n = e.span; return t === `NFL` && rr.includes(n) || t === `NBA` || t === `MLB` ? 1 : t === `NHL` ? 2 : 3 }, n = t(e), i = t(r); if (n !== i) return n - i } let o = n.toLowerCase(), s = e.name.toLowerCase().split(` `), c = r.name.toLowerCase().split(` `), l = s[s.length - 1]?.startsWith(o), u = c[c.leng
```

### `on`
```js
function on() { if (an) return an; var e, t = rn, n = t.length, r, i = `value` in nn ? nn.value : nn.textContent, a = i.length; for (e = 0; e < n && t[e] === i[e]; e++); var o = n - e; for (r = 1; r <= o && t[n - r] === i[a - r]; r++); return an = i.slice(e, 1 < r ? 1 - r : void 0) } function sn(e) { var t = e.keyCode; return `charCode` in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0 } function cn() { return !0 } function ln() { return !1 } function un(e) { function t(t, n, r, i, a) { for (var o in this._reactName = t, this._targetInst = r, this.type = n, this.nativeEvent = i, this.target = a, this.currentTarget = null, e) e
```

### `wt`
```js
function wt() { let e = (0, b.c)(11), t = (0, x.useRef)(null), [n, r] = (0, x.useState)(0), [i, a] = (0, x.useState)(0), [o, s] = (0, x.useState)(!1), c; e[0] === Symbol.for(`react.memo_cache_sentinel`) ? (c = e => { let { scrollTop: t, scrollHeight: n, clientHeight: i } = e, o = n > i; if (s(o), o) { r(+(t > St)); let e = n - (t + i); a(+(e > St)) } else r(0), a(0) }, e[0] = c) : c = e[0]; let l = c, u; e[1] === Symbol.for(`react.memo_cache_sentinel`) ? (u = e => { l(e.target) }, e[1] = u) : u = e[1]; let d = u, f; e[2] === Symbol.for(`react.memo_cache_sentinel`) ? (f = e => { if (!t.current) return; let n = t.current.clientHeight * Ct; t.current.scrollBy({ top: e === `down` ? n : -n, behav
```

### `Jn`
```js
function Jn(e) { let t = (0, b.c)(4), { className: n } = e, r, i; t[0] === Symbol.for(`react.memo_cache_sentinel`) ? (r = (0, E.jsx)(`path`, { d: `M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2` }), i = (0, E.jsx)(`circle`, { cx: `12`, cy: `7`, r: `4` }), t[0] = r, t[1] = i) : (r = t[0], i = t[1]); let a; return t[2] === n ? a = t[3] : (a = (0, E.jsxs)(`svg`, { className: n, xmlns: `http://www.w3.org/2000/svg`, viewBox: `0 0 24 24`, fill: `none`, stroke: `currentColor`, strokeWidth: 2, strokeLinecap: `round`, strokeLinejoin: `round`, "aria-hidden": `true`, children: [r, i] }), t[2] = n, t[3] = a), a } function Yn(e) { let t = (0, b.c)(19), { player: n, index: r, isSelected: i, hasAnyLogos: a, sub
```

### `F`
```js
F = () => { w(!0) }, t[18] = w, t[19] = F); let I = F, L = o && v.length >= 1, R = u >= 0 ? `player-option-${u}` : void 0, z = `rwn:flex rwn:items-center rwn:justify-center rwn:p-1.5 rwn:rounded-md rwn:hover:bg-neutral-800 rwn:transition-colors rwn:@[1440px]:hidden ${c?`rwn:hidden`:``}`, B; t[20] === Symbol.for(`react.memo_cache_sentinel`) ? (B = (0, E.jsx)(at, { className: `rwn:size-5 rwn:text-neutral-100 rwn:hover:text-white` }), t[20] = B) : B = t[20]; let V; t[21] !== I || t[22] !== z ? (V = (0, E.jsx)(`button`, { onClick: I, className: z, "aria-label": `Open search`, children: B }), t[21] = I, t[22] = z, t[23] = V) : V = t[23]; let H = `${c?`rwn:absolute rwn:right-0 rwn:top-1/2 rwn:-tra
```

### `Or`
```js
function Or(e) { let t = (0, b.c)(4), { onClose: n } = e, r; t[0] === Symbol.for(`react.memo_cache_sentinel`) ? (r = (0, E.jsxs)(`a`, { href: `/partner/`, target: `_blank`, rel: `noopener noreferrer`, className: `rwn:flex rwn:items-center rwn:gap-1.5 rwn:body-semi-xxs rwn:@cq-md:body-semi-xs rwn:tracking-wide rwn:uppercase rwn:px-2 rwn:py-1 rwn:@cq-md:px-3 rwn:@cq-md:py-1.5 rwn:rounded-full rwn:text-primary-200 rwn:border rwn:border-primary-400/50 rwn:hover:text-primary-100 rwn:hover:border-primary-300/70 rwn:transition-colors rwn:duration-150 rwn:focus:outline-none rwn:focus-visible:ring-2 rwn:focus-visible:ring-primary-500 rwn:focus-visible:ring-offset-2 rwn:focus-visible:ring-offset-prima
```
