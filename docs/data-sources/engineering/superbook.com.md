# superbook.com — engineering

App bundles beautified: **4**  
JSON endpoints captured: **0**  
Client functions passing filter: **36**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `S`
```js
function S(e) { var t = []; return I(e, t, !0), " " != (e = (e = (e = (e = t.join("")).replace(/ \xAD /g, " ").replace(/\xAD/g, "")).replace(/\u200B/g, "")).replace(/ +/g, " ")) && (e = e.replace(/^\s*/, "")), e } function I(e, t, n) { if (!(e.nodeName in E)) if (3 == e.nodeType) n ? t.push(String(e.nodeValue).replace(/(\r\n|\r|\n)/g, "")) : t.push(e.nodeValue); else if (e.nodeName in T) t.push(T[e.nodeName]); else for (e = e.firstChild; e;) I(e, t, n), e = e.nextSibling } function O(e, t) { this.type = e, this.currentTarget = this.target = t, this.defaultPrevented = !1 } O.prototype.stopPropagation = function() {}, O.prototype.preventDefault = function() { this.defaultPrevented = !0 }; var 
```

### `scroll`
```js
function scroll(destination, duration, snap, onScrolled, noConstrain) { var offset, from = getPosition(), snap = (clear(), !snap || isSlide && exceededLimit() || (snap = Components2.Layout.sliderSize(), offset = sign(destination) * snap * floor(abs(destination) / snap) || 0, destination = Move.toPosition(Components2.Controller.toDest(destination % snap)) + offset), approximatelyEqual(from, destination, 1)); friction = 1, duration = snap ? 0 : duration || max(abs(destination - from) / 1.5, 800), callback = onScrolled, interval = RequestInterval(duration, onEnd, apply(update, from, destination, noConstrain), 1), set(SCROLLING), emit("scroll"), interval.start() } function onEnd() { set(3), call
```

### `r`
```js
function r(t, i, s, h) { t.style.transform = o(i, s, h) } function a(t, i, s, h) { t.style.transition = i ? i + ` ${s}ms ` + (h || "cubic-bezier(.4,0,.22,1)") : "none" } function l(t, i, s) { t.style.width = "number" == typeof i ? i + "px" : i, t.style.height = "number" == typeof s ? s + "px" : s } const d = "loading", u = "loaded", p = "error"; function m() { return navigator.vendor && navigator.vendor.match(/apple/i) } let v = !1; try { window.addEventListener("test", null, Object.defineProperty({}, "passive", { get: () => { v = !0 } })) } catch (t) {} class f { constructor() { this.t = [] } add(t, i, s, h) { this.i(t, i, s, h) } remove(t, i, s, h) { this.i(t, i, s, h, !0) } removeAll() { 
```

### `a`
```js
function a(t, i, s, h) { t.style.transition = i ? i + ` ${s}ms ` + (h || "cubic-bezier(.4,0,.22,1)") : "none" } function l(t, i, s) { t.style.width = "number" == typeof i ? i + "px" : i, t.style.height = "number" == typeof s ? s + "px" : s } const d = "loading", u = "loaded", p = "error"; function m() { return navigator.vendor && navigator.vendor.match(/apple/i) } let v = !1; try { window.addEventListener("test", null, Object.defineProperty({}, "passive", { get: () => { v = !0 } })) } catch (t) {} class f { constructor() { this.t = [] } add(t, i, s, h) { this.i(t, i, s, h) } remove(t, i, s, h) { this.i(t, i, s, h, !0) } removeAll() { this.t.forEach(t => { this.i(t.target, t.type, t.listener,
```

