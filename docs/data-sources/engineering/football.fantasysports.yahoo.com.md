# football.fantasysports.yahoo.com — engineering

App bundles beautified: **5**  
JSON endpoints captured: **0**  
Client functions passing filter: **24**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `P`
```js
function P(e, n, t) { var o; ((0, u.isGucePage)() || "restricted" !== (null == e ? void 0 : e.beaconMode) || (0, u.isBeaconStepAllowed)(n)) && (0, u.logDidomiEvent)(e.options, n, e.bidFromUserConfig, null === (o = e.locationInfo) || void 0 === o ? void 0 : o.country, t, e.sessionId + "-" + ((null == e ? void 0 : e.noticeId) || "")) } function _(e, n) { if (n && e.consentHost) try { var t = "dmi-inline-edit", o = n.getAttribute("href") || ""; if ((0, u.isPrivacyControlUrl)(o)) { if (n.classList.contains(t)) return; n.removeAttribute("target"), n.setAttribute("href", function(e) { return "https://".concat(e.consentHost, "/e/consent/edit") }(e)), n.classList.add(t), n.addEventListener("click", 
```

### `_`
```js
function _(e, n) { if (n && e.consentHost) try { var t = "dmi-inline-edit", o = n.getAttribute("href") || ""; if ((0, u.isPrivacyControlUrl)(o)) { if (n.classList.contains(t)) return; n.removeAttribute("target"), n.setAttribute("href", function(e) { return "https://".concat(e.consentHost, "/e/consent/edit") }(e)), n.classList.add(t), n.addEventListener("click", (function(e) { e.stopPropagation(), e.preventDefault(), L() })) } } catch (e) {} } function O(e) { I.querySelectorAll(".caas-didomi-consent-dashboard-link").forEach((function(n) { _(e, n) })) } function N(e) { var n = "privacy-link-privacy-settings", t = "privacy-link-dashboard", 
```

### `N`
```js
function N(e) { var n = "privacy-link-privacy-settings", t = "privacy-link-dashboard", o = "privacy-link-embed-settings", i = "embed-privacy-settings", a = [n, t, o, i]; I.querySelectorAll(".".concat(n)).forEach((function(n) { _(e, n) })), I.querySelectorAll(".".concat(t)).forEach((function(n) { _(e, n) })), _(e, I.getElementById(n)), _(e, I.getElementById(t)), I.querySelectorAll(".".concat(o)).forEach((function(n) { _(e, n) })), I.querySelectorAll(".".concat(i)).forEach((function(n) { _(e, n) })), document.addEventListener("click", (function(e) { try { var n = e.target, t = ""; "A" === n.tagName && (t = n.href), (a.some((function(e) { return n.classList.contains(
```

### `e`
```js
function e(n) { if (!window.frames[n]) if (document.body && document.body.firstChild) { var t = document.body, o = document.createElement("iframe"); o.style.display = "none", o.name = n, o.title = n, t.insertBefore(o, t.firstChild) } else setTimeout((function() { e(n) }), 5) }("__tcfapiLocator"), function(n, t) { var o = document.createElement("link"); o.rel = "preconnect", o.as = "script"; var i = document.createElement("link"); i.rel = "dns-prefetch", i.as = "script"; var a = document.createElement("script"); a.id = "spcloader", a.type = "text/javascript", a.async = !0, a.charset = "utf-8"; var r = e + n + "/loader.js?target_type=notice&target=" + t; if 
```

### `Ho`
```js
function Ho(t) { if (Ds("benji-enableBrowserFocusCheck") && "function" == typeof e.document.hasFocus && !e.document.hasFocus()) return !1; const n = e.document.getElementById(t); if (!n) return !1; const i = n?.querySelector(".evp-player iframe"), o = i ? null : n?.querySelector(".evp-player"), s = n?.querySelector("iframe"), r = i || o || s; return r instanceof HTMLElement && Vo(r) } function Yo(e) { return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") } function qo(e, t, n) { const i = e.store.getAdComponent(t, n); if (i) return [i]; const o = e.store.getRegionAdComponents(t); if (!o?.length) return []; let s; try { return s = n.startsWith("/") && n.endsWith("/") ? new RegExp(n.slice(1, -1)) : 
```

