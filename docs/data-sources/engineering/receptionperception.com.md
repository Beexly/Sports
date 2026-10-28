# receptionperception.com — engineering

App bundles beautified: **6**  
JSON endpoints captured: **1**  
Client functions passing filter: **35**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://www.google.com/ccm/geo` | 75 |

## Response schemas

### `https://www.google.com/ccm/geo`
```
0: str
1: str
2: bool
3: str
4: str
5: bool
6: bool
9: bool
```

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
```

### `O`
```js
function O(t, e, a) { var r, n, i = 0 === t.type.indexOf("touch"), s = 0 === t.type.indexOf("mouse"), o = 0 === t.type.indexOf("pointer"); if (0 === t.type.indexOf("MSPointer") && (o = !0), i) { var l = function(t) { return t.target === a || a.contains(t.target) }; if ("touchstart" === t.type) { var u = Array.prototype.filter.call(t.touches, l); if (u.length > 1) return !1; r = u[0].pageX, n = u[0].pageY } else { var c = Array.prototype.find.call(t.changedTouches, l); if (!c) return !1; r = c.pageX, n = c.pageY } } return e = e || m(St), (s || o) && (r = t.clientX + e.x, n = t.clientY + e.y), t.pageOffset = e, t.points = [r, n], t.cursor = s || o, t } f
```

### `l`
```js
l = function(t) { return t.target === a || a.contains(t.target) }; if ("touchstart" === t.type) { var u = Array.prototype.filter.call(t.touches, l); if (u.length > 1) return !1; r = u[0].pageX, n = u[0].pageY } else { var c = Array.prototype.find.call(t.changedTouches, l); if (!c) return !1; r = c.pageX, n = c.pageY } } return e = e || m(St), (s || o) && (r = t.clientX + e.x, n = t.clientY + e.y), t.pageOffset = e, t.points = [r, n], t.cursor = s || o, t } function R(t) { var e = t - s(ut, a.ort), r = 100 * e / k(); return r = u(r), a.dir ? 100 - r : r } function N(t) { var e = 100, a = !1; return ct.forEach(function(r, n) { 
```

### `A`
```js
function A(t, e, a) { if (!e) return !0; a.xSteps[t] = y([a.xVal[t], a.xVal[t + 1]], e) / x(a.xPct[t], a.xPct[t + 1]); var r = (a.xVal[t + 1] - a.xVal[t]) / a.xNumSteps[t], n = Math.ceil(Number(r.toFixed(3)) - 1), i = a.xVal[t] + a.xNumSteps[t] * n; a.xHighestCompleteStep[t] = i } function P(t, e, a) { this.xPct = [], this.xVal = [], this.xSteps = [a || !1], this.xNumSteps = [!1], this.xHighestCompleteStep = [], this.snap = e; var r, n = []; for (r in t) t.hasOwnProperty(r) && n.push([t[r], r]); for (n.length && "object" == typeof n[0][0] ? n.sort(function(t, e) { return t[0][0] - e[0][0] }) : n.sort(function(t, e) { return t[0] - e[0] }), r = 0; r < n.length; r++) E(n[r][1], n[r][0], this);
```

### `f`
```js
function f(t, e) { var r = o(t, a.cssClasses.origin), n = o(r, a.cssClasses.handle); return n.setAttribute("data-handle", e), n.setAttribute("tabindex", "0"), n.setAttribute("role", "slider"), n.setAttribute("aria-orientation", a.ort ? "vertical" : "horizontal"), 0 === e ? d(n, a.cssClasses.handleLower) : e === a.handles - 1 && d(n, a.cssClasses.handleUpper), r } function x(t, e) { return !!e && o(t, a.cssClasses.connect) } function y(t, e) { var r = o(e, a.cssClasses.connects); ct = [], ft = [], ft.push(x(r, t[0])); for (var n = 0; n < a.handles; n++) ct.push(f(e, n)), xt[n] = n, ft.push(x(r, t[n + 1])) } function b(t) { d(t, a.cssClasses.target), 0 === a.dir ? d(t, a.cssClasses.ltr) : d(t,
```

### `R`
```js
function R(t) { var e = t - s(ut, a.ort), r = 100 * e / k(); return r = u(r), a.dir ? 100 - r : r } function N(t) { var e = 100, a = !1; return ct.forEach(function(r, n) { if (!r.hasAttribute("disabled")) { var i = Math.abs(vt[n] - t); (i < e || 100 === i && 100 === e) && (a = n, e = i) } }), a } function M(t, e) { "mouseout" === t.type && "HTML" === t.target.nodeName && null === t.relatedTarget && V(t, e) } function T(t, e) { if (navigator.appVersion.indexOf("MSIE 9") === -1 && 0 === t.buttons && 0 !== e.buttonsProperty) return V(t, e); var r = (a.dir ? -1 : 1) * (t.calcPoint - e.startCalcPoint), n = 100 * r / e.baseSize; X(r > 0, n, e.locations, e.handleNumbers
```

### `N`
```js
function N(t) { var e = 100, a = !1; return ct.forEach(function(r, n) { if (!r.hasAttribute("disabled")) { var i = Math.abs(vt[n] - t); (i < e || 100 === i && 100 === e) && (a = n, e = i) } }), a } function M(t, e) { "mouseout" === t.type && "HTML" === t.target.nodeName && null === t.relatedTarget && V(t, e) } function T(t, e) { if (navigator.appVersion.indexOf("MSIE 9") === -1 && 0 === t.buttons && 0 !== e.buttonsProperty) return V(t, e); var r = (a.dir ? -1 : 1) * (t.calcPoint - e.startCalcPoint), n = 100 * r / e.baseSize; X(r > 0, n, e.locations, e.handleNumbers) } function V(t, e) { e.handle && (p(e.handle, a.cssClasses.active), yt -= 1), e.listeners.forEach(function(t) { 
```

### `M`
```js
function M(t, e) { "mouseout" === t.type && "HTML" === t.target.nodeName && null === t.relatedTarget && V(t, e) } function T(t, e) { if (navigator.appVersion.indexOf("MSIE 9") === -1 && 0 === t.buttons && 0 !== e.buttonsProperty) return V(t, e); var r = (a.dir ? -1 : 1) * (t.calcPoint - e.startCalcPoint), n = 100 * r / e.baseSize; X(r > 0, n, e.locations, e.handleNumbers) } function V(t, e) { e.handle && (p(e.handle, a.cssClasses.active), yt -= 1), e.listeners.forEach(function(t) { Ut.removeEventListener(t[0], t[1]) }), 0 === yt && (p(gt, a.cssClasses.drag), Z(), t.cursor && (Ct.style.cursor = "", Ct.removeEventListener("selectstart", r))), e.handleNumbers.forEach(function(t) { H("change", t
```

### `ot`
```js
function ot() { return vt.map(function(t, e) { var a = bt.getNearbySteps(t), r = jt[e], n = a.thisStep.step, i = null; n !== !1 && r + n > a.stepAfter.startValue && (n = a.stepAfter.startValue - r), i = r > a.thisStep.startValue ? a.thisStep.step : a.stepBefore.step !== !1 && r - a.stepBefore.highestStep, 100 === t ? n = null : 0 === t && (i = null); var s = bt.countStepDecimals(); return null !== n && n !== !1 && (n = Number(n.toFixed(s))), null !== i && i !== !1 && (i = Number(i.toFixed(s))), [i, n] }) } function lt(t, e) { var r = it(), n = ["margin", "limit", "padding", "range", "animate", "snap", "step", "format"]; n.forEach(function(e) { void 0 !== t[e] && (i[e] = t[e]) }); var s = Y(i
```

### `getMargin`
```js
getMargin = function(t) { var e = this.xNumSteps[0]; if (e && t / e % 1 !== 0) throw new Error("noUiSlider (" + K + "): 'limit', 'margin' and 'padding' must be divisible by step."); return 2 === this.xPct.length && y(this.xVal, t) }, P.prototype.toStepping = function(t) { return t = S(this.xVal, this.xPct, t) }, P.prototype.fromStepping = function(t) { return U(this.xVal, this.xPct, t) }, P.prototype.getStep = function(t) { return t = C(this.xPct, this.xSteps, this.snap, t) }, P.prototype.getNearbySteps = function(t) { var e = w(t, this.xPct); return { stepBefore: { startValue: this.xVal[e - 2], step: this.xNumSteps[e - 2], highestStep: this.xHighestCompleteStep[e - 2] }, thisStep: { startVa
```

### `toStepping`
```js
toStepping = function(t) { return t = S(this.xVal, this.xPct, t) }, P.prototype.fromStepping = function(t) { return U(this.xVal, this.xPct, t) }, P.prototype.getStep = function(t) { return t = C(this.xPct, this.xSteps, this.snap, t) }, P.prototype.getNearbySteps = function(t) { var e = w(t, this.xPct); return { stepBefore: { startValue: this.xVal[e - 2], step: this.xNumSteps[e - 2], highestStep: this.xHighestCompleteStep[e - 2] }, thisStep: { startValue: this.xVal[e - 1], step: this.xNumSteps[e - 1], highestStep: this.xHighestCompleteStep[e - 1] }, stepAfter: { startValue: this.xVal[e - 0], step: this.xNumSteps[e - 0], highestStep: this.xHighestCompleteStep[e - 0] }
```

### `fromStepping`
```js
fromStepping = function(t) { return U(this.xVal, this.xPct, t) }, P.prototype.getStep = function(t) { return t = C(this.xPct, this.xSteps, this.snap, t) }, P.prototype.getNearbySteps = function(t) { var e = w(t, this.xPct); return { stepBefore: { startValue: this.xVal[e - 2], step: this.xNumSteps[e - 2], highestStep: this.xHighestCompleteStep[e - 2] }, thisStep: { startValue: this.xVal[e - 1], step: this.xNumSteps[e - 1], highestStep: this.xHighestCompleteStep[e - 1] }, stepAfter: { startValue: this.xVal[e - 0], step: this.xNumSteps[e - 0], highestStep: this.xHighestCompleteStep[e - 0] } } }, P.prototype.countStepDecimals = function() { var t = this.xNumStep
```

### `getStep`
```js
getStep = function(t) { return t = C(this.xPct, this.xSteps, this.snap, t) }, P.prototype.getNearbySteps = function(t) { var e = w(t, this.xPct); return { stepBefore: { startValue: this.xVal[e - 2], step: this.xNumSteps[e - 2], highestStep: this.xHighestCompleteStep[e - 2] }, thisStep: { startValue: this.xVal[e - 1], step: this.xNumSteps[e - 1], highestStep: this.xHighestCompleteStep[e - 1] }, stepAfter: { startValue: this.xVal[e - 0], step: this.xNumSteps[e - 0], highestStep: this.xHighestCompleteStep[e - 0] } } }, P.prototype.countStepDecimals = function() { var t = this.xNumSteps.map(f); return Math.max.apply(null, t) }, P.prototype.convert = function(t) 
```

### `show_search_field_default`
```js
show_search_field_default = function() { return this.is_multiple && this.choices_count() < 1 && !this.active_field ? (this.search_field.val(this.default_text), this.search_field.addClass("default")) : (this.search_field.val(""), this.search_field.removeClass("default")) }, n.prototype.search_results_mouseup = function(e) { var s; if ((s = t(e.target).hasClass("active-result") ? t(e.target) : t(e.target).parents(".active-result").first()).length) return this.result_highlight = s, this.result_select(e), this.search_field.focus() }, n.prototype.search_results_mouseover = function(e) { var s; if (s = t(e.target).hasClass("active-result") ? t(e.target) : t(e.target).parents(".active-result").firs
```

### `search_results_mouseup`
```js
search_results_mouseup = function(e) { var s; if ((s = t(e.target).hasClass("active-result") ? t(e.target) : t(e.target).parents(".active-result").first()).length) return this.result_highlight = s, this.result_select(e), this.search_field.focus() }, n.prototype.search_results_mouseover = function(e) { var s; if (s = t(e.target).hasClass("active-result") ? t(e.target) : t(e.target).parents(".active-result").first()) return this.result_do_highlight(s) }, n.prototype.search_results_mouseout = function(e) { if (t(e.target).hasClass("active-result") || t(e.target).parents(".active-result").first()) return this.result_clear_highlight() }, n.prototype.choice_build = function(e) { var s, i; return s
```

### `search_results_mouseover`
```js
search_results_mouseover = function(e) { var s; if (s = t(e.target).hasClass("active-result") ? t(e.target) : t(e.target).parents(".active-result").first()) return this.result_do_highlight(s) }, n.prototype.search_results_mouseout = function(e) { if (t(e.target).hasClass("active-result") || t(e.target).parents(".active-result").first()) return this.result_clear_highlight() }, n.prototype.choice_build = function(e) { var s, i; return s = t("<li />", { "class": "search-choice" }).html("<span>" + this.choice_label(e) + "</span>"), e.disabled ? s.addClass("search-choice-disabled") : ((i = t("<a />", { "class": "search-choice-close", "data-option-array-index": e.array_index })).on("click.chosen",
```

### `container_mousedown`
```js
container_mousedown = function(e) { var s; if (!this.is_disabled) return !e || "mousedown" !== (s = e.type) && "touchstart" !== s || this.results_showing || e.preventDefault(), null != e && t(e.target).hasClass("search-choice-close") ? void 0 : (this.active_field ? this.is_multiple || !e || t(e.target)[0] !== this.selected_item[0] && !t(e.target).parents("a.chosen-single").length || (e.preventDefault(), this.results_toggle()) : (this.is_multiple && this.search_field.val(""), t(this.container[0].ownerDocument).on("click.chosen", this.click_test_action), this.results_show()), this.activate_field()) }, n.prototype.container_mouseup = function(t) { if ("ABBR" === t.target.nodeName && !this.is_di
```

### `search_field_disabled`
```js
search_field_disabled = function() { return this.is_disabled = this.form_field.disabled || this.form_field_jq.parents("fieldset").is(":disabled"), this.container.toggleClass("chosen-disabled", this.is_disabled), this.search_field[0].disabled = this.is_disabled, this.is_multiple || this.selected_item.off("focus.chosen", this.activate_field), this.is_disabled ? this.close_field() : this.is_multiple ? void 0 : this.selected_item.on("focus.chosen", this.activate_field) }, n.prototype.container_mousedown = function(e) { var s; if (!this.is_disabled) return !e || "mousedown" !== (s = e.type) && "touchstart" !== s || this.results_showing || e.preventDefault(), null != e && t(e.target).hasClass("sea
```

### `set_label_behavior`
```js
set_label_behavior = function() { if (this.form_field_label = this.form_field_jq.parents("label"), !this.form_field_label.length && this.form_field.id.length && (this.form_field_label = t("label[for='" + this.form_field.id + "']")), this.form_field_label.length > 0) return this.form_field_label.on("click.chosen", this.label_click_handler) }, n.prototype.show_search_field_default = function() { return this.is_multiple && this.choices_count() < 1 && !this.active_field ? (this.search_field.val(this.default_text), this.search_field.addClass("default")) : (this.search_field.val(""), this.search_field.removeClass("default")) }, n.prototype.search_results_mouseup = function(e) { var s; if ((s = t(e
```

### `search_results_mouseout`
```js
search_results_mouseout = function(e) { if (t(e.target).hasClass("active-result") || t(e.target).parents(".active-result").first()) return this.result_clear_highlight() }, n.prototype.choice_build = function(e) { var s, i; return s = t("<li />", { "class": "search-choice" }).html("<span>" + this.choice_label(e) + "</span>"), e.disabled ? s.addClass("search-choice-disabled") : ((i = t("<a />", { "class": "search-choice-close", "data-option-array-index": e.array_index })).on("click.chosen", function(t) { return function(e) { return t.choice_destroy_link_click(e) } }(this)), s.append(i)), this.search_container.before(s) }, n.prototype.choice_destroy_link_click = function(e) { if (e.preventDefau
```

### `container_mouseup`
```js
container_mouseup = function(t) { if ("ABBR" === t.target.nodeName && !this.is_disabled) return this.results_reset(t) }, n.prototype.search_results_mousewheel = function(t) { var e; if (t.originalEvent && (e = t.originalEvent.deltaY || -t.originalEvent.wheelDelta || t.originalEvent.detail), null != e) return t.preventDefault(), "DOMMouseScroll" === t.type && (e *= 40), this.search_results.scrollTop(e + this.search_results.scrollTop()) }, n.prototype.blur_test = function(t) { if (!this.active_field && this.container.hasClass("chosen-container-active")) return this.close_field() }, n.prototype.close_field = function() { return t(this.container[0].ownerDocument).off("click.chosen", this.click_t
```

### `blur_test`
```js
blur_test = function(t) { if (!this.active_field && this.container.hasClass("chosen-container-active")) return this.close_field() }, n.prototype.close_field = function() { return t(this.container[0].ownerDocument).off("click.chosen", this.click_test_action), this.active_field = !1, this.results_hide(), this.container.removeClass("chosen-container-active"), this.clear_backstroke(), this.show_search_field_default(), this.search_field_scale(), this.search_field.blur() }, n.prototype.activate_field = function() { if (!this.is_disabled) return this.container.addClass("chosen-container-active"), this.active_field = !0, this.search_field.val(this.search_field.val()), this.search_field.focus() }, n.
```

### `close_field`
```js
close_field = function() { return t(this.container[0].ownerDocument).off("click.chosen", this.click_test_action), this.active_field = !1, this.results_hide(), this.container.removeClass("chosen-container-active"), this.clear_backstroke(), this.show_search_field_default(), this.search_field_scale(), this.search_field.blur() }, n.prototype.activate_field = function() { if (!this.is_disabled) return this.container.addClass("chosen-container-active"), this.active_field = !0, this.search_field.val(this.search_field.val()), this.search_field.focus() }, n.prototype.test_active_click = function(e) { var s; return (s = t(e.target).closest(".chosen-container")).length && this.container[0] === s[0] ? t
```

### `activate_field`
```js
activate_field = function() { if (!this.is_disabled) return this.container.addClass("chosen-container-active"), this.active_field = !0, this.search_field.val(this.search_field.val()), this.search_field.focus() }, n.prototype.test_active_click = function(e) { var s; return (s = t(e.target).closest(".chosen-container")).length && this.container[0] === s[0] ? this.active_field = !0 : this.close_field() }, n.prototype.results_build = function() { return this.parsing = !0, this.selected_option_count = null, this.results_data = i.select_to_array(this.form_field), this.is_multiple ? this.search_choices.find("li.search-choice").remove() : (this.single_set_selected_text(), this.disable_search || this
```

### `test_active_click`
```js
test_active_click = function(e) { var s; return (s = t(e.target).closest(".chosen-container")).length && this.container[0] === s[0] ? this.active_field = !0 : this.close_field() }, n.prototype.results_build = function() { return this.parsing = !0, this.selected_option_count = null, this.results_data = i.select_to_array(this.form_field), this.is_multiple ? this.search_choices.find("li.search-choice").remove() : (this.single_set_selected_text(), this.disable_search || this.form_field.options.length <= this.disable_search_threshold ? (this.search_field[0].readOnly = !0, this.container.addClass("chosen-container-single-nosearch")) : (this.search_field[0].readOnly = !1, this.container.removeClass
```

### `choice_build`
```js
choice_build = function(e) { var s, i; return s = t("<li />", { "class": "search-choice" }).html("<span>" + this.choice_label(e) + "</span>"), e.disabled ? s.addClass("search-choice-disabled") : ((i = t("<a />", { "class": "search-choice-close", "data-option-array-index": e.array_index })).on("click.chosen", function(t) { return function(e) { return t.choice_destroy_link_click(e) } }(this)), s.append(i)), this.search_container.before(s) }, n.prototype.choice_destroy_link_click = function(e) { if (e.preventDefault(), e.stopPropagation(), !this.is_disabled) return this.choice_destroy(t(e.target)) }, n.prototype.choice_destroy = function(t) { if (this.result_deselect(t[0].getAttribute("data-opt
```

### `choice_destroy_link_click`
```js
choice_destroy_link_click = function(e) { if (e.preventDefault(), e.stopPropagation(), !this.is_disabled) return this.choice_destroy(t(e.target)) }, n.prototype.choice_destroy = function(t) { if (this.result_deselect(t[0].getAttribute("data-option-array-index"))) return this.active_field ? this.search_field.focus() : this.show_search_field_default(), this.is_multiple && this.choices_count() > 0 && this.get_search_field_value().length < 1 && this.results_hide(), t.parents("li").first().remove(), this.search_field_scale() }, n.prototype.results_reset = function() { if (this.reset_single_select_options(), this.form_field.options[0].selected = !0, this.single_set_selected_text(), this.show_searc
```

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || S], d = y.call(e, "type") ? e.type : e, h = y.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || S, 3 !== n.nodeType && 8 !== n.nodeType && !bt.test(d + E.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[E.expando] ? e : new E.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : E.makeArray(t, [e]), c = E.event.special[d
```

### `_hoverable`
```js
_hoverable: function(t) { this.hoverable = this.hoverable.add(t), this._on(t, { mouseenter: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-hover") }, mouseleave: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-hover") } }) }, _focusable: function(t) { this.focusable = this.focusable.add(t), this._on(t, { focusin: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-focus") }, focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase
```

### `mouseenter`
```js
mouseenter: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-hover") }, mouseleave: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-hover") } }) }, _focusable: function(t) { this.focusable = this.focusable.add(t), this._on(t, { focusin: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-focus") }, focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), e.target = this.element[0], o = e.originalEvent) for (n in o) n in e || (e[n
```

### `mouseleave`
```js
mouseleave: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-hover") } }) }, _focusable: function(t) { this.focusable = this.focusable.add(t), this._on(t, { focusin: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-focus") }, focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), e.target = this.element[0], o = e.originalEvent) for (n in o) n in e || (e[n] = o[n]); return this.element.trigger(e, i), !("function" == typeof s && !1 === s.apply
```

### `_focusable`
```js
_focusable: function(t) { this.focusable = this.focusable.add(t), this._on(t, { focusin: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-focus") }, focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), e.target = this.element[0], o = e.originalEvent) for (n in o) n in e || (e[n] = o[n]); return this.element.trigger(e, i), !("function" == typeof s && !1 === s.apply(this.element[0], [e].concat(i)) || e.isDefaultPrevented()) } }, x.each({ show: "fadeIn", hide: 
```

### `focusin`
```js
focusin: function(t) { this._addClass(x(t.currentTarget), null, "ui-state-focus") }, focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), e.target = this.element[0], o = e.originalEvent) for (n in o) n in e || (e[n] = o[n]); return this.element.trigger(e, i), !("function" == typeof s && !1 === s.apply(this.element[0], [e].concat(i)) || e.isDefaultPrevented()) } }, x.each({ show: "fadeIn", hide: "fadeOut" }, function(s, r) { x.Widget.prototype["_" + s] = function(e, t, i) { 
```

### `focusout`
```js
focusout: function(t) { this._removeClass(x(t.currentTarget), null, "ui-state-focus") } }) }, _trigger: function(t, e, i) { var n, o, s = this.options[t]; if (i = i || {}, (e = x.Event(e)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), e.target = this.element[0], o = e.originalEvent) for (n in o) n in e || (e[n] = o[n]); return this.element.trigger(e, i), !("function" == typeof s && !1 === s.apply(this.element[0], [e].concat(i)) || e.isDefaultPrevented()) } }, x.each({ show: "fadeIn", hide: "fadeOut" }, function(s, r) { x.Widget.prototype["_" + s] = function(e, t, i) { var n, o = (t = "string" == typeof t ? { effect: t } : t) ? !0 !== t && "number" != t
```

### `t`
```js
t = function(t) { var e = g.left - h.left, i = e + d - l, n = g.top - h.top, o = n + p - a, s = { target: { element: v, left: g.left, top: g.top, width: d, height: p }, element: { element: r, left: h.left, top: h.top, width: l, height: a }, horizontal: i < 0 ? "left" : 0 < e ? "right" : "center", vertical: o < 0 ? "top" : 0 < n ? "bottom" : "middle" }; d < l && C(e + i) < d && (s.horizontal = "center"), p < a && C(n + o) < p && (s.vertical = "middle"), W(C(e), C(i)) > W(C(n), C(o)) ? s.important = "horizontal" : s.important = "vertical", c.using.call(this, t, s) }), r.offset(x.extend(h, { using: t 
```
