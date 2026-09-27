import { Controller } from "@hotwired/stimulus"

// Drives the single shared admin edit dialog rendered by
// Components::NFL::DepthCharts::OverrideDialog (one per page, not one per
// player). Each player's edit button (EditButton) fires `open` with its own
// player id/name and the field's current override + scraped values as
// Stimulus action params; this controller populates the dialog from those
// params before showing it.
//
// The dialog lives inside the "depth-chart-page" Turbo Stream replace
// target, so a successful save/revert closes it for free: the whole subtree
// (dialog included) is swapped for a fresh, closed one. No submit handling
// is needed here beyond populating fields before the browser submits.
//
// This controller is declared on the "depth-chart-page" wrapper (see
// Components::NFL::DepthCharts::ChartBody), not on the <dialog> itself —
// the per-player edit buttons that trigger `open` live elsewhere in that
// same subtree, and Stimulus resolves an action's controller by walking up
// from the clicked element, so the controller must be an ancestor of both
// the buttons and the dialog. The dialog itself is just the "dialog" target.
export default class extends Controller {
  static targets = [
    "dialog",
    "playerId",
    "title",
    "flagsOverride",
    "flagRookie",
    "flagQuestionable",
    "flagOut",
    "flagsScraped",
    "depthRank",
    "depthRankDefault",
    "depthPosition",
    "depthPositionDefault",
  ]

  open(event) {
    const p = event.params

    this.titleTarget.textContent = `Edit ${p.playerName}`
    this.playerIdTarget.value = p.playerId

    // A normal open always means "Save submits these badges as the override" —
    // reset the hidden flag in case a previous "Reset to scraped" in this same
    // dialog instance cleared it (the dialog element is reused across players).
    this.flagsOverrideTarget.value = "1"
    this._setFlags(p.flags, p.flagsScraped)
    this._setSelect(this.depthRankTarget, this.depthRankDefaultTarget, p.depthRank, p.depthRankScraped)
    this._setSelect(this.depthPositionTarget, this.depthPositionDefaultTarget, p.depthPosition, p.depthPositionScraped)

    this.dialogTarget.showModal()
  }

  close() {
    this.dialogTarget.close()
  }

  // "Reset to scraped": clear every field and blank the hidden flags_override
  // signal (the one thing that distinguishes this from a normal Save with
  // every badge unchecked) so the submit reverts the whole row at once, then
  // let this submit button's default action proceed (no preventDefault) so
  // the browser submits the now-blank form.
  resetAndSubmit() {
    this.depthRankTarget.value = ""
    this.depthPositionTarget.value = ""

    this.flagsOverrideTarget.value = ""
    this.flagRookieTarget.checked = false
    this.flagQuestionableTarget.checked = false
    this.flagOutTarget.checked = false
  }

  // effectiveValue is a comma-joined token string of the badges currently in
  // effect for this player, whether from an existing override or the
  // scraped computation ("rookie,out", or "" for none) — always a real
  // string, since Save now always submits the checked state as-is.
  _setFlags(effectiveValue, scrapedLabel) {
    const active = new Set(effectiveValue.split(",").filter(Boolean))

    this.flagRookieTarget.checked = active.has("rookie")
    this.flagQuestionableTarget.checked = active.has("questionable")
    this.flagOutTarget.checked = active.has("out")
    this.flagsScrapedTarget.textContent = scrapedLabel
  }

  _setSelect(select, defaultOption, overrideValue, scrapedValue) {
    defaultOption.textContent = `Scraped default (${scrapedValue || "none"})`
    select.value = overrideValue || ""
  }
}
