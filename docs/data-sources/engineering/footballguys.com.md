# footballguys.com — engineering

App bundles beautified: **1**  
JSON endpoints captured: **3**  
Client functions passing filter: **7**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://footballguys.com/rate-my-team/flavor-status` | 53 |
| `https://footballguys.com/staff/campaigns/save` | 40 |
| `https://footballguys.com/staff/player-updates/save` | 40 |

## Response schemas

### `https://footballguys.com/rate-my-team/flavor-status`
```
result: str
message: str
```

### `https://footballguys.com/staff/campaigns/save`
```
result: str
message: str
```

### `https://footballguys.com/staff/player-updates/save`
```
result: str
message: str
```

## Client-side functions that passed the filter

### `updateWith`
```js
updateWith: function(e) { t._bus.emit(f.UPDATE_SHIPPING_ADDRESS, e) } }; t._emit("shippingAddressChange", n), t._emit("shippingaddresschange", n) })), t._bus.on(f.SHIPPING_OPTION_CHANGE, (function(e) { var n = { target: { shippingOption: e }, updateWith: function(e) { t._bus.emit(f.UPDATE_SHIPPING_OPTION, e) } }; t._emit("shippingOptionChange", n), t._emit("shippingoptionchange", n) })), n(t) })), t._frame.src = (r = e.gatewayConfiguration.assetsUrl, s = t._componentId, o = e.isDebug, r + "/web/3.117.0/html/payment-request-frame" + d(o) + ".html#" + s), docume
```

### `Ge`
```js
Ge = (e, t, n = !0) => { if (!n) return void Qe(e); const i = (e => { if (!e) return 0; let { transitionDuration: t, transitionDelay: n } = window.getComputedStyle(e); const i = Number.parseFloat(t), r = Number.parseFloat(n); return i || r ? (t = t.split(",")[0], n = n.split(",")[0], 1e3 * (Number.parseFloat(t) + Number.parseFloat(n))) : 0 })(t) + 5; let r = !1; const s = ({ target: n }) => { n === t && (r = !0, t.removeEventListener($e, s), Qe(e)) }; t.addEventListener($e, s), setTimeout((() => { r || Me(t) }), i) }, Ze = (e, t, n, i) => { const r = e.length; let s = e.indexOf(t); return -1 === s ? !n && i ? e[r - 1] : e[0] : (s += n ? 1 : -1, i && (s = (s + r) % r),
```

### `s`
```js
s = ({ target: n }) => { n === t && (r = !0, t.removeEventListener($e, s), Qe(e)) }; t.addEventListener($e, s), setTimeout((() => { r || Me(t) }), i) }, Ze = (e, t, n, i) => { const r = e.length; let s = e.indexOf(t); return -1 === s ? !n && i ? e[r - 1] : e[0] : (s += n ? 1 : -1, i && (s = (s + r) % r), e[Math.max(0, Math.min(s, r - 1))]) }, Je = /[^.]*(?=\..*)\.|.*/, Xe = /\..*/, et = /::\d+$/, tt = {}; let nt = 1; const it = { mouseenter: "mouseover", mouseleave: "mouseout" }, rt = new Set(["click", "dblclick", "mouseup", "mousedown", "contextmenu", "mousewheel", "DOMMouseScroll", "mouseover", "mouseout", "mousemove", "selectstart", "selectend", "keydown", "keypress", "keyup", "orientatio
```

### `leftCallback`
```js
leftCallback: () => this._slide(this._directionToOrder(jt)), rightCallback: () => this._slide(this._directionToOrder(Yt)), endCallback: () => { "hover" === this._config.pause && (this.pause(), this.touchTimeout && clearTimeout(this.touchTimeout), this.touchTimeout = setTimeout((() => this._maybeEnableCycle()), 500 + this._config.interval)) } }; this._swipeHelper = new Mt(this._element, e) } _keydown(e) { if (/input|textarea/i.test(e.target.tagName)) return; const t = on[e.key]; t && (e.preventDefault(), this._slide(this._directionToOrder(t))) } _getItemIndex(e) { return this._getItems().indexOf(e) } _setActiveIndicatorElement(e) { if (!this._indicatorsElement) return; const t = Et.findOne(nn
```

### `rightCallback`
```js
rightCallback: () => this._slide(this._directionToOrder(Yt)), endCallback: () => { "hover" === this._config.pause && (this.pause(), this.touchTimeout && clearTimeout(this.touchTimeout), this.touchTimeout = setTimeout((() => this._maybeEnableCycle()), 500 + this._config.interval)) } }; this._swipeHelper = new Mt(this._element, e) } _keydown(e) { if (/input|textarea/i.test(e.target.tagName)) return; const t = on[e.key]; t && (e.preventDefault(), this._slide(this._directionToOrder(t))) } _getItemIndex(e) { return this._getItems().indexOf(e) } _setActiveIndicatorElement(e) { if (!this._indicatorsElement) return; const t = Et.findOne(nn, this._indicatorsElement); t.classList.remove(tn), t.removeA
```

### `endCallback`
```js
endCallback: () => { "hover" === this._config.pause && (this.pause(), this.touchTimeout && clearTimeout(this.touchTimeout), this.touchTimeout = setTimeout((() => this._maybeEnableCycle()), 500 + this._config.interval)) } }; this._swipeHelper = new Mt(this._element, e) } _keydown(e) { if (/input|textarea/i.test(e.target.tagName)) return; const t = on[e.key]; t && (e.preventDefault(), this._slide(this._directionToOrder(t))) } _getItemIndex(e) { return this._getItems().indexOf(e) } _setActiveIndicatorElement(e) { if (!this._indicatorsElement) return; const t = Et.findOne(nn, this._indicatorsElement); t.classList.remove(tn), t.removeAttribute("aria-current"); const n = Et.findOne(`[data-bs-slide
```

### `E`
```js
E = (e, t, n, i, r, s, o) => { if (s > 0 && _[e] < s) return; if (o > 0 && y[e] < o) return; if (0 === r) { if (s <= 0 && o <= 0) { const e = d + n; e > v && (v = e, b = [...a, ...t]) } return } if (e + r > f) return; if (r < s || r < o) return; const l = new Set(p); for (const e of t) "QB" === e.pos && l.add(this.normalizeTeamId(e.teamId)); for (let a = e; a < f; a++) { const { player: e, isHome: c, isAway: d } = g[a], u = e.salary, h = this.getPlayerValue(e); if ("QB" === e.pos) { const t = this.normalizeTeamId(e.teamId); if (l.has(t)) continue } u <= i && (t.push(e), E(a + 1, t, n + h, i - u, r - 1, c ? Ma
```
