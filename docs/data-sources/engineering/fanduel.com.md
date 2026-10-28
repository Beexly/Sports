# fanduel.com — engineering

App bundles beautified: **3**  
JSON endpoints captured: **1**  
Client functions passing filter: **22**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://fanduel.com/_next/data/` | 17 |

## Response schemas

### `https://fanduel.com/_next/data/`
```
notFound: bool
```

## Client-side functions that passed the filter

### `parseFromString`
```js
parseFromString = function(t, n) { const r = i.apply(this, [t, n]); return "text/html" === n && (e && r.querySelectorAll("style:not([nonce])").forEach(t => t.setAttribute("nonce", e)), r.querySelectorAll("[style]").forEach(e => { e.style.cssText = e.getAttribute("style") })), r } } }; const ss = Symbol.for("@amplitude/spa-link-interceptor-initiated"); function os() { const e = ae(); if (!e) return; if (e[ss]) return; e[ss] = !0; document.addEventListener("click", e => { var t, i; const n = e.target; if (!(n instanceof Element)) return; const r = n.closest("a"); if (!r) return; const s = r.__mutationRecord__; if (!(null === (i = null === (t = null == s ? void 0 : s.attributes) || void 0 === t
```

### `_setterFunc`
```js
_setterFunc = function _setterFunc(target, property, value) { return target[property](value) }, _setterFuncWithParam = function _setterFuncWithParam(target, property, value, data) { return target[property](data.fp, value) }, _setterAttribute = function _setterAttribute(target, property, value) { return target.setAttribute(property, value) }, _getSetter = function _getSetter(target, property) { return _isFunction(target[property]) ? _setterFunc : _isUndefined(target[property]) && target.setAttribute ? _setterAttribute : _setterPlain }, _renderPlain = function _renderPlain(ratio, data) { return data.set(data.t, data.p, Math.round((data.s + data.c * ratio) * 1000000) / 1000000, data) }, 
```

### `_getCache`
```js
_getCache = function _getCache(target) { return target._gsap || _harness(toArray(target))[0]._gsap }, _getProperty = function _getProperty(target, property, v) { return (v = target[property]) && _isFunction(v) ? target[property]() : (_isUndefined(v) && target.getAttribute && target.getAttribute(property)) || v }, _forEachName = function _forEachName(names, func) { return (names = names.split(',')).forEach(func) || names }, //split a comma-delimited list of names into an array, then run a forEach() function and return the split array (this is just a way to consolidate/shorten some code). _round = function _round(value) { return Math.round(value * 100000) / 100000 || 0 }, _roundPrecise = funct
```

### `_setterFuncWithParam`
```js
_setterFuncWithParam = function _setterFuncWithParam(target, property, value, data) { return target[property](data.fp, value) }, _setterAttribute = function _setterAttribute(target, property, value) { return target.setAttribute(property, value) }, _getSetter = function _getSetter(target, property) { return _isFunction(target[property]) ? _setterFunc : _isUndefined(target[property]) && target.setAttribute ? _setterAttribute : _setterPlain }, _renderPlain = function _renderPlain(ratio, data) { return data.set(data.t, data.p, Math.round((data.s + data.c * ratio) * 1000000) / 1000000, data) }, _renderBoolean = function _renderBoolean(ratio, data) { return data.set(data.t, data.p, !!(data.s + dat
```

### `changeSlide`
```js
changeSlide = function(event, dontAnimate) { var _ = this, $target = $(event.currentTarget), indexOffset, slideOffset, unevenOffset // If target is a link, prevent default action. if ($target.is('a')) { event.preventDefault() } // If target is not the <li> element (ie: a child), find the <li>. if (!$target.is('li')) { $target = $target.closest('li') } unevenOffset = _.slideCount % _.options.slidesToScroll !== 0 indexOffset = unevenOffset ? 0 : (_.slideCount - _.currentSlide) % _.options.slidesToScroll switch (event.data.message) { case 'previous': slideOffset = indexOffset === 0 ? _.options.slidesToScroll : _.options.slidesToShow - indexOffset if (_.slideCount 
```

