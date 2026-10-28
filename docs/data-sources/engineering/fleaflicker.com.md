# fleaflicker.com — engineering

App bundles beautified: **1**  
JSON endpoints captured: **0**  
Client functions passing filter: **20**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `e`
```js
function e(e) { return this.each(function() { var i = t(this), r = i.data("bs.affix"), o = "object" == typeof e && e; r || i.data("bs.affix", r = new n(this, o)), "string" == typeof e && r[e]() }) } var n = function(e, i) { this.options = t.extend({}, n.DEFAULTS, i); var r = this.options.target === n.DEFAULTS.target ? t(this.options.target) : t(document).find(this.options.target); this.$target = r.on("scroll.bs.affix.data-api", t.proxy(this.checkPosition, this)).on("click.bs.affix.data-api", t.proxy(this.checkPositionWithEventLoop, this)), this.$element = t(e), this.affixed = null, this.unpin = null, this.pinnedOffset = null, this.checkPosition() }; n.VERSION = "3.4.1", n.RESET = "affix affi
```

### `w`
```js
w = function(t) { m && t.on("touchstart click", function(t) { "touchstart" == t.type ? y = t.target : "click" == t.type && y == t.target && b != t.target && (t.preventDefault(), b = t.target) }) }, x = function(t) { var e = $(t), n = function(t, e) { var n = e.uri.indexOf("?"), i = e.uri, r = ""; n > -1 && (i = e.uri.substring(0, n), r = "?" + e.uri.substring(n + 1)), s.navigateTo(i + r) }; return e.typeahead0(n) }, C = function() { var t = x("#global-search.tt-typeahead"); 0 != t.length && t.on("focus blur", function(t) { var e = $(t.target), n = e.closest(".navbar"); if ("focus" == t.type) { var i = n.find(".navbar-collapse.in").length > 0, r = function(t) { n.a
```

### `ObjectGroup`
```js
ObjectGroup = function() { function t(t, e) { var n, i; this.objects = null != t ? t : [], i = e.depth, (n = e.asTree) && (this.depth = i, this.objects = this.constructor.groupObjects(this.objects, { asTree: n, depth: this.depth + 1 })) } return t.groupObjects = function(t, e) { var n, i, r, o, s, a, u, c, l; for (null == t && (t = []), l = null != e ? e : {}, r = l.depth, n = l.asTree, n && null == r && (r = 0), c = [], s = 0, a = t.length; a > s; s++) { if (u = t[s], o) { if (("function" == typeof u.canBeGrouped ? u.canBeGrouped(r) : void 0) && ("function" == typeof(i = o[o.length - 1]).canBeGroupedWith ? i.canBeGroupedWith(u, r) : void 0)) { o.p
```

### `S`
```js
S = function(t) { var e = $("form.form-horizontal:visible, form.form-vertical:visible"); if (0 != e.length) { var n = e.find(":input"); n.on("blur focus", function(t) { $(t.target).closest(".form-group").toggleClass("focused", "focus" == t.type) }), e.find(":radio:not(:focus), :checkbox:not(:focus)").on("click", function(t) { $(t.target).trigger("focus") }); var i = e.find(".has-error " + T); 0 == i.length && (i = e.filter("[data-autofocus]").find(T)), i.trigger("focus"), t && n.on("change", function(e) { var n = $(e.target); _(n, t, k(n)) }).each(function(e, n) { var i = $(n); if (E(i)) { if (!i.closest("label").is(":first-child")) return } _(i, t, k(i)) }), e.find("[data-condition]")
```

### `o`
```js
function o(t) { return Array.isArray(t) ? t : Array.from ? Array.from(t) : [].slice.call(t) } function s(t, e) { if (t && "function" == typeof t[e]) { for (var n = arguments.length, i = Array(n > 2 ? n - 2 : 0), r = 2; r < n; r++) i[r - 2] = arguments[r]; return t[e].apply(t, i) } } function a() { O || (O = !0, document.addEventListener("click", u, !0), document.addEventListener("submit", c), document.addEventListener("ajax:before", l)) } function u(t) { var e = t.target; "INPUT" != e.tagName && "BUTTON" != e.tagName || "submit" != e.type || !e.form || D.set(e.form, e) } function c(t) { h(t) } function l(t) { "FORM" == t.target.tagName && h(t) } function h(t) { var e = t.target; if (e.hasAtt
```

