# prizepicks.com — engineering

App bundles beautified: **2**  
JSON endpoints captured: **0**  
Client functions passing filter: **29**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `Nd`
```js
function Nd(t) { t.translate && (t.removeProperty("translate"), t.removeProperty("scale"), t.removeProperty("rotate")) } function Od() { var t, e, r = this.props, i = this.target, n = i.style, a = i._gsap; for (t = 0; t < r.length; t += 3) r[t + 1] ? 2 === r[t + 1] ? i[r[t]](r[t + 2]) : i[r[t]] = r[t + 2] : r[t + 2] ? n[r[t]] = r[t + 2] : n.removeProperty("--" === r[t].substr(0, 2) ? r[t] : r[t].replace(cr, "-$1").toLowerCase()); if (this.tfm) { for (e in this.tfm) a[e] = this.tfm[e]; a.svg && (a.renderTransform(), i.setAttribute("data-svg-origin", this.svgo || "")), (t = je()) && t.isStart || n[mr] || (Nd(n), a.zOrigin && n[gr] && (n[gr] += " " + a.zOrigin + "px", a.zOrigin = 0, a.renderTra
```

### `Od`
```js
function Od() { var t, e, r = this.props, i = this.target, n = i.style, a = i._gsap; for (t = 0; t < r.length; t += 3) r[t + 1] ? 2 === r[t + 1] ? i[r[t]](r[t + 2]) : i[r[t]] = r[t + 2] : r[t + 2] ? n[r[t]] = r[t + 2] : n.removeProperty("--" === r[t].substr(0, 2) ? r[t] : r[t].replace(cr, "-$1").toLowerCase()); if (this.tfm) { for (e in this.tfm) a[e] = this.tfm[e]; a.svg && (a.renderTransform(), i.setAttribute("data-svg-origin", this.svgo || "")), (t = je()) && t.isStart || n[mr] || (Nd(n), a.zOrigin && n[gr] && (n[gr] += " " + a.zOrigin + "px", a.zOrigin = 0, a.renderTransform()), a.uncache = 1) } } function Pd(t, e) { var r = { target: t, props: [], revert: Od, save: Md }; return t._gsap 
```

### `config`
```js
config: function config(t, e) { void 0 === t && (t = 1); var r = 1 / t, i = t + (e ? 0 : 1), n = e ? 1 : 0; return function(t) { return ((i * Mt(0, .99999999, t) | 0) + n) * r } } }, j.ease = Bt["quad.out"], ja("onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt", function(t) { return Tt += t + "," + t + "Params," }); var Vt, Xt = function GSCache(t, e) { this.id = W++, (t._gsap = this).target = t, this.harness = e, this.get = e ? e.get : ia, this.set = e ? e.getSetter : ue }, qt = ((Vt = Animation.prototype).delay = function delay(t) { return t || 0 === t ? (this.parent && this.parent.smoothChildTiming && this.startTime(this._start + t - this._delay), this._delay = t, this) 
```

### `Xt`
```js
Xt = function GSCache(t, e) { this.id = W++, (t._gsap = this).target = t, this.harness = e, this.get = e ? e.get : ia, this.set = e ? e.getSetter : ue }, qt = ((Vt = Animation.prototype).delay = function delay(t) { return t || 0 === t ? (this.parent && this.parent.smoothChildTiming && this.startTime(this._start + t - this._delay), this._delay = t, this) : this._delay }, Vt.duration = function duration(t) { return arguments.length ? this.totalDuration(0 < this._repeat ? t + (t + this._rDelay) * this._repeat : t) : this.totalDuration() && this._dur }, Vt.totalDuration = function totalDuration(t) { return arguments.length ? (this._dirty = 0, Ua(this, this._repeat < 0 ? t : (t - this._repeat * t
```

