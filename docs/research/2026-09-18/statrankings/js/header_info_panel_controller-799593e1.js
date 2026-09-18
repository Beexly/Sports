import { Controller } from "@hotwired/stimulus"

// Toggles the mobile embedded info panel (Components::UI::StatsContent::HeaderCard
// #render_info_panel) open/closed via a real click-toggle on the trigger icon,
// rather than CSS :hover -- :hover is touch-simulated on mobile and only clears
// when tapping a different element, not the trigger itself, so a pure-CSS
// :hover toggle can't close on a second tap of its own trigger. Scoped to
// .header-container (the closest ancestor containing both the trigger and the
// panel, which are DOM siblings rather than nested) since Stimulus targets must
// be descendants of the controller element.
export default class extends Controller {
  static targets = ["trigger", "panel"]

  toggle() {
    const open = this.panelTarget.classList.toggle("is-open")
    this.triggerTarget.setAttribute("aria-expanded", open)
  }
}
