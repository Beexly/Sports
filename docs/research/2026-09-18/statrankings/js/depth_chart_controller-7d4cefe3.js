import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

// State-driven depth-chart controller.
//
// Depth Chart / Fantasy / Prop Betting are separate routes now (not
// client-side panels), so the client state left here is: view (roster /
// field) — which selects the roster table or the formation field — and,
// within the formation view, each unit's personnel package.
//
// The unit (offense / defense / special) is NOT panel state — all three
// units stay SSR'd together and switching is a same-page hash scroll. The
// unit-tab chrome (active class + aria-current) does reflect location.hash
// via _syncUnitTabs, so the selected tab matches the anchor. The
// roster/field view preference is written to sessionStorage whenever it
// changes and restored on connect, so Formation survives Offense ↔ Defense ↔
// Special Teams navigations in the same tab.
//
// ── ?view= / ?personnel= History API sync (non-crawlable on this page) ───
// On the Depth Chart page both are client-only convenience state, synced via
// history.replaceState (never pushState, so toggling doesn't spam the back
// stack) so a copied URL can restore the toggle. On-page view/package controls
// stay <button>s — never <a href="?..."> here — and these params are never part
// of the canonical or sitemap. Fantasy/Props mobile chrome may SSR one
// Formation deeplink (`?view=formation` + unit hash) into this page; that
// target still self-canonicalizes to the bare team URL. The formationsEnabled
// value (data-depth-chart-formations-enabled-value, set from the
// nfl_depth_chart_formations flag) gates whether that deeplink — or a
// sessionStorage preference from when the flag was on — is honored; off
// forces "roster" regardless of either.
//   - "view": the URL uses the SEO-facing term "formation"; internally the
//     panel/dataset key has always been "field" (see _urlViewParam /
//     _internalView below for the one place that mapping lives). "roster" is
//     the default, so it's omitted from the URL entirely to keep share links
//     clean; "field"/"formation" is written whenever selected.
//   - "personnel": a package key from packages.yml (e.g. "11", "nickel").
//     Because each unit (offense/defense/special) has its own package track
//     with its own default, there's no single cross-unit "default" value to
//     omit — whatever package was last clicked (in any unit) is written.
//     On connect, that value is applied to every unit whose track has a
//     matching key; units without a match keep their own SSR default.
//
// Visibility is hierarchical: hiding a parent panel hides its descendants via
// CSS. The unit-tab / view-switch / Key control row lives inside the
// depth-chart page only, so this controller is never mounted on the
// Fantasy/Prop Betting pages.
//
// On mobile the formation grid is intrinsically ~984px wide. CSS zoom/`cqw`
// proved unreliable across embedders (e.g. Responsively), so _fitFields()
// measures the panel and scales each visible .dc-field to fit.
//
// All CSS class strings come from Ruby via data-depth-chart-active-class
// (STYLE.md pattern); none are hard-coded here.
export default class extends Controller {
  static targets = [
    "viewPanel",
    "packagePanel",
    "packageButton",
    "viewButton",
    "unitTab",
  ]

  static classes = ["active", "packageActive", "unitActive"]
  static values = { formationsEnabled: Boolean }

  // sessionStorage key for the roster/field preference. Scoped to this feature
  // so it can't collide with other pages' keys.
  static VIEW_STORAGE_KEY = "nfl-depth-chart-view"

  // ── Lifecycle ────────────────────────────────────────────────────────────

  connect() {
    this._onResize = () => this._fitFields()
    window.addEventListener("resize", this._onResize)

    // Formation is gated by the nfl_depth_chart_formations flag (same on
    // every device — no mobile-specific behavior). When the flag is off,
    // DepthChartControls renders no switch to reach it, so a stored or
    // deep-linked (?view=formation) field view is ignored and roster is
    // forced regardless.
    const params = new URLSearchParams(window.location.search)
    this.view = this.formationsEnabledValue
      ? this._internalView(params.get("view")) || this._storedView() || "roster"
      : "roster"
    this.refresh()

    this._applyPersonnelParam(params.get("personnel"))

    this._onHashChange = () => this._syncUnitTabs()
    window.addEventListener("hashchange", this._onHashChange)
    this._syncUnitTabs()
  }

