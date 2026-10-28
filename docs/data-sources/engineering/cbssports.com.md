# cbssports.com — engineering

App bundles beautified: **7**  
JSON endpoints captured: **2**  
Client functions passing filter: **26**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://slc.cbssports.com/events` | 2 |
| `https://video-api-geo.cbssports.com/` | 214 |

## Response schemas

### `https://slc.cbssports.com/events`
```
```

### `https://video-api-geo.cbssports.com/`
```
dmaId: str
dmaGroup: str
dmaMarket: str
dmaDaiOptIn: str
region: str
city: str
zip: str
country: str
countryCode: str
clientIp: str
```

## Client-side functions that passed the filter

### `N`
```js
N = function(e, t, r) { var n = S(r, t - 1), i = S(r, t + 1); return A(P, e) && !A(R, i) || A(R, e) && !A(P, n) ? "\\u" + x(E(e, 0), 16) : e }, U = function(e) { if (c(e)) return e; if (u(e)) { for (var t = e.length, r = [], n = 0; n < t; n++) { var i = e[n]; "string" == typeof i ? T(r, i) : "number" != typeof i && "Number" !== f(i) && "String" !== f(i) || T(r, g(i)) } var o = r.length, a = !0; return function(e, t) { if (a) return a = !1, t; if (u(this)) return t; for (var n = 0; n < o; n++) if (r[n] === e) return t } } }; _ && n({ target: "
```

### `O`
```js
O = function(e, t) { var r = l(arguments), n = p(t); if (u(n) || void 0 !== e && !c(e)) return r[1] = function(e, t) { if (u(n) && (t = a(n, this, g(e), t)), !c(t)) return t }, o(m, null, r) }, T = function(e, t, r) { var n = b(r, t - 1), i = b(r, t + 1); return v(A, e) && !v(S, i) || v(S, e) && !v(A, n) ? "\\u" + I(h(e, 0), 16) : e }; m && n({ target: "JSON", stat: !0, arity: 3, forced: E || w }, { stringify: function(e, t, r) { var n = l(arguments), i = o(E ? O : m, null, n); return w && "string" == typeof i ? y(i, _, T) : i } }) }, 16178(e, t, r) { "use strict"; 
```

### `T`
```js
T = function(e, t, r) { var n = b(r, t - 1), i = b(r, t + 1); return v(A, e) && !v(S, i) || v(S, e) && !v(A, n) ? "\\u" + I(h(e, 0), 16) : e }; m && n({ target: "JSON", stat: !0, arity: 3, forced: E || w }, { stringify: function(e, t, r) { var n = l(arguments), i = o(E ? O : m, null, n); return w && "string" == typeof i ? y(i, _, T) : i } }) }, 16178(e, t, r) { "use strict"; var n = r(11075), i = r(19520), o = r(48631), a = r(84700), s = r(85758), d = r(2138), u = r(56178), c = r(25473), l = r(18695), p = o && o.prototype; if (n({ 
```

### `b`
```js
function b(t) { if (t.feature_flag && !location.href.includes("minutely-tv-feature-flag")) return !1; var n = !0; t.selectors.validator && (n = !!document.querySelector(t.selectors.validator)); var r = !0; t.JSValidator && (r = new Function("min_validator", t.JSValidator)(min_validator)); var o = !0; e.generalPlacementValidator && (o = new Function("placement", e.generalPlacementValidator)(t)); var a = !!t.selectors.target && document.querySelector(t.selectors.target), i = !!t.selectors.xpath && !!t.selectors.xpath.target && document.evaluate(t.selectors.xpath.target, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; return o && n && r && (a || i) } function x(e) { 
```

### `o`
```js
o = function(e, t) { return void 0 !== t && "object" !== _typeof(t) && "function" != typeof t && t.length > 0 && t != parseInt(t) }; for (r in n) o(r, n[r]) && (t.style[r] = n[r]) }(document.querySelector(o.selectors.titleStyle), e.querySelector(".editor-tv-title")), e } function b(t) { if (t.feature_flag && !location.href.includes("minutely-tv-feature-flag")) return !1; var n = !0; t.selectors.validator && (n = !!document.querySelector(t.selectors.validator)); var r = !0; t.JSValidator && (r = new Function("min_validator", t.JSValidator)(min_validator)); var o = !0; e.generalPlacementValidator && (o = new Function("placement", e.generalPlacementValidator)(t)); var a = !!t.selectors.target &
```

