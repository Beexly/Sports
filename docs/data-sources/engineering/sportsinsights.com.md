# sportsinsights.com — engineering

App bundles beautified: **4**  
JSON endpoints captured: **0**  
Client functions passing filter: **34**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
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

### `cleanprogress`
```js
cleanprogress: function(e, t, n, o) { o.removeEventListener("progress", e.broadcastCallback), o.removeEventListener("timeupdate", e.broadcastCallback), e.rail && e.rail.remove() }, setProgressRail: function(e) { var t = this, n = void 0 !== e ? e.detail.target || e.target : t.media, o = null; n && n.buffered && 0 < n.buffered.length && n.buffered.end && t.getDuration() ? o = n.buffered.end(n.buffered.length - 1) / t.getDuration() : n && void 0 !== n.bytesTotal && 0 < n.bytesTotal && void 0 !== n.bufferedBytes ? o = n.bufferedBytes / n.bytesTotal : e && e.lengthComputable && 0 !== e.total && (o = e.loaded / e.total), null !== o && (o = Math.min(1, Math.max(0, o)), t.loaded && t.setTransformSt
```

### `setProgressRail`
```js
setProgressRail: function(e) { var t = this, n = void 0 !== e ? e.detail.target || e.target : t.media, o = null; n && n.buffered && 0 < n.buffered.length && n.buffered.end && t.getDuration() ? o = n.buffered.end(n.buffered.length - 1) / t.getDuration() : n && void 0 !== n.bytesTotal && 0 < n.bytesTotal && void 0 !== n.bufferedBytes ? o = n.bufferedBytes / n.bytesTotal : e && e.lengthComputable && 0 !== e.total && (o = e.loaded / e.total), null !== o && (o = Math.min(1, Math.max(0, o)), t.loaded && t.setTransformStyle(t.loaded, "scaleX(" + o + ")")) }, setCurrentRailHandle: function(e) { this.setCurrentRailMain(this, e) }, setCurrentRail: function() { this.setCurrentRailMain(this) }, setCurre
```

### `parse`
```js
parse: function(e) { for (var t = e.split(/\r?\n/), n = [], o = void 0, i = void 0, r = void 0, a = 0, s = t.length; a < s; a++) { if ((o = this.pattern.exec(t[a])) && a < t.length) { for (0 <= a - 1 && "" !== t[a - 1] && (r = t[a - 1]), i = t[++a], a++; "" !== t[a] && a < t.length;) i = i + "\n" + t[a], a++; i = null === i ? "" : i.trim().replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi, "<a href='$1' target='_blank'>$1</a>"), n.push({ identifier: r, start: 0 === (0, m.convertSMPTEtoSeconds)(o[1]) ? .2 : (0, m.convertSMPTEtoSeconds)(o[1]), stop: (0, m.convertSMPTEtoSeconds)(o[3]), text: i, settings: o[5] }) } r = "" } return n } }, 
```

### `l`
```js
function l(e) { return Object.getOwnPropertyNames(e).length <= 0 } function d(e, n) { var o = /^((after|before)print|(before)?unload|hashchange|message|o(ff|n)line|page(hide|show)|popstate|resize|storage)\b/, i = { d: [], w: [] }; return (e || "").split(" ").forEach(function(e) { var t = e + (n ? "." + n : ""); t.startsWith(".") ? (i.d.push(t), i.w.push(t)) : i[o.test(e) ? "w" : "d"].push(t) }), i.d = i.d.join(" "), i.w = i.w.join(" "), i } function u(e, t) { if ("string" != typeof e) throw new Error("Event name must be a string"); var n = e.match(/([a-z]+\.([a-z]+))/i), o = { target: t }; return null !== n && (e = n[1], o.namespace = n[2]), new window.CustomEvent(e, { detail: o }) } functio
```

### `d`
```js
function d(e, n) { var o = /^((after|before)print|(before)?unload|hashchange|message|o(ff|n)line|page(hide|show)|popstate|resize|storage)\b/, i = { d: [], w: [] }; return (e || "").split(" ").forEach(function(e) { var t = e + (n ? "." + n : ""); t.startsWith(".") ? (i.d.push(t), i.w.push(t)) : i[o.test(e) ? "w" : "d"].push(t) }), i.d = i.d.join(" "), i.w = i.w.join(" "), i } function u(e, t) { if ("string" != typeof e) throw new Error("Event name must be a string"); var n = e.match(/([a-z]+\.([a-z]+))/i), o = { target: t }; return null !== n && (e = n[1], o.namespace = n[2]), new window.CustomEvent(e, { detail: o }) } function c(e, t) { return !!(e && t && 2 & e.compareDocumentPosition(t)) }
```

