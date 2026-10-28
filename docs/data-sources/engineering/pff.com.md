# pff.com — engineering

App bundles beautified: **5**  
JSON endpoints captured: **4**  
Client functions passing filter: **40**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://pff.com/api/scoreboard/matchup` | 166 |
| `https://pff.com/api/scoreboard/schedule` | 166 |
| `https://pff.com/api/scoreboard/ticker` | 166 |
| `https://a.klaviyo.com/onsite/track-analytics?company_id=${e}` | 40 |

## Response schemas

### `https://pff.com/api/scoreboard/matchup`
```
error: dict
error.reason: str
```

### `https://pff.com/api/scoreboard/schedule`
```
error: dict
error.reason: str
```

### `https://pff.com/api/scoreboard/ticker`
```
error: dict
error.reason: str
```

### `https://a.klaviyo.com/onsite/track-analytics?company_id=${e}`
```
detail: str
```

## Client-side functions that passed the filter

### `l`
```js
l = function(e, t, i, r) { if (l[e]) return void l[e].push(t); if (void 0 !== i) for (var n, a, o = document.getElementsByTagName("script"), c = 0; c < o.length; c++) { var d = o[c]; if (d.getAttribute("src") == e || d.getAttribute("data-rspack") == "@clerk/clerk-js:" + i) { n = d; break } } n || (a = !0, (n = document.createElement("script")).timeout = 120, s.nc && n.setAttribute("nonce", s.nc), n.setAttribute("data-rspack", "@clerk/clerk-js:" + i), n.src = e), l[e] = [t]; var h = function(t, i) { n.onerror = n.onload = null, clearTimeout(u); var r = l[e]; if (delete l[e], n.parentNode && n.parentNode.removeChild(n), r && r.forEach(function(e) { return e(i) }), t) return t(i) }, u = setTime
```

### `registerGeoRegions`
```js
registerGeoRegions = function(geodata) { if (this.geoRegions && 0 === this.geoRegions.length && geodata && geodata.length > 0) { var JSONversion = '{"configs": [' + geodata.replace(/ /g, "").replace(/'/g, '"') + "]}"; try { var jsonArray = JSON.parse(JSONversion); if (jsonArray.configs) for (var i = 0; i < jsonArray.configs.length; i++) jsonArray.configs[i].region && jsonArray.configs[i].cbid && this.geoRegions.push({ r: jsonArray.configs[i].region, i: jsonArray.configs[i].cbid }) } catch (e) { console.warn("ERROR IN GEOREGIONS ATTRIBUTE VALUE - NOT A VALID JSON ARRAY: " + geodata) } } }; var IMPLIED_TRIGGER_PATTERN = /(\s+|^)cookieconsent-implied-trigger(\s+|$)/i; function isImpliedConsentT
```

### `o`
```js
o: (e, t) => Object.prototype.hasOwnProperty.call(e, t), r: e => { "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e, "__esModule", { value: !0 }) } }, o = {}; n.r(o), n.d(o, { default: () => d }); const i = r(74848), a = r(32485); var s = n.n(a); const l = r(7950); var u = n.n(l); const c = ({ className: e, rank: t, total: r }) => { const n = t / r, o = s()("kyber-rank-badge", e), a = s()("kyber-rank-badge__badge", { "kyber-rank-badge__badge--high": n < .25, "kyber-rank-badge__badge--high-mid": n >= .25 &
```

### `default`
```js
default: () => d }); const i = r(74848), a = r(32485); var s = n.n(a); const l = r(96540), u = r(63635), c = e => { const { className: t, big: r, value: n = null, ...o } = e, a = (e => { let t = e; return null == t || "" === t ? "-" : (t *= 1, isNaN(t) ? "-" : (t = t < 0 ? 0 : t, t = t >= 100 ? 99.9 : t, t = t.toFixed(1), t)) })(n), l = "-" === a, c = l ? {} : { background: u.gradeColor.getRGB(a) }, d = s()("kyber-grade-badge", t, { "kyber-grade-badge--no-grade": l, "kyber-grade-badge--big": r }); return (0, i.jsx)("div", { ...o, className: d, children: (0, i.jsxs)("div", { c
```

