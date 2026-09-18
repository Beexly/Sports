import { Controller } from "@hotwired/stimulus"

// Drives the NFL Stats Archive dataset builder: chip selection state (seasons,
// weeks, playoff rounds, playoff seasons, categories), the live build-bar
// summary, the terms-confirm flow, and the per-category schema dialog.
//
// Selection state lives in aria-pressed on the chip buttons — the server
// renders the default selection (all categories, current season, all weeks)
// and this controller only toggles attributes, so styling stays in CSS
// attribute selectors and no class names are hardcoded here.
//
// Gated mode (data-archive-builder-gated-value="true"): every selection
// action instead opens the unlock dialog. The catalog stays browsable; the
// build bar carries pricing and the unlock CTA.
export default class extends Controller {
  static targets = [
    "seasonChip", "allSeasons",
    "weekChip", "allWeeks", "weeksBox", "weeksPanel",
    "roundChip", "allRounds", "postseasonBox", "postseasonPanel",
    "pastPlayoffsChip", "currentPlayoffsChip", "allPastPlayoffs",
    "categoryToggle", "selectAll",
    "summary", "agreeToggle", "buildButton",
    "schemaDialog", "schemaLead", "schemaRest", "schemaPlus", "schemaEarliest", "schemaPlayerRow",
    "termsDialog", "unlockDialog",
    "buildDialog", "statusFrame",
  ]

  static values = {
    gated: Boolean,
    categoryCount: Number,
    currentWeek: Number,
  }

  // ── Seasons ──

  toggleSeason(event) {
    if (this.gate()) return
    this.flip(event.currentTarget)
    this.refresh()
  }

  toggleAllSeasons() {
    if (this.gate()) return
    const allOn = this.seasonChipTargets.every((chip) => this.pressed(chip))
    this.seasonChipTargets.forEach((chip) => {
      this.press(chip, allOn ? chip.dataset.current === "true" : true)
    })
    this.refresh()
  }

  // ── Current-season weeks ──

  toggleWeeks(event) {
    this.toggleDisclosure(event.currentTarget, this.weeksPanelTarget)
  }

  toggleWeek(event) {
    if (this.gate()) return
    const chip = event.currentTarget
    if (chip.dataset.noData === "true") return
    this.flip(chip)
    const available = this.availableWeekChips()
    const selected = available.filter((c) => this.pressed(c))
    // An empty or complete manual selection collapses back to "All weeks".
    if (selected.length === 0 || selected.length === available.length) this.selectAllWeeks()
    else this.press(this.allWeeksTarget, false)
    this.refresh()
  }

  toggleAllWeeks() {
    if (this.gate()) return
    this.selectAllWeeks()
    this.refresh()
  }

  // ── Current-season postseason rounds ──

  togglePostseason(event) {
    this.toggleDisclosure(event.currentTarget, this.postseasonPanelTarget)
  }

  toggleRound(event) {
    if (this.gate()) return
    const chip = event.currentTarget
    if (chip.dataset.noData === "true") return
    this.flip(chip)
    this.syncAllChip(this.allRoundsTarget, this.availableRoundChips())
    this.refresh()
  }

  toggleAllRounds() {
    if (this.gate()) return
    const available = this.availableRoundChips()
    if (available.length === 0) return
    const allOn = available.every((chip) => this.pressed(chip))
    available.forEach((chip) => this.press(chip, !allOn))
    this.press(this.allRoundsTarget, !allOn)
    this.refresh()
  }

  // ── Playoff seasons ──

  togglePastPlayoffs(event) {
    if (this.gate()) return
    this.flip(event.currentTarget)
    this.syncAllChip(this.allPastPlayoffsTarget, this.pastPlayoffsChipTargets)
    this.refresh()
  }

  toggleCurrentPlayoffs(event) {
    if (this.gate()) return
    this.flip(event.currentTarget)
    this.refresh()
  }

  toggleAllPastPlayoffs() {
    if (this.gate()) return
    const allOn = this.pastPlayoffsChipTargets.every((chip) => this.pressed(chip))
    this.pastPlayoffsChipTargets.forEach((chip) => this.press(chip, !allOn))
    this.press(this.allPastPlayoffsTarget, !allOn)
    this.refresh()
  }

  // ── Categories ──

  toggleCategory(event) {
    if (this.gate()) return
    this.flip(event.currentTarget)
    this.syncAllChip(this.selectAllTarget, this.categoryToggleTargets)
    this.refresh()
  }

  toggleAllCategories() {
    if (this.gate()) return
    const allOn = this.categoryToggleTargets.every((chip) => this.pressed(chip))
    this.categoryToggleTargets.forEach((chip) => this.press(chip, !allOn))
    this.press(this.selectAllTarget, !allOn)
    this.refresh()
  }

