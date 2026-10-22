/* eslint-disable */

(function(w, d, s) {
  const f = d.getElementsByTagName(s)[0];
  j = d.createElement(s);
  j.async = true;
  j.src = `https://assets.adobedtm.com/6a2d3120441b/cf4e0e86d2e8/launch-${
    w.environment === 'prod' ? 'dcc70af5ff3c' : '6c7af1ac1827-staging'
  }.min.js`;
  f.parentNode.insertBefore(j, f);
})(window, document, 'script');
