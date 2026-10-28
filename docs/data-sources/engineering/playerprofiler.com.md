# playerprofiler.com — engineering

App bundles beautified: **4**  
JSON endpoints captured: **13**  
Client functions passing filter: **18**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://playerprofiler.com/wp-admin/admin-ajax.php?action=authentication_status` | 98 |
| `https://playerprofiler.com/wp-admin/admin-ajax.php?action=big_board` | 73,511 |
| `https://playerprofiler.com/wp-admin/admin-ajax.php?action=integrated_news&player_id=` | 1,069 |
| `https://playerprofiler.com/wp-admin/admin-ajax.php?action=playerprofiler_api&endpoint=/dynasty-deluxe/draft-year-options` | 21 |
| `https://playerprofiler.com/wp-admin/admin-ajax.php?action=playerprofiler_api&endpoint=/nfl/next-game` | 87 |
| `https://playerprofiler.com/wp-admin/admin-ajax.php?action=playerprofiler_api&endpoint=/players/prospects` | 20,929 |
| `https://playerprofiler.com/wp-admin/admin-ajax.php?action=playerprofiler_api&endpoint=/players/trending` | 2,670 |
| `https://playerprofiler.com/wp-admin/admin-ajax.php?action=playerprofiler_articles&player_id=` | 2 |
| `https://playerprofiler.com/wp-admin/admin-ajax.php?action=pp_canonical_monthly_ad_decision` | 157 |
| `https://playerprofiler.com/wp-json/advertisers/ads` | 4,041 |
| `https://playerprofiler.com/wp-json/api/playerprofiler/youtube/check-live` | 34 |
| `https://playerprofiler.com/wp-json/player-profiler/v1/draft-kit-analyst-cheat-sheets?post_id=` | 2 |
| `https://playerprofiler.com/wp-json/player-profiler/v1/staff-players` | 6,224 |

## Response schemas

### `https://playerprofiler.com/wp-admin/admin-ajax.php?action=authentication_status`
```
success: bool
data: dict
data.authenticated: bool
data.email: NoneType
data.name: NoneType
data.credit_card_status: NoneType
```

### `https://playerprofiler.com/wp-admin/admin-ajax.php?action=big_board`
```
success: bool
data: list
data[]: dict
data[].Player: str
data[].Player_ID: str
data[].Position: str
data[].Final Index: str
data[].CBS: str
data[].PFF: str
data[].Draft Network: str
data[].ESPN: str
data[].Pro Football Network: str
data[].PlayerProfiler: str
data[].DraftCountdown: str
data[].BleacherReport: str
data[].Sharp Football: str
data[].Roster Watch: str
data[].Total: str
data[].player: dict
data[].player.Player_ID: str
data[].player.Full Name: str
data[].player.Avatar: str
data[].player.Permalink: str
data[].player.Team: str
data[].player.Position: str
```

### `https://playerprofiler.com/wp-admin/admin-ajax.php?action=integrated_news&player_id=`
```
success: bool
data: list
data[]: dict
data[].id: str
data[].player_id: NoneType
data[].datetime: str
data[].data: dict
data[].data.title: str
data[].data.link: str
data[].data.pubDate: str
data[].data.guid: str
data[].data.category: str
data[].data.source: str
data[].data.description: str
data[].data.playerInfo: str
data[].data.author: str
```

### `https://playerprofiler.com/wp-admin/admin-ajax.php?action=playerprofiler_api&endpoint=/dynasty-deluxe/draft-year-options`
```
[]: int
```

### `https://playerprofiler.com/wp-admin/admin-ajax.php?action=playerprofiler_api&endpoint=/nfl/next-game`
```
week: int
homeTeam: str
awayTeamKey: str
datetime: str
```

### `https://playerprofiler.com/wp-admin/admin-ajax.php?action=playerprofiler_api&endpoint=/players/prospects`
```
[]: dict
[].Player_ID: str
[].Full Name: str
[].Avatar: str
[].Permalink: str
[].Team: NoneType
[].Position: str
[].College: str
[].Draft Year: int
```

### `https://playerprofiler.com/wp-admin/admin-ajax.php?action=playerprofiler_api&endpoint=/players/trending`
```
[]: dict
[].Player_ID: str
[].Full Name: str
[].Avatar: str
[].Permalink: str
[].Team: str
[].Position: str
```

### `https://playerprofiler.com/wp-admin/admin-ajax.php?action=playerprofiler_articles&player_id=`
```
```

### `https://playerprofiler.com/wp-admin/admin-ajax.php?action=pp_canonical_monthly_ad_decision`
```
success: bool
data: dict
data.allowed: bool
data.resolved: bool
data.authenticated: bool
data.principal: str
```

