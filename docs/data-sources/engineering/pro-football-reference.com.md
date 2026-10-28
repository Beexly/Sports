# pro-football-reference.com — engineering

App bundles beautified: **1**  
JSON endpoints captured: **0**  
Client functions passing filter: **12**

## Captured JSON endpoints

_None. No JSON endpoint was reachable unauthenticated from the client surface._

## Client-side functions that passed the filter

### `u`
```js
u = function(customerConfig, flavor, language) { return l({ type: flavor, lang: language || "en" }, customerConfig || window.customerConfig || {}) }, p = i.Bl.currentScript && i.Bl.currentScript.nonce || n.nc; p && (n.nc = p); const f = i.Bl.currentScript && "function" == typeof i.Bl.currentScript.getAttribute && i.Bl.currentScript.getAttribute("data-osano-ui-target") || void 0, d = i.Bl.currentScript && "function" == typeof i.Bl.currentScript.getAttribute && i.Bl.currentScript.getAttribute("data-osano-load-mode") || void 0, g = i.Bl.currentScript && i.Bl.currentScript.src && i.Bl.currentScript.src.replace(/\/[^/]*$/, "") || "", h = function(e, t) { if (!t) return e; const n = Object.keys(t)
```

### `Ye`
```js
function Ye(e) { const { ariaDescribedBy: t, asButton: n = !1, block: r, className: o = "", href: i, target: c, label: s, onClick: a, tabIndex: l = 0, title: u, type: p } = e, f = (0, z.A)(e, We), { prefix: d = "osano-cm-" } = f, g = { root: re({ prefix: d, block: r, element: "link", className: o, modifiers: { element: { type: p } } }) }; return n ? D`<button type="button" tabindex="${l}" class="${le(g.root)}" @click="${a}" title="${ue(u)}" aria-describedby="${ue(t)}"> ${s} </button>` : 
```

