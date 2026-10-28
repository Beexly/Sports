# sportsbookreview.com — engineering

App bundles beautified: **5**  
JSON endpoints captured: **0**  
Client functions passing filter: **47**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `registerGeoRegions`
```js
registerGeoRegions = function(geodata) { if (this.geoRegions && 0 === this.geoRegions.length && geodata && geodata.length > 0) { var JSONversion = '{"configs": [' + geodata.replace(/ /g, "").replace(/'/g, '"') + "]}"; try { var jsonArray = JSON.parse(JSONversion); if (jsonArray.configs) for (var i = 0; i < jsonArray.configs.length; i++) jsonArray.configs[i].region && jsonArray.configs[i].cbid && this.geoRegions.push({ r: jsonArray.configs[i].region, i: jsonArray.configs[i].cbid }) } catch (e) { console.warn("ERROR IN GEOREGIONS ATTRIBUTE VALUE - NOT A VALID JSON ARRAY: " + geodata) } } }; var IMPLIED_TRIGGER_PATTERN = /(\s+|^)cookieconsent-implied-trigger(\s+|$)/i; function isImpliedConsentT
```

### `he`
```js
he = function(e, t) { Y || (Y = t, U = e, z = new Date, De(removeEventListener), ye()) }, ye = function() { if (U >= 0 && U < z - be) { var e = { entryType: "first-input", name: Y.type, target: Y.target, cancelable: Y.cancelable, startTime: Y.timeStamp, processingStart: Y.timeStamp + U }; J.forEach((function(t) { t(e) })), J = [] } }, we = function(e) { if (e.cancelable) { var t = (e.timeStamp > 1e12 ? new Date : performance.now()) - e.timeStamp; "pointerdown" == e.type ? function(e, t) { var n = function() { he(e, t), a() }, r = function() { a() }, 
```

### `ye`
```js
ye = function() { if (U >= 0 && U < z - be) { var e = { entryType: "first-input", name: Y.type, target: Y.target, cancelable: Y.cancelable, startTime: Y.timeStamp, processingStart: Y.timeStamp + U }; J.forEach((function(t) { t(e) })), J = [] } }, we = function(e) { if (e.cancelable) { var t = (e.timeStamp > 1e12 ? new Date : performance.now()) - e.timeStamp; "pointerdown" == e.type ? function(e, t) { var n = function() { he(e, t), a() }, r = function() { a() }, a = function() { removeEventListener("pointerup", n, ge), removeEventListener("pointer
```

### `source`
```js
source: function() { function e() { if (sessionStorage.getItem("_t_id")) return sessionStorage.getItem("_t_id"); var e = Math.floor(1e9 * Math.random()); return sessionStorage.setItem("_t_id", e), e } return e() } } }, "Snap ID [Core | Custom Code]": { modulePath: "core/src/lib/dataElements/customCode.js", settings: { source: function() { let e = _satellite.getVar("Cookie Consents Configuration [Core | Custom Code]"), t = e?.snap?.id; return t } } }, "[XDM] Video Pause": { modulePath: "adobe-alloy/dist/lib/dataElements/xdmObject/index.js", settings: { data: { web: { webInteraction: { name: "%[ACDL] event name%", 
```

### `myHandler`
```js
myHandler = function (event) {\n if (_satellite.environment.stage == "development" || _satellite.environment.stage == "staging") {\n console.log(\n "[Adobe Data Layer Logging] event type: " + event.event, "Contents:", event\n );\n }\n};\n\nwindow.adobeDataLayer.push(function (dl) {\n dl.addEventListener("adobeDataLayer:event", myHandler);\n});\n/********************\n* End of Custom Data Layer Logging\n********************/\n\n\n/******************** \n* Scroll Depth Code\n********************/\n// Array used to store scroll thresholds that have already fired\nconst scroll_cache_dgl = []\n\n// Scroll depth percentages we want to track\nconst percentageScroll_dgl = [25, 50, 75, 100]\n\n// Def
```

### `e`
```js
function e(e) { try { const t = new URL(e), n = t.hostname, a = t.pathname.split("/").filter((e => e)); return `${n}/${a.length>0?a[0]:""}/` } catch (e) { return console.error("Invalid URL:", e), null } } return e(window.location.href) } } }, "Page | Browser Tab ID": { modulePath: "core/src/lib/dataElements/customCode.js", settings: { source: function() { function e() { if (sessionStorage.getItem("_t_id")) return sessionStorage.getItem("_t_id"); var e = Math.floor(1e9 * Math.random()); return sessionStorage.setItem("_t_id", e), e } return e() } } }, "Snap ID [Core | Custom Code]"
```