### `n`
```js
n = () => {}, duration: o = 333, easing: r = "cubic-bezier(.4,0,.22,1)" } = this.props = t; this.onFinish = n; const l = e ? "transform" : "opacity", c = null != (i = t[l]) ? i : ""; this.ft = s, this.wt = h, this.gt = !1, this.yt = this.yt.bind(this), this._t = setTimeout(() => { a(s, l, o, r), this._t = setTimeout(() => { s.addEventListener("transitionend", this.yt, !1), s.addEventListener("transitioncancel", this.yt, !1), this._t = setTimeout(() => { this.xt() }, o + 500), s.style[l] = c }, 30) }, 0) } yt(t) { t.target === this.ft && this.xt() } xt() { this.gt || (this.gt = !0, this.onFinish(), this.wt && this.wt()) } destroy() { this._t && clearTimeout(this._t), a(this.ft), this.ft.remov
```

### `showTip`
```js
showTip: function($target) { var $tip = this.getTip($target); if (this.should_show($target, $tip)) return this.show($target) }, getTip: function($target) { var selector = this.selector($target), $target = $.extend({}, this.settings, this.data_options($target)), tip = null; return "object" == typeof(tip = selector ? this.S('span[data-selector="' + selector + '"]' + $target.tooltip_class) : tip) && tip }, selector: function($target) { var dataSelector = $target.attr(this.attr_name()) || $target.attr("data-selector"); return "string" != typeof dataSelector && (dataSelector = this.random_str(6), $target.attr("data-selector", dataSelector).attr("aria-describedby", dataSelector)), dataSelector }, 
```

### `ie_touch`
```js
ie_touch: function(e) { return !1 }, showTip: function($target) { var $tip = this.getTip($target); if (this.should_show($target, $tip)) return this.show($target) }, getTip: function($target) { var selector = this.selector($target), $target = $.extend({}, this.settings, this.data_options($target)), tip = null; return "object" == typeof(tip = selector ? this.S('span[data-selector="' + selector + '"]' + $target.tooltip_class) : tip) && tip }, selector: function($target) { var dataSelector = $target.attr(this.attr_name()) || $target.attr("data-selector"); return "string" != typeof dataSelector && (dataSelector = this.random_str(6), $target.attr("data-selector", dataSelector).attr("aria-described
```

### `convert_to_touch`
```js
convert_to_touch: function($target) { var self = this, $tip = self.getTip($target), settings = $.extend({}, self.settings, self.data_options($target)); 0 === $tip.find(".tap-to-close").length && ($tip.append('<span class="tap-to-close">' + settings.touch_close_text + "</span>"), $tip.on("click.fndtn.tooltip.tapclose touchstart.fndtn.tooltip.tapclose MSPointerDown.fndtn.tooltip.tapclose", function(e) { self.hide($target) })), $target.data("tooltip-open-event-type", "touch") }, show: function($target) { var $tip = this.getTip($target); "touch" == $target.data("tooltip-open-event-type") && this.convert_to_touch($target), this.reposition($target, $tip, $target.attr("class")), $target.addClass("o
```

### `_enableDatepicker`
```js
_enableDatepicker: function(target) { var nodeName, $target = $(target), inst = $.data(target, "datepicker"); $target.hasClass(this.markerClassName) && ("input" === (nodeName = target.nodeName.toLowerCase()) ? (target.disabled = !1, inst.trigger.filter("button").each(function() { this.disabled = !1 }).end().filter("img").css({ opacity: "1.0", cursor: "" })) : "div" !== nodeName && "span" !== nodeName || ((inst = $target.children("." + this._inlineClass)).children().removeClass("ui-state-disabled"), inst.find("select.ui-datepicker-month, select.ui-datepicker-year").prop("disabled", !1)), this._disabledInputs = $.map(this._disabledInputs, function(value) { return value === target ? null : valu
```

### `open`
```js
open: function(event) { var that = this, target = $(event ? event.target : this.element).closest(this.options.items); target.length && !target.data("ui-tooltip-id") && (target.attr("title") && target.data("ui-tooltip-title", target.attr("title")), target.data("ui-tooltip-open", !0), event && "mouseover" === event.type && target.parents().each(function() { var blurEvent, parent = $(this); parent.data("ui-tooltip-open") && ((blurEvent = $.Event("blur")).target = blurEvent.currentTarget = this, that.close(blurEvent, !0)), parent.attr("title") && (parent.uniqueId(), that.parents[this.id] = { element: this, title: parent.attr("title") }, parent.attr("title", "")) }), this._registerCloseHandlers(e
```