### `t`
```js
function t(e, t) { var r = document.createElement("input"); return r.type = "hidden", r.name = e, r.value = t, r } function r(e, r) { var n = e.getAttribute("data-to"), o = t("_method", e.getAttribute("data-method")), i = t("_csrf_token", e.getAttribute("data-csrf")), a = document.createElement("form"), s = e.getAttribute("target"); a.method = "get" === e.getAttribute("data-method") ? "get" : "post", a.action = n, a.style.display = "hidden", s ? a.target = s : r && (a.target = "_blank"), a.appendChild(i), a.appendChild(o), document.body.appendChild(a), a.submit() } window.addEventListener("click", (function(t) { var n = t.target; if (!t.defaultPrevented) for (; n && n.getAttribute;) { var o 
```

### `r`
```js
function r(e, r) { var n = e.getAttribute("data-to"), o = t("_method", e.getAttribute("data-method")), i = t("_csrf_token", e.getAttribute("data-csrf")), a = document.createElement("form"), s = e.getAttribute("target"); a.method = "get" === e.getAttribute("data-method") ? "get" : "post", a.action = n, a.style.display = "hidden", s ? a.target = s : r && (a.target = "_blank"), a.appendChild(i), a.appendChild(o), document.body.appendChild(a), a.submit() } window.addEventListener("click", (function(t) { var n = t.target; if (!t.defaultPrevented) for (; n && n.getAttribute;) { var o = new e("phoenix.link.click", { bubbles: !0, cancelable: !0 }); if (!n.dispatchEvent(o)) retu
```

### `a`
```js
a = function(e) { var t = e.__resizeTriggers__, r = t.firstElementChild, n = t.lastElementChild, o = r.firstElementChild; n.scrollLeft = n.scrollWidth, n.scrollTop = n.scrollHeight, o.style.width = r.offsetWidth + 1 + "px", o.style.height = r.offsetHeight + 1 + "px", r.scrollLeft = r.scrollWidth, r.scrollTop = r.scrollHeight }, i = function(e) { return e.offsetWidth !== e.__resizeLast__.width || e.offsetHeight !== e.__resizeLast__.height }, c = function(e) { if (!(e.target.className && "function" == typeof e.target.className.indexOf && e.target.className.indexOf("contract-trigger") < 0 && e.target.className.indexOf("expand-trigger") < 0)) { var t = this; a(this), th
```

### `i`
```js
i = function(e) { return e.offsetWidth !== e.__resizeLast__.width || e.offsetHeight !== e.__resizeLast__.height }, c = function(e) { if (!(e.target.className && "function" == typeof e.target.className.indexOf && e.target.className.indexOf("contract-trigger") < 0 && e.target.className.indexOf("expand-trigger") < 0)) { var t = this; a(this), this.__resizeRAF__ && l(this.__resizeRAF__), this.__resizeRAF__ = u((function() { i(t) && (t.__resizeLast__.width = t.offsetWidth, t.__resizeLast__.height = t.offsetHeight, t.__resizeListeners__.forEach((function(r) { r.call(t, e) }))) })) } }; var f = !1, p = ""; n
```

### `imul`
```js
imul: function(e, t) { var r = 65535, n = +e, o = +t, i = r & n, a = r & o; return 0 | i * a + ((r & n >>> 16) * a + i * (r & o >>> 16) << 16 >>> 0) } }) }, 75376: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { log10: r(49340) }) }, 56624: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { log1p: r(7740) }) }, 11367: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { log2: r(67787) }) }, 5914: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }
```

### `56624`
```js
56624: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { log1p: r(7740) }) }, 11367: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { log2: r(67787) }) }, 5914: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { sign: r(77782) }) }, 78553: (e, t, r) => { "use strict"; var n = r(46518), o = r(79039), i = r(53250), a = Math.abs, s = Math.exp, l = Math.E; n({ target: "Math", stat: !0, forced: o((function() { return -2e-17 !== Math.sinh(-2e-17) })) }, { sinh: function(e) { 
```

### `f`
```js
f = function(e, t) { var r = "gravity-".concat(e, "-svg-symbol-map"), n = document.querySelector("#".concat(r)); n || ((n = document.createElement("div")).id = r, n.style.display = "none", document.body.appendChild(n)), n.innerHTML = t }; var p = ".g-tab-nav__link", h = "g-tab-nav__link--active", g = ".g-tab-content", m = "g-tab-content--active"; const v = function(e) { var t = e.find("".concat(p, '[role="g-tab"]')); e(t).on("click", (function(t) { t.preventDefault(); var r = e(t.target).attr("href"), n = e(t.target).closest(".g-tab-nav__item").siblings().find(p); e(n).removeClass(h); var o = t.target; e(o).addClass(h); 
```

