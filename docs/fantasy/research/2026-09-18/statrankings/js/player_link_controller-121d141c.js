import { Controller } from "@hotwired/stimulus"

const DEBOUNCE_MS = 300

/**
 * Generic admin player-linking controller shared by ADP Links and Futures Links.
 * For each unlinked row, provides a debounced search input that queries a player
 * search endpoint, displays matching results in a dropdown, and populates a
 * hidden player_id field when a result is selected.
 */
export default class extends Controller {
  static targets = ["input", "results", "playerId", "playerDisplay", "selectionRow", "teamLogo"]
  static classes = ["noResults", "result"]
  static values = { url: String }

  connect() {
    this.searchTimeout = null
  }

  disconnect() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout)
  }

  search() {
    const query = this.inputTarget.value.trim()
    if (query.length < 2) {
      this.resultsTarget.innerHTML = ""
      this.resultsTarget.hidden = true
      return
    }

    if (this.searchTimeout) clearTimeout(this.searchTimeout)

    this.searchTimeout = setTimeout(async () => {
      const response = await fetch(`${this.urlValue}?q=${encodeURIComponent(query)}`)
      const players = await response.json()
      this.renderResults(players)
    }, DEBOUNCE_MS)
  }

  renderResults(players) {
    if (players.length === 0) {
      this.resultsTarget.innerHTML = `<div class="${this.noResultsClass}">No players found</div>`
      this.resultsTarget.hidden = false
      return
    }

    this.resultsTarget.innerHTML = players
      .map(
        (p) =>
          `<button type="button" class="${this.resultClass}" data-action="player-link#select" data-id="${this.escapeHtml(String(p.id))}" data-name="${this.escapeHtml(p.name)}" data-position="${this.escapeHtml(p.position || "")}" data-team="${this.escapeHtml(p.team || "")}">${this.escapeHtml(p.name)} — ${this.escapeHtml(p.position || "?")} — ${this.escapeHtml(p.team || "FA")}</button>`,
      )
      .join("")
    this.resultsTarget.hidden = false
  }

  select(event) {
    const btn = event.currentTarget
    this.playerIdTarget.value = btn.dataset.id
    this.playerDisplayTarget.textContent = `${btn.dataset.name} · ${btn.dataset.position || "?"} · ${btn.dataset.team || "FA"}`
    this.inputTarget.value = ""
    this.resultsTarget.innerHTML = ""
    this.resultsTarget.hidden = true

    if (this.hasTeamLogoTarget) {
      const team = (btn.dataset.team || "FA").toUpperCase()
      this.teamLogoTarget.textContent = team
    }

    if (this.hasSelectionRowTarget) {
      this.selectionRowTarget.hidden = false
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;")
  }
}
