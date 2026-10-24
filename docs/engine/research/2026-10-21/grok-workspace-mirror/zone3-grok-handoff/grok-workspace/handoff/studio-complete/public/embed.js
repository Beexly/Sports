/* SignPreview shop embed — drop on any quote page.
   <script src="/embed.js" data-shop="River Oaks Signs"></script>
*/
(function () {
  var script = document.currentScript;
  var shop = (script && script.getAttribute("data-shop")) || "SignPreview";
  var origin = script && script.src ? new URL(script.src).origin : window.location.origin;
  var iframe = document.createElement("iframe");
  iframe.src = origin + "/signpreview/embed?shop=" + encodeURIComponent(shop);
  iframe.title = "SignPreview";
  iframe.style.cssText = "width:100%;height:820px;border:0;border-radius:16px;background:#0a0908";
  iframe.loading = "lazy";
  script.parentNode.insertBefore(iframe, script.nextSibling);
})();