### `v`
```js
v = function(e) { var t = e.find("".concat(p, '[role="g-tab"]')); e(t).on("click", (function(t) { t.preventDefault(); var r = e(t.target).attr("href"), n = e(t.target).closest(".g-tab-nav__item").siblings().find(p); e(n).removeClass(h); var o = t.target; e(o).addClass(h); var i = e.find("".concat(r).concat(g)); e(i).addClass(m); var a = e(i).siblings(g); e(a).removeClass(m) })) } })(), e.exports = o })() }, 13778: (e, t, r) => { "use strict"; var n = { d: (e, t) => { for (var r in t) n.o(t, r) && !n.o(e, r) && Object.defineProperty(e, r, { enumerable: !0, get: t[r] 
```

### `renderMenu`
```js
renderMenu: () => { const e = m.map((e => e.season)), [t] = m.filter((e => String(e.season) === String(T))), { weeks: r } = t || { weeks: [] }, n = I(T), o = r.map((e => ({ ...e, id: e.id }))); return (0, i.jsx)(d().Container, { children: (0, i.jsxs)(d().Body, { children: [(0, i.jsx)(d().Sidebar, { className: "kyber-filter-season-weeks__sidebar", children: (0, i.jsx)(d().Scrollable, { children: e.map((e => { const t = I(e), r = (e => { 
```

### `77762`
```js
77762: (e, t, r) => { "use strict"; var n = r(46518), o = r(53250), i = Math.cosh, a = Math.abs, s = Math.E; n({ target: "Math", stat: !0, forced: !i || i(710) === 1 / 0 }, { cosh: function(e) { var t = o(a(e) - 1) + 1; return (t + 1 / (t * s * s)) * (s / 2) } }) }, 65070: (e, t, r) => { "use strict"; var n = r(46518), o = r(53250); n({ target: "Math", stat: !0, forced: o !== Math.expm1 }, { expm1: o }) }, 4360: (e, t, r) => { "use strict"; var n = r(46518), o = r(33164); n({ target: "Math", stat: !0 }, { f16round: function(e) { return o(e, .
```

### `cosh`
```js
cosh: function(e) { var t = o(a(e) - 1) + 1; return (t + 1 / (t * s * s)) * (s / 2) } }) }, 65070: (e, t, r) => { "use strict"; var n = r(46518), o = r(53250); n({ target: "Math", stat: !0, forced: o !== Math.expm1 }, { expm1: o }) }, 4360: (e, t, r) => { "use strict"; var n = r(46518), o = r(33164); n({ target: "Math", stat: !0 }, { f16round: function(e) { return o(e, .0009765625, 65504, 6103515625e-14) } }) }, 60605: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { fround: r(15617) }) }, 39469: (e, t, r) => { "use stric
```

### `4360`
```js
4360: (e, t, r) => { "use strict"; var n = r(46518), o = r(33164); n({ target: "Math", stat: !0 }, { f16round: function(e) { return o(e, .0009765625, 65504, 6103515625e-14) } }) }, 60605: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { fround: r(15617) }) }, 39469: (e, t, r) => { "use strict"; var n = r(46518), o = Math.hypot, i = Math.abs, a = Math.sqrt; n({ target: "Math", stat: !0, arity: 2, forced: !!o && o(1 / 0, NaN) !== 1 / 0 }, { hypot: function(e, t) { for (var r, n, o = 0, s = 0, l = arguments.length, u = 0; s < l;) u < (r = i(arguments[s++])) ? (o =
```

### `72152`
```js
72152: (e, t, r) => { "use strict"; var n = r(46518), o = r(79039), i = Math.imul; n({ target: "Math", stat: !0, forced: o((function() { return -5 !== i(4294967295, 5) || 2 !== i.length })) }, { imul: function(e, t) { var r = 65535, n = +e, o = +t, i = r & n, a = r & o; return 0 | i * a + ((r & n >>> 16) * a + i * (r & o >>> 16) << 16 >>> 0) } }) }, 75376: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { log10: r(49340) }) }, 56624: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { log1p: r(7740) 
```