  disconnect() {
    window.removeEventListener("resize", this._onResize)
    window.removeEventListener("hashchange", this._onHashChange)
  }

  // ── State selectors ──────────────────────────────────────────────────────

  selectView(event) {
    this.view = event.params.view
    this._persistView()
    this.refresh()
    this._syncViewParam()
    dispatchAnalytics("depth_chart_view_select", { view: this.view })
  }

  // ── Package switch (11 Personnel / 12 Personnel / etc.) ─────────────────

  // Scoped to the clicked button's own unit (its closest .dc-field-chart
  // root — offense/defense/special each render one), not every package
  // panel/button on the page — see class comment (Task 2 review fix).
  selectPackage(event) {
    // Stimulus typecasts numeric params ("11" -> 11), but panel.dataset.package
    // and button dataset values are strings; coerce back so the comparisons in
    // the loop and _syncButtons match instead of hiding every package panel.
    const pkg = String(event.params.package)
    const root = event.currentTarget.closest(".dc-field-chart")
    if (!root) return

    this._activatePackage(root, pkg)
    this._scheduleFitFields()
    this._syncPersonnelParam(pkg)
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  // Projects the current view onto every view panel and button. Safe when
  // targets are missing: each loop simply iterates an empty list.
  refresh() {
    this._showMatching(this.viewPanelTargets, "view", this.view)

    this._syncButtons(this.viewButtonTargets, "depthChartViewParam", this.view)
    this._scheduleFitFields()
  }

  // Read the last roster/field choice from sessionStorage. Returns null when
  // missing, invalid, or storage is unavailable (private mode, etc.).
  _storedView() {
    try {
      const value = sessionStorage.getItem(this.constructor.VIEW_STORAGE_KEY)
      return value === "roster" || value === "field" ? value : null
    } catch {
      return null
    }
  }

  // Persist the current roster/field choice so unit navigations restore it.
  _persistView() {
    try {
      sessionStorage.setItem(this.constructor.VIEW_STORAGE_KEY, this.view)
    } catch {
      // Ignore quota / private-mode failures — the page still works, just
      // without cross-unit view memory for this tab.
    }
  }

  // ?view= <-> internal panel/dataset key. The only mapping in either
  // direction lives here: "formation" (URL) <-> "field" (internal, unchanged
  // to avoid touching every existing data-view="field" attribute). Anything
  // else (missing param, unrecognized value) returns null so callers fall
  // back to the stored/default view.
  _internalView(urlValue) {
    if (urlValue === "formation") return "field"
    if (urlValue === "roster") return "roster"
    return null
  }

  // Inverse of _internalView. "roster" is the default and is omitted from
  // the URL entirely (see _syncViewParam), so only "field" maps to anything.
  _urlViewParam(internalValue) {
    return internalValue === "field" ? "formation" : null
  }

  // Writes the current view to ?view=, omitting the key when at the default
  // ("roster") so share links stay clean. history.replaceState (not
  // pushState) keeps the existing path + hash and avoids back-stack spam.
  _syncViewParam() {
    const url = new URL(window.location.href)
    const urlValue = this._urlViewParam(this.view)

    if (urlValue) {
      url.searchParams.set("view", urlValue)
    } else {
      url.searchParams.delete("view")
    }

    history.replaceState(history.state, "", url.toString())
  }

  // Writes the clicked package key to ?personnel=. There is no single
  // cross-unit default to omit against (each unit's package track has its
  // own default — see class comment), so any selection is written as-is.
  _syncPersonnelParam(pkg) {
    const url = new URL(window.location.href)
    url.searchParams.set("personnel", pkg)
    history.replaceState(history.state, "", url.toString())
  }

  // Applies a ?personnel= value (read on connect) to every unit whose
  // package track has a matching key; units without that key (e.g. a
  // "12"-only URL applied while :special only has "units") keep their own
  // SSR default untouched.
  _applyPersonnelParam(pkg) {
    if (!pkg) return

    for (const root of this._packageRoots()) {
      const hasMatch = this._packageButtonsIn(root).some((btn) => btn.dataset.depthChartPackageParam === pkg)
      if (hasMatch) this._activatePackage(root, pkg)
    }

    this._scheduleFitFields()
  }

  // Shows the matching package panel and syncs button active state, scoped
  // to a single unit's .dc-field-chart root — never every package
  // panel/button on the page (Task 2 review fix: this used to be global).
  _activatePackage(root, pkg) {
    for (const panel of this._packagePanelsIn(root)) {
      panel.hidden = panel.dataset.package !== pkg
    }

    this._syncButtons(this._packageButtonsIn(root), "depthChartPackageParam", pkg, this.packageActiveClass)
  }

  // Every unit's package-toolbar root (offense/defense/special each render
  // one .dc-field-chart), derived from the packageButton targets so the
  // scoping stays on the Stimulus Targets API rather than a raw querySelector
  // reaching outside it.
  _packageRoots() {
    const roots = this.packageButtonTargets.map((button) => button.closest(".dc-field-chart"))
    return new Set(roots.filter(Boolean))
  }

  _packagePanelsIn(root) {
    return this.packagePanelTargets.filter((panel) => panel.closest(".dc-field-chart") === root)
  }

  _packageButtonsIn(root) {
    return this.packageButtonTargets.filter((button) => button.closest(".dc-field-chart") === root)
  }

  // Hides every panel whose data-<key> attribute does not equal value.
  _showMatching(panels, key, value) {
    for (const panel of panels) {
      panel.hidden = panel.dataset[key] !== value
    }
  }

  // Flips the active class + aria-pressed on a button group from its param.
  // Package buttons carry a different active class than the view page
  // controls, so the class is a parameter (defaulting to the page-controls one).
  _syncButtons(buttons, paramKey, value, activeClass = this.activeClass) {
    for (const btn of buttons) {
      const active = btn.dataset[paramKey] === value
      btn.classList.toggle(activeClass, active)
      btn.setAttribute("aria-pressed", String(active))
    }
  }

  // Mirrors location.hash onto the unit-tab chrome. Unknown / leftover hashes
  // (e.g. #team-slug) fall back to #offense so a tab stays selected. Native
  // <a href="#…"> handles the hash write and scroll — this only updates class
  // + aria-current.
  _syncUnitTabs() {
    const hash = window.location.hash
    const known = this.unitTabTargets.some((tab) => tab.getAttribute("href") === hash)
    const activeHash = known ? hash : "#offense"

    for (const tab of this.unitTabTargets) {
      const active = tab.getAttribute("href") === activeHash
      tab.classList.toggle(this.unitActiveClass, active)
      if (active) {
        tab.setAttribute("aria-current", "true")
      } else {
        tab.removeAttribute("aria-current")
      }
    }
  }

  // Wait a frame so un-hidden field panels have a real layout box before we
  // measure them (hidden panels report 0 width).
  _scheduleFitFields() {
    requestAnimationFrame(() => this._fitFields())
  }

  // Scale each visible mobile formation grid so its intrinsic ~984px width fits
  // the panel. Prefer CSS zoom (affects layout); fall back to transform: scale
  // when zoom is unsupported. Zoom still reports the unscaled scrollWidth, so
  // overflow is forced to hidden after a successful fit to kill the leftover
  // scrollbar.
  _fitFields() {
    const desktop = window.matchMedia("(width >= 768px)").matches

    for (const field of this.element.querySelectorAll(".dc-field")) {
      field.style.zoom = ""
      field.style.transform = ""
      field.style.transformOrigin = ""
      field.style.marginBottom = ""
      field.style.overflowX = ""

      if (desktop || !this._isVisible(field)) continue

      const parent = field.parentElement
      if (!parent) continue

      const available = parent.clientWidth
      const natural = field.scrollWidth
      if (available <= 0 || natural <= available) continue

      const scale = available / natural

      if (typeof CSS !== "undefined" && CSS.supports("zoom", "0.5")) {
        field.style.zoom = String(scale)
      } else {
        field.style.transformOrigin = "top left"
        field.style.transform = `scale(${scale})`
        field.style.marginBottom = `${(scale - 1) * field.offsetHeight}px`
      }

      field.style.overflowX = "hidden"
    }
  }

  // True when the element and every ancestor up to this.element is shown.
  _isVisible(element) {
    let node = element

    while (node && node !== this.element) {
      if (node.hidden) return false

      const style = getComputedStyle(node)
      if (style.display === "none" || style.visibility === "hidden") return false

      node = node.parentElement
    }

    return true
  }
}
