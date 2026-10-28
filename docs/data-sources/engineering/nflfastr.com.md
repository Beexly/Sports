# nflfastr.com — engineering

App bundles beautified: **3**  
JSON endpoints captured: **0**  
Client functions passing filter: **7**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || E], d = v.call(e, "type") ? e.type : e, h = v.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || E, 3 !== n.nodeType && 8 !== n.nodeType && !mt.test(d + S.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[S.expando] ? e : new S.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : S.makeArray(t, [e]), c = S.event.special[d
```

### `_`
```js
_ = (t, e = [], i = t) => "function" == typeof t ? t.call(...e) : i, b = (t, e, n = !0) => { if (!n) return void _(t); const s = (t => { if (!t) return 0; let { transitionDuration: e, transitionDelay: i } = window.getComputedStyle(t); const n = Number.parseFloat(e), s = Number.parseFloat(i); return n || s ? (e = e.split(",")[0], i = i.split(",")[0], 1e3 * (Number.parseFloat(e) + Number.parseFloat(i))) : 0 })(e) + 5; let r = !1; const a = ({ target: n }) => { n === e && (r = !0, e.removeEventListener(i, a), _(t)) }; e.addEventListener(i, a), setTimeout(() => { r || o(e) }, s) }, v = (t, e, i, n) => { const s = t.length; let o = t.indexOf(e); return -1 === o ? !i && n ? t[s - 1] : t[0] : (o +=
```

### `b`
```js
b = (t, e, n = !0) => { if (!n) return void _(t); const s = (t => { if (!t) return 0; let { transitionDuration: e, transitionDelay: i } = window.getComputedStyle(t); const n = Number.parseFloat(e), s = Number.parseFloat(i); return n || s ? (e = e.split(",")[0], i = i.split(",")[0], 1e3 * (Number.parseFloat(e) + Number.parseFloat(i))) : 0 })(e) + 5; let r = !1; const a = ({ target: n }) => { n === e && (r = !0, e.removeEventListener(i, a), _(t)) }; e.addEventListener(i, a), setTimeout(() => { r || o(e) }, s) }, v = (t, e, i, n) => { const s = t.length; let o = t.indexOf(e); return -1 === o ? !i && n ? t[s - 1] : t[0] : (o += i ? 1 : -1, n && (o = (o + s) % s), t[Math.max(0, Math.min(o, s - 1)
```

### `a`
```js
a = ({ target: n }) => { n === e && (r = !0, e.removeEventListener(i, a), _(t)) }; e.addEventListener(i, a), setTimeout(() => { r || o(e) }, s) }, v = (t, e, i, n) => { const s = t.length; let o = t.indexOf(e); return -1 === o ? !i && n ? t[s - 1] : t[0] : (o += i ? 1 : -1, n && (o = (o + s) % s), t[Math.max(0, Math.min(o, s - 1))]) }, y = /[^.]*(?=\..*)\.|.*/, w = /\..*/, A = /::\d+$/, E = {}; let T = 1; const C = { mouseenter: "mouseover", mouseleave: "mouseout" }, O = new Set(["click", "dblclick", "mouseup", "mousedown", "contextmenu", "mousewheel", "DOMMouseScroll", "mouseover", "mouseout", "mousemove", "selectstart", "selectend", "keydown", "keypress", "keyup", "orientationchange", "tou
```

### `leftCallback`
```js
leftCallback: () => this._slide(this._directionToOrder(ut)), rightCallback: () => this._slide(this._directionToOrder(ft)), endCallback: () => { "hover" === this._config.pause && (this.pause(), this.touchTimeout && clearTimeout(this.touchTimeout), this.touchTimeout = setTimeout(() => this._maybeEnableCycle(), 500 + this._config.interval)) } }; this._swipeHelper = new ot(this._element, t) } _keydown(t) { if (/input|textarea/i.test(t.target.tagName)) return; const e = xt[t.key]; e && (t.preventDefault(), this._slide(this._directionToOrder(e))) } _getItemIndex(t) { return this._getItems().indexOf(t) } _setActiveIndicatorElement(t) { if (!this._indicatorsElement) return; const e = R.findOne(Tt, t
```

### `rightCallback`
```js
rightCallback: () => this._slide(this._directionToOrder(ft)), endCallback: () => { "hover" === this._config.pause && (this.pause(), this.touchTimeout && clearTimeout(this.touchTimeout), this.touchTimeout = setTimeout(() => this._maybeEnableCycle(), 500 + this._config.interval)) } }; this._swipeHelper = new ot(this._element, t) } _keydown(t) { if (/input|textarea/i.test(t.target.tagName)) return; const e = xt[t.key]; e && (t.preventDefault(), this._slide(this._directionToOrder(e))) } _getItemIndex(t) { return this._getItems().indexOf(t) } _setActiveIndicatorElement(t) { if (!this._indicatorsElement) return; const e = R.findOne(Tt, this._indicatorsElement); e.classList.remove(Et), e.removeAttr
```

### `endCallback`
```js
endCallback: () => { "hover" === this._config.pause && (this.pause(), this.touchTimeout && clearTimeout(this.touchTimeout), this.touchTimeout = setTimeout(() => this._maybeEnableCycle(), 500 + this._config.interval)) } }; this._swipeHelper = new ot(this._element, t) } _keydown(t) { if (/input|textarea/i.test(t.target.tagName)) return; const e = xt[t.key]; e && (t.preventDefault(), this._slide(this._directionToOrder(e))) } _getItemIndex(t) { return this._getItems().indexOf(t) } _setActiveIndicatorElement(t) { if (!this._indicatorsElement) return; const e = R.findOne(Tt, this._indicatorsElement); e.classList.remove(Et), e.removeAttribute("aria-current"); const i = R.findOne(`[data-bs-slide-to=
```