### `y`
```js
function y(e) { var t; e.selectors.xpath ? t = [document.evaluate(e.selectors.xpath.target, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue] : t = document.querySelectorAll(e.selectors.target); for (var n = 0; n < t.length; n++) { var r = t[n]; if (e.selectors.method && r && !r.dataset.minTvRunning) { var o = w(e); return o = _(o, e), "replaceInnerTarget" == e.selectors.method ? (r.innerHTML = "", r.insertAdjacentElement("afterbegin", o)) : r.insertAdjacentElement(e.selectors.method, o), r.dataset.minTvRunning = !0, e.injected = !0, o } } } function w(e) { var t = document.createElement("div"), n = document.createElement("div"); t.classList.add("editor-tv-wrapper")
```

### `S`
```js
function S(e) { var t = document.createElement("div"); return t.setAttribute("id", "minute-size-container"), t.style.width = "100%", t.style.position = "relative", e.querySelector(".editor-tv-component").appendChild(t), t } function T(e, t) { try { var n = document.createElement("div"); return n.classList.add("tvp-host-element"), t && (n.style = t), e.appendChild(n), n } catch (r) { return console.warn(r), !1 } } function E(e, t) { try { var n = document.createElement("iframe"); n.classList.add("tvp-host-element"), n.setAttribute("src", "about:blank"), n.setAttribute("frameborder", "0"), n.setAttribute("scrolling", "no"), n.setAttribute("title", "Must watch - top videos player"), t ? n.style
```

### `T`
```js
function T(e, t) { try { var n = document.createElement("div"); return n.classList.add("tvp-host-element"), t && (n.style = t), e.appendChild(n), n } catch (r) { return console.warn(r), !1 } } function E(e, t) { try { var n = document.createElement("iframe"); n.classList.add("tvp-host-element"), n.setAttribute("src", "about:blank"), n.setAttribute("frameborder", "0"), n.setAttribute("scrolling", "no"), n.setAttribute("title", "Must watch - top videos player"), t ? n.style = t : (n.style.width = "100%", n.style.height = "100%", n.style.position = "absolute", n.style.top = "0", n.style.left = "0"), e.appendChild(n), n.contentWindow.document.open().close(); var r = document.createElement("tag")
```

### `E`
```js
function E(e, t) { try { var n = document.createElement("iframe"); n.classList.add("tvp-host-element"), n.setAttribute("src", "about:blank"), n.setAttribute("frameborder", "0"), n.setAttribute("scrolling", "no"), n.setAttribute("title", "Must watch - top videos player"), t ? n.style = t : (n.style.width = "100%", n.style.height = "100%", n.style.position = "absolute", n.style.top = "0", n.style.left = "0"), e.appendChild(n), n.contentWindow.document.open().close(); var r = document.createElement("tag"); return r.setAttribute("name", "viewport"), r.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"), n.contentDocument.head.appendChild(r), n } c
```

### `f`
```js
function f(n) { var e = 0; if (0 == n.length) return e; for (var i = 0; i < n.length; i++) { e = (e << 5) - e + n.charCodeAt(i), e |= 0 } return e } }({ "fallbackUsed": true, "videos": [{ "id": 9469688, "vidId": "4ef31325-54b8-4d2a-89fc-1b26ae5e3bd2", "minVidId": 7372838, "doesCollect": true, "defaultHltId": 137926811, "articleUrl": "/watch/mlb/video/world-series-game-5-highlights-brewers-at-rays-1027", "highlights": [{ "hltId": 137926811, "vidUrl": "aad701ff-6a8c-4d05-7372838-a73a-61f348404845-s49.082-56.456", "hasVertical": false, "weights": "1,1,1,1", "rank": "0.00413,0.0,0,0" }] }, { "id": 9469672, "vidId": "0238904f-4f79-479d-8dae-114bc9653adb", "minVidId": 7372822, "doesCollect": true,
```

