# rotoballer.com — engineering

App bundles beautified: **2**  
JSON endpoints captured: **0**  
Client functions passing filter: **6**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `trigger`
```js
trigger: function(b, c, e, f) { var g, h, i, j, l, m, o, p = [e || d], q = k.call(b, "type") ? b.type : b, r = k.call(b, "namespace") ? b.namespace.split(".") : []; if (i = m = e = e || d, 3 !== e.nodeType && 8 !== e.nodeType && !na.test(q + n.event.triggered) && (q.indexOf(".") > -1 && (r = q.split("."), q = r.shift(), r.sort()), h = q.indexOf(":") < 0 && "on" + q, b = b[n.expando] ? b : new n.Event(q, "object" == typeof b && b), b.isTrigger = f ? 2 : 3, b.namespace = r.join("."), b.rnamespace = b.namespace ? new RegExp("(^|\\.)" + r.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, b.result = void 0, b.target || (b.target = e), c = null == c ? [b] : n.makeArray(c, [b]), l = n.event.special[q] || 
```

### `max`
```js
max: function(value, element, param) { return this.optional(element) || value <= param; }, // http://jqueryvalidation.org/range-method/ range: function(value, element, param) { return this.optional(element) || (value >= param[0] && value <= param[1]); }, // http://jqueryvalidation.org/equalTo-method/ equalTo: function(value, element, param) { // bind to the blur event of the target in order to revalidate whenever the target field is updated // TODO find a way to bind the event just once, avoiding the unbind-rebind overhead var target = $(param); if (this.settings.onfocusout) { target.unbind(".validate-equalTo").bind("blur.validate-equalTo", function() { $(element).valid(); }); } return value
```

### `range`
```js
range: function(value, element, param) { return this.optional(element) || (value >= param[0] && value <= param[1]); }, // http://jqueryvalidation.org/equalTo-method/ equalTo: function(value, element, param) { // bind to the blur event of the target in order to revalidate whenever the target field is updated // TODO find a way to bind the event just once, avoiding the unbind-rebind overhead var target = $(param); if (this.settings.onfocusout) { target.unbind(".validate-equalTo").bind("blur.validate-equalTo", function() { $(element).valid(); }); } return value === target.val(); }, // http://jqueryvalidation.org/remote-method/ remote: function(value, element, param) { if (this.optional(element)
```

### `equalTo`
```js
equalTo: function(value, element, param) { // bind to the blur event of the target in order to revalidate whenever the target field is updated // TODO find a way to bind the event just once, avoiding the unbind-rebind overhead var target = $(param); if (this.settings.onfocusout) { target.unbind(".validate-equalTo").bind("blur.validate-equalTo", function() { $(element).valid(); }); } return value === target.val(); }, // http://jqueryvalidation.org/remote-method/ remote: function(value, element, param) { if (this.optional(element)) { return "dependency-mismatch"; } var previous = this.previousValue(element), validator, data; if (!this.settings.messages[element.name]) { this.settings.messages[e
```

### `min`
```js
min: function(value, element, param) { return this.optional(element) || value >= param; }, // http://jqueryvalidation.org/max-method/ max: function(value, element, param) { return this.optional(element) || value <= param; }, // http://jqueryvalidation.org/range-method/ range: function(value, element, param) { return this.optional(element) || (value >= param[0] && value <= param[1]); }, // http://jqueryvalidation.org/equalTo-method/ equalTo: function(value, element, param) { // bind to the blur event of the target in order to revalidate whenever the target field is updated // TODO find a way to bind the event just once, avoiding the unbind-rebind overhead var target = $(param); if (this.setti
```

### `rangelength`
```js
rangelength: function(value, element, param) { var length = $.isArray(value) ? value.length : this.getLength($.trim(value), element); return this.optional(element) || (length >= param[0] && length <= param[1]); }, // http://jqueryvalidation.org/min-method/ min: function(value, element, param) { return this.optional(element) || value >= param; }, // http://jqueryvalidation.org/max-method/ max: function(value, element, param) { return this.optional(element) || value <= param; }, // http://jqueryvalidation.org/range-method/ range: function(value, element, param) { return this.optional(element) || (value >= param[0] && value <= param[1]); }, // http://jqueryvalidation.org/equalTo-method/ equalTo
```
