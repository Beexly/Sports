import { Controller } from "@hotwired/stimulus"

// Navigates the Superflex switch without it being a link.
//
// Superflex is a segment of the address rather than a parameter, so flipping it
// is a visit to a different path -- but most of those paths are toggle states,
// which the URL spec says render and are shareable yet must never receive an
// internal link (docs/FANTASY_RANKINGS_URLS.md). An anchor would have been one:
// from /draftkings/qb the switch points at /draftkings/superflex/qb, and a
// crawler following it would index a state we canonical away.
//
// So it pushes the state the way the filter pills do (SEO.md RDM-05/RDM-06)
// rather than carrying an href. The target is computed server-side by
// NFL::FantasyRankingsControlPaths, which already holds the tokens and their order.
export default class extends Controller {
  static values = { url: String }

  toggle() {
    const turbo = window.Turbo

    if (turbo) {
      turbo.visit(this.urlValue)
    } else {
      window.location.assign(this.urlValue)
    }
  }
}