### `Us`
```js
function Us(e, t, n) { const i = ds(), o = e.benji.config?.setting?.resourceRetryCount ?? 2; qs({ id: F, onerrorCb: n, onloadCb: t, retries: o, tagSrc: i, WIN: e }) } function xs(e, t) { let n = t; return "object" == typeof e && e.target instanceof HTMLScriptElement && (n = e.target.src || t), n || "Unknown" } const $s = 200, Gs = 3e3, zs = 2; function Vs(e) { const t = `?v=${cs()}`; return e.includes("?v=") ? e.replace(/\?v=\d+/, t) : `${e}${t}` } async function Hs(e, t) { const { id: n, WIN: i, tagSrc: o } = e, s = (e.failures || 0) + 1; i.document.getElementById(n)?.remove(); const r = function(e) { const t = $s * Math.pow(zs, e - 1), n = Math.min(t, Gs), i = .2 * n; return n + Math.rando
```

### `xs`
```js
function xs(e, t) { let n = t; return "object" == typeof e && e.target instanceof HTMLScriptElement && (n = e.target.src || t), n || "Unknown" } const $s = 200, Gs = 3e3, zs = 2; function Vs(e) { const t = `?v=${cs()}`; return e.includes("?v=") ? e.replace(/\?v=\d+/, t) : `${e}${t}` } async function Hs(e, t) { const { id: n, WIN: i, tagSrc: o } = e, s = (e.failures || 0) + 1; i.document.getElementById(n)?.remove(); const r = function(e) { const t = $s * Math.pow(zs, e - 1), n = Math.min(t, Gs), i = .2 * n; return n + Math.random() * i }(s); return await new Promise(e => setTimeout(e, r)), qs({ ...e, failures: s, retries: t - 1, tagSrc: Vs(o) }) } function Ys(e, t, n) { const { failures: i, t
```

### `Tb`
```js
function Tb(e, t) { if (ur("prebid", "getClientLocation", {}, Date.now()), !Ds("benji-enableType1Location")) return { status: Ib }; const n = e.i13nStore.getCurrent(), i = e.initialConfig?.prebid ?? { adUnits: {}, bidders: {}, filters: {}, regionCountries: {}, setConfig: {} }; if (await ni()) return { discardGeo: !!t, status: Ib }; if (!Cb(n, i)) return { status: Ib }; if (!ii.getInstance().canCollectFirstPartyData()) return { discardGeo: !!t, status: Ib }; const o = { device: Ds("benji-enableType1LocationDevice"), user: Ds("benji-enableType1LocationUser") }; return function(e) { return e.device || e.user }(o) ? t ? { geo: { lat: Rb(t.lat), lon: Rb(t.lon), type: 1 }, status: Eb, target
```

### `get`
```js
get: function() { return p(this).size } }), d }, setStrong: function(e, t, n) { var o = t + " Iterator", r = h(t), s = h(o); u(e, t, function(e, t) { v(this, { type: o, target: e, state: r(e), kind: t, last: void 0 }) }, function() { for (var e = s(this), t = e.kind, n = e.last; n && n.removed;) n = n.previous; return e.target && (e.last = n = n ? n.next : e.state.first) ? "keys" === t ? d(n.key, !1) : "values" === t ? d(n.value, !1) : d([n.key, n.value], !1) : (e.target = void 0, d(void 0, !0)) }, n ? "entries" : "values", !n, !0), f(t) } } }, "../../node_modules/core-js/internals/collection.js": function(e, t, n) { "use strict";
```

