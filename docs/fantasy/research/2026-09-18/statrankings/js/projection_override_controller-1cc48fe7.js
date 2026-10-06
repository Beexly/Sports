import { Controller } from "@hotwired/stimulus"

// Inline override editing for the admin NFL projection review spreadsheet.
//
// Declared once on the page wrapper (Views::Admin::NFL::ProjectionReviews::Show).
// Every override <input> and admin_injured <select> fires `stage` on
// change/Enter with its field name and player identity as action params.
//
// EDITING WRITES NOTHING. `stage` records the edit in an in-memory dirty map
// and previews it (styling, totals, market tints, sidebar rank); the Submit
// button PATCHes every staged edit to
// Admin::NFL::ProjectionOverridesController#batch in ONE request, which
// applies them in one transaction and recomputes each affected team exactly
// once. Escape reverts one cell to its last saved value (tracked in
// data-last-value, which only ever holds server-known state); Revert all
// drops every staged edit. A beforeunload guard — plus a confirm on any Turbo
// visit away from this URL — keeps staged edits from disappearing silently.
//
// Semantics mirror the server: a blank value clears the override (the cell
// then shows the model value the server returns as `effective`), while "0"
// is a real override — only the server's `value: null` marks a cell as not
// overridden. Marking a player OUT toggles the row's zeroed class so every
// cell in the row previews the pipeline's zeroing.
//
// Staging the Projection field (pprFieldValue) directly edits the pipeline's
// outcome, so every other numeric input in the row locks live — mirroring
// the server-side lock in ::NFL::ProjectionOverrideEdit#ppr_locks_other_inputs?
// — until the override is cleared. Sibling edits already staged still submit,
// and the server still takes them: they ride in the same fields hash as the
// Projection edit, which is exactly the case that rule exempts.
//
// After every staged edit the affected column sums are recomputed from
// the current effective cell values: each position <tbody>'s subtotal row and
// the <tfoot> team total row carry data-total-column cells matched against
// the body cells' data-column. OUT rows contribute 0.
//
// A staged clear is the one place the DOM alone is not enough: the input goes
// blank before any write, and a blank cell contributes 0 to a sum. The server
// stamps the post-clear fallback on the input as data-model-value, so the
// totals preview a cleared cell as the model value it is about to revert to.
//
// Clearing an OUT status does NOT restore the row's values: EffectiveRow
// zeroes every attribute server-side, so an already-OUT row renders every
// input at "0.0", and this controller only toggles the zeroed class. Totals,
// market tints, the props count and the sidebar rank all stay at 0 until the
// page is reloaded. Pre-existing for the totals; the market surfaces inherit
// it. Fixing it means the upsert endpoint returning the row's effective
// values on an admin_injured change. A team total cell stamped with data-model-value (the team-level
// model volume) is tinted when the sum deviates >10% from it, mirroring the
// server's NumberFormat.discrepancy? rule. The caption's team-total summary
// stats mirror the same tfoot totals for the six passing/rushing/receiving
// yards+TD columns, and its passing/receiving reconciliation warning
// re-evaluates whenever an edit touches one of those columns.
//
// The market rows (MarketRow) beneath each player carry the book's line for
// every column. They are a disclosure: `togglePropsVisible` flips the wrapper
// class and remembers the choice in localStorage, because the Turbo refresh
// morph re-renders from server HTML that never knows the toggle happened. A
// cell's over/under tint is relative to the player's CURRENT projection, so an
// edit — or an OUT toggle, which zeroes the whole row and therefore reads as a
// genuine "under" against a real line — re-decides the affected cells and the
// caption's "Props +/- 20%" count.
//
// Every staged edit (and every reconciled one) dispatches
// `projection-override:saved` with the player's now-effective PPR value,
// which the sidebar listens for to re-rank. The name predates staging and is
// kept because it is the sidebar's DOM contract; it means "this player's
// projection changed", whether or not it is committed yet.
//
// Editable-cell CSS class names arrive via the Stimulus classes API from Ruby
// (PlayerRow::OVERRIDDEN_CLASS etc.). The few literals below are class names on
// server HTML this controller does not own (the page wrapper, MarketRow's
// cells, the caption warning) — they are the page's DOM contract rather than
// this controller's own state classes.