### `_disableDatepicker`
```js
_disableDatepicker: function(target) { var nodeName, $target = $(target), inst = $.data(target, "datepicker"); $target.hasClass(this.markerClassName) && ("input" === (nodeName = target.nodeName.toLowerCase()) ? (target.disabled = !0, inst.trigger.filter("button").each(function() { this.disabled = !0 }).end().filter("img").css({ opacity: "0.5", cursor: "default" })) : "div" !== nodeName && "span" !== nodeName || ((inst = $target.children("." + this._inlineClass)).children().addClass("ui-state-disabled"), inst.find("select.ui-datepicker-month, select.ui-datepicker-year").prop("disabled", !0)), this._disabledInputs = $.map(this._disabledInputs, function(value) { return value === target ? null :
```

### `close`
```js
close: function(event) { var tooltip, that = this, target = $(event ? event.currentTarget : this.element), tooltipData = this._find(target); tooltipData ? (tooltip = tooltipData.tooltip, tooltipData.closing || (clearInterval(this.delayedShow), target.data("ui-tooltip-title") && !target.attr("title") && target.attr("title", target.data("ui-tooltip-title")), this._removeDescribedBy(target), tooltipData.hiding = !0, tooltip.stop(!0), this._hide(tooltip, this.options.hide, function() { that._removeTooltip($(this)) }), target.removeData("ui-tooltip-open"), this._off(target, "mouseleave focusout keyup"), target[0] !== this.element[0] && this._off(target, "remove"), this._off(this.document, "mousem
```

### `fix_height`
```js
fix_height: function(target) { var target = target.parent().children(), self = this; return target.each(function() { var li = self.S(this), image = li.find("img"); li.height() > image.outerHeight() && li.addClass("fix-height") }).closest("ul").width(100 * target.length + "%"), this }, update_paddles: function(target) { var visible_image = (target = target.closest("li")).closest(".carousel").siblings(".visible-img"); 0 < target.next().length ? this.S(".clearing-main-next", visible_image).removeClass("disabled") : this.S(".clearing-main-next", visible_image).addClass("disabled"), 0 < target.prev().length ? this.S(".clearing-main-prev", visible_image).removeClass("disabled") : this.S(".clearing
```

### `getTip`
```js
getTip: function($target) { var selector = this.selector($target), $target = $.extend({}, this.settings, this.data_options($target)), tip = null; return "object" == typeof(tip = selector ? this.S('span[data-selector="' + selector + '"]' + $target.tooltip_class) : tip) && tip }, selector: function($target) { var dataSelector = $target.attr(this.attr_name()) || $target.attr("data-selector"); return "string" != typeof dataSelector && (dataSelector = this.random_str(6), $target.attr("data-selector", dataSelector).attr("aria-describedby", dataSelector)), dataSelector }, create: function($target) { var self = this, settings = $.extend({}, this.settings, this.data_options($target)), tip_template = 
```

### `width`
```js
width = function(obj, top, right, bottom, left, width) { return obj.css({ top: top || "auto", bottom: bottom || "auto", left: left || "auto", right: right || "auto" }).end() })(tip, target.offset().top + target.outerHeight() + 10, "auto", "auto", target.offset().left), this.small() ? (width(tip, target.offset().top + target.outerHeight() + 10, "auto", "auto", 12.5, $(this.scope).width()), tip.addClass("tip-override"), width(nub, -nubHeight, "auto", "auto", target.offset().left)) : (left = target.offset().left, Foundation.rtl && (nub.addClass("rtl"), left = target.offset().left + target.outerWidth() - tip.outerWidth()), width(tip, target.offset().top + target.outerHeight() + 10, "auto", "auto
```

