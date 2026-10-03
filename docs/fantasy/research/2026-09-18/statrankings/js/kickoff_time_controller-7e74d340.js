import { Controller } from "@hotwired/stimulus"

// The board's kickoff stamp: "Tue 8:15 PM" in the viewer's own timezone.
// A sibling of local_time_controller with a weekday-plus-time format instead
// of the full date -- the week filter already bounds the board to one week,
// so the weekday alone places the game and the full date is noise at this
// size. The server renders the same shape in Eastern time as the no-JS
// fallback (BoardTableRow#matchup_meta).
export default class extends Controller {
  connect() {
    const raw = this.element.getAttribute("datetime")
    if (!raw) return

    const date = new Date(raw)
    if (isNaN(date)) return

    this.element.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  }
}
