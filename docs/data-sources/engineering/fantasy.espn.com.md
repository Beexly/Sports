# fantasy.espn.com — engineering

App bundles beautified: **4**  
JSON endpoints captured: **0**  
Client functions passing filter: **21**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `on`
```js
on = function() { var args = arguments; if (args.length === 3) { var target = Bootstrapper.delegates[Bootstrapper.delegates.length - 1]; target.args = args } return delegationPrototype.apply(this, args) } }) } }; _private.delegationReset = function() { if (Bootstrapper.on) { for (var i = (Bootstrapper.delegates || []).length - 1; i >= 0; i--) { var currentDelegation = Bootstrapper.delegates[i], _this = Bootstrapper.Delegate(currentDelegation.target); Bootstrapper.Delegate(currentDelegation.target).off.apply(_this, currentDelegation.args) } Bootstrapper.delegates = [] } }; _public.triggerPageChange = function() { _p
```

### `oneTrustLinkHandler`
```js
oneTrustLinkHandler = function(e) { if (e.target && (e.target.matches("a.ot-sdk-show-settings") || e.target.matches('a[href\x3d"https://privacy.thewaltdisneycompany.com/en/dnsmi/"]'))) { e.preventDefault(); if (window.OneTrust && typeof OneTrust.ToggleInfoDisplay == "function") OneTrust.ToggleInfoDisplay() } }; document.addEventListener("click", oneTrustLinkHandler); var updateFooterLinks = function() { var query = document.querySelectorAll("a.ot-sdk-show-settings"); if (query && query.length > 0) Array.prototype.map.call(query, function(link) { if (otMode === "notice") link.remove(); else link.addEventListener("click", function(e) { e.preventDefault(); OneTrust.ToggleInfoDisplay() }) })
```

### `wrapBannerAnalytics`
```js
wrapBannerAnalytics = function() { var vsh = document.getElementById("vendor-search-handler"); if (vsh) vsh.addEventListener("focus", e => { e.target.blur() }); vlistDisplay = false; var bannerContainer = document.querySelector("#onetrust-banner-sdk"); if (bannerContainer) { var btnsAndBase = [{ "elem": "#onetrust-pc-btn-handler", "evObj": { "events": "event202" }, "type": "Save Settings", "triggerScreen": true }, { "elem": "#onetrust-reject-all-handler", "evObj": { "events": "event210" }, "type": "Reject All" }, { "elem": "#onetrust-accept-btn-handler", "
```

### `d`
```js
d = function() { r(l) }, u = function() { s(d) }; return function() { if (!i) { var t = a.throttle - (o.now() - n); i = !0, t < 9 && (t = 9), r(u, t) } } }, h = (F = /^img$/i, H = /^iframe$/i, I = "onscroll" in t && !/glebot/.test(navigator.userAgent), j = 0, q = 0, G = 1, J = function(t) { q--, t && t.target && f(t.target, J), (!t || q < 0 || !t.target) && (q = 0) }, K = function(t, e) { var a, i = t, n = "hidden" != z(t, "visibility"); for (S -= e, T += e, W -= e, R += e; n && (i = i.offsetParent);)(n = (z(i, "opacity") || 1) > 0) && "visible" != z(i, "overflow") && (a = i.getBoundingClientRect(), n = R > a.left && W < a.right && T > a.top - 1 && S < a.bottom + 1); return n }, Q = y(functi
```

### `u`
```js
u = function() { s(d) }; return function() { if (!i) { var t = a.throttle - (o.now() - n); i = !0, t < 9 && (t = 9), r(u, t) } } }, h = (F = /^img$/i, H = /^iframe$/i, I = "onscroll" in t && !/glebot/.test(navigator.userAgent), j = 0, q = 0, G = 1, J = function(t) { q--, t && t.target && f(t.target, J), (!t || q < 0 || !t.target) && (q = 0) }, K = function(t, e) { var a, i = t, n = "hidden" != z(t, "visibility"); for (S -= e, T += e, W -= e, R += e; n && (i = i.offsetParent);)(n = (z(i, "opacity") || 1) > 0) && "visible" != z(i, "overflow") && (a = i.getBoundingClientRect(), n = R > a.left && W < a.right && T > a.top - 1 && S < a.bottom + 1); return n }, Q = y(function() { var t, e, i, n, r,
```

