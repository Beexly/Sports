# teamrankings.com — engineering

App bundles beautified: **4**  
JSON endpoints captured: **1**  
Client functions passing filter: **25**

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
trigger: function(b, c, e, f) { var g, h, i, j, k, m, n, o = [e || d], p = l.call(b, "type") ? b.type : b, q = l.call(b, "namespace") ? b.namespace.split(".") : []; if (h = i = e = e || d, 3 !== e.nodeType && 8 !== e.nodeType && !sb.test(p + r.event.triggered) && (p.indexOf(".") > -1 && (q = p.split("."), p = q.shift(), q.sort()), k = p.indexOf(":") < 0 && "on" + p, b = b[r.expando] ? b : new r.Event(p, "object" == typeof b && b), b.isTrigger = f ? 2 : 3, b.namespace = q.join("."), b.rnamespace = b.namespace ? new RegExp("(^|\\.)" + q.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, b.result = void 0, b.target || (b.target = e), c = null == c ? [b] : r.makeArray(c, [b]), n = r.event.special[p] || 
```

### `c`
```js
c = function(a) { r.event.simulate(b, a.target, r.event.fix(a)) }; r.event.special[b] = { setup: function() { var d = this.ownerDocument || this, e = W.access(d, b); e || d.addEventListener(a, c, !0), W.access(d, b, (e || 0) + 1) }, teardown: function() { var d = this.ownerDocument || this, e = W.access(d, b) - 1; e ? W.access(d, b, e) : (d.removeEventListener(a, c, !0), W.remove(d, b)) } } }); var tb = a.location, ub = r.now(), vb = /\?/; r.parseXML = function(b) { var c; if (!b || "string" != typeof b) return null; try { c = (new a.DOMParser).parseFromString(b, "text/xml") } catch (d) { c = void 0 } return c && !c.getElementsByTagName("parsererror").length || r.error("Invalid XML: " + b), 
```

### `wa`
```js
function wa(a, b, c) { var d, e, f = ua(a.year(), b, c), g = Math.floor((a.dayOfYear() - f - 1) / 7) + 1; return g < 1 ? (e = a.year() - 1, d = g + xa(e, b, c)) : g > xa(a.year(), b, c) ? (d = g - xa(a.year(), b, c), e = a.year() + 1) : (e = a.year(), d = g), { week: d, year: e } } function xa(a, b, c) { var d = ua(a, b, c), e = ua(a + 1, b, c); return (pa(a) - d + e) / 7 } function ya(a) { return wa(a, this._week.dow, this._week.doy).week } function za() { return this._week.dow } function Aa() { return this._week.doy } function Ba(a) { var b = this.localeData().week(this); return null == a ? b : this.add(7 * (a - b), "d") } function Ca(a) { var b = wa(this, 1, 4).week; return null == a ? b 
```

### `xa`
```js
function xa(a, b, c) { var d = ua(a, b, c), e = ua(a + 1, b, c); return (pa(a) - d + e) / 7 } function ya(a) { return wa(a, this._week.dow, this._week.doy).week } function za() { return this._week.dow } function Aa() { return this._week.doy } function Ba(a) { var b = this.localeData().week(this); return null == a ? b : this.add(7 * (a - b), "d") } function Ca(a) { var b = wa(this, 1, 4).week; return null == a ? b : this.add(7 * (a - b), "d") } function Da(a, b) { return "string" != typeof a ? a : isNaN(a) ? (a = b.weekdaysParse(a), "number" == typeof a ? a : null) : parseInt(a, 10) } function Ea(a, b) { return "string" == typeof a ? b.weekdaysParse(a) % 7 || 7 : isNaN(a) ? null : a } functio
```

### `ya`
```js
function ya(a) { return wa(a, this._week.dow, this._week.doy).week } function za() { return this._week.dow } function Aa() { return this._week.doy } function Ba(a) { var b = this.localeData().week(this); return null == a ? b : this.add(7 * (a - b), "d") } function Ca(a) { var b = wa(this, 1, 4).week; return null == a ? b : this.add(7 * (a - b), "d") } function Da(a, b) { return "string" != typeof a ? a : isNaN(a) ? (a = b.weekdaysParse(a), "number" == typeof a ? a : null) : parseInt(a, 10) } function Ea(a, b) { return "string" == typeof a ? b.weekdaysParse(a) % 7 || 7 : isNaN(a) ? null : a } function Fa(a, b) { return a ? c(this._weekdays) ? this._weekdays[a.day()] : this._weekdays[this._wee
```

### `trigger`
```js
function trigger(e) { $(e.target).trigger("tap", [e, $(e.target).attr("href")]); } function getCoords(e) { var ev = e.originalEvent || e, touches = ev.touches || ev.targetTouches; if (touches) { return [touches[0].pageX, touches[0].pageY]; } else { return null; } } function start(e) { if (e.touches && e.touches.length > 1 || e.targetTouches && e.targetTouches.length > 1) { return false; } var coords = getCoords(e); startX = coords[0]; startY = coords[1]; } // any touchscroll that results in > tolerance should cancel the tap function move(e) { if (!cancel) { var coords = getCoords(e); if (coords && (Math.abs(startY - coords[1]) > scrollTolerance || Math.abs(startX - coords[0]) > scrollToleran
```

### `setup`
```js
setup: function(b, c) { "object" != typeof b || b instanceof a != !1 || c || (c = b, b = void 0); var d = a.extend(this, c, { target: b }), e = d.resetCss ? d.namespace + "-reset" : d.namespace, f = a(d.background || ['<div class="' + e + "-loading " + e + '">', '<div class="' + e + '-content">', '<button class="' + e + "-close-icon " + d.namespace + '-close" aria-label="Close">', d.closeIcon, "</button>", '<div class="' + d.namespace + '-inner">' + d.loading + "</div>", "</div>", "</div>"].join("")), g = "." + d.namespace + "-close" + (d.otherClose ? "," + d.otherClose : ""); return d.$instance = f.clone().addClass(d.variant), d.$instance.on(d.closeTrigger + "." + d.namespace, function(b) {
```

### `va`
```js
function va(a, b, c, d, e) { var f, g, h = (7 + c - d) % 7, i = ua(a, d, e), j = 1 + 7 * (b - 1) + h + i; return j <= 0 ? (f = a - 1, g = pa(f) + j) : j > pa(a) ? (f = a + 1, g = j - pa(a)) : (f = a, g = j), { year: f, dayOfYear: g } } function wa(a, b, c) { var d, e, f = ua(a.year(), b, c), g = Math.floor((a.dayOfYear() - f - 1) / 7) + 1; return g < 1 ? (e = a.year() - 1, d = g + xa(e, b, c)) : g > xa(a.year(), b, c) ? (d = g - xa(a.year(), b, c), e = a.year() + 1) : (e = a.year(), d = g), { week: d, year: e } } function xa(a, b, c) { var d = ua(a, b, c), e = ua(a + 1, b, c); return (pa(a) - d + e) / 7 } function ya(a) { return wa(a, this._week.dow, this._week.doy).week } function za() { re
```

### `za`
```js
function za() { return this._week.dow } function Aa() { return this._week.doy } function Ba(a) { var b = this.localeData().week(this); return null == a ? b : this.add(7 * (a - b), "d") } function Ca(a) { var b = wa(this, 1, 4).week; return null == a ? b : this.add(7 * (a - b), "d") } function Da(a, b) { return "string" != typeof a ? a : isNaN(a) ? (a = b.weekdaysParse(a), "number" == typeof a ? a : null) : parseInt(a, 10) } function Ea(a, b) { return "string" == typeof a ? b.weekdaysParse(a) % 7 || 7 : isNaN(a) ? null : a } function Fa(a, b) { return a ? c(this._weekdays) ? this._weekdays[a.day()] : this._weekdays[this._weekdays.isFormat.test(b) ? "format" : "standalone"][a.day()] : c(this._
```

### `Aa`
```js
function Aa() { return this._week.doy } function Ba(a) { var b = this.localeData().week(this); return null == a ? b : this.add(7 * (a - b), "d") } function Ca(a) { var b = wa(this, 1, 4).week; return null == a ? b : this.add(7 * (a - b), "d") } function Da(a, b) { return "string" != typeof a ? a : isNaN(a) ? (a = b.weekdaysParse(a), "number" == typeof a ? a : null) : parseInt(a, 10) } function Ea(a, b) { return "string" == typeof a ? b.weekdaysParse(a) % 7 || 7 : isNaN(a) ? null : a } function Fa(a, b) { return a ? c(this._weekdays) ? this._weekdays[a.day()] : this._weekdays[this._weekdays.isFormat.test(b) ? "format" : "standalone"][a.day()] : c(this._weekdays) ? this._weekdays : this._weekd
```

### `Ba`
```js
function Ba(a) { var b = this.localeData().week(this); return null == a ? b : this.add(7 * (a - b), "d") } function Ca(a) { var b = wa(this, 1, 4).week; return null == a ? b : this.add(7 * (a - b), "d") } function Da(a, b) { return "string" != typeof a ? a : isNaN(a) ? (a = b.weekdaysParse(a), "number" == typeof a ? a : null) : parseInt(a, 10) } function Ea(a, b) { return "string" == typeof a ? b.weekdaysParse(a) % 7 || 7 : isNaN(a) ? null : a } function Fa(a, b) { return a ? c(this._weekdays) ? this._weekdays[a.day()] : this._weekdays[this._weekdays.isFormat.test(b) ? "format" : "standalone"][a.day()] : c(this._weekdays) ? this._weekdays : this._weekdays.standalone } function Ga(a) { return
```

### `ta`
```js
function ta(a) { var b = new Date(Date.UTC.apply(null, arguments)); return a < 100 && a >= 0 && isFinite(b.getUTCFullYear()) && b.setUTCFullYear(a), b } function ua(a, b, c) { var d = 7 + b - c, e = (7 + ta(a, 0, d).getUTCDay() - b) % 7; return -e + d - 1 } function va(a, b, c, d, e) { var f, g, h = (7 + c - d) % 7, i = ua(a, d, e), j = 1 + 7 * (b - 1) + h + i; return j <= 0 ? (f = a - 1, g = pa(f) + j) : j > pa(a) ? (f = a + 1, g = j - pa(a)) : (f = a, g = j), { year: f, dayOfYear: g } } function wa(a, b, c) { var d, e, f = ua(a.year(), b, c), g = Math.floor((a.dayOfYear() - f - 1) / 7) + 1; return g < 1 ? (e = a.year() - 1, d = g + xa(e, b, c)) : g > xa(a.year(), b, c) ? (d = g - xa(a.year
```

### `ua`
```js
function ua(a, b, c) { var d = 7 + b - c, e = (7 + ta(a, 0, d).getUTCDay() - b) % 7; return -e + d - 1 } function va(a, b, c, d, e) { var f, g, h = (7 + c - d) % 7, i = ua(a, d, e), j = 1 + 7 * (b - 1) + h + i; return j <= 0 ? (f = a - 1, g = pa(f) + j) : j > pa(a) ? (f = a + 1, g = j - pa(a)) : (f = a, g = j), { year: f, dayOfYear: g } } function wa(a, b, c) { var d, e, f = ua(a.year(), b, c), g = Math.floor((a.dayOfYear() - f - 1) / 7) + 1; return g < 1 ? (e = a.year() - 1, d = g + xa(e, b, c)) : g > xa(a.year(), b, c) ? (d = g - xa(a.year(), b, c), e = a.year() + 1) : (e = a.year(), d = g), { week: d, year: e } } function xa(a, b, c) { var d = ua(a, b, c), e = ua(a + 1, b, c); return (pa(
```

### `vb`
```js
function vb() { var a = [].slice.call(arguments, 0); return ub("isBefore", a) } function wb() { var a = [].slice.call(arguments, 0); return ub("isAfter", a) } function xb(a) { for (var b in a) if (Re.indexOf(b) === -1 || null != a[b] && isNaN(a[b])) return !1; for (var c = !1, d = 0; d < Re.length; ++d) if (a[Re[d]]) { if (c) return !1; parseFloat(a[Re[d]]) !== u(a[Re[d]]) && (c = !0) } return !0 } function yb() { return this._isValid } function zb() { return Sb(NaN) } function Ab(a) { var b = L(a), c = b.year || 0, d = b.quarter || 0, e = b.month || 0, f = b.week || 0, g = b.day || 0, h = b.hour || 0, i = b.minute || 0, j = b.second || 0, k = b.millisecond || 0; this._isValid = xb(b), this.
```

### `wb`
```js
function wb() { var a = [].slice.call(arguments, 0); return ub("isAfter", a) } function xb(a) { for (var b in a) if (Re.indexOf(b) === -1 || null != a[b] && isNaN(a[b])) return !1; for (var c = !1, d = 0; d < Re.length; ++d) if (a[Re[d]]) { if (c) return !1; parseFloat(a[Re[d]]) !== u(a[Re[d]]) && (c = !0) } return !0 } function yb() { return this._isValid } function zb() { return Sb(NaN) } function Ab(a) { var b = L(a), c = b.year || 0, d = b.quarter || 0, e = b.month || 0, f = b.week || 0, g = b.day || 0, h = b.hour || 0, i = b.minute || 0, j = b.second || 0, k = b.millisecond || 0; this._isValid = xb(b), this._milliseconds = +k + 1e3 * j + 6e4 * i + 1e3 * h * 60 * 60, this._days = +g + 7 
```

### `xb`
```js
function xb(a) { for (var b in a) if (Re.indexOf(b) === -1 || null != a[b] && isNaN(a[b])) return !1; for (var c = !1, d = 0; d < Re.length; ++d) if (a[Re[d]]) { if (c) return !1; parseFloat(a[Re[d]]) !== u(a[Re[d]]) && (c = !0) } return !0 } function yb() { return this._isValid } function zb() { return Sb(NaN) } function Ab(a) { var b = L(a), c = b.year || 0, d = b.quarter || 0, e = b.month || 0, f = b.week || 0, g = b.day || 0, h = b.hour || 0, i = b.minute || 0, j = b.second || 0, k = b.millisecond || 0; this._isValid = xb(b), this._milliseconds = +k + 1e3 * j + 6e4 * i + 1e3 * h * 60 * 60, this._days = +g + 7 * f, this._months = +e + 3 * d + 12 * c, this._data = {}, this._locale = bb(), 
```

### `yb`
```js
function yb() { return this._isValid } function zb() { return Sb(NaN) } function Ab(a) { var b = L(a), c = b.year || 0, d = b.quarter || 0, e = b.month || 0, f = b.week || 0, g = b.day || 0, h = b.hour || 0, i = b.minute || 0, j = b.second || 0, k = b.millisecond || 0; this._isValid = xb(b), this._milliseconds = +k + 1e3 * j + 6e4 * i + 1e3 * h * 60 * 60, this._days = +g + 7 * f, this._months = +e + 3 * d + 12 * c, this._data = {}, this._locale = bb(), this._bubble() } function Bb(a) { return a instanceof Ab } function Cb(a) { return a < 0 ? Math.round(-1 * a) * -1 : Math.round(a) } function Db(a, b) { U(a, 0, 0, function() { var a = this.utcOffset(), c = "+"; return a < 0 && (a = -a, c = "-
```

### `zb`
```js
function zb() { return Sb(NaN) } function Ab(a) { var b = L(a), c = b.year || 0, d = b.quarter || 0, e = b.month || 0, f = b.week || 0, g = b.day || 0, h = b.hour || 0, i = b.minute || 0, j = b.second || 0, k = b.millisecond || 0; this._isValid = xb(b), this._milliseconds = +k + 1e3 * j + 6e4 * i + 1e3 * h * 60 * 60, this._days = +g + 7 * f, this._months = +e + 3 * d + 12 * c, this._data = {}, this._locale = bb(), this._bubble() } function Bb(a) { return a instanceof Ab } function Cb(a) { return a < 0 ? Math.round(-1 * a) * -1 : Math.round(a) } function Db(a, b) { U(a, 0, 0, function() { var a = this.utcOffset(), c = "+"; return a < 0 && (a = -a, c = "-"), c + T(~~(a / 60), 2) + b + T(~~a % 
```

### `Ab`
```js
function Ab(a) { var b = L(a), c = b.year || 0, d = b.quarter || 0, e = b.month || 0, f = b.week || 0, g = b.day || 0, h = b.hour || 0, i = b.minute || 0, j = b.second || 0, k = b.millisecond || 0; this._isValid = xb(b), this._milliseconds = +k + 1e3 * j + 6e4 * i + 1e3 * h * 60 * 60, this._days = +g + 7 * f, this._months = +e + 3 * d + 12 * c, this._data = {}, this._locale = bb(), this._bubble() } function Bb(a) { return a instanceof Ab } function Cb(a) { return a < 0 ? Math.round(-1 * a) * -1 : Math.round(a) } function Db(a, b) { U(a, 0, 0, function() { var a = this.utcOffset(), c = "+"; return a < 0 && (a = -a, c = "-"), c + T(~~(a / 60), 2) + b + T(~~a % 60, 2) }) } function Eb(a, b) { v
```

### `cc`
```js
function cc(a, b) { var c, d = s(a) ? a : tb(a); return !(!this.isValid() || !d.isValid()) && (b = K(b || "millisecond"), "millisecond" === b ? this.valueOf() === d.valueOf() : (c = d.valueOf(), this.clone().startOf(b).valueOf() <= c && c <= this.clone().endOf(b).valueOf())) } function dc(a, b) { return this.isSame(a, b) || this.isAfter(a, b) } function ec(a, b) { return this.isSame(a, b) || this.isBefore(a, b) } function fc(a, b, c) { var d, e, f, g; return this.isValid() ? (d = Fb(a, this), d.isValid() ? (e = 6e4 * (d.utcOffset() - this.utcOffset()), b = K(b), "year" === b || "month" === b || "quarter" === b ? (g = gc(this, d), "quarter" === b ? g /= 3 : "year" === b && (g /= 12)) : (f = t
```

### `dc`
```js
function dc(a, b) { return this.isSame(a, b) || this.isAfter(a, b) } function ec(a, b) { return this.isSame(a, b) || this.isBefore(a, b) } function fc(a, b, c) { var d, e, f, g; return this.isValid() ? (d = Fb(a, this), d.isValid() ? (e = 6e4 * (d.utcOffset() - this.utcOffset()), b = K(b), "year" === b || "month" === b || "quarter" === b ? (g = gc(this, d), "quarter" === b ? g /= 3 : "year" === b && (g /= 12)) : (f = this - d, g = "second" === b ? f / 1e3 : "minute" === b ? f / 6e4 : "hour" === b ? f / 36e5 : "day" === b ? (f - e) / 864e5 : "week" === b ? (f - e) / 6048e5 : f), c ? g : t(g)) : NaN) : NaN } function gc(a, b) { var c, d, e = 12 * (b.year() - a.year()) + (b.month() - a.month())
```

### `ec`
```js
function ec(a, b) { return this.isSame(a, b) || this.isBefore(a, b) } function fc(a, b, c) { var d, e, f, g; return this.isValid() ? (d = Fb(a, this), d.isValid() ? (e = 6e4 * (d.utcOffset() - this.utcOffset()), b = K(b), "year" === b || "month" === b || "quarter" === b ? (g = gc(this, d), "quarter" === b ? g /= 3 : "year" === b && (g /= 12)) : (f = this - d, g = "second" === b ? f / 1e3 : "minute" === b ? f / 6e4 : "hour" === b ? f / 36e5 : "day" === b ? (f - e) / 864e5 : "week" === b ? (f - e) / 6048e5 : f), c ? g : t(g)) : NaN) : NaN } function gc(a, b) { var c, d, e = 12 * (b.year() - a.year()) + (b.month() - a.month()), f = a.clone().add(e, "months"); return b - f < 0 ? (c = a.clone().a
```

### `tableRows`
```js
function tableRows(action) { //this might need to be handled another way if the special cases keep growing if (action == 'show') { $('.ajax-table tbody tr, .nfl-schedules .ajax-div tbody tr, .ncf-schedules .ajax-div tbody tr, .nba-schedules .ajax-div tbody tr, .ncb-schedules .ajax-div tbody tr, .mlb-schedules .ajax-div tbody tr, .ajax-div table, .ajax-div .module').show(); } else { $('.ajax-table tbody tr, .nfl-schedules .ajax-div tbody tr, .ncf-schedules .ajax-div tbody tr, .nba-schedules .ajax-div tbody tr, .ncb-schedules .ajax-div tbody tr, .mlb-schedules .ajax-div tbody tr, .ajax-div table').hide(); } } function updateVals(selectAttr) { $('.filter').each(function() { if ($(this).attr('id
```

### `tableSorting`
```js
function tableSorting() { $('#nomatches').remove(); if ($('body').hasClass('nfl-scores') || $('body').hasClass('ncf-scores') || $('body').hasClass('nba-scores') || $('body').hasClass('ncb-scores') || $('body').hasClass('mlb-scores')) { if ($('.ajax-div').find('.score:visible').length == 0) { $('.ajax-div').append('<div id="nomatches" class="empty">No matches.</div>'); } } else { $('.sortable').each(function() { if ($(this).find('tbody tr:visible').length > 0) { $(this).find('th').removeClass('sorted-asc sorted-desc'); tempInit = $(this).find('.sortby:first'); tableSort(tempInit, tempInit.index()); } else { $(this).find('tbody').append('<tr id="nomatches"><td class="empty">No matches.</td></t
```

### `scroll_if_anchor`
```js
function scroll_if_anchor(anchorVal, activatedBy) { if (!anchorVal) return; // offset for fixed header if ($(".header-top").css("position") == "fixed") { var fromTop = parseInt($(".header-top").css("height"), 10) + 10; } else { var fromTop = 10; } // If our Href points to a valid, non-empty anchor, and is on the same page (e.g. #foo) // Legacy jQuery and IE7 may have issues: http://stackoverflow.com/q/1593174 var $target = $('#' + anchorVal); // if there's no target, it might be behind the paywall - in which case, let's scroll to the paywall so it doesn't seem like the page is broken: if ($target.length == 0) { var $target = $("#paywall"); } // Older browsers without pushState might flicker 
```