### `_widgetDatepicker`
```js
_widgetDatepicker: function() { return this.dpDiv }, setDefaults: function(settings) { return datepicker_extendRemove(this._defaults, settings || {}), this }, _attachDatepicker: function(target, settings) { var inst, nodeName = target.nodeName.toLowerCase(), inline = "div" === nodeName || "span" === nodeName; target.id || (this.uuid += 1, target.id = "dp" + this.uuid), (inst = this._newInst($(target), inline)).settings = $.extend({}, settings || {}), "input" === nodeName ? this._connectDatepicker(target, inst) : inline && this._inlineDatepicker(target, inst) }, _newInst: function(target, inline) { return { id: target[0].id.replace(/([^A-Za-z0-9_\-])/g, "\\\\$1"), input: target, selectedDay: 
```

### `setDefaults`
```js
setDefaults: function(settings) { return datepicker_extendRemove(this._defaults, settings || {}), this }, _attachDatepicker: function(target, settings) { var inst, nodeName = target.nodeName.toLowerCase(), inline = "div" === nodeName || "span" === nodeName; target.id || (this.uuid += 1, target.id = "dp" + this.uuid), (inst = this._newInst($(target), inline)).settings = $.extend({}, settings || {}), "input" === nodeName ? this._connectDatepicker(target, inst) : inline && this._inlineDatepicker(target, inst) }, _newInst: function(target, inline) { return { id: target[0].id.replace(/([^A-Za-z0-9_\-])/g, "\\\\$1"), input: target, selectedDay: 0, selectedMonth: 0, selectedYear: 0, drawMonth: 0, d
```

### `_attachDatepicker`
```js
_attachDatepicker: function(target, settings) { var inst, nodeName = target.nodeName.toLowerCase(), inline = "div" === nodeName || "span" === nodeName; target.id || (this.uuid += 1, target.id = "dp" + this.uuid), (inst = this._newInst($(target), inline)).settings = $.extend({}, settings || {}), "input" === nodeName ? this._connectDatepicker(target, inst) : inline && this._inlineDatepicker(target, inst) }, _newInst: function(target, inline) { return { id: target[0].id.replace(/([^A-Za-z0-9_\-])/g, "\\\\$1"), input: target, selectedDay: 0, selectedMonth: 0, selectedYear: 0, drawMonth: 0, drawYear: 0, inline: inline, dpDiv: inline ? datepicker_bindHover($("<div class='" + this._inlineClass + " 
```

### `_enable`
```js
_enable: function() { this.element.find(this.options.items).addBack().each(function() { var element = $(this); element.data("ui-tooltip-title") && element.attr("title", element.data("ui-tooltip-title")) }) }, open: function(event) { var that = this, target = $(event ? event.target : this.element).closest(this.options.items); target.length && !target.data("ui-tooltip-id") && (target.attr("title") && target.data("ui-tooltip-title", target.attr("title")), target.data("ui-tooltip-open", !0), event && "mouseover" === event.type && target.parents().each(function() { var blurEvent, parent = $(this); parent.data("ui-tooltip-open") && ((blurEvent = $.Event("blur")).target = blurEvent.currentTarget = 
```

### `show`
```js
show: function($target) { var $tip = this.getTip($target); "touch" == $target.data("tooltip-open-event-type") && this.convert_to_touch($target), this.reposition($target, $tip, $target.attr("class")), $target.addClass("open"), $tip.fadeIn(150) }, hide: function($target) { var $tip = this.getTip($target); $tip.fadeOut(150, function() { $tip.find(".tap-to-close").remove(), $tip.off("click.fndtn.tooltip.tapclose MSPointerDown.fndtn.tapclose"), $target.removeClass("open") }) }, off: function() { var self = this; this.S(this.scope).off(".fndtn.tooltip"), this.S(this.settings.tooltip_class).each(function(i) { $("[" + self.attr_name() + "]").eq(i).attr("title", $(this).text()) }).remove() }, reflow:
```