### `_revertStyle`
```js
_revertStyle = function _revertStyle() { var props = this.props, target = this.target, style = target.style, cache = target._gsap, i, p for (i = 0; i < props.length; i += 3) { // stored like this: property, isNotCSS, value props[i + 1] ? (target[props[i]] = props[i + 2]) : props[i + 2] ? (style[props[i]] = props[i + 2]) : style.removeProperty( props[i].substr(0, 2) === '--' ? props[i] : props[i].replace(_capsExp, '-$1').toLowerCase(), ) } if (this.tfm) { for (p in this.tfm) { cache[p] = this.tfm[p] } if (cache.svg) { cache.renderTransform() target.setAttrib
```

### `_setterAttribute`
```js
_setterAttribute = function _setterAttribute(target, property, value) { return target.setAttribute(property, value) }, _getSetter = function _getSetter(target, property) { return _isFunction(target[property]) ? _setterFunc : _isUndefined(target[property]) && target.setAttribute ? _setterAttribute : _setterPlain }, _renderPlain = function _renderPlain(ratio, data) { return data.set(data.t, data.p, Math.round((data.s + data.c * ratio) * 1000000) / 1000000, data) }, _renderBoolean = function _renderBoolean(ratio, data) { return data.set(data.t, data.p, !!(data.s + data.c * ratio), data) }, _renderComplexString = function _renderComplexString(ratio, data) { var pt = data._pt, s = '' 
```

### `_removeIndependentTransforms`
```js
_removeIndependentTransforms = function _removeIndependentTransforms(style) { if (style.translate) { style.removeProperty('translate') style.removeProperty('scale') style.removeProperty('rotate') } }, _revertStyle = function _revertStyle() { var props = this.props, target = this.target, style = target.style, cache = target._gsap, i, p for (i = 0; i < props.length; i += 3) { // stored like this: property, isNotCSS, value props[i + 1] ? (target[props[i]] = props[i + 2]) : props[i + 2] ? (style[props[i]] = props[i + 2]) : style.removeProperty( props[i].substr(0, 2) === '--' ? props[i] : props[i].replace(_
```

### `_getProperty`
```js
_getProperty = function _getProperty(target, property, v) { return (v = target[property]) && _isFunction(v) ? target[property]() : (_isUndefined(v) && target.getAttribute && target.getAttribute(property)) || v }, _forEachName = function _forEachName(names, func) { return (names = names.split(',')).forEach(func) || names }, //split a comma-delimited list of names into an array, then run a forEach() function and return the split array (this is just a way to consolidate/shorten some code). _round = function _round(value) { return Math.round(value * 100000) / 100000 || 0 }, _roundPrecise = function _roundPrecise(value) { return Math.round(value * 10000000) / 10000000 || 0 }, // increased precisi
```

### `_renderRoundedCSSProp`
```js
_renderRoundedCSSProp = function _renderRoundedCSSProp(ratio, data) { var value = data.s + data.c * ratio data.set(data.t, data.p, ~~(value + (value < 0 ? -0.5 : 0.5)) + data.u, data) }, _renderNonTweeningValue = function _renderNonTweeningValue(ratio, data) { return data.set(data.t, data.p, ratio ? data.e : data.b, data) }, _renderNonTweeningValueOnlyAtEnd = function _renderNonTweeningValueOnlyAtEnd(ratio, data) { return data.set(data.t, data.p, ratio !== 1 ? data.b : data.e, data) }, _setterCSSStyle = function _setterCSSStyle(target, property, value) { return (target.style[property] = value) }, _setterCSSProp = function _setterCSSProp(target, property, value) { return target.style.setPrope
```

