# usbets.com — engineering

App bundles beautified: **2**  
JSON endpoints captured: **0**  
Client functions passing filter: **6**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `a`
```js
function a(e) { const t = e.getBoundingClientRect(); return t.left >= 0 && t.right <= (window.innerWidth || document.documentElement.clientWidth) } const o = (e, t, n) => { n = "-" + n; const s = e.dataset.openingSideClass, a = "start" === s ? "end" : "start", o = t ? n + "-0" : n + "-full", l = s + o, i = a + o; e.classList.remove(l), e.classList.add(i), e.dataset.openingSideClass = a }, l = (e, t, n) => { let s, l = e.nextElementSibling; for (; l;) { if (l.classList.contains("sub-menu")) { s = l; break } l = l.nextElementSibling } s && (s.dataset.openingSideClass || (s.dataset.openingSideClass = t), e.closest(".sub-menu") ? !a(s) && o(s, !1, n) : !a(s) && o(s, !0, n)) }, i = n => { n.targe
```

### `o`
```js
o = (e, t, n) => { n = "-" + n; const s = e.dataset.openingSideClass, a = "start" === s ? "end" : "start", o = t ? n + "-0" : n + "-full", l = s + o, i = a + o; e.classList.remove(l), e.classList.add(i), e.dataset.openingSideClass = a }, l = (e, t, n) => { let s, l = e.nextElementSibling; for (; l;) { if (l.classList.contains("sub-menu")) { s = l; break } l = l.nextElementSibling } s && (s.dataset.openingSideClass || (s.dataset.openingSideClass = t), e.closest(".sub-menu") ? !a(s) && o(s, !1, n) : !a(s) && o(s, !0, n)) }, i = n => { n.target.closest(e) || t.forEach(e => { let t = e.querySelectorAll(e.dataset.submenuToggleEl); s(t), window.removeEventListener("click", i) }) }, r = (e, t) => {
```

### `l`
```js
l = (e, t, n) => { let s, l = e.nextElementSibling; for (; l;) { if (l.classList.contains("sub-menu")) { s = l; break } l = l.nextElementSibling } s && (s.dataset.openingSideClass || (s.dataset.openingSideClass = t), e.closest(".sub-menu") ? !a(s) && o(s, !1, n) : !a(s) && o(s, !0, n)) }, i = n => { n.target.closest(e) || t.forEach(e => { let t = e.querySelectorAll(e.dataset.submenuToggleEl); s(t), window.removeEventListener("click", i) }) }, r = (e, t) => { t || e.classList.contains("open") ? e.classList.remove("open") : e.classList.add("open") }; t.forEach((e, t, a) => { const o = e.dataset.openOnClick, c = e.dataset.offcanvas, d = e.dataset.shouldSubmenusOpenOnSide, u = e.dataset.submenus
```

### `leftCallback`
```js
leftCallback: () => this._slide(this._directionToOrder("left")), rightCallback: () => this._slide(this._directionToOrder("right")), endCallback: () => { "hover" === this._config.pause && (this.pause(), this.touchTimeout && clearTimeout(this.touchTimeout), this.touchTimeout = setTimeout(() => this._maybeEnableCycle(), 500 + this._config.interval)) } }; this._swipeHelper = new Swipe(this._element, swipeConfig) } _keydown(event) { var direction; /input|textarea/i.test(event.target.tagName) || (direction = KEY_TO_DIRECTION[event.key]) && (event.preventDefault(), this._slide(this._directionToOrder(direction))) } _getItemIndex(element) { return this._getItems().indexOf(element) } _setActiveIndicat
```

### `rightCallback`
```js
rightCallback: () => this._slide(this._directionToOrder("right")), endCallback: () => { "hover" === this._config.pause && (this.pause(), this.touchTimeout && clearTimeout(this.touchTimeout), this.touchTimeout = setTimeout(() => this._maybeEnableCycle(), 500 + this._config.interval)) } }; this._swipeHelper = new Swipe(this._element, swipeConfig) } _keydown(event) { var direction; /input|textarea/i.test(event.target.tagName) || (direction = KEY_TO_DIRECTION[event.key]) && (event.preventDefault(), this._slide(this._directionToOrder(direction))) } _getItemIndex(element) { return this._getItems().indexOf(element) } _setActiveIndicatorElement(index) { var activeIndicator; this._indicatorsElement &
```

### `endCallback`
```js
endCallback: () => { "hover" === this._config.pause && (this.pause(), this.touchTimeout && clearTimeout(this.touchTimeout), this.touchTimeout = setTimeout(() => this._maybeEnableCycle(), 500 + this._config.interval)) } }; this._swipeHelper = new Swipe(this._element, swipeConfig) } _keydown(event) { var direction; /input|textarea/i.test(event.target.tagName) || (direction = KEY_TO_DIRECTION[event.key]) && (event.preventDefault(), this._slide(this._directionToOrder(direction))) } _getItemIndex(element) { return this._getItems().indexOf(element) } _setActiveIndicatorElement(index) { var activeIndicator; this._indicatorsElement && ((activeIndicator = SelectorEngine.findOne(".active", this._indic
```
