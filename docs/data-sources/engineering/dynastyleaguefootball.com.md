# dynastyleaguefootball.com — engineering

App bundles beautified: **4**  
JSON endpoints captured: **0**  
Client functions passing filter: **15**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
```

### `Wp`
```js
Wp = function(a, b) { return function*() { var c = typeof b === "function"; if (a !== void 0) { let d = -1; for (let e of a) d > -1 && (yield c ? b(d) : b), d++, yield e } }() }; Rga = function(a) { return a.links.length === 0 ? null : (0, _.Q)` ${_.Wp(a.links.map(({text:b,href:c})=>(0,_.Q)` < div class = "link-item" > < a .href = $ { c } target = "_blank" aria - label = $ { _.Rp(b) } > $ { b } < div class = "icon-container" > $ { _.Xp({ className: "", ariaLabel: "" }) } < /div> < /a> < /div>`),"")} `};Sga=function(a){var b=document.createElement("div");b.append(a.sh);b=new _.Yp({title:"Google Maps",xK:!1,content:b});b.addEventL
```

### `Rga`
```js
Rga = function(a) { return a.links.length === 0 ? null : (0, _.Q)` ${_.Wp(a.links.map(({text:b,href:c})=>(0,_.Q)` < div class = "link-item" > < a .href = $ { c } target = "_blank" aria - label = $ { _.Rp(b) } > $ { b } < div class = "icon-container" > $ { _.Xp({ className: "", ariaLabel: "" }) } < /div> < /a> < /div>`),"")} `};Sga=function(a){var b=document.createElement("div");b.append(a.sh);b=new _.Yp({title:"Google Maps",xK:!1,content:b});b.addEventListener("close",()=>{a.dispatchEvent(new Event("gmp-internal-close"))});return b};Zp=function(a){return a==="#000"||a==="#5e5e5e"?"#fff":"#474747"}; Uga=function(a,b){if(!a.showInfoButton)return(0,_.Q)` `;var c=a.logoColorOptions.Fy||"#5
```

### `doSnapy`
```js
doSnapy = function(nx, ny) { var snap = false; if (ny < 0) { ny = 0; snap = true; } else if (ny > self.nc.page.maxh) { ny = self.nc.page.maxh; snap = true; } if (nx < 0) { nx = 0; snap = true; } else if (nx > self.nc.page.maxw) { nx = self.nc.page.maxw; snap = true; } if (snap) self.nc.doScrollPos(nx, ny, self.nc.opt.snapbackspeed); }; this.doMomentum = function(gp) { var t = self.time(); var l = (gp) ? t + gp : self.lasttime; var sl = self.nc.getScrollLeft(); var st = self.nc.getScrollTop(); var pageh = self.nc.page.maxh; var pagew = self.nc.page.maxw; self.speedx = (pagew > 0) ? Math.min(60, self.speedx) : 0; self.speedy = (pageh > 0) ? Math.min(60, self.speedy) : 0; var chk = l && (t - l)
```

### `getTarget`
```js
getTarget = function(e) { if (!e) return false; if (e.target) return e.target; if (e.srcElement) return e.srcElement; return false; }; this.hasParent = function(e, id) { if (!e) return false; var el = e.target || e.srcElement || e || false; while (el && el.id != id) { el = el.parentNode || false; } return (el !== false); }; function getZIndex() { var dom = self.win; if ("zIndex" in dom) return dom.zIndex(); // use jQuery UI method when available while (dom.length > 0) { if (dom[0].nodeType == 9) return false; var zi = dom.css('zIndex'); if (!isNaN(zi) && zi != 0) return parseInt(zi); dom = dom.parent(); } return false; }; //inspired by http://forum.jquery.com/topic/width-includes-border-widt
```

### `ontouchstart`
```js
ontouchstart = function(e) { if (e.pointerType && e.pointerType != 2) return false; if (!self.locked) { if (cap.hasmstouch) { var tg = (e.target) ? e.target : false; while (tg) { var nc = $(tg).getNiceScroll(); if ((nc.length > 0) && (nc[0].me == self.me)) break; if (nc.length > 0) return false; if ((tg.nodeName == 'DIV') && (tg.id == self.id)) break; tg = (tg.parentNode) ? tg.parentNode : false; } } self.cancelScroll(); var tg = self.getTarget(e); if (tg) { var skp = (/INPUT/i.test(tg.nodeName)) && (/range/i.test(tg.type)); if (skp) return self.stopPropagation(e); } 
```

### `lazyResize`
```js
lazyResize = function(tm) { // event debounce tm = (isNaN(tm)) ? 30 : tm; self.delayed('resize', self.resize, tm); return self; } // modified by MDN https://developer.mozilla.org/en-US/docs/DOM/Mozilla_event_reference/wheel function _modernWheelEvent(dom, name, fn, bubble) { self._bind(dom, name, function(e) { var e = (e) ? e : window.event; var event = { original: e, target: e.target || e.srcElement, type: "wheel", deltaMode: e.type == "MozMousePixelScroll" ? 0 : 1, deltaX: 0, deltaZ: 0, preventDefault: function() { e.preventDefault ? e.preventDefault() : e.returnValue = false; return false; }, stopImmediatePropagation: function() { (e.stopImmediatePropagation) ? e.stopImmediatePropagation(
```

### `_modernWheelEvent`
```js
function _modernWheelEvent(dom, name, fn, bubble) { self._bind(dom, name, function(e) { var e = (e) ? e : window.event; var event = { original: e, target: e.target || e.srcElement, type: "wheel", deltaMode: e.type == "MozMousePixelScroll" ? 0 : 1, deltaX: 0, deltaZ: 0, preventDefault: function() { e.preventDefault ? e.preventDefault() : e.returnValue = false; return false; }, stopImmediatePropagation: function() { (e.stopImmediatePropagation) ? e.stopImmediatePropagation(): e.cancelBubble = true; } }; if (name == "mousewheel") { event.deltaY = -1 / 40 * e.wheelDelta; e.wheelDeltaX && (event.deltaX = -1 / 40 * e.wheelDeltaX); } else { event.deltaY = e.detail; } r
```

### `update`
```js
update = function(px, py) { var now = self.time(); self.steptime = now - self.lasttime; self.lasttime = now; var dy = py - self.lasty; var dx = px - self.lastx; var sy = self.nc.getScrollTop(); var sx = self.nc.getScrollLeft(); var newy = sy + dy; var newx = sx + dx; self.snapx = (newx < 0) || (newx > self.nc.page.maxw); self.snapy = (newy < 0) || (newy > self.nc.page.maxh); self.speedx = dx; self.speedy = dy; self.lastx = px; self.lasty = py; }; this.stop = function() { self.nc.unsynched("domomentum2d"); if (self.timer) clearTimeout(self.timer); self.timer = 0; self.lastscrollx = -1; self.lastscrolly = -1; }; this.doSnapy = function(nx, ny) { var snap = false; if (ny < 0) { ny = 0; snap = t
```

### `n`
```js
function n(t) { t.stopPropagation(); var a = t.target._slider; if (a) { var n = -t.translationX, i = -t.translationY; return w += c ? i : n, m = w, y = c ? Math.abs(w) < Math.abs(-n) : Math.abs(w) < Math.abs(-i), t.detail === t.MSGESTURE_FLAG_INERTIA ? void setImmediate(function() { e._gesture.stop() }) : void((!y || Number(new Date) - f > 500) && (t.preventDefault(), !v && a.transitions && (a.vars.animationLoop || (m = w / (0 === a.currentSlide && 0 > w || a.currentSlide === a.last && w > 0 ? Math.abs(w) / p + 2 : 1)), a.setProps(l + m, "setTouch")))) } } function s(e) { e.stopPropagation(); var t = e.target._slider; if (t) { if (t.animatingTo === t.currentSlide && !y && null !== m) { var a
```

### `hasParent`
```js
hasParent = function(e, id) { if (!e) return false; var el = e.target || e.srcElement || e || false; while (el && el.id != id) { el = el.parentNode || false; } return (el !== false); }; function getZIndex() { var dom = self.win; if ("zIndex" in dom) return dom.zIndex(); // use jQuery UI method when available while (dom.length > 0) { if (dom[0].nodeType == 9) return false; var zi = dom.css('zIndex'); if (!isNaN(zi) && zi != 0) return parseInt(zi); dom = dom.parent(); } return false; }; //inspired by http://forum.jquery.com/topic/width-includes-border-width-when-set-to-thin-medium-thick-in-ie var _convertBorderWidth = { "thin": 1, "medium": 3, "thick": 5 }; function getWidthToPixel(dom, prop, 
```

### `checkSelectionScroll`
```js
function checkSelectionScroll(e) { if (!self.selectiondrag) return; if (e) { var ww = self.win.outerHeight(); var df = (e.pageY - self.selectiondrag.top); if (df > 0 && df < ww) df = 0; if (df >= ww) df -= ww; self.selectiondrag.df = df; } if (self.selectiondrag.df == 0) return; var rt = -Math.floor(self.selectiondrag.df / 6) * 2; // self.doScrollTop(self.getScrollTop(true)+rt); self.doScrollBy(rt); self.debounced("doselectionscroll", function() { checkSelectionScroll() }, 50); } if ("getSelection" in document) { // A grade - Major browsers self.hasTextSelected = function() { return (document.getSele
```

### `setup`
```js
setup: function() { a.asNav = !0, a.animatingTo = Math.floor(a.currentSlide / a.move), a.currentItem = a.currentSlide, a.slides.removeClass(n + "active-slide").eq(a.currentItem).addClass(n + "active-slide"), i ? (e._slider = a, a.slides.each(function() { var e = this; e._gesture = new MSGesture, e._gesture.target = e, e.addEventListener("MSPointerDown", function(e) { e.preventDefault(), e.currentTarget._gesture && e.currentTarget._gesture.addPointer(e.pointerId) }, !1), e.addEventListener("MSGestureTap", function(e) { e.preventDefault(); var t = $(this), n = t.index(); $(a.vars.asNavFor).data("flexslider").animating || t.hasClass("active") || (a.direction = a.currentItem < n ? "next" : "prev
```

### `touch`
```js
touch: function() { function t(t) { t.stopPropagation(), a.animating ? t.preventDefault() : (a.pause(), e._gesture.addPointer(t.pointerId), w = 0, p = c ? a.h : a.w, f = Number(new Date), l = u && d && a.animatingTo === a.last ? 0 : u && d ? a.limit - (a.itemW + a.vars.itemMargin) * a.move * a.animatingTo : u && a.currentSlide === a.last ? a.limit : u ? (a.itemW + a.vars.itemMargin) * a.move * a.currentSlide : d ? (a.last - a.currentSlide + a.cloneOffset) * p : (a.currentSlide + a.cloneOffset) * p) } function n(t) { t.stopPropagation(); var a = t.target._slider; if (a) { var n = -t.translationX, i = -t.translationY; return w += c ? i : n, m = w, y = c ? Math.abs(w) < Math.abs(-n) : Math.abs(
```

### `t`
```js
function t(t) { t.stopPropagation(), a.animating ? t.preventDefault() : (a.pause(), e._gesture.addPointer(t.pointerId), w = 0, p = c ? a.h : a.w, f = Number(new Date), l = u && d && a.animatingTo === a.last ? 0 : u && d ? a.limit - (a.itemW + a.vars.itemMargin) * a.move * a.animatingTo : u && a.currentSlide === a.last ? a.limit : u ? (a.itemW + a.vars.itemMargin) * a.move * a.currentSlide : d ? (a.last - a.currentSlide + a.cloneOffset) * p : (a.currentSlide + a.cloneOffset) * p) } function n(t) { t.stopPropagation(); var a = t.target._slider; if (a) { var n = -t.translationX, i = -t.translationY; return w += c ? i : n, m = w, y = c ? Math.abs(w) < Math.abs(-n) : Math.abs(w) < Math.abs(-i), t
```