### `setStrong`
```js
setStrong: function(e, t, n) { var o = t + " Iterator", r = h(t), s = h(o); u(e, t, function(e, t) { v(this, { type: o, target: e, state: r(e), kind: t, last: void 0 }) }, function() { for (var e = s(this), t = e.kind, n = e.last; n && n.removed;) n = n.previous; return e.target && (e.last = n = n ? n.next : e.state.first) ? "keys" === t ? d(n.key, !1) : "values" === t ? d(n.value, !1) : d([n.key, n.value], !1) : (e.target = void 0, d(void 0, !0)) }, n ? "entries" : "values", !n, !0), f(t) } } }, "../../node_modules/core-js/internals/collection.js": function(e, t, n) { "use strict"; var o = n("../../node_modules/core-js/internals/export.js"), r = n("../../node_modules
```

### `exports`
```js
exports = function(e, t) { var n, u, d, f, j, m = e.target, p = e.global, v = e.stat; if (n = p ? o : v ? o[m] || a(m, {}) : o[m] && o[m].prototype) for (u in t) { if (f = t[u], e.dontCallGetSet ? (j = r(n, u), d = j && j.value) : d = n[u], !c(p ? u : m + (v ? "." : "#") + u, e.forced) && void 0 !== d) { if (typeof f == typeof d) continue; l(f, d) }(e.sham || d && d.sham) && s(f, "sham", !0), i(n, u, f, e) } } }, "../../node_modules/core-js/internals/fails.js": function(e, t, n) { "use strict"; e.exports = function(e) { try { return !!e() } catch (e) { return !0 } } }, "../../node_modules/core-js/internals/freezing.js": function(e, t, n) { "use strict"; var o = n("../../node_modules/core
```

### `b`
```js
b = function(e) { return j && m && d(e) && !a(e, p) && h(e), e }, g = function() { w.enable = function() {}, m = !0; var e = c.f, t = r([].splice), n = {}; n[p] = 1, e(n).length && (c.f = function(n) { for (var o = e(n), r = 0, s = o.length; r < s; r++) if (o[r] === p) { t(o, r, 1); break } return o }, o({ target: "Object", stat: !0, forced: !0 }, { getOwnPropertyNames: u.f })) }, w = e.exports = { enable: g, fastKey: y, getWeakData: _, onFreeze: b }; s[p] = !0 }, "../../node_modules/core-js/internals/internal-state.js": function(e, t, n) { "use strict"; var o, r, s, i = n(
```

### `g`
```js
g = function() { w.enable = function() {}, m = !0; var e = c.f, t = r([].splice), n = {}; n[p] = 1, e(n).length && (c.f = function(n) { for (var o = e(n), r = 0, s = o.length; r < s; r++) if (o[r] === p) { t(o, r, 1); break } return o }, o({ target: "Object", stat: !0, forced: !0 }, { getOwnPropertyNames: u.f })) }, w = e.exports = { enable: g, fastKey: y, getWeakData: _, onFreeze: b }; s[p] = !0 }, "../../node_modules/core-js/internals/internal-state.js": function(e, t, n) { "use strict"; var o, r, s, i = n("../../node_modules/core-js/internals/weak-map-basic-detection.js"), a = n("../../no
```

### `enable`
```js
enable = function() {}, m = !0; var e = c.f, t = r([].splice), n = {}; n[p] = 1, e(n).length && (c.f = function(n) { for (var o = e(n), r = 0, s = o.length; r < s; r++) if (o[r] === p) { t(o, r, 1); break } return o }, o({ target: "Object", stat: !0, forced: !0 }, { getOwnPropertyNames: u.f })) }, w = e.exports = { enable: g, fastKey: y, getWeakData: _, onFreeze: b }; s[p] = !0 }, "../../node_modules/core-js/internals/internal-state.js": function(e, t, n) { "use strict"; var o, r, s, i = n("../../node_modules/core-js/internals/weak-map-basic-detection.js"), a = n("../../node_modules/core-js/internals/
```

