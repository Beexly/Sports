# vsin.com — engineering

App bundles beautified: **7**  
JSON endpoints captured: **0**  
Client functions passing filter: **53**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `prepareEvents`
```js
prepareEvents = function() { ! function(e, t, o) { void 0 === t && (t = {}); var n = e.prefix, i = document.querySelectorAll("[data-" + n + "-action]"), a = ["SELECT"], r = n + "Listener"; i.length > 0 && i.forEach((function(i) { var s = i.getAttribute("data-" + n + "-listener"); a.includes(i.tagName) ? "true" !== s && (i.dataset[r] = !0, i.addEventListener("change", (function(a) { C(i.dataset[n + "Action"], a.target, o, e, t) })), i.name === n + "-cookies-notice-consent-duration" && i.addEventListener("click", (function(a) { C(i.dataset[n + "Action"], a, o, e, t) }))) : "true" !== s && (i.dataset[r] = !0, i.addEventListener("click", (function(a) { ["A", "BUTTON"].includes(a.target.tagName) 
```

### `s`
```js
s = function(e) { return String(e || "").split("{service}").join(a).split("{category}").join(r) }, c = e.dataset.policy || "", l = /^https?:\/\//i.test(c) ? c : "", p = s(t.unblockPolicyText), d = l && p ? '<a class="' + i + '-iframe-policy" href="' + E(l) + '" target="_blank" rel="noopener noreferrer nofollow">' + p + "</a>" : "", g = s(t.unblockHeadingText), u = s(t.unblockDataText), f = r ? s(t.unblockConsentText) : "", y = !0 === (o.options && o.options.config || {}).revokeConsent ? s(t.unblockWithdrawText) : ""; e.innerHTML = '\n\t\t\t<div class="' + i + '-iframe-content">\n\t\t\t\t' + (g ? '<p class="' + i + "-iframe-heading " + i + '-p"><strong>' + g + "</strong></p>" : "") + '\n\t\t\
```

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
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

### `container_mouseup`
```js
container_mouseup = function(t) { if ("ABBR" === t.target.nodeName && !this.is_disabled) return this.results_reset(t) }, n.prototype.search_results_mousewheel = function(t) { var e; if (t.originalEvent && (e = t.originalEvent.deltaY || -t.originalEvent.wheelDelta || t.originalEvent.detail), null != e) return t.preventDefault(), "DOMMouseScroll" === t.type && (e *= 40), this.search_results.scrollTop(e + this.search_results.scrollTop()) }, n.prototype.blur_test = function(t) { if (!this.active_field && this.container.hasClass("chosen-container-active")) return this.close_field() }, n.prototype.close_field = function() { return t(this.container[0].ownerDocument).off("click.chosen", this.click_t
```

### `mb_getPlayerName`
```js
function mb_getPlayerName(player, abbreviateFirstName) { return ((player["firstName"] ? ((abbreviateFirstName && player.hasOwnProperty("lastName")) ? player["firstName"].substring(0, 1) + "." : player["firstName"]) : "") + " " + (player["lastName"] ? player["lastName"] : "")).trim() } function mb_getUpcomingDateTime(game, isCompactDisplay) { var date = new Date(game["date"]); if (!date) { return "-"; } var boundary; //Just show time boundary = Date.now() + 1000 * 60 * 60 * 18; if (date.getTime() < boundary) { return mb_getShortTime(game); } //Show day of week and time boundary = new Date(); boundary.setHours(0, 0, 0, 0); boundary = new Date(boundary.getTime() + 1000 * 60 * 60 * 24 * 4); if (
```

### `live`
```js
live = function(shouldEnable, pollingInterval) { mb_livePriceHistoryGraph(element, shouldEnable, pollingInterval); }; updateGraphView(); mb_trackRender(element, query); } function mb_livePriceHistoryGraph(target, isLiveEnabled, pollingInterval) { var elements = []; if (!target) { elements = Array.from(document.getElementsByClassName("metabet-price-history-graph")); } else if (typeof target === "string") { elements = Array.from(document.querySelectorAll(target)); } else if (target.forEach) { target.forEach(function(item) { elements.push(item); }); } else { elements = [target]; } var shouldEnable = (isLiveEnabled !== undefined) ? isLiveEnabled : true; elements.forEach(function(element) { if (!
```