### `_getSetter`
```js
_getSetter = function _getSetter(target, property) { return _isFunction(target[property]) ? _setterFunc : _isUndefined(target[property]) && target.setAttribute ? _setterAttribute : _setterPlain }, _renderPlain = function _renderPlain(ratio, data) { return data.set(data.t, data.p, Math.round((data.s + data.c * ratio) * 1000000) / 1000000, data) }, _renderBoolean = function _renderBoolean(ratio, data) { return data.set(data.t, data.p, !!(data.s + data.c * ratio), data) }, _renderComplexString = function _renderComplexString(ratio, data) { var pt = data._pt, s = '' if (!ratio && data.b) { //b = beginning string s = data.b } else if (ratio === 1 && data.e) { 
```

### `initCarousel`
```js
function initCarousel() { skipBtn.style.display = 'none'; gsap.to(videoIntro, { duration:.3, xPercent:-100, onComplete:() => { player.pause(); player.style.display = 'none'; }}); gsap.to(carouselInner, { duration:.3, xPercent:0 }); carousel.slick('slickPlay'); } //Set timeout if video doesn't start playing after 5 seconds for whatever reason //const videoTimeout = setTimeout(initCarousel, 5000); player.addEventListener('playing', () => { //clearTimeout(videoTimeout); }); player.addEventListener('ended', () => { videoEnded = true; initCarousel(); }); onResize(); window.addEventListener('resize', onResize);*/ } /***/ }, /***/ './src/assets/js/components/map.js': /*!****************************
```

### `ajaxSetup`
```js
ajaxSetup: function ajaxSetup(target, settings) { return settings // Building a settings object ? ajaxExtend(ajaxExtend(target, jQuery.ajaxSettings), settings) // Extending ajaxSettings : ajaxExtend(jQuery.ajaxSettings, target) }, ajaxPrefilter: addToPrefiltersOrTransports(prefilters), ajaxTransport: addToPrefiltersOrTransports(transports), // Main method ajax: function ajax(url, options) { // If url is an object, simulate pre-1.5 signature if (_typeof(url) === 'object') { options = url url = undefined } // Force options to be an object options = options || {} var transport, // URL without anti-cache param cacheURL, 
```

### `interrupt`
```js
interrupt = function(toggle) { var _ = this if (!toggle) { _.autoPlay() } _.interrupted = toggle } Slick.prototype.selectHandler = function(event) { var _ = this var targetElement = $(event.target).is('.slick-slide') ? $(event.target) : $(event.target).parents('.slick-slide') var index = parseInt(targetElement.attr('data-slick-index')) if (!index) index = 0 if (_.slideCount <= _.options.slidesToShow) { _.slideHandler(index, false, true) return } _.slideHandler(index) } Slick.prototype.slideHandler = function(index, sync, dontAnimate) { var targetSlide, animSlide, oldSlide, slideLeft, 
```

### `selectHandler`
```js
selectHandler = function(event) { var _ = this var targetElement = $(event.target).is('.slick-slide') ? $(event.target) : $(event.target).parents('.slick-slide') var index = parseInt(targetElement.attr('data-slick-index')) if (!index) index = 0 if (_.slideCount <= _.options.slidesToShow) { _.slideHandler(index, false, true) return } _.slideHandler(index) } Slick.prototype.slideHandler = function(index, sync, dontAnimate) { var targetSlide, animSlide, oldSlide, slideLeft, targetLeft = null, _ = this, navTarget sync = sync || false if (_.animating === true && _.options.waitForAnimate === true) { 
```

### `_removeProperty`
```js
_removeProperty = function _removeProperty(target, property) { if (property) { var style = target.style, first2Chars if (property in _transformProps && property !== _transformOriginProp) { property = _transformProp } if (style.removeProperty) { first2Chars = property.substr(0, 2) if (first2Chars === 'ms' || property.substr(0, 6) === 'webkit') { //Microsoft and some Webkit browsers don't conform to the standard of capitalizing the first prefix character, so we adjust so that when we prefix the caps with a dash, it's correct (otherwise it'd be "ms-transform" instead of "-ms-transform" for IE9, for example) property = '-' + property } style.removeProperty(first2Chars === '--' ? property : p
```

