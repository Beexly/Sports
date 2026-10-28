# thelines.com — engineering

App bundles beautified: **1**  
JSON endpoints captured: **0**  
Client functions passing filter: **8**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `scheduleRefresh`
```js
function scheduleRefresh() { if (frame === null) { frame = requestAnimationFrame(function() { frame = null; refreshActive(); }); } } function centerFeatured() { if (track.scrollWidth <= track.clientWidth) { return; } const target = track.querySelector('.eip__box--featured') || boxes[Math.floor(boxes.length / 2)]; if (!target) { return; } const trackRect = track.getBoundingClientRect(); const boxRect = target.getBoundingClientRect(); const delta = (boxRect.left + boxRect.width / 2) - (trackRect.left + trackRect.width / 2); track.scrollLeft += delta; } track.addEventListener('scroll', scheduleRefresh, { passive: true }); window.addEventListener('resize', scheduleRefresh, { passive: true }); ce
```

### `centerFeatured`
```js
function centerFeatured() { if (track.scrollWidth <= track.clientWidth) { return; } const target = track.querySelector('.eip__box--featured') || boxes[Math.floor(boxes.length / 2)]; if (!target) { return; } const trackRect = track.getBoundingClientRect(); const boxRect = target.getBoundingClientRect(); const delta = (boxRect.left + boxRect.width / 2) - (trackRect.left + trackRect.width / 2); track.scrollLeft += delta; } track.addEventListener('scroll', scheduleRefresh, { passive: true }); window.addEventListener('resize', scheduleRefresh, { passive: true }); centerFeatured(); refreshActive(); requestAnimationFrame(function() { track.classList.add('is-ready'); }); eip_wrapper.removeAttribute(
```

### `getLink`
```js
getLink = function() { if (gLinkElement) return gLinkElement; gLinkElement = document.createElement("a"); gLinkElement.className = "ext-clk"; gLinkElement.style.visibility = "hidden"; gLinkElement.style.display = "block"; gLinkElement.style.height = "0px"; document.body.appendChild(gLinkElement); return gLinkElement }; domReady(function() { window.requestAnimationFrame(() => { window.setTimeout(getLink, 0) }) }); sd.addEventListener("click", function(e) { let element = e.target; if (element.tagName !== "SPAN" && typeof element.closest === "function" || element.tagName === "SPAN" && !element.dataset.id) { element = element.closest("span[data-id]") } if (!element) return; let link = element.ml
```

### `closeSearchOverlay`
```js
closeSearchOverlay = (e) => { if (!e.target.closest('.main-nav__icons__icon.--search')) { searchToggle.classList.remove('--active'); document.body.removeEventListener('click', closeSearchOverlay); } } searchToggle.addEventListener('click', () => { searchToggle.classList.toggle('--active'); if (searchToggle.classList.contains('--active')) { document.body.addEventListener('click', closeSearchOverlay); } }); searchOverlay.addEventListener('click', (e) => e.stopPropagation()); }) })(); domReady(function() { document.querySelectorAll('.comparison-container .comparison__button').forEach((button) => { button.addEventListener('click', (e) => { button.parentElement.querySelectorAll(".comparison.hidde
```

### `f`
```js
function f(e, t) { return e.reduce((e, t) => e - i[t], t) } function p(e, t) { return e.reduce((e, n) => f(e, t) > 0 ? e.concat([n]) : e, []) } function h(i, u, c) { let a = o.map((e, n) => ({ start: e - r[n] + .5 + u, end: e + t - .5 + u })); return i.map(t => { let r = c ? 0 : -n, i = c ? n : 0, o = a[t][c ? "end" : "start"]; return { index: t, loopPoint: o, slideLocation: m(-1), translate: g(e, s[t]), target: () => l.get() > o ? r : i } }) } return { canLoop: function() { return d.every(({ 
```

### `p`
```js
function p(e, t) { return e.reduce((e, n) => f(e, t) > 0 ? e.concat([n]) : e, []) } function h(i, u, c) { let a = o.map((e, n) => ({ start: e - r[n] + .5 + u, end: e + t - .5 + u })); return i.map(t => { let r = c ? 0 : -n, i = c ? n : 0, o = a[t][c ? "end" : "start"]; return { index: t, loopPoint: o, slideLocation: m(-1), translate: g(e, s[t]), target: () => l.get() > o ? r : i } }) } return { canLoop: function() { return d.every(({ index: e }) => .1 >= f(a.filter(t => t !== e), t)) }, 
```

### `h`
```js
function h(i, u, c) { let a = o.map((e, n) => ({ start: e - r[n] + .5 + u, end: e + t - .5 + u })); return i.map(t => { let r = c ? 0 : -n, i = c ? n : 0, o = a[t][c ? "end" : "start"]; return { index: t, loopPoint: o, slideLocation: m(-1), translate: g(e, s[t]), target: () => l.get() > o ? r : i } }) } return { canLoop: function() { return d.every(({ index: e }) => .1 >= f(a.filter(t => t !== e), t)) }, clear: function() { d.forEach(e => e.translate.clear()) }, loop: funct
```

### `carousel`
```js
carousel = function(e) { if ("string" == typeof e) { document.querySelectorAll(e).forEach(w); return } if (e instanceof NodeList) { e.forEach(w); return } e instanceof Node && w(e) }); (() => { domReady(() => { document.querySelectorAll(".embla-carousel").forEach((carousel) => { window.carousel(carousel); }) const lazyImages = document.querySelectorAll('.embla-carousel__lazy-trigger'); const imageObserver = new IntersectionObserver((entries, observer) => { entries.forEach(entry => { if (entry.isIntersecting) { const element = entry.target; if (element.tagName === 'IMG') { element.src = element.dataset.src; } if (element.tagName === 'DIV') { element.style.backgroundImage = `url('${element.dat
```
