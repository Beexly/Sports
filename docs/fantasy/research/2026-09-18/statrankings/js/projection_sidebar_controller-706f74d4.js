import { Controller } from "@hotwired/stimulus"

// Week-wide projection leaderboard beside the admin projection spreadsheet
// (Views::Admin::NFL::ProjectionReviews::Sidebar).
//
// Two jobs, both purely client-side:
//
// 1. Position filter (Overall / QB / RB / WR / TE). Filtering hides rows
//    rather than re-fetching, renumbers the visible ranks 1..N, and hides the
//    Pos column while a single position is selected — the column would carry
//    the same value on every row. The selection persists to localStorage and
//    is restored on connect, the same way projection_override_controller
//    restores the "Show player props" toggle: the Turbo refresh morph that
//    delivers recomputed projections re-renders this list from the server,
//    unfiltered and in server rank order.
//
// 2. Live re-ranking. projection_override_controller dispatches
//    `projection-override:saved` after every successful save, carrying the
//    player's now-effective PPR projection; this rewrites that row's value,
//    re-sorts the whole list by projection descending, and renumbers.
//
// Sorting touches ~500 rows on a full week, so it reads every row's value
// once into an array, sorts that, and re-appends the nodes through a single
// DocumentFragment — one reflow per save rather than one per row.
//
// CSS class names all arrive from Ruby via the Stimulus classes API.

const STORAGE_KEY = "projReviewSidebarPosition"
const OVERALL = ""

export default class extends Controller {
  static targets = ["body", "status", "filterButton"]
  static classes = ["active", "hiddenRow", "evenRow", "positionFiltered"]

  // A plain field rather than a Stimulus value: a value's changed callback
  // fires off the data-attribute MutationObserver, so it runs a microtask
  // after the click and the announcement could not name the row count the
  // same interaction just produced.
  position = OVERALL

  connect() {
    this.position = this._storedPosition()
    this._apply({ announce: false })

    // A refresh morph replaces these rows with fresh server HTML, which never
    // carries the filter — reapply it once the new list is in place.
    this._onTurboRender = () => this._apply({ announce: false })
    document.addEventListener("turbo:render", this._onTurboRender)

    // Listened for on window rather than the shared .proj-review wrapper: the
    // event bubbles from whichever input was edited, and window is the one
    // node guaranteed to still be there after a morph swaps the wrapper.
    this._onSaved = (event) => this._applySavedProjection(event.detail)
    window.addEventListener("projection-override:saved", this._onSaved)
  }

  disconnect() {
    document.removeEventListener("turbo:render", this._onTurboRender)
    window.removeEventListener("projection-override:saved", this._onSaved)
  }

  filter(event) {
    this.position = event.params.position ?? OVERALL
    this._store(this.position)
    this._apply({ announce: true })
  }

  // Rank renumbering is what makes the filter readable: an admin who picks WR
  // wants the WR board, not the overall ranks with gaps in them.
  _apply({ announce }) {
    if (!this.hasBodyTarget) return

    const position = this.position
    this.element.classList.toggle(this.positionFilteredClass, position !== OVERALL)
    this._syncButtons(position)

    let rank = 0
    for (const row of this._rows()) {
      const visible = position === OVERALL || row.dataset.position === position
      row.classList.toggle(this.hiddenRowClass, !visible)
      if (!visible) continue
      this._setRank(row, ++rank)
      // Striping has to follow the visible sequence, not DOM position: CSS
      // :nth-child(even) counts the filtered-out rows too and turns the
      // stripes into arbitrary bands.
      row.classList.toggle(this.evenRowClass, rank % 2 === 0)
    }
    if (announce) this._announce(position, rank)
  }

  _syncButtons(position) {
    for (const button of this.filterButtonTargets) {
      const active = (button.dataset.projectionSidebarPositionParam ?? OVERALL) === position
      button.classList.toggle(this.activeClass, active)
      button.setAttribute("aria-pressed", String(active))
    }
  }

  _applySavedProjection({ playerId, projection } = {}) {
    const row = this._rows().find((candidate) => candidate.dataset.playerId === playerId)
    if (!row) return

    const value = Number.parseFloat(projection)
    row.dataset.projection = Number.isNaN(value) ? "0" : String(value)
    const cell = row.querySelector("[data-sidebar-value]")
    if (cell) cell.textContent = Number.isNaN(value) ? "" : String(Math.round(value * 100) / 100)

    this._sort()
    this._apply({ announce: false })
  }

  _sort() {
    const ordered = this._rows().toSorted((left, right) =>
      this._projection(right) - this._projection(left) || this._name(left).localeCompare(this._name(right)))
    const fragment = document.createDocumentFragment()
    for (const row of ordered) fragment.append(row)
    this.bodyTarget.append(fragment)
  }

  _rows() {
    return Array.from(this.bodyTarget.querySelectorAll("[data-sidebar-row]"))
  }

  // Mirrors EffectiveRow.ranked's tie break, so a row edited into a tie sorts
  // where a reload would put it instead of at the end of the tie group.
  _name(row) {
    return row.querySelector("[data-sidebar-name]")?.textContent.trim() ?? ""
  }

  _projection(row) {
    const value = Number.parseFloat(row.dataset.projection)
    return Number.isNaN(value) ? 0 : value
  }

  _setRank(row, rank) {
    const cell = row.querySelector("[data-sidebar-rank]")
    if (cell) cell.textContent = String(rank)
  }

  _announce(position, count) {
    if (!this.hasStatusTarget) return
    const label = position === OVERALL ? "All positions" : position
    this.statusTarget.textContent = `${label} — ${count} ${count === 1 ? "player" : "players"}`
  }

  // localStorage throws outright in a browser configured to block site data,
  // and this is a convenience, not state the page depends on — a failure here
  // must not take the whole controller (and with it the filter) down.
  _storedPosition() {
    let stored
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      return OVERALL
    }
    // Validated against the pills actually on the page: a stored position that
    // has since left the list would hide every row, with no pill active and no
    // way back except guessing "Overall".
    return this._offeredPositions().includes(stored) ? stored : OVERALL
  }

  _offeredPositions() {
    return this.filterButtonTargets.map((button) => button.dataset.projectionSidebarPositionParam ?? OVERALL)
  }

  _store(position) {
    try {
      window.localStorage.setItem(STORAGE_KEY, position)
    } catch {
      // Selection still applies for this page view; it just won't survive.
    }
  }
}
