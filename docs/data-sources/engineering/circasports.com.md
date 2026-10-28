# circasports.com — engineering

App bundles beautified: **4**  
JSON endpoints captured: **0**  
Client functions passing filter: **14**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
```

### `uwsClickListener`
```js
function uwsClickListener(uvselector, uvhandler) { document.addEventListener("click", function(e) { for (var target = e.target; target && target != this; target = target.parentNode) { if (target.matches(uvselector)) { uvhandler.call(target, e); break; } } }, false); } //Change Listener function uwsChangeListener(uvselector, uvhandler) { document.addEventListener("change", function(e) { for (var target = e.target; target && target != this; target = target.parentNode) { if (target.matches(uvselector)) { uvhandler.call(target, e); break; } } }, false); } /*Popups Functions*/ function uwsCreatePop(uvpopname) { let uvpopelem = document.createElement("div"); uvpopelem.id = uvpopname; uvpopelem.cla
```

### `uwsChangeListener`
```js
function uwsChangeListener(uvselector, uvhandler) { document.addEventListener("change", function(e) { for (var target = e.target; target && target != this; target = target.parentNode) { if (target.matches(uvselector)) { uvhandler.call(target, e); break; } } }, false); } /*Popups Functions*/ function uwsCreatePop(uvpopname) { let uvpopelem = document.createElement("div"); uvpopelem.id = uvpopname; uvpopelem.classList.add("uws-pop-cont", "uws-integration"); let uvpopelemtab = document.createElement("div"); uvpopelemtab.classList.add("uws-pop-cont-tab"); let uvpopelemcell = document.createElement("div"); uvpopelemcell.classList.add("uws-pop-cont-cell"); let uvpopelembox = document.createElement
```

### `uwsClearPopup`
```js
function uwsClearPopup(uvpoptarget, uvpopcontent) { uvpopcontent = (uvpopcontent != undefined) ? uvpopcontent : ""; let uvpopchargetarget = uvpoptarget.querySelectorAll(".uws-pop-charge"); uvpopchargetarget = uvpopchargetarget[0]; if (uvpopchargetarget != undefined) { uvpopchargetarget.innerHTML = ""; uvpopchargetarget.insertAdjacentHTML("beforeend", uvpopcontent); } } /*allow only numbers on phone*/ function uwsPhoneInputFromat(event) { var inputField = event.target; var newValue = inputField.value.replace(/[^0-9]/g, ''); inputField.value = newValue; } //Set cookie function uwsSetCookie(uvname, uvvalue, uvdays) { var uvexpires = ""; if (uvdays) { var uvdate = new Date(); uvdate.setTime(uvda
```

### `uwsPhoneInputFromat`
```js
function uwsPhoneInputFromat(event) { var inputField = event.target; var newValue = inputField.value.replace(/[^0-9]/g, ''); inputField.value = newValue; } //Set cookie function uwsSetCookie(uvname, uvvalue, uvdays) { var uvexpires = ""; if (uvdays) { var uvdate = new Date(); uvdate.setTime(uvdate.getTime() + (uvdays * 24 * 60 * 60 * 1000)); uvexpires = "; expires=" + uvdate.toUTCString(); } document.cookie = uvname + "=" + (uvvalue || "") + uvexpires + "; path=/"; } //Get cookie function uwsGetCookie(uvname) { var uvnameEQ = uvname + "="; var ca = document.cookie.split(';'); for (var i = 0; i < ca.length; i++) { var c = ca[i]; while (c.charAt(0) == ' ') c = c.substring(1, c.length); if (c.i
```

### `init`
```js
init: function() { var e, t = this._event, n = this._wrapper.overrides, i = t.pageX, r = t.pageY, s = this._currentTarget; this.altKey = t.altKey, this.ctrlKey = t.ctrlKey, this.metaKey = t.metaKey, this.shiftKey = t.shiftKey, this.type = n && n.type || t.type, this.clientX = t.clientX, this.clientY = t.clientY, this.pageX = i, this.pageY = r, e = t.keyCode || t.charCode, $.webkit && e in E && (e = E[e]), this.keyCode = e, this.charCode = e, this.which = t.which || t.charCode || e, this.button = this.which, this.target = A(t.target), this.currentTarget = A(s), this.relatedTarget = A(t.relatedTarget), ("mousewheel" == t.type || "DOMMouseScroll" == t.type) && (this.wheelDelta = t.detail ? -1 *
```

### `toString`
```js
toString: function() { return this.name + "[" + this.get("id") + "]" }, DEF_UNIT: "px", DEF_PARENT_NODE: null, CONTENT_TEMPLATE: E, BOUNDING_TEMPLATE: E, _guid: function() { return e.guid() }, _validTabIndex: function(e) { return i.isNumber(e) || i.isNull(e) }, _bindAttrUI: function(e) { var t, n = e.length; for (t = 0; t < n; t++) this.after(e[t] + "Change", this._setAttrUI) }, _syncAttrUI: function(e) { var t, n, i = e.length; for (t = 0; t < i; t++) this[T + o(n = e[t])](this.get(n)) }, _setAttrUI: function(e) { e.target === this && this[T + o(e.attrName)](e.newVal, e.src) }, _strSetter: function(t) { return e.merge(this.get(_), t) }, getString: function(e) { return this.get(_)[e] }, getS
```

### `_guid`
```js
_guid: function() { return e.guid() }, _validTabIndex: function(e) { return i.isNumber(e) || i.isNull(e) }, _bindAttrUI: function(e) { var t, n = e.length; for (t = 0; t < n; t++) this.after(e[t] + "Change", this._setAttrUI) }, _syncAttrUI: function(e) { var t, n, i = e.length; for (t = 0; t < i; t++) this[T + o(n = e[t])](this.get(n)) }, _setAttrUI: function(e) { e.target === this && this[T + o(e.attrName)](e.newVal, e.src) }, _strSetter: function(t) { return e.merge(this.get(_), t) }, getString: function(e) { return this.get(_)[e] }, getStrings: function() { return this.get(_) }, _UI_ATTRS: { BIND: S, SYNC: S } }), e.Widget = q }, "3.18.1", { requires: ["attribute", "event-focus", 
```

### `_validTabIndex`
```js
_validTabIndex: function(e) { return i.isNumber(e) || i.isNull(e) }, _bindAttrUI: function(e) { var t, n = e.length; for (t = 0; t < n; t++) this.after(e[t] + "Change", this._setAttrUI) }, _syncAttrUI: function(e) { var t, n, i = e.length; for (t = 0; t < i; t++) this[T + o(n = e[t])](this.get(n)) }, _setAttrUI: function(e) { e.target === this && this[T + o(e.attrName)](e.newVal, e.src) }, _strSetter: function(t) { return e.merge(this.get(_), t) }, getString: function(e) { return this.get(_)[e] }, getStrings: function() { return this.get(_) }, _UI_ATTRS: { BIND: S, SYNC: S } }), e.Widget = q }, "3.18.1", { requires: ["attribute", "event-focus", "base-base", "base-pluginhost", "node-base", "n
```

### `_bindAttrUI`
```js
_bindAttrUI: function(e) { var t, n = e.length; for (t = 0; t < n; t++) this.after(e[t] + "Change", this._setAttrUI) }, _syncAttrUI: function(e) { var t, n, i = e.length; for (t = 0; t < i; t++) this[T + o(n = e[t])](this.get(n)) }, _setAttrUI: function(e) { e.target === this && this[T + o(e.attrName)](e.newVal, e.src) }, _strSetter: function(t) { return e.merge(this.get(_), t) }, getString: function(e) { return this.get(_)[e] }, getStrings: function() { return this.get(_) }, _UI_ATTRS: { BIND: S, SYNC: S } }), e.Widget = q }, "3.18.1", { requires: ["attribute", "event-focus", "base-base", "base-pluginhost", "node-base", "node-style", "classnamemanager"], skinnable: !0 }), YUI.add("widget-ht
```

### `_syncAttrUI`
```js
_syncAttrUI: function(e) { var t, n, i = e.length; for (t = 0; t < i; t++) this[T + o(n = e[t])](this.get(n)) }, _setAttrUI: function(e) { e.target === this && this[T + o(e.attrName)](e.newVal, e.src) }, _strSetter: function(t) { return e.merge(this.get(_), t) }, getString: function(e) { return this.get(_)[e] }, getStrings: function() { return this.get(_) }, _UI_ATTRS: { BIND: S, SYNC: S } }), e.Widget = q }, "3.18.1", { requires: ["attribute", "event-focus", "base-base", "base-pluginhost", "node-base", "node-style", "classnamemanager"], skinnable: !0 }), YUI.add("widget-htmlparser", function(e) { var t = e.Widget, n = e.Node, i = e.Lang, r = "srcNode"; t.HTML_PARSER = {}, t._buildCfg = { ag
```

### `_setAttrUI`
```js
_setAttrUI: function(e) { e.target === this && this[T + o(e.attrName)](e.newVal, e.src) }, _strSetter: function(t) { return e.merge(this.get(_), t) }, getString: function(e) { return this.get(_)[e] }, getStrings: function() { return this.get(_) }, _UI_ATTRS: { BIND: S, SYNC: S } }), e.Widget = q }, "3.18.1", { requires: ["attribute", "event-focus", "base-base", "base-pluginhost", "node-base", "node-style", "classnamemanager"], skinnable: !0 }), YUI.add("widget-htmlparser", function(e) { var t = e.Widget, n = e.Node, i = e.Lang, r = "srcNode"; t.HTML_PARSER = {}, t._buildCfg = { aggregates: ["HTML_PARSER"] }, t.ATTRS[r] = { value: null, setter: n.one, getter: "_getSrcNode", writeOnce: !0 }, e
```

### `_destroyChildren`
```js
_destroyChildren: function() { this._hDestroyChild.detach(), this.each(function(e) { e.destroy() }) } }, e.augment(r, e.ArrayList), e.WidgetParent = r }, "3.18.1", { requires: ["base-build", "arraylist", "widget"] }), YUI.add("widget-child", function(e) { var t = e.Lang; function n() { e.after(this._syncUIChild, this, "syncUI"), e.after(this._bindUIChild, this, "bindUI") } n.ATTRS = { selected: { value: 0, validator: t.isNumber }, index: { readOnly: !0, getter: function() { var e = this.get("parent"), t = -1; return e && (t = e.indexOf(this)), t } }, parent: { readOnly: !0 }, depth: { readOnly: !0, getter: function() { for (var e = this.get("parent"), t = this.get("root"), n =
```

### `_applyFilter`
```js
_applyFilter = function(t, n, r) { var s = n[0], o = r.el, u = s.target || s.srcElement, l = [], c = !1; if (3 === u.nodeType && (u = u.parentNode), n.unshift(u), i(t)) for (; u && (c = u === o, a(u, t, c ? null : o) && l.push(u), !c);) u = u.parentNode; else { for (n[0] = e.one(u), n[1] = new e.DOMEventFacade(s, o, r); u && (t.apply(n[0], n) && l.push(u), u !== o);) u = u.parentNode, n[0] = e.one(u); n[1] = s } return l.length <= 1 && (l = l[0]), n.shift(), l }, e.delegate = e.Event.delegate = u }, "3.18.1", { requires: ["node-base"] }), YUI.add("node-event-delegate", function(e) { e.Node.prototype.delegate = function(t) { var n = e.Array(arguments, 0, !0), i = e.Lang.isObject(t) && !e.Lang
```