### `J`
```js
J = function(t) { q--, t && t.target && f(t.target, J), (!t || q < 0 || !t.target) && (q = 0) }, K = function(t, e) { var a, i = t, n = "hidden" != z(t, "visibility"); for (S -= e, T += e, W -= e, R += e; n && (i = i.offsetParent);)(n = (z(i, "opacity") || 1) > 0) && "visible" != z(i, "overflow") && (a = i.getBoundingClientRect(), n = R > a.left && W < a.right && T > a.top - 1 && S < a.bottom + 1); return n }, Q = y(function() { var t, e, i, n, r, s, o, l, d; if ((_ = a.loadMode) && q < 8 && (t = N.length)) { for (e = 0, G++, j < P && q < 1 && G > 3 && _ > 2 ? (j = P, G = 0) : j = j != O && _ > 1 && G > 2 && q < 6 ? O : 0; e < t; e++) N[e] && !N[e]._lazyRace && (I ? ((l = N[e].getAttribute("
```

### `stopObserving`
```js
stopObserving: function() { isAndroidWebview ? ($.unsubscribe(this._subscriber), this._subscriber = null) : this.observer && "function" == typeof this.observer.disconnect && this.observer.disconnect() }, onIntersection: function(entries) { entries.forEach(function(entry) { var target; entry.isIntersecting && (target = entry.target, $(target).addClass("ad-slot loaded").removeClass("ad-slot-inview"), admgr.initSlot(target, espn.ads.config), this.observer && "function" == typeof this.observer.unobserve && this.observer.unobserve(target)) }.bind(this)) }, isAdInViewport: function(el, pct) { var rect; return isAndroidWebview ? pct >= this.getThreshold(el) : (rect = el.getBoundingClientRect(), !(!
```

### `startObserving`
```js
startObserving: function() { isAndroidWebview ? this._subscriber || (this._subscriber = $.subscribe("android.scrollPosition", this.onScrollPositionChange)) : this.observer && (this.stopObserving(), "function" == typeof this.observer.observe && this.slots.toArray().forEach(function(slot) { this.observer.observe(slot) }.bind(this))) }, stopObserving: function() { isAndroidWebview ? ($.unsubscribe(this._subscriber), this._subscriber = null) : this.observer && "function" == typeof this.observer.disconnect && this.observer.disconnect() }, onIntersection: function(entries) { entries.forEach(function(entry) { var target; entry.isIntersecting && (target = entry.target, $(target).addClass("ad-slot lo
```

### `trigger`
```js
trigger: function(e, t, n, r) { var i, o, a, s, u, l, c, f, p = [n || C], d = ue.call(e, "type") ? e.type : e, h = ue.call(e, "namespace") ? e.namespace.split(".") : []; if (o = f = a = n = n || C, 3 !== n.nodeType && 8 !== n.nodeType && !Dt.test(d + ce.event.triggered) && (-1 < d.indexOf(".") && (d = (h = d.split(".")).shift(), h.sort()), u = d.indexOf(":") < 0 && "on" + d, (e = e[ce.expando] ? e : new ce.Event(d, "object" == typeof e && e)).isTrigger = r ? 2 : 3, e.namespace = h.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = n), t = null == t ? [e] : ce.makeArray(t, [e]), c = ce.event.sp
```

### `BLANK_FUNCTION`
```js
BLANK_FUNCTION = function() {}; espn_ui && espn_ui.Helpers && espn_ui.Helpers.nav && espn_ui.Helpers.nav.isNavExternal || $.ajaxPrefilter(function(options, originalOptions) { var enUSSupportedIndex = options.url.match(/^\/(college-football|golf|(?:mens-|womens-)?college-basketball|mlb|nba|nfl|nhl|olympics|racing|soccer|womens-basketball|mma|boxing|tennis|fantasy|xfl|ufl)\/$/), esUSSupportedIndex = options.url.match(/^\/(basquetbol|basquetbol\/nba|basquetbol\/fiba|beisbol|beisbol\/mlb|deporte-motor|futbol-americano|futbol|golf|olimpicos|rugby|tenis|mma|boxeo|futbol-americano\/(?:xfl|ufl))\/$/), enUSSupportedSubpage = options.url.match(/^\/(soccer|nba)\/(scoreboard)$/), esUSSupportedSubpage = 
```