### `_tweenComplexCSSString`
```js
_tweenComplexCSSString = function _tweenComplexCSSString(target, prop, start, end) { // note: we call _tweenComplexCSSString.call(pluginInstance...) to ensure that it's scoped properly. We may call it from within a plugin too, thus "this" would refer to the plugin. if (!start || start === 'none') { // some browsers like Safari actually PREFER the prefixed property and mis-report the unprefixed value like clipPath (BUG). In other words, even though clipPath exists in the style ("clipPath" in target.style) and it's set in the CSS properly (along with -webkit-clip-path), Safari reports clipPath as "none" whereas WebkitClipPath reports accurately like "ellipse(100% 0% at 50% 0%)", so in this cas
```

### `_roundModifier`
```js
_roundModifier = function _roundModifier(v) { //pass in 0.1 get a function that'll round to the nearest tenth, or 5 to round to the closest 5, or 0.001 to the closest 1000th, etc. var p = Math.pow(10, ((v + '').split('.')[1] || '').length) //to avoid floating point math errors (like 24 * 0.1 == 2.4000000000000004), we chop off at a specific number of decimal places (much faster than toFixed()) return function(raw) { var n = _roundPrecise(Math.round(parseFloat(raw) / v) * v * p) return (n - (n % 1)) / p + (_isNumber(raw) ? 0 : getUnit(raw)) // n - n % 1 replaces Math.floor() in order to handle negative values properly. For example, Math.floor(-150.00000000000003) is 151! } }, snap = function 
```

### `that`
```js
function that'll round to the nearest tenth, or 5 to round to the closest 5, or 0.001 to the closest 1000th, etc. var p = Math.pow(10, ((v + '').split('.')[1] || '').length) //to avoid floating point math errors (like 24 * 0.1 == 2.4000000000000004), we chop off at a specific number of decimal places (much faster than toFixed()) return function(raw) { var n = _roundPrecise(Math.round(parseFloat(raw) / v) * v * p) return (n - (n % 1)) / p + (_isNumber(raw) ? 0 : getUnit(raw)) // n - n % 1 replaces Math.floor() in order to handle negative values properly. For example, Math.floor(-150.00000000000003) is 151! } }, snap = function snap(snapTo, value) { var isArray = _isArray(snapTo), radius, is2D
```

### `then`
```js
then: function then(onFulfilled, onRejected, onProgress) { var maxDepth = 0 function resolve(depth, deferred, handler, special) { return function() { var that = this, args = arguments, mightThrow = function mightThrow() { var returned, then // Support: Promises/A+ section 2.3.3.3.3 // https://promisesaplus.com/#point-59 // Ignore double-resolution attempts if (depth < maxDepth) { return } returned = handler.apply(that, args) // Support: Promises/A+ section 2.3.1 // https://promisesaplus.com/#point-48 
```

### `resolve`
```js
function resolve(depth, deferred, handler, special) { return function() { var that = this, args = arguments, mightThrow = function mightThrow() { var returned, then // Support: Promises/A+ section 2.3.3.3.3 // https://promisesaplus.com/#point-59 // Ignore double-resolution attempts if (depth < maxDepth) { return } returned = handler.apply(that, args) // Support: Promises/A+ section 2.3.1 // https://promisesaplus.com/#point-48 if (returned === deferred.promise()) { throw new TypeError('Thenable self-resolution'
```

### `compareTo`
```js
compareTo = function(other) { if (this.major > other.major) return 1; if (this.major < other.major) return -1; if (this.minor > other.minor) return 1; if (this.minor < other.minor) return -1; if (this.patch > other.patch) return 1; if (this.patch < other.patch) return -1; if (this.preRelease && !other.preRelease) return -1; if (!this.preRelease && other.preRelease) return 1; if (this.preRelease && other.preRelease) { if (this.preRelease > other.preRelease) return 1; if (this.preRelease < other.preRelease) return -1; return 0; } return 0; }; return SemanticVersion; }(); var EvaluationEngine = /** @class */ function() { function EvaluationEngine() {} EvaluationEngine.prototype.evaluate = funct
```
