# betr.app — engineering

App bundles beautified: **2**  
JSON endpoints captured: **0**  
Client functions passing filter: **3**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `nt`
```js
nt = (s, o) => { let n = s.getAttribute(o); return n ? K(n) : void 0 }; var h = `fs-${_}`, kt = "click", Kt = "copy-this", Vt = "copy-sibling", Dt = "text", Ft = "message", $t = "duration", jt = "active", $ = { element: { key: `${h}-element`, values: { trigger: kt, target: W(Kt), sibling: Vt } }, text: { key: `${h}-${Dt}` }, successMessage: { key: `${h}-${Ft}` }, successDuration: { key: `${h}-${$t}` }, successClass: { key: `${h}-${jt}` } }, [ot, j] = O($), st = 1e3, it = `${h}_active`; var ut = Ut(ct(), 1), at = ({ trigger: s, textToCopy: o, target: n, textNode: r, originalText: e, successMessage: t, successDuration: c, successClass
```

### `tt`
```js
tt = (s, o) => { for (let n of o) { if (s[n]) continue; s[n] = {}; let r = s[n]; r.loading = new Promise(e => { r.resolve = t => { e(t), delete r.resolve } }) } }, Bt = s => { let o = Array.isArray(window.fsAttributes) ? window.fsAttributes : []; s.push(...o) }; var rt = "1.7.0"; var nt = (s, o) => { let n = s.getAttribute(o); return n ? K(n) : void 0 }; var h = `fs-${_}`, kt = "click", Kt = "copy-this", Vt = "copy-sibling", Dt = "text", Ft = "message", $t = "duration", jt = "active", $ = { element: { key: `${h}-element`, values: { trigger: kt, target: W(Kt), sibling: Vt } }, text: { key: `${h}-${Dt}` }, successMessage: { key: `${h}-${F
```

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || E], d = v.call(e, "type") ? e.type : e, h = v.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || E, 3 !== n.nodeType && 8 !== n.nodeType && !bt.test(d + S.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[S.expando] ? e : new S.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : S.makeArray(t, [e]), c = S.event.special[d
```