### `resize`
```js
resize: function() { var image = $("img", ".clearing-blackout .visible-img"), label = $(".clearing-touch-label", ".clearing-blackout"); image.length && (this.center_and_label(image, label), image.trigger("resized.fndtn.clearing")) }, fix_height: function(target) { var target = target.parent().children(), self = this; return target.each(function() { var li = self.S(this), image = li.find("img"); li.height() > image.outerHeight() && li.addClass("fix-height") }).closest("ul").width(100 * target.length + "%"), this }, update_paddles: function(target) { var visible_image = (target = target.closest("li")).closest(".carousel").siblings(".visible-img"); 0 < target.next().length ? this.S(".clearing-m
```

### `closeall`
```js
closeall: function() { var self = this; $.each(self.S(".f-open-" + this.attr_name(!0)), function() { self.close.call(self, self.S(this)) }) }, open: function(dropdown, target) { this.css(dropdown.addClass(this.settings.active_class), target), dropdown.prev("[" + this.attr_name() + "]").addClass(this.settings.active_class), dropdown.data("target", target.get(0)).trigger("opened.fndtn.dropdown", [dropdown, target]), dropdown.attr("aria-hidden", "false"), target.attr("aria-expanded", "true"), dropdown.focus(), dropdown.addClass("f-open-" + this.attr_name(!0)) }, data_attr: function() { return 0 < this.namespace.length ? this.namespace + "-" + this.name : this.name }, toggle: function(target) { 
```

### `selector`
```js
selector: function($target) { var dataSelector = $target.attr(this.attr_name()) || $target.attr("data-selector"); return "string" != typeof dataSelector && (dataSelector = this.random_str(6), $target.attr("data-selector", dataSelector).attr("aria-describedby", dataSelector)), dataSelector }, create: function($target) { var self = this, settings = $.extend({}, this.settings, this.data_options($target)), tip_template = this.settings.tip_template, tip_template = ("string" == typeof settings.tip_template && window.hasOwnProperty(settings.tip_template) && (tip_template = window[settings.tip_template]), $(tip_template(this.selector($target), $("<div></div>").html($target.attr("title")).html()))), 
```

### `complete`
```js
complete: function() { "hide" === mode && el.hide(), $.effects.restore(el, props), $.effects.removeWrapper(el), done() } }) }, $.effects.effect.transfer = function(o, done) { var elem = $(this), target = $(o.to), targetFixed = "fixed" === target.css("position"), body = $("body"), fixTop = targetFixed ? body.scrollTop() : 0, body = targetFixed ? body.scrollLeft() : 0, endPosition = target.offset(), endPosition = { top: endPosition.top - fixTop, left: endPosition.left - body, height: target.innerHeight(), width: target.innerWidth() }, target = elem.offset(), transfer = $("<div class='ui-effects-transfer'></div>").appendTo(document.body).addClass(o.className).css({ top: target.top - fixTop, lef
```

### `transfer`
```js
transfer = function(o, done) { var elem = $(this), target = $(o.to), targetFixed = "fixed" === target.css("position"), body = $("body"), fixTop = targetFixed ? body.scrollTop() : 0, body = targetFixed ? body.scrollLeft() : 0, endPosition = target.offset(), endPosition = { top: endPosition.top - fixTop, left: endPosition.left - body, height: target.innerHeight(), width: target.innerWidth() }, target = elem.offset(), transfer = $("<div class='ui-effects-transfer'></div>").appendTo(document.body).addClass(o.className).css({ top: target.top - fixTop, left: target.left - body, height: elem.innerHeight(), width: elem.innerWidth(), position: targetFixed ? "fixed" : "absolute" }).animate(endPosition
```