### `ys`
```js
ys = () => ({ eventMergeId: m() }); t.createEventMergeId = ys; var _s = e => null == e, Es = e => !_s(e) && !Array.isArray(e) && "object" == typeof e; const Ps = ["__proto__", "constructor", "prototype"], ws = (e, t) => { Object.keys(t).forEach((n => { Ps.includes(n) || (Es(e[n]) && Es(t[n]) ? ws(e[n], t[n]) : e[n] = t[n]) })) }; var Ds = (e, ...t) => { if (_s(e)) throw new TypeError('deepAssign "target" cannot be null or undefined'); const n = Object(e); return t.forEach((e => ws(n, Object(e)))), n }; t.deepAssign = Ds; t.components = [_r, Or] } }, "adobe-alloy/dist/lib/instanceMa
```

### `ws`
```js
ws = (e, t) => { Object.keys(t).forEach((n => { Ps.includes(n) || (Es(e[n]) && Es(t[n]) ? ws(e[n], t[n]) : e[n] = t[n]) })) }; var Ds = (e, ...t) => { if (_s(e)) throw new TypeError('deepAssign "target" cannot be null or undefined'); const n = Object(e); return t.forEach((e => ws(n, Object(e)))), n }; t.deepAssign = Ds; t.components = [_r, Or] } }, "adobe-alloy/dist/lib/instanceManager/createInstanceManager.js": { script: function(e, t, n) { "use strict"; const { PREINSTALLED: a } = n("../constants/libraryType"); e.exports = ({ turbine: e, window: t, cre
```

### `Ds`
```js
Ds = (e, ...t) => { if (_s(e)) throw new TypeError('deepAssign "target" cannot be null or undefined'); const n = Object(e); return t.forEach((e => ws(n, Object(e)))), n }; t.deepAssign = Ds; t.components = [_r, Or] } }, "adobe-alloy/dist/lib/instanceManager/createInstanceManager.js": { script: function(e, t, n) { "use strict"; const { PREINSTALLED: a } = n("../constants/libraryType"); e.exports = ({ turbine: e, window: t, createCustomInstance: n, components: o, createEventMergeId: r, orgId: s, wrapOnBeforeEventSend: i, getConfigOverrides: c }) =>
```

### `script`
```js
script: function(e) { "use strict"; e.exports = () => { const e = []; return { add(t) { e.push(t) }, triggerEvent(t) { e.forEach((e => { e(t) })) } } } } }, "adobe-alloy/dist/lib/createMediaCollectionSessionStorage.js": { script: function(e) { "use strict"; e.exports = () => { const e = {}; return { add({ playerId: t, sessionDetails: n }) { if (e[t]) throw new Error(`Player Id ${t} already exists`); e[t] = n }, 
```

### `exports`
```js
exports = () => { const e = []; return { add(t) { e.push(t) }, triggerEvent(t) { e.forEach((e => { e(t) })) } } } } }, "adobe-alloy/dist/lib/createMediaCollectionSessionStorage.js": { script: function(e) { "use strict"; e.exports = () => { const e = {}; return { add({ playerId: t, sessionDetails: n }) { if (e[t]) throw new Error(`Player Id ${t} already exists`); e[t] = n }, remove({ playerId: t 
```

### `o`
```js
o = function(e) { return n(e) ? Number(e) : e }; e.exports = { isNumber: t, isString: n, castToStringIfNumber: a, castToNumberIfString: o } } }, "core/src/lib/events/helpers/pageLifecycleEvents.js": { script: function(e, t, n) { "use strict"; var a = n("@adobe/reactor-window"), o = n("@adobe/reactor-document"), r = -1 !== a.navigator.appVersion.indexOf("MSIE 10"), s = "WINDOW_LOADED", i = "DOM_READY", c = "PAGE_BOTTOM", d = [c, i, s], l = function(e, t) { return { element: e, target: e, nativeEvent: t 
```

### `snaptr`
```js
snaptr=function()\n{a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};\na.queue=[];var s='script';r=t.createElement(s);r.async=!0;\nr.src=n;var u=t.getElementsByTagName(s)[0];\nu.parentNode.insertBefore(r,u);})(window,document,\n'https://sc-static.net/scevent.min.js');\n \nsnaptr('init', '1ba829a5-9644-4cd6-9553-5c64fca3fcd4');\n</script>\n<!-- End Snap Pixel Code -->", language: "html" }, timeout: 2e3, delayNext: !0 }] }, { id: "RLdd32c2a17df4478bb875ab79ef48bb3f", name: "Purchase - RP [Snapchat | Bing]", events: [{ modulePath: "gcoe-adobe-client-data-layer/src/lib/events/datalayerPushListener.js", settings: { scope: "all", method: "specificEvent", eventKey: "Purch
```

