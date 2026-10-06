// GA4 transport. Every analytics event in the app arrives here as an
// `analytics:track` CustomEvent (see dispatch_analytics.js) and leaves as a
// gtag call. gtag itself is only present on indexable hosts -- see
// ApplicationLayout#render_google_analytics -- so everything below no-ops
// everywhere else.

// The URL of the last page_view we sent. Turbo's `refresh` stream action
// performs a Drive visit to the SAME url and therefore dispatches turbo:load,
// so without this guard every board refresh (up to one per 5s, see
// WatermarkBroadcast::MIN_INTERVAL) counted as a page view. A genuine reload
// starts a new document and resets this to null, so reloads still count.
let lastTrackedUrl = null

// Classification is written to <body> by ApplicationLayout#classification_data.
// Read at send time rather than cached, because Turbo swaps the body on
// navigation and morphs it on a refresh -- a cached copy would describe the
// page the visitor has already left.
function classification() {
  const data = document.body ? document.body.dataset : {}
  const params = {}

  if (data.analyticsSport) params.sport = data.analyticsSport
  if (data.analyticsPageType) params.page_type = data.analyticsPageType
  if (data.analyticsContentGroup) params.content_group = data.analyticsContentGroup

  return params
}

// Classification first so an event that names one of these parameters itself
// wins, rather than being silently overwritten by the page's own value.
function trackEvent(eventName, params = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, { ...classification(), ...params })
  }
}

function trackPageView() {
  if (location.href === lastTrackedUrl) return

  lastTrackedUrl = location.href
  trackEvent("page_view", {
    page_location: location.href,
    page_title: document.title,
  })
}

document.addEventListener("analytics:track", (event) => {
  const { name, params } = event.detail
  if (name) trackEvent(name, params || {})
})

document.addEventListener("turbo:load", trackPageView)