  // ── Terms confirm ──

  toggleAgree() {
    if (this.gate()) return
    if (this.pressed(this.agreeToggleTarget)) {
      this.press(this.agreeToggleTarget, false)
      this.refresh()
    } else {
      this.termsDialogTarget.showModal()
    }
  }

  confirmTerms() {
    this.press(this.agreeToggleTarget, true)
    this.termsDialogTarget.close()
    this.refresh()
  }

  // ── Dialogs ──

  openSchema(event) {
    const { nameLead, nameRest, namePlus, entity, earliest } = event.currentTarget.dataset
    this.schemaLeadTarget.textContent = nameLead
    this.schemaRestTarget.textContent = nameRest || ""
    this.schemaPlusTarget.textContent = namePlus === "true" ? "+" : ""
    this.schemaEarliestTarget.textContent = earliest
      ? `Available from the ${earliest} season.`
      : "No data has landed for this category yet."
    this.schemaPlayerRowTargets.forEach((row) => { row.hidden = entity !== "player" })
    this.schemaDialogTarget.showModal()
  }

  openUnlock() {
    this.unlockDialogTarget.showModal()
  }

  // ── Build ──

  // Fills the build form's hidden inputs from the current selection just
  // before Turbo serializes it, then opens the progress dialog so its
  // placeholder is visible the instant the request goes out.
  prepareBuild(event) {
    const form = event.target
    form.querySelectorAll("[data-archive-param]").forEach((input) => input.remove())

    // Bare `[]` (no index) is required here, not `[N]` — Rack's nested-query
    // parser only groups repeated field names into one array-of-hashes when
    // it sees the same key (registry) recur, starting a new hash each time;
    // explicit numeric indices parse as a hash keyed by "0"/"1"/... instead,
    // which fails the array(hash) schema check the download endpoint expects.
    this.selectedCategories().forEach(({ registry, category }) => {
      this.appendParam(form, "archive_download[categories][][registry]", registry)
      this.appendParam(form, "archive_download[categories][][category]", category)
    })
    this.selectedSeasons().forEach((season) => this.appendParam(form, "archive_download[seasons][]", season))
    this.selectedSeasonTypes().forEach((type) => this.appendParam(form, "archive_download[season_types][]", type))
    this.appendParam(form, "archive_download[terms_accepted]", this.pressed(this.agreeToggleTarget))

    this.buildDialogTarget.showModal()
  }

  // Only the frame's content (not the <turbo-frame> tag's own attributes) is
  // replaced on each load, so state/url live on the inner .archive-status
  // div the server re-renders every time, not on the frame element itself.
  statusFrameLoaded() {
    clearTimeout(this.pollTimeout)
    const frame = this.statusFrameTarget
    const status = frame.querySelector(".archive-status")
    if (!status || status.dataset.state === "completed" || status.dataset.state === "failed") return

    this.pollTimeout = setTimeout(() => { frame.src = status.dataset.url }, 1500)
  }

  stopPolling() {
    clearTimeout(this.pollTimeout)
  }

  // ── Internals ──

  gate() {
    if (!this.gatedValue) return false
    this.openUnlock()
    return true
  }

  pressed(el) {
    return el.getAttribute("aria-pressed") === "true"
  }

  press(el, on) {
    el.setAttribute("aria-pressed", String(on))
  }

  flip(el) {
    this.press(el, !this.pressed(el))
  }

  toggleDisclosure(button, panel) {
    const open = button.getAttribute("aria-expanded") === "true"
    button.setAttribute("aria-expanded", String(!open))
    panel.hidden = open
  }

  syncAllChip(allChip, chips) {
    this.press(allChip, chips.length > 0 && chips.every((chip) => this.pressed(chip)))
  }

  selectAllWeeks() {
    this.availableWeekChips().forEach((chip) => this.press(chip, true))
    this.press(this.allWeeksTarget, true)
  }

  availableWeekChips() {
    return this.weekChipTargets.filter((chip) => chip.dataset.noData !== "true")
  }

  availableRoundChips() {
    return this.roundChipTargets.filter((chip) => chip.dataset.noData !== "true")
  }

  currentSeasonSelected() {
    return this.seasonChipTargets.some((chip) => chip.dataset.current === "true" && this.pressed(chip))
  }

  appendParam(form, name, value) {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = name
    input.value = value
    input.dataset.archiveParam = "true"
    form.append(input)
  }

  selectedCategories() {
    return this.categoryToggleTargets
      .filter((chip) => this.pressed(chip))
      .map((chip) => ({ registry: chip.dataset.registry, category: chip.dataset.category }))
  }