### `addEventListener`
```js
addEventListener: function addEventListener(t, e) { var r = Oe[t] || (Oe[t] = []); ~r.indexOf(e) || r.push(e) }, removeEventListener: function removeEventListener(t, e) { var r = Oe[t], i = r && r.indexOf(e); 0 <= i && r.splice(i, 1) }, utils: { wrap: function wrap(e, t, r) { var i = t - e; return K(e) ? ob(e, wrap(0, e.length), t) : Za(r, function(t) { return (i + (t - e) % i) % i + e }) }, wrapYoyo: function wrapYoyo(e, t, r) { var i = t - e, n = 2 * i; return K(e) ? ob(e, wrapYoyo(0, e.length - 1), t) : Za(r, function(t) { return e + (i < (t = (n + (t - e) % n) % n || 0) ? n - t : t) }) }, distribute: hb, random: kb, snap: jb, normalize: function normalize(t, e, r) { return St(t, e, 0, 1,
```

### `removeEventListener`
```js
removeEventListener: function removeEventListener(t, e) { var r = Oe[t], i = r && r.indexOf(e); 0 <= i && r.splice(i, 1) }, utils: { wrap: function wrap(e, t, r) { var i = t - e; return K(e) ? ob(e, wrap(0, e.length), t) : Za(r, function(t) { return (i + (t - e) % i) % i + e }) }, wrapYoyo: function wrapYoyo(e, t, r) { var i = t - e, n = 2 * i; return K(e) ? ob(e, wrapYoyo(0, e.length - 1), t) : Za(r, function(t) { return e + (i < (t = (n + (t - e) % n) % n || 0) ? n - t : t) }) }, distribute: hb, random: kb, snap: jb, normalize: function normalize(t, e, r) { return St(t, e, 0, 1, r) }, getUnit: _a, clamp: function clamp(e, r, t) { return Za(t, function(t) { return Mt(e, r, t) }) 
```

### `wrap`
```js
wrap: function wrap(e, t, r) { var i = t - e; return K(e) ? ob(e, wrap(0, e.length), t) : Za(r, function(t) { return (i + (t - e) % i) % i + e }) }, wrapYoyo: function wrapYoyo(e, t, r) { var i = t - e, n = 2 * i; return K(e) ? ob(e, wrapYoyo(0, e.length - 1), t) : Za(r, function(t) { return e + (i < (t = (n + (t - e) % n) % n || 0) ? n - t : t) }) }, distribute: hb, random: kb, snap: jb, normalize: function normalize(t, e, r) { return St(t, e, 0, 1, r) }, getUnit: _a, clamp: function clamp(e, r, t) { return Za(t, function(t) { return Mt(e, r, t) }) }, splitColor: Db, toArray: Pt, selector: fb, mapRange: St, pipe: function pipe() { for (var t = arguments.length, e = new Array
```

### `wrapYoyo`
```js
wrapYoyo: function wrapYoyo(e, t, r) { var i = t - e, n = 2 * i; return K(e) ? ob(e, wrapYoyo(0, e.length - 1), t) : Za(r, function(t) { return e + (i < (t = (n + (t - e) % n) % n || 0) ? n - t : t) }) }, distribute: hb, random: kb, snap: jb, normalize: function normalize(t, e, r) { return St(t, e, 0, 1, r) }, getUnit: _a, clamp: function clamp(e, r, t) { return Za(t, function(t) { return Mt(e, r, t) }) }, splitColor: Db, toArray: Pt, selector: fb, mapRange: St, pipe: function pipe() { for (var t = arguments.length, e = new Array(t), r = 0; r < t; r++) e[r] = arguments[r]; return function(t) { return e.reduce(function(t, e) { return e(t) }, t) } }, unitize: func
```