### `f`
```js
f = function(n) { for (var o = e(n), r = 0, s = o.length; r < s; r++) if (o[r] === p) { t(o, r, 1); break } return o }, o({ target: "Object", stat: !0, forced: !0 }, { getOwnPropertyNames: u.f })) }, w = e.exports = { enable: g, fastKey: y, getWeakData: _, onFreeze: b }; s[p] = !0 }, "../../node_modules/core-js/internals/internal-state.js": function(e, t, n) { "use strict"; var o, r, s, i = n("../../node_modules/core-js/internals/weak-map-basic-detection.js"), a = n("../../node_modules/core-js/internals/global.js"), l = n("../../node_modules/core-js/internals/is-object.js"), c = n("../../node_modules/core-js/internals/create-non
```

### `L`
```js
L = function() { return r(P, this) })), m) if (S = { values: T("values"), keys: v ? L : T("keys"), entries: T("entries") }, x) for (k in S) !b && !C && k in A || j(A, k, S[k]); else o({ target: t, proto: !0, forced: b || C }, S); return s && !x || A[g] === L || j(A, g, L, { name: m }), p[t] = L, S } }, "../../node_modules/core-js/internals/iterators-core.js": function(e, t, n) { "use strict"; var o, r, s, i = n("../../node_modules/core-js/internals/fails.js"), a = n("../../node_modules/core-js/internals/is-callable.js"), l = n("../../node_modules/core-js/internals/is-object.js"), c = n("../../node_modules/core-js/internals/object-create.js"), u = n("../.
```

### `v`
```js
v = function(e) { if (!i(e)) return !1; var t = e[p]; return void 0 !== t ? !!t : s(e) }; o({ target: "Array", proto: !0, arity: 1, forced: !(m >= 51 || !r(function() { var e = []; return e[p] = !1, e.concat()[0] !== e })) || !f("concat") }, { concat: function(e) { var t, n, o, r, s, i = a(this), f = d(i, 0), j = 0; for (t = -1, o = arguments.length; t < o; t++) if (s = -1 === t ? i : arguments[t], v(s)) for (r = l(s), c(j + r), n = 0; n < r; n++, j++) n in s && u(f, j, s[n]); else c(j + 1), u(f, j++, s); return f.length = j, f } }) }, "../../node_modules/core-js/modules/es.array.from.js": function(e, t, n) { "use strict"; var o = n("../../node_mod
```

### `concat`
```js
concat: function(e) { var t, n, o, r, s, i = a(this), f = d(i, 0), j = 0; for (t = -1, o = arguments.length; t < o; t++) if (s = -1 === t ? i : arguments[t], v(s)) for (r = l(s), c(j + r), n = 0; n < r; n++, j++) n in s && u(f, j, s[n]); else c(j + 1), u(f, j++, s); return f.length = j, f } }) }, "../../node_modules/core-js/modules/es.array.from.js": function(e, t, n) { "use strict"; var o = n("../../node_modules/core-js/internals/export.js"), r = n("../../node_modules/core-js/internals/array-from.js"); o({ target: "Array", stat: !0, forced: !n("../../node_modules/core-js/internals/check-correctness-of-iteration.js")(function(e) { Array.from(e) }) }, { from: r }) }, "../../node_mod
```

### `k`
```js
k = function(e, t) { var n = d(arguments), o = f(t); if (c(o) || void 0 !== e && !u(e)) return n[1] = function(e, t) { if (c(o) && (t = i(o, this, m(e), t)), !u(t)) return t }, s(p, null, n) }, T = function(e, t, n) { var o = h(n, t - 1), r = h(n, t + 1); return v(w, e) && !v(x, r) || v(x, e) && !v(w, o) ? "\\u" + b(y(e, 0), 16) : e }; p && o({ target: "JSON", stat: !0, arity: 3, forced: E || S }, { stringify: function(e, t, n) { var o = d(arguments), r = s(E ? k : p, null, o); return S && "string" == typeof r ? _(r, g, T) : r } }) }, "../../node_modules/core-js/modules/es.json.to-string-tag.js": function(e, t, n) { "use strict"; var o = n("../../node_modules/core
```

