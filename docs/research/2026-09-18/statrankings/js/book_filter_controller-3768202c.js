import { Controller } from "@hotwired/stimulus"
import { csrfParam } from "csrf_param"

// Sportsbook column picker for the live odds board. Unlike the odds-format
// and price-filter toggles (one exclusive value, so a single CSS attribute
// selector shows/hides everything), the set of sportsbook keys is dynamic
// and effectively unbounded (up to ~82 books) -- there is no static CSS rule
// that could select "whichever keys happen to be checked right now" without
// generating a rule per key ahead of time. So this controller does the one
// thing CSS genuinely cannot: toggle a hidden class on the unchecked book's
// <col> (Components::LiveOdds::BoardTable#render_colgroup).
//
// This targets the <col> rather than every header/price cell sharing the
// book's data-book-key on purpose: the "Sportsbooks" group header spans a
// fixed colspan (the total sportsbook count), so display:none-ing individual
// cells would drop them from the table's column grid and desync every column
// after them from its header. Collapsing the <col> instead
// (visibility: collapse) hides the whole column without changing the grid's
// column count.
//
// Persistence is server-side only: toggling is a subscriber feature
// (Customize+ renders the checkboxes disabled for everyone else), so
// every toggle PUTs the full selection to the server
// (LiveOddsController#update_preferences) and then Turbo-refreshes, and
// the server renders the saved selection on every load. The old
// localStorage mode for signed-out visitors is gone with their ability
// to toggle.
//
// This controller also owns recomputing "best price" every time the checked
// selection changes -- not just column visibility. Components::LiveOdds::
// BoardTable renders each price's `best` flag against every book in the
// data, but not all books are available in every jurisdiction: a price at a
// book the visitor has hidden (can't actually use) isn't the best price
// *for them*, and the server has no way to know their selection at render
// time, since the picker never round-trips to it. So every toggle re-derives
// "best" per price cell from scratch, among only the currently-checked
// venues -- every band's, since Customize+ made prediction markets the
// visitor's choice too. The comparison itself deliberately mirrors
// Odds::ImpliedProbability and BoardGame#display_for exactly (see
// implied_probability.js), so the number the client computes here is never a
// different calculation than the one the server rendered initially.
//
// The column collapse itself is only the instant feedback: once any
// <col> is visibility:collapse, the table's rendered width locks to the
// visible columns' natural widths and nothing on the <table> wins it
// back (the old fillWidth hack fought exactly that, and lost by a couple
// hundred pixels of dead space). So after the save lands, a Turbo
// refresh re-renders the table server-side without the column at all --
// a width:100% table with no collapsed cols fills the card naturally.
const HIDDEN_CLASS = "live-odds-table__venue--hidden"
const BEST_CLASS = "live-odds-price--best"
const DIM_CLASS = "lo-fresh__card--dim"

export default class extends Controller {
  static targets = ["checkbox", "count", "row", "showing", "groupCount"]
  static values = { saveUrl: String, checked: Array }

  connect() {
    this.seedFromServer()
    this.refresh()
    // A refresh morph rewrites the <col> classes and best-price flags from
    // the server's HTML (rendered for the saved selection, or the default
    // for a signed-out visitor) while the turbo-permanent Customize+ panel
    // keeps whatever the visitor actually toggled -- the same
    // client-state-vs-morph trap the odds-format toggle hit. Re-asserting
    // the checkbox state onto the fresh DOM after every morph keeps the
    // columns and the panel in agreement.
    this._onMorph = () => this.refresh()
    document.addEventListener("turbo:morph", this._onMorph)
  }

  disconnect() {
    document.removeEventListener("turbo:morph", this._onMorph)
  }

  // On a fresh load the server's rendered selection is the truth, and the
  // boxes must start from it -- not from whatever the browser restored.
  // Browsers restore form-control state on reload (hard reloads included),
  // keyed by position for unnamed inputs, and the Customize+ boxes reorder
  // between loads (checked venues first, unchecked after), so a restored
  // state lands on the wrong box. Left alone, refresh() then collapses the
  // <col> of a venue the server DID render, and one collapsed <col> locks
  // the table to its natural width (the width: 100% fill is gone) while
  // the band header's colspan still counts the unseen column. The wrapper
  // carries the server's selection as the checked value for exactly this
  // kind of reconciliation. Only on connect: after a morph the panel is
  // turbo-permanent and holds the visitor's live toggles, which a
  // broadcast landing mid-save must not revert (see refresh()).
  seedFromServer() {
    if (!this.hasCheckedValue || !this.checkboxTargets.length) return

    const checked = new Set(this.checkedValue)
    this.checkboxTargets.forEach((checkbox) => {
      checkbox.checked = checked.has(checkbox.value)
    })
  }

  refresh() {
    this.checkboxTargets.forEach((checkbox) => this.applyColumn(checkbox))
    this.updateCount()
    this.recomputeBestPrices()
  }

  toggle(event) {
    const checkbox = event.target
    this.applyColumn(checkbox)
    this.updateCount()
    this.recomputeBestPrices()
    // If the save is rejected the toggle bounces back. Leaving the box
    // unchecked would keep its <col> collapsed while the server still
    // renders the venue -- and every feed morph re-asserts the collapse
    // from the box, so that one ghost column would lock the table to its
    // natural width (dead space) and inflate its band header's colspan
    // past the columns anyone can see.
    this.save(() => {
      checkbox.checked = !checkbox.checked
      this.applyColumn(checkbox)
      this.updateCount()
      this.recomputeBestPrices()
    })
  }