### `wt`
```js
wt=function({category:e,store:t}){return function(n){const r=n.target.checked;t.dispatch(be.Ay.setConsent(e,r?i.FA:i.Fr))}};function $t(e){const{category:t,prefix:n,store:{getState:r}}=e,o=r(),s=(0,c.MJ)(o),a=(0,c.aE)(o,t),l=(0,c.pU)(o,t),u=s&&`${n}drawer-toggle--category_${t}--description`,p=i.hT.translate(`categories.${t}.label`)||"",f=i.hT.translate(`categories.${t}.label`)||"";return mt(vt(vt({},e),{},{descriptionId:u,label:p,title:f||p,checked:a,disabled:l,onChange:wt(e)}))}function At(e){const{store:{getState:t},label:n}=e,r=t(),{linkColor:o,closeButtonColor:i=o}=(0,c.Sf)(r);return D`<svg width="20px" height="20px" viewBox="0 0 20 20" aria-hidden="true" focusable="false"> <title>${n}</
```

### `qr`
```js
function qr(e){const{id:t,block:n}=e,r=(0,z.A)(e,Br),{prefix:o,store:{getState:s}}=r,a={description:re({prefix:o,block:n,element:"description"}),iabLinks:re({prefix:o,block:n,element:"iab-links"})},l=s(),u=(0,Xe.lF)(l),p=(0,c.pZ)(l),f=(0,c.Pq)(l),d=(0,c.Zp)(l),g=(0,c.IZ)(l),h=(0,c.rE)(l),b=i.hT.template(`buttons.${g}`),y=i.hT.template(`messaging.${g}`),m=Ur(Ur({},r),{},{block:"content",className:"osano-cm-storage-policy",label:b(void 0,y()),href:f,target:"_blank"}),O=h.map(function([e,t]){return D`<span class="osano-cm-link-separator"></span>${Ye(Ur(Ur({},m),{},{className:"osano-cm-additional-link",label:i.hT.template(`messaging.${e}`)(),href:t}))}`}),v=h.filter(function([e]){return"subjectR
```

### `co`
```js
function co(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?io(Object(n),!0).forEach(function(t){(0,o.A)(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):io(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}function so(e){const{block:t,description:n,name:r,specialFeatureId:o}=e,c=(0,z.A)(e,oo),{store:{dispatch:s,getState:a}}=c,l=a(),{prefix:u="osano-cm-"}=c,p={description:re({prefix:u,block:t,element:"description"})};return D` ${mt(co(co({},c),{},{id:`${u}drawer-toggle--specialFeature_${o}`,block:t,label:r,title:r,checked:(0,Xe.uY)(l,{specialF
```

### `so`
```js
function so(e){const{block:t,description:n,name:r,specialFeatureId:o}=e,c=(0,z.A)(e,oo),{store:{dispatch:s,getState:a}}=c,l=a(),{prefix:u="osano-cm-"}=c,p={description:re({prefix:u,block:t,element:"description"})};return D` ${mt(co(co({},c),{},{id:`${u}drawer-toggle--specialFeature_${o}`,block:t,label:r,title:r,checked:(0,Xe.uY)(l,{specialFeatureId:o}),onChange:function(e){return s(function(e){return function(t){return function(n){const r=t.target.checked;n((0,he.c)(e,r?i.FA:i.Fr))}}}(o)(e))},className:oe({prefix:u,block:t,element:"drawer-toggle"}).join(" ")}))} <div class="${le(p.description)}">${n}</div> `}const ao=["id","active","block","className"];function lo(e,t){var n=Object.keys(e);i
```

### `Co`
```js
function Co({dataFocus:e}){return D`${function({onFocus:e,dataFocus:t}){return D`<span tabindex="0" aria-hidden="true" data-focus="${t}" @focus="${e}"></span>`}({dataFocus:e,onFocus:To(e)})}`}const Io=["body","header","id","tabIndex"],No="expansion-panel";function _o(e){const{body:t="",header:n,id:r=(0,ht.v4)("expansionPanel"),tabIndex:o=0}=e,i=(0,z.A)(e,Io),{prefix:s="osano-cm-",store:a}=i,{dispatch:l,getState:u}=a,p=u(),f=(0,c.a8)(p,r),d={prefix:s,block:No},g={root:Et(No,e),body:Et("body",d),toggle:Et("toggle",d)},h=function(e){if(e.preventDefault(),e.stopPropagation(),"keypress"===e.type){const t=e.charCode||e.keyCode;if(32!==t&&13!==t)return!1}return l(function(e,t){return function(n){n(
```

### `_o`
```js
function _o(e){const{body:t="",header:n,id:r=(0,ht.v4)("expansionPanel"),tabIndex:o=0}=e,i=(0,z.A)(e,Io),{prefix:s="osano-cm-",store:a}=i,{dispatch:l,getState:u}=a,p=u(),f=(0,c.a8)(p,r),d={prefix:s,block:No},g={root:Et(No,e),body:Et("body",d),toggle:Et("toggle",d)},h=function(e){if(e.preventDefault(),e.stopPropagation(),"keypress"===e.type){const t=e.charCode||e.keyCode;if(32!==t&&13!==t)return!1}return l(function(e,t){return function(n){n(be.Ay.toggleExpansionPanel(e,t))}}(r)),function(e,{prefix:t,element:n}){const r=`${t}${n}--expanded`;e.nextElementSibling.parentNode.classList.toggle(r)}(e.target,{prefix:s,element:No}),!1};return D` <div class="${le(g.root)}"> <div class="${le(g.toggle)}"
```

### `h`
```js
h=function(e){if(e.preventDefault(),e.stopPropagation(),"keypress"===e.type){const t=e.charCode||e.keyCode;if(32!==t&&13!==t)return!1}return l(function(e,t){return function(n){n(be.Ay.toggleExpansionPanel(e,t))}}(r)),function(e,{prefix:t,element:n}){const r=`${t}${n}--expanded`;e.nextElementSibling.parentNode.classList.toggle(r)}(e.target,{prefix:s,element:No}),!1};return D` <div class="${le(g.root)}"> <div class="${le(g.toggle)}" @click="${h}" @keypress="${h}" tabindex="${o}" role="link" aria-expanded="${f}" aria-controls="${r}" aria-label="${n}" id="${r}-control"> ${n} </div> <div id="${r}" class="${le(g.body)}" role="presentation" aria-labelledby="${r}-control" aria-live="${f?"polite":"no
```

### `S`
```js
S=function(e){return function(t){return{retention:ni(e.purposes,t,e.stdRetention),purposeId:t,type:"purposes"}}}(v),P=function(e){return function(t){return{retention:ni(e.specialPurposes,t,e.stdRetention),purposeId:t,type:"specialPurposes"}}}(v);return D`${function(e){const{id:t,level:n,title:r}=e;return r?D`<div id="${ue(t)}" role="heading" aria-level="${ue(n)}" class="osano-visually-hidden"> ${r} </div>`:""}({level:2,title:l})} <p>${l}</p> ${function(e){const{purposes:t,vendorId:n}=e,r=(0,z.A)(e,xo);if(0===t.length)return"";const{store:{getState:o}}=r,i=o(),c=Xo(),s=(0,Xe.Sh)(i)[`${n}`],a=s&&!(0,Xe.CT)(i,{vendorId:n});return mt(Fo(Fo({},r),{},{label:c,title:c,disabled:!s,checked:a}))}(Fo(F
```

### `P`
```js
P=function(e){return function(t){return{retention:ni(e.specialPurposes,t,e.stdRetention),purposeId:t,type:"specialPurposes"}}}(v);return D`${function(e){const{id:t,level:n,title:r}=e;return r?D`<div id="${ue(t)}" role="heading" aria-level="${ue(n)}" class="osano-visually-hidden"> ${r} </div>`:""}({level:2,title:l})} <p>${l}</p> ${function(e){const{purposes:t,vendorId:n}=e,r=(0,z.A)(e,xo);if(0===t.length)return"";const{store:{getState:o}}=r,i=o(),c=Xo(),s=(0,Xe.Sh)(i)[`${n}`],a=s&&!(0,Xe.CT)(i,{vendorId:n});return mt(Fo(Fo({},r),{},{label:c,title:c,disabled:!s,checked:a}))}(Fo(Fo({},o),{},{purposes:u,vendorId:r,category:t,block:n,id:`${$}drawer-toggle--vendor_${r}`,onChange:function(e){return
```

### `render`
```js
render:function(e){return Ye(e)}}))}(O,o,e)}${zt([l,r],function(){return _o(Fo(Fo({},o),{},{block:n,id:`${$}vendor-disclosure--${r}`,header:qo(),body:yn(Fo(Fo({},o),{},{block:"disclosures",className:Dt("disclosures",Fo(Fo({},e),{},{block:"expansion-panel"})),children:[{term:Yo(),children:[{type:"string",disclosure:`${j} ${1===j?Qo():zo()}`},...y?[{type:"string",disclosure:D`<em>${Wo()}</em>`}]:[]]},...ci(Bo,p,S),...ci(Vo,A,S),...ci(Uo,f,S),...ci(Ho,d,P),...ci(Ko,g,ri),...ci(Go,h,oi),...ci(Jo,w,ii),...m?[{term:Zo(),children:[{type:"link",href:m,label:m,ariaDescribedBy:`${$}aria.externalNewWindow`,title:`${l} ${qo()}`,target:"_blank"}]}]:[]],type:"description",render:function(e){const{type:t,d
```