### `mb_livePriceHistoryGraph`
```js
function mb_livePriceHistoryGraph(target, isLiveEnabled, pollingInterval) { var elements = []; if (!target) { elements = Array.from(document.getElementsByClassName("metabet-price-history-graph")); } else if (typeof target === "string") { elements = Array.from(document.querySelectorAll(target)); } else if (target.forEach) { target.forEach(function(item) { elements.push(item); }); } else { elements = [target]; } var shouldEnable = (isLiveEnabled !== undefined) ? isLiveEnabled : true; elements.forEach(function(element) { if (!element) { return; } if (element.priceHistoryPoller) { clearInterval(element.priceHistoryPoller); element.priceHistoryPoller = null; } if (element.priceHistoryTicker) { cl
```

### `mb_bubbleOver`
```js
function mb_bubbleOver(e) { if (e.target && (e.target.className == "metabet-winnings")) { //Calculate where the bubble should be var BUBBLE_WIDTH = 200; var leftPos = (e.target.offsetWidth - BUBBLE_WIDTH) / 2; var winningsRect = e.target.getBoundingClientRect(); if (winningsRect["x"] < BUBBLE_WIDTH / 2) { //Prevent being cutoff on the left side leftPos = 0; } else if (winningsRect["x"] > window.innerWidth - BUBBLE_WIDTH) { //Prevent being cutoff on the right side leftPos = (BUBBLE_WIDTH / 1.5) * -1; } //Position the bubble var winningsDetail = e.target.getElementsByClassName("metabet-winnings-detail")[0]; winningsDetail.style.left = leftPos + "px"; winningsDetail.classList.add("metabet-winni
```

### `updatePriceHistoryView`
```js
updatePriceHistoryView = function() { if (svgContainerElement.classList.contains("metabet-price-history-graph-scrubbing")) { return; } if (!graphConfiguration.isFinal && isLiveScrollingRange(activeRange)) { updateXAxisLabels(); updateGraphView(); } }; element.priceHistoryConfiguration = graphConfiguration; element.live = function(shouldEnable, pollingInterval) { mb_livePriceHistoryGraph(element, shouldEnable, pollingInterval); }; updateGraphView(); mb_trackRender(element, query); } function mb_livePriceHistoryGraph(target, isLiveEnabled, pollingInterval) { var elements = []; if (!target) { elements = Array.from(document.getElementsByClassName("metabet-price-history-graph")); } else if (typeo
```

### `mb_bubbleLeave`
```js
function mb_bubbleLeave(e) { e.target.getElementsByClassName("metabet-winnings-detail")[0].classList.remove("metabet-winnings-detail-show"); } function mb_bubbleClick(e) { if (e.target && (e.target.className == "metabet-winnings")) { if (e.type == "touchstart") { //Treat the click as a mouseover, if on mobile e.preventDefault(); mb_bubbleOver(e); e.stopPropogation(); } else { if (RUWT_ENABLE_OUTBOUND_LINKS) { //If the bubble icon (or spread value) is clicked, //pick a URL from within the bubble as our destination. var links = e.target.getElementsByTagName("a"); for (var i = 0; i < links.length; i++) { window.location.href = links[i].href; break; } } } } else if (e.type == "touchstart") { //H
```

### `mb_insertOddsBoard`
```js
function mb_insertOddsBoard(target) { var elements = target ? new Array(target) : document.getElementsByClassName("metabet-odds-board"); Array.from(elements).forEach(function(element) { var a, div, option, select; //Build dictionary of all sports/leagues var ALL_SPORTS = ["MLB", "NBA", "NFL", "NHL", "NCAAB", "NCAAF", "EPL", "Ligue 1", "Bundesliga", "Serie A", "La Liga", "Champions League", "MLS", "Liga MX"]; var ALL_LEAGUE_CODES = ["BBM", "BKP", "FBP", "HKN", "BKC", "FBC", "SOE", "SOF", "SOG", "SOI", "SOS", "SCB", "SOM", "SOX"]; if (new Array("actionrush", "dailyfantasyinsider", "dfsarmy", "freeplays", "krackwins", "time2play", "todaysodds", "vsao", "wewingames", "wiseguyteam", "wsn", "wsn-s
```

