# sportsbettingdime.com — engineering

App bundles beautified: **6**  
JSON endpoints captured: **0**  
Client functions passing filter: **14**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
```

### `R`
```js
function R() { var e; (e = document.getElementById("global-nav-drawer-slide")) == null || e.addEventListener("click", function(t) { if (!(t.target instanceof Element)) return; const o = t.target.closest("li.menu-list-item"); if (!o) return; const n = o.getAttribute("data-open") === "true", r = t.target.closest(".drawer-menu-previous-button"), a = o.querySelector(".drawer-menu-item"); n && !r || a && W(a, o) }) } function W(e, t) { e.classList.contains("hidden") ? $(e, t) : z(e, t) } function $(e, t) { e.classList.remove("hidden"), t.setAttribute("data-open", "true"), requestAnimationFrame(() => e.classList.add("translate-x-full")) } function z(e, t) { t.setAttribute("data-open", "false"), e.
```

### `U`
```js
function U() { document.querySelectorAll("[data-tabs]").forEach(e => { e.addEventListener("click", t => { t.target.classList.contains("tab") && V(t, e) }) }) } function V(e, t) { const o = e.target, n = o.getAttribute("data-tab-index"); t.querySelectorAll(".tab").forEach(a => a.classList.remove("tab-active")), o.classList.add("tab-active", "tab-active-animate"), t.querySelectorAll("[data-tab-content-index]").forEach(a => { a.classList.add("hidden"), a.classList.remove("block") }); const r = t.querySelector(`[data-tab-content-index="${n}"]`); r && (r.classList.remove("hidden"), r.classList.add("block")) } function K() { var e; (e = document.querySelector("#news-category-select")) == null || e
```

### `W`
```js
function W(e, t) { e.classList.contains("hidden") ? $(e, t) : z(e, t) } function $(e, t) { e.classList.remove("hidden"), t.setAttribute("data-open", "true"), requestAnimationFrame(() => e.classList.add("translate-x-full")) } function z(e, t) { t.setAttribute("data-open", "false"), e.classList.remove("translate-x-full"), setTimeout(() => e.classList.add("hidden"), H) } function U() { document.querySelectorAll("[data-tabs]").forEach(e => { e.addEventListener("click", t => { t.target.classList.contains("tab") && V(t, e) }) }) } function V(e, t) { const o = e.target, n = o.getAttribute("data-tab-index"); t.querySelectorAll(".tab").forEach(a => a.classList.remove("tab-active")), o.classList.add("
```

### `z`
```js
function z(e, t) { t.setAttribute("data-open", "false"), e.classList.remove("translate-x-full"), setTimeout(() => e.classList.add("hidden"), H) } function U() { document.querySelectorAll("[data-tabs]").forEach(e => { e.addEventListener("click", t => { t.target.classList.contains("tab") && V(t, e) }) }) } function V(e, t) { const o = e.target, n = o.getAttribute("data-tab-index"); t.querySelectorAll(".tab").forEach(a => a.classList.remove("tab-active")), o.classList.add("tab-active", "tab-active-animate"), t.querySelectorAll("[data-tab-content-index]").forEach(a => { a.classList.add("hidden"), a.classList.remove("block") }); const r = t.querySelector(`[data-tab-content-index="${n}"]`); r && (
```

### `V`
```js
function V(e, t) { const o = e.target, n = o.getAttribute("data-tab-index"); t.querySelectorAll(".tab").forEach(a => a.classList.remove("tab-active")), o.classList.add("tab-active", "tab-active-animate"), t.querySelectorAll("[data-tab-content-index]").forEach(a => { a.classList.add("hidden"), a.classList.remove("block") }); const r = t.querySelector(`[data-tab-content-index="${n}"]`); r && (r.classList.remove("hidden"), r.classList.add("block")) } function K() { var e; (e = document.querySelector("#news-category-select")) == null || e.addEventListener("change", t => { const o = t.target; window.location.href = o.value }) } const G = () => { document.addEventListener("operator_click", e => { 
```

### `F`
```js
function F() { window._srwc && typeof window._srwc.setConfig == "function" && window._srwc.setConfig({ apiUrlBase: window.location.origin, "player-props": { generateLinkToMatchup: () => null }, generateLinkToMatchup: e => { var r, a, d, w, s, i, m, g; let t = (e == null ? void 0 : e.league) || "", o = E(((a = (r = e == null ? void 0 : e.competitors) == null ? void 0 : r.home) == null ? void 0 : a.name) || ""), n = E(((w = (d = e == null ? void 0 : e.competitors) == null ? void 0 : d.away) == null ? void 0 : w.name) || ""); if ((t === "ncaafb" || t === "ncaamb") && (o = E(((i = (s = e == null ? void 0 : e.competitors) == null ? void 0 : s.home) == null ? void 0 : i.market) || ""), n = E(((g =
```

### `generateLinkToMatchup`
```js
generateLinkToMatchup: () => null }, generateLinkToMatchup: e => { var r, a, d, w, s, i, m, g; let t = (e == null ? void 0 : e.league) || "", o = E(((a = (r = e == null ? void 0 : e.competitors) == null ? void 0 : r.home) == null ? void 0 : a.name) || ""), n = E(((w = (d = e == null ? void 0 : e.competitors) == null ? void 0 : d.away) == null ? void 0 : w.name) || ""); if ((t === "ncaafb" || t === "ncaamb") && (o = E(((i = (s = e == null ? void 0 : e.competitors) == null ? void 0 : s.home) == null ? void 0 : i.market) || ""), n = E(((g = (m = e == null ? void 0 : e.competitors) == null ? void 0 : m.away) == null ? void 0 : g.market) || "")), t = t === "ncaafb" ? "college-football" : t, t = t
```

### `K`
```js
function K() { var e; (e = document.querySelector("#news-category-select")) == null || e.addEventListener("change", t => { const o = t.target; window.location.href = o.value }) } const G = () => { document.addEventListener("operator_click", e => { var o; const t = e; if ((o = t == null ? void 0 : t.detail) != null && o.context) { const { bet_type: n, prop: r, brand: a } = t.detail.context, d = { event: t.detail.event, market: n || r, operator: a }; dataLayer.push(d) } }) }, J = { tag: "bet-bonus", impression: { selector: ".bet-bonus", once: !0, threshold: .25, dimensions: { shortcodeId: { attr: "id" }, variant: "bonus offer" } }, clicks: [{ selector: ".bet-bonus a
```

### `Z0dC`
```js
Z0dC: function(t, h, i) { "use strict"; var e = i("wJ4g"), r = i("otDY"), n = i("W+xk"); h.a = function(t) { var h = t.clickUrl, i = t.imageUrl, d = Object(r.b)().getCSSCustomClassName; return Object(n.b)("a", { className: "sbn-cta-anchor criteo ".concat(d(e.e.ITEM_BRAND_PROTECTION_ACTION_ANCHOR)), target: "_blank", rel: "noopener", href: h, children: Object(n.b)("img", { src: i, alt: "criteo adchoice icon" }) }) } } } ]); /*! Version v0.118.2 */ (window.wpJsonRcbpWidgetoztqEp = window.wpJsonRcbpWidgetoztqEp || []).push([ [21], { "2yDL": function(t, n, e) { "use strict"; function r(t) { return r = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t) { re
```

### `get`
```js
get: function() { return window.location.hash.substring(1) } }, { key: "preload", value: function() { var t = this, e = this.currentImageIndex, o = this.relatedElements.length, i = e + 1 < 0 ? o - 1 : e + 1 >= o - 1 ? 0 : e + 1, n = e - 1 < 0 ? o - 1 : e - 1 >= o - 1 ? 0 : e - 1, s = new Image, a = new Image; s.addEventListener("load", (function(o) { var i = o.target.getAttribute("src"); - 1 === t.loadedImages.indexOf(i) && t.loadedImages.push(i), t.relatedElements[e].dispatchEvent(new Event("nextImageLoaded." + t.eventNamespace)) })), s.setAttribute("src", this.relatedElements[i].getAttribute(this.options.sourceAttr)), a.addEventListener("load", (function(o) { var i = o.target.getAttribute(
```

### `value`
```js
value: function() { var t = this, e = this.currentImageIndex, o = this.relatedElements.length, i = e + 1 < 0 ? o - 1 : e + 1 >= o - 1 ? 0 : e + 1, n = e - 1 < 0 ? o - 1 : e - 1 >= o - 1 ? 0 : e - 1, s = new Image, a = new Image; s.addEventListener("load", (function(o) { var i = o.target.getAttribute("src"); - 1 === t.loadedImages.indexOf(i) && t.loadedImages.push(i), t.relatedElements[e].dispatchEvent(new Event("nextImageLoaded." + t.eventNamespace)) })), s.setAttribute("src", this.relatedElements[i].getAttribute(this.options.sourceAttr)), a.addEventListener("load", (function(o) { var i = o.target.getAttribute("src"); - 1 === t.loadedImages.indexOf(i) && t.loadedImages.push(i), t.relatedElem
```

### `910`
```js
910: (e, t, r) => { const a = { "srwc-matchup-bar": () => Promise.all([r.e(72), r.e(311), r.e(629)]).then(r.bind(r, 629)), "srwc-odds-table": () => Promise.all([r.e(72), r.e(311), r.e(511), r.e(266)]).then(r.bind(r, 266)), "srwc-public-betting-trends": () => Promise.all([r.e(72), r.e(311), r.e(511), r.e(779)]).then(r.bind(r, 779)), "srwc-futures-table": () => Promise.all([r.e(72), r.e(820)]).then(r.bind(r, 820)), "srwc-featured-matchup": () => Promise.all([r.e(72), r.e(338)]).then(r.bind(r, 338)), "srwc-player-props": () => Promise.all([r.e(72), r.e(311), r.e(969)]).then(r.bind(r, 969)), "xlmwc-featured-matchup": () => Promise.all([r.e(775), r.e(490), r.e(385), r.e(155), r.e(594), r.e(523)])
```

### `l`
```js
l = (r, a, n, i) => { if (e[r]) e[r].push(a); else { var c, l; if (void 0 !== n) for (var s = document.getElementsByTagName("script"), d = 0; d < s.length; d++) { var u = s[d]; if (u.getAttribute("src") == r || u.getAttribute("data-webpack") == t + n) { c = u; break } } c || (l = !0, (c = document.createElement("script")).charset = "utf-8", c.timeout = 120, o.nc && c.setAttribute("nonce", o.nc), c.setAttribute("data-webpack", t + n), c.src = r), e[r] = [a]; var b = (t, a) => { c.onerror = c.onload = null, clearTimeout(p); var o = e[r]; if (delete e[r], c.parentNode && c.parentNode.removeChild(c), o && o.forEach((e => e(a))), t) return t(a) }, p = setTimeout(b.bind(null, void 0, { type: "time
```
