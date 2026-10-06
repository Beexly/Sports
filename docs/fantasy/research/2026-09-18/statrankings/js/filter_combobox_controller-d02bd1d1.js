import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

export default class extends Controller {
  static targets = ["baseline", "trigger", "panel", "option", "selectedName", "select"]
  static classes = ["hidden", "active"]
  static values = {
    name: String,
    turboFrame: String,
    keepAllParam: Boolean,
  }

  connect() {
    // The native baseline is hidden and the styled trigger revealed via CSS
    // (html.js scoped rules in filter_combobox.scss), so no class swapping is
    // needed here. We just wire up event listeners.
    this._outsideClick = this._onOutsideClick.bind(this)
    this._closeAll = this._onCloseAll.bind(this)
    document.addEventListener("click", this._outsideClick)
    document.addEventListener("filter-combobox:close", this._closeAll)
  }

  disconnect() {
    document.removeEventListener("click", this._outsideClick)
    document.removeEventListener("filter-combobox:close", this._closeAll)
  }

  // ── Public actions ───────────────────────────────────────────────────────

  toggle(event) {
    event.preventDefault()
    event.stopPropagation()

    if (this._isOpen()) {
      this._close()
    } else {
      this._open()
    }
  }

  select(event) {
    event.preventDefault()
    this._selectOption(event.currentTarget)
  }

  // Handles native <select> change on mobile / no-JS-enhancement path.
  // Syncs the styled widget's display state then navigates.
  selectNative(event) {
    const select = event.currentTarget
    const value = select.value
    const label = select.options[select.selectedIndex]?.text ?? value

    dispatchAnalytics("filter_change", {
      filter_name: this.nameValue,
      filter_value: value,
    })

    if (this.hasSelectedNameTarget) {
      this.selectedNameTarget.textContent = label
    }

    this._visitWith(this.nameValue, value)
  }

  keydown(event) {
    if (!this._isOpen()) return

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        this._moveActive(1)
        break
      case "ArrowUp":
        event.preventDefault()
        this._moveActive(-1)
        break
      case "Home":
        event.preventDefault()
        this._setActiveIndex(0)
        break
      case "End":
        event.preventDefault()
        this._setActiveIndex(this._visibleOptions().length - 1)
        break
      case "Enter":
        event.preventDefault()
        this._confirmActive()
        break
      case "Escape":
        event.preventDefault()
        this._close()
        this.triggerTarget.focus()
        break
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _open() {
    document.dispatchEvent(
      new CustomEvent("filter-combobox:close", { detail: { except: this.element } }),
    )

    this.panelTarget.classList.remove(this.hiddenClass)
    this.triggerTarget.setAttribute("aria-expanded", "true")

    this._activeIndex = -1
    this._updateActiveDescendant()
  }

  _close() {
    this.panelTarget.classList.add(this.hiddenClass)
    this.triggerTarget.setAttribute("aria-expanded", "false")
    this._setActive(null)
  }

  _isOpen() {
    return !this.panelTarget.classList.contains(this.hiddenClass)
  }

  _visibleOptions() {
    return this.optionTargets.filter(o => !o.hidden)
  }

  _moveActive(delta) {
    const options = this._visibleOptions()
    if (!options.length) return

    const current = this._activeIndex ?? -1
    const next = (current + delta + options.length) % options.length
    this._setActiveIndex(next)
  }

  _setActiveIndex(index) {
    const options = this._visibleOptions()
    if (!options.length) return

    const clamped = Math.max(0, Math.min(index, options.length - 1))
    this._activeIndex = clamped
    this._setActive(options[clamped])
  }

  _setActive(option) {
    this.optionTargets.forEach(o => {
      o.classList.remove(this.activeClass)
      o.setAttribute("aria-selected", "false")
    })

    if (option) {
      option.classList.add(this.activeClass)
      option.setAttribute("aria-selected", "true")
      this._updateActiveDescendant(option)
    } else {
      this._updateActiveDescendant(null)
    }
  }

  _updateActiveDescendant(option = null) {
    if (option) {
      this.triggerTarget.setAttribute("aria-activedescendant", option.id)
    } else {
      this.triggerTarget.removeAttribute("aria-activedescendant")
    }
  }

  _confirmActive() {
    const options = this._visibleOptions()
    const active = this._activeIndex >= 0 ? options[this._activeIndex] : null
    if (active) {
      this._selectOption(active)
    }
  }

  _selectOption(option) {
    const value = option.dataset.value
    const label = option.dataset.triggerLabel || option.textContent.trim()

    dispatchAnalytics("filter_change", {
      filter_name: this.nameValue,
      filter_value: value,
    })

    this.selectedNameTarget.textContent = label

    // Keep the native <select> in sync
    if (this.hasSelectTarget) {
      this.selectTarget.value = value
    }

    this._close()
    this._visitWith(this.nameValue, value)
  }

  _visitWith(param, value) {
    // An option carrying a path names a page rather than a filter state, the
    // way a UI::Pills pill does: Fantasy Rankings puts position in the address,
    // so selecting one is a visit and not a param merge.
    const path = this._pathFor(value)
    if (path) {
      this._visit(path)
      return
    }

    const url = new URL(window.location.href)

    const clearsFilter = value === "" || value == null || (value === "all" && !this.keepAllParamValue)
    if (clearsFilter) {
      url.searchParams.delete(param)
    } else {
      url.searchParams.set(param, value)
    }

    this._visit(url.toString())
  }

  _pathFor(value) {
    const option = this.element.querySelector(`[data-value="${CSS.escape(String(value ?? ""))}"][data-path]`)

    return option ? option.dataset.path : null
  }

  _visit(target) {
    const turbo = window.Turbo

    if (!turbo) {
      window.location.assign(target)
      return
    }

    const frame = this.turboFrameValue
    if (frame) {
      turbo.visit(target, { frame })
    } else {
      turbo.visit(target)
    }
  }

  _onOutsideClick(event) {
    if (this.element.contains(event.target)) return
    if (this._isOpen()) this._close()
  }

  _onCloseAll(event) {
    if (event.detail?.except === this.element) return
    if (this._isOpen()) this._close()
  }
}
