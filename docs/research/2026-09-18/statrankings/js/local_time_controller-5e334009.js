import { Controller } from "@hotwired/stimulus"
import { formatLocalDateTime } from "format_local_time"

// Replaces a <time datetime="..."> element's text content with the date/time
// formatted in the user's local timezone using the browser's built-in
// Intl.DateTimeFormat API.
//
// The server renders the element with an ISO 8601 datetime attribute and a
// UTC-based text fallback. On connect, this controller replaces that text so
// every user sees their own timezone with no server-side configuration needed.
export default class extends Controller {
  connect() {
    const raw = this.element.getAttribute("datetime")
    if (!raw) return

    const date = new Date(raw)
    if (isNaN(date)) return

    this.element.textContent = formatLocalDateTime(date)
  }
}
