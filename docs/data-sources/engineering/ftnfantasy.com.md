# ftnfantasy.com — engineering

App bundles beautified: **3**  
JSON endpoints captured: **0**  
Client functions passing filter: **7**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
```

### `m`
```js
function m(t) { const a = new FormData(t); t.wpcf7 = { id: e(a.get("_wpcf7")), status: t.getAttribute("data-status"), pluginVersion: a.get("_wpcf7_version"), locale: a.get("_wpcf7_locale"), unitTag: a.get("_wpcf7_unit_tag"), containerPost: e(a.get("_wpcf7_container_post")), parent: t.closest(".wpcf7"), schema: void 0 }, t.querySelectorAll(".has-spinner").forEach((e => { e.insertAdjacentHTML("afterend", '<span class="wpcf7-spinner"></span>') })), (e => { e.querySelectorAll(".wpcf7-exclusive-checkbox").forEach((t => { t.addEventListener("change", (t => { const a = t.target.getAttribute("name"); e.querySelectorAll(`input[type="checkbox"][name="${a}"]`).forEach((e => { e !== t.target && (e.check
```

### `o`
```js
function o(e, t = {}) { var n; const { target: r, scope: o = e, ...l } = t; if (void 0 === e.wpcf7?.schema) return; const d = { ...e.wpcf7.schema }; if (void 0 !== r) { if (!e.contains(r)) return; if (!r.closest(".wpcf7-form-control-wrap[data-name]")) return; if (r.closest(".novalidate")) return } const p = new FormData, u = []; for (const e of o.querySelectorAll(".wpcf7-form-control-wrap")) if (!e.closest(".novalidate") && (e.querySelectorAll(":where( input, textarea, select ):enabled").forEach((e => { if (e.name) switch (e.type) { case "button": case "image": case "reset": case "submit": break; case "checkbox": case "radio": e.checked && p.append(e.name, e.value); break; 
```

### `a`
```js
a = (t, a) => { const n = e(t.getAttribute("data-starting-value")), r = e(t.getAttribute("data-maximum-value")), o = e(t.getAttribute("data-minimum-value")), c = t.classList.contains("down") ? n - a.value.length : a.value.length; t.setAttribute("data-current-value", c), t.innerText = c, r && r < a.value.length ? t.classList.add("too-long") : t.classList.remove("too-long"), o && a.value.length < o ? t.classList.add("too-short") : t.classList.remove("too-short") }, n = e => { e = { init: !1, ...e }, t.querySelectorAll(".wpcf7-character-count").forEach((n => { const r = n.getAttribute("data-target-name"), o = t.querySelector(`[name="${r}"]`); o && (o.value = o.defaultValue, a(n, o), e.init && o
```

### `q`
```js
function q() { !x && y.props.aria.expanded && oi(y.props.triggerTarget || e).forEach((function(e) { y.props.interactive ? e.setAttribute("aria-expanded", y.state.isVisible && e === C() ? "true" : "false") : e.removeAttribute("aria-expanded") })) } function j() { k().removeEventListener("mousemove", v), Mi = Mi.filter((function(e) { return e !== v })) } function N(t) { if (!fi.isTouch || !h && "mousedown" !== t.type) { var i = t.composedPath && t.composedPath()[0] || t.target; if (!y.props.interactive || !mi(_, i)) { if (oi(y.props.triggerTarget || e).some((function(e) { return mi(e, i) }))) { if (fi.isTouch) return; if (y.state.isVisible && y.props.trigger.indexOf("click") >= 0) return } els
```

### `FormValidation`
```js
FormValidation = function(e, t) { if (!e) return void console.error("Form should be provided"); let i; if ("string" == typeof e ? i = document.querySelector(e) : "object" == typeof e && "form" === e.tagName?.toLowerCase() && (i = e), e.getAttribute("novalidate") || e.setAttribute("novalidate", "novalidate"), !i) return void console.error("element should be HTMLFormElement or selector"); const n = i.querySelectorAll('button[type="submit"], .button-submit'); Array.from(n).forEach((e => { e?.disabled && (e.disabled = !1) })); const s = this, o = i.querySelector(".password input"), r = i.querySelector(".confirm-password input"), a = i.classList.contains("modal_reset-password"), l = {}; function 
```

### `c`
```js
function c(e) { return e && (e.stopPropagation(), e.stopImmediatePropagation(), l[e.target.name] = !0), o.value === r.value && r.value ? (r.parentElement.querySelector(".input-group__message").textContent = "", r.parentElement.classList.remove("error"), a && Array.from(n).forEach((e => { e?.disabled && (e.disabled = !0) })), a && Array.from(n).forEach((e => { e?.disabled && (e.disabled = !1) })), !0) : (r.parentElement.querySelector(".input-group__message").textContent = "Passwords must be the same", r.parentElement.classList.add("error"), a && Array.from(n).forEach((e => { e?.disabled && (e.disabled = !0) })), !1) } function d(e) { l[e.name] = !0; let t, i = !0, n = e.type, s = e.closest(".
```