// Columns behind the caption's passing/receiving reconciliation warning
// (TeamTable::SUMMARY_COLUMNS' yards/TD pairs) — every passing yard or
// touchdown is also a receiving yard or touchdown for the same team, so
// these two independently modeled totals should roughly agree.
const RECONCILIATION_ATTRS = new Set([
  "model_value_passing_yards",
  "model_value_receiving_yards",
  "pred_passing_tds",
  "pred_receiving_tds",
])

const RECONCILIATION_WARNING_CLASS = "proj-grid__summary-warning--visible"
const SUMMARY_VALUE_SELECTOR = ".proj-grid__summary-value"

// Props disclosure (Show's wrapper class + the toggle's own checkbox) and the
// market-cell edge classes (MarketRow::EDGE_CLASSES).
const PROPS_VISIBLE_CLASS = "proj-review--props-visible"
const PROPS_STORAGE_KEY = "projReviewShowProps"
const PROPS_TOGGLE_SELECTOR = '[data-action*="projection-override#togglePropsVisible"]'
const MARKET_EDGE_CLASSES = { over: "proj-grid__market-cell--over", under: "proj-grid__market-cell--under" }

// Columns::PPR_ATTR — the data-column of the final Projection cell, whose
// value rides along on the saved event for the sidebar's ranking.
const PPR_COLUMN = "model_ppr_projection"

// The two relative-difference rules on this page: >10% off a baseline/model
// volume tints a cell, >20% off a market line is an edge. Same arithmetic,
// different thresholds — see _relativeDiff.
const DISCREPANCY_THRESHOLD = 0.1
const EDGE_THRESHOLD = 0.2

export default class extends Controller {
  static targets = ["status", "teamTable", "submitButton", "revertButton", "pendingCount"]
  static classes = ["overridden", "zeroed", "saving", "deviation", "pprLocked", "refreshing", "pending", "rejected"]
  static values = { batchUrl: String, rerunUrl: String, season: Number, week: Number, pprField: String }

  connect() {
    // Staged, unsubmitted edits, keyed playerId|field. Entries hold the
    // input's id rather than the element: a Turbo refresh morph can replace
    // the node, and getElementById always resolves the live one.
    this._pending = new Map()

    this._applyPropsVisible(this._storedPropsVisible())
    this._syncPending()

    // A refresh morph preserves the wrapper element, so connect() does not
    // fire again — but idiomorph still syncs its class attribute back to the
    // server's, which drops the disclosure class and makes the market rows
    // vanish under an admin who never touched the toggle. Re-apply after the
    // morph lands, the same way the sidebar re-applies its position filter.
    // The morph also re-renders every input from server HTML that knows
    // nothing about staged edits, so those get re-applied in the same pass
    // rather than silently reverting.
    this._onTurboRender = () => {
      this._applyPropsVisible(this._storedPropsVisible())
      this._reapplyPending()
    }
    document.addEventListener("turbo:render", this._onTurboRender)

    // beforeunload covers real navigation (closing the tab, typing a URL).
    this._onBeforeUnload = (event) => {
      if (this._pending.size > 0) event.preventDefault()
    }
    window.addEventListener("beforeunload", this._onBeforeUnload)

    // Turbo visits never fire beforeunload, and the game filter auto-submits
    // one on change. A refresh morph is also a visit, but always to the
    // current URL — those are the broadcast recomputes, whose staged edits
    // _reapplyPending restores, so they must not prompt.
    this._onBeforeVisit = (event) => {
      if (this._pending.size === 0 || event.detail?.url === window.location.href) return
      if (!window.confirm(`${this._editLabel(this._pending.size)} not submitted. Leave and lose them?`)) {
        event.preventDefault()
      }
    }
    document.addEventListener("turbo:before-visit", this._onBeforeVisit)
  }

