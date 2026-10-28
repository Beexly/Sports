# playusa.com — engineering

App bundles beautified: **4**  
JSON endpoints captured: **2**  
Client functions passing filter: **17**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://playusa.com/wp-json/levelup/v1/modal` | 117 |
| `https://playusa.com/wp-json/levelup/v1/review-access?post_id=` | 38 |

## Response schemas

### `https://playusa.com/wp-json/levelup/v1/modal`
```
code: str
message: str
data: dict
data.status: int
data.params: list
data.params[]: str
```

### `https://playusa.com/wp-json/levelup/v1/review-access?post_id=`
```
error: str
```

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
```

### `calcHeight`
```js
calcHeight = () => { const e = 20; let t = e; const o = document.querySelector(".site-header"), c = document.querySelector(".site-header--mega"), l = document.querySelector(".jump-nav"), r = document.getElementById("wpadminbar"); return o && "fixed" === getComputedStyle(o).position && (t += o.offsetHeight), c && (t += c.offsetHeight), l && (t += l.offsetHeight), r && (t += r.offsetHeight), t }; null !== document.querySelector(".sticky-box") && calcStickySidebar(".sticky-box"); const clickToCopy = (e, t) => { let o = e.target.querySelector("a") ? e.target.querySelector("a") : e.target; if (document.body.createTextRange) { const e = document.body.createTextRange(); e.moveToElementText(o), e.se
```

### `clickToCopy`
```js
clickToCopy = (e, t) => { let o = e.target.querySelector("a") ? e.target.querySelector("a") : e.target; if (document.body.createTextRange) { const e = document.body.createTextRange(); e.moveToElementText(o), e.select() } else { const e = window.getSelection(), t = document.createRange(); t.selectNodeContents(o), e.removeAllRanges(), e.addRange(t) } try { let e = document.execCommand("copy"), o = e ? "Copied" : "Not Copied"; document.querySelector(t).innerHTML = o } catch (e) { document.querySelector(t).innerHTML = "Oops, unable to copy" } }; if (null !== document.querySelector(".rt-card-copy-active") && document.querySelector(".rt-card-copy-active").addEventListener("click", e => clickToCopy
```

### `b`
```js
b = function() { clearInterval(S), S = setInterval(l, n) }, E = (e, t = "next") => { e.classList.contains("is-disabled") && h || (g = !0, d.classList.remove("stopSlide"), l(t), h || b(), setTimeout(() => { g = !1 }, 1e3)) } }) }; document.addEventListener("DOMContentLoaded", function() { null !== document.querySelector(".catena-carousel") && slider() }); const jumpToMobile = e => { let t = e.target.querySelector("#jump-to-mobile-list"); t.style.display, t.style.display }; null !== document.querySelector("#jump-to-mobile") && document.querySelector("#jump-to-mobile").addEventListener("click", jumpToMobile(e)), document.addEventListener("DOMContentLoaded", function() { const e = e => { let t =
```

### `E`
```js
E = (e, t = "next") => { e.classList.contains("is-disabled") && h || (g = !0, d.classList.remove("stopSlide"), l(t), h || b(), setTimeout(() => { g = !1 }, 1e3)) } }) }; document.addEventListener("DOMContentLoaded", function() { null !== document.querySelector(".catena-carousel") && slider() }); const jumpToMobile = e => { let t = e.target.querySelector("#jump-to-mobile-list"); t.style.display, t.style.display }; null !== document.querySelector("#jump-to-mobile") && document.querySelector("#jump-to-mobile").addEventListener("click", jumpToMobile(e)), document.addEventListener("DOMContentLoaded", function() { const e = e => { let t = e.target.closest(".iframe_game"), o = t.querySelector("ifra
```

### `n`
```js
n = () => { c && (c(), c = null) }, r = c => { e.contains(c.target) || document.activeElement === e.querySelector(".s") || !0 !== t.checked || (t.checked = !1, n()) }, o = () => { if (n(), !t.checked) return; let e = !1; const o = setTimeout(() => { e = !0, document.addEventListener("click", r) }, 0); c = () => { clearTimeout(o), e && document.removeEventListener("click", r) } }; t.addEventListener("change", o), window.addEventListener("pageshow", o), o() } const slider = e => { const t = document.querySelectorAll(".catena-carousel"); t.forEach((e, t, o) => { function c() { const e = d.scrollLeft, t = Math.round(e / L.offsetWidthSlide); i(t), s(t) } function l(t = "next") { if (!d.classList.
```

### `b`
```js
function b(c) { if (c || typeof c > "u") { var p = document.querySelector("." + a + "." + o.isOpenClass); p && (p.customSelect.open = !1), d.classList.add(o.isOpenClass), d.classList.add(o.isOpenClass), m.setAttribute("aria-expanded", "true"), h && (v.scrollTop = h.offsetTop), d.dispatchEvent(new CustomEvent("custom-select:open")), r = !0 } else d.classList.remove(o.isOpenClass), m.setAttribute("aria-expanded", "false"), r = !1, E(h), d.dispatchEvent(new CustomEvent("custom-select:close")); return r } function A(c) { c.target === m || m.contains(c.target) ? r ? b(!1) : b() : c.target.classList && c.target.classList.contains(o.optionClass) && v.contains(c.target) ? (g(c.target), h.customSelec
```

### `T`
```js
function T(c) { var p = [].indexOf.call(t.options, y.customSelectOriginalOption); t.options[p + c] && E(t.options[p + c].customSelectCstOption) } function b(c) { if (c || typeof c > "u") { var p = document.querySelector("." + a + "." + o.isOpenClass); p && (p.customSelect.open = !1), d.classList.add(o.isOpenClass), d.classList.add(o.isOpenClass), m.setAttribute("aria-expanded", "true"), h && (v.scrollTop = h.offsetTop), d.dispatchEvent(new CustomEvent("custom-select:open")), r = !0 } else d.classList.remove(o.isOpenClass), m.setAttribute("aria-expanded", "false"), r = !1, E(h), d.dispatchEvent(new CustomEvent("custom-select:close")); return r } function A(c) { c.target === m || m.contains(c.
```

### `A`
```js
function A(L) { if (L.target.closest(".js-slot-demo-play")) { L.preventDefault(), T(); return } if (L.target.closest(".js-slot-demo-minimize")) { L.preventDefault(), b(); return } if (L.target.closest(".js-slot-demo-reload")) { L.preventDefault(), w(); return } if (L.target.closest(".js-slot-demo-fullscreen")) { L.preventDefault(), q(); return } if (L.target.closest(".js-slot-demo-toggle-menu")) { L.preventDefault(), g(); return } } u && (u.addEventListener("click", A), u.addEventListener("click", we), u.addEventListener("click", Ee)), document.addEventListener("keydown", function(L) { L.key === "Escape" && e && e.classList.contains("is-game-fullsize") && E() }), document.addEventListener("f
```

### `x`
```js
function x() { if (!e) return; e.classList.remove("is-controls-collapsed"), document.querySelectorAll(".js-slot-demo-toggle-menu").forEach(j => { j.dataset.menuState = "expanded" }) } function T() { e && (e.classList.remove("demo-closing", "demo-restoring"), e.classList.add("demo-active"), a && s && f(s)) } function b() { !e || !e.classList.contains("demo-active") || (e.classList.contains("is-game-fullsize") && E(), x(), e.classList.add("demo-closing"), setTimeout(() => { e.classList.remove("demo-active", "demo-closing"), e.classList.add("demo-restoring"), setTimeout(() => { e.classList.remove("demo-restoring") }, 350), h(), r++, t.src = "", H() }, 240)) } function A(L) { if (L.target.closes
```

### `we`
```js
function we(u) { u.target.closest(".js-slot-hero-primary-cta") && (window.dataLayer = window.dataLayer || [], window.dataLayer.push({ event: "slot_hero_primary_cta_click" })) } document.addEventListener("DOMContentLoaded", function() { document.querySelectorAll(".btn-claim-row").forEach(function(e) { e.addEventListener("click", function() { window.dataLayer = window.dataLayer || [], window.dataLayer.push({ event: "slot_hero_secondary_operator_claim", operator_index: e.dataset.operatorIndex }) }) }) }); function Ee(u) { if (!u.target.closest(".js-slot-demo-play") || typeof slotAwardVars > "u") return; const e = document.getElementById("game-demo-stage"), n = e ? e.dataset.postId : slotAwardVa
```

### `B`
```js
function B() { var c = t.selectedIndex, p = c === -1 ? void 0 : t.options[c].customSelectCstOption; g(p) } function M(c) { var p = c.currentTarget, C = c.target; C.offsetTop < p.scrollTop ? p.scrollTop = C.offsetTop : p.scrollTop = C.offsetTop + C.clientHeight - p.clientHeight } function R() { document.addEventListener("click", A), v.addEventListener("mouseover", k), v.addEventListener("custom-select:focus-outside-panel", M), t.addEventListener("change", B), d.addEventListener("keydown", _) } function O() { document.removeEventListener("click", A), v.removeEventListener("mouseover", k), v.removeEventListener("custom-select:focus-outside-panel", M), t.removeEventListener("change", B), d.remov
```

### `M`
```js
function M(c) { var p = c.currentTarget, C = c.target; C.offsetTop < p.scrollTop ? p.scrollTop = C.offsetTop : p.scrollTop = C.offsetTop + C.clientHeight - p.clientHeight } function R() { document.addEventListener("click", A), v.addEventListener("mouseover", k), v.addEventListener("custom-select:focus-outside-panel", M), t.addEventListener("change", B), d.addEventListener("keydown", _) } function O() { document.removeEventListener("click", A), v.removeEventListener("mouseover", k), v.removeEventListener("custom-select:focus-outside-panel", M), t.removeEventListener("change", B), d.removeEventListener("keydown", _) } function P(c) { c && !t.disabled ? (d.classList.add(o.isDisabledClass), t.di
```

### `V`
```js
function V() { H(), O && O.classList.add("is-chips-ready") } O && (window.addEventListener("resize", V), V(), document.fonts && document.fonts.ready && document.fonts.ready.then(V)), document.querySelectorAll(".provider-logo-img").forEach(function(L) { var j; L.complete && L.naturalWidth === 0 ? (j = L.closest(".hero-provider-btn__right")) == null || j.remove() : L.addEventListener("error", function() { var D; (D = L.closest(".hero-provider-btn__right")) == null || D.remove() }) }) } document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", ne) : ne(); function we(u) { u.target.closest(".js-slot-hero-primary-cta") && (window.dataLayer = window.dataLayer || [], window.
```

### `Ee`
```js
function Ee(u) { if (!u.target.closest(".js-slot-demo-play") || typeof slotAwardVars > "u") return; const e = document.getElementById("game-demo-stage"), n = e ? e.dataset.postId : slotAwardVars.post_id; fetch(slotAwardVars.ajax_url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "slot_play", nonce: slotAwardVars.nonce || "", post_id: n || 0, page_url: window.location.href || "" }) }).then(s => s.json()).then(s => { var a, r, f, t, d; if (!s.success) { console.error("slot_play award not granted:", s.data || s); return } const l = Number((a = s.data) == null ? void 0 : a.points); Number.isFini
```

### `c`
```js
c = function(e) { var r = "function" == typeof e.composedPath ? e.composedPath() : null; n.some(function(t) { return t && (r ? r.includes(t) : t.contains(e.target)) }) || t(e) }, l = setTimeout(function() { s || (i = !0, document.addEventListener("click", c, o)) }, 0), u = function() { s || (s = !0, clearTimeout(l), i && document.removeEventListener("click", c, o), a && S.get(a) === u && S.delete(a)) }; return a && S.set(a, u), u } function L() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@ite
```

### `y`
```js
function y(e, t) { if (!document.querySelector("script#" + e)) { var r = t && "object" === p(t) ? t.src : t, n = t && "object" === p(t) ? t.ver : null, a = n && !/[?&]ver=/.test(r) ? r + (r.includes("?") ? "&" : "?") + "ver=" + encodeURIComponent(n) : r, o = document.createElement("script"); o.id = e, o.src = a, o.async = !1, document.body.appendChild(o), "ur-common" !== e && m.push(e) } } document.querySelectorAll("[data-review-submit]").forEach(function(e) { e.addEventListener("click", h) }), document.querySelectorAll(".site-reviews-wrap").forEach(function(e) { e.addEventListener("click", function(e) { e.target.closest("#siteReviewsSubmitBtn") && h(e) }) }); 
```
