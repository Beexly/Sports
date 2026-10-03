import { Controller } from "@hotwired/stimulus"

// Progressive-enhancement infinite scroll, generic over any scrollable
// container + appendable row list (originally built for the stats
// leaderboards' `.data-table-scroll`/`<tbody>`, generalized so any
// server-paginated list can reuse it — e.g. the admin missing-links list,
// which appends into a plain `.player-linker__list` div instead of a table).
//
// The page still ships server-side paginated (Pagy) with rel=next/prev in the
// document head, so crawlers paginate exactly as before (see SEO.md) — this
// controller only layers human-facing infinite scroll on top.
//
// scrollSelectorValue names the bounded-height scroll region within `frame`;
// rowsSelectorValue names the element within it whose children get appended
// to. This controller watches a sentinel it appends inside the scroll
// region; when the sentinel nears the bottom it fetches the next ?page=N —
// preserving every other current query param (e.g. a `source` filter) — and
// appends the fetched page's rows. It keeps loading page by page as the
// visitor scrolls until the last page.
export default class extends Controller {
  static targets = ["status", "spinner"]
  static values = {
    nextPage: Number,
    totalPages: Number,
    frame: { type: String, default: "stats-content" },
    scrollSelector: { type: String, default: ".data-table-scroll" },
    rowsSelector: { type: String, default: "table.data-table tbody" },
  }

  connect() {
    this.scroller = document.querySelector(`#${this.frameValue} ${this.scrollSelectorValue}`)
    if (!this.#hasMore || !this.scroller) return this.#finish()

    this.loading = false

    // A zero-height tripwire at the bottom of the table's own scroll region.
    this.sentinel = document.createElement("div")
    this.sentinel.className = "infinite-scroll__sentinel"
    this.sentinel.setAttribute("aria-hidden", "true")
    this.scroller.appendChild(this.sentinel)

    this.observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) this.#fetchNext()
    }, { root: this.scroller, rootMargin: "400px 0px" })
    this.observer.observe(this.sentinel)
  }

  disconnect() {
    this.observer?.disconnect()
    this.sentinel?.remove()
  }

  async #fetchNext() {
    if (this.loading || !this.#hasMore) return
    this.loading = true
    this.#setSpinner(true)
    this.#announce("Loading more rows…")

    try {
      const response = await fetch(this.#nextUrl(), { headers: { Accept: "text/html" } })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)

      this.#appendRows(await response.text())
      this.nextPageValue += 1
      this.#announce("")
    } catch {
      this.#announce("Couldn’t load more rows.")
    } finally {
      this.loading = false
      this.#setSpinner(false)
      if (!this.#hasMore) this.#finish()
    }
  }

  #setSpinner(on) {
    if (this.hasSpinnerTarget) this.spinnerTarget.hidden = !on
  }

  #nextUrl() {
    const url = new URL(window.location.href)
    const params = new URLSearchParams(window.location.search)
    params.set("page", this.nextPageValue)
    url.search = params.toString()
    return url.toString()
  }

  #appendRows(html) {
    const doc = new DOMParser().parseFromString(html, "text/html")
    const source = doc.querySelector(`#${this.frameValue} ${this.rowsSelectorValue}`)
    const target = this.#rowsContainer
    if (!source || !target) return

    let index = target.children.length
    for (const row of Array.from(source.children)) {
      // Re-derive zebra striping from the running row count so the seam
      // between pages stays correct for any page size (server striping is
      // computed per-page, which mismatches at odd page sizes). A no-op for
      // non-table row lists that don't use the "striped" class.
      row.classList.toggle("striped", index % 2 === 1)
      target.appendChild(document.importNode(row, true))
      index += 1
    }
  }

  get #rowsContainer() {
    return document.querySelector(`#${this.frameValue} ${this.rowsSelectorValue}`)
  }

  get #hasMore() {
    return this.nextPageValue <= this.totalPagesValue
  }

  // Nothing left to load — stop observing. The (now inert) root stays in the
  // DOM so the CSS that bounds the table's scroll height keeps matching, rather
  // than reflowing the table back to full height mid-scroll.
  #finish() {
    this.observer?.disconnect()
    this.sentinel?.remove()
  }

  #announce(text) {
    if (this.hasStatusTarget) this.statusTarget.textContent = text
  }
}