### `11367`
```js
11367: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { log2: r(67787) }) }, 5914: (e, t, r) => { "use strict"; r(46518)({ target: "Math", stat: !0 }, { sign: r(77782) }) }, 78553: (e, t, r) => { "use strict"; var n = r(46518), o = r(79039), i = r(53250), a = Math.abs, s = Math.exp, l = Math.E; n({ target: "Math", stat: !0, forced: o((function() { return -2e-17 !== Math.sinh(-2e-17) })) }, { sinh: function(e) { var t = +e; return a(t) < 1 ? (i(t) - i(-t)) / 2 : (s(t - 1) - s(-t - 1)) * (l / 2) } }) }, 23068: (e, t, r) => { 
```

### `m`
```js
m = ((e, t, r) => { if (r) return (0, i.jsx)(f(), {}); if (null == e) return e; switch (t) { case "grade": return (0, i.jsx)(c(), { className: "kyber-mini-stats-list__grade", value: e }); case "percent": return n = e, `${g(Math.round(100*n))}%`; case "average": return (e => g(e.toFixed(1)))(e); case "epa": return (e => g(e.toFixed(3)))(e); default: return g(e) } var n })(o, d, t), v = (0, l.isFunction)(a) ? a(m) : m; return (0, i.jsxs)("li", { className: s()("kyber-mini-stats-list__item", "", e), 
```

### `c`
```js
c = ({ data: e = [], className: t }) => (0, i.jsx)("ul", { className: s()("kyber-mini-stats-list", t), children: e.map((({ loading: e, name: t, type: r, showRank: n, stat: o, statEl: a, rank: s, total: l }, c) => (0, i.jsx)(u(), { loading: e, name: t, type: r, showRank: n, stat: o, statEl: a, rank: s, total: l }, c))) }); for (var d in t.default = o.default, o) - 1 === ["default"].indexOf(d) && (t[d] = o[d]); Object.defineProperty(t, "__esModule", { value: !0 }) }, 36962: (e, t, r) => { "use strict"; var n = { n: e => { var t = e && e.__e
```

### `startTrackingInteractions`
```js
startTrackingInteractions = function() { a.addPerformanceInstrumentationHandler("event", (({ entries: e }) => { for (const t of e) { const e = n.getActiveTransaction(); if (!e) return; if ("click" === t.name) { const r = f(o.browserPerformanceTimeOrigin + t.startTime), n = f(t.duration), i = { description: o.htmlTreeAsString(t.target), op: `ui.interaction.${t.name}`, origin: "auto.ui.browser.metrics", startTimestamp: r, endTimestamp: r + n }, a = o.getComponentName(t.target); a && (i.attributes = { "ui.component_name": a }), e.startChild(i) } }
```

### `yt`
```js
function yt(e) { return e.closest(vt) || e } function _t(e) { const t = bt(e); return t && t instanceof Element ? yt(t) : t } function bt(e) { return function(e) { return "object" == typeof e && !!e && "target" in e }(e) ? e.target : e } let St; class Et { constructor(e, t, r = mt) { this._lastMutation = 0, this._lastScroll = 0, this._clicks = [], this._timeout = t.timeout / 1e3, this._threshold = t.threshold / 1e3, this._scollTimeout = t.scrollTimeout / 1e3, this._replay = e, this._ignoreSelector = t.ignoreSelector, this._addBreadcrumbEvent = r } addListeners() { const e = (t = () => { this._lastMutation = wt() }, St || (St = [], a.fill(l, "open", (function(e) { return functio
```

### `unpauseTrap`
```js
unpauseTrap: function(e) { var t = c.getActiveTrap(e); t && !t._isManuallyPaused() && t._setPausedState(!1) } }, d = function(e) { return "Tab" === (null == e ? void 0 : e.key) || 9 === (null == e ? void 0 : e.keyCode) }, f = function(e) { return d(e) && !e.shiftKey }, m = function(e) { return d(e) && e.shiftKey }, p = function(e) { return setTimeout(e, 0) }, b = function(e) { for (var t = arguments.length, a = new Array(t > 1 ? t - 1 : 0), r = 1; r < t; r++) a[r - 1] = arguments[r]; return "function" == typeof e ? e.apply(void 0, a) : e }, _ = function(e) { return e.target.shadowRoot && "function" == typeof e.composedPath ? e.composedPath()[0] : e.target }, h = []; t.c
```