### `u`
```js
function u(e, t) { if ("string" != typeof e) throw new Error("Event name must be a string"); var n = e.match(/([a-z]+\.([a-z]+))/i), o = { target: t }; return null !== n && (e = n[1], o.namespace = n[2]), new window.CustomEvent(e, { detail: o }) } function c(e, t) { return !!(e && t && 2 & e.compareDocumentPosition(t)) } function f(e) { return "string" == typeof e } r.default.Utils = r.default.Utils || {}, r.default.Utils.escapeHTML = a, r.default.Utils.debounce = s, r.default.Utils.isObjectEmpty = l, r.default.Utils.splitEvents = d, r.default.Utils.createEvent = u, r.default.Utils.isNodeAfter = c, r.default.Utils.isString = f }, { 7: 7 }], 28: [function(e, t, n) { "use strict"; Object.defin
```

### `stop`
```js
stop = function() { this._core.trigger("stop", null, "video"), this._playing.find(".owl-video-frame").remove(), this._playing.removeClass("owl-video-playing"), this._playing = null }, d.prototype.play = function(b) { this._core.trigger("play", null, "video"), this._playing && this.stop(); var c, d, e = a(b.target || b.srcElement), f = e.closest("." + this._core.settings.itemClass), g = this._videos[f.attr("data-video")], h = g.width || "100%", i = g.height || this._core.$stage.height(); "youtube" === g.type ? c = '<iframe width="' + h + '" height="' + i + '" src="http://www.youtube.com/embed/' + g.id + "?autoplay=1&v=" + g.id + '" frameborder="0" allowfullscreen></iframe>' : "vimeo" === g.ty
```

### `play`
```js
play = function(b) { this._core.trigger("play", null, "video"), this._playing && this.stop(); var c, d, e = a(b.target || b.srcElement), f = e.closest("." + this._core.settings.itemClass), g = this._videos[f.attr("data-video")], h = g.width || "100%", i = g.height || this._core.$stage.height(); "youtube" === g.type ? c = '<iframe width="' + h + '" height="' + i + '" src="http://www.youtube.com/embed/' + g.id + "?autoplay=1&v=" + g.id + '" frameborder="0" allowfullscreen></iframe>' : "vimeo" === g.type && (c = '<iframe src="http://player.vimeo.com/video/' + g.id + '?autoplay=1" width="' + h + '" height="' + i + '" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></ifra
```

### `j`
```js
function j(c) { var d = "keyup-change-value"; c.on("keydown", function() { a.data(c, d) === b && a.data(c, d, c.val()) }), c.on("keyup", function() { var e = a.data(c, d); e !== b && c.val() !== e && (a.removeData(c, d), c.trigger("keyup-change")) }) } function k(c) { c.on("mousemove", function(c) { var d = L; (d === b || d.x !== c.pageX || d.y !== c.pageY) && a(c.target).trigger("mousemove-filtered", c) }) } function l(a, c, d) { d = d || b; var e; return function() { var b = arguments; window.clearTimeout(e), e = window.setTimeout(function() { c.apply(d, b) }, a) } } function m(a, b) { var c = l(a, function(a) { b.trigger("scroll-debounced", a) }); b.on("scroll", function(a) { e(a.target, 
```

### `k`
```js
function k(c) { c.on("mousemove", function(c) { var d = L; (d === b || d.x !== c.pageX || d.y !== c.pageY) && a(c.target).trigger("mousemove-filtered", c) }) } function l(a, c, d) { d = d || b; var e; return function() { var b = arguments; window.clearTimeout(e), e = window.setTimeout(function() { c.apply(d, b) }, a) } } function m(a, b) { var c = l(a, function(a) { b.trigger("scroll-debounced", a) }); b.on("scroll", function(a) { e(a.target, b.get()) >= 0 && c(a) }) } function n(a) { a[0] !== document.activeElement && window.setTimeout(function() { var b, c = a[0], d = a.val().length; a.focus(); var e = c.offsetWidth > 0 || c.offsetHeight > 0; e && c === document.activeElement && (c.setSel
```

