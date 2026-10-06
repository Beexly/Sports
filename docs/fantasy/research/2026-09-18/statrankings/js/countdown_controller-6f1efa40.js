import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { end: String }

  #interval

  connect() {
    this.#tick()
    this.#interval = setInterval(() => this.#tick(), 1000)
  }

  disconnect() {
    clearInterval(this.#interval)
  }

  #tick() {
    const end = new Date(this.endValue)
    const now = new Date()
    const diff = Math.max(0, end - now)
    const totalSeconds = Math.floor(diff / 1000)

    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const isDesktop = window.matchMedia("(min-width: 921px)").matches

    if (isDesktop) {
      this.element.textContent = `${days}d : ${String(hours).padStart(2, "0")}h : ${String(minutes).padStart(2, "0")}m : ${String(seconds).padStart(2, "0")}s`
    } else {
      this.element.textContent = `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`
    }
  }
}