### `f`
```js
f = function(e) { return d(e) && !e.shiftKey }, m = function(e) { return d(e) && e.shiftKey }, p = function(e) { return setTimeout(e, 0) }, b = function(e) { for (var t = arguments.length, a = new Array(t > 1 ? t - 1 : 0), r = 1; r < t; r++) a[r - 1] = arguments[r]; return "function" == typeof e ? e.apply(void 0, a) : e }, _ = function(e) { return e.target.shadowRoot && "function" == typeof e.composedPath ? e.composedPath()[0] : e.target }, h = []; t.createFocusTrap = function(e, t) { var a, i = (null == t ? void 0 : t.document) || document, l = (null == t ? void 0 : t.trapStack) || h, v = s({ returnFocusOnDeactivate: !0, escapeDeactivates: !0, delayInitialFocus: !0, de
```

### `m`
```js
m = function(e) { return d(e) && e.shiftKey }, p = function(e) { return setTimeout(e, 0) }, b = function(e) { for (var t = arguments.length, a = new Array(t > 1 ? t - 1 : 0), r = 1; r < t; r++) a[r - 1] = arguments[r]; return "function" == typeof e ? e.apply(void 0, a) : e }, _ = function(e) { return e.target.shadowRoot && "function" == typeof e.composedPath ? e.composedPath()[0] : e.target }, h = []; t.createFocusTrap = function(e, t) { var a, i = (null == t ? void 0 : t.document) || document, l = (null == t ? void 0 : t.trapStack) || h, v = s({ returnFocusOnDeactivate: !0, escapeDeactivates: !0, delayInitialFocus: !0, delayReturnFocus: !0, isolateSubtrees: !1, isKeyForw
```

### `p`
```js
p = function(e) { return setTimeout(e, 0) }, b = function(e) { for (var t = arguments.length, a = new Array(t > 1 ? t - 1 : 0), r = 1; r < t; r++) a[r - 1] = arguments[r]; return "function" == typeof e ? e.apply(void 0, a) : e }, _ = function(e) { return e.target.shadowRoot && "function" == typeof e.composedPath ? e.composedPath()[0] : e.target }, h = []; t.createFocusTrap = function(e, t) { var a, i = (null == t ? void 0 : t.document) || document, l = (null == t ? void 0 : t.trapStack) || h, v = s({ returnFocusOnDeactivate: !0, escapeDeactivates: !0, delayInitialFocus: !0, delayReturnFocus: !0, isolateSubtrees: !1, isKeyForward: f, isKeyBackward: m }, t), g = { 
```

### `b`
```js
b = function(e) { for (var t = arguments.length, a = new Array(t > 1 ? t - 1 : 0), r = 1; r < t; r++) a[r - 1] = arguments[r]; return "function" == typeof e ? e.apply(void 0, a) : e }, _ = function(e) { return e.target.shadowRoot && "function" == typeof e.composedPath ? e.composedPath()[0] : e.target }, h = []; t.createFocusTrap = function(e, t) { var a, i = (null == t ? void 0 : t.document) || document, l = (null == t ? void 0 : t.trapStack) || h, v = s({ returnFocusOnDeactivate: !0, escapeDeactivates: !0, delayInitialFocus: !0, delayReturnFocus: !0, isolateSubtrees: !1, isKeyForward: f, isKeyBackward: m }, t), g = { containers: [], containerGroups: [], t
```

### `o`
```js
o = (...e) => e.filter(Boolean).join(" "), i = (0, r.createContext)(null), l = ({ render: e, children: t }) => (0, n.jsx)(i.Provider, { value: e ?? null, children: t }), s = ({ href: e, className: t, children: a, tabIndex: o = 0, ...l }, s) => { const u = (0, r.useContext)(i), { "aria-current": c, "aria-label": d, target: f, rel: m, onClick: p, ...b } = l; return u ? u({ ...Object.fromEntries(Object.entries(b).filter((([e]) => e.startsWith("data-")))), href: e, className: t, children: a, "aria-current": c, "aria-label": d, target: f, 
```