### `r`
```js
function r(a, b, c, d) { t._bind(a, b, function(d) { d = d ? d : window.event; var e = { original: d, target: d.target || d.srcElement, type: "wheel", deltaMode: "MozMousePixelScroll" == d.type ? 0 : 1, deltaX: 0, deltaZ: 0, preventDefault: function() { return d.preventDefault ? d.preventDefault() : d.returnValue = !1, !1 }, stopImmediatePropagation: function() { d.stopImmediatePropagation ? d.stopImmediatePropagation() : d.cancelBubble = !0 } }; return "mousewheel" == b ? (e.deltaY = -.025 * d.wheelDelta, d.wheelDeltaX && (e.deltaX = -.025 * d.wheelDeltaX)) : e.deltaY = d.detail, c.call(a, e) }, d) } function s(a, b, c) { var d, e; if (0 == a.deltaMode ? (d 
```

### `ontouchstart`
```js
ontouchstart = function(b) { if (b.pointerType && 2 != b.pointerType && "touch" != b.pointerType) return !1; if (t.hasmoving = !1, !t.railslocked) { var c; if (v.hasmstouch) for (c = b.target ? b.target : !1; c;) { var d = a(c).getNiceScroll(); if (0 < d.length && d[0].me == t.me) break; if (0 < d.length) return !1; if ("DIV" == c.nodeName && c.id == t.id) break; c = c.parentNode ? c.parentNode : !1 } if (t.cancelScroll(), (c = t.getTarget(b)) && /INPUT/i.test(c.nodeName) && /range/i.test(c.type)) return t.stopPropagation(b); if (!("clientX" in b) && "changedTouches" in b && (b.clientX = b.changedTouches[0].clientX, b.clientY = b.changedT
```

### `render`
```js
render = function(a, b, c) { var d, e = this._first; for (this._totalTime = this._time = this._rawPrevTime = a; e;) d = e._next, (e._active || a >= e._startTime && !e._paused) && (e._reversed ? e.render((e._dirty ? e.totalDuration() : e._totalDuration) - (a - e._startTime) * e._timeScale, b, c) : e.render((a - e._startTime) * e._timeScale, b, c)), e = d }, f.rawTime = function() { return h || g.wake(), this._totalTime }; var F = r("TweenLite", function(b, c, d) { if (C.call(this, c, d), this.render = F.prototype.render, null == b) throw "Cannot tween a null target."; this.target = b = "string" != typeof b ? b : F.selector(b) || b; var e, f, g, h = b.jquery || b.length && b !== a && b[0] && (
```

### `addEvent`
```js
addEvent = function(b, c, d) { var e = function(b) { return b = b || a.event, b.target || (b.target = b.srcElement), b.preventDefault || (b.preventDefault = function() { b.returnValue = !1 }), d.call(this, b) }; c = c.split(" "); for (var f = 0, g = c.length; g > f; f++) b.addEventListener ? b.addEventListener(c[f], d, !1) : b.attachEvent("on" + c[f], e) }, sa = function() { var a = ea.getScrollTop(); Aa = 0, ia && !Ja && (f.style.height = "auto"), V(), ia && !Ja && (f.style.height = Aa + e.clientHeight + "px"), Ja ? ea.setScrollTop(i.min(ea.getScrollTop(), Aa)) : ea.setScrollTop(a, !0), oa = !0 }, ta = function() { var a = ga && ga.offsetHeight || 0, b = i.max(a, f.scrollHeight, f.offsetHei
```

### `e`
```js
e = function(b) { return b = b || a.event, b.target || (b.target = b.srcElement), b.preventDefault || (b.preventDefault = function() { b.returnValue = !1 }), d.call(this, b) }; c = c.split(" "); for (var f = 0, g = c.length; g > f; f++) b.addEventListener ? b.addEventListener(c[f], d, !1) : b.attachEvent("on" + c[f], e) }, sa = function() { var a = ea.getScrollTop(); Aa = 0, ia && !Ja && (f.style.height = "auto"), V(), ia && !Ja && (f.style.height = Aa + e.clientHeight + "px"), Ja ? ea.setScrollTop(i.min(ea.getScrollTop(), Aa)) : ea.setScrollTop(a, !0), oa = !0 }, ta = function() { var a = ga && ga.offsetHeight || 0, b = i.max(a, f.scrollHeight, f.offsetHeight, e.scrollHeight, e.offsetHeight
```