  disconnect() {
    document.removeEventListener("turbo:render", this._onTurboRender)
    document.removeEventListener("turbo:before-visit", this._onBeforeVisit)
    window.removeEventListener("beforeunload", this._onBeforeUnload)
  }

  // Disclosure for the market rows. Deliberately changes the table's height —
  // the one sanctioned exception to the page's no-layout-shift rule — and is
  // remembered across the Turbo refresh morph, which re-renders the whole page
  // from server HTML that never carries the class.
  togglePropsVisible(event) {
    const visible = event.target.checked
    this._applyPropsVisible(visible)
    // Injects or removes a couple of hundred cells, so it gets the same polite
    // announcement any other dynamic region on this page gets.
    const rows = this.element.querySelectorAll(".proj-grid__market-row").length
    this._announce(visible ? `Player props shown — ${rows} market rows` : "Player props hidden")
    try {
      window.localStorage.setItem(PROPS_STORAGE_KEY, String(visible))
    } catch {
      // Storage denied (private mode, blocked cookies): the toggle still works
      // for this page view, it just won't survive the next morph.
    }
  }

  _storedPropsVisible() {
    try {
      return window.localStorage.getItem(PROPS_STORAGE_KEY) === "true"
    } catch {
      return false
    }
  }

  // Keeps the checkbox in step with the class it drives, so a restored state
  // never renders an unchecked box over visible props.
  _applyPropsVisible(visible) {
    this.element.classList.toggle(PROPS_VISIBLE_CLASS, visible)
    const toggle = this.element.querySelector(PROPS_TOGGLE_SELECTOR)
    if (toggle) toggle.checked = visible
  }

  // Records an edit without writing it. data-last-value stays the server's
  // value throughout, so Escape can still put the cell back and a cell edited
  // back to its saved value unstages itself instead of submitting a no-op.
  stage(event) {
    const input = event.target
    const { field, label, playerId, playerName } = event.params
    const key = this._key(playerId, field)
    const staged = this._pending.get(key)

    if (input.value === input.dataset.lastValue) {
      if (!staged) return
      this._pending.delete(key)
    } else if (staged && staged.value === input.value) {
      // Enter fires keydown.enter AND (on blur) change for the same edit.
      // Nothing is in flight to race any more, but the second pass would
      // still re-announce and re-run every recalculation for no change.
      return
    } else {
      this._pending.set(key, { key, id: input.id, field, label, playerId, playerName, value: input.value })
    }

    this._applyStaged(input, field, this._pending.get(key))
    this._refreshDerived(input, field, playerId)
    this._syncPending()
    this._announce(this._stagedMessage(playerName, label, input, this._pending.has(key)))
  }

  // Sends every staged edit in one PATCH. The response reports each edit
  // separately: `applied` entries carry the server's effective value to
  // reconcile the cell against, `rejected` entries stay staged and flagged so
  // an edit the server refused is never silently dropped.
  async submit(event) {
    event?.preventDefault()
    if (this._pending.size === 0) return

    const count = this._pending.size
    // Captured up front: reconciling deletes the applied entries from the
    // dirty map, and those inputs still have to be handed back at the end.
    const inputs = Array.from(this._pending.values(), (entry) => this._inputFor(entry)).filter(Boolean)
    this._setSubmitting(inputs, true)
    this._announce(`Submitting ${this._editLabel(count)}…`)

    try {
      const data = await this._patch(this.batchUrlValue, { edits: this._groupedEdits() })
      this._reconcile(data)
    } catch (error) {
      this._announce(`Error submitting edits: ${error.message} — nothing was saved, your edits are still staged`)
    } finally {
      this._setSubmitting(inputs, false)
      this._syncPending()
    }
  }

  // Drops every staged edit, putting each cell back to its saved value.
  revertAll() {
    const count = this._pending.size
    if (count === 0) return

    for (const entry of Array.from(this._pending.values())) this._unstage(entry)
    this._syncPending()
    this._announce(`Reverted ${this._editLabel(count)}`)
  }