### `that`
```js
Function that does nothing, used to clear down dimensions in s object\n }\n}\n_satellite.logger.log("Load App M where RS Status False: Fake S object set")\n\nvar s_env = _satellite.environment.stage,\n rsID = _satellite.getVar("Report Suite ID [Core | Custom Code]"),\n override = true, // used to override env for testing purpose \n s_account = "triumph.global.development";\n_satellite.logger.log("AppM Code: RS - " + rsID);\n\nif (s_env == "production"||override) { \n var s_account = rsID;\n}\ns.account = s_account || ""; // s.account required to set up Adobe Ad Cloud/Analytics integration, this is performed within the connector, not in Adobe Launch!', language: "javascript" }, timeout: 2e3, 
```

### `L`
```js
function L(e) { const s = t.zoom, a = t.params.zoom; if (!m.slideEl) { e && e.target && (m.slideEl = e.target.closest(`.${t.params.slideClass}, swiper-slide`)), m.slideEl || (t.params.virtual && t.params.virtual.enabled && t.virtual ? m.slideEl = f(t.slidesEl, `.${t.params.slideActiveClass}`)[0] : m.slideEl = t.slides[t.activeIndex]); let s = m.slideEl.querySelector(`.${a.containerClass}`); s && (s = s.querySelectorAll("picture, img, svg, canvas, .swiper-zoom-target")[0]), m.imageEl = s, m.imageWrapEl = s ? E(m.imageEl, `.${a.containerClass}`)[0] : void 0 } if (!m.imageEl || !m.imageWrapEl) return; let i, r, l, o, d, p, u, g, v, b, x, S, T, M, C, P, L, I; t.params.cssMode && (t.wrapperEl.sty
```

### `o`
```js
function o(e, t) { (e = T(e)).forEach((e => { e.setAttribute("role", t) })) } function d(e, t) { (e = T(e)).forEach((e => { e.setAttribute("aria-roledescription", t) })) } function c(e, t) { (e = T(e)).forEach((e => { e.setAttribute("aria-label", t) })) } function p(e) { (e = T(e)).forEach((e => { e.setAttribute("aria-disabled", !0) })) } function u(e) { (e = T(e)).forEach((e => { e.setAttribute("aria-disabled", !1) })) } function m(e) { if (13 !== e.keyCode && 32 !== e.keyCode) return; const s = t.params.a11y, a = e.target; t.pagination && t.pagination.el && (a === t.pagination.el || t.pagination.el.contains(e.target)) && !e.target.matches(ae(t.params.pagination.bulletClass)) || (t.navigati
```

### `d`
```js
function d(e, t) { (e = T(e)).forEach((e => { e.setAttribute("aria-roledescription", t) })) } function c(e, t) { (e = T(e)).forEach((e => { e.setAttribute("aria-label", t) })) } function p(e) { (e = T(e)).forEach((e => { e.setAttribute("aria-disabled", !0) })) } function u(e) { (e = T(e)).forEach((e => { e.setAttribute("aria-disabled", !1) })) } function m(e) { if (13 !== e.keyCode && 32 !== e.keyCode) return; const s = t.params.a11y, a = e.target; t.pagination && t.pagination.el && (a === t.pagination.el || t.pagination.el.contains(e.target)) && !e.target.matches(ae(t.params.pagination.bulletClass)) || (t.navigation && t.navigation.nextEl && a === t.navigation.nextEl && (t.isEnd && !t.param
```

### `p`
```js
function p(e) { (e = T(e)).forEach((e => { e.setAttribute("aria-disabled", !0) })) } function u(e) { (e = T(e)).forEach((e => { e.setAttribute("aria-disabled", !1) })) } function m(e) { if (13 !== e.keyCode && 32 !== e.keyCode) return; const s = t.params.a11y, a = e.target; t.pagination && t.pagination.el && (a === t.pagination.el || t.pagination.el.contains(e.target)) && !e.target.matches(ae(t.params.pagination.bulletClass)) || (t.navigation && t.navigation.nextEl && a === t.navigation.nextEl && (t.isEnd && !t.params.loop || t.slideNext(), t.isEnd ? r(s.lastSlideMessage) : r(s.nextSlideMessage)), t.navigation && t.navigation.prevEl && a === t.navigation.prevEl && (t.isBeginning && !t.params
```