### `newWin`
```js
newWin = function(url) { var subWindow, sNewWin = "newWin", options = "width=800,height=525,resizable=yes,scrollbars=yes,location=yes,status=yes,toolbar=yes,menubar=yes,directories=yes", w = window; return url.indexOf("http") < 0 && (url = "http://games.espn.com" + url), window.location.href.indexOf("/fantasy/") > -1 && url.indexOf("/player") > -1 ? void(window.location.href = url) : void(!subWindow || subWindow.closed ? subWindow = w.open(url, sNewWin, options) : (subWindow.focus(), subWindow = w.open(url, sNewWin, options))) }, "espn.block".namespace(), espn.block.ads = !0, espn.block.tracking = !0, jQuery.subscribe("espn.defer.ready", function() { var html = document.querySelector("html")
```

### `getLeagueBySportAbbrev`
```js
getLeagueBySportAbbrev: function(sportAbbrev) { var league = sportAbbrev; return "ncb" !== sportAbbrev && "ncaab" !== sportAbbrev && "ncaam" !== sportAbbrev || (league = "mens-college-basketball"), "ncw" !== sportAbbrev && "ncaaw" !== sportAbbrev || (league = "womens-college-basketball"), "ncf" !== sportAbbrev && "ncaaf" !== sportAbbrev || (league = "college-football"), league }, getSportByLeague: function(sportAbbrev) { switch (sportAbbrev) { case "nba": case "wnba": case "mens-college-basketball": case "womens-college-basketball": return "basketball"; case "nfl": case "college-football": return "football"; case "nhl": return "hockey"; case "mlb": return "baseball"; default: return sportAbb
```

### `getSportByLeague`
```js
getSportByLeague: function(sportAbbrev) { switch (sportAbbrev) { case "nba": case "wnba": case "mens-college-basketball": case "womens-college-basketball": return "basketball"; case "nfl": case "college-football": return "football"; case "nhl": return "hockey"; case "mlb": return "baseball"; default: return sportAbbrev } }, getSportAbbrev: function(sportAbbrev) { return "ncb" === sportAbbrev && (sportAbbrev = "ncaam"), "ncw" === sportAbbrev && (sportAbbrev = "ncaaw"), "ncf" === sportAbbrev && (sportAbbrev = "ncaaf"), sportAbbrev }, getSportAbbrevInternal: function(sportAbbrev) { return "ncaam" === sportAbbrev && (sportAbbrev = "ncb"), "ncaaw" === sportAbbrev && (sportAbbrev = "ncw"), "
```

### `getSportRootBySportId`
```js
getSportRootBySportId: function(sportId) { var sportIdToRoot = { 10: "mlb", 23: "ncf", 28: "nfl", 35: "afl", 41: "ncb", 46: "nba", 54: "ncaaw", 59: "wnba", 69: "nba-development", 90: "nhl", 152: "ciclismo", 200: "cricket", 300: "rugby", 397: "espn-run", 400: "volleyball", 600: "soccer", 612: "futsal", 800: "field-hockey", 850: "tennis", 851: "mens-tennis", 900: "womens-tennis", 1e3: "boxing", 1100: "golf", 1106: "mens-golf", 1107: "womens-golf", 1200: "horse", 1300: "cycling", 1650: "wrestling", 1652: "wwe", 1936: "surfing", 2e3: "rpm", 2020: "nascar", 203
```

### `getSport`
```js
getSport: function(sport) { var sport = sport || document.body.getAttribute("data-sport") || ""; return isNaN(parseInt(sport, 10)) || (sport = espn.sports.getSportAbbrevBySportId(parseInt(sport, 10))), sport = espn.sports.sportReplaces(sport), sport || (sport = "top"), sport = espn.sports.getSportAbbrev(sport), espn.sports.isWomensBB(sport) && (sport = "ncaaw"), sport }, getLeague: function() { return document.body.getAttribute("data-league") || "" }, normalizeURLSlug: function(slug) { return mappings = { "nba-summer": "nba-summer-league", "nba-development": "nba-g-league" }, mappings[slug] ? mappings[slug] : slug }, getSportWordBySlug: function(slug) { switch (slug) { case "mlb": case "nba"
```

