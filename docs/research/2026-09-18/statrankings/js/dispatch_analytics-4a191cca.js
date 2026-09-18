export function dispatchAnalytics(name, params = {}) {
  document.dispatchEvent(
    new CustomEvent("analytics:track", { detail: { name, params } }),
  )
}