### `g`
```js
function g(e) { let s = e, a = !0; if (!t.enabled) return; if (e.target.closest(`.${t.params.mousewheel.noMousewheelClass}`)) return; const r = t.params.mousewheel; t.params.cssMode && s.preventDefault(); let n = t.el; "container" !== t.params.mousewheel.eventsTarget && (n = document.querySelector(t.params.mousewheel.eventsTarget)); const p = n && n.contains(s.target); if (!t.mouseEntered && !p && !r.releaseOnEdges) return !0; s.originalEvent && (s = s.originalEvent); let m = 0; const h = t.rtlTranslate ? -1 : 1, g = function(e) { let t = 0, s = 0, a = 0, i = 0; return "detail" in e && (s = e.detail), "wheelDelta" in e && (s = -e.wheelDelta / 120), "wheelDeltaY" in e && (s = -e.wheelDeltaY /
```

### `S`
```js
function S(e) { if ("mouse" === e.pointerType && u.splice(0, u.length), !x(e)) return; const s = t.params.zoom; if (l = !1, o = !1, u.push(e), !(u.length < 2)) { if (l = !0, m.scaleStart = b(), !m.slideEl) { m.slideEl = e.target.closest(`.${t.params.slideClass}, swiper-slide`), m.slideEl || (m.slideEl = t.slides[t.activeIndex]); let a = m.slideEl.querySelector(`.${s.containerClass}`); if (a && (a = a.querySelectorAll("picture, img, svg, canvas, .swiper-zoom-target")[0]), m.imageEl = a, m.imageWrapEl = a ? E(m.imageEl, `.${s.containerClass}`)[0] : void 0, !m.imageWrapEl) return void(m.imageEl = void 0); m.maxRatio = y() } if (m.imageEl) { const [e, t] = function() { if (u.length < 2) return {
```

### `C`
```js
function C(e) { if (!x(e) || ! function(e) { const s = `.${t.params.zoom.containerClass}`; return !!e.target.matches(s) || [...t.hostEl.querySelectorAll(s)].filter((t => t.contains(e.target))).length > 0 }(e)) return; const s = t.zoom; if (!m.imageEl) return; if (!h.isTouched || !m.slideEl) return; h.isMoved || (h.width = m.imageEl.offsetWidth, h.height = m.imageEl.offsetHeight, h.startX = d(m.imageWrapEl, "x") || 0, h.startY = d(m.imageWrapEl, "y") || 0, m.slideWidth = m.slideEl.offsetWidth, m.slideHeight = m.slideEl.offsetHeight, m.imageWrapEl.style.transitionDuration = "0ms"); const a = h.width * s.scale, i = h.height * s.scale; if (a < m.slideWidth && i < m.slideHeight) return; h.minX = 
```

### `getEffectParams`
```js
getEffectParams: () => t.params.flipEffect, perspective: () => !0, overwriteParams: () => ({ slidesPerView: 1, slidesPerGroup: 1, watchSlidesProgress: !0, spaceBetween: 0, virtualTranslate: !t.params.cssMode }) }) }, function(e) { let { swiper: t, extendParams: s, on: a } = e; s({ coverflowEffect: { rotate: 50, stretch: 0, depth: 100, scale: 1, modifier: 1, slideShadows: !0 } }), de({ effect: "coverflow", swiper: t, on: a, setTranslate: () => { const { width: e, height: s, slides: a, slidesSizesGrid: i } = t, r = t.params.coverflowEffect, n = t.isHorizontal(), l = t.translate, o = n ? e / 2 - l : s / 2 - l, d = n ? r.rotate : -r.rotate, c = r.depth; 
```

### `perspective`
```js
perspective: () => !0, overwriteParams: () => ({ slidesPerView: 1, slidesPerGroup: 1, watchSlidesProgress: !0, spaceBetween: 0, virtualTranslate: !t.params.cssMode }) }) }, function(e) { let { swiper: t, extendParams: s, on: a } = e; s({ coverflowEffect: { rotate: 50, stretch: 0, depth: 100, scale: 1, modifier: 1, slideShadows: !0 } }), de({ effect: "coverflow", swiper: t, on: a, setTranslate: () => { const { width: e, height: s, slides: a, slidesSizesGrid: i } = t, r = t.params.coverflowEffect, n = t.isHorizontal(), l = t.translate, o = n ? e / 2 - l : s / 2 - l, d = n ? r.rotate : -r.rotate, c = r.depth; for (let e = 0, s = a.length; e < s; e += 1) {
```