### `s`
```js
function s(t, e) { if (t && "function" == typeof t[e]) { for (var n = arguments.length, i = Array(n > 2 ? n - 2 : 0), r = 2; r < n; r++) i[r - 2] = arguments[r]; return t[e].apply(t, i) } } function a() { O || (O = !0, document.addEventListener("click", u, !0), document.addEventListener("submit", c), document.addEventListener("ajax:before", l)) } function u(t) { var e = t.target; "INPUT" != e.tagName && "BUTTON" != e.tagName || "submit" != e.type || !e.form || D.set(e.form, e) } function c(t) { h(t) } function l(t) { "FORM" == t.target.tagName && h(t) } function h(t) { var e = t.target; if (e.hasAttribute(_)) return void t.preventDefault(); var n = new S(e), i = n.inputs; i.length && (t.prev
```

### `getState`
```js
getState = function(t, e, n, i) { var r = this.$target.scrollTop(), o = this.$element.offset(), s = this.$target.height(); if (null != n && "top" == this.affixed) return r < n && "top"; if ("bottom" == this.affixed) return null != n ? !(r + this.unpin <= o.top) && "bottom" : !(r + s <= t - i) && "bottom"; var a = null == this.affixed, u = a ? r : o.top, c = a ? s : e; return null != n && r <= n ? "top" : null != i && u + c >= t - i && "bottom" }, n.prototype.getPinnedOffset = function() { if (this.pinnedOffset) return this.pinnedOffset; this.$element.removeClass(n.RESET).addClass("affix"); var t = this.$target.scrollTop(), e = this.$element.offset(); return this.pinnedOffset = e.top - t }, n
```

### `noConflict`
```js
noConflict = function() { return t.fn.button = i, this }, t(document).on("click.bs.button.data-api", '[data-toggle^="button"]', function(n) { var i = t(n.target).closest(".btn"); e.call(i, "toggle"), t(n.target).is('input[type="radio"], input[type="checkbox"]') || (n.preventDefault(), i.is("input,button") ? i.trigger("focus") : i.find("input:visible,button:visible").first().trigger("focus")) }).on("focus.bs.button.data-api blur.bs.button.data-api", '[data-toggle^="button"]', function(e) { t(e.target).closest(".btn").toggleClass("focus", /^focus(in)?$/.test(e.type)) }) }(jQuery) }, function(t, e) { + function(t) { "use strict"; function e(e) { return this.each(function() { var i = t(this), r 
```

### `stopEverything`
```js
stopEverything = function(t) { return e(t.target, "ujs:everythingStopped"), t.preventDefault(), t.stopPropagation(), t.stopImmediatePropagation() }, s.delegate = function(t, e, i, r) { return t.addEventListener(i, function(t) { var i; for (i = t.target; i instanceof Element && !n(i, e);) i = i.parentNode; if (i instanceof Element && !1 === r.call(i, t)) return t.preventDefault(), t.stopPropagation() }) } }.call(this), function() { var t, e, n, i, r, o; i = s.cspNonce, e = s.CSRFProtection, s.fire, t = { "*": "*/*", text: "text/plain", html: "text/html", xml: "application/xml, text/xml", json: "application/json, text/javascript", script: "text/javascript, application/javascript, applica
```

### `enableElement`
```js
enableElement = function(t) { var e; return e = t instanceof Event ? t.target : t, c(e, s.linkDisableSelector) ? o(e) : c(e, s.buttonDisableSelector) || c(e, s.formEnableSelector) ? i(e) : c(e, s.formSubmitSelector) ? r(e) : void 0 }, s.disableElement = function(i) { var r; return r = i instanceof Event ? i.target : i, c(r, s.linkDisableSelector) ? n(r) : c(r, s.buttonDisableSelector) || c(r, s.formDisableSelector) ? t(r) : c(r, s.formSubmitSelector) ? e(r) : void 0 }, n = function(t) { var e; return e = t.getAttribute("data-disable-with"), null != e && (l(t, "ujs:enable-with", t.innerHTML), t.innerHTML = e), t.addEventListener("click", h), l(t, "ujs:disabled", !0) }, o = function(t) { var e
```