### `init`
```js
init: function init(t, e, r, i, n) { var a, s, o; for (a in this.tween = r, e) o = t.getAttribute(a) || "", (s = this.add(t, "setAttribute", (o || 0) + "", e[a], i, n, 0, 0, a)).op = a, s.b = o, this._props.push(a) }, render: function render(t, e) { for (var r = e._pt; r;) I ? r.set(r.t, r.p, r.b, r) : r.r(t, r.d), r = r._next } }, { name: "endArray", headless: 1, init: function init(t, e) { for (var r = e.length; r--;) this.add(t, r, t[r] || 0, e[r], 0, 0, 0, 0, 0, 1) } }, Nc("roundProps", ib), Nc("modifiers"), Nc("snap", jb)) || Ee; te.version = Gt.version = Fe.version = "3.15.0", o = 1, x() && Lt(); function xd(t, e) { return e.set(e.t, e.p, Math.round(1e4 * (e.s + e.c * t)) / 1e4 + e.u, 
```

### `render`
```js
render: function render(t, e) { for (var r = e._pt; r;) I ? r.set(r.t, r.p, r.b, r) : r.r(t, r.d), r = r._next } }, { name: "endArray", headless: 1, init: function init(t, e) { for (var r = e.length; r--;) this.add(t, r, t[r] || 0, e[r], 0, 0, 0, 0, 0, 1) } }, Nc("roundProps", ib), Nc("modifiers"), Nc("snap", jb)) || Ee; te.version = Gt.version = Fe.version = "3.15.0", o = 1, x() && Lt(); function xd(t, e) { return e.set(e.t, e.p, Math.round(1e4 * (e.s + e.c * t)) / 1e4 + e.u, e) } function yd(t, e) { return e.set(e.t, e.p, 1 === t ? e.e : Math.round(1e4 * (e.s + e.c * t)) / 1e4 + e.u, e) } function zd(t, e) { return e.set(e.t, e.p, t ? Math.round(1e4 * (e.s + e.c * t)) / 1e4 + e.u : e.b, e)
```

### `Bd`
```js
function Bd(t, e) { var r = e.s + e.c * t; e.set(e.t, e.p, ~~(r + (r < 0 ? -.5 : .5)) + e.u, e) } function Cd(t, e) { return e.set(e.t, e.p, t ? e.e : e.b, e) } function Dd(t, e) { return e.set(e.t, e.p, 1 !== t ? e.b : e.e, e) } function Ed(t, e, r) { return t.style[e] = r } function Fd(t, e, r) { return t.style.setProperty(e, r) } function Gd(t, e, r) { return t._gsap[e] = r } function Hd(t, e, r) { return t._gsap.scaleX = t._gsap.scaleY = r } function Id(t, e, r, i, n) { var a = t._gsap; a.scaleX = a.scaleY = r, a.renderTransform(n, a) } function Jd(t, e, r, i, n) { var a = t._gsap; a[e] = r, a.renderTransform(n, a) } function Md(t, e) { var r = this, i = this.target, n = i.style, a = i._
```

### `Rr`
```js
Rr = function _renderCSSTransforms(t, e) { var r = e || this, i = r.xPercent, n = r.yPercent, a = r.x, s = r.y, o = r.z, u = r.rotation, h = r.rotationY, l = r.rotationX, f = r.skewX, c = r.skewY, d = r.scaleX, p = r.scaleY, _ = r.transformPerspective, m = r.force3D, g = r.target, v = r.zOrigin, y = "", T = "auto" === m && t && 1 !== t || !0 === m; if (v && (l !== Ar || h !== Ar)) { var b, w = parseFloat(h) * lr, x = Math.sin(w), k = Math.cos(w); w = parseFloat(l) * lr, b = Math.cos(w), a = re(g, a, x * b * -v), s = re(g, s, -Math.sin(w) * -v), o = re(g, o, k * b * -v + v) } _ !== Dr && (y += "perspective(" + _ + zr), (i || n) && (y += "translate(" + i + "%, " + n + "%) "), !T && a === D
```