  // One player per entry: a player's staged cells go up as a single fields
  // hash, which is also what lets a Projection edit and a sibling input edit
  // submit together (see the header note on the PPR lock).
  _groupedEdits() {
    const byPlayer = new Map()
    for (const entry of this._pending.values()) {
      let fields = byPlayer.get(entry.playerId)
      if (!fields) {
        fields = {}
        byPlayer.set(entry.playerId, fields)
      }
      fields[entry.field] = entry.value
    }
    return Array.from(byPlayer, ([playerId, fields]) => ({ player_id: playerId, fields }))
  }

  _reconcile(data) {
    for (const row of data.applied ?? []) this._reconcileApplied(row)
    for (const row of data.rejected ?? []) this._reconcileRejected(row)

    const teams = data.refresh_teams ?? []
    if (teams.length > 0) this._markRefreshing((table) => teams.includes(table.dataset.team))
    this._announce(this._submittedMessage(data))
  }

  _reconcileApplied(row) {
    const key = this._key(row.player_id, row.field)
    const entry = this._pending.get(key)
    this._pending.delete(key)

    const input = this._inputFor(entry)
    if (!input) return

    input.classList.remove(this.pendingClass, this.rejectedClass)
    // The rejection reason is the only thing that ever puts a title on an
    // input (the baseline tooltip lives on the cell), so clearing it is safe.
    input.removeAttribute("title")
    this._applySaved(input, row.field, row)
    this._refreshDerived(input, row.field, row.player_id)
  }

  // A refused edit keeps its staged value and its place in the dirty map —
  // the admin decides whether to fix it or revert it — and is flagged so the
  // cell says which one it was.
  _reconcileRejected(row) {
    const input = this._inputFor(this._pending.get(this._key(row.player_id, row.field)))
    if (!input) return

    input.classList.add(this.rejectedClass)
    input.title = row.errors.join(" ")
  }

  _submittedMessage({ applied = [], rejected = [], refresh_teams: teams = [] }) {
    const saved = `Saved ${this._editLabel(applied.length)}`
    const recalculating = teams.length > 0 ? ` — ${teams.join(", ")} projections recalculating` : ""
    if (rejected.length === 0) return `${saved}${recalculating}`

    return `${saved}${recalculating}. ${this._editLabel(rejected.length)} rejected and still staged: ` +
      `${this._rejectionSummary(rejected)}`
  }

  // Distinct reasons rather than one line per cell: a whole team rejecting on
  // kickoff would otherwise read out the same sentence forty times.
  _rejectionSummary(rejected) {
    return Array.from(new Set(rejected.flatMap((row) => row.errors))).join(" ")
  }

  _stagedMessage(playerName, label, input, staged) {
    if (!staged) return `Reverted ${playerName} ${label}`
    return `Staged ${playerName} ${label}: ${this._display(input.value)} — submit to save`
  }

  _key(playerId, field) {
    return `${playerId}|${field}`
  }

  _inputFor(entry) {
    return entry ? document.getElementById(entry.id) : null
  }

  // Puts one cell back to its saved value and forgets the staged edit.
  _unstage(entry) {
    this._pending.delete(entry.key)
    const input = this._inputFor(entry)
    if (!input) return

    input.value = input.dataset.lastValue
    this._applyStaged(input, entry.field, null)
    this._refreshDerived(input, entry.field, entry.playerId)
  }

  // Re-applies staged edits over server HTML a refresh morph just rendered.
  // An input that no longer exists (the player left the filtered game) takes
  // its staged edit with it — there is nothing left to submit it against.
  _reapplyPending() {
    for (const entry of Array.from(this._pending.values())) {
      const input = this._inputFor(entry)
      if (!input) {
        this._pending.delete(entry.key)
        continue
      }
      input.value = entry.value
      this._applyStaged(input, entry.field, entry)
      this._refreshDerived(input, entry.field, entry.playerId)
    }
    this._syncPending()
  }