### `i`
```js
i = function(t) { var e; return e = u(t, "ujs:enable-with"), null != e && (c(t, "button") ? t.innerHTML = e : t.value = e, l(t, "ujs:enable-with", null)), t.disabled = !1, l(t, "ujs:disabled", null) } }.call(this), function() { var t; t = s.stopEverything, s.handleMethod = function(e) { var n, i, r, o, a, u, c; if (u = this, c = u.getAttribute("data-method")) return a = s.href(u), i = s.csrfToken(), n = s.csrfParam(), r = document.createElement("form"), o = "<input name='_method' value='" + c + "' type='hidden' />", null == n || null == i || s.isCrossDomain(a) || (o += "<input name='" + n + "' value='" + i + "' type='hidden' />"), o += '<input type="submit" />', r.method = "post", r.action =
```

### `performScroll`
```js
performScroll = function() {}, $(document).on("turbolinks:load", u) }, l = function() { null != r && (clearInterval(r), r = null, e = -1) }, h = function() { var n = $("#auto-refresh"); if (n.length > 0) { var i = parseInt(n.data("refresh-interval"), 10); isNaN(i) && (i = 42), i != e && (l(), e = i, r = setInterval(function() { c(), t.visit(location.toString(), { action: "replace" }) }, 1e3 * e)), f() } else l() }, p = function() { $('[data-toggle="collapse"]').each(function(t, e) { var n = $(e), i = n.find("*[data-style-collapse], *[data-style-expand]"), r = $(n.data("target")); r.on("hide.bs.collapse show.bs.collapse", function(t) { if (r.is(t.target)) { var e = "data-style-e
```

### `l`
```js
l = function() { null != r && (clearInterval(r), r = null, e = -1) }, h = function() { var n = $("#auto-refresh"); if (n.length > 0) { var i = parseInt(n.data("refresh-interval"), 10); isNaN(i) && (i = 42), i != e && (l(), e = i, r = setInterval(function() { c(), t.visit(location.toString(), { action: "replace" }) }, 1e3 * e)), f() } else l() }, p = function() { $('[data-toggle="collapse"]').each(function(t, e) { var n = $(e), i = n.find("*[data-style-collapse], *[data-style-expand]"), r = $(n.data("target")); r.on("hide.bs.collapse show.bs.collapse", function(t) { if (r.is(t.target)) { var e = "data-style-expand", n = "data-style-collapse"; if (i.attr("data-s
```

### `h`
```js
h = function() { var n = $("#auto-refresh"); if (n.length > 0) { var i = parseInt(n.data("refresh-interval"), 10); isNaN(i) && (i = 42), i != e && (l(), e = i, r = setInterval(function() { c(), t.visit(location.toString(), { action: "replace" }) }, 1e3 * e)), f() } else l() }, p = function() { $('[data-toggle="collapse"]').each(function(t, e) { var n = $(e), i = n.find("*[data-style-collapse], *[data-style-expand]"), r = $(n.data("target")); r.on("hide.bs.collapse show.bs.collapse", function(t) { if (r.is(t.target)) { var e = "data-style-expand", n = "data-style-collapse"; if (i.attr("data-style-collapse")) { var o = e; e = n, n = o }
```

### `p`
```js
p = function() { $('[data-toggle="collapse"]').each(function(t, e) { var n = $(e), i = n.find("*[data-style-collapse], *[data-style-expand]"), r = $(n.data("target")); r.on("hide.bs.collapse show.bs.collapse", function(t) { if (r.is(t.target)) { var e = "data-style-expand", n = "data-style-collapse"; if (i.attr("data-style-collapse")) { var o = e; e = n, n = o } var s = i.attr(e), a = i.attr("class"); i.removeAttr(e), i.attr(n, a), i.attr("class", s) } }) }) }, d = function() { var t = function(t, e) { return e.dataset.remote || e.dataset.method }; document.addEventListener("ajax:beforeSend", function(e) { va
```