### `m`
```js
m = function(t) { if (!a(t)) return !1; var r = t[g]; return void 0 !== r ? !!r : i(t) }; n({ target: "Array", proto: !0, arity: 1, forced: !v || !h("concat") }, { concat: function(t) { var r, e, n, o, i, a = s(this), h = l(a, 0), d = 0; for (r = -1, n = arguments.length; r < n; r++) if (m(i = -1 === r ? a : arguments[r])) for (o = c(i), u(d + o), e = 0; e < o; e++, d++) e in i && f(h, d, i[e]); else u(d + 1), f(h, d++, i); return h.length = d, h } }) }, 2008: function(t, r, e) { "use strict"; var n = e(46518), o = e(59213).filter; n({ target: 
```

### `I`
```js
I = function(t, r, e) { var n = m(e, r - 1), o = m(e, r + 1); return v(S, t) && !v(k, o) || v(k, t) && !v(S, n) ? "\\u" + w(y(t, 0), 16) : t }; g && n({ target: "JSON", stat: !0, arity: 3, forced: E || O }, { stringify: function(t, r, e) { var n = l(arguments), o = i(E ? P : g, null, n); return O && "string" == typeof o ? b(o, x, I) : o } }) }, 69085: function(t, r, e) { "use strict"; var n = e(46518), o = e(44213); n({ target: "Object", stat: !0, arity: 2, forced: Object.assign !== o }, { assign: o }) }, 49773: function(t, r, e) { 
```

### `concat`
```js
concat: function(t) { var r, e, n, o, i, a = s(this), h = l(a, 0), d = 0; for (r = -1, n = arguments.length; r < n; r++) if (m(i = -1 === r ? a : arguments[r])) for (o = c(i), u(d + o), e = 0; e < o; e++, d++) e in i && f(h, d, i[e]); else u(d + 1), f(h, d++, i); return h.length = d, h } }) }, 2008: function(t, r, e) { "use strict"; var n = e(46518), o = e(59213).filter; n({ target: "Array", proto: !0, forced: !e(70597)("filter") }, { filter: function(t) { return o(this, t, arguments.length > 1 ? arguments[1] : void 0) } }) }, 51629: function(t, r, e) { "use strict"; 
```

### `P`
```js
P = function(t, r) { var e = l(arguments), n = h(r); if (u(n) || void 0 !== t && !f(t)) return e[1] = function(t, r) { if (u(n) && (r = a(n, this, p(t), r)), !f(r)) return r }, i(g, null, e) }, I = function(t, r, e) { var n = m(e, r - 1), o = m(e, r + 1); return v(S, t) && !v(k, o) || v(k, t) && !v(S, n) ? "\\u" + w(y(t, 0), 16) : t }; g && n({ target: "JSON", stat: !0, arity: 3, forced: E || O }, { stringify: function(t, r, e) { var n = l(arguments), o = i(E ? P : g, null, n); return O && "string" == typeof o ? b(o, x, I) : o } }) }, 69085: function(t, r, e) { "use s
```

### `50375`
```js
50375: function(t, r, e) { "use strict"; var n = e(46518), o = e(79504), i = e(67750), a = e(91291), s = e(655), c = o("".slice), u = Math.max, f = Math.min; n({ target: "String", proto: !0, forced: !"".substr || "b" !== "ab".substr(-1) }, { substr: function(t, r) { var e, n, o = s(i(this)), l = o.length, h = a(t); return h === 1 / 0 && (h = 0), h < 0 && (h = u(l + h, 0)), (e = void 0 === r ? l : a(r)) <= 0 || e === 1 / 0 || h >= (n = f(h + e, l)) ? "" : c(o, h, n) } }) }, 6761: function(t, r, e) { "use strict"; var n = e(46518), o = e(44576), i = e(69565), a = e(7950
```