### `mb_insertFuturesBoard`
```js
function mb_insertFuturesBoard(target) { var elements = target ? new Array(target) : document.getElementsByClassName("metabet-futures-board"); Array.from(elements).forEach(function(element) { var a, div, option, select; //Build dictionary of all sports/leagues var ALL_SPORTS = ["MLB", "NBA", "NFL", "NHL", "NCAAB", "NCAAF"]; var ALL_LEAGUE_CODES = ["BBM", "BKP", "FBP", "HKN", "BKC", "FBC"]; //Which sports/leagues do we want to display? var sports = ALL_SPORTS; //Get passed-in parameters var defaultSport = "nfl"; var country = "US"; var location = null; var query = null; var betStyle = "classic"; element.classList.forEach(function(className) { if (className.match("metabet(-futures-board)?-leag
```

### `mb_insertVendorGameTiles`
```js
function mb_insertVendorGameTiles(target) { if (!target) { return; } var elements = (target.length === undefined) ? new Array(target) : target; Array.from(elements).forEach(function(element) { var query = null; element.classList.forEach(function(className) { if (className.match(".+-query-.+")) { query = className.replace(/.*-query-/, ""); } }); if (!query) { return; } //Fetch the data from the API mb_getJSON(mb_buildStaticAPIURL("/api/odds.json?showSportRadarGameGUIDs&q=" + query), function(oddsData) { if (oddsData["results"].length > 0) { //Search through the results for the team's next or //currently in-progress game var game = null; for (var i = 0; i < oddsData["results"].length; i++) { i
```

### `mb_createResizeObservers`
```js
function mb_createResizeObservers(target) { if ("ResizeObserver" in self) { var observer = new ResizeObserver(function(entries) { entries.forEach(function(entry) { //Update responsive size classes on element var breakpoints = { "metabet-size-xs": 384, "metabet-size-s": 576, "metabet-size-m": 768, "metabet-size-l": 992, "metabet-size-xl": 1200, "metabet-size-xxl": 1400 }; Object.keys(breakpoints).forEach(function(breakpoint) { entry.target.classList.toggle(breakpoint, (entry.contentRect.width >= breakpoints[breakpoint])); }); //If this is an ad tile, recalculate size modifiers if (entry.target.classList.contains("metabet-gametile") || entry.target.classList.contains("metabet-oddscompare") || 
```

### `mb_bubbleClick`
```js
function mb_bubbleClick(e) { if (e.target && (e.target.className == "metabet-winnings")) { if (e.type == "touchstart") { //Treat the click as a mouseover, if on mobile e.preventDefault(); mb_bubbleOver(e); e.stopPropogation(); } else { if (RUWT_ENABLE_OUTBOUND_LINKS) { //If the bubble icon (or spread value) is clicked, //pick a URL from within the bubble as our destination. var links = e.target.getElementsByTagName("a"); for (var i = 0; i < links.length; i++) { window.location.href = links[i].href; break; } } } } else if (e.type == "touchstart") { //Hide any currently-visible overlays e.target.getElementsByClassName("metabet-winnings-detail-show")[0].classList.remove("metabet-winnings-detail
```

### `mb_insertBroadcastTiles`
```js
function mb_insertBroadcastTiles(target) { var elements = target ? new Array(target) : document.getElementsByClassName("metabet-broadcasttile"); Array.from(elements).forEach(function(element) { //Basic parameters for the tile, with defaults var query = "nfl"; var width = "750px"; var height = "300px"; var style = "classic"; var country = "US"; var location = null; //Get passed-in parameters var classes = element.className.split(' '); for (var i = 0; i < classes.length; i++) { if (classes[i].match(/^metabet-size-[0-9]+.*x[0-9]+.*$/)) { width = classes[i].split("-")[2].split("x")[0]; if (width.indexOf("%") == -1) { width += "px"; } height = classes[i].split("-")[2].split("x")[1] + "px"; } else
```