### `Er`
```js
Er = function _renderSVGTransforms(t, e) { var r, i, n, a, s, o = e || this, u = o.xPercent, h = o.yPercent, l = o.x, f = o.y, c = o.rotation, d = o.skewX, p = o.skewY, _ = o.scaleX, m = o.scaleY, g = o.target, v = o.xOrigin, y = o.yOrigin, T = o.xOffset, b = o.yOffset, w = o.forceCSS, x = parseFloat(l), k = parseFloat(f); c = parseFloat(c), d = parseFloat(d), (p = parseFloat(p)) && (d += p = parseFloat(p), c += p), c || d ? (c *= lr, d *= lr, r = Math.cos(c) * _, i = Math.sin(c) * _, n = Math.sin(c - d) * -m, a = Math.cos(c - d) * m, d && (p *= lr, s = Math.tan(d - p), n *= s = Math.sqrt(1 + s * s), a *= s, p && (s = Math.tan(p), r *= s = Math.sqrt(1 + s * s), i *= s)), r = ka(r), i = ka(i)
```

### `wc`
```js
function wc(e, t) { !0 === t ? e.style.removeProperty("touch-action") : e.style.touchAction = !0 === t ? "auto" : t ? "pan-" + t + (k.isTouch ? " pinch-zoom" : "") : "none", e === qe && wc(He, t) } function yc(e) { var t, r = e.event, n = e.target, i = e.axis, o = (r.changedTouches ? r.changedTouches[0] : r).target, a = o._gsap || Fe.core.getCache(o), s = at(); if (!a._isScrollT || 2e3 < s - a._isScrollT) { for (; o && o !== He && (o.scrollHeight <= o.clientHeight && o.scrollWidth <= o.clientWidth || !oe[(t = nb(o)).overflowY] && !oe[t.overflowX]);) o = o.parentNode; a._isScroll = o && o !== n && !Ma(o) && (oe[(t = nb(o)).overflowY] || oe[t.overflowX]), a._isScrollT = s }!a._isScroll && "x" 
```

### `se`
```js
se = function _captureInputs(e) { var t = ae.test(e.target.tagName); (t || ie) && (e._gsapAllow = !0, ie = t) }; ne.sort = function(e) { if (Ua(e)) return Tt.sort(e); var t = Je.pageYOffset || 0; return ne.getAll().forEach(function(e) { return e._sortY = e.trigger ? t + e.trigger.getBoundingClientRect().top : e.start + Je.innerHeight }), Tt.sort(e || function(e, t) { return -1e6 * (e.vars.refreshPriority || 0) + (e.vars.containerAnimation ? 1e6 : e._sortY) - ((t.vars.containerAnimation ? 1e6 : t._sortY) + -1e6 * (t.vars.refreshPriority || 0)) }) }, ne.observe = function(e) { return new k(e) }, ne.normalizeScroll = function(e) { if (void 0 === e) return v; if (!0 === e && v) return v.enable()
```

### `sort`
```js
sort = function(e) { if (Ua(e)) return Tt.sort(e); var t = Je.pageYOffset || 0; return ne.getAll().forEach(function(e) { return e._sortY = e.trigger ? t + e.trigger.getBoundingClientRect().top : e.start + Je.innerHeight }), Tt.sort(e || function(e, t) { return -1e6 * (e.vars.refreshPriority || 0) + (e.vars.containerAnimation ? 1e6 : e._sortY) - ((t.vars.containerAnimation ? 1e6 : t._sortY) + -1e6 * (t.vars.refreshPriority || 0)) }) }, ne.observe = function(e) { return new k(e) }, ne.normalizeScroll = function(e) { if (void 0 === e) return v; if (!0 === e && v) return v.enable(); if (!1 === e) return v && v.kill(), void(v = e); var t = e instanceof k ? e : Dc(e); return v && v.target === t.ta
```

### `vc`
```js
function vc(e, t, r, n) { return n < t ? e(n) : t < 0 && e(0), n < r ? (n - t) / (r - t) : r < 0 ? t / (t - r) : 1 } function wc(e, t) { !0 === t ? e.style.removeProperty("touch-action") : e.style.touchAction = !0 === t ? "auto" : t ? "pan-" + t + (k.isTouch ? " pinch-zoom" : "") : "none", e === qe && wc(He, t) } function yc(e) { var t, r = e.event, n = e.target, i = e.axis, o = (r.changedTouches ? r.changedTouches[0] : r).target, a = o._gsap || Fe.core.getCache(o), s = at(); if (!a._isScrollT || 2e3 < s - a._isScrollT) { for (; o && o !== He && (o.scrollHeight <= o.clientHeight && o.scrollWidth <= o.clientWidth || !oe[(t = nb(o)).overflowY] && !oe[t.overflowX]);) o = o.parentNode; a._isScro
```