### `preventClick`
```js
preventClick = function(b) { b.preventDefault ? b.preventDefault() : b.returnValue = !1, b.stopPropagation && b.stopPropagation(), a(b.target).off("click.preventClick") }, e.prototype.getTransformProperty = function() { var a, c; return a = b.getComputedStyle(this.$stage.get(0), null).getPropertyValue(this.vendorName + "transform"), a = a.replace(/matrix(3d)?\(|\)/g, "").split(","), c = 16 === a.length, c !== !0 ? a[4] : a[12] }, e.prototype.closest = function(b) { var c = -1, d = 30, e = this.width(), f = this.coordinates(); return this.settings.freeDrag || a.each(f, a.proxy(function(a, g) { return b > g - d && g + d > b ? c = a : this.op(b, "<", g) && this.op(b, ">", f[a + 1] || g - e) && 
```

### `fetch`
```js
fetch = function(a, b) { var c = a.attr("data-vimeo-id") ? "vimeo" : "youtube", d = a.attr("data-vimeo-id") || a.attr("data-youtube-id"), e = a.attr("data-width") || this._core.settings.videoWidth, f = a.attr("data-height") || this._core.settings.videoHeight, g = a.attr("href"); if (!g) throw new Error("Missing video URL."); if (d = g.match(/(http:|https:|)\/\/(player.|www.)?(vimeo\.com|youtu(be\.com|\.be|be\.googleapis\.com))\/(video\/|embed\/|watch\?v=|v\/)?([A-Za-z0-9._%-]*)(\&\S+)?/), d[3].indexOf("youtu") > -1) c = "youtube"; else { if (!(d[3].indexOf("vimeo") > -1)) throw new Error("Video URL not supported."); c = "vimeo" } d = d[6], this._videos[g] = { type: c, id: d, width: e, height
```

### `success`
```js
success: function(a) { f = a[0].thumbnail_large, l(f) } })) }, d.prototype.stop = function() { this._core.trigger("stop", null, "video"), this._playing.find(".owl-video-frame").remove(), this._playing.removeClass("owl-video-playing"), this._playing = null }, d.prototype.play = function(b) { this._core.trigger("play", null, "video"), this._playing && this.stop(); var c, d, e = a(b.target || b.srcElement), f = e.closest("." + this._core.settings.itemClass), g = this._videos[f.attr("data-video")], h = g.width || "100%", i = g.height || this._core.$stage.height(); "youtube" === g.type ? c = '<iframe width="' + h + '" height="' + i + '" src="http://www.youtube.com/embed/' + g.id + "?autoplay=1&v=
```

### `swap`
```js
swap = function() { if (1 === this.core.settings.items && this.core.support3d) { this.core.speed(0); var b, c = a.proxy(this.clear, this), d = this.core.$stage.children().eq(this.previous), e = this.core.$stage.children().eq(this.next), f = this.core.settings.animateIn, g = this.core.settings.animateOut; this.core.current() !== this.previous && (g && (b = this.core.coordinates(this.previous) - this.core.coordinates(this.next), d.css({ left: b + "px" }).addClass("animated owl-animated-out").addClass(g).one("webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend", c)), f && e.addClass("animated owl-animated-in").addClass(f).one("webkitAnimationEnd mozAnimationEnd MSAnimat
```

### `clear`
```js
clear = function(b) { a(b.target).css({ left: "" }).removeClass("animated owl-animated-out owl-animated-in").removeClass(this.core.settings.animateIn).removeClass(this.core.settings.animateOut), this.core.transitionEnd() }, e.prototype.destroy = function() { var a, b; for (a in this.handlers) this.core.$element.off(a, this.handlers[a]); for (b in Object.getOwnPropertyNames(this)) "function" != typeof this[b] && (this[b] = null); }, a.fn.owlCarousel.Constructor.Plugins.Animate = e }(window.Zepto || window.jQuery, window, document), function(a, b, c) { var d = function(b) { this.core = b, this.core.options = a.extend({}, d.Defaults, this.core.options), this.handlers = { "translated.owl.carouse
```