### `overwriteParams`
```js
overwriteParams: () => ({ slidesPerView: 1, slidesPerGroup: 1, watchSlidesProgress: !0, spaceBetween: 0, virtualTranslate: !t.params.cssMode }) }) }, function(e) { let { swiper: t, extendParams: s, on: a } = e; s({ coverflowEffect: { rotate: 50, stretch: 0, depth: 100, scale: 1, modifier: 1, slideShadows: !0 } }), de({ effect: "coverflow", swiper: t, on: a, setTranslate: () => { const { width: e, height: s, slides: a, slidesSizesGrid: i } = t, r = t.params.coverflowEffect, n = t.isHorizontal(), l = t.translate, o = n ? e / 2 - l : s / 2 - l, d = n ? r.rotate : -r.rotate, c = r.depth; for (let e = 0, s = a.length; e < s; e += 1) { const s = a[e], 
```

### `w`
```js
function w(e) { const t = r(), s = a(), i = e.getBoundingClientRect(), n = s.body, l = e.clientTop || n.clientTop || 0, o = e.clientLeft || n.clientLeft || 0, d = e === t ? t.scrollY : e.scrollTop, c = e === t ? t.scrollX : e.scrollLeft; return { top: i.top + d - l, left: i.left + c - o } } function b(e, t) { return r().getComputedStyle(e, null).getPropertyValue(t) } function y(e) { let t, s = e; if (s) { for (t = 0; null !== (s = s.previousSibling);) 1 === s.nodeType && (t += 1); return t } } function E(e, t) { const s = []; let a = e.parentElement; for (; a;) t ? a.matches(t) && s.push(a) : s.push(a), a = a.parentElement; return s } function x(e, t) { t && e.addEventListener("transitionend
```

### `b`
```js
function b(e, t) { return r().getComputedStyle(e, null).getPropertyValue(t) } function y(e) { let t, s = e; if (s) { for (t = 0; null !== (s = s.previousSibling);) 1 === s.nodeType && (t += 1); return t } } function E(e, t) { const s = []; let a = e.parentElement; for (; a;) t ? a.matches(t) && s.push(a) : s.push(a), a = a.parentElement; return s } function x(e, t) { t && e.addEventListener("transitionend", (function s(a) { a.target === e && (t.call(e, a), e.removeEventListener("transitionend", s)) })) } function S(e, t, s) { const a = r(); return s ? e["width" === t ? "offsetWidth" : "offsetHeight"] + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-right" : "
```

### `y`
```js
function y(e) { let t, s = e; if (s) { for (t = 0; null !== (s = s.previousSibling);) 1 === s.nodeType && (t += 1); return t } } function E(e, t) { const s = []; let a = e.parentElement; for (; a;) t ? a.matches(t) && s.push(a) : s.push(a), a = a.parentElement; return s } function x(e, t) { t && e.addEventListener("transitionend", (function s(a) { a.target === e && (t.call(e, a), e.removeEventListener("transitionend", s)) })) } function S(e, t, s) { const a = r(); return s ? e["width" === t ? "offsetWidth" : "offsetHeight"] + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-right" : "margin-top")) + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width
```

### `E`
```js
function E(e, t) { const s = []; let a = e.parentElement; for (; a;) t ? a.matches(t) && s.push(a) : s.push(a), a = a.parentElement; return s } function x(e, t) { t && e.addEventListener("transitionend", (function s(a) { a.target === e && (t.call(e, a), e.removeEventListener("transitionend", s)) })) } function S(e, t, s) { const a = r(); return s ? e["width" === t ? "offsetWidth" : "offsetHeight"] + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-right" : "margin-top")) + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-left" : "margin-bottom")) : e.offsetWidth } function T(e) { return (Array.isArray(e) ? e : [e]).filter((e => !!
```

### `x`
```js
function x(e, t) { t && e.addEventListener("transitionend", (function s(a) { a.target === e && (t.call(e, a), e.removeEventListener("transitionend", s)) })) } function S(e, t, s) { const a = r(); return s ? e["width" === t ? "offsetWidth" : "offsetHeight"] + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-right" : "margin-top")) + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-left" : "margin-bottom")) : e.offsetWidth } function T(e) { return (Array.isArray(e) ? e : [e]).filter((e => !!e)) } let M, C, P; function L() { return M || (M = function() { const e = r(), t = a(); return { smoothScroll: t.documentElement && t.documentEl
```

### `s`
```js
function s(a) { a.target === e && (t.call(e, a), e.removeEventListener("transitionend", s)) })) } function S(e, t, s) { const a = r(); return s ? e["width" === t ? "offsetWidth" : "offsetHeight"] + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-right" : "margin-top")) + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-left" : "margin-bottom")) : e.offsetWidth } function T(e) { return (Array.isArray(e) ? e : [e]).filter((e => !!e)) } let M, C, P; function L() { return M || (M = function() { const e = r(), t = a(); return { smoothScroll: t.documentElement && t.documentElement.style && "scrollBehavior" in t.documentElement.style, t
```

