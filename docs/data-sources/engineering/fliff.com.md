# fliff.com — engineering

App bundles beautified: **3**  
JSON endpoints captured: **0**  
Client functions passing filter: **21**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || E], d = v.call(e, "type") ? e.type : e, h = v.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || E, 3 !== n.nodeType && 8 !== n.nodeType && !bt.test(d + S.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[S.expando] ? e : new S.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : S.makeArray(t, [e]), c = S.event.special[d
```

### `observe`
```js
observe = function(a) { return new xe(a) }, V.normalizeScroll = function(a) { if (typeof a == "undefined") return nt; if (a === !0 && nt) return nt.enable(); if (a === !1) { nt && nt.kill(), nt = a; return } var e = a instanceof xe ? a : nf(a); return nt && nt.target === e.target && nt.kill(), qr(e.target) && (nt = e), e }, V.core = { _getVelocityProp: Vs, _inputObserver: yl, _scrollers: W, _proxies: Kt, bridge: { ss: function() { Dt || Gr("scrollStart"), Dt = Ke() }, ref: function() { return He } } }, ja() && A.registerPlugin(V), D.registerPlugin(V); function sf() { const a = document.querySelector("[nav-menu-btn]"); if (!a) return; const e = document.querySelector("[menu]"), r = document.q
```

### `normalizeScroll`
```js
normalizeScroll = function(a) { if (typeof a == "undefined") return nt; if (a === !0 && nt) return nt.enable(); if (a === !1) { nt && nt.kill(), nt = a; return } var e = a instanceof xe ? a : nf(a); return nt && nt.target === e.target && nt.kill(), qr(e.target) && (nt = e), e }, V.core = { _getVelocityProp: Vs, _inputObserver: yl, _scrollers: W, _proxies: Kt, bridge: { ss: function() { Dt || Gr("scrollStart"), Dt = Ke() }, ref: function() { return He } } }, ja() && A.registerPlugin(V), D.registerPlugin(V); function sf() { const a = document.querySelector("[nav-menu-btn]"); if (!a) return; const e = document.querySelector("[menu]"), r = document.querySelectorAll("[menu-link]"); a.addEventList
```

### `_a`
```js
_a = function(e) { e.translate && (e.removeProperty("translate"), e.removeProperty("scale"), e.removeProperty("rotate")) }, Au = function() { var e = this.props, r = this.target, t = r.style, i = r._gsap, n, s; for (n = 0; n < e.length; n += 3) e[n + 1] ? r[e[n]] = e[n + 2] : e[n + 2] ? t[e[n]] = e[n + 2] : t.removeProperty(e[n].substr(0, 2) === "--" ? e[n] : e[n].replace(Fs, "-$1").toLowerCase()); if (this.tfm) { for (s in this.tfm) i[s] = this.tfm[s]; i.svg && (i.renderTransform(), r.setAttribute("data-svg-origin", this.svgo || "")), n = Rs(), (!n || !n.isStart) && !t[ce] && (_a(t), i.zOrigin && t[ht] && (t[ht] += " " + i.zOrigin + "px", i.zOrigin = 0, i.renderTransform()), i.uncache = 1) 
```

### `Au`
```js
Au = function() { var e = this.props, r = this.target, t = r.style, i = r._gsap, n, s; for (n = 0; n < e.length; n += 3) e[n + 1] ? r[e[n]] = e[n + 2] : e[n + 2] ? t[e[n]] = e[n + 2] : t.removeProperty(e[n].substr(0, 2) === "--" ? e[n] : e[n].replace(Fs, "-$1").toLowerCase()); if (this.tfm) { for (s in this.tfm) i[s] = this.tfm[s]; i.svg && (i.renderTransform(), r.setAttribute("data-svg-origin", this.svgo || "")), n = Rs(), (!n || !n.isStart) && !t[ce] && (_a(t), i.zOrigin && t[ht] && (t[ht] += " " + i.zOrigin + "px", i.zOrigin = 0, i.renderTransform()), i.uncache = 1) } }, pa = function(e, r) { var t = { target: e, props: [], revert: Au, save: Eu }; return e._gsap || ct.core.getCache(e), r 
```

### `Ln`
```js
Ln = function(e, r) { var t = r.d2; return e["offset" + t] || e["client" + t] || 0 }, nl = function(e) { var r = [], t = e.labels, i = e.duration(), n; for (n in t) r.push(t[n] / i); return r }, Wu = function(e) { return function(r) { return A.utils.snap(nl(e), r) } }, no = function(e) { var r = A.utils.snap(e), t = Array.isArray(e) && e.slice(0).sort(function(i, n) { return i - n }); return t ? function(i, n, s) { s === void 0 && (s = .001); var o; if (!n) return r(i); if (n > 0) { for (i -= s, o = 0; o < t.length; o++) if (t[o] >= i) return t[o]; return t[o - 1] } else for (o = t.length, i += s; o--;) if (t[o] <= i) return t[o]; return t[0] } : f
```

### `nl`
```js
nl = function(e) { var r = [], t = e.labels, i = e.duration(), n; for (n in t) r.push(t[n] / i); return r }, Wu = function(e) { return function(r) { return A.utils.snap(nl(e), r) } }, no = function(e) { var r = A.utils.snap(e), t = Array.isArray(e) && e.slice(0).sort(function(i, n) { return i - n }); return t ? function(i, n, s) { s === void 0 && (s = .001); var o; if (!n) return r(i); if (n > 0) { for (i -= s, o = 0; o < t.length; o++) if (t[o] >= i) return t[o]; return t[o - 1] } else for (o = t.length, i += s; o--;) if (t[o] <= i) return t[o]; return t[0] } : function(i, n, s) { s === void 0 && (s = .001); var o = r(i); return !n || Math.abs
```

### `Wu`
```js
Wu = function(e) { return function(r) { return A.utils.snap(nl(e), r) } }, no = function(e) { var r = A.utils.snap(e), t = Array.isArray(e) && e.slice(0).sort(function(i, n) { return i - n }); return t ? function(i, n, s) { s === void 0 && (s = .001); var o; if (!n) return r(i); if (n > 0) { for (i -= s, o = 0; o < t.length; o++) if (t[o] >= i) return t[o]; return t[o - 1] } else for (o = t.length, i += s; o--;) if (t[o] <= i) return t[o]; return t[0] } : function(i, n, s) { s === void 0 && (s = .001); var o = r(i); return !n || Math.abs(o - i) < s || o - i < 0 == n < 0 ? o : r(n < 0 ? i - e : i + e) } }, Hu = function(e) { return function(r, t) { return no(nl(e))(r
```

### `ml`
```js
ml = function(e, r, t, i) { return r > i ? e(i) : r < 0 && e(0), t > i ? (i - r) / (t - r) : t < 0 ? r / (r - t) : 1 }, co = function a(e, r) { r === !0 ? e.style.removeProperty("touch-action") : e.style.touchAction = r === !0 ? "auto" : r ? "pan-" + r + (xe.isTouch ? " pinch-zoom" : "") : "none", e === It && a(ae, r) }, Hn = { auto: 1, scroll: 1 }, tf = function(e) { var r = e.event, t = e.target, i = e.axis, n = (r.changedTouches ? r.changedTouches[0] : r).target, s = n._gsap || A.core.getCache(n), o = Ke(), l; if (!s._isScrollT || o - s._isScrollT > 2e3) { for (; n && n !== ae && (n.scrollHeight <= n.clientHeight && n.scrollWidth <= n.clientWidth || !(Hn[(l = Ft(n)).overflowY] || Hn[l.ove
```

### `co`
```js
co = function a(e, r) { r === !0 ? e.style.removeProperty("touch-action") : e.style.touchAction = r === !0 ? "auto" : r ? "pan-" + r + (xe.isTouch ? " pinch-zoom" : "") : "none", e === It && a(ae, r) }, Hn = { auto: 1, scroll: 1 }, tf = function(e) { var r = e.event, t = e.target, i = e.axis, n = (r.changedTouches ? r.changedTouches[0] : r).target, s = n._gsap || A.core.getCache(n), o = Ke(), l; if (!s._isScrollT || o - s._isScrollT > 2e3) { for (; n && n !== ae && (n.scrollHeight <= n.clientHeight && n.scrollWidth <= n.clientWidth || !(Hn[(l = Ft(n)).overflowY] || Hn[l.overflowX]));) n = n.parentNode; s._isScroll = n && n !== t && !qr(n) && (Hn[(l = Ft(n)).overflowY] || Hn[l.overflowX]), s.
```

### `i`
```js
function i(o) { e.contains(o.target) || a.contains(o.target) || a.click() } function n() { if (!a.hasAttribute("open")) { t.timeScale(1), t.play(), a.toggleAttribute("open"), document.addEventListener("click", i); return } t.timeScale(-1.5), a.toggleAttribute("open"), document.removeEventListener("click", i) } D.matchMedia().add("(min-width: 768px)", () => { D.set(".c-navbar", { backgroundColor: "rgba(1,1,48,.0)", backdropFilter: "blur(0px)", borderColor: "rgba(100, 239, 253, 0.0)", boxShadow: "0 0 2.5em rgba(31,53,255,.0)" }), D.set("[nav-logo]", { width: "6.5em" }), D.set("[nav-divider]", { width: "0px" }); const o = D.timeline({ scrollTrigger: { trigger: "body", start: Oa(80) + " top", ma
```

### `config`
```js
config: function(e, r) { e === void 0 && (e = 1); var t = 1 / e, i = e + (r ? 0 : 1), n = r ? 1 : 0, s = 1 - oe; return function(o) { return ((i * Oi(0, s, o) | 0) + n) * t } } }, ti.ease = Q["quad.out"], ut("onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt", function(a) { return ds += a + "," + a + "Params," }); var Jo = function(e, r) { this.id = Pl++, e._gsap = this, this.target = e, this.harness = r, this.get = r ? r.get : ko, this.set = r ? r.getSetter : Ps }, Fi = function() { function a(r) { this.vars = r, this._delay = +r.delay || 0, (this._repeat = r.repeat === 1 / 0 ? -2 : r.repeat || 0) && (this._rDelay = r.repeatDelay || 0, this._yoyo = !!r.yoyo || !!r.yoyoEase)
```

### `Jo`
```js
Jo = function(e, r) { this.id = Pl++, e._gsap = this, this.target = e, this.harness = r, this.get = r ? r.get : ko, this.set = r ? r.getSetter : Ps }, Fi = function() { function a(r) { this.vars = r, this._delay = +r.delay || 0, (this._repeat = r.repeat === 1 / 0 ? -2 : r.repeat || 0) && (this._rDelay = r.repeatDelay || 0, this._yoyo = !!r.yoyo || !!r.yoyoEase), this._ts = 1, si(this, +r.duration, 1, 1), this.data = r.data, le && (this._ctx = le, le.data.push(this)), Ri || xt.wake() } var e = a.prototype; return e.delay = function(t) { return t || t === 0 ? (this.parent && this.parent.smoothChildTiming && this.startTime(this._start + t - this._delay), this._delay = t, this) : this._delay }, 
```

### `render`
```js
render: function(e, r) { for (var t = r._pt; t;) Ue ? t.set(t.t, t.p, t.b, t) : t.r(e, t.d), t = t._next } }, { name: "endArray", init: function(e, r) { for (var t = r.length; t--;) this.add(e, t, e[t] || 0, r[t], 0, 0, 0, 0, 0, 1) } }, As("roundProps", vs), As("modifiers"), As("snap", No)) || wn; ke.version = Je.version = ct.version = "3.12.5", xo = 1, ns() && ai(), Q.Power0, Q.Power1, Q.Power2, Q.Power3, Q.Power4, Q.Linear, Q.Quad, Q.Cubic, Q.Quart, Q.Quint, Q.Strong, Q.Elastic, Q.Back, Q.SteppedEase, Q.Bounce, Q.Sine, Q.Expo, Q.Circ; /*! * CSSPlugin 3.12.5 * https://gsap.com * * Copyright 2008-2024, GreenSock. All rights reserved. * Subject to the terms at https://gsap.com/standard-licens
```

### `init`
```js
init: function(e, r) { for (var t = r.length; t--;) this.add(e, t, e[t] || 0, r[t], 0, 0, 0, 0, 0, 1) } }, As("roundProps", vs), As("modifiers"), As("snap", No)) || wn; ke.version = Je.version = ct.version = "3.12.5", xo = 1, ns() && ai(), Q.Power0, Q.Power1, Q.Power2, Q.Power3, Q.Power4, Q.Linear, Q.Quad, Q.Cubic, Q.Quart, Q.Quint, Q.Strong, Q.Elastic, Q.Back, Q.SteppedEase, Q.Bounce, Q.Sine, Q.Expo, Q.Circ; /*! * CSSPlugin 3.12.5 * https://gsap.com * * Copyright 2008-2024, GreenSock. All rights reserved. * Subject to the terms at https://gsap.com/standard-license or for * Club GSAP members, the agreement issued with that membership. * @author: Jack Doyle, jack@greensock.com */ var ua, pr, 
```

### `Ca`
```js
Ca = function(e, r) { var t = r || this, i = t.xPercent, n = t.yPercent, s = t.x, o = t.y, l = t.z, u = t.rotation, f = t.rotationY, h = t.rotationX, _ = t.skewX, c = t.skewY, p = t.scaleX, d = t.scaleY, g = t.transformPerspective, v = t.force3D, y = t.target, b = t.zOrigin, x = "", S = v === "auto" && e && e !== 1 || v === !0; if (b && (h !== Br || f !== Br)) { var k = parseFloat(f) * ui, w = Math.sin(k), M = Math.cos(k), C; k = parseFloat(h) * ui, C = Math.cos(k), s = qs(y, s, w * C * -b), o = qs(y, o, -Math.sin(k) * -b), l = qs(y, l, M * C * -b + b) } g !== Bi && (x += "perspective(" + g + Nr), (i || n) && (x += "translate(" + i + "%, " + n + "%) "), (S || s !== Bi || o !== 
```

### `Iu`
```js
Iu = function(e, r) { var t = r || this, i = t.xPercent, n = t.yPercent, s = t.x, o = t.y, l = t.rotation, u = t.skewX, f = t.skewY, h = t.scaleX, _ = t.scaleY, c = t.target, p = t.xOrigin, d = t.yOrigin, g = t.xOffset, v = t.yOffset, y = t.forceCSS, b = parseFloat(s), x = parseFloat(o), S, k, w, M, C; l = parseFloat(l), u = parseFloat(u), f = parseFloat(f), f && (f = parseFloat(f), u += f, l += f), l || u ? (l *= ui, u *= ui, S = Math.cos(l) * h, k = Math.sin(l) * h, w = Math.sin(l - u) * -_, M = Math.cos(l - u) * _, u && (f *= ui, C = Math.tan(u - f), C = Math.sqrt(1 + C * C), w *= C, M *= C, f && (C = Math.tan(f), C = Math.sqrt(1 + C * C), S *= C, k *= C)), S = ve(S), k = ve(k), w = ve(w)
```

### `dt`
```js
dt = function(e, r) { return (r && r._ctx && r._ctx.selector || Ye.utils.toArray)(e)[0] || (typeof e == "string" && Ye.config().nullTargetWarn !== !1 ? console.warn("Element not found:", e) : null) }, br = function(e, r) { var t = r.s, i = r.sc; qi(e) && (e = yr.scrollingElement || vr); var n = W.indexOf(e), s = i === Oe.sc ? 1 : 2; !~n && (n = W.push(e) - 1), W[n + s] || et(e, "scroll", Xs); var o = W[n + s], l = o || (W[n + s] = Mn(xr(e, t), !0) || (qi(e) ? i : Mn(function(u) { return arguments.length ? e[t] = u : e[t] }))); return l.target = e, o || (l.smooth = Ye.getProperty(e, "scrollBehavior") === "smooth"), l }, Vs = function(e, r, t) { var i = e, n = e, s = Yi(), o = s, l = r || 50, 
```

### `br`
```js
br = function(e, r) { var t = r.s, i = r.sc; qi(e) && (e = yr.scrollingElement || vr); var n = W.indexOf(e), s = i === Oe.sc ? 1 : 2; !~n && (n = W.push(e) - 1), W[n + s] || et(e, "scroll", Xs); var o = W[n + s], l = o || (W[n + s] = Mn(xr(e, t), !0) || (qi(e) ? i : Mn(function(u) { return arguments.length ? e[t] = u : e[t] }))); return l.target = e, o || (l.smooth = Ye.getProperty(e, "scrollBehavior") === "smooth"), l }, Vs = function(e, r, t) { var i = e, n = e, s = Yi(), o = s, l = r || 50, u = Math.max(500, l * 3), f = function(p, d) { var g = Yi(); d || g - s > l ? (n = i, i = p, o = s, s = g) : t ? i += p : i = n + (p - n) / (g - o) * (s - o) }, h = function() { n = i = t ? 0 : i, o = 
```

### `no`
```js
no = function(e) { var r = A.utils.snap(e), t = Array.isArray(e) && e.slice(0).sort(function(i, n) { return i - n }); return t ? function(i, n, s) { s === void 0 && (s = .001); var o; if (!n) return r(i); if (n > 0) { for (i -= s, o = 0; o < t.length; o++) if (t[o] >= i) return t[o]; return t[o - 1] } else for (o = t.length, i += s; o--;) if (t[o] <= i) return t[o]; return t[0] } : function(i, n, s) { s === void 0 && (s = .001); var o = r(i); return !n || Math.abs(o - i) < s || o - i < 0 == n < 0 ? o : r(n < 0 ? i - e : i + e) } }, Hu = function(e) { return function(r, t) { return no(nl(e))(r, t.direction) } }, zn = function(e, r, t, i) { return t.split(",").forEach(functio
```

### `Qu`
```js
Qu = function() { if (fl !== Wr) { var e = fl = Wr; requestAnimationFrame(function() { return e === Wr && Hr(!0) }) } }, cl = function() { ae.appendChild(gi), Qs = !nt && gi.offsetHeight || Z.innerHeight, ae.removeChild(gi) }, hl = function(e) { return Xi(".gsap-marker-start, .gsap-marker-end, .gsap-marker-scroller-start, .gsap-marker-scroller-end").forEach(function(r) { return r.style.display = e ? "none" : "block" }) }, Hr = function(e, r) { if (Dt && !e && !Dn) { Fe(V, "scrollEnd", al); return } cl(), ot = V.isRefreshing = !0, W.forEach(function(i) { return st(i) && ++i.cacheID && (i.rec = i()) }); var t = Gr("refreshInit"); Xa && V.sort(), r || ao(), W.forEach(function(i) { st(i) && (i.s
```