### `get`
```js
get: function() { var t = y(this); if (s(g, t)) return ""; var r = b(t), e = m ? S(r, 7, -1) : x(r, w, "$1"); return "" === e ? void 0 : e } }), n({ global: !0, constructor: !0, forced: !0 }, { Symbol: v }) } }, 81510: function(t, r, e) { "use strict"; var n = e(46518), o = e(97751), i = e(39297), a = e(655), s = e(25745), c = e(91296), u = s("string-to-symbol-registry"), f = s("symbol-to-string-registry"); n({ target: "Symbol", stat: !0, forced: !c }, { for: function(t) { var r = a(t); 
```

### `81510`
```js
81510: function(t, r, e) { "use strict"; var n = e(46518), o = e(97751), i = e(39297), a = e(655), s = e(25745), c = e(91296), u = s("string-to-symbol-registry"), f = s("symbol-to-string-registry"); n({ target: "Symbol", stat: !0, forced: !c }, { for: function(t) { var r = a(t); if (i(u, r)) return u[r]; var e = o("Symbol")(r); return u[r] = e, f[e] = r, e } }) }, 2259: function(t, r, e) { "use strict"; e(70511)("iterator") }, 52675: function(t, r, e) { "use strict"; e(6761), e(81510), e(97812), e(33110), e(49773) }, 97812: function(t, r, e) { "u
```

### `for`
```js
for: function(t) { var r = a(t); if (i(u, r)) return u[r]; var e = o("Symbol")(r); return u[r] = e, f[e] = r, e } }) }, 2259: function(t, r, e) { "use strict"; e(70511)("iterator") }, 52675: function(t, r, e) { "use strict"; e(6761), e(81510), e(97812), e(33110), e(49773) }, 97812: function(t, r, e) { "use strict"; var n = e(46518), o = e(39297), i = e(10757), a = e(16823), s = e(25745), c = e(91296), u = s("symbol-to-string-registry"); n({ target: "Symbol", stat: !0, forced: !c }, { keyFor: function(t) { if (!i(t)) throw new TypeError(a(t) + " is not a 
```

### `2259`
```js
2259: function(t, r, e) { "use strict"; e(70511)("iterator") }, 52675: function(t, r, e) { "use strict"; e(6761), e(81510), e(97812), e(33110), e(49773) }, 97812: function(t, r, e) { "use strict"; var n = e(46518), o = e(39297), i = e(10757), a = e(16823), s = e(25745), c = e(91296), u = s("symbol-to-string-registry"); n({ target: "Symbol", stat: !0, forced: !c }, { keyFor: function(t) { if (!i(t)) throw new TypeError(a(t) + " is not a symbol"); if (o(u, t)) return u[t] } }) }, 23500: function(t, r, e) { "use strict"; var n = e(44576), o = e(67400), i 
```

### `52675`
```js
52675: function(t, r, e) { "use strict"; e(6761), e(81510), e(97812), e(33110), e(49773) }, 97812: function(t, r, e) { "use strict"; var n = e(46518), o = e(39297), i = e(10757), a = e(16823), s = e(25745), c = e(91296), u = s("symbol-to-string-registry"); n({ target: "Symbol", stat: !0, forced: !c }, { keyFor: function(t) { if (!i(t)) throw new TypeError(a(t) + " is not a symbol"); if (o(u, t)) return u[t] } }) }, 23500: function(t, r, e) { "use strict"; var n = e(44576), o = e(67400), i = e(79296), a = e(90235), s = e(66699), c = function(t) { 
```

### `97812`
```js
97812: function(t, r, e) { "use strict"; var n = e(46518), o = e(39297), i = e(10757), a = e(16823), s = e(25745), c = e(91296), u = s("symbol-to-string-registry"); n({ target: "Symbol", stat: !0, forced: !c }, { keyFor: function(t) { if (!i(t)) throw new TypeError(a(t) + " is not a symbol"); if (o(u, t)) return u[t] } }) }, 23500: function(t, r, e) { "use strict"; var n = e(44576), o = e(67400), i = e(79296), a = e(90235), s = e(66699), c = function(t) { if (t && t.forEach !== a) try { s(t, "forEach", a) } catch (r) { t.forEach
```