### `c`
```js
function c(e) { const s = e.target.closest(ae(t.params.pagination.bulletClass)); if (!s) return; e.preventDefault(); const a = y(s) * t.params.slidesPerGroup; if (t.params.loop) { if (t.realIndex === a) return; t.slideToLoop(a) } else t.slideTo(a) } function p() { const e = t.rtl, s = t.params.pagination; if (o()) return; let a, r, c = t.pagination.el; c = T(c); const p = t.virtual && t.params.virtual.enabled ? t.virtual.slides.length : t.slides.length, u = t.params.loop ? Math.ceil(p / t.params.slidesPerGroup) : t.snapGrid.length; if (t.params.loop ? (r = t.previousRealIndex || 0, a = t.params.slidesPerGroup > 1 ? Math.floor(t.realIndex / t.params.slidesPerGroup) : t.realIndex) : void 0 !==
```

### `l`
```js
function l(e) { (e = T(e)).forEach((e => { e.setAttribute("tabIndex", "-1") })) } function o(e, t) { (e = T(e)).forEach((e => { e.setAttribute("role", t) })) } function d(e, t) { (e = T(e)).forEach((e => { e.setAttribute("aria-roledescription", t) })) } function c(e, t) { (e = T(e)).forEach((e => { e.setAttribute("aria-label", t) })) } function p(e) { (e = T(e)).forEach((e => { e.setAttribute("aria-disabled", !0) })) } function u(e) { (e = T(e)).forEach((e => { e.setAttribute("aria-disabled", !1) })) } function m(e) { if (13 !== e.keyCode && 32 !== e.keyCode) return; const s = t.params.a11y, a = e.target; t.pagination && t.pagination.el && (a === t.pagination.el || t.pagination.el.contains(e
```

### `h`
```js
function h() { return t.pagination && t.pagination.bullets && t.pagination.bullets.length } function f() { return h() && t.params.pagination.clickable } const g = (e, t, s) => { n(e), "BUTTON" !== e.tagName && (o(e, "button"), e.addEventListener("keydown", m)), c(e, s), function(e, t) { (e = T(e)).forEach((e => { e.setAttribute("aria-controls", t) })) }(e, t) }, w = () => { t.a11y.clicked = !0 }, b = () => { requestAnimationFrame((() => { requestAnimationFrame((() => { t.destroyed || (t.a11y.clicked = !1) })) })) }, E = e => { if (t.a11y.clicked) return; const s = e.target.closest(`.${t.params.slideClass}, swiper-slide`); if (!s || !t.slides.includes(s)) return; const a = 
```

### `f`
```js
function f() { return h() && t.params.pagination.clickable } const g = (e, t, s) => { n(e), "BUTTON" !== e.tagName && (o(e, "button"), e.addEventListener("keydown", m)), c(e, s), function(e, t) { (e = T(e)).forEach((e => { e.setAttribute("aria-controls", t) })) }(e, t) }, w = () => { t.a11y.clicked = !0 }, b = () => { requestAnimationFrame((() => { requestAnimationFrame((() => { t.destroyed || (t.a11y.clicked = !1) })) })) }, E = e => { if (t.a11y.clicked) return; const s = e.target.closest(`.${t.params.slideClass}, swiper-slide`); if (!s || !t.slides.includes(s)) return; const a = t.slides.indexOf(s) === t.activeIndex, i = t.params.watchSlidesProgress && t.visibleSlides && t.v
```

### `N`
```js
N = function(t) { (0, g.A)(t, "opened", "show"), w == t ? w = null : P((w = t).getAttribute("data-target")) }, P = function(t) { document.addEventListener("click", (function(e) { null !== w && "dropdown" == w.getAttribute("data-toggle") && (document.getElementById(t).contains(e.target) || ((0, g.A)(w, "opened", "show"), w = null)) })) }, j = function(t) { t.stopPropagation(), t.target.classList.toggle("open-tip"); var e = t.target.getAttribute("aria-expanded"); t.target.setAttribute("aria-expanded", "true" === e ? "false" : "true") }, B = function(t) { document.addEventListener("click", (function(e) { document.getElementById(t).contains(e.target) || document.body.classList.contains("popopen"
```

