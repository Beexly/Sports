# thepowerrank.com — engineering

Bundles beautified: **14**  
Bytes read: **673,460**  
Endpoints called: **0**

## Scoring / ranking / projection functions

### `projection`
```js
projection = function(x) { if (!arguments.length) return projection; projection = x; return diagonal; }; return diagonal; }; function d3_svg_diagonalProjection(d) { return [d.x, d.y]; } d3.svg.diagonal.radial = function() { var diagonal = d3.svg.diagonal(), projection = d3_svg_diagonalProjection, projection_ = diagonal.projection; diagonal.projection = function(x) { return arguments.length ? projection_(d3_svg_diagonalRadialProjection(projection = x)) : projection; }; return diagonal; }; function d3_svg_diagonalRadialProjection(projection) { return function() { var d = projection.apply(this, arguments), r = d[0], a = d[1] + d3_svg_arcOffset; return [r * Math.cos(a), r * Math.sin(a)]; }; } d3
```

### `d3_svg_diagonalProjection`
```js
function d3_svg_diagonalProjection(d) { return [d.x, d.y]; } d3.svg.diagonal.radial = function() { var diagonal = d3.svg.diagonal(), projection = d3_svg_diagonalProjection, projection_ = diagonal.projection; diagonal.projection = function(x) { return arguments.length ? projection_(d3_svg_diagonalRadialProjection(projection = x)) : projection; }; return diagonal; }; function d3_svg_diagonalRadialProjection(projection) { return function() { var d = projection.apply(this, arguments), r = d[0], a = d[1] + d3_svg_arcOffset; return [r * Math.cos(a), r * Math.sin(a)]; }; } d3.svg.mouse = function(container) { return d3_svg_mousePoint(container, d3.event); }; // https://bugs.webkit.org/show_bug.cgi?
```

### `revalue`
```js
function revalue(node, depth) { var children = node.children, v = 0; if (children && (n = children.length)) { var i = -1, n, j = depth + 1; while (++i < n) v += revalue(children[i], j); } else if (value) { v = +value.call(hierarchy, d3_layout_hierarchyInline ? node : node.data, depth) || 0; } if (value) node.value = v; return v; } function hierarchy(d) { var nodes = []; recurse(d, 0, nodes); return nodes; } hierarchy.sort = function(x) { if (!arguments.length) return sort; sort = x; return hierarchy; }; hierarchy.children = function(x) { if (!arguments.length) return children; children = x; return hierarchy; }; hierarchy.value = function(x) { if (!arguments.length) return value; value = x; r
```

### `d3_svg_diagonalRadialProjection`
```js
function d3_svg_diagonalRadialProjection(projection) { return function() { var d = projection.apply(this, arguments), r = d[0], a = d[1] + d3_svg_arcOffset; return [r * Math.cos(a), r * Math.sin(a)]; }; } d3.svg.mouse = function(container) { return d3_svg_mousePoint(container, d3.event); }; // https://bugs.webkit.org/show_bug.cgi?id=44083 var d3_mouse_bug44083 = /WebKit/.test(navigator.userAgent) ? -1 : 0; function d3_svg_mousePoint(container, e) { var point = (container.ownerSVGElement || container).createSVGPoint(); if ((d3_mouse_bug44083 < 0) && (window.scrollX || window.scrollY)) { var svg = d3.select(document.body) .append("svg") .style("position", "absolute") .style("top", 0) .style("l
```

### `d3_layout_hierarchyValue`
```js
function d3_layout_hierarchyValue(d) { return d.value; } function d3_layout_hierarchySort(a, b) { return b.value - a.value; } // Returns an array source+target objects for the specified nodes. function d3_layout_hierarchyLinks(nodes) { return d3.merge(nodes.map(function(parent) { return (parent.children || []).map(function(child) { return { source: parent, target: child }; }); })); } // For backwards-compatibility, don't enable inlining by default. var d3_layout_hierarchyInline = false; d3.layout.pack = function() { var hierarchy = d3.layout.hierarchy().sort(d3_layout_packSort), size = [1, 1]; function pack(d, i) { var nodes = hierarchy.call(this, d, i), root = nodes[0]; // Recursively compu
```

### `project`
```js
function project(coordinates) { return projection(coordinates).join(","); } var pathType = d3_geo_type({ FeatureCollection: function(o) { var path = [], features = o.features, i = -1, // features.index n = features.length; while (++i < n) path.push(pathType(features[i].geometry)); return path.join(""); }, Feature: function(o) { return pathType(o.geometry); }, Point: function(o) { return "M" + project(o.coordinates) + pointCircle; }, MultiPoint: function(o) { var path = [], coordinates = o.coordinates, i = -1, // coordinates.index n = coordinates.length; while (++i < n) path.push("M", project(coordinates[i]), pointCircle); return path.join(""); }, LineString: function(o) { var path = ["
```

## Numeric weight arrays

```
[597399067, 2869860233, 951274213, 2716044179]
[8482, 8483, 8484, 10879]
[2449897292, 4218179547, 2675077685, 1031960064, 1478620578, 1386343184, 3194259988, 2656050674, 3012733295, 2193273665]
[400, 300, 200, 100, 500, 600, 700, 800, 900]
[700, 800, 900, 600, 500, 400, 300, 200, 100]
```

## Sort comparators (ranking order)

```
a b 
        return sortKey(a.key, b.key);
a b 
          return sortGroups(groupSums[a], groupSums[b]);
a b 
            return sortSubgroups(matrix[i][a], matrix[i][b]);
a b 
        return sortChords(
          (a.source.value + a.target.value) / 2,
          (b.source.value + b.target.value) / 2);
a b 
          return max[a] - max[b];
a b 
      return a.angle - b.angle;
a b 
        return a.angle - b.angle;
a b 
          return a.y < b.y ? -1 :
            a.y > b.y ? 1 :
            a.x < b.x ? -1 :
            a.x > b.x ? 1 :
            0;
```

## Fetch call sites

```
events
backendHost
settingsSvcHost
embedIframeURL
clientEventEndpoint
scribeCallback
experimentOverride
publication_id
${Gr}-${this.config.uuid}
${jr}-${this.config.uuid}
${Hr}-${this.config.uuid}
${Vr}-${this.config.uuid}
${qr}-${this.config.uuid}
${zr}-${this.config.uuid}
full_name
company_website
email
credit_requested
https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(e)}&type=MX
sl_force_count
${Ji()}${r}
```
