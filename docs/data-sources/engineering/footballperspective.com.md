# footballperspective.com — engineering

App bundles beautified: **4**  
JSON endpoints captured: **0**  
Client functions passing filter: **20**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
```

### `destroy`
```js
destroy = function() { this.srcEl = this.targetEl = null }, t.exports = n }, function(t, e) { t.exports = { BROADCAST: "twitter-broadcast", DM_BUTTON: "twitter-dm-button", FOLLOW_BUTTON: "twitter-follow-button", HASHTAG_BUTTON: "twitter-hashtag-button", MENTION_BUTTON: "twitter-mention-button", MOMENT: "twitter-moment", PERISCOPE: "periscope-on-air", SHARE_BUTTON: "twitter-share-button", TIMELINE: "twitter-timeline", TWEET: "twitter-tweet" } }, function(t, e, n) { var r = n(6), i = n(19), o = n(50), s = n(34), a = n(5), u = n(0); t.exports = function(t, e, n) { var c; return t = t || [], e = e || {}, c = "ƒ(" + t.join(", ") + ", target, [options]);", function() { var d, f, l, h, p = Array.pr
```

### `getActiveExperimentDataString`
```js
getActiveExperimentDataString: function() { return u().then(function(t) { return s(t) }) }, getExperimentKeys: function() { return u().then(function(t) { return Object.keys(t) }) }, load: function() { r.load() } } }, function(t, e, n) { var r = n(10), i = {}, o = -1, s = {}; function a(t) { var e = t.getAttribute("data-twitter-event-id"); return e || (t.setAttribute("data-twitter-event-id", ++o), o) } function u(t, e, n) { var r = 0, i = t && t.length || 0; for (r = 0; r < i; r++) if (t[r].call(e, n, e), n.ceaseImmediately) return !1 } function c(t, e, n) { for (var i = n || t.target || t.srcElement, o = r.list(i).map(function(t) { return "." + t }).concat(i.tagName), s = 0, a = o.length; s 
```

### `getExperimentKeys`
```js
getExperimentKeys: function() { return u().then(function(t) { return Object.keys(t) }) }, load: function() { r.load() } } }, function(t, e, n) { var r = n(10), i = {}, o = -1, s = {}; function a(t) { var e = t.getAttribute("data-twitter-event-id"); return e || (t.setAttribute("data-twitter-event-id", ++o), o) } function u(t, e, n) { var r = 0, i = t && t.length || 0; for (r = 0; r < i; r++) if (t[r].call(e, n, e), n.ceaseImmediately) return !1 } function c(t, e, n) { for (var i = n || t.target || t.srcElement, o = r.list(i).map(function(t) { return "." + t }).concat(i.tagName), s = 0, a = o.length; s < a; s++) if (!1 === u(e[o[s]], i, t)) return; t.cease || i !== this && c.call(this, t, e, i
```

### `load`
```js
load: function() { r.load() } } }, function(t, e, n) { var r = n(10), i = {}, o = -1, s = {}; function a(t) { var e = t.getAttribute("data-twitter-event-id"); return e || (t.setAttribute("data-twitter-event-id", ++o), o) } function u(t, e, n) { var r = 0, i = t && t.length || 0; for (r = 0; r < i; r++) if (t[r].call(e, n, e), n.ceaseImmediately) return !1 } function c(t, e, n) { for (var i = n || t.target || t.srcElement, o = r.list(i).map(function(t) { return "." + t }).concat(i.tagName), s = 0, a = o.length; s < a; s++) if (!1 === u(e[o[s]], i, t)) return; t.cease || i !== this && c.call(this, t, e, i.parentElement || i.parentNode) } function d(t, e, n, r) { function i(r) { c.call(t, r, n[
```

### `a`
```js
function a(t) { var e = t.getAttribute("data-twitter-event-id"); return e || (t.setAttribute("data-twitter-event-id", ++o), o) } function u(t, e, n) { var r = 0, i = t && t.length || 0; for (r = 0; r < i; r++) if (t[r].call(e, n, e), n.ceaseImmediately) return !1 } function c(t, e, n) { for (var i = n || t.target || t.srcElement, o = r.list(i).map(function(t) { return "." + t }).concat(i.tagName), s = 0, a = o.length; s < a; s++) if (!1 === u(e[o[s]], i, t)) return; t.cease || i !== this && c.call(this, t, e, i.parentElement || i.parentNode) } function d(t, e, n, r) { function i(r) { c.call(t, r, n[e]) }! function(t, e, n, r) { t.id && (s[t.id] = s[t.id] || [], s[t.id].push({ el: t, listener
```

### `v`
```js
function v(t, e, n, s) { var u; n && a.isObject(t) && a.isObject(e) && (r.log(t, e), u = o.flattenClientEventPayload(t, e), s = a.aug({}, s, { l: o.stringify(u) }), u.dnt && (s.dnt = 1), w(i.url(n, s))) } function g(t) { return l.push(t), l } function w(t) { return (new Image).src = t } t.exports = { canFlushOneItem: function(t) { var e = o.stringify(t), n = encodeURIComponent(e).length + 3; return p + n < f }, _enqueueRawObject: g, scribe: v, clientEvent: m, enqueueClientEvent: function(t, e, n, r) { var i = !a.isObject(t), s = !!e && !a.isObject(e); if (!i && !s) return g(o.flattenClientEventPayload(o.formatClientEventNamespace(t), o.formatClientEventData(e, n, r))) }, interaction: functio
```

### `g`
```js
function g(t) { return l.push(t), l } function w(t) { return (new Image).src = t } t.exports = { canFlushOneItem: function(t) { var e = o.stringify(t), n = encodeURIComponent(e).length + 3; return p + n < f }, _enqueueRawObject: g, scribe: v, clientEvent: m, enqueueClientEvent: function(t, e, n, r) { var i = !a.isObject(t), s = !!e && !a.isObject(e); if (!i && !s) return g(o.flattenClientEventPayload(o.formatClientEventNamespace(t), o.formatClientEventData(e, n, r))) }, interaction: function(t, e, n, r) { var i = o.extractTermsFromDOM(t.target || t.srcElement); return i.action = r || "click", m(i, e, n) }, placePixel: w } }, function(t) { t.exports = { tweetButtonHtmlPath: "/widgets/tweet_bu
```

### `w`
```js
function w(t) { return (new Image).src = t } t.exports = { canFlushOneItem: function(t) { var e = o.stringify(t), n = encodeURIComponent(e).length + 3; return p + n < f }, _enqueueRawObject: g, scribe: v, clientEvent: m, enqueueClientEvent: function(t, e, n, r) { var i = !a.isObject(t), s = !!e && !a.isObject(e); if (!i && !s) return g(o.flattenClientEventPayload(o.formatClientEventNamespace(t), o.formatClientEventData(e, n, r))) }, interaction: function(t, e, n, r) { var i = o.extractTermsFromDOM(t.target || t.srcElement); return i.action = r || "click", m(i, e, n) }, placePixel: w } }, function(t) { t.exports = { tweetButtonHtmlPath: "/widgets/tweet_button.1227a5674072e080ffb1ba14ac0c1079.
```

### `canFlushOneItem`
```js
canFlushOneItem: function(t) { var e = o.stringify(t), n = encodeURIComponent(e).length + 3; return p + n < f }, _enqueueRawObject: g, scribe: v, clientEvent: m, enqueueClientEvent: function(t, e, n, r) { var i = !a.isObject(t), s = !!e && !a.isObject(e); if (!i && !s) return g(o.flattenClientEventPayload(o.formatClientEventNamespace(t), o.formatClientEventData(e, n, r))) }, interaction: function(t, e, n, r) { var i = o.extractTermsFromDOM(t.target || t.srcElement); return i.action = r || "click", m(i, e, n) }, placePixel: w } }, function(t) { t.exports = { tweetButtonHtmlPath: "/widgets/tweet_button.1227a5674072e080ffb1ba14ac0c1079.{{lang}}.html", followButtonHtmlPath: "/widgets/follow_butt
```

### `enqueueClientEvent`
```js
enqueueClientEvent: function(t, e, n, r) { var i = !a.isObject(t), s = !!e && !a.isObject(e); if (!i && !s) return g(o.flattenClientEventPayload(o.formatClientEventNamespace(t), o.formatClientEventData(e, n, r))) }, interaction: function(t, e, n, r) { var i = o.extractTermsFromDOM(t.target || t.srcElement); return i.action = r || "click", m(i, e, n) }, placePixel: w } }, function(t) { t.exports = { tweetButtonHtmlPath: "/widgets/tweet_button.1227a5674072e080ffb1ba14ac0c1079.{{lang}}.html", followButtonHtmlPath: "/widgets/follow_button.1227a5674072e080ffb1ba14ac0c1079.{{lang}}.html", hubHtmlPath: "/widgets/hub.html", widgetIframeHtmlPath: "/widgets/widget_iframe.1227a5674072e080ffb1ba14ac0c10
```

### `interaction`
```js
interaction: function(t, e, n, r) { var i = o.extractTermsFromDOM(t.target || t.srcElement); return i.action = r || "click", m(i, e, n) }, placePixel: w } }, function(t) { t.exports = { tweetButtonHtmlPath: "/widgets/tweet_button.1227a5674072e080ffb1ba14ac0c1079.{{lang}}.html", followButtonHtmlPath: "/widgets/follow_button.1227a5674072e080ffb1ba14ac0c1079.{{lang}}.html", hubHtmlPath: "/widgets/hub.html", widgetIframeHtmlPath: "/widgets/widget_iframe.1227a5674072e080ffb1ba14ac0c1079.html", resourceBaseUrl: "https://platform.twitter.com" } }, function(t, e, n) { var r = n(3), i = n(8), o = n(4); function s(t, e) { var n, r; return e = e || i, /^https?:\/\//.test(t) ? t : /^\/\//.test(t) ? e.pr
```

### `x`
```js
function x() { var t = o.createElement("form"), e = o.createElement("input"), n = o.createElement("input"); return b++, t.action = h.CLIENT_EVENT_ENDPOINT, t.method = "POST", t.target = w + b, t.id = y + b, e.type = "hidden", e.name = "dnt", e.value = c.enabled(), n.type = "hidden", n.name = "tfw_redirect", n.value = h.RUFOUS_REDIRECT, t.appendChild(e), t.appendChild(n), t } function T() { var t = w + b; return u({ id: t, name: t, width: 0, height: 0, border: 0 }, { display: "none" }, o.doc) } t.exports = { clientEvent: function(t, e, n, i) { (function(t, e) { var n = !p.isObject(t), r = !!e && !p.isObject(e), i = n || r; return i })(t, e) || (v && v(arguments), E.promise.then(function() { !
```

### `t`
```js
t = function(t) { var e = g.left - h.left, i = e + d - l, n = g.top - h.top, o = n + p - a, s = { target: { element: v, left: g.left, top: g.top, width: d, height: p }, element: { element: r, left: h.left, top: h.top, width: l, height: a }, horizontal: i < 0 ? "left" : 0 < e ? "right" : "center", vertical: o < 0 ? "top" : 0 < n ? "bottom" : "middle" }; d < l && C(e + i) < d && (s.horizontal = "center"), p < a && C(n + o) < p && (s.vertical = "middle"), W(C(e), C(i)) > W(C(n), C(o)) ? s.important = "horizontal" : s.important = "vertical", f.using.call(this, t, s) 
```

### `_hoverable`
```js
_hoverable: function(t) { this.hoverable = this.hoverable.add(t), this._on(t, { mouseenter: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-hover") }, mouseleave: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-hover") } }) }, _focusable: function(t) { this.focusable = this.focusable.add(t), this._on(t, { focusin: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-focus") }, focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase
```

### `mouseenter`
```js
mouseenter: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-hover") }, mouseleave: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-hover") } }) }, _focusable: function(t) { this.focusable = this.focusable.add(t), this._on(t, { focusin: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-focus") }, focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), e.target = this.element[0], o = e.originalEvent) for (n in o) n in e || (e[n
```

### `mouseleave`
```js
mouseleave: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-hover") } }) }, _focusable: function(t) { this.focusable = this.focusable.add(t), this._on(t, { focusin: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-focus") }, focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), e.target = this.element[0], o = e.originalEvent) for (n in o) n in e || (e[n] = o[n]); return this.element.trigger(e, i), !("function" == typeof s && !1 === s.apply
```

### `_focusable`
```js
_focusable: function(t) { this.focusable = this.focusable.add(t), this._on(t, { focusin: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-focus") }, focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), e.target = this.element[0], o = e.originalEvent) for (n in o) n in e || (e[n] = o[n]); return this.element.trigger(e, i), !("function" == typeof s && !1 === s.apply(this.element[0], [e].concat(i)) || e.isDefaultPrevented()) } }, x.each({ show: "fadeIn", hide: 
```

### `focusin`
```js
focusin: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-focus") }, focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), e.target = this.element[0], o = e.originalEvent) for (n in o) n in e || (e[n] = o[n]); return this.element.trigger(e, i), !("function" == typeof s && !1 === s.apply(this.element[0], [e].concat(i)) || e.isDefaultPrevented()) } }, x.each({ show: "fadeIn", hide: "fadeOut" }, function(s, r) { x.Widget.prototype["_" + s] = function(e, t, i) { 
```

### `focusout`
```js
focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), e.target = this.element[0], o = e.originalEvent) for (n in o) n in e || (e[n] = o[n]); return this.element.trigger(e, i), !("function" == typeof s && !1 === s.apply(this.element[0], [e].concat(i)) || e.isDefaultPrevented()) } }, x.each({ show: "fadeIn", hide: "fadeOut" }, function(s, r) { x.Widget.prototype["_" + s] = function(e, t, i) { var n, o = (t = "string" == typeof t ? { effect: t } : t) ? !0 !== t && "number" != t
```