### `T`
```js
T = function(e, t, n) { var o = h(n, t - 1), r = h(n, t + 1); return v(w, e) && !v(x, r) || v(x, e) && !v(w, o) ? "\\u" + b(y(e, 0), 16) : e }; p && o({ target: "JSON", stat: !0, arity: 3, forced: E || S }, { stringify: function(e, t, n) { var o = d(arguments), r = s(E ? k : p, null, o); return S && "string" == typeof r ? _(r, g, T) : r } }) }, "../../node_modules/core-js/modules/es.json.to-string-tag.js": function(e, t, n) { "use strict"; var o = n("../../node_modules/core-js/internals/global.js"); n("../../node_modules/core-js/internals/set-to-string-tag.js")(o.JSON, "JSON", !0) }, "../../node_modules/core-js/modules/es.map.constructor.js": function(e, t, n) { "use strict"; var o = n("../.
```

### `groupBy`
```js
groupBy: function(e, t) { i(e), s(t); var n = new d, o = 0; return a(e, function(e) { var r = t(e, o++); f(n, r) ? p(j(n, r), e) : m(n, r, [e]) }), n } }) }, "../../node_modules/core-js/modules/es.map.js": function(e, t, n) { "use strict"; n("../../node_modules/core-js/modules/es.map.constructor.js") }, "../../node_modules/core-js/modules/es.math.to-string-tag.js": function(e, t, n) { "use strict"; n("../../node_modules/core-js/internals/set-to-string-tag.js")(Math, "Math", !0) }, "../../node_modules/core-js/modules/es.object.assign.js": function(e, t, n) { "use strict"; var o = n("../../node_modules/core-js/internals/export.js"), r = n("../../node_modules/core-js/internals/object-assign.js"
```

### `race`
```js
race: function(e) { var t = this, n = i.f(t), o = n.reject, c = a(function() { var i = s(t.resolve); l(e, function(e) { r(i, t, e).then(n.resolve, o) }) }); return c.error && o(c.value), n.promise } }) }, "../../node_modules/core-js/modules/es.promise.reject.js": function(e, t, n) { "use strict"; var o = n("../../node_modules/core-js/internals/export.js"), r = n("../../node_modules/core-js/internals/new-promise-capability.js"); o({ target: "Promise", stat: !0, forced: n("../../node_modules/core-js/internals/promise-constructor-detection.js").CONSTRUCTOR }, { reject: function(e) { var t = r.f(this); return (0, t.reject)(e), t.promise } }) }, 
```

### `reject`
```js
reject: function(e) { var t = r.f(this); return (0, t.reject)(e), t.promise } }) }, "../../node_modules/core-js/modules/es.promise.resolve.js": function(e, t, n) { "use strict"; var o = n("../../node_modules/core-js/internals/export.js"), r = n("../../node_modules/core-js/internals/get-built-in.js"), s = n("../../node_modules/core-js/internals/is-pure.js"), i = n("../../node_modules/core-js/internals/promise-native-constructor.js"), a = n("../../node_modules/core-js/internals/promise-constructor-detection.js").CONSTRUCTOR, l = n("../../node_modules/core-js/internals/promise-resolve.js"), c = r("Promise"), u = s && !a; o({ target: "Promise", stat: !0, forced: s || a }, { resolve: function(e) 
```

### `resolve`
```js
resolve: function(e) { return l(u && this === c ? i : this, e) } }) }, "../../node_modules/core-js/modules/es.promise.with-resolvers.js": function(e, t, n) { "use strict"; var o = n("../../node_modules/core-js/internals/export.js"), r = n("../../node_modules/core-js/internals/new-promise-capability.js"); o({ target: "Promise", stat: !0 }, { withResolvers: function() { var e = r.f(this); return { promise: e.promise, resolve: e.resolve, reject: e.reject } } }) }, "../../node_modules/core-js/modules/es.reflect.to-string-tag.js": function(e, t, n) { "use strict"; var o = n("../../node_modules/core-js/internals/export.js"), r = n("../../node_modules/core-js/internals/global.js"), s = n("../..
```
