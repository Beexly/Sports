import { Controller } from "@hotwired/stimulus"

// Carries the visitor's current filters across a link that points at a clean
// URL.
//
// The Fantasy Rankings platform tiles link to /nfl/fantasy-football-rankings/
// <platform> with no query string, so the server renders one crawlable URL per
// platform and no combinatorial spray of ?scoring=/?position= variants (the
// crawl-space rule in SEO.md). But a visitor who has narrowed to RB under full
// PPR and then switches platform means "the same view, elsewhere" -- dropping
// their filters silently widens the table they were looking at.
//
// So the href stays clean for crawlers and this re-attaches the current URL's
// filters at click time for humans. `view` rides along too: it is the lens the
// page is being read through, and switching platform on the ADP board is that
// board's central interaction. `page` is deliberately not carried -- a
// different platform's page three is not the same place.
const CARRIED = ["scoring", "position", "team", "player_name", "sort_field", "sort_order", "view"]

export default class extends Controller {
  // Filters the destination doesn't accept, named by the link itself. A
  // best-ball or high-stakes platform drafts under one scoring nobody can
  // change, so clicking Drafters from a half-PPR view goes to Drafters' clean
  // URL in full PPR -- not to ?scoring=half-ppr, which that page would ignore
  // while the address bar went on claiming it.
  static values = { drop: Array }

  navigate(event) {
    // Modified and non-primary clicks are the browser's to handle -- cmd/ctrl
    // to open a new tab, shift for a new window, middle-click likewise. Calling
    // preventDefault on those navigates the current tab instead, which is the
    // one thing the visitor asked not to happen. They follow the plain href, so
    // they open the platform's page without the current filters carried onto
    // it; the same trade pagination_link_controller makes.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return

    const link = event.currentTarget
    const current = new URL(window.location.href).searchParams
    const target = new URL(link.href, window.location.origin)

    const dropped = this.dropValue
    let carried = false
    for (const key of CARRIED) {
      if (dropped.includes(key)) continue

      const value = current.get(key)
      if (value) {
        target.searchParams.set(key, value)
        carried = true
      }
    }

    if (!carried) return

    // Let Turbo handle the visit the way it would have handled the click,
    // rather than reimplementing the link's own turbo-frame semantics here.
    event.preventDefault()
    const turbo = window.Turbo
    if (turbo) {
      turbo.visit(target.toString())
    } else {
      window.location.assign(target.toString())
    }
  }
}