### `addTrackingElementListener`
```js
function addTrackingElementListener(element) { element.addEventListener("click", (() => { const trackString = element.dataset.tracking || ""; const trackJson = JSON.parse(trackString) || {}; const linkName = trackJson.linkName || ""; const module1 = trackJson.module || ""; if (window.om) { window.om.trackAction(linkName, module1) } })) } const trackListOfElements = elements => { elements.forEach((element => { addTrackingElementListener(element) })) }; const loadMyFantasyTeamsComponent = (target, isUserButton) => { const containers = target.querySelectorAll(".GlobalNavMyFantasyTeamsPromo"); const callback = (container, user) => { const myFantasyTeamsSection = container.querySelector("[data-pl
```

### `loadMyFantasyTeamsComponent`
```js
loadMyFantasyTeamsComponent = (target, isUserButton) => { const containers = target.querySelectorAll(".GlobalNavMyFantasyTeamsPromo"); const callback = (container, user) => { const myFantasyTeamsSection = container.querySelector("[data-placeholder-for='fantasy-teams-section']"); const myFantasyTeamTemplate = container.querySelector("[data-placeholder-for='fantasy-team']"); if (myFantasyTeamsSection) { user.spoes.forEach((section => { const teamsArray = []; const sectionClone = myFantasyTeamsSection.cloneNode(true); const myFantasyTeamsList = sectionClone.querySelector("[data-placeholder-for='fantasy-teams-list']"); if (section.teams.length > 0) { const categoryTitle = sectionClone.querySelec
```

### `hidden`
```js
hidden = function(e) { return e.offsetWidth === 0 && e.offsetHeight === 0 || !ge.support.reliableHiddenOffsets && (e.style && e.style.display || p(e, "display")) === "none" }; ge.expr.filters.visible = function(e) { return !ge.expr.filters.hidden(e) } } ge.each({ margin: "", padding: "", border: "Width" }, function(r, o) { ge.cssHooks[r + o] = { expand: function(e) { var t, n = typeof e === "string" ? e.split(" ") : [e], i = {}; for (t = 0; t < 4; t++) { i[r + m[t] + o] = n[t] || n[t - 2] || n[0] } return i } }; if (!et.test(r)) { ge.cssHooks[r + o].set = ft } }); var ht = /%20/g, gt = /\[\]$/, mt = /\r?\n/g, yt = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|ran
```

### `visible`
```js
visible = function(e) { return !ge.expr.filters.hidden(e) } } ge.each({ margin: "", padding: "", border: "Width" }, function(r, o) { ge.cssHooks[r + o] = { expand: function(e) { var t, n = typeof e === "string" ? e.split(" ") : [e], i = {}; for (t = 0; t < 4; t++) { i[r + m[t] + o] = n[t] || n[t - 2] || n[0] } return i } }; if (!et.test(r)) { ge.cssHooks[r + o].set = ft } }); var ht = /%20/g, gt = /\[\]$/, mt = /\r?\n/g, yt = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i, vt = /^(?:select|textarea)/i; ge.fn.extend({ serialize: function() { return ge.param(this.serializeArray()) }, serializeArray: function() { return this.ma
```

### `expand`
```js
expand: function(e) { var t, n = typeof e === "string" ? e.split(" ") : [e], i = {}; for (t = 0; t < 4; t++) { i[r + m[t] + o] = n[t] || n[t - 2] || n[0] } return i } }; if (!et.test(r)) { ge.cssHooks[r + o].set = ft } }); var ht = /%20/g, gt = /\[\]$/, mt = /\r?\n/g, yt = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i, vt = /^(?:select|textarea)/i; ge.fn.extend({ serialize: function() { return ge.param(this.serializeArray()) }, serializeArray: function() { return this.map(function() { return this.elements ? ge.makeArray(this.elements) : this }).filter(function() { return this.name && !this.disabled && (this.checked || vt.te
```

### `contentSet`
```js
contentSet: function e(t, i) { if (i.processComponents) { o.process(n(i.content)) } } } }, scoreboardCalendarPicker: { require: "components/scoreboard/scoreboard-calendar-picker" }, scoreboardQueryParams: { require: "components/scoreboard-query-params" }, scoreboardVideoModal: { require: "components/scoreboard/scoreboard-video-modal" }, scrollbarArea: { require: "components/scrollbar-area" }, scrollingMarquee: { require: "components/scrolling-marquee" }, searchBar: { require: "components/search-bar" }, searchPlayer: { require: "components/search-player" }, searchPlayerV2: { require: "components/search-player-v2" }, searchSort: { require: "components/search-sort" }, segmentedControlTip: { req
```

