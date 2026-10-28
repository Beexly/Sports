# bettingpros.com — engineering

App bundles beautified: **2**  
JSON endpoints captured: **0**  
Client functions passing filter: **7**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `de`
```js
de = () => Ca(); function tf(r, { id: e = null } = {}) { let t = F({ type: "style", attributes: [{ "data-owner": "freestar" }], id: e }); t.textContent = r, document.head.append(t) } function aa(r, e = window) { let t = null; return r.sizeMappings.some(i => { if (Xe(e) >= i.viewport.size[0]) return t = i.size.sort(Yt).filter(s => s[0] !== 35843), !0 }), t } var Z = ({ name: r }) => window.freestar.fsdata.placements.find(e => e.name === r); var rf = r => r.intersectionRatio > 0 && r.isIntersecting && dl(r, "target.id.length", 0) > 1, sf = ({ email: r }) => /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a
```

### `tf`
```js
function tf(r, { id: e = null } = {}) { let t = F({ type: "style", attributes: [{ "data-owner": "freestar" }], id: e }); t.textContent = r, document.head.append(t) } function aa(r, e = window) { let t = null; return r.sizeMappings.some(i => { if (Xe(e) >= i.viewport.size[0]) return t = i.size.sort(Yt).filter(s => s[0] !== 35843), !0 }), t } var Z = ({ name: r }) => window.freestar.fsdata.placements.find(e => e.name === r); var rf = r => r.intersectionRatio > 0 && r.isIntersecting && dl(r, "target.id.length", 0) > 1, sf = ({ email: r }) => /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.te
```

### `aa`
```js
function aa(r, e = window) { let t = null; return r.sizeMappings.some(i => { if (Xe(e) >= i.viewport.size[0]) return t = i.size.sort(Yt).filter(s => s[0] !== 35843), !0 }), t } var Z = ({ name: r }) => window.freestar.fsdata.placements.find(e => e.name === r); var rf = r => r.intersectionRatio > 0 && r.isIntersecting && dl(r, "target.id.length", 0) > 1, sf = ({ email: r }) => /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(r); var Da = "fs.session"; var Na = "fs.itf.group", Pa = "fs.itf.targeting", dn = "fs.ident"; var Ma = class { constructor() { this.session = null, this._init() } 
```

### `Z`
```js
Z = ({ name: r }) => window.freestar.fsdata.placements.find(e => e.name === r); var rf = r => r.intersectionRatio > 0 && r.isIntersecting && dl(r, "target.id.length", 0) > 1, sf = ({ email: r }) => /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(r); var Da = "fs.session"; var Na = "fs.itf.group", Pa = "fs.itf.targeting", dn = "fs.ident"; var Ma = class { constructor() { this.session = null, this._init() } _init() { this.session = G({ key: Da, type: k.object.type }), (!this.session || !Object.keys(this.session).length) && (this.session = { id: de() }); let t = wi.flatMap(i => { let s 
```

### `init`
```js
init: function() { FPV.CSS(), FPV.create("script", "fp-vote-call", !1, document.getElementsByTagName("head")[0]) }, toggle: function(e, t, i) { if (!i || !i.target || -1 === i.target.parentNode.className.indexOf("fpv-close") && -1 === i.target.className.indexOf("fp-player-video-container")) { for (var a = document, r = t.toString(), o = a.querySelectorAll(".fp-player-video-container"), n = 0; n < o.length; n++) o[n].dataset.pid !== r && (o[n].style.display = "none", void 0 !== FPV.FPvideoPlayer[o[n].dataset.pid] && FPV.FPvideoPlayer[o[n].dataset.pid].pauseVideo()); if (a.getElementById("fp-video-" + r)) { var p = a.getElementById("fp-video-" + r); "none" === p.style.display ? (p.style.displa
```

### `CSS`
```js
CSS: function() { FPV.create("style", "fpv-css", !1, document.getElementsByTagName("head")[0]).innerHTML = ".fp-player-video-container { position: fixed;right:0;bottom:0; z-index: 999999; padding: 20px; background: #091d40; width: 360px;}.fp-player-video-wrapper { position: relative; padding-bottom: 56.25%; padding-top: 25px; height: 0; margin-bottom: 5px; }.fp-player-video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }.fpv-close { position: relative; top: -17px; right: -13px; font-size: 15px; color: #fff; cursor: pointer; }.fp-player-video-container .fp-vote-container { font-size: 13px; position: absolute; bottom: 0; right: 20px; }.fp-player-video-contain
```

### `onclick`
```js
onclick = function() { a.getElementById("fp-video-" + r).style.display = "none", FPV.FPvideoPlayer[r].pauseVideo() }; var l = e.indexOf("&t="), c = ""; if (-1 != l) { var f = e.substring(l + "&t=".length); e = e.substring(0, l); var v = 0, g = f.indexOf("h"); - 1 != g && (v += 3600 * Number(f.substring(0, g)), f = f.substring(g + 1)); var m = f.indexOf("m"); - 1 != m && (v += 60 * Number(f.substring(0, m)), f = f.substring(m + 1)); var u = f.indexOf("s"); - 1 != u && (v += Number(f.substring(0, u))), -1 == g && -1 == m && -1 == u && (v = Number(f)), 0 < v && (c = "&start=" + v) } var y = FPV.create("div", !1, "fp-player-video-wrapper", d), b = FPV.create("iframe", "fp-YT-iframe-" + r, "fp-YT
```