  updateCount() {
    const checked = this.selectedKeys().length
    if (this.hasCountTarget) {
      this.countTarget.textContent = `${checked} of ${this.checkboxTargets.length}`
    }
    // The Customize+ panel's live figures: every venue is toggleable, so
    // "N showing" is simply the checked count, and each band's "n/m"
    // counts its own section's boxes.
    this.showingTargets.forEach((el) => {
      el.textContent = String(checked)
    })
    this.groupCountTargets.forEach((el) => {
      const boxes = el.closest(".lo-custom__section")?.querySelectorAll('[data-book-filter-target="checkbox"]')
      if (!boxes || !boxes.length) return
      const on = Array.from(boxes).filter((box) => box.checked).length
      el.textContent = `${on}/${boxes.length}`
    })
  }

  applyColumn(checkbox) {
    const col = this.element.querySelector(`col[data-book-key="${cssEscape(checkbox.value)}"]`)
    if (col) col.classList.toggle(HIDDEN_CLASS, !checkbox.checked)
    // The book's freshness card stays listed but dims while hidden --
    // the feed reports the whole board, unlit where the visitor opted out.
    const card = this.element.querySelector(`[data-fresh-key="${cssEscape(checkbox.value)}"]`)
    if (card) card.classList.toggle(DIM_CLASS, !checkbox.checked)
  }

  // Re-derives "best" for every wager row from only the venues currently
  // visible to this visitor -- the checked set, every band included.
  recomputeBestPrices() {
    const checked = new Set(this.selectedKeys())
    this.rowTargets.forEach((row) => this.recomputeRow(row, checked))
  }

  recomputeRow(row, checkedKeys) {
    const prices = Array.from(row.querySelectorAll('[data-book-filter-target="price"]')).map((el) => ({
      el,
      price: parsePrice(el.dataset.price),
      bookKey: el.dataset.bookKey,
      // Phlex renders a true boolean data value as a present-but-empty
      // attribute (data-prediction-market="") and omits it entirely for
      // false, rather than the strings "true"/"false" -- so presence in
      // the dataset, not its value, is the signal.
      predictionMarket: "predictionMarket" in el.dataset,
    }))

    // Every venue is the visitor's choice since Customize+ -- prediction
    // markets included, so no family is exempt from the checked set.
    const visible = prices.filter((p) => checkedKeys.has(p.bookKey))
    const priced = visible.filter((p) => p.price !== null)
    const best = priced.length ? priced.reduce((a, b) => (b.price > a.price ? b : a)) : null

    prices.forEach((p) => p.el.classList.toggle(BEST_CLASS, best !== null && p === best))
    this.updateBestChip(row, best)
  }

  // Keeps the row's Best Price chip in agreement with the in-cell highlight
  // this controller just derived: same winner, same rule, one source of
  // truth. The chip's price texts are copied from the winning cell's own
  // pre-rendered format spans, so the chip follows the odds-format toggle
  // for free.
  updateBestChip(row, best) {
    const chip = row.querySelector('[data-book-filter-target="best"]')
    if (!chip) return
    const blank = row.querySelector('[data-book-filter-target="bestBlank"]')

    if (best === null) {
      chip.hidden = true
      if (blank) blank.hidden = false
      return
    }

    chip.hidden = false
    if (blank) blank.hidden = true
    chip.dataset.venue = best.bookKey
    chip.title = best.el.dataset.venueTitle || ""
    for (const part of ["point", "american", "percent", "cents"]) {
      const target = chip.querySelector(`.live-odds-price__${part}`)
      const source = best.el.querySelector(`.live-odds-price__${part}`)
      if (target) target.textContent = source ? source.textContent : ""
    }
  }

  // The follow-up Turbo refresh is what reclaims the collapsed column's
  // width: the server re-renders the table without it (see the
  // controller-level comment).
  //
  // The CSRF token rides in the body, not the X-CSRF-Token header: the
  // CDN strips that header before Rails sees it (csrf_param.js). And the
  // refresh only runs for a save the server accepted -- fetch() resolves
  // on a 4xx/5xx too, so without the ok check a rejected PUT would
  // re-render the server's OLD selection (the venue back in the table,
  // its <col> re-collapsed from the box on every morph) and the visitor
  // would see their change silently not stick. A rejected save calls
  // onFailure instead, which the toggle uses to bounce the box back.
  save(onFailure) {
    if (!this.saveUrlValue) return

    fetch(this.saveUrlValue, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ sportsbook_keys: this.selectedKeys(), ...csrfParam() }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`save failed (${response.status})`)
        window.Turbo?.visit(window.location.href, { action: "replace" })
      })
      .catch((error) => {
        console.warn("book-filter: preference save failed", error)
        onFailure?.()
      })
  }

  // With no picker on the page (the design parked it until Customize+ is
  // built), the server-resolved selection rides in as a value instead --
  // the same keys the server hid the <col>s by, so the best-price
  // derivation stays consistent with what's actually visible.
  selectedKeys() {
    if (!this.checkboxTargets.length) return this.checkedValue

    return this.checkboxTargets.filter((c) => c.checked).map((c) => c.value)
  }

}

function cssEscape(value) {
  return window.CSS && CSS.escape ? CSS.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&")
}

function parsePrice(raw) {
  if (raw === undefined || raw === "") return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

