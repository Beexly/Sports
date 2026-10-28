# ballybet.com — engineering

App bundles beautified: **1**  
JSON endpoints captured: **0**  
Client functions passing filter: **5**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `i`
```js
function i(e) { try { return e.defaultView && e.defaultView.frameElement || null } catch (e) { return null } } function o(e) { this.time = e.time, this.target = e.target, this.rootBounds = d(e.rootBounds), this.boundingClientRect = d(e.boundingClientRect), this.intersectionRect = d(e.intersectionRect || { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }), this.isIntersecting = !!e.intersectionRect; var t = this.boundingClientRect, n = t.width * t.height, r = this.intersectionRect, i = r.width * r.height; this.intersectionRatio = n ? Number((i / n).toFixed(4)) : this.isIntersecting ? 1 : 0 } function a(e, t) { var n, r, i, o = t || {}; 
```

### `o`
```js
function o(e) { this.time = e.time, this.target = e.target, this.rootBounds = d(e.rootBounds), this.boundingClientRect = d(e.boundingClientRect), this.intersectionRect = d(e.intersectionRect || { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }), this.isIntersecting = !!e.intersectionRect; var t = this.boundingClientRect, n = t.width * t.height, r = this.intersectionRect, i = r.width * r.height; this.intersectionRatio = n ? Number((i / n).toFixed(4)) : this.isIntersecting ? 1 : 0 } function a(e, t) { var n, r, i, o = t || {}; if ("function" != typeof e) throw new Error("callback must be a function"); if (o.root && 1 != o.root.nodeType && 9 != o.root.nodeType) throw new Error("root
```

### `pubChannel`
```js
pubChannel: function(e) { return "/request/player/venture/guest/".concat(e) }(null === (c = h[S]) || void 0 === c ? void 0 : c.bingoCommetDId) }, z = w ? window.__SHOW_NEW_HEADER__ : process.env.SHOW_NEW_HEADER; e.exports = f({ extractorProps: U, redisOptions: V, redisSentinels: L, redisSupport: H, breakpoints: [444, 588, 684, 972, 1270], apiUrl: B, restApiUrl: D, basename: "", baseUrl: G, env: k, host: N, isBrowser: w, tealiumEnv: T, port: E, venture: S, ventures: h, imageScale: I, tealiumVenture: F, isPPC: O, isLive: j, appVersion: A, isPreLaunch: function(e) { var t, n; return (null === (t = h[e]) || void 0 === t ? void 0 : t.launchDate) && (n = h[e
```

### `default`
```js
default = function(e) { (0, r.useEffect)(function() { var e = null, n = [], r = function(n) { e || (e = setTimeout(function() { ! function(e) { var n = e.target.getAttribute("data-tracking"), r = JSON.parse(n); r.trackHoverEvent && t(r) }(n) }, 1500)) }, o = function() { e && (clearTimeout(e), e = null) }; return setTimeout(function() { if ((n = document.querySelectorAll("[data-tracking]")).length) { var e, t = i(n); try { for (t.s(); !(e = t.n()).done;) { var a = e.value; a.addEventListener("mouseenter", r), a.addEventListener("mouseleave", o) } 
```

### `r`
```js
r = function(n) { e || (e = setTimeout(function() { ! function(e) { var n = e.target.getAttribute("data-tracking"), r = JSON.parse(n); r.trackHoverEvent && t(r) }(n) }, 1500)) }, o = function() { e && (clearTimeout(e), e = null) }; return setTimeout(function() { if ((n = document.querySelectorAll("[data-tracking]")).length) { var e, t = i(n); try { for (t.s(); !(e = t.n()).done;) { var a = e.value; a.addEventListener("mouseenter", r), a.addEventListener("mouseleave", o) } } catch (e) { t.e(e) } finally { t.f() } 
```