### `Nt`
```js
Nt = function(e) { (0, Ye.G)(), (0, Qe.Z)(); var t, a, n, o = (0, $e.d)(), i = (0, Je.h)().getFeatureFlag, l = (0, Ke.useSelector)(qe.nk.games), s = (0, Ke.useSelector)(qe.nk.loading), u = (0, Ke.useSelector)(qe.nk.selectedLeague), c = (0, Ke.useSelector)(qe.nk.weekLabel), d = function(e, t) { return it()(at()(function(e) { var t = et()(e, "kickoffRaw", "asc"); return [].concat(bt(nt()(t, "isActive")), bt(nt()(t, "isScheduled")), bt(nt()(t, "isCompleted"))) }(e), (function(e) { return kt(e, t) }))) }(l, { league: u, showRank: i("merlin-show-rank-on-ticker", !1) }), m = function(e) { var t = arguments.length > 1 && void 0 !== argumen
```

### `d`
```js
d = function(e, t) { return it()(at()(function(e) { var t = et()(e, "kickoffRaw", "asc"); return [].concat(bt(nt()(t, "isActive")), bt(nt()(t, "isScheduled")), bt(nt()(t, "isCompleted"))) }(e), (function(e) { return kt(e, t) }))) }(l, { league: u, showRank: i("merlin-show-rank-on-ticker", !1) }), m = function(e) { var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}; return at()(e, (function(e) { var a = e.label, r = e.value; return { label: a, value: r, weekLabel: t[r] || a } })) }(St, (t = {}, a = u, n = function(e) { if (null 
```