### `remove`
```js
remove: function(e) { if (e.target === t) { this.destroy() } } }); this.document = c(t.style ? t.ownerDocument : t.document || t); this.window = c(this.document[0].defaultView || this.document[0].parentWindow) } this._create(); this._trigger("create", null, this._getCreateEventData()); this._init() }, _getCreateOptions: c.noop, _getCreateEventData: c.noop, _create: c.noop, _init: c.noop, destroy: function() { this._destroy(); this.element.unbind(this.eventNamespace).removeData(this.widgetName).removeData(this.widgetFullName).removeData(c.camelCase(this.widgetFullName)); this.widget().unbind(this.eventNamespace).removeAttr("aria-disabled").removeClass(this.widgetFullName + "-disabled " + "ui-
```

### `_hoverable`
```js
_hoverable: function(e) { this.hoverable = this.hoverable.add(e); this._on(e, { mouseenter: function(e) { c(e.currentTarget).addClass("ui-state-hover") }, mouseleave: function(e) { c(e.currentTarget).removeClass("ui-state-hover") } }) }, _focusable: function(e) { this.focusable = this.focusable.add(e); this._on(e, { focusin: function(e) { c(e.currentTarget).addClass("ui-state-focus") }, focusout: function(e) { c(e.currentTarget).removeClass("ui-state-focus") } }) }, _trigger: function(e, t, i) { var n, o, a = this.options[e]; i = i || {}; t = c.Event(t); t.type = (e === this.widgetEventPrefix ? e : this.widgetEventPrefix + e).toLowerCase(); t.target = this.element[0]; o = t.originalEvent; if
```

### `mouseenter`
```js
mouseenter: function(e) { c(e.currentTarget).addClass("ui-state-hover") }, mouseleave: function(e) { c(e.currentTarget).removeClass("ui-state-hover") } }) }, _focusable: function(e) { this.focusable = this.focusable.add(e); this._on(e, { focusin: function(e) { c(e.currentTarget).addClass("ui-state-focus") }, focusout: function(e) { c(e.currentTarget).removeClass("ui-state-focus") } }) }, _trigger: function(e, t, i) { var n, o, a = this.options[e]; i = i || {}; t = c.Event(t); t.type = (e === this.widgetEventPrefix ? e : this.widgetEventPrefix + e).toLowerCase(); t.target = this.element[0]; o = t.originalEvent; if (o) { for (n in o) { if (!(n in t)) { t[n] = o[n] } }
```

### `mouseleave`
```js
mouseleave: function(e) { c(e.currentTarget).removeClass("ui-state-hover") } }) }, _focusable: function(e) { this.focusable = this.focusable.add(e); this._on(e, { focusin: function(e) { c(e.currentTarget).addClass("ui-state-focus") }, focusout: function(e) { c(e.currentTarget).removeClass("ui-state-focus") } }) }, _trigger: function(e, t, i) { var n, o, a = this.options[e]; i = i || {}; t = c.Event(t); t.type = (e === this.widgetEventPrefix ? e : this.widgetEventPrefix + e).toLowerCase(); t.target = this.element[0]; o = t.originalEvent; if (o) { for (n in o) { if (!(n in t)) { t[n] = o[n] } } } this.element.trigger(t, i); return !(c.isFunction(a) && a.apply(this.element[0],
```

### `_focusable`
```js
_focusable: function(e) { this.focusable = this.focusable.add(e); this._on(e, { focusin: function(e) { c(e.currentTarget).addClass("ui-state-focus") }, focusout: function(e) { c(e.currentTarget).removeClass("ui-state-focus") } }) }, _trigger: function(e, t, i) { var n, o, a = this.options[e]; i = i || {}; t = c.Event(t); t.type = (e === this.widgetEventPrefix ? e : this.widgetEventPrefix + e).toLowerCase(); t.target = this.element[0]; o = t.originalEvent; if (o) { for (n in o) { if (!(n in t)) { t[n] = o[n] } } } this.element.trigger(t, i); return !(c.isFunction(a) && a.apply(this.element[0], [t].concat(i)) === false || t.isDefaultPrevented()) } }; c.each({ show: "fadeIn", hide: "fadeOut" 
```