### `J`
```js
function J(e, t) { return (t && t._ctx && t._ctx.selector || Se.utils.toArray)(e)[0] || ("string" == typeof e && !1 !== Se.config().nullTargetWarn ? console.warn("Element not found:", e) : null) } function L(t, e) { var r = e.s, n = e.sc; A(t) && (t = Me.scrollingElement || ke); var i = Ie.indexOf(t), o = n === Xe.sc ? 1 : 2; ~i || (i = Ie.push(t) - 1), Ie[i + o] || B(t, "scroll", F); var a = Ie[i + o], s = a || (Ie[i + o] = G(z(t, r), !0) || (A(t) ? n : G(function(e) { return arguments.length ? t[r] = e : t[r] }))); return s.target = t, a || (s.smooth = "smooth" === Se.getProperty(t, "scrollBehavior")), s } function M(e, t, i) { function Hd(e, t) { var r = Ye(); t || n < r - s ? (a = o, o =
```

### `L`
```js
function L(t, e) { var r = e.s, n = e.sc; A(t) && (t = Me.scrollingElement || ke); var i = Ie.indexOf(t), o = n === Xe.sc ? 1 : 2; ~i || (i = Ie.push(t) - 1), Ie[i + o] || B(t, "scroll", F); var a = Ie[i + o], s = a || (Ie[i + o] = G(z(t, r), !0) || (A(t) ? n : G(function(e) { return arguments.length ? t[r] = e : t[r] }))); return s.target = t, a || (s.smooth = "smooth" === Se.getProperty(t, "scrollBehavior")), s } function M(e, t, i) { function Hd(e, t) { var r = Ye(); t || n < r - s ? (a = o, o = e, l = s, s = r) : i ? o += e : o = a + (e - a) / (r - l) * (s - l) } var o = e, a = e, s = Ye(), l = s, n = t || 50, c = Math.max(500, 3 * n); return { update: Hd, reset: function reset() { a = o
```

### `tf`
```js
function tf(e) { if (!jf(e)) { var t = fe(), r = de(); mf((t - pe) * G, (r - ge) * G, 1), pe = t, ge = r, l && te.restart(!0) } } function uf(e) { if (!jf(e)) { e = N(e, s), q && (ie = !0); var t = (1 === e.deltaMode ? r : 2 === e.deltaMode ? Ce.innerHeight : 1) * f; mf(e.deltaX * t, e.deltaY * t, 0), l && !Y && te.restart(!0) } } function vf(e) { if (!jf(e)) { var t = e.clientX, r = e.clientY, n = t - se.x, i = r - se.y; se.x = t, se.y = r, ne = !0, l && te.restart(!0), (n || i) && nf(n, i) } } function wf(e) { se.event = e, R(se) } function xf(e) { se.event = e, D(se) } function yf(e) { return jf(e) || N(e, s) && V(se) } this.target = o = J(o) || ke, this.vars = e, u = u && Se.utils.toA
```

### `uf`
```js
function uf(e) { if (!jf(e)) { e = N(e, s), q && (ie = !0); var t = (1 === e.deltaMode ? r : 2 === e.deltaMode ? Ce.innerHeight : 1) * f; mf(e.deltaX * t, e.deltaY * t, 0), l && !Y && te.restart(!0) } } function vf(e) { if (!jf(e)) { var t = e.clientX, r = e.clientY, n = t - se.x, i = r - se.y; se.x = t, se.y = r, ne = !0, l && te.restart(!0), (n || i) && nf(n, i) } } function wf(e) { se.event = e, R(se) } function xf(e) { se.event = e, D(se) } function yf(e) { return jf(e) || N(e, s) && V(se) } this.target = o = J(o) || ke, this.vars = e, u = u && Se.utils.toArray(u), i = i || 1e-9, a = a || 0, f = f || 1, G = G || 1, t = t || "wheel,touch,pointer", n = !1 !== n, r = r || parseFloat(Ce.getC
```

