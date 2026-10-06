import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

const MIN_QUERY_LENGTH = 3
const REMOTE_MIN_QUERY_LENGTH = 2
const MAX_PER_SPORT = 6
// Short debounce: the endpoint answers from an in-memory cache in ~20ms, so
// this only coalesces rapid keystrokes rather than protecting a slow query.
const DEBOUNCE_MS = 150
const DEFAULT_SPORT = "NFL"

// Fixed, ordered list of overlay result sections. Each section is rendered only
// when it has matching entries, but the order here is always preserved:
//   NFL stat-player, NFL stat-team, NFL players,
//   NBA stat-player, NBA stat-team, NBA players,
//   CFB stat-player, CFB stat-team.
// The "kind" selects which bucket a section draws from (stat items filtered by
// stat_type, or remotely fetched players). CFB has no player section: there are
// no CFB player pages yet, so /search/players never returns CFB players.
const SECTIONS = [
  { sport: "NFL", kind: "stats-player" },
  { sport: "NFL", kind: "stats-team" },
  { sport: "NFL", kind: "player" },
  { sport: "NBA", kind: "stats-player" },
  { sport: "NBA", kind: "stats-team" },
  { sport: "NBA", kind: "player" },
  { sport: "CFB", kind: "stats-player" },
  { sport: "CFB", kind: "stats-team" },
]

// Every `UI::StatSearchBar` instance on a page (mobile navbar, desktop navbar,
// sidebar) shares this one JSON data island instead of each carrying its own
// copy of the (large) stat list -- see `Stats::StatSearchIndex`.
const ITEMS_ELEMENT_ID = "stat-search-items"

export default class extends Controller {
  static targets = ["input", "results", "statIcon", "loading"]
  static values = { playersUrl: String, searchStats: { type: Boolean, default: true } }
  static classes = ["sport", "empty", "open", "bodyLock"]

  connect() {
    // With stat search off (navbar player-only mode), an empty item list makes
    // every stat/menu section come up empty, so only player sections render.
    this.items = this.searchStatsValue ? this.parseItems() : []
    this.statMatches = []
    this.fetchedPlayers = []
    this.searchTimeout = null
    this.abortController = null
    this.highlightQuery = ""
  }