### `https://playerprofiler.com/wp-json/advertisers/ads`
```
[]: dict
[].key: str
[].markup: str
```

### `https://playerprofiler.com/wp-json/api/playerprofiler/youtube/check-live`
```
status: str
stream: NoneType
```

### `https://playerprofiler.com/wp-json/player-profiler/v1/draft-kit-analyst-cheat-sheets?post_id=`
```
```

### `https://playerprofiler.com/wp-json/player-profiler/v1/staff-players`
```
data: list
data[]: dict
data[].name: str
data[].url: str
data[].image: str
data[].player_ids: list
```

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
```

### `isEnabled`
```js
isEnabled: function() { return !!($config.interstitial && $config.interstitial.enabled && $config.interstitial.devices.includes(MMT.deviceType)) } }, $MMT.interstitial = MMT.interstitial, MMT.consent = { start: function() { MMT.dg.log(["Script 1: consent.start()"], ["main", "geo/consent"]); const e = MMT.utils.qs("mmt-eu"); MMT.consent.usp.enabled && !e && MMT.geos.isUS && MMT.geos.region && ["CA", "CO", "CT", "UT", "VA"].includes(MMT.geos.region) && (MMT.dg.log(["Loading USP API"], ["main", "geo/consent"]), MMT.consent.privacyType = "USP", MMT.utils.loadScript("//monu.delivery/assets/scripts/tools/usp-api.js")) }, privacyType: null, usp: $config.usp_config ?? { enabled: !0, target: null, po
```

### `start`
```js
start: function() { MMT.dg.log(["Script 1: consent.start()"], ["main", "geo/consent"]); const e = MMT.utils.qs("mmt-eu"); MMT.consent.usp.enabled && !e && MMT.geos.isUS && MMT.geos.region && ["CA", "CO", "CT", "UT", "VA"].includes(MMT.geos.region) && (MMT.dg.log(["Loading USP API"], ["main", "geo/consent"]), MMT.consent.privacyType = "USP", MMT.utils.loadScript("//monu.delivery/assets/scripts/tools/usp-api.js")) }, privacyType: null, usp: $config.usp_config ?? { enabled: !0, target: null, position: null }, footerObj: null }, $MMT.consent = MMT.consent, function() { MMT.analytics = { isEnabled: function() { return !0 }, activate: function() { const t = i + "/xdomain_cookie.min.js"; MMT.utils.
```

### `notValidTip`
```js
notValidTip = function(target, message) { var $target = $(target); $('.wpcf7-not-valid-tip', $target).remove(); $('<span></span>').attr({ 'class': 'wpcf7-not-valid-tip', 'role': 'alert', 'aria-hidden': 'true', }).text(message).appendTo($target); if ($target.is('.use-floating-validation-tip *')) { var fadeOut = function(target) { $(target).not(':hidden').animate({ opacity: 0 }, 'fast', function() { $(this).css({ 'z-index': -100 }); }); }; $target.on('mouseover', '.wpcf7-not-valid-tip', function() { fadeOut(this); }); $target.on('focus', ':input', function() { fadeOut($('.wpcf7-not-valid-tip', $target)); }); } }; wpcf7.refill = function(form, data) { var $form = $(form); var refillCaptcha = fu
```

### `updateCount`
```js
updateCount = function(target) { var $target = $(target); var length = $target.val().length; var count = down ? starting - length : length; $count.attr('data-current-value', count); $count.text(count); if (maximum && maximum < length) { $count.addClass('too-long'); } else { $count.removeClass('too-long'); } if (minimum && length < minimum) { $count.addClass('too-short'); } else { $count.removeClass('too-short'); } }; $(':input[name="' + name + '"]', $form).each(function() { updateCount(this); $(this).keyup(function() { updateCount(this); }); }); }); }; wpcf7.notValidTip = function(target, message) { var $target = $(target); $('.wpcf7-not-valid-tip', $target).remove(); $('<span></span>'
```

### `triggerEvent`
```js
triggerEvent = function(target, name, detail) { var $target = $(target); /* DOM event */ var event = new CustomEvent('wpcf7' + name, { bubbles: true, detail: detail }); $target.get(0).dispatchEvent(event); /* jQuery event */ $target.trigger('wpcf7:' + name, detail); $target.trigger(name + '.wpcf7', detail); // deprecated }; wpcf7.toggleSubmit = function(form, state) { var $form = $(form); var $submit = $('input:submit', $form); if (typeof state !== 'undefined') { $submit.prop('disabled', !state); return; } if ($form.hasClass('wpcf7-acceptance-as-validation')) { return; } $submit.prop('disabled', false); $('.wpcf7-acceptance', $form).each(function() { var $span = $(this); var $input = $('inpu
```

### `resetCounter`
```js
resetCounter = function(form) { var $form = $(form); $('.wpcf7-character-count', $form).each(function() { var $count = $(this); var name = $count.attr('data-target-name'); var down = $count.hasClass('down'); var starting = parseInt($count.attr('data-starting-value'), 10); var maximum = parseInt($count.attr('data-maximum-value'), 10); var minimum = parseInt($count.attr('data-minimum-value'), 10); var updateCount = function(target) { var $target = $(target); var length = $target.val().length; var count = down ? starting - length : length; $count.attr('data-current-value', count); $count.text(count); if (maximum && maximum < length) { $count.addClass('too-long'); } else { $count.removeClass('to
```

### `fadeOut`
```js
fadeOut = function(target) { $(target).not(':hidden').animate({ opacity: 0 }, 'fast', function() { $(this).css({ 'z-index': -100 }); }); }; $target.on('mouseover', '.wpcf7-not-valid-tip', function() { fadeOut(this); }); $target.on('focus', ':input', function() { fadeOut($('.wpcf7-not-valid-tip', $target)); }); } }; wpcf7.refill = function(form, data) { var $form = $(form); var refillCaptcha = function($form, items) { $.each(items, function(i, n) { $form.find(':input[name="' + i + '"]').val(''); $form.find('img.wpcf7-captcha-' + i).attr('src', n); var match = /([0-9]+)\.(png|gif|jpeg)$/.exec(n); $form.find('input:hidden[name="_wpcf7_captcha_challenge_' + i + '"]').attr('value', match[1]); });
```

### `i`
```js
i = function(e) { var t = null, n = e.target.dataset.toggleDropdown, r = function n(r) { var i = r.target; e.target.contains(i) || e.target == i || (o(t, "out"), document.removeEventListener("mouseover", n), document.removeEventListener("mouseleave", n)) }; document.addEventListener("mouseover", r), document.addEventListener("mouseleave", r), n && (t = e.target.querySelector('nav[data-dropdown="'.concat(n, '"]'))) && o(t, "in") }, a = function() { var e = !!t.isMobile, n = r(); if (e && !n) { document.body.classList.remove("overflow-hidden"), document.querySelector("#mainNav").classList.remove("active"), document.querySelector("#mobileMenuToggle").classList.remove("active"); var o = document
```

### `r`
```js
r = function n(r) { var i = r.target; e.target.contains(i) || e.target == i || (o(t, "out"), document.removeEventListener("mouseover", n), document.removeEventListener("mouseleave", n)) }; document.addEventListener("mouseover", r), document.addEventListener("mouseleave", r), n && (t = e.target.querySelector('nav[data-dropdown="'.concat(n, '"]'))) && o(t, "in") }, a = function() { var e = !!t.isMobile, n = r(); if (e && !n) { document.body.classList.remove("overflow-hidden"), document.querySelector("#mainNav").classList.remove("active"), document.querySelector("#mobileMenuToggle").classList.remove("active"); var o = document.querySelectorAll("[data-toggle-dropdown]"), a = document.querySelect
```

### `render`
```js
render = function(e, t) { return l.call(t), c(e, t) } } else { var f = u.beforeCreate; u.beforeCreate = f ? [].concat(f, l) : [l] } return { exports: e, options: u } }(Br, (function() { var e = this, t = e._self._c; return t("div", { directives: [{ name: "click-outside", rawName: "v-click-outside", value: e.onClickOutside, expression: "onClickOutside" }], staticClass: "pp-player-search" }, [t("div", { staticClass: "pp-player-search__input" }, [t("input", { directives: [{ name: "model", rawName: "v-model", value: e.search, expression: "search" }], ref: "input", attrs: { type: "text", placeholder: "Enter a player's
```

### `s`
```js
s = function t() { console.log("leftttt"), o.classList.remove("active"), e.removeEventListener("mouseleave", t) }, t.addEventListener("mouseenter", (function() { console.log(o), o.classList.add("active"), e.addEventListener("mouseleave", s) })), function() { var e = document.querySelector("#mobileMenuToggle"), t = document.querySelector("#mainNav"); e.addEventListener("click", (function(e) { e.target.classList.contains("active") ? (e.target.classList.remove("active"), t.classList.remove("active"), document.body.classList.remove("overflow-hidden"), n("inactive")) : (e.target.classList.add("active"), t.classList.add("active"), document.body.classList.add("overflow-hidden"), n("active")) })) }(
```

### `click`
```js
click: function(t) { return e.onPlayerClick(n) } } }, [t("div", { staticClass: "pp-player-search__result-item-img" }, [t("img", { attrs: { src: n.image_url_path, alt: "" } })]), e._v(" "), t("div", [t("div", { staticClass: "pp-player-search__result-item-name" }, [t("div", { staticClass: "font-semibold" }, [e._v(e._s(n.name))]), e._v(" "), t("div", { staticClass: "text-xs" }, [e.getTeamInfo(n) ? t("span", { staticClass: "text-midnight-blue-400" }, [e._v(e._s(e.getTeamInfo(n).name))]) : e._e()])])])]) })), e._v(" "), e.nextPage ? t("div", { staticStyle: { height: "28px" } }, [e._m(0)]) : e._e()], 2) : t("div", { staticClass: "p-4" }, [t("div", { st
```

### `xe`
```js
function xe(e, t) { if (-1 === e.indexOf("-")) return "string" == typeof t.is; switch (e) { case "annotation-xml": case "color-profile": case "font-face": case "font-face-src": case "font-face-uri": case "font-face-format": case "font-face-name": case "missing-glyph": return !1; default: return !0 } } function Se(e) { return (e = e.target || e.srcElement || window).correspondingUseElement && (e = e.correspondingUseElement), 3 === e.nodeType ? e.parentNode : e } var Ce = null, Oe = null, Te = null; function Pe(e) { if (e = no(e)) { if ("function" != typeof Ce) throw Error(a(280)); var t = e.stateNode; t && (t 
```

### `nn`
```js
function nn() { if (tn) return tn; var e, t, n = en, r = n.length, o = "value" in Zt ? Zt.value : Zt.textContent, i = o.length; for (e = 0; e < r && n[e] === o[e]; e++); var a = r - e; for (t = 1; t <= a && n[r - t] === o[i - t]; t++); return tn = o.slice(e, 1 < t ? 1 - t : void 0) } function rn(e) { var t = e.keyCode; return "charCode" in e ? 0 === (e = e.charCode) && 13 === t && (e = 13) : e = t, 10 === e && (e = 13), 32 <= e || 13 === e ? e : 0 } function on() { return !0 } function an() { return !1 } function sn(e) { function t(t, n, r, o, i) { for (var a in this._reactName = t, this._targetInst = r, this.type = n, this.nativeEvent = o, this.target = i, this.cur
```

### `zn`
```js
function zn(e, t) { switch (e) { case "keyup": return -1 !== Dn.indexOf(t.keyCode); case "keydown": return 229 !== t.keyCode; case "keypress": case "mousedown": case "focusout": return !0; default: return !1 } } function Vn(e) { return "object" == typeof(e = e.detail) && "data" in e ? e.data : null } var Hn = !1; var qn = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 }; function Wn(e) { var
```

### `D`
```js
function D() { !x && b.props.aria.expanded && Xn(b.props.triggerTarget || e).forEach((function(e) { b.props.interactive ? e.setAttribute("aria-expanded", b.state.isVisible && e === T() ? "true" : "false") : e.removeAttribute("aria-expanded") })) } function j() { P().removeEventListener("mousemove", m), Ar = Ar.filter((function(e) { return e !== m })) } function M(t) { if (!dr.isTouch || !p && "mousedown" !== t.type) { var n = t.composedPath && t.composedPath()[0] || t.target; if (!b.props.interactive || !fr(_, n)) { if (Xn(b.props.triggerTarget || e).some((function(e) { return fr(e, n) }))) { if (dr.isTouch) return; if (b.state.isVisible && b.props.trigger.indexOf("click") >= 0) return } els
```

### `Fa`
```js
function Fa(e) { var t = e.id; if (null == Aa[t] && (e !== ui.target || !e.noRecurse)) { if (Aa[t] = !0, La) { for (var n = Ta.length - 1; n > Na && Ta[n].id > e.id;) n--; Ta.splice(n + 1, 0, e) } else Ta.push(e); Ra || (Ra = !0, rs(Ia)) } } var Ua = "watcher"; "".concat(Ua, " callback"), "".concat(Ua, " getter"), "".concat(Ua, " cleanup"); var Ba; var za = function() { function e(e) { void 0 === e && (e = !1), this.detached = e, this.active = !0, this.effects = [], this.cleanups = [], this.parent = Ba, !e && Ba && (this.index = (Ba.scopes || (Ba.scopes = [])).push(this) - 1) } return e.prototype.run = function(e) { if (this.active) { var t = Ba; try { return Ba = this, e() } finally { Ba = 
```