### `P`
```js
P = function(t) { document.addEventListener("click", (function(e) { null !== w && "dropdown" == w.getAttribute("data-toggle") && (document.getElementById(t).contains(e.target) || ((0, g.A)(w, "opened", "show"), w = null)) })) }, j = function(t) { t.stopPropagation(), t.target.classList.toggle("open-tip"); var e = t.target.getAttribute("aria-expanded"); t.target.setAttribute("aria-expanded", "true" === e ? "false" : "true") }, B = function(t) { document.addEventListener("click", (function(e) { document.getElementById(t).contains(e.target) || document.body.classList.contains("popopen") && ((0, g.A)(E, "open", ""), document.body.classList.toggle("popopen"), E = null) })) }; _.forEach((function(
```

### `s`
```js
s = function(t) { t.classList.toggle("active"), document.body.classList.toggle("menuopen"), (0, r.A)(t, "active", ""), (null === u || u !== t) && d((u = t).getAttribute("data-target")) }, f = function() { (0, r.A)(u, "active", ""), document.body.classList.remove("menuopen"), u = null, removeEventListener("click", l), [].forEach.call(a, (function(t) { void 0 !== t.getAttribute("data-target") && document.getElementById(t.getAttribute("data-target")).classList.remove("active"), t.classList.remove("active") })) }, d = function(t) { l = function(e) { e.stopPropagation(), document.getElementById(t).contains(e.target) || document.body.classList.contains("menuopen") && f() }, addEventListener("click
```

### `j`
```js
j = function(t) { t.stopPropagation(), t.target.classList.toggle("open-tip"); var e = t.target.getAttribute("aria-expanded"); t.target.setAttribute("aria-expanded", "true" === e ? "false" : "true") }, B = function(t) { document.addEventListener("click", (function(e) { document.getElementById(t).contains(e.target) || document.body.classList.contains("popopen") && ((0, g.A)(E, "open", ""), document.body.classList.toggle("popopen"), E = null) })) }; _.forEach((function(t) { t.addEventListener("click", (function(t) { t.stopPropagation(), t.currentTarget.hasAttribute("data-toggle") ? N(t.currentTarget) : w && ((0, g.A)(w, "opened", "show"), w = null) })) })), L.forEach((function(t) { t.addEventLi
```

### `f`
```js
f = function() { (0, r.A)(u, "active", ""), document.body.classList.remove("menuopen"), u = null, removeEventListener("click", l), [].forEach.call(a, (function(t) { void 0 !== t.getAttribute("data-target") && document.getElementById(t.getAttribute("data-target")).classList.remove("active"), t.classList.remove("active") })) }, d = function(t) { l = function(e) { e.stopPropagation(), document.getElementById(t).contains(e.target) || document.body.classList.contains("menuopen") && f() }, addEventListener("click", l) }; function h() { document.documentElement.style.setProperty("--scrollbar-width", window.innerWidth - document.documentElement.clientWidth + "px") } window.addEventListener("resize",
```

### `h`
```js
function h() { document.documentElement.style.setProperty("--scrollbar-width", window.innerWidth - document.documentElement.clientWidth + "px") } window.addEventListener("resize", h, !1), document.addEventListener("DOMContentLoaded", h, !1), window.addEventListener("load", h), a.forEach((function(t) { t.addEventListener("click", (function(t) { t.stopPropagation(), t.currentTarget.hasAttribute("data-target") && (null === u ? s(t.currentTarget) : u === t.currentTarget ? f() : ((0, r.A)(u, "active", ""), document.body.classList.toggle("menuopen"), [].forEach.call(a, (function(t) { void 0 !== t.getAttribute("data-target") && document.getElementById(t.getAttribute("data-target")).classList.remove
```

### `413`
```js
413: function(t, e, n) { "use strict"; var r = n(647), o = window.innerWidth > 0 ? window.innerWidth : screen.width, a = document.querySelectorAll('[data-toggle="main-menu"]'), i = document.querySelectorAll('[data-toggle="next-menu"]'), c = document.querySelectorAll('[data-toggle="prev-menu"]'), u = null, l = null, s = function(t) { t.classList.toggle("active"), document.body.classList.toggle("menuopen"), (0, r.A)(t, "active", ""), (null === u || u !== t) && d((u = t).getAttribute("data-target")) }, f = function() { (0, r.A)(u, "active", ""), document.body.classList.remove("menuopen"), u = null, removeEventListener("click", l), [].forEach.call(a, (function(t) { void 0 !== t.getAttribute("dat
```