### `l`
```js
l = () => (0, r.useContext)(o), s = e => { const { name: t, focusable: a = !1, group: r, basePath: o, className: i, fill: s, height: u, width: c, size: d, testID: f, style: m, stroke: p = {}, "aria-hidden": b, title: _ } = e, h = l(), v = ((e, t, a) => `${e.endsWith("/")?e:`${e}/`}svg/${t}-symbols.svg#${a}`)(o ?? h, r, t), g = b ?? (void 0 === _ || void 0), C = void 0 === _ ? null : (0, n.jsx)("title", { children: _ }); return t ? "projection-gradient" === t ? (0, n.jsx)("div", { style: { background: "linear-gradient(90deg, #EE0033 0%, #3388FF 99.24%)", width: d || c, height: d || u, minWidth: "13
```

### `v`
```js
v = ((e, t, a) => `${e.endsWith("/")?e:`${e}/`}svg/${t}-symbols.svg#${a}`)(o ?? h, r, t), g = b ?? (void 0 === _ || void 0), C = void 0 === _ ? null : (0, n.jsx)("title", { children: _ }); return t ? "projection-gradient" === t ? (0, n.jsx)("div", { style: { background: "linear-gradient(90deg, #EE0033 0%, #3388FF 99.24%)", width: d || c, height: d || u, minWidth: "132px" }, className: i, role: void 0 === _ ? void 0 : "img", "aria-label": _, "aria-hidden": g }) : "sleeper-long-icon" === t ? (0, n.jsxs)("svg", { className: i, focusable: a, "data-testid": f, height: d || u, width: d || c, style: { ...m }, viewBox: "
```

### `39063`
```js
39063: (e, t, a) => { "use strict"; a.d(t, { i: () => o, n: () => l, t: () => u }); var r = a(96540), n = a(74848), o = (...e) => e.filter(Boolean).join(" "), i = (0, r.createContext)(null), l = ({ render: e, children: t }) => (0, n.jsx)(i.Provider, { value: e ?? null, children: t }), s = ({ href: e, className: t, children: a, tabIndex: o = 0, ...l }, s) => { const u = (0, r.useContext)(i), { "aria-current": c, "aria-label": d, target: f, rel: m, onClick: p, ...b } = l; return u ? u({ ...Object.fromEntries(Object.entries(b).filter((([e]) => e.startsWit
```

### `i`
```js
i: () => o, n: () => l, t: () => u }); var r = a(96540), n = a(74848), o = (...e) => e.filter(Boolean).join(" "), i = (0, r.createContext)(null), l = ({ render: e, children: t }) => (0, n.jsx)(i.Provider, { value: e ?? null, children: t }), s = ({ href: e, className: t, children: a, tabIndex: o = 0, ...l }, s) => { const u = (0, r.useContext)(i), { "aria-current": c, "aria-label": d, target: f, rel: m, onClick: p, ...b } = l; return u ? u({ ...Object.fromEntries(Object.entries(b).filter((([e]) => e.startsWith("data-")))), href: e, className: t, 
```

### `n`
```js
n: () => l, t: () => u }); var r = a(96540), n = a(74848), o = (...e) => e.filter(Boolean).join(" "), i = (0, r.createContext)(null), l = ({ render: e, children: t }) => (0, n.jsx)(i.Provider, { value: e ?? null, children: t }), s = ({ href: e, className: t, children: a, tabIndex: o = 0, ...l }, s) => { const u = (0, r.useContext)(i), { "aria-current": c, "aria-label": d, target: f, rel: m, onClick: p, ...b } = l; return u ? u({ ...Object.fromEntries(Object.entries(b).filter((([e]) => e.startsWith("data-")))), href: e, className: t, children: a
```

### `t`
```js
t: () => u }); var r = a(96540), n = a(74848), o = (...e) => e.filter(Boolean).join(" "), i = (0, r.createContext)(null), l = ({ render: e, children: t }) => (0, n.jsx)(i.Provider, { value: e ?? null, children: t }), s = ({ href: e, className: t, children: a, tabIndex: o = 0, ...l }, s) => { const u = (0, r.useContext)(i), { "aria-current": c, "aria-label": d, target: f, rel: m, onClick: p, ...b } = l; return u ? u({ ...Object.fromEntries(Object.entries(b).filter((([e]) => e.startsWith("data-")))), href: e, className: t, children: a, "aria-
```

### `p`
```js
function p(e, t) { return "https://media.pff.com/player-photos/nfl/".concat(e, ".").concat(t) } var f = function(e) { var t = e.className, r = e.franchiseId, n = e.teamDst, u = e.alt, f = void 0 === u ? "" : u, d = e.id, h = r > 99, b = l((0, c.useState)(!1), 2), g = b[0], v = b[1], y = (0, c.useCallback)((function() { return v(!0) }), []); if (a()(d) && !n) return c.createElement("img", { className: "player-image", src: m }); if (g || n) { if (a()(r)) { var E = h ? "ncaa" : "nfl"; return c.createElement(i.Icon, { className: "player-image player-image--".concat(E, " ").concat(t), name: E, 
```

### `f`
```js
f = function(e) { var t = e.className, r = e.franchiseId, n = e.teamDst, u = e.alt, f = void 0 === u ? "" : u, d = e.id, h = r > 99, b = l((0, c.useState)(!1), 2), g = b[0], v = b[1], y = (0, c.useCallback)((function() { return v(!0) }), []); if (a()(d) && !n) return c.createElement("img", { className: "player-image", src: m }); if (g || n) { if (a()(r)) { var E = h ? "ncaa" : "nfl"; return c.createElement(i.Icon, { className: "player-image player-image--".concat(E, " ").concat(t), name: E, width: "600", height: "380" }) } return c.createElem
```

### `u`
```js
function u(e, t) { (null == t || t > e.length) && (t = e.length); for (var r = 0, n = Array(t); r < t; r++) n[r] = e[r]; return n } var m = "/images/webui/player_default.png"; function p(e, t) { return "https://media.pff.com/player-photos/nfl/".concat(e, ".").concat(t) } var f = function(e) { var t = e.className, r = e.franchiseId, n = e.teamDst, u = e.alt, f = void 0 === u ? "" : u, d = e.id, h = r > 99, b = l((0, c.useState)(!1), 2), g = b[0], v = b[1], y = (0, c.useCallback)((function() { return v(!0) }), []); if (a()(d) && !n) return c.createElement("img", { className: "player-image", src: m }); if (g || n) { 
```

### `O`
```js
O = function(e) { e.target.src = E.__ }, j = function(e) { var t = e.result, r = e.isFirst, n = t.richSnippet.metatags.ogImage + "?w=158&h=100"; return i.createElement("div", null, !r && i.createElement("hr", { className: "g-hr" }), i.createElement("div", { className: "m-search-result" }, i.createElement("img", { style: { maxHeight: "100px" }, width: "158", height: "100", className: "m-search-result__image", src: n, onError: O }), i.createElement("div", null, i.createElement("h4", { className: "g-h4 g-mb-1" }, i.createElement("a", { href: t.url }, N(t.titleNoFormatting))), i.createElement("p", { className: "m-excer
```
