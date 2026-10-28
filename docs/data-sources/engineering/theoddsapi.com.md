# theoddsapi.com — engineering

App bundles beautified: **1**  
JSON endpoints captured: **1**  
Client functions passing filter: **11**

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

### `scrollSnapType`
```js
scrollSnapType: ({ addDefaults: r, addUtilities: e }) => { r("scroll-snap-type", { "--tw-scroll-snap-strictness": "proximity" }), e({ ".snap-none": { "scroll-snap-type": "none" }, ".snap-x": { "@defaults scroll-snap-type": {}, "scroll-snap-type": "x var(--tw-scroll-snap-strictness)" }, ".snap-y": { "@defaults scroll-snap-type": {}, "scroll-snap-type": "y var(--tw-scroll-snap-strictness)" }, ".snap-both": { "@defaults scroll-snap-type": {}, "scroll-snap-type": "both var(--tw-scroll-snap-strictness)" }, ".snap-mandatory": { "--tw-scroll-snap-strictness": "mandatory" }, ".snap-proximity": { "--tw-scroll-snap-strictness": "proximi
```

### `resize`
```js
resize: ({ addUtilities: r }) => { r({ ".resize-none": { resize: "none" }, ".resize-y": { resize: "vertical" }, ".resize-x": { resize: "horizontal" }, ".resize": { resize: "both" } }) }, scrollSnapType: ({ addDefaults: r, addUtilities: e }) => { r("scroll-snap-type", { "--tw-scroll-snap-strictness": "proximity" }), e({ ".snap-none": { "scroll-snap-type": "none" }, ".snap-x": { "@defaults scroll-snap-type": {}, "scroll-snap-type": "x var(--tw-scroll-snap-strictness)" }, ".snap-y": { "@defaults scroll-snap-type": {}, "scroll-snap-type": "y var(--tw-scroll-snap-strictn
```

### `scrollSnapAlign`
```js
scrollSnapAlign: ({ addUtilities: r }) => { r({ ".snap-start": { "scroll-snap-align": "start" }, ".snap-end": { "scroll-snap-align": "end" }, ".snap-center": { "scroll-snap-align": "center" }, ".snap-align-none": { "scroll-snap-align": "none" } }) }, scrollSnapStop: ({ addUtilities: r }) => { r({ ".snap-normal": { "scroll-snap-stop": "normal" }, ".snap-always": { "scroll-snap-stop": "always" } }) }, scrollMargin: L("scrollMargin", [ ["scroll-m", ["scroll-margin"]], [ ["scroll-mx", ["scroll-margin-left", "scroll-margin-right"]], ["scroll-my", ["scroll-margin-top", "scroll-margin-bot
```

### `scrollSnapStop`
```js
scrollSnapStop: ({ addUtilities: r }) => { r({ ".snap-normal": { "scroll-snap-stop": "normal" }, ".snap-always": { "scroll-snap-stop": "always" } }) }, scrollMargin: L("scrollMargin", [ ["scroll-m", ["scroll-margin"]], [ ["scroll-mx", ["scroll-margin-left", "scroll-margin-right"]], ["scroll-my", ["scroll-margin-top", "scroll-margin-bottom"]] ], [ ["scroll-ms", ["scroll-margin-inline-start"]], ["scroll-me", ["scroll-margin-inline-end"]], ["scroll-mt", ["scroll-margin-top"]], ["scroll-mr", ["scroll-margin-right"]], ["scroll-mb", ["scroll-margin-bottom"]], ["scroll-ml", ["scroll-margin-left"]] ] ], { supportsNegativeValues: !0 }), scrollPaddin
```

### `userSelect`
```js
userSelect: ({ addUtilities: r }) => { r({ ".select-none": { "user-select": "none" }, ".select-text": { "user-select": "text" }, ".select-all": { "user-select": "all" }, ".select-auto": { "user-select": "auto" } }) }, resize: ({ addUtilities: r }) => { r({ ".resize-none": { resize: "none" }, ".resize-y": { resize: "vertical" }, ".resize-x": { resize: "horizontal" }, ".resize": { resize: "both" } }) }, scrollSnapType: ({ addDefaults: r, addUtilities: e }) => { r("scroll-snap-type", { "--tw-scroll-snap-strictness": "
```