### `mb_insertOddsValues`
```js
function mb_insertOddsValues(target) { var elements = target ? new Array(target) : document.getElementsByClassName("metabet-odds"); Array.from(elements).forEach(function(element) { //Get the classes on the element var classes = element.classList; //Determine which type of value we're showing var market = null; var query = null; var style = "classic"; var country = "US"; var location = null; var fallback = "none"; var isHomeTeam; var isMoneyLineTie; var showProvider = RUWT_SITE_FAMILY_CATENA || element.classList.contains("metabet-show-provider"); var isGameQuery = false; var isGranularGameQuery = false; for (var i = 0; i < classes.length; i++) { if (classes[i].indexOf("metabet-market-") == 0)
```

### `mb_insertAdTilePlacements`
```js
function mb_insertAdTilePlacements() { } //Transform any auto tiles into standard tiles using customer-specific //logic. Auto tiles never have a query specified, but may have a product //specified, like metabet-gametile or metabet-sideoddstile. function mb_insertAutoAdTiles() { } //Inserts ad unit showing all major lines for a single game function mb_insertGameTiles(target, showClosingOdds) { var elements = target ? new Array(target) : document.getElementsByClassName("metabet-gametile"); Array.from(elements).forEach(function(element) { //Basic parameters for the tile, with defaults var query = null; var width = "336px"; var height = "280px"; var style = "classic"; var fallback = "none"; var 
```

### `mb_insertAutoAdTiles`
```js
function mb_insertAutoAdTiles() { } //Inserts ad unit showing all major lines for a single game function mb_insertGameTiles(target, showClosingOdds) { var elements = target ? new Array(target) : document.getElementsByClassName("metabet-gametile"); Array.from(elements).forEach(function(element) { //Basic parameters for the tile, with defaults var query = null; var width = "336px"; var height = "280px"; var style = "classic"; var fallback = "none"; var random = null; var period = null; var showGranular = false || element.classList.contains("metabet-show-granular"); var country = "US"; var location = null; //When enabled, the tile will show the best possible line in //each cell. If set to false
```

### `mb_insertGameTiles`
```js
function mb_insertGameTiles(target, showClosingOdds) { var elements = target ? new Array(target) : document.getElementsByClassName("metabet-gametile"); Array.from(elements).forEach(function(element) { //Basic parameters for the tile, with defaults var query = null; var width = "336px"; var height = "280px"; var style = "classic"; var fallback = "none"; var random = null; var period = null; var showGranular = false || element.classList.contains("metabet-show-granular"); var country = "US"; var location = null; //When enabled, the tile will show the best possible line in //each cell. If set to false, consensus lines will be shown. //This is newer functionality, and I'm not yet sure if it will 
```

### `mb_insertOddsCompare`
```js
function mb_insertOddsCompare(target, showClosingOdds) { var elements = target ? new Array(target) : document.getElementsByClassName("metabet-oddscompare"); Array.from(elements).forEach(function(element) { //Basic parameters for the tile, with defaults var query = null; var width = "336px"; var height = "280px"; var style = "classic"; var market = null; var areProvidersSpecified = false; var fallback = "none"; var country = "US"; var location = null; var classes = element.classList; for (var i = 0; i < classes.length; i++) { if (classes[i].match(/^metabet-size-[0-9]+.*x[0-9]+.*$/)) { width = classes[i].split("-")[2].split("x")[0]; if (width.indexOf("%") == -1) { width += "px"; } height = cla
```

### `mb_insertVideoTiles`
```js
function mb_insertVideoTiles(target, showClosingOdds) { var elements = target ? new Array(target) : document.getElementsByClassName("metabet-videotile"); Array.from(elements).forEach(function(element) { //Basic parameters for the tile, with defaults var query = null; var width = "400px"; var height = "225px"; var classes = element.classList; for (var i = 0; i < classes.length; i++) { if (classes[i].match(/^metabet-size-[0-9]+.*x[0-9]+.*$/)) { width = classes[i].split("-")[2].split("x")[0]; if (width.indexOf("%") == -1) { width += "px"; } height = classes[i].split("-")[2].split("x")[1] + "px"; } else if (classes[i].indexOf("metabet-query-") == 0) { query = classes[i].replace("metabet-query-",
```