### `vf`
```js
function vf(e) { if (!jf(e)) { var t = e.clientX, r = e.clientY, n = t - se.x, i = r - se.y; se.x = t, se.y = r, ne = !0, l && te.restart(!0), (n || i) && nf(n, i) } } function wf(e) { se.event = e, R(se) } function xf(e) { se.event = e, D(se) } function yf(e) { return jf(e) || N(e, s) && V(se) } this.target = o = J(o) || ke, this.vars = e, u = u && Se.utils.toArray(u), i = i || 1e-9, a = a || 0, f = f || 1, G = G || 1, t = t || "wheel,touch,pointer", n = !1 !== n, r = r || parseFloat(Ce.getComputedStyle(Ee).lineHeight) || 22; var ee, te, re, ne, ie, oe, ae, se = this, le = 0, ce = 0, ue = e.passive || !s && !1 !== e.passive, fe = L(o, Ne), de = L(o, Xe), pe = fe(), ge = de(), he = ~t.indexO
```

### `nb`
```js
function nb(e) { return Je.getComputedStyle(e.nodeType === Node.DOCUMENT_NODE ? e.scrollingElement : e) } function pb(e, t) { for (var r in t) r in e || (e[r] = t[r]); return e } function rb(e, t) { var r = t.d2; return e["offset" + r] || e["client" + r] || 0 } function sb(e) { var t, r = [], n = e.labels, i = e.duration(); for (t in n) r.push(n[t] / i); return r } function ub(i) { var o = Fe.utils.snap(i), a = Array.isArray(i) && i.slice(0).sort(function(e, t) { return e - t }); return a ? function(e, t, r) { var n; if (void 0 === r && (r = .001), !t) return o(e); if (0 < t) { for (e -= r, n = 0; n < a.length; n++) if (a[n] >= e) return a[n]; return a[n - 1] } for (n = a.length, e += r; n--
```

### `pb`
```js
function pb(e, t) { for (var r in t) r in e || (e[r] = t[r]); return e } function rb(e, t) { var r = t.d2; return e["offset" + r] || e["client" + r] || 0 } function sb(e) { var t, r = [], n = e.labels, i = e.duration(); for (t in n) r.push(n[t] / i); return r } function ub(i) { var o = Fe.utils.snap(i), a = Array.isArray(i) && i.slice(0).sort(function(e, t) { return e - t }); return a ? function(e, t, r) { var n; if (void 0 === r && (r = .001), !t) return o(e); if (0 < t) { for (e -= r, n = 0; n < a.length; n++) if (a[n] >= e) return a[n]; return a[n - 1] } for (n = a.length, e += r; n--;) if (a[n] <= e) return a[n]; return a[0] } : function(e, t, r) { void 0 === r && (r = .001); var n = o(e
```

### `rb`
```js
function rb(e, t) { var r = t.d2; return e["offset" + r] || e["client" + r] || 0 } function sb(e) { var t, r = [], n = e.labels, i = e.duration(); for (t in n) r.push(n[t] / i); return r } function ub(i) { var o = Fe.utils.snap(i), a = Array.isArray(i) && i.slice(0).sort(function(e, t) { return e - t }); return a ? function(e, t, r) { var n; if (void 0 === r && (r = .001), !t) return o(e); if (0 < t) { for (e -= r, n = 0; n < a.length; n++) if (a[n] >= e) return a[n]; return a[n - 1] } for (n = a.length, e += r; n--;) if (a[n] <= e) return a[n]; return a[0] } : function(e, t, r) { void 0 === r && (r = .001); var n = o(e); return !t || Math.abs(n - e) < r || n - e < 0 == t < 0 ? n : o(t < 0 ?
```