### `getLeague`
```js
getLeague: function() { return document.body.getAttribute("data-league") || "" }, normalizeURLSlug: function(slug) { return mappings = { "nba-summer": "nba-summer-league", "nba-development": "nba-g-league" }, mappings[slug] ? mappings[slug] : slug }, getSportWordBySlug: function(slug) { switch (slug) { case "mlb": case "nba": case "nhl": case "nfl": case "wnba": case "ufl": case "afl": case "mma": return slug.toUpperCase(); case "college-football": return "College Football"; case "mens-college-basketball": return "Men's College Basketball"; case "womens-college-basketball": return "Women's College Basketball"; case "rpm": return "Racing
```

### `normalizeURLSlug`
```js
normalizeURLSlug: function(slug) { return mappings = { "nba-summer": "nba-summer-league", "nba-development": "nba-g-league" }, mappings[slug] ? mappings[slug] : slug }, getSportWordBySlug: function(slug) { switch (slug) { case "mlb": case "nba": case "nhl": case "nfl": case "wnba": case "ufl": case "afl": case "mma": return slug.toUpperCase(); case "college-football": return "College Football"; case "mens-college-basketball": return "Men's College Basketball"; case "womens-college-basketball": return "Women's College Basketball"; case "rpm": return "Racing"; case "olympics": case "golf": case "tennis": case "soccer":
```

### `getSportWordBySlug`
```js
getSportWordBySlug: function(slug) { switch (slug) { case "mlb": case "nba": case "nhl": case "nfl": case "wnba": case "ufl": case "afl": case "mma": return slug.toUpperCase(); case "college-football": return "College Football"; case "mens-college-basketball": return "Men's College Basketball"; case "womens-college-basketball": return "Women's College Basketball"; case "rpm": return "Racing"; case "olympics": case "golf": case "tennis": case "soccer": case "cricket": return slug.charAt(0).toUpperCase() + slug.slice(1); default: return null } }, getSportIconClass: function(sportId) { var htmlCl
```

### `isVideoPlaying`
```js
function isVideoPlaying() { var espnVideo = espn && espn.video, espnVideoPlayer = espnVideo && espnVideo.player; return !!espnVideoPlayer && ($(".lightbox.module_bloom.js-bloomed").length > 0 || espnVideoPlayer.isPlaying) } function isPageHidden() { return document.hidden || document.msHidden || document.webkitHidden || document.mozHidden } function refreshAdTimeout(refreshRate, config) { clearTimeout(self.refreshTimeoutHook), self.refreshTimeoutHook = setTimeout(function() { isPageHidden() || !config.refreshWhenVideoPlays && isVideoPlaying() ? refreshAdTimeout(refreshRate, config) : (_clear(), _init(config)) }, 1e3 * refreshRate) } function _initSlot(el, config, callback, options) { el && !
```

### `getSportIdFromURL`
```js
getSportIdFromURL: function(url) { return this.sportToSportId(this.getSportFromURL(url)) }, getSportFromURL: function(url) { var ilen, jlen, sport = null, i = 0, j = 0; if ("string" == typeof url) { var urlArray = url.split("/"), sportTypes = ["nfl", "nhl", "mlb", "wnba", "ncf", "ncb", "ncw", "rpm", "soccer", "golf", "ncaa", "nba", "tennis", "mma", "cricket"]; for (ilen = urlArray.length; i < ilen; i++) { var chunk = urlArray[i], root = chunk; for ("mens-college-basketball" === chunk ? root = "ncb" : "college-football" === chunk ? root = "ncf" : "womens-college-basketball" === chunk ? root = "ncw" : "olympics" === chunk ? root = "oly" : "auto-racing" === chunk ? root = "rpm" : "boston" !== c
```

### `getSportFromURL`
```js
getSportFromURL: function(url) { var ilen, jlen, sport = null, i = 0, j = 0; if ("string" == typeof url) { var urlArray = url.split("/"), sportTypes = ["nfl", "nhl", "mlb", "wnba", "ncf", "ncb", "ncw", "rpm", "soccer", "golf", "ncaa", "nba", "tennis", "mma", "cricket"]; for (ilen = urlArray.length; i < ilen; i++) { var chunk = urlArray[i], root = chunk; for ("mens-college-basketball" === chunk ? root = "ncb" : "college-football" === chunk ? root = "ncf" : "womens-college-basketball" === chunk ? root = "ncw" : "olympics" === chunk ? root = "oly" : "auto-racing" === chunk ? root = "rpm" : "boston" !== chunk && "dallas" !== chunk && "chicago" !== chunk || (root = "stations"), j = 0, jlen = spor
```
