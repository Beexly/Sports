# fantasycalc.com — engineering

App bundles beautified: **1**  
JSON endpoints captured: **0**  
Client functions passing filter: **4**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `loadChildren`
```js
loadChildren: () => import("./chunk-5EDC524K.js").then(r => r.TradeDatabaseModule) }, { path: "trade-value-chart", pathMatch: "full", loadChildren: () => import("./chunk-T373FYIW.js").then(r => r.TradeChartModule) }, { path: "waiver-wire-rankings", pathMatch: "full", loadComponent: () => import("./chunk-Z4B32VUW.js").then(r => r.WaiverWireRankingsComponent) }, ...q() ? [{ path: "weekly-projections", pathMatch: "full", loadComponent: () => import("./chunk-FNQGJLZL.js").then(r => r.WeeklyProjectionsComponent) }, { path: "start-sit", pathMatch: "full", loadComponent: () => import("./chunk-W3YQDZQQ.js").then(r => r.StartSitComponent) }] : [], { path: "add-your-league", redirectTo: "league/analyz
```

### `loadComponent`
```js
loadComponent: () => import("./chunk-Z4B32VUW.js").then(r => r.WaiverWireRankingsComponent) }, ...q() ? [{ path: "weekly-projections", pathMatch: "full", loadComponent: () => import("./chunk-FNQGJLZL.js").then(r => r.WeeklyProjectionsComponent) }, { path: "start-sit", pathMatch: "full", loadComponent: () => import("./chunk-W3YQDZQQ.js").then(r => r.StartSitComponent) }] : [], { path: "add-your-league", redirectTo: "league/analyzer", pathMatch: "full" }, { path: "players/:player-id", pathMatch: "full", loadChildren: () => import("./chunk-SGK3R5QD.js").then(r => r.PlayerProfileModule) }, { path: "about", pathMatch: "full", loadChildren: () => import("./chunk-WIJL7IAQ.js").then(r => r.AboutModu
```

### `u0275fac`
```js
u0275fac = function(i) { return new(i || e)(Z(Sn)) }, e.\u0275cmp = de({ type: e, selectors: [ ["app-nav-bar"] ], standalone: !0, features: [me], decls: 9, vars: 1, consts: [ [1, "navbar"], [1, "nav-bar-container"], [1, "logo-container"], ["routerLink", "/", "href", "/"], ["src", "/assets/fantasycalclogo.png", "alt", "Fantasycalc Logo", "width", "1650", "height", "598", 1, "logo"], [1, "nav-links"], ["class", "dropdown", 3, "mouseenter", "mouseleave", 4, "ngFor", "ngForOf"], ["href", "https://www.buymeacoffee.com/fantasycalc", "target", "_blank", 1, "donate-button", "nav-link"], [1, "dropdown", 3, "mouseenter", "mouseleave"], ["class", "link-dropdown-container", 4, "ngIf"], ["class", "nav-li
```

### `Xe`
```js
Xe = (() => { var e; return e = class { constructor(n, i, s, a, o) { this.stateService = n, this.router = i, this.seo = s, this.localStorageService = a, this.route = o, this.title = "fantasycalc-ui"; let l = this.localStorageService.getState(); l.selectedLeagueType || (l.selectedLeagueType = yn()), this.stateService.setState(l) } ngOnInit() { this.seo.syncRobotsTag(this.router.url), this.router.events.pipe(Ut(n => n instanceof dn), vn(this)).subscribe(n => { this.seo.syncRobotsTag(n.urlAfterRedirects), q() || window.gtag?.("config", Bt.GA_ID, { page_path: n.urlAfterRedirects }) }) } ngOnDestroy() {} }, Bt = e, e.GA_ID = "UA-125091098-1", e.\u0275fac = function(i) { return new(i || e)(Z(kn), 
```
