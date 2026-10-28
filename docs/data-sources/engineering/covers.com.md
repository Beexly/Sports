# covers.com — engineering

App bundles beautified: **7**  
JSON endpoints captured: **2**  
Client functions passing filter: **56**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://covers.com/api/geolocation` | 72 |
| `https://covers.com/api/growthbook/attributes` | 125 |

## Response schemas

### `https://covers.com/api/geolocation`
```
ok: bool
countryCode: str
stateProvince: str
regionCode: str
```

### `https://covers.com/api/growthbook/attributes`
```
id: str
country: str
region: str
countryName: str
regionName: str
```

## Client-side functions that passed the filter

### `registerGeoRegions`
```js
registerGeoRegions = function(geodata) { if (this.geoRegions && 0 === this.geoRegions.length && geodata && geodata.length > 0) { var JSONversion = '{"configs": [' + geodata.replace(/ /g, "").replace(/'/g, '"') + "]}"; try { var jsonArray = JSON.parse(JSONversion); if (jsonArray.configs) for (var i = 0; i < jsonArray.configs.length; i++) jsonArray.configs[i].region && jsonArray.configs[i].cbid && this.geoRegions.push({ r: jsonArray.configs[i].region, i: jsonArray.configs[i].cbid }) } catch (e) { console.warn("ERROR IN GEOREGIONS ATTRIBUTE VALUE - NOT A VALID JSON ARRAY: " + geodata) } } }; var IMPLIED_TRIGGER_PATTERN = /(\s+|^)cookieconsent-implied-trigger(\s+|$)/i; function isImpliedConsentT
```