### `mb_insertSideOddsTiles`
```js
function mb_insertSideOddsTiles(target) { var elements = target ? new Array(target) : document.getElementsByClassName("metabet-sideoddstile"); Array.from(elements).forEach(function(element) { //Basic parameters for the tile, with defaults var query = null; var priorityEntities = []; var showPositiveMarket = true; var width = "336px"; var height = "280px"; var style = "classic"; var country = "US"; var location = null; //Get passed-in parameters var classes = element.className.split(' '); for (var i = 0; i < classes.length; i++) { if (classes[i].match(/^metabet-size-[0-9]+.*x[0-9]+.*$/)) { width = classes[i].split("-")[2].split("x")[0]; if (width.indexOf("%") == -1) { width += "px"; } height 
```

### `mb_createEntityTileHeader`
```js
function mb_createEntityTileHeader(title, game, team, player) { var div, divHeader, divLogo, divDetails; var teamID = player ? player["teamID"] : (team ? team["teamID"] : null); divHeader = document.createElement("div"); divHeader.className = "metabet-adtile-entityheader"; divLogo = document.createElement("div"); divLogo.className = "metabet-adtile-entityheader-logo"; div = document.createElement("div"); div.className = "metabet-adtile-entityheader-logo-background"; divLogo.appendChild(div); div = document.createElement("div"); div.className = "metabet-adtile-entityheader-logo-shade"; divLogo.appendChild(div); divHeader.appendChild(divLogo); divDetails = document.createElement("div"); divDet
```

### `os`
```js
function os() { return Ga ? Ba : (Ga = 1, function() { if (qa) return rs; qa = 1; var e = zt(), t = R(), r = mr(), n = yn(), o = ns(), i = mn(); e({ target: "Array", proto: !0, arity: 1, forced: 1 !== [].unshift(0) || ! function() { try { Object.defineProperty([], "length", { writable: !1 }).unshift() } catch (e) { return e instanceof TypeError } }() }, { unshift: function(e) { var a = t(this), s = r(a), u = arguments.length; if (u) { i(s + u); for (var c = s; c--;) { var l = c + u; c in a ? a[l] = a[c] : o(a, l) } 
```

### `skip`
```js
skip: function(e, t) { for (var r = this.source; t < r.length && k(e, C(r, t)); t++); return t }, until: function(e, t) { t = this.skip(T, t); for (var r = C(this.source, t), n = 0; n < e.length; n++) if (e[n] === r) return t; throw new m('Unexpected character: "' + r + '" at: ' + t) } }; var N = p(function() { var e, t = "9007199254740993"; return w(t, function(t, r, n) { e = n.source }), e !== t }), $ = g && !p(function() { return 1 / w("-0 \t") != -1 / 0 }); return e({ target: "JSON", stat: !0, forced: N }, { parse: function(e, t) { return $ && !a(t) ? w(e) : function(e, t) { e = l(e); var r = new H(e, 0), n = r.parse(), 
```

### `until`
```js
until: function(e, t) { t = this.skip(T, t); for (var r = C(this.source, t), n = 0; n < e.length; n++) if (e[n] === r) return t; throw new m('Unexpected character: "' + r + '" at: ' + t) } }; var N = p(function() { var e, t = "9007199254740993"; return w(t, function(t, r, n) { e = n.source }), e !== t }), $ = g && !p(function() { return 1 / w("-0 \t") != -1 / 0 }); return e({ target: "JSON", stat: !0, forced: N }, { parse: function(e, t) { return $ && !a(t) ? w(e) : function(e, t) { e = l(e); var r = new H(e, 0), n = r.parse(), o = n.value, i = r.skip(T, n.end); if (i < e.length) throw new m('Unexpected extra character: "'
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