### `d`
```js
d = function() { var t = function(t, e) { return e.dataset.remote || e.dataset.method }; document.addEventListener("ajax:beforeSend", function(e) { var n = i(e.detail, 2), r = n[0]; n[1]; t(0, e.target) && r.setRequestHeader("X-Turbolinks-POST", "true") }), document.addEventListener("ajax:success", function(e) { var n = i(e.detail, 3), r = n[0]; n[1], n[2]; t(0, e.target) && r.location && s.navigateTo(r.location) }), document.addEventListener("ajax:error", function(t) { var e = i(t.detail, 3), n = e[0], r = (e[1], e[2]); s.handleAjaxFormSubmitError(r, n) }) }, f = function() { var t = g(); $("#auto-refresh .time").text(t) }, g = function() { var t = new Date
```

### `t`
```js
t = function(t, e) { return e.dataset.remote || e.dataset.method }; document.addEventListener("ajax:beforeSend", function(e) { var n = i(e.detail, 2), r = n[0]; n[1]; t(0, e.target) && r.setRequestHeader("X-Turbolinks-POST", "true") }), document.addEventListener("ajax:success", function(e) { var n = i(e.detail, 3), r = n[0]; n[1], n[2]; t(0, e.target) && r.location && s.navigateTo(r.location) }), document.addEventListener("ajax:error", function(t) { var e = i(t.detail, 3), n = e[0], r = (e[1], e[2]); s.handleAjaxFormSubmitError(r, n) }) }, f = function() { var t = g(); $("#auto-refresh .time").text(t) }, g = function() { var t = new Date, e = t.getHours(),
```

### `updateDates`
```js
updateDates: function() { this.dates = t.map(this.pickers, function(t) { return t.getUTCDate() }), this.updateRanges() }, updateRanges: function() { var e = t.map(this.dates, function(t) { return t.valueOf() }); t.each(this.pickers, function(t, n) { n.setRange(e) }) }, dateUpdated: function(n) { if (!this.updating) { this.updating = !0; var i = t.data(n.target, "datepicker"); if (i !== e) { var r = i.getUTCDate(), o = this.keepEmptyValues, s = t.inArray(n.target, this.inputs), a = s - 1, u = s + 1, c = this.inputs.length; if (-1 !== s) { if (t.each(this.pickers, function(t, e) { e.getUTCDate() || e !== i && o || e.setUTCDate(r
```

### `updateRanges`
```js
updateRanges: function() { var e = t.map(this.dates, function(t) { return t.valueOf() }); t.each(this.pickers, function(t, n) { n.setRange(e) }) }, dateUpdated: function(n) { if (!this.updating) { this.updating = !0; var i = t.data(n.target, "datepicker"); if (i !== e) { var r = i.getUTCDate(), o = this.keepEmptyValues, s = t.inArray(n.target, this.inputs), a = s - 1, u = s + 1, c = this.inputs.length; if (-1 !== s) { if (t.each(this.pickers, function(t, e) { e.getUTCDate() || e !== i && o || e.setUTCDate(r) }), r < this.dates[a]) for (; a >= 0 && r < this.dates[a];) this.pickers[a--].setUTCDate(r); else if (r > this.d
```

### `dateUpdated`
```js
dateUpdated: function(n) { if (!this.updating) { this.updating = !0; var i = t.data(n.target, "datepicker"); if (i !== e) { var r = i.getUTCDate(), o = this.keepEmptyValues, s = t.inArray(n.target, this.inputs), a = s - 1, u = s + 1, c = this.inputs.length; if (-1 !== s) { if (t.each(this.pickers, function(t, e) { e.getUTCDate() || e !== i && o || e.setUTCDate(r) }), r < this.dates[a]) for (; a >= 0 && r < this.dates[a];) this.pickers[a--].setUTCDate(r); else if (r > this.dates[u]) for (; u < c && r > this.dates[u];) this.pickers[u++].setUTCDate(r); this.updateDates(), delete this.updating } } } }, destroy: fun
```