### `sb`
```js
function sb(e) { var t, r = [], n = e.labels, i = e.duration(); for (t in n) r.push(n[t] / i); return r } function ub(i) { var o = Fe.utils.snap(i), a = Array.isArray(i) && i.slice(0).sort(function(e, t) { return e - t }); return a ? function(e, t, r) { var n; if (void 0 === r && (r = .001), !t) return o(e); if (0 < t) { for (e -= r, n = 0; n < a.length; n++) if (a[n] >= e) return a[n]; return a[n - 1] } for (n = a.length, e += r; n--;) if (a[n] <= e) return a[n]; return a[0] } : function(e, t, r) { void 0 === r && (r = .001); var n = o(e); return !t || Math.abs(n - e) < r || n - e < 0 == t < 0 ? n : o(t < 0 ? e - i : e + i) } } function wb(t, r, e, n) { return e.split(",").forEach(function(
```

### `ub`
```js
function ub(i) { var o = Fe.utils.snap(i), a = Array.isArray(i) && i.slice(0).sort(function(e, t) { return e - t }); return a ? function(e, t, r) { var n; if (void 0 === r && (r = .001), !t) return o(e); if (0 < t) { for (e -= r, n = 0; n < a.length; n++) if (a[n] >= e) return a[n]; return a[n - 1] } for (n = a.length, e += r; n--;) if (a[n] <= e) return a[n]; return a[0] } : function(e, t, r) { void 0 === r && (r = .001); var n = o(e); return !t || Math.abs(n - e) < r || n - e < 0 == t < 0 ? n : o(t < 0 ? e - i : e + i) } } function wb(t, r, e, n) { return e.split(",").forEach(function(e) { return t(r, e, n) }) } function xb(e, t, r, n, i) { return e.addEventListener(t, r, { passive: !n, ca
```

### `q`
```js
q = function _positionMarker(e, t, r, n) { var i = { display: "block" }, o = r[n ? "os2" : "p2"], a = r[n ? "p2" : "os2"]; e._isFlipped = n, i[r.a + "Percent"] = n ? -100 : 0, i[r.a] = n ? "1px" : 0, i["border" + o + yt] = 1, i["border" + a + yt] = 0, i[r.p] = t + "px", Fe.set(e, i) }, Tt = [], Ct = {}, H = {}, W = [], V = function _dispatch(e) { return H[e] && H[e].map(function(e) { return e() }) || W }, j = [], Mt = 0, kt = function _refreshAll(e, t) { if (qe = Ue.documentElement, He = Ue.body, l = [Je, Ue, qe, He], !st || e || T) { $b(), rt = ne.isRefreshing = !0, T || Tb(); var r = V("refreshInit"); Qe && ne.sort(), t || Ub(), Ie.forEach(function(e) { Ua(e) && (e.smooth && (e.target.styl
```

### `_getLabelAtDirection`
```js
function _getLabelAtDirection(r) { return function(e, t) { return ub(sb(r))(e, t.direction) } }(O) : !1 !== ue.directional ? function(e, t) { return ub(ue.snapTo)(e, at() - Pe < 500 ? 0 : t.direction) } : Fe.utils.snap(ue.snapTo), g = ue.duration || { min: .1, max: 2 }, g = Wa(g) ? Ve(g.min, g.max) : Ve(g, g), te = Fe.delayedCall(ue.delay || i / 2 || .1, function() { var e = Ae(), t = at() - Pe < 500, r = A.tween; if (!(t || Math.abs(Te.getVelocity()) < 10) || r || Ke || Ee === e) Te.isActive && Ee !== e && te.restart(!0); else { var n, i, o = (e - B) / q, a = O && !ve ? O.totalProgress() : o, s = t ? 0 : (a - w) / (at() - Ge) * 1e3 || 0, l = Fe.utils.clamp(-o, 
```