  // Optimistic styling for a cell: the same overridden/zeroed/lock treatment
  // a saved edit gets, plus the pending marker. `staged` null restores the
  // server truth the input still carries in its data attributes.
  _applyStaged(input, field, staged) {
    input.classList.toggle(this.pendingClass, Boolean(staged))
    input.classList.remove(this.rejectedClass)
    input.removeAttribute("title")
    const value = staged ? staged.value : input.dataset.lastValue

    if (field === "admin_injured") {
      input.closest("tr").classList.toggle(this.zeroedClass, value === "OUT")
      return
    }

    // Blank stages a CLEAR, which is not an override — only a value is.
    const overridden = staged ? value.trim() !== "" : input.dataset.override === "true"
    input.classList.toggle(this.overriddenClass, overridden)
    if (field === this.pprFieldValue) this._toggleInputLock(input, overridden)
  }

  // Everything a value change invalidates, in one call: the column sums, the
  // market tints against them, and the sidebar's rank.
  _refreshDerived(input, field, playerId) {
    this._refreshTotals(input, field)
    this._refreshMarket(input, field, playerId)
    this._notifySaved(input, field, playerId)
  }

  // The Submit button's own label is the pending count, so it is min-width'd
  // in CSS and the polite count line under it has its height pre-allocated —
  // neither may move the spreadsheet as the count changes.
  _syncPending() {
    const count = this._pending.size
    // Two copies of this button exist -- the page-level one and one per
    // team's caption, so an admin editing a team never has to scroll up to
    // submit. Stimulus's plural accessor keeps every copy in lockstep; each
    // element carries its own data-idle-label since dataset reads are
    // per-element.
    for (const button of this.submitButtonTargets) {
      button.disabled = count === 0
      button.textContent = count === 0 ? button.dataset.idleLabel : `Submit ${this._editLabel(count)}`
    }
    if (this.hasRevertButtonTarget) this.revertButtonTarget.disabled = count === 0
    if (this.hasPendingCountTarget) {
      this.pendingCountTarget.textContent = count === 0 ? "" : `${this._editLabel(count)} not submitted`
    }
  }

  _editLabel(count) {
    return `${count} ${count === 1 ? "edit" : "edits"}`
  }

  // Both buttons go down for the round trip either way; _syncPending brings
  // them back afterwards from the count that is left.
  _setSubmitting(inputs, submitting) {
    for (const button of this.submitButtonTargets) button.disabled = true
    if (this.hasRevertButtonTarget) this.revertButtonTarget.disabled = true
    for (const input of inputs) this._setSaving(input, submitting)
  }

  // Full-week recompute from the review page: fires the ECS batch run and
  // puts every team table into the recalculating state. The completion signal
  // is the same Turbo refresh broadcast as the per-team path.
  //
  // The button gets pending feedback the instant it's clicked, before the
  // fetch even starts — the ECS run_task call is a real AWS round trip (can
  // take a few seconds), and without this the button sits inert that whole
  // time, which reads as "did nothing." Success leaves it disabled: the
  // eventual Turbo refresh morph replaces this button with fresh server HTML
  // (never carrying the pending state), the same way REFRESHING_CLASS is
  // cleared on the team tables. Only the error path restores it manually,
  // since a failed kickoff means no morph is ever coming.
  async rerunAll(event) {
    event.preventDefault()
    await this._rerun({ button: event.submitter, team: null })
  }

  // Same run, scoped to one team via the ProjectionRunnerService FILTER_TEAM
  // override -- no navigation, no form, matching rerunAll's in-place UX
  // instead of the old new_nfl_projection_path form-and-redirect flow.
  async rerunTeam(event) {
    await this._rerun({ button: event.currentTarget, team: event.params.team })
  }

  async _rerun({ button, team }) {
    this._setRerunPending(button, true)
    this._announce(team ? `Starting projections run for ${team}…` : "Starting full projections run…")

    try {
      const response = await fetch(this.rerunUrlValue, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ season: this.seasonValue, week: this.weekValue, team, ...this._csrfParam() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.errors?.join(", ") || `rerun failed (${response.status})`)
      this._markRefreshing(team ? (table) => table.dataset.team === team : () => true)
      this._announce(
        team
          ? `Projections run started for ${team} — values will update when it finishes`
          : "Full projections run started — all values will update when it finishes",
      )
    } catch (error) {
      this._setRerunPending(button, false)
      this._announce(`Error starting projections run: ${error.message}`)
    }
  }