### `focusin`
```js
focusin: function(e) { c(e.currentTarget).addClass("ui-state-focus") }, focusout: function(e) { c(e.currentTarget).removeClass("ui-state-focus") } }) }, _trigger: function(e, t, i) { var n, o, a = this.options[e]; i = i || {}; t = c.Event(t); t.type = (e === this.widgetEventPrefix ? e : this.widgetEventPrefix + e).toLowerCase(); t.target = this.element[0]; o = t.originalEvent; if (o) { for (n in o) { if (!(n in t)) { t[n] = o[n] } } } this.element.trigger(t, i); return !(c.isFunction(a) && a.apply(this.element[0], [t].concat(i)) === false || t.isDefaultPrevented()) } }; c.each({ show: "fadeIn", hide: "fadeOut" }, function(a, r) { c.Widget.prototype["_" + a] = function(t, e, i) { if (typeof e
```

### `focusout`
```js
focusout: function(e) { c(e.currentTarget).removeClass("ui-state-focus") } }) }, _trigger: function(e, t, i) { var n, o, a = this.options[e]; i = i || {}; t = c.Event(t); t.type = (e === this.widgetEventPrefix ? e : this.widgetEventPrefix + e).toLowerCase(); t.target = this.element[0]; o = t.originalEvent; if (o) { for (n in o) { if (!(n in t)) { t[n] = o[n] } } } this.element.trigger(t, i); return !(c.isFunction(a) && a.apply(this.element[0], [t].concat(i)) === false || t.isDefaultPrevented()) } }; c.each({ show: "fadeIn", hide: "fadeOut" }, function(a, r) { c.Widget.prototype["_" + a] = function(t, e, i) { if (typeof e === "string") { e = { effect: e } } var n, o = !e ? a : e === tru
```

### `Ot`
```js
Ot = function(e, t, i, o) { var n, a = arguments.length, r = a < 3 ? t : null === o ? o = Object.getOwnPropertyDescriptor(t, i) : o; if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) r = Reflect.decorate(e, t, i, o); else for (var s = e.length - 1; s >= 0; s--)(n = e[s]) && (r = (a < 3 ? n(r) : a > 3 ? n(t, i, r) : n(t, i)) || r); return a > 3 && r && Object.defineProperty(t, i, r), r }; class St extends bt { disconnectedCallback() { clearTimeout(this.blinkTimer) } render() { var e, t, i, o, n, a; return this.props ? (this.highlight && (this.blinkTimer = setTimeout((() => { this.highlight = !1 }), 1e3)), Ze` <div id="root" target="_blank" class=${At({highlight:this.hig
```

### `a`
```js
function a(e) { try { r(o.throw(e)) } catch (e) { t(e) } } function r(t) { var o; t.done ? e(t.value) : (o = t.value, o instanceof i ? o : new i((function(e) { e(o) }))).then(n, a) } r((o = o.apply(void 0, [])).next()) })) }(0, 0, void 0, (function*() { var i; yield new Promise((e => setTimeout(e, 0))); const o = document.querySelector(e), n = !!(null === (i = t.target) || void 0 === i ? void 0 : i.closest(e)); if (!o || n) return; const a = _i(o.shadowRoot || o, ".cbs-widget") || _i(o.shadowRoot || o, "sg-bet-button"); if (!a) return; const r = a.dataset.config; if (!r) return; let s; 
```

### `r`
```js
function r(t) { var o; t.done ? e(t.value) : (o = t.value, o instanceof i ? o : new i((function(e) { e(o) }))).then(n, a) } r((o = o.apply(void 0, [])).next()) })) }(0, 0, void 0, (function*() { var i; yield new Promise((e => setTimeout(e, 0))); const o = document.querySelector(e), n = !!(null === (i = t.target) || void 0 === i ? void 0 : i.closest(e)); if (!o || n) return; const a = _i(o.shadowRoot || o, ".cbs-widget") || _i(o.shadowRoot || o, "sg-bet-button"); if (!a) return; const r = a.dataset.config; if (!r) return; let s; try { s = JSON.parse(r) } catch (e) { return } const l = V(a, null == s ? void 0 : s.instanceId), 
```
