# bookmaker.eu — engineering

App bundles beautified: **4**  
JSON endpoints captured: **0**  
Client functions passing filter: **14**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(n, r, i, a) { var s, u, l, c, p, f, d, h = [i || o], g = y.call(n, "type") ? n.type : n, m = y.call(n, "namespace") ? n.namespace.split(".") : []; if (l = f = i = i || o, 3 !== i.nodeType && 8 !== i.nodeType && !nt.test(g + b.event.triggered) && (g.indexOf(".") >= 0 && (m = g.split("."), g = m.shift(), m.sort()), u = 0 > g.indexOf(":") && "on" + g, n = n[b.expando] ? n : new b.Event(g, "object" == typeof n && n), n.isTrigger = !0, n.namespace = m.join("."), n.namespace_re = n.namespace ? RegExp("(^|\\.)" + m.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, n.result = t, n.target || (n.target = i), r = null == r ? [n] : b.makeArray(r, [n]), p = b.event.special[g] || {}, a || !p.tr
```

### `play`
```js
play: function(e) { var t = function() { clearTimeout(s.player.timer) }, a = function() { t(), s.current && s.player.isActive && (s.player.timer = setTimeout(s.next, s.current.playSpeed)) }, n = function() { t(), o.unbind(".player"), s.player.isActive = !1, s.trigger("onPlayEnd") }; !0 === e || !s.player.isActive && !1 !== e ? s.current && (s.current.loop || s.current.index < s.group.length - 1) && (s.player.isActive = !0, o.bind({ "onCancel.player beforeClose.player": n, "onUpdate.player": a, "beforeLoad.player": t }), a(), s.trigger("onPlayStart")) : n() }, next: function(e) { var t = s.current; t && (p(e) || (e = t.direction.next), s.jumpto(t.index + 1, e, "next")) }, prev: function(e) { 
```

### `t`
```js
t = function() { clearTimeout(s.player.timer) }, a = function() { t(), s.current && s.player.isActive && (s.player.timer = setTimeout(s.next, s.current.playSpeed)) }, n = function() { t(), o.unbind(".player"), s.player.isActive = !1, s.trigger("onPlayEnd") }; !0 === e || !s.player.isActive && !1 !== e ? s.current && (s.current.loop || s.current.index < s.group.length - 1) && (s.player.isActive = !0, o.bind({ "onCancel.player beforeClose.player": n, "onUpdate.player": a, "beforeLoad.player": t }), a(), s.trigger("onPlayStart")) : n() }, next: function(e) { var t = s.current; t && (p(e) || (e = t.direction.next), s.jumpto(t.index + 1, e, "next")) }, prev: function(e) { var t = s.current; t && 
```

### `a`
```js
a = function() { t(), s.current && s.player.isActive && (s.player.timer = setTimeout(s.next, s.current.playSpeed)) }, n = function() { t(), o.unbind(".player"), s.player.isActive = !1, s.trigger("onPlayEnd") }; !0 === e || !s.player.isActive && !1 !== e ? s.current && (s.current.loop || s.current.index < s.group.length - 1) && (s.player.isActive = !0, o.bind({ "onCancel.player beforeClose.player": n, "onUpdate.player": a, "beforeLoad.player": t }), a(), s.trigger("onPlayStart")) : n() }, next: function(e) { var t = s.current; t && (p(e) || (e = t.direction.next), s.jumpto(t.index + 1, e, "next")) }, prev: function(e) { var t = s.current; t && (p(e) || (e = t.direction.prev), s.jumpto(t.index
```

### `n`
```js
n = function() { t(), o.unbind(".player"), s.player.isActive = !1, s.trigger("onPlayEnd") }; !0 === e || !s.player.isActive && !1 !== e ? s.current && (s.current.loop || s.current.index < s.group.length - 1) && (s.player.isActive = !0, o.bind({ "onCancel.player beforeClose.player": n, "onUpdate.player": a, "beforeLoad.player": t }), a(), s.trigger("onPlayStart")) : n() }, next: function(e) { var t = s.current; t && (p(e) || (e = t.direction.next), s.jumpto(t.index + 1, e, "next")) }, prev: function(e) { var t = s.current; t && (p(e) || (e = t.direction.prev), s.jumpto(t.index - 1, e, "prev")) }, jumpto: function(e, t, a) { var i = s.current; i && (e = f(e), s.direction = t || i.direction[e >
```

### `close`
```js
close: function(e) { s.cancel(), !1 !== s.trigger("beforeClose") && (s.unbindEvents(), s.isActive && (s.isOpen && !0 !== e ? (s.isOpen = s.isOpened = !1, s.isClosing = !0, a(".fancybox-item, .fancybox-nav").remove(), s.wrap.stop(!0, !0).removeClass("fancybox-opened"), s.transitions[s.current.closeMethod]()) : (a(".fancybox-wrap").stop(!0).trigger("onReset").remove(), s._afterZoomOut()))) }, play: function(e) { var t = function() { clearTimeout(s.player.timer) }, a = function() { t(), s.current && s.player.isActive && (s.player.timer = setTimeout(s.next, s.current.playSpeed)) }, n = function() { t(), o.unbind(".player"), s.player.isActive = !1, s.trigger("onPlayEnd") }; !0 === e || !s.player.
```

### `_afterZoomIn`
```js
_afterZoomIn: function() { var e = s.current; e && (s.isOpen = s.isOpened = !0, s.wrap.css("overflow", "visible").addClass("fancybox-opened").hide().show(0), s.update(), (e.closeClick || e.nextClick && 1 < s.group.length) && s.inner.css("cursor", "pointer").bind("click.fb", (function(t) { a(t.target).is("a") || a(t.target).parent().is("a") || (t.preventDefault(), s[e.closeClick ? "close" : "next"]()) })), e.closeBtn && a(e.tpl.closeBtn).appendTo(s.skin).bind("click.fb", (function(e) { e.preventDefault(), s.close() })), e.arrows && 1 < s.group.length && ((e.loop || 0 < e.index) && a(e.tpl.prev).appendTo(s.outer).bind("click.fb", s.prev), (e.loop || e.index < s.group.length - 1) && a(e.tpl.nex
```

### `error`
```js
error: function() { console.log("Hit error fn!") } }) } function readBannersJson(e) { var t = "object" != typeof e ? JSON.parse(e) : e; if (div = document.getElementById("layerslider"), null != t.length) for (i = 0; i < t.length; i++) { (d = document.createElement("div")).className = "ls-slide"; var a = document.createElement("img"); (c = document.createElement("a")).className = "ls-link"; var n = ""; for (var r in t[i]) switch (r) { case "load": a.setAttribute("src", t[i][r]), a.className = "ls-bg", d.appendChild(a); break; case "link": c.setAttribute("href", t[i][r]), c.setAttribute("target", t[i].target), d.appendChild(c); break; case "slidedelay": n += "slidedelay:" + t[i][r] + ";"; brea
```

### `readBannersJson`
```js
function readBannersJson(e) { var t = "object" != typeof e ? JSON.parse(e) : e; if (div = document.getElementById("layerslider"), null != t.length) for (i = 0; i < t.length; i++) { (d = document.createElement("div")).className = "ls-slide"; var a = document.createElement("img"); (c = document.createElement("a")).className = "ls-link"; var n = ""; for (var r in t[i]) switch (r) { case "load": a.setAttribute("src", t[i][r]), a.className = "ls-bg", d.appendChild(a); break; case "link": c.setAttribute("href", t[i][r]), c.setAttribute("target", t[i].target), d.appendChild(c); break; case "slidedelay": n += "slidedelay:" + t[i][r] + ";"; break; case "transition2d": n += "transition2d:" + t[i][r] +
```

### `bindEvents`
```js
bindEvents: function() { var e, t = s.current; t && (r.bind("orientationchange.fb" + (c ? "" : " resize.fb") + (t.autoCenter && !t.locked ? " scroll.fb" : ""), s.update), (e = t.keys) && o.bind("keydown.fb", (function(i) { var r = i.which || i.keyCode, o = i.target || i.srcElement; if (27 === r && s.coming) return !1; i.ctrlKey || i.altKey || i.shiftKey || i.metaKey || o && (o.type || a(o).is("[contenteditable]")) || a.each(e, (function(e, o) { return 1 < t.group.length && o[r] !== n ? (s[e](o[r]), i.preventDefault(), !1) : -1 < a.inArray(r, o) ? (s[e](), i.preventDefault(), !1) : void 0 })) })), a.fn.mousewheel && t.mouseWheel && s.wrap.bind("mousewheel.fb", (function(e, n, i, r) { for (var
```

### `_getPosition`
```js
_getPosition: function(e) { var t = s.current, a = s.getViewport(), n = t.margin, i = s.wrap.width() + n[1] + n[3], r = s.wrap.height() + n[0] + n[2]; n = { position: "absolute", top: n[0], left: n[3] }; return t.autoCenter && t.fixed && !e && r <= a.h && i <= a.w ? n.position = "fixed" : t.locked || (n.top += a.y, n.left += a.x), n.top = y(Math.max(n.top, n.top + (a.h - r) * t.topRatio)), n.left = y(Math.max(n.left, n.left + (a.w - i) * t.leftRatio)), n }, _afterZoomIn: function() { var e = s.current; e && (s.isOpen = s.isOpened = !0, s.wrap.css("overflow", "visible").addClass("fancybox-opened").hide().show(0), s.update(), (e.closeClick || e.nextClick && 1 < s.group.length) && s.inner.css("
```

### `cancel`
```js
cancel: function() { var e = s.coming; e && !1 === s.trigger("onCancel") || (s.hideLoading(), e && (s.ajaxLoad && s.ajaxLoad.abort(), s.ajaxLoad = null, s.imgPreload && (s.imgPreload.onload = s.imgPreload.onerror = null), e.wrap && e.wrap.stop(!0, !0).trigger("onReset").remove(), s.coming = null, s.current || s._afterZoomOut(e))) }, close: function(e) { s.cancel(), !1 !== s.trigger("beforeClose") && (s.unbindEvents(), s.isActive && (s.isOpen && !0 !== e ? (s.isOpen = s.isOpened = !1, s.isClosing = !0, a(".fancybox-item, .fancybox-nav").remove(), s.wrap.stop(!0, !0).removeClass("fancybox-opened"), s.transitions[s.current.closeMethod]()) : (a(".fancybox-wrap").stop(!0).trigger("onReset").remov
```

### `create`
```js
create: function(e) { var t; e = a.extend({}, this.defaults, e), this.overlay && this.close(), t = s.coming ? s.coming.parent : e.parent, this.overlay = a('<div class="fancybox-overlay"></div>').appendTo(t && t.length ? t : "body"), this.fixed = !1, e.fixed && s.defaults.fixed && (this.overlay.addClass("fancybox-overlay-fixed"), this.fixed = !0) }, open: function(e) { var t = this; e = a.extend({}, this.defaults, e), this.overlay ? this.overlay.unbind(".overlay").width("auto").height("auto") : this.create(e), this.fixed || (r.bind("resize.overlay", a.proxy(this.update, this)), this.update()), e.closeClick && this.overlay.bind("click.overlay", (function(e) { if (a(e.target).hasClass("fancybox
```

### `open`
```js
open: function(e) { var t = this; e = a.extend({}, this.defaults, e), this.overlay ? this.overlay.unbind(".overlay").width("auto").height("auto") : this.create(e), this.fixed || (r.bind("resize.overlay", a.proxy(this.update, this)), this.update()), e.closeClick && this.overlay.bind("click.overlay", (function(e) { if (a(e.target).hasClass("fancybox-overlay")) return s.isActive ? s.close() : t.close(), !1 })), this.overlay.css(e.css).show() }, close: function() { r.unbind("resize.overlay"), this.el.hasClass("fancybox-lock") && (a(".fancybox-margin").removeClass("fancybox-margin"), this.el.removeClass("fancybox-lock"), r.scrollTop(this.scrollV).scrollLeft(this.scrollH)), a(".fancybox-overlay").
```