### `E`
```js
function E(e) { const s = t.isElement ? "swiper-slide" : `.${t.params.slideClass}`; return !!e.target.matches(s) || t.slides.filter((t => t.contains(e.target))).length > 0 } function x(e) { if ("mouse" === e.pointerType && u.splice(0, u.length), !E(e)) return; const s = t.params.zoom; if (l = !1, d = !1, u.push(e), !(u.length < 2)) { if (l = !0, m.scaleStart = y(), !m.slideEl) { m.slideEl = e.target.closest(`.${t.params.slideClass}, swiper-slide`), m.slideEl || (m.slideEl = t.slides[t.activeIndex]); let a = m.slideEl.querySelector(`.${s.containerClass}`); if (a && (a = a.querySelectorAll("picture, img, svg, canvas, .swiper-zoom-target")[0]), m.imageEl = a, m.imageWrapEl = a ? b(m.imageEl, `.
```

### `P`
```js
function P(e) { const s = t.zoom, a = t.params.zoom; if (!m.slideEl) { e && e.target && (m.slideEl = e.target.closest(`.${t.params.slideClass}, swiper-slide`)), m.slideEl || (t.params.virtual && t.params.virtual.enabled && t.virtual ? m.slideEl = h(t.slidesEl, `.${t.params.slideActiveClass}`)[0] : m.slideEl = t.slides[t.activeIndex]); let s = m.slideEl.querySelector(`.${a.containerClass}`); s && (s = s.querySelectorAll("picture, img, svg, canvas, .swiper-zoom-target")[0]), m.imageEl = s, m.imageWrapEl = s ? b(m.imageEl, `.${a.containerClass}`)[0] : void 0 } if (!m.imageEl || !m.imageWrapEl) return; let i, r, l, o, d, p, u, v, w, y, E, x, S, T, M, C, P, L; t.params.cssMode && (t.wrapperEl.sty
```

### `d`
```js
function d(e, t) { (e = n(e)).forEach((e => { e.setAttribute("role", t) })) } function c(e, t) { (e = n(e)).forEach((e => { e.setAttribute("aria-roledescription", t) })) } function p(e, t) { (e = n(e)).forEach((e => { e.setAttribute("aria-label", t) })) } function u(e) { (e = n(e)).forEach((e => { e.setAttribute("aria-disabled", !0) })) } function m(e) { (e = n(e)).forEach((e => { e.setAttribute("aria-disabled", !1) })) } function h(e) { if (13 !== e.keyCode && 32 !== e.keyCode) return; const s = t.params.a11y, a = e.target; t.pagination && t.pagination.el && (a === t.pagination.el || t.pagination.el.contains(e.target)) && !e.target.matches(ee(t.params.pagination.bulletClass)) || (t.navigati
```

### `c`
```js
function c(e, t) { (e = n(e)).forEach((e => { e.setAttribute("aria-roledescription", t) })) } function p(e, t) { (e = n(e)).forEach((e => { e.setAttribute("aria-label", t) })) } function u(e) { (e = n(e)).forEach((e => { e.setAttribute("aria-disabled", !0) })) } function m(e) { (e = n(e)).forEach((e => { e.setAttribute("aria-disabled", !1) })) } function h(e) { if (13 !== e.keyCode && 32 !== e.keyCode) return; const s = t.params.a11y, a = e.target; t.pagination && t.pagination.el && (a === t.pagination.el || t.pagination.el.contains(e.target)) && !e.target.matches(ee(t.params.pagination.bulletClass)) || (t.navigation && t.navigation.nextEl && a === t.navigation.nextEl && (t.isEnd && !t.param
```

### `p`
```js
function p(e, t) { (e = n(e)).forEach((e => { e.setAttribute("aria-label", t) })) } function u(e) { (e = n(e)).forEach((e => { e.setAttribute("aria-disabled", !0) })) } function m(e) { (e = n(e)).forEach((e => { e.setAttribute("aria-disabled", !1) })) } function h(e) { if (13 !== e.keyCode && 32 !== e.keyCode) return; const s = t.params.a11y, a = e.target; t.pagination && t.pagination.el && (a === t.pagination.el || t.pagination.el.contains(e.target)) && !e.target.matches(ee(t.params.pagination.bulletClass)) || (t.navigation && t.navigation.nextEl && a === t.navigation.nextEl && (t.isEnd && !t.params.loop || t.slideNext(), t.isEnd ? r(s.lastSlideMessage) : r(s.nextSlideMessage)), t.navigatio
```

### `u`
```js
function u(e) { (e = n(e)).forEach((e => { e.setAttribute("aria-disabled", !0) })) } function m(e) { (e = n(e)).forEach((e => { e.setAttribute("aria-disabled", !1) })) } function h(e) { if (13 !== e.keyCode && 32 !== e.keyCode) return; const s = t.params.a11y, a = e.target; t.pagination && t.pagination.el && (a === t.pagination.el || t.pagination.el.contains(e.target)) && !e.target.matches(ee(t.params.pagination.bulletClass)) || (t.navigation && t.navigation.nextEl && a === t.navigation.nextEl && (t.isEnd && !t.params.loop || t.slideNext(), t.isEnd ? r(s.lastSlideMessage) : r(s.nextSlideMessage)), t.navigation && t.navigation.prevEl && a === t.navigation.prevEl && (t.isBeginning && !t.params
```

### `x`
```js
function x(e) { if ("mouse" === e.pointerType && u.splice(0, u.length), !E(e)) return; const s = t.params.zoom; if (l = !1, d = !1, u.push(e), !(u.length < 2)) { if (l = !0, m.scaleStart = y(), !m.slideEl) { m.slideEl = e.target.closest(`.${t.params.slideClass}, swiper-slide`), m.slideEl || (m.slideEl = t.slides[t.activeIndex]); let a = m.slideEl.querySelector(`.${s.containerClass}`); if (a && (a = a.querySelectorAll("picture, img, svg, canvas, .swiper-zoom-target")[0]), m.imageEl = a, m.imageWrapEl = a ? b(m.imageEl, `.${s.containerClass}`)[0] : void 0, !m.imageWrapEl) return void(m.imageEl = void 0); m.maxRatio = m.imageWrapEl.getAttribute("data-swiper-zoom") || s.maxRatio } if (m.imageEl)
```

### `M`
```js
function M(e) { if (!E(e) || ! function(e) { const s = `.${t.params.zoom.containerClass}`; return !!e.target.matches(s) || [...t.hostEl.querySelectorAll(s)].filter((t => t.contains(e.target))).length > 0 }(e)) return; const s = t.zoom; if (!m.imageEl) return; if (!f.isTouched || !m.slideEl) return; f.isMoved || (f.width = m.imageEl.offsetWidth, f.height = m.imageEl.offsetHeight, f.startX = o(m.imageWrapEl, "x") || 0, f.startY = o(m.imageWrapEl, "y") || 0, m.slideWidth = m.slideEl.offsetWidth, m.slideHeight = m.slideEl.offsetHeight, m.imageWrapEl.style.transitionDuration = "0ms"); const a = f.width * s.scale, i = f.height * s.scale; if (a < m.slideWidth && i < m.slideHeight) return; f.minX = 
```

### `getEffectParams`
```js
getEffectParams: () => t.params.flipEffect, perspective: () => !0, overwriteParams: () => ({ slidesPerView: 1, slidesPerGroup: 1, watchSlidesProgress: !0, spaceBetween: 0, virtualTranslate: !t.params.cssMode }) }) }, function(e) { let { swiper: t, extendParams: s, on: a } = e; s({ coverflowEffect: { rotate: 50, stretch: 0, depth: 100, scale: 1, modifier: 1, slideShadows: !0 } }), ne({ effect: "coverflow", swiper: t, on: a, setTranslate: () => { const { width: e, height: s, slides: a, slidesSizesGrid: i } = t, r = t.params.coverflowEffect, n = t.isHorizontal(), l = t.translate, o = n ? e / 2 - l : s / 2 - l, d = n ? r.rotate : -r.rotate, c = r.depth; 
```

### `perspective`
```js
perspective: () => !0, overwriteParams: () => ({ slidesPerView: 1, slidesPerGroup: 1, watchSlidesProgress: !0, spaceBetween: 0, virtualTranslate: !t.params.cssMode }) }) }, function(e) { let { swiper: t, extendParams: s, on: a } = e; s({ coverflowEffect: { rotate: 50, stretch: 0, depth: 100, scale: 1, modifier: 1, slideShadows: !0 } }), ne({ effect: "coverflow", swiper: t, on: a, setTranslate: () => { const { width: e, height: s, slides: a, slidesSizesGrid: i } = t, r = t.params.coverflowEffect, n = t.isHorizontal(), l = t.translate, o = n ? e / 2 - l : s / 2 - l, d = n ? r.rotate : -r.rotate, c = r.depth; for (let e = 0, t = a.length; e < t; e += 1) {
```

### `overwriteParams`
```js
overwriteParams: () => ({ slidesPerView: 1, slidesPerGroup: 1, watchSlidesProgress: !0, spaceBetween: 0, virtualTranslate: !t.params.cssMode }) }) }, function(e) { let { swiper: t, extendParams: s, on: a } = e; s({ coverflowEffect: { rotate: 50, stretch: 0, depth: 100, scale: 1, modifier: 1, slideShadows: !0 } }), ne({ effect: "coverflow", swiper: t, on: a, setTranslate: () => { const { width: e, height: s, slides: a, slidesSizesGrid: i } = t, r = t.params.coverflowEffect, n = t.isHorizontal(), l = t.translate, o = n ? e / 2 - l : s / 2 - l, d = n ? r.rotate : -r.rotate, c = r.depth; for (let e = 0, t = a.length; e < t; e += 1) { const t = a[e], 
```

### `g`
```js
function g(e) { const t = r(), s = a(), i = e.getBoundingClientRect(), n = s.body, l = e.clientTop || n.clientTop || 0, o = e.clientLeft || n.clientLeft || 0, d = e === t ? t.scrollY : e.scrollTop, c = e === t ? t.scrollX : e.scrollLeft; return { top: i.top + d - l, left: i.left + c - o } } function v(e, t) { return r().getComputedStyle(e, null).getPropertyValue(t) } function w(e) { let t, s = e; if (s) { for (t = 0; null !== (s = s.previousSibling);) 1 === s.nodeType && (t += 1); return t } } function b(e, t) { const s = []; let a = e.parentElement; for (; a;) t ? a.matches(t) && s.push(a) : s.push(a), a = a.parentElement; return s } function y(e, t) { t && e.addEventListener("transitionend
```

### `v`
```js
function v(e, t) { return r().getComputedStyle(e, null).getPropertyValue(t) } function w(e) { let t, s = e; if (s) { for (t = 0; null !== (s = s.previousSibling);) 1 === s.nodeType && (t += 1); return t } } function b(e, t) { const s = []; let a = e.parentElement; for (; a;) t ? a.matches(t) && s.push(a) : s.push(a), a = a.parentElement; return s } function y(e, t) { t && e.addEventListener("transitionend", (function s(a) { a.target === e && (t.call(e, a), e.removeEventListener("transitionend", s)) })) } function E(e, t, s) { const a = r(); return s ? e["width" === t ? "offsetWidth" : "offsetHeight"] + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-right" : "
```

### `w`
```js
function w(e) { let t, s = e; if (s) { for (t = 0; null !== (s = s.previousSibling);) 1 === s.nodeType && (t += 1); return t } } function b(e, t) { const s = []; let a = e.parentElement; for (; a;) t ? a.matches(t) && s.push(a) : s.push(a), a = a.parentElement; return s } function y(e, t) { t && e.addEventListener("transitionend", (function s(a) { a.target === e && (t.call(e, a), e.removeEventListener("transitionend", s)) })) } function E(e, t, s) { const a = r(); return s ? e["width" === t ? "offsetWidth" : "offsetHeight"] + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-right" : "margin-top")) + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width
```

### `b`
```js
function b(e, t) { const s = []; let a = e.parentElement; for (; a;) t ? a.matches(t) && s.push(a) : s.push(a), a = a.parentElement; return s } function y(e, t) { t && e.addEventListener("transitionend", (function s(a) { a.target === e && (t.call(e, a), e.removeEventListener("transitionend", s)) })) } function E(e, t, s) { const a = r(); return s ? e["width" === t ? "offsetWidth" : "offsetHeight"] + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-right" : "margin-top")) + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-left" : "margin-bottom")) : e.offsetWidth } let x, S, T; function M() { return x || (x = function() { const e =
```

### `y`
```js
function y(e, t) { t && e.addEventListener("transitionend", (function s(a) { a.target === e && (t.call(e, a), e.removeEventListener("transitionend", s)) })) } function E(e, t, s) { const a = r(); return s ? e["width" === t ? "offsetWidth" : "offsetHeight"] + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-right" : "margin-top")) + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-left" : "margin-bottom")) : e.offsetWidth } let x, S, T; function M() { return x || (x = function() { const e = r(), t = a(); return { smoothScroll: t.documentElement && t.documentElement.style && "scrollBehavior" in t.documentElement.style, touch: !!("on
```

### `s`
```js
function s(a) { a.target === e && (t.call(e, a), e.removeEventListener("transitionend", s)) })) } function E(e, t, s) { const a = r(); return s ? e["width" === t ? "offsetWidth" : "offsetHeight"] + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-right" : "margin-top")) + parseFloat(a.getComputedStyle(e, null).getPropertyValue("width" === t ? "margin-left" : "margin-bottom")) : e.offsetWidth } let x, S, T; function M() { return x || (x = function() { const e = r(), t = a(); return { smoothScroll: t.documentElement && t.documentElement.style && "scrollBehavior" in t.documentElement.style, touch: !!("ontouchstart" in e || e.DocumentTouch && t instanceof e.Documen
```

### `o`
```js
function o(e) { (e = n(e)).forEach((e => { e.setAttribute("tabIndex", "-1") })) } function d(e, t) { (e = n(e)).forEach((e => { e.setAttribute("role", t) })) } function c(e, t) { (e = n(e)).forEach((e => { e.setAttribute("aria-roledescription", t) })) } function p(e, t) { (e = n(e)).forEach((e => { e.setAttribute("aria-label", t) })) } function u(e) { (e = n(e)).forEach((e => { e.setAttribute("aria-disabled", !0) })) } function m(e) { (e = n(e)).forEach((e => { e.setAttribute("aria-disabled", !1) })) } function h(e) { if (13 !== e.keyCode && 32 !== e.keyCode) return; const s = t.params.a11y, a = e.target; t.pagination && t.pagination.el && (a === t.pagination.el || t.pagination.el.contains(e
```

### `setTranslate`
```js
setTranslate: () => { const { width: e, height: s, slides: a, slidesSizesGrid: i } = t, r = t.params.coverflowEffect, n = t.isHorizontal(), l = t.translate, o = n ? e / 2 - l : s / 2 - l, d = n ? r.rotate : -r.rotate, c = r.depth; for (let e = 0, t = a.length; e < t; e += 1) { const t = a[e], s = i[e], l = (o - t.swiperSlideOffset - s / 2) / s, p = "function" == typeof r.modifier ? r.modifier(l) : l * r.modifier; let u = n ? d * p : 0, m = n ? 0 : d * p, h = -c * Math.abs(p), f = r.stretch; "string" == typeof f && -1 !== f.indexOf("%") && (f = parseFloat(r.stretch) / 100 * s); let g = n ? 0 : f * p, v = n ? f * p : 0, w = 1 - (1 - r.scale) * Math.abs(p); Math.abs(v) < .001 && (v = 
```

### `fcssescape`
```js
fcssescape = function(ch, asCodePoint) { return asCodePoint ? "\0" === ch ? "�" : ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " " : "\\" + ch }, inDisabledFieldset = addCombinator(function(elem) { return !0 === elem.disabled && "fieldset" === elem.nodeName.toLowerCase() }, { dir: "parentNode", next: "legend" }); try { push.apply(arr = slice.call(preferredDoc.childNodes), preferredDoc.childNodes), arr[preferredDoc.childNodes.length].nodeType } catch (e) { push = { apply: arr.length ? function(target, els) { pushNative.apply(target, slice.call(els)) } : function(target, els) { for (var j = target.length, i = 0; target[j++] = els[i++];); target.length = j - 1 } } } func
```

### `ajaxExtend`
```js
function ajaxExtend(target, src) { var key, deep, flatOptions = jQuery.ajaxSettings.flatOptions || {}; for (key in src) void 0 !== src[key] && ((flatOptions[key] ? target : deep = deep || {})[key] = src[key]); return deep && jQuery.extend(!0, target, deep), target } originAnchor.href = location.href, jQuery.extend({ active: 0, lastModified: {}, etag: {}, ajaxSettings: { url: location.href, type: "GET", isLocal: /^(?:about|app|app-storage|.+-extension|file|res|widget):$/.test(location.protocol), global: !0, processData: !0, async: !0, contentType: "application/x-www-form-urlencoded; charset=UTF-8", accepts: { "*": allTypes, text: "text/plain", html: "text/html", xml: "application/xml, text/xm
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

### `_getPathKey`
```js
_getPathKey: function() { var pathKey = ""; var leaguePaths = ["nfl", "ncaaf", "nba", "ncaab", "mlb", "nhl", "wnba", "cfl", "ufc", "soccer", "pga", "f1"]; var industryPaths = ["politics", "entertainment"]; var otherPaths = ["picks", "sport", "sports"]; var validPathList = leaguePaths.concat(industryPaths).concat(otherPaths); var path = window.location.pathname; var pathArray = path.split("/").filter((x) => x != "").map((x) => x.toLowerCase()); // Test for valid path. if (pathArray.length > 0 && validPathList.includes(pathArray[0])) { var isArticlePath = leaguePaths.concat(industryPaths).includes(pathArray[0]); // Exclude betting news pages (ex: /nfl/betting-news) if (isArticlePath && pathArr
```

### `_setCookie`
```js
_setCookie: function(name, value, daysToLive) { var cookie = name + "=" + encodeURIComponent(value); cookie += ";max-age=" + (daysToLive * 24 * 60 * 60) + ";path=/"; document.cookie = cookie; }, // Checks path, gets the key used to store page view data for the current page (as key/value pair). // @return {string} Page view data key. Returns empty string if page views aren't tracked on current page _getPathKey: function() { var pathKey = ""; var leaguePaths = ["nfl", "ncaaf", "nba", "ncaab", "mlb", "nhl", "wnba", "cfl", "ufc", "soccer", "pga", "f1"]; var industryPaths = ["politics", "entertainment"]; var otherPaths = ["picks", "sport", "sports"]; var validPathList = leaguePaths.concat(industr
```

### `loadHubspotForm`
```js
loadHubspotForm: function(callback) { hbspt.forms.create({ region: "na1", portalId: "3462941", formId: pageViewModal.formId, target: pageViewModal.formWrapperId, onFormSubmit: function($form) { pageViewModal.setFormSubmitted(); }, onFormReady: function($form) { if (callback != null) { callback(); } } }); }, // Shows/hides the page view footer // @param {string} showHide: Toggles footer display. Values = "show" or "hide" togglePageViewFooter: function(showHide = "show") { var footerLink = document.getElementById(pageViewModal.signupFooterLink); if (showHide === "hide") { footerLink.style.display = 'none'; } else if (showHide === "show") { footerLink.style.display = 'flex'; } }, // Shows/hides
```

### `clickHandler`
```js
function clickHandler(e) { var options, slideIndex, $this = $(this), href = (href = $this.attr("href")) && href.replace(/.*(?=#[^\s]+$)/, ""), target = $this.attr("data-target") || href, $target = $(document).find(target); $target.hasClass("carousel") && (options = $.extend({}, $target.data(), $this.data()), (slideIndex = $this.attr("data-slide-to")) && (options.interval = !1), Plugin.call($target, options), slideIndex && $target.data("bs.carousel").to(slideIndex), e.preventDefault()) } $(document).on("click.bs.carousel.data-api", "[data-slide]", clickHandler).on("click.bs.carousel.data-api", "[data-slide-to]", clickHandler), $(window).on("load", function() { $('[data-ride="carousel"]').each
```

### `Affix`
```js
Affix = function(element, options) { this.options = $.extend({}, Affix.DEFAULTS, options); var target = this.options.target === Affix.DEFAULTS.target ? $(this.options.target) : $(document).find(this.options.target); this.$target = target.on("scroll.bs.affix.data-api", $.proxy(this.checkPosition, this)).on("click.bs.affix.data-api", $.proxy(this.checkPositionWithEventLoop, this)), this.$element = $(element), this.affixed = null, this.unpin = null, this.pinnedOffset = null, this.checkPosition() }; function Plugin(option) { return this.each(function() { var $this = $(this), data = $this.data("bs.affix"), options = "object" == typeof option && option; data || $this.data("bs.affix", data = new Af
```

### `measureScrollbar`
```js
measureScrollbar = function() { var scrollDiv = document.createElement("div"); scrollDiv.className = "modal-scrollbar-measure", this.$body.append(scrollDiv); var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth; return this.$body[0].removeChild(scrollDiv), scrollbarWidth }; var old = $.fn.modal; $.fn.modal = Plugin, $.fn.modal.Constructor = Modal, $.fn.modal.noConflict = function() { return $.fn.modal = old, this }, $(document).on("click.bs.modal.data-api", '[data-toggle="modal"]', function(e) { var $this = $(this), href = $this.attr("href"), target = $this.attr("data-target") || href && href.replace(/.*(?=#[^\s]+$)/, ""), $target = $(document).find(target), option = $target.da
```

### `activate`
```js
activate = function(target) { this.activeTarget = target, this.clear(); var selector = this.selector + '[data-target="' + target + '"],' + this.selector + '[href="' + target + '"]', active = $(selector).parents("li").addClass("active"); active.parent(".dropdown-menu").length && (active = active.closest("li.dropdown").addClass("active")), active.trigger("activate.bs.scrollspy") }, ScrollSpy.prototype.clear = function() { $(this.selector).parentsUntil(this.options.target, ".active").removeClass("active") }; var old = $.fn.scrollspy; $.fn.scrollspy = Plugin, $.fn.scrollspy.Constructor = ScrollSpy, $.fn.scrollspy.noConflict = function() { return $.fn.scrollspy = old, this }, $(window).on("load.b
```

### `Collapse`
```js
Collapse = function(element, options) { this.$element = $(element), this.options = $.extend({}, Collapse.DEFAULTS, options), this.$trigger = $('[data-toggle="collapse"][href="#' + element.id + '"],[data-toggle="collapse"][data-target="#' + element.id + '"]'), this.transitioning = null, this.options.parent ? this.$parent = this.getParent() : this.addAriaAndCollapsedClass(this.$element, this.$trigger), this.options.toggle && this.toggle() }; function getTargetFromTrigger($trigger) { var href, target = $trigger.attr("data-target") || (href = $trigger.attr("href")) && href.replace(/.*(?=#[^\s]+$)/, ""); return $(document).find(target) } function Plugin(option) { return this.each(function() { var
```

### `addAriaAndCollapsedClass`
```js
addAriaAndCollapsedClass = function($element, $trigger) { var isOpen = $element.hasClass("in"); $element.attr("aria-expanded", isOpen), $trigger.toggleClass("collapsed", !isOpen).attr("aria-expanded", isOpen) }; var old = $.fn.collapse; $.fn.collapse = Plugin, $.fn.collapse.Constructor = Collapse, $.fn.collapse.noConflict = function() { return $.fn.collapse = old, this }, $(document).on("click.bs.collapse.data-api", '[data-toggle="collapse"]', function(e) { var $this = $(this); $this.attr("data-target") || e.preventDefault(); var $target = getTargetFromTrigger($this), option = $target.data("bs.collapse") ? "toggle" : $this.data(); Plugin.call($target, option) }) }(jQuery), function($) { "use
```

### `noConflict`
```js
noConflict = function() { return $.fn.button = old, this }, $(document).on("click.bs.button.data-api", '[data-toggle^="button"]', function(e) { var $btn = $(e.target).closest(".btn"); Plugin.call($btn, "toggle"), $(e.target).is('input[type="radio"], input[type="checkbox"]') || (e.preventDefault(), $btn.is("input,button") ? $btn.trigger("focus") : $btn.find("input:visible,button:visible").first().trigger("focus")) }).on("focus.bs.button.data-api blur.bs.button.data-api", '[data-toggle^="button"]', function(e) { $(e.target).closest(".btn").toggleClass("focus", /^focus(in)?$/.test(e.type)) }) }(jQuery), function($) { "use strict"; function Carousel(element, options) { this.$element = $(element)
```

### `Dropdown`
```js
function Dropdown(element) { $(element).on("click.bs.dropdown", this.toggle) } var toggle = '[data-toggle="dropdown"]'; function getParent($this) { var selector = $this.attr("data-target"), $parent = "#" !== (selector = selector || (selector = $this.attr("href")) && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, "")) ? $(document).find(selector) : null; return $parent && $parent.length ? $parent : $this.parent() } function clearMenus(e) { e && 3 === e.which || ($(".dropdown-backdrop").remove(), $(toggle).each(function() { var $this = $(this), $parent = getParent($this), relatedTarget = { relatedTarget: this }; $parent.hasClass("open") && (e && "click" == e.type && /input|te
```

### `Plugin`
```js
function Plugin(option) { return this.each(function() { var $this = $(this), data = $this.data("bs.affix"), options = "object" == typeof option && option; data || $this.data("bs.affix", data = new Affix(this, options)), "string" == typeof option && data[option]() }) } Affix.VERSION = "3.4.1", Affix.RESET = "affix affix-top affix-bottom", Affix.DEFAULTS = { offset: 0, target: window }, Affix.prototype.getState = function(scrollHeight, height, offsetTop, offsetBottom) { var scrollTop = this.$target.scrollTop(), position = this.$element.offset(), targetHeight = this.$target.height(); if (null != offsetTop && "top" == this.affixed) return scrollTop < offsetTop && "top"; if ("bottom" == this.affi
```

### `clearMenus`
```js
function clearMenus(e) { e && 3 === e.which || ($(".dropdown-backdrop").remove(), $(toggle).each(function() { var $this = $(this), $parent = getParent($this), relatedTarget = { relatedTarget: this }; $parent.hasClass("open") && (e && "click" == e.type && /input|textarea/i.test(e.target.tagName) && $.contains($parent[0], e.target) || ($parent.trigger(e = $.Event("hide.bs.dropdown", relatedTarget)), e.isDefaultPrevented() || ($this.attr("aria-expanded", "false"), $parent.removeClass("open").trigger($.Event("hidden.bs.dropdown", relatedTarget))))) })) } Dropdown.VERSION = "3.4.1", Dropdown.prototype.toggle = function(e) { var $this = $(this); if (!$this.is(".disabled, :disabled")) { var $parent
```

### `keydown`
```js
keydown = function(e) { if (/(38|40|27|32)/.test(e.which) && !/input|textarea/i.test(e.target.tagName)) { var $this = $(this); if (e.preventDefault(), e.stopPropagation(), !$this.is(".disabled, :disabled")) { var $parent = getParent($this), isActive = $parent.hasClass("open"); if (!isActive && 27 != e.which || isActive && 27 == e.which) return 27 == e.which && $parent.find(toggle).trigger("focus"), $this.trigger("click"); var index, $items = $parent.find(".dropdown-menu li:not(.disabled):visible a"); $items.length && (index = $items.index(e.target), 38 == e.which && 0 < index && index--, 40 == e.which && index < $items.length - 1 && index++, ~index || (index = 0), $items.eq(index).trigger("f
```

### `process`
```js
process = function() { var i, scrollTop = this.$scrollElement.scrollTop() + this.options.offset, scrollHeight = this.getScrollHeight(), maxScroll = this.options.offset + scrollHeight - this.$scrollElement.height(), offsets = this.offsets, targets = this.targets, activeTarget = this.activeTarget; if (this.scrollHeight != scrollHeight && this.refresh(), maxScroll <= scrollTop) return activeTarget != (i = targets[targets.length - 1]) && this.activate(i); if (activeTarget && scrollTop < offsets[0]) return this.activeTarget = null, this.clear(); for (i = offsets.length; i--;) activeTarget != targets[i] && scrollTop >= offsets[i] && (void 0 === offsets[i + 1] || scrollTop < offsets[i + 1]) && this
```

### `getState`
```js
getState = function(scrollHeight, height, offsetTop, offsetBottom) { var scrollTop = this.$target.scrollTop(), position = this.$element.offset(), targetHeight = this.$target.height(); if (null != offsetTop && "top" == this.affixed) return scrollTop < offsetTop && "top"; if ("bottom" == this.affixed) return null != offsetTop ? !(scrollTop + this.unpin <= position.top) && "bottom" : !(scrollTop + targetHeight <= scrollHeight - offsetBottom) && "bottom"; var initializing = null == this.affixed, colliderTop = initializing ? scrollTop : position.top; return null != offsetTop && scrollTop <= offsetTop ? "top" : null != offsetBottom && scrollHeight - offsetBottom <= colliderTop + (initializing ? ta
```

### `Alert`
```js
function Alert(el) { $(el).on("click", dismiss, this.close) } var dismiss = '[data-dismiss="alert"]'; Alert.VERSION = "3.4.1", Alert.TRANSITION_DURATION = 150, Alert.prototype.close = function(e) { var $this = $(this), selector = $this.attr("data-target"); selector = "#" === (selector = selector || (selector = $this.attr("href")) && selector.replace(/.*(?=#[^\s]*$)/, "")) ? [] : selector; var $parent = $(document).find(selector); function removeElement() { $parent.detach().trigger("closed.bs.alert").remove() } e && e.preventDefault(), $parent.length || ($parent = $this.closest(".alert")), $parent.trigger(e = $.Event("close.bs.alert")), e.isDefaultPrevented() || ($parent.removeClass("in"), $.
```

### `getParent`
```js
getParent = function() { return $(document).find(this.options.parent).find('[data-toggle="collapse"][data-parent="' + this.options.parent + '"]').each($.proxy(function(i, element) { var $element = $(element); this.addAriaAndCollapsedClass(getTargetFromTrigger($element), $element) }, this)).end() }, Collapse.prototype.addAriaAndCollapsedClass = function($element, $trigger) { var isOpen = $element.hasClass("in"); $element.attr("aria-expanded", isOpen), $trigger.toggleClass("collapsed", !isOpen).attr("aria-expanded", isOpen) }; var old = $.fn.collapse; $.fn.collapse = Plugin, $.fn.collapse.Constructor = Collapse, $.fn.collapse.noConflict = function() { return $.fn.collapse = old, this }, $(docu
```

### `show`
```js
show = function(_relatedTarget) { var that = this, e = $.Event("show.bs.modal", { relatedTarget: _relatedTarget }); this.$element.trigger(e), this.isShown || e.isDefaultPrevented() || (this.isShown = !0, this.checkScrollbar(), this.setScrollbar(), this.$body.addClass("modal-open"), this.escape(), this.resize(), this.$element.on("click.dismiss.bs.modal", '[data-dismiss="modal"]', $.proxy(this.hide, this)), this.$dialog.on("mousedown.dismiss.bs.modal", function() { that.$element.one("mouseup.dismiss.bs.modal", function(e) { $(e.target).is(that.$element) && (that.ignoreBackdropClick = !0) }) }), this.backdrop(function() { var transition = $.support.transition && that.$element.hasClass("fade"); 
```

### `hideModal`
```js
hideModal = function() { var that = this; this.$element.hide(), this.backdrop(function() { that.$body.removeClass("modal-open"), that.resetAdjustments(), that.resetScrollbar(), that.$element.trigger("hidden.bs.modal") }) }, Modal.prototype.removeBackdrop = function() { this.$backdrop && this.$backdrop.remove(), this.$backdrop = null }, Modal.prototype.backdrop = function(callback) { var callbackRemove, that = this, animate = this.$element.hasClass("fade") ? "fade" : ""; if (this.isShown && this.options.backdrop) { var doAnimate = $.support.transition && animate; if (this.$backdrop = $(document.createElement("div")).addClass("modal-backdrop " + animate).appendTo(this.$body), this.$element.on(
```

### `clear`
```js
clear = function() { $(this.selector).parentsUntil(this.options.target, ".active").removeClass("active") }; var old = $.fn.scrollspy; $.fn.scrollspy = Plugin, $.fn.scrollspy.Constructor = ScrollSpy, $.fn.scrollspy.noConflict = function() { return $.fn.scrollspy = old, this }, $(window).on("load.bs.scrollspy.data-api", function() { $('[data-spy="scroll"]').each(function() { var $spy = $(this); Plugin.call($spy, $spy.data()) }) }) }(jQuery), function($) { "use strict"; function Tab(element) { this.element = $(element) } function Plugin(option) { return this.each(function() { var $this = $(this), data = $this.data("bs.tab"); data || $this.data("bs.tab", data = new Tab(this)), "string" == typeof
```