### `g_`
```js
function g_(r) { return Ah(r) && jo(r).includes("terminal") } function y_(r, e) { return r.type !== "pseudo" || Ah(r) ? !1 : jo(e).includes("actionable") } function jo(r) { return Fo[r.value] ?? Fo.__default__ } var Fo, ts = P(() => { u(); Fo = { "::after": ["terminal", "jumpable"], "::backdrop": ["terminal", "jumpable"], "::before": ["terminal", "jumpable"], "::cue": ["terminal"], "::cue-region": ["terminal"], "::first-letter": ["terminal", "jumpable"], "::first-line": ["terminal", "jumpable"], "::grammar-error": ["terminal"], "::marker": ["terminal", "jumpable"], "::part": ["terminal", "actionable"], "::placeholder": ["terminal", "jumpable"], "::selection": ["terminal", "jumpable"], "::slo
```

### `y_`
```js
function y_(r, e) { return r.type !== "pseudo" || Ah(r) ? !1 : jo(e).includes("actionable") } function jo(r) { return Fo[r.value] ?? Fo.__default__ } var Fo, ts = P(() => { u(); Fo = { "::after": ["terminal", "jumpable"], "::backdrop": ["terminal", "jumpable"], "::before": ["terminal", "jumpable"], "::cue": ["terminal"], "::cue-region": ["terminal"], "::first-letter": ["terminal", "jumpable"], "::first-line": ["terminal", "jumpable"], "::grammar-error": ["terminal"], "::marker": ["terminal", "jumpable"], "::part": ["terminal", "actionable"], "::placeholder": ["terminal", "jumpable"], "::selection": ["terminal", "jumpable"], "::slotted": ["terminal"], "::spelling-error": ["terminal"], "::targ
```

### `jo`
```js
function jo(r) { return Fo[r.value] ?? Fo.__default__ } var Fo, ts = P(() => { u(); Fo = { "::after": ["terminal", "jumpable"], "::backdrop": ["terminal", "jumpable"], "::before": ["terminal", "jumpable"], "::cue": ["terminal"], "::cue-region": ["terminal"], "::first-letter": ["terminal", "jumpable"], "::first-line": ["terminal", "jumpable"], "::grammar-error": ["terminal"], "::marker": ["terminal", "jumpable"], "::part": ["terminal", "actionable"], "::placeholder": ["terminal", "jumpable"], "::selection": ["terminal", "jumpable"], "::slotted": ["terminal"], "::spelling-error": ["terminal"], "::target-text": ["terminal"], "::file-selector-button": ["terminal", "actionable"], "::deep": ["acti
```

### `t2`
```js
t2 = (r, e) => { let t = e || {}, i = r.length - 1, n = t.parts === !0 || t.scanToEnd === !0, s = [], a = [], o = [], l = r, c = -1, f = 0, d = 0, p = !1, h = !1, b = !1, v = !1, y = !1, w = !1, k = !1, S = !1, E = !1, T = !1, B = 0, N, R, F = { value: "", depth: 0, isGlob: !1 }, Y = () => c >= i, _ = () => l.charCodeAt(c + 1), Q = () => (N = R, l.charCodeAt(++c)); for (; c < i;) { R = Q(); let he; if (R === $i) { k = F.backslashes = !0, R = Q(), R === wl && (w = !0); continue } if (w === !0 || R === wl) { 
```

### `V5`
```js
function V5(r) { return Object.prototype.toString.apply(r) === "[object Object]" } var lf = new Map; function H5(r, e) { e.browsers.selected.length !== 0 && (e.add.selectors.length > 0 || Object.keys(e.add).length > 2 || r.warn(`Autoprefixer target browsers do not need any prefixes.You do not need Autoprefixer anymore. Check your Browserslist config to be sure that your targets are set up correctly. Learn more at: https://github.com/postcss/autoprefixer#readme https://github.com/browserslist/browserslist#readme `)) } gv.exports = Dr; function Dr(...r) { let e; if (r.length === 1 && V5(r[0]) ? (e = r[0], r = void 0) : r.length === 0 || r.length === 1 && !r[0] ? r = void 0 : r.length <= 2 && (
```

### `H5`
```js
function H5(r, e) { e.browsers.selected.length !== 0 && (e.add.selectors.length > 0 || Object.keys(e.add).length > 2 || r.warn(`Autoprefixer target browsers do not need any prefixes.You do not need Autoprefixer anymore. Check your Browserslist config to be sure that your targets are set up correctly. Learn more at: https://github.com/postcss/autoprefixer#readme https://github.com/browserslist/browserslist#readme `)) } gv.exports = Dr; function Dr(...r) { let e; if (r.length === 1 && V5(r[0]) ? (e = r[0], r = void 0) : r.length === 0 || r.length === 1 && !r[0] ? r = void 0 : r.length <= 2 && (Array.isArray(r[0]) || !r[0]) ? (e = r[1], r = r[0]) : typeof r[r.length - 1] == "object" && (e = r.p
```
