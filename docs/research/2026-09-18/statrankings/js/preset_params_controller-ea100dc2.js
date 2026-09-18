import { Controller } from "@hotwired/stimulus"

// Applies a FIXED preset query string to an otherwise crawl-clean menu link
// at click time.
//
// Some stat-menu entries are really a pointer at another stat's page with
// one filter always preselected -- e.g. the Quarterback+ menu's "QB Rushing
// Yds Per Attempt" row always means the base rushing leaderboard filtered to
// QB. Rendering that as `<a href="...?position=QB">` would make it a real,
// crawlable `?position=` anchor, which is exactly what the crawl-space rule
// in SEO.md forbids (RDM-05/06) -- one clean URL per stat page, not a spray
// of filter-state variants.
//
// carry_filters_controller solved the sibling problem -- carrying a
// visitor's OWN current filters across a clean link -- the same way: keep
// the href clean for crawlers, apply the query client-side on click. This
// controller is the fixed-preset counterpart: the query comes from the menu
// entry itself (a Stimulus value), not from the current URL.
export default class extends Controller {
  static values = { query: String }

  visit(event) {
    // Modified and non-primary clicks are the browser's to handle -- cmd/ctrl
    // to open a new tab, shift for a new window, middle-click likewise.
    // Calling preventDefault on those would navigate the current tab instead,
    // the one thing the visitor didn't ask for. They follow the plain href,
    // so they land on the destination page without the preset applied -- the
    // same trade carry_filters_controller#navigate makes.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return

    const link = event.currentTarget
    const target = new URL(link.href, window.location.origin)
    target.search = this.queryValue

    event.preventDefault()
    const turbo = window.Turbo
    if (turbo) {
      turbo.visit(target.toString())
    } else {
      window.location.assign(target.toString())
    }
  }
}
