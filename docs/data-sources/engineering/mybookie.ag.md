# mybookie.ag — engineering

App bundles beautified: **4**  
JSON endpoints captured: **0**  
Client functions passing filter: **8**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `w`
```js
function w(e) { const a = new FormData(e); e.wpcf7 = { id: t(a.get("_wpcf7")), status: e.getAttribute("data-status"), pluginVersion: a.get("_wpcf7_version"), locale: a.get("_wpcf7_locale"), unitTag: a.get("_wpcf7_unit_tag"), containerPost: t(a.get("_wpcf7_container_post")), parent: e.closest(".wpcf7"), get schema() { return wpcf7.schemas.get(this.id) } }, wpcf7.schemas.set(e.wpcf7.id, void 0), e.querySelectorAll(".has-spinner").forEach((e => { e.insertAdjacentHTML("afterend", '<span class="wpcf7-spinner"></span>') })), (e => { e.querySelectorAll(".wpcf7-exclusive-checkbox").forEach((t => { t.addEventListener("change", (t => { const a = t.target.getAttribute("name"); e.querySelectorAll(`input
```

### `o`
```js
function o(e, t = {}) { const { target: a, scope: r = e, ...c } = t; if (void 0 === e.wpcf7?.schema) return; const o = { ...e.wpcf7.schema }; if (void 0 !== a) { if (!e.contains(a)) return; if (!a.closest(".wpcf7-form-control-wrap[data-name]")) return; if (a.closest(".novalidate")) return } const p = r.querySelectorAll(".wpcf7-form-control-wrap"), d = Array.from(p).reduce(((e, t) => (t.closest(".novalidate") || t.querySelectorAll(":where( input, textarea, select ):enabled").forEach((t => { if (t.name) switch (t.type) { case "button": case "image": case "reset": case "submit": break; case "checkbox": case "radio": t.checked && e.append(t.name, t.value); break; case "select-multiple": fo
```

### `a`
```js
a = (e, a) => { const n = t(e.getAttribute("data-starting-value")), r = t(e.getAttribute("data-maximum-value")), c = t(e.getAttribute("data-minimum-value")), o = e.classList.contains("down") ? n - a.value.trim().length : a.value.trim().length; e.setAttribute("data-current-value", o), e.innerText = o, r && r < a.value.length ? e.classList.add("too-long") : e.classList.remove("too-long"), c && a.value.length < c ? e.classList.add("too-short") : e.classList.remove("too-short") }, n = t => { t = { init: !1, ...t }, e.querySelectorAll(".wpcf7-character-count").forEach((n => { const r = n.getAttribute("data-target-name"), c = e.querySelector(`[name="${r}"]`); c && (c.value = c.defaultValue, a(n, c
```

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
```

### `reinitializeState`
```js
reinitializeState = function() { this.pos = 0 }, e.prototype.encodeSharedRef = function(e) { return this.reinitializeState(), this.doEncode(e, 1), this.bytes.subarray(0, this.pos) }, e.prototype.encode = function(e) { return this.reinitializeState(), this.doEncode(e, 1), this.bytes.slice(0, this.pos) }, e.prototype.doEncode = function(e, t) { if (t > this.maxDepth) throw new Error("Too deep objects in depth ".concat(t)); null == e ? this.encodeNil() : "boolean" == typeof e ? this.encodeBoolean(e) : "number" == typeof e ? this.encodeNumber(e) : "string" == typeof e ? this.encodeString(e) : this.encodeObject(e, t) }, e.prototype.ensureBufferSizeToWrite = function(e) { var t = this.pos + e; thi
```

### `encodeSharedRef`
```js
encodeSharedRef = function(e) { return this.reinitializeState(), this.doEncode(e, 1), this.bytes.subarray(0, this.pos) }, e.prototype.encode = function(e) { return this.reinitializeState(), this.doEncode(e, 1), this.bytes.slice(0, this.pos) }, e.prototype.doEncode = function(e, t) { if (t > this.maxDepth) throw new Error("Too deep objects in depth ".concat(t)); null == e ? this.encodeNil() : "boolean" == typeof e ? this.encodeBoolean(e) : "number" == typeof e ? this.encodeNumber(e) : "string" == typeof e ? this.encodeString(e) : this.encodeObject(e, t) }, e.prototype.ensureBufferSizeToWrite = function(e) { var t = this.pos + e; this.view.byteLength < t && this.resizeBuffer(2 * t) }, e.protot
```

### `encode`
```js
encode = function(e) { return this.reinitializeState(), this.doEncode(e, 1), this.bytes.slice(0, this.pos) }, e.prototype.doEncode = function(e, t) { if (t > this.maxDepth) throw new Error("Too deep objects in depth ".concat(t)); null == e ? this.encodeNil() : "boolean" == typeof e ? this.encodeBoolean(e) : "number" == typeof e ? this.encodeNumber(e) : "string" == typeof e ? this.encodeString(e) : this.encodeObject(e, t) }, e.prototype.ensureBufferSizeToWrite = function(e) { var t = this.pos + e; this.view.byteLength < t && this.resizeBuffer(2 * t) }, e.prototype.resizeBuffer = function(e) { var t = new ArrayBuffer(e), n = new Uint8Array(t), r = new DataView(t); n.set(this.bytes), this.view 
```

### `doEncode`
```js
doEncode = function(e, t) { if (t > this.maxDepth) throw new Error("Too deep objects in depth ".concat(t)); null == e ? this.encodeNil() : "boolean" == typeof e ? this.encodeBoolean(e) : "number" == typeof e ? this.encodeNumber(e) : "string" == typeof e ? this.encodeString(e) : this.encodeObject(e, t) }, e.prototype.ensureBufferSizeToWrite = function(e) { var t = this.pos + e; this.view.byteLength < t && this.resizeBuffer(2 * t) }, e.prototype.resizeBuffer = function(e) { var t = new ArrayBuffer(e), n = new Uint8Array(t), r = new DataView(t); n.set(this.bytes), this.view = r, this.bytes = n }, e.prototype.encodeNil = function() { this.writeU8(192) }, e.prototype.encodeBoolean = function(e) {
```