### `d`
```js
d = function(t) { l = function(e) { e.stopPropagation(), document.getElementById(t).contains(e.target) || document.body.classList.contains("menuopen") && f() }, addEventListener("click", l) }; function h() { document.documentElement.style.setProperty("--scrollbar-width", window.innerWidth - document.documentElement.clientWidth + "px") } window.addEventListener("resize", h, !1), document.addEventListener("DOMContentLoaded", h, !1), window.addEventListener("load", h), a.forEach((function(t) { t.addEventListener("click", (function(t) { t.stopPropagation(), t.currentTarget.hasAttribute("data-target") && (null === u ? s(t.currentTarget) : u === t.currentTarget ? f() : ((0, r.A)(u, "active", ""), 
```

### `l`
```js
l = function(e) { e.stopPropagation(), document.getElementById(t).contains(e.target) || document.body.classList.contains("menuopen") && f() }, addEventListener("click", l) }; function h() { document.documentElement.style.setProperty("--scrollbar-width", window.innerWidth - document.documentElement.clientWidth + "px") } window.addEventListener("resize", h, !1), document.addEventListener("DOMContentLoaded", h, !1), window.addEventListener("load", h), a.forEach((function(t) { t.addEventListener("click", (function(t) { t.stopPropagation(), t.currentTarget.hasAttribute("data-target") && (null === u ? s(t.currentTarget) : u === t.currentTarget ? f() : ((0, r.A)(u, "active", ""), document.body.clas
```

### `647`
```js
647: function(t, e) { "use strict"; e.A = function(t, e, n) { var r = t.getAttribute("data-target"); void 0 !== r && (document.getElementById(r).classList.toggle(e), "" !== n && document.getElementById(r).classList.toggle(n), "true" === t.getAttribute("aria-expanded") ? t.setAttribute("aria-expanded", "false") : t.setAttribute("aria-expanded", "true")) } }, 911: function(t, e, n) { "use strict"; var r = n(144), o = new(n.n(r)()); function a(t, e) { console.log(Date.now(), t, e.getAttribute("data-src")) } window.lazyLoadOptions = { threshold: 0, callback_enter: function(t) { a("🔑 ENTERED", t) }, callback_exit: function(t) { a("🚪 EXITED", t) }, callback_error: function(t) { a("💀 E
```

### `A`
```js
A = function(t, e, n) { var r = t.getAttribute("data-target"); void 0 !== r && (document.getElementById(r).classList.toggle(e), "" !== n && document.getElementById(r).classList.toggle(n), "true" === t.getAttribute("aria-expanded") ? t.setAttribute("aria-expanded", "false") : t.setAttribute("aria-expanded", "true")) } }, 911: function(t, e, n) { "use strict"; var r = n(144), o = new(n.n(r)()); function a(t, e) { console.log(Date.now(), t, e.getAttribute("data-src")) } window.lazyLoadOptions = { threshold: 0, callback_enter: function(t) { a("🔑 ENTERED", t) }, callback_exit: function(t) { a("🚪 EXITED", t) }, callback_error: function(t) { a("💀 ERROR", t), t.src = "https://via.placeholder.com/440
```

### `callback_error`
```js
callback_error: function(t) { a("💀 ERROR", t), t.src = "https://via.placeholder.com/440x560/?text=Error+Placeholder" } }, window.addEventListener("load", (function(t) { o.update() })) }, 413: function(t, e, n) { "use strict"; var r = n(647), o = window.innerWidth > 0 ? window.innerWidth : screen.width, a = document.querySelectorAll('[data-toggle="main-menu"]'), i = document.querySelectorAll('[data-toggle="next-menu"]'), c = document.querySelectorAll('[data-toggle="prev-menu"]'), u = null, l = null, s = function(t) { t.classList.toggle("active"), document.body.classList.toggle("menuopen"), (0, r.A)(t, "active", ""), (null === u || u !== t) && d((u = t).getAttribute("data-target")) }, f = func
```

### `B`
```js
B = function(t) { document.addEventListener("click", (function(e) { document.getElementById(t).contains(e.target) || document.body.classList.contains("popopen") && ((0, g.A)(E, "open", ""), document.body.classList.toggle("popopen"), E = null) })) }; _.forEach((function(t) { t.addEventListener("click", (function(t) { t.stopPropagation(), t.currentTarget.hasAttribute("data-toggle") ? N(t.currentTarget) : w && ((0, g.A)(w, "opened", "show"), w = null) })) })), L.forEach((function(t) { t.addEventListener("click", (function(t) { t.currentTarget.hasAttribute("data-toggle") ? N(t.currentTarget) : w && ((0, g.A)(w, "opened", "show"), w = null) })) })), A.forEach((function(t) { t.addEventListener("cl
```