### `h`
```js
function h(a, b, c) { var d, e, f; if (null === a || a.length < 1) return []; for (d = a.split(b), e = 0, f = d.length; f > e; e += 1) d[e] = c(d[e]); return d } function i(a) { return a.outerWidth(!1) - a.width() } function j(c) { var d = "keyup-change-value"; c.on("keydown", function() { a.data(c, d) === b && a.data(c, d, c.val()) }), c.on("keyup", function() { var e = a.data(c, d); e !== b && c.val() !== e && (a.removeData(c, d), c.trigger("keyup-change")) }) } function k(c) { c.on("mousemove", function(c) { var d = L; (d === b || d.x !== c.pageX || d.y !== c.pageY) && a(c.target).trigger("mousemove-filtered", c) }) } function l(a, c, d) { d = d || b; var e; return function() { var b = ar
```

### `i`
```js
function i(a) { return a.outerWidth(!1) - a.width() } function j(c) { var d = "keyup-change-value"; c.on("keydown", function() { a.data(c, d) === b && a.data(c, d, c.val()) }), c.on("keyup", function() { var e = a.data(c, d); e !== b && c.val() !== e && (a.removeData(c, d), c.trigger("keyup-change")) }) } function k(c) { c.on("mousemove", function(c) { var d = L; (d === b || d.x !== c.pageX || d.y !== c.pageY) && a(c.target).trigger("mousemove-filtered", c) }) } function l(a, c, d) { d = d || b; var e; return function() { var b = arguments; window.clearTimeout(e), e = window.setTimeout(function() { c.apply(d, b) }, a) } } function m(a, b) { var c = l(a, function(a) { b.trigger("scroll-deboun
```

### `m`
```js
function m(a, b) { var c = l(a, function(a) { b.trigger("scroll-debounced", a) }); b.on("scroll", function(a) { e(a.target, b.get()) >= 0 && c(a) }) } function n(a) { a[0] !== document.activeElement && window.setTimeout(function() { var b, c = a[0], d = a.val().length; a.focus(); var e = c.offsetWidth > 0 || c.offsetHeight > 0; e && c === document.activeElement && (c.setSelectionRange ? c.setSelectionRange(d, d) : c.createTextRange && (b = c.createTextRange(), b.collapse(!1), b.select())) }, 0) } function o(b) { b = a(b)[0]; var c = 0, d = 0; if ("selectionStart" in b) c = b.selectionStart, d = b.selectionEnd - c; else if ("selection" in document) { b.focus(); var e = document.selection.crea
```

### `removeHighlight`
```js
removeHighlight: function() { this.results.find(".select2-highlighted").removeClass("select2-highlighted") }, touchMoved: function() { this._touchMoved = !0 }, clearTouchMoved: function() { this._touchMoved = !1 }, countSelectableResults: function() { return this.findHighlightableChoices().length }, highlightUnderEvent: function(b) { var c = a(b.target).closest(".select2-result-selectable"); if (c.length > 0 && !c.is(".select2-highlighted")) { var d = this.findHighlightableChoices(); this.highlight(d.index(c)) } else 0 == c.length && this.removeHighlight() }, loadMoreIfNeeded: function() { var a, b = this.results, c = b.find("li.select2-more-results"), d = this.resultsPage + 1, 
```

### `touchMoved`
```js
touchMoved: function() { this._touchMoved = !0 }, clearTouchMoved: function() { this._touchMoved = !1 }, countSelectableResults: function() { return this.findHighlightableChoices().length }, highlightUnderEvent: function(b) { var c = a(b.target).closest(".select2-result-selectable"); if (c.length > 0 && !c.is(".select2-highlighted")) { var d = this.findHighlightableChoices(); this.highlight(d.index(c)) } else 0 == c.length && this.removeHighlight() }, loadMoreIfNeeded: function() { var a, b = this.results, c = b.find("li.select2-more-results"), d = this.resultsPage + 1, e = this, f = this.search.val(), g = this.context; 0 !== c.length && (a = c.offset().top - b.of
```

### `clearTouchMoved`
```js
clearTouchMoved: function() { this._touchMoved = !1 }, countSelectableResults: function() { return this.findHighlightableChoices().length }, highlightUnderEvent: function(b) { var c = a(b.target).closest(".select2-result-selectable"); if (c.length > 0 && !c.is(".select2-highlighted")) { var d = this.findHighlightableChoices(); this.highlight(d.index(c)) } else 0 == c.length && this.removeHighlight() }, loadMoreIfNeeded: function() { var a, b = this.results, c = b.find("li.select2-more-results"), d = this.resultsPage + 1, e = this, f = this.search.val(), g = this.context; 0 !== c.length && (a = c.offset().top - b.offset().top - b.height(), a <= this.opts.loadMorePadding && (c.addClass("sele
```