  // Downloads are whole-season files, so a season contributes once it has
  // any regular-season or postseason selection — the week/round chips
  // within it are informational, matching how refresh()'s fileCount already
  // counts one file per selected season regardless of which weeks show.
  selectedSeasons() {
    const seasons = new Set()
    this.seasonChipTargets.filter((chip) => this.pressed(chip)).forEach((chip) => seasons.add(chip.dataset.season))
    this.pastPlayoffsChipTargets
      .filter((chip) => this.pressed(chip))
      .forEach((chip) => seasons.add(chip.dataset.season))
    if (this.hasCurrentPlayoffsChipTarget && this.pressed(this.currentPlayoffsChipTarget)) {
      const current = this.seasonChipTargets.find((chip) => chip.dataset.current === "true")
      if (current) seasons.add(current.dataset.season)
    }
    return Array.from(seasons)
  }

  selectedSeasonTypes() {
    const types = new Set()
    if (this.seasonChipTargets.some((chip) => this.pressed(chip))) types.add("REG")

    const currentRoundSelected = this.currentSeasonSelected() && this.availableRoundChips().some((chip) => this.pressed(chip))
    const pastPlayoffSelected = this.pastPlayoffsChipTargets.some((chip) => this.pressed(chip))
    const currentPlayoffSelected = this.hasCurrentPlayoffsChipTarget && this.pressed(this.currentPlayoffsChipTarget)
    if (currentRoundSelected || pastPlayoffSelected || currentPlayoffSelected) types.add("POST")

    return Array.from(types)
  }

  refresh() {
    const currentOn = this.currentSeasonSelected()
    this.weeksBoxTarget.hidden = !currentOn
    this.postseasonBoxTarget.hidden = !currentOn
    if (this.hasSummaryTarget) this.summaryTarget.textContent = this.summaryText(currentOn)
    if (this.hasBuildButtonTarget) {
      const ready = this.pressed(this.agreeToggleTarget) && this.fileCount(currentOn) > 0
      this.buildButtonTarget.disabled = !ready
    }
  }

  summaryText(currentOn) {
    const categories = this.categoryToggleTargets.filter((chip) => this.pressed(chip)).length
    const seasons = this.seasonChipTargets.filter((chip) => this.pressed(chip))
    const parts = [this.categoriesPart(categories), this.seasonsPart(seasons)]

    const availableWeeks = this.availableWeekChips()
    const selectedWeeks = availableWeeks.filter((chip) => this.pressed(chip)).length
    if (currentOn && !this.pressed(this.allWeeksTarget)) {
      parts.push(`${selectedWeeks} of ${availableWeeks.length} weeks`)
    }

    const rounds = this.availableRoundChips().filter((chip) => this.pressed(chip)).length
    if (currentOn && rounds > 0) parts.push(`${rounds} playoff ${rounds === 1 ? "round" : "rounds"}`)

    const playoffSeasons = this.playoffSeasonCount()
    if (playoffSeasons > 0) parts.push(`${playoffSeasons} playoff ${playoffSeasons === 1 ? "season" : "seasons"}`)

    const files = this.fileCount(currentOn)
    parts.push(`${files} ${files === 1 ? "file" : "files"}`)
    return parts.join(" · ")
  }

  categoriesPart(count) {
    if (count === this.categoryCountValue) return "All categories"
    return `${count} ${count === 1 ? "category" : "categories"}`
  }

  seasonsPart(selected) {
    if (selected.length === this.seasonChipTargets.length) return "All seasons"
    if (selected.length === 1) {
      return selected[0].dataset.current === "true" ? "Current season" : `${selected[0].dataset.season} season`
    }
    return `${selected.length} seasons`
  }

  playoffSeasonCount() {
    const past = this.pastPlayoffsChipTargets.filter((chip) => this.pressed(chip)).length
    const current = this.hasCurrentPlayoffsChipTarget && this.pressed(this.currentPlayoffsChipTarget) ? 1 : 0
    return past + current
  }

  // One file per category per selected season, plus one postseason file per
  // category when any current-season round is selected, plus one per category
  // per selected playoff season.
  fileCount(currentOn) {
    const categories = this.categoryToggleTargets.filter((chip) => this.pressed(chip)).length
    const seasons = this.seasonChipTargets.filter((chip) => this.pressed(chip)).length
    const rounds = this.availableRoundChips().filter((chip) => this.pressed(chip)).length
    const postseason = (currentOn && rounds > 0 ? 1 : 0) + this.playoffSeasonCount()
    return categories * (seasons + postseason)
  }
}