  _setRerunPending(button, pending) {
    if (!button) return
    button.disabled = pending
    if (pending) {
      button.dataset.originalText ??= button.textContent
      button.textContent = "Starting run…"
    } else if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText
    }
  }

  // Disables the matching team tables until recomputed projections arrive.
  // The Turbo refresh broadcast morphs the page from fresh server HTML, which
  // never carries the refreshing class — that morph IS the unlock.
  _markRefreshing(matches) {
    for (const table of this.teamTableTargets) {
      if (!matches(table)) continue
      table.classList.add(this.refreshingClass)
      for (const control of table.querySelectorAll(".proj-input, .proj-select")) {
        control.disabled = true
      }
    }
  }

  // Escape on a cell: back to the saved value, and the staged edit (if any)
  // goes with it.
  revert(event) {
    const { field, playerId } = event.params
    const key = this._key(playerId, field)
    this._unstage(this._pending.get(key) ?? { key, id: event.target.id, field, playerId })
    this._syncPending()
  }

  async _patch(url, fields) {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ season: this.seasonValue, week: this.weekValue, ...fields, ...this._csrfParam() }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.ok) {
      throw new Error(data.errors?.join(", ") || `submit failed (${response.status})`)
    }
    return data
  }

  // CloudFront's origin-request policy only forwards an explicit header
  // whitelist to Rails (ops/terraform/modules/cdn/main.tf) -- X-CSRF-Token
  // isn't on it, so a header-only token silently never arrives at the
  // origin and every request here 422s with InvalidAuthenticityToken
  // (confirmed live via a temporary diagnostic: origin/host/scheme all
  // matched, only the header was missing). Sending it as a body param
  // instead sidesteps the CDN policy entirely -- Rails' CSRF check reads
  // params[:authenticity_token] natively, same as any HTML form post.
  _csrfParam() {
    return { authenticity_token: document.querySelector('meta[name="csrf-token"]')?.content }
  }

  _applySaved(input, field, data) {
    if (field === "admin_injured") {
      input.closest("tr").classList.toggle(this.zeroedClass, data.value === "OUT")
    } else if (data.value === null) {
      // Override cleared — show the model value again.
      input.classList.remove(this.overriddenClass)
      delete input.dataset.override
      input.value = data.effective === null ? "" : this._display(data.effective)
    } else {
      input.classList.add(this.overriddenClass)
      input.dataset.override = "true"
    }
    input.dataset.lastValue = input.value

    if (field === this.pprFieldValue) this._toggleInputLock(input, data.value !== null)
  }

  // Every other numeric input in the row locks while Projection carries a
  // stored override — editing an input that no longer affects the displayed
  // outcome would be misleading.
  _toggleInputLock(pprInput, locked) {
    for (const sibling of pprInput.closest("tr").querySelectorAll(".proj-input")) {
      if (sibling === pprInput) continue
      sibling.disabled = locked
      sibling.closest("[data-column]")?.classList.toggle(this.pprLockedClass, locked)
    }
  }

  // Recompute the column sums an edit affects: one column for a numeric edit,
  // every column when the injury status changes (OUT zeroes the whole row).
  _refreshTotals(input, field) {
    const table = input.closest("table")
    if (!table) return

    for (const attr of this._affectedAttrs(table, input, field)) this._recalcColumn(table, attr)
  }

  // Columns an edit invalidates: the edited one for a numeric edit, every column
  // when the injury status changes (OUT zeroes the whole row).
  _affectedAttrs(table, input, field) {
    return field === "admin_injured"
      ? Array.from(table.querySelectorAll("tfoot [data-total-column]"), (cell) => cell.dataset.totalColumn)
      : [input.closest("[data-column]")?.dataset.column].filter(Boolean)
  }

  // A market cell compares the book's line against the player's projection, so
  // the same columns an edit invalidates for the totals it also re-decides here.
  _refreshMarket(input, field, playerId) {
    const table = input.closest("table")
    const marketRow = table?.querySelector(`[data-market-row="${playerId}"]`)
    if (!marketRow) return

    const playerRow = input.closest("tr")
    for (const attr of this._affectedAttrs(table, input, field)) {
      // [data-market-line] is what makes this safe with no special case: the
      // server omits that attribute on a line it refused to compare (a yes/no
      // threshold rather than a total), so those cells are simply not selected
      // and the client can never tint or count one the server would not.
      const cell = marketRow.querySelector(`[data-market-column="${attr}"][data-market-line]`)
      if (cell) this._markMarketEdge(cell, playerRow, attr)
    }
    this._refreshMarketCount(table)
  }

  _markMarketEdge(cell, playerRow, attr) {
    const projection = this._cellProjection(playerRow.querySelector(`[data-column="${attr}"]`))
    const line = Number.parseFloat(cell.dataset.marketLine)
    const edge = this._marketEdge(projection, line)

    for (const [name, className] of Object.entries(MARKET_EDGE_CLASSES)) {
      cell.classList.toggle(className, edge === name)
    }
    cell.title = this._marketTitle(cell, projection, line)
  }

  // Mirrors MarketRow#cell_title: the book/market/line half is stamped on the
  // cell, only our number and the gap change as the projection is edited.
  _marketTitle(cell, projection, line) {
    const summary = cell.dataset.marketTitle
    const gap = this._differenceLabel(projection, line)
    return gap ? `${summary} · proj ${this._display(projection)} (${gap})` : summary
  }

  _differenceLabel(projection, line) {
    const diff = this._relativeDiff(projection, line)
    if (diff === null) return null
    return `${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(1)}%`
  }

  // The count is read back off the rendered edge classes rather than recomputed
  // from the lines, so it can only ever agree with what the tints show — and
  // with the server's count, which is the same set.
  _refreshMarketCount(table) {
    const value = table.querySelector(`[data-market-count] ${SUMMARY_VALUE_SELECTOR}`)
    if (!value) return

    const selector = Object.values(MARKET_EDGE_CLASSES).map((name) => `.${name}`).join(", ")
    value.textContent = String(table.querySelectorAll(selector).length)
  }

  // The sidebar re-ranks off this; `projection` is the row's effective PPR
  // value, read the same way the totals read any other cell.
  _notifySaved(input, field, playerId) {
    const projection = this._cellValue(input.closest("tr").querySelector(`[data-column="${PPR_COLUMN}"]`))
    this.dispatch("saved", { detail: { playerId, field, projection } })
  }

  _recalcColumn(table, attr) {
    let teamTotal = 0
    for (const tbody of table.tBodies) {
      const subtotal = this._columnSum(tbody, attr)
      teamTotal += subtotal
      this._setTotal(tbody.querySelector(`[data-total-column="${attr}"]`), subtotal)
    }
    const teamCell = table.querySelector(`tfoot [data-total-column="${attr}"]`)
    this._setTotal(teamCell, teamTotal)
    this._markDeviation(teamCell, teamTotal)

    const summaryCell = table.querySelector(`[data-summary-column="${attr}"] ${SUMMARY_VALUE_SELECTOR}`)
    if (summaryCell) summaryCell.textContent = String(Math.round(teamTotal * 100) / 100)
    if (RECONCILIATION_ATTRS.has(attr)) this._updateReconciliationWarning(table)
  }

  // Reads the just-updated tfoot team totals for the four reconciliation
  // columns (already authoritative — _recalcColumn wrote them above) and
  // toggles the caption warning. Mirrors NumberFormat.reconciles?/discrepancy?
  // server-side: symmetric >10% relative deviation, no signal when either
  // side is exactly 0.
  _updateReconciliationWarning(table) {
    const passYds = this._teamTotalFor(table, "model_value_passing_yards")
    const recYds = this._teamTotalFor(table, "model_value_receiving_yards")
    const passTd = this._teamTotalFor(table, "pred_passing_tds")
    const recTd = this._teamTotalFor(table, "pred_receiving_tds")
    const mismatched = !this._reconciles(passYds, recYds) || !this._reconciles(passTd, recTd)

    table.querySelector(".proj-grid__summary-warning")
      ?.classList.toggle(RECONCILIATION_WARNING_CLASS, mismatched)
  }

  _teamTotalFor(table, attr) {
    const value = Number.parseFloat(table.querySelector(`tfoot [data-total-column="${attr}"]`)?.textContent)
    return Number.isNaN(value) ? 0 : value
  }

  _reconciles(left, right) {
    return !this._discrepancy(left, right) && !this._discrepancy(right, left)
  }

  // Both server rules this file mirrors — NumberFormat.discrepancy? (>10% off a
  // reference) and NumberFormat.market_edge (>20% off a line) — are the same
  // relative comparison at different thresholds, so they share one ratio here
  // and cannot drift apart. A missing, zero or unknown reference gives no
  // signal, and neither does a blank projection.
  _relativeDiff(value, reference) {
    if (!reference || value === null || value === undefined || Number.isNaN(value)) return null
    return value / reference - 1
  }

  _discrepancy(value, reference) {
    const diff = this._relativeDiff(value, reference)
    return diff !== null && Math.abs(diff) > DISCREPANCY_THRESHOLD
  }

  _marketEdge(projection, line) {
    const diff = this._relativeDiff(projection, line)
    if (diff === null) return null
    if (diff > EDGE_THRESHOLD) return "over"
    return diff < -EDGE_THRESHOLD ? "under" : null
  }

  _columnSum(tbody, attr) {
    let sum = 0
    for (const cell of tbody.querySelectorAll(`[data-column="${attr}"]`)) {
      sum += this._cellValue(cell)
    }
    return sum
  }

  // Effective value a cell contributes to sums: 0 for a row previewing the
  // pipeline's OUT zeroing, otherwise the input's current value (every
  // numeric cell, including a locked one, hosts an input). Blank counts as 0.
  _cellValue(cell) {
    return this._cellProjection(cell) ?? 0
  }

  // Same value as a projection rather than as a summand: a blank cell is "no
  // projection at all" (null), not zero, so it is compared against no market
  // line — matching the server, where effective() is nil and market_edge nil.
  // An OUT row is different: its zeroes are a real prediction, so a book line
  // against them is a genuine "under".
  _cellProjection(cell) {
    if (!cell) return null
    if (cell.parentElement.classList.contains(this.zeroedClass)) return 0
    const input = cell.querySelector("input")
    // A blank input with a model value behind it can only be a staged CLEAR:
    // the server always renders a model value into the cell, so a blank one
    // it rendered has no model value at all. Preview the value the clear is
    // about to restore rather than reading the blank as "no projection".
    const raw = input?.value?.trim() === "" ? input.dataset.modelValue : input?.value
    if (!raw || raw.trim() === "") return null
    const value = Number.parseFloat(raw)
    return Number.isNaN(value) ? null : value
  }

  _setTotal(cell, sum) {
    if (cell) cell.textContent = String(Math.round(sum * 100) / 100)
  }

  // >10% off the team-level model volume — same rule as the server-rendered
  // deviation tint (NumberFormat.discrepancy?).
  _markDeviation(cell, total) {
    if (!cell || cell.dataset.modelValue === undefined) return
    const model = Number.parseFloat(cell.dataset.modelValue)
    if (Number.isNaN(model) || model === 0) return
    cell.classList.toggle(this.deviationClass, this._discrepancy(total, model))
  }

  _setSaving(input, saving) {
    // Stay disabled when the whole table just entered the recalculating
    // state — the submit's finally block must not re-enable the edited cell.
    const refreshing = input.closest("table")?.classList.contains(this.refreshingClass)
    input.disabled = saving || Boolean(refreshing)
    input.classList.toggle(this.savingClass, saving)
  }

  _announce(message) {
    this.statusTarget.textContent = message
  }

  _display(value) {
    if (value === null || value === undefined || value === "") return "none"
    return typeof value === "number" ? Math.round(value * 100) / 100 : value
  }
}
