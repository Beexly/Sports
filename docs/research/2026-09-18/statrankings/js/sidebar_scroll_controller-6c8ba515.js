import { Controller } from "@hotwired/stimulus"

// Scrolls the sidebar on load so the selected category's header sits at the
// sidebar's top edge (clamped to the max scroll when there isn't enough
// content below to fill the sidebar, e.g. the last category in the list).
// Pinning the category header, rather than centering the active stat row,
// keeps the whole expanded category visible instead of cutting off sibling
// rows above it (STAT-1142 condensed sections open to the current category).
export default class extends Controller {
  connect() {
    const category = this.element.querySelector(
      ".stat-accordion-list__trigger[aria-expanded='true']:not(.stat-accordion-list__trigger--nested)",
    )
    if (!category) return

    const sidebar = this.element
    const maxScroll = sidebar.scrollHeight - sidebar.clientHeight
    const scrollTarget = Math.min(category.offsetTop - sidebar.offsetTop, maxScroll)

    sidebar.scrollTo({ top: Math.max(scrollTarget, 0), behavior: "smooth" })
  }
}