  disconnect() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout)
    if (this.abortController) this.abortController.abort()
    if (this.hasBodyLockClass) document.body.classList.remove(this.bodyLockClass)
  }

  // ── Overlay (mobile command palette) ──

  open() {
    if (this.hasOpenClass) this.element.classList.add(this.openClass)
    if (this.hasBodyLockClass) document.body.classList.add(this.bodyLockClass)
    requestAnimationFrame(() => this.inputTarget.focus())
  }

  closeOverlay() {
    if (this.hasOpenClass) this.element.classList.remove(this.openClass)
    if (this.hasBodyLockClass) document.body.classList.remove(this.bodyLockClass)
    this.inputTarget.value = ""
    this.resetRemote()
    this.hideResults()
    this.inputTarget.blur()
  }

  // ── Search entry point ──

  search() {
    if (this.hasPlayersUrlValue) {
      this.unifiedSearch()
    } else {
      this.statOnlySearch()
    }
  }

  close() {
    this.hideResults()
  }

  closeOnBlur() {
    setTimeout(() => {
      if (!this.element.contains(document.activeElement)) {
        this.hideResults()
      }
    }, 0)
  }

  // ── Stat-pages-only search (sidebar inline) ──

  statOnlySearch() {
    const query = this.inputTarget.value.trim().toLowerCase()

    if (query.length < MIN_QUERY_LENGTH) {
      this.hideResults()
      return
    }

    const matches = this.matchStats(query)
    const grouped = this.groupBySport(matches)
    const total = matches.length

    dispatchAnalytics("stat_search", {
      search_term: this.inputTarget.value.trim(),
      results_count: total,
    })

    this.resultsTarget.replaceChildren()

    if (total === 0) {
      this.resultsTarget.append(this.emptyStateItem())
      this.resultsTarget.hidden = false
      return
    }

    this.appendStatGroups(grouped)
    this.resultsTarget.hidden = false
  }

  // ── Unified search (overlay: stat pages + players + teams) ──

  unifiedSearch() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout)

    const query = this.inputTarget.value.trim()

    if (query.length < REMOTE_MIN_QUERY_LENGTH) {
      this.resetRemote()
      this.hideResults()
      return
    }

    // Stat-page filtering stays client-side and instant. The previous fetch's
    // players are narrowed to the new query rather than cleared, so matching
    // rows stay on screen (no blink) while the authoritative fetch is in
    // flight — every row shown always matches the current query text.
    const term = query.toLowerCase()
    this.statMatches = this.matchStats(term)
    this.fetchedPlayers = this.fetchedPlayers.filter((player) =>
      (player.name || "").toLowerCase().includes(term)
    )

    this.renderUnified(query, { final: false })

    this.searchTimeout = setTimeout(() => this.fetchRemote(query), DEBOUNCE_MS)
  }

  async fetchRemote(query) {
    if (this.abortController) this.abortController.abort()
    this.abortController = new AbortController()

    // The spinner reflects only the remote /search/players request, never the
    // instant client-side stat filter.
    this.showLoading()

    try {
      const response = await fetch(
        `${this.playersUrlValue}?q=${encodeURIComponent(query)}`,
        { signal: this.abortController.signal }
      )
      const data = await response.json()
      this.fetchedPlayers = data.players || []
      this.renderUnified(query, { final: true })
      this.hideLoading()
    } catch (error) {
      // An AbortError means a newer request is already in flight (rapid typing),
      // so leave the spinner alone — that fetch owns it and will clear it.
      if (error.name !== "AbortError") {
        this.fetchedPlayers = []
        this.renderUnified(query, { final: true })
        this.hideLoading()
      }
    }
  }

  showLoading() {
    if (this.hasLoadingTarget) this.loadingTarget.hidden = false
  }

  hideLoading() {
    if (this.hasLoadingTarget) this.loadingTarget.hidden = true
  }

  renderUnified(query, { final }) {
    this.resultsTarget.replaceChildren()
    this.highlightQuery = query.trim()

    // Sections render in the fixed SECTIONS order. Each is only appended when it
    // has matching entries, so empty sections (and empty section headers) never
    // appear. Real team-name search results are not part of SECTIONS and are
    // never surfaced.
    let total = 0
    for (const section of SECTIONS) {
      total += this.appendSection(section)
    }
    total += this.appendMenuSection()

    if (final) {
      dispatchAnalytics("stat_search", { search_term: query, results_count: total })
    }

    if (total === 0) {
      // The empty state only appears once the remote fetch has resolved, so
      // it reflects both stat-page matches and fetched players/teams.
      if (final) {
        this.resultsTarget.append(this.emptyStateItem())
        this.resultsTarget.hidden = false
      } else {
        this.hideResults()
      }
      return
    }

    this.resultsTarget.hidden = false
  }

  // ── Rendering helpers ──

  matchStats(query) {
    if (query.length < MIN_QUERY_LENGTH) return []

    return this.items.filter((item) => this.searchText(item).includes(query))
  }

  appendStatGroups(grouped) {
    let count = 0

    for (const [sport, items] of grouped) {
      if (sport) this.resultsTarget.append(this.labelItem(sport))
      for (const item of items.slice(0, MAX_PER_SPORT)) {
        this.resultsTarget.append(this.resultItem(item))
      }
      count += items.length
    }

    return count
  }

  // Renders a single fixed section and returns the number of matched entries.
  // Empty sections render nothing (no header), preserving the "omit empty
  // sections" behaviour.
  appendSection({ sport, kind }) {
    const { entries, label, buildItem } = this.sectionData(sport, kind)

    if (entries.length === 0) return 0

    this.resultsTarget.append(this.labelItem(label))
    for (const entry of entries.slice(0, MAX_PER_SPORT)) {
      this.resultsTarget.append(buildItem(entry))
    }

    return entries.length
  }

  // General navigation items (Nav::Menus: StatBuilder+, Fantasy Rankings,
  // CoverageIQ, CFB, DFS, etc.) carry no sport or stat_type, so they fall
  // outside the fixed SECTIONS grid. They render — without a header — after the
  // stat/player sections, preserving the pre-STAT-1076 overlay behaviour where
  // sport-less menu matches appeared at the end of the results. Returns the
  // number of menu entries rendered.
  appendMenuSection() {
    const entries = this.statMatches.filter((item) => !item.stat_type)

    if (entries.length === 0) return 0

    for (const entry of entries.slice(0, MAX_PER_SPORT)) {
      this.resultsTarget.append(this.statItem(entry))
    }

    return entries.length
  }

  // Resolves the entries, header label, and row builder for a section. Stat
  // sections read "SPORT stats | player" / "SPORT stats | team"; fetched-player
  // sections read "SPORT | Player".
  sectionData(sport, kind) {
    switch (kind) {
      case "stats-player":
        return {
          entries: this.statEntries(sport, "player"),
          label: `${sport} stats | player`,
          buildItem: (entry) => this.statItem(entry),
        }
      case "stats-team":
        return {
          entries: this.statEntries(sport, "team"),
          label: `${sport} stats | team`,
          buildItem: (entry) => this.statItem(entry),
        }
      default:
        return {
          entries: this.entriesBySport(this.fetchedPlayers, sport),
          label: `${sport} | Player`,
          buildItem: (entry) => this.playerItem(entry),
        }
    }
  }

  statEntries(sport, statType) {
    return this.statMatches.filter(
      (item) => (item.sport || DEFAULT_SPORT) === sport && item.stat_type === statType
    )
  }

  entriesBySport(entries, sport) {
    return entries.filter((entry) => (entry.sport || DEFAULT_SPORT) === sport)
  }

  parseItems() {
    const source = document.getElementById(ITEMS_ELEMENT_ID)

    try {
      return JSON.parse(source?.textContent || "[]")
    } catch {
      return []
    }
  }

  // Match against the stat name only. Including the category or sport here
  // surfaced results with no visible (highlighted) match — e.g. "sco" matching
  // "Field Goals" via its "Scoring" category — which read as noise.
  searchText(item) {
    return (item.name || "").toLowerCase()
  }

  groupBySport(matches, defaultSport = "") {
    const map = new Map()

    for (const item of matches) {
      const key = item.sport || defaultSport
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }

    return map
  }

  labelItem(text) {
    const li = document.createElement("li")
    li.className = this.sportClass
    li.textContent = text
    return li
  }

  emptyStateItem() {
    const li = document.createElement("li")
    li.className = this.emptyClass
    li.textContent = `No results found matching '${this.inputTarget.value.trim()}'`
    return li
  }

  resultItem(item) {
    const li = document.createElement("li")
    const link = document.createElement("a")

    link.href = item.path
    link.textContent = item.name

    if (item.item_class) {
      li.classList.add(item.item_class)
      link.classList.add(item.item_class)
    }

    li.append(link)
    return li
  }

  // Stat result: chart icon + name (single line).
  statItem(item) {
    const li = document.createElement("li")
    const link = this.resultLink(item.path)

    if (item.item_class) {
      li.classList.add(item.item_class)
      link.classList.add(item.item_class)
    }

    link.append(this.statIconBox(), this.resultBody(item.name))
    li.append(link)
    return li
  }

  // Player result: team logo (avatar placeholder fallback) + name with the
  // team as a subtitle.
  playerItem(player) {
    const li = document.createElement("li")
    const link = this.resultLink(player.path)

    link.append(this.playerLeading(player), this.resultBody(player.name, player.team))
    li.append(link)
    return li
  }

  // Leading icon for a player row: the server-rendered team logo when present,
  // otherwise the first-letter avatar placeholder.
  playerLeading(player) {
    return player.team_logo_html ? this.logoBox(player.team_logo_html) : this.avatarBox(player.name)
  }

  // player.team_logo_html is server-rendered, trusted markup (an inline SVG or
  // fallback span). It is injected raw; no user-derived field is involved.
  logoBox(logoHtml) {
    const box = document.createElement("span")
    box.className = "stat-search-result__icon stat-search-result__logo"
    box.innerHTML = logoHtml
    return box
  }

  resultLink(href) {
    const link = document.createElement("a")
    link.href = href
    link.className = "stat-search-result"
    return link
  }

  resultBody(name, meta) {
    const body = document.createElement("span")
    body.className = "stat-search-result__body"

    const nameEl = document.createElement("span")
    nameEl.className = "stat-search-result__name"
    this.appendHighlighted(nameEl, name)
    body.append(nameEl)

    if (meta) {
      const metaEl = document.createElement("span")
      metaEl.className = "stat-search-result__meta"
      metaEl.textContent = meta
      body.append(metaEl)
    }

    return body
  }

  // Appends the name to the element, wrapping every case-insensitive match of
  // the current query in a highlight span. Built from text nodes (never
  // innerHTML) so result names can't inject markup.
  appendHighlighted(el, text) {
    const query = this.highlightQuery || ""
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()

    if (!query || !lowerText.includes(lowerQuery)) {
      el.append(document.createTextNode(text))
      return
    }

    let index = 0
    let match = lowerText.indexOf(lowerQuery)

    while (match !== -1) {
      if (match > index) el.append(document.createTextNode(text.slice(index, match)))

      const mark = document.createElement("span")
      mark.className = "stat-search-highlight"
      mark.textContent = text.slice(match, match + query.length)
      el.append(mark)

      index = match + query.length
      match = lowerText.indexOf(lowerQuery, index)
    }

    if (index < text.length) el.append(document.createTextNode(text.slice(index)))
  }

  statIconBox() {
    const box = document.createElement("span")
    box.className = "stat-search-result__icon"
    if (this.hasStatIconTarget) box.innerHTML = this.statIconTarget.innerHTML
    return box
  }

  avatarBox(name) {
    const box = document.createElement("span")
    box.className = "stat-search-result__icon stat-search-result__avatar"
    box.textContent = (name || "").trim().charAt(0).toUpperCase()
    return box
  }

  resetRemote() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout)
    if (this.abortController) this.abortController.abort()
    this.statMatches = []
    this.fetchedPlayers = []
    this.hideLoading()
  }

  hideResults() {
    this.resultsTarget.hidden = true
    this.resultsTarget.replaceChildren()
  }
}
