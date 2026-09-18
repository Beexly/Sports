import { Controller } from "@hotwired/stimulus"

// Animates the /ai landing chat demo through its server-rendered scenes:
// type the question, show the "querying" row, reveal the answer table,
// hold, then advance to the next scene. The first scene ships fully
// revealed, so no-JS visitors — and reduced-motion visitors, for whom this
// controller does nothing — still see one complete example.
const TYPE_MS = 34
const THINK_MS = 900
const HOLD_MS = 4200

export default class extends Controller {
  static targets = ["scene", "logo", "question", "caret", "thinking", "answer", "hostLabel"]
  static classes = ["hidden"]

  connect() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    this.timers = []
    this.startScene(0)
  }

  disconnect() {
    this.clearTimers()
  }

  // Jump straight to a scene (the homepage prompt chips call this through
  // their own controller). Restarts the cycle from there.
  showScene(index) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (!this.sceneTargets[index]) return

    this.clearTimers()
    this.startScene(index)
  }

  startScene(index) {
    this.dispatch("scene", { detail: { index } })
    this.sceneTargets.forEach((scene, i) => scene.classList.toggle(this.hiddenClass, i !== index))
    this.logoTargets.forEach((logo, i) => logo.classList.toggle(this.hiddenClass, i !== index))
    // Composer host labels ("Reply to Claude") ride along with the logo;
    // the /ai panel renders none, so this is a no-op there.
    this.hostLabelTargets.forEach((label, i) => label.classList.toggle(this.hiddenClass, i !== index))
    this.thinkingTargets[index].classList.add(this.hiddenClass)
    this.answerTargets[index].classList.add(this.hiddenClass)
    this.caretTargets[index].classList.remove(this.hiddenClass)
    this.typeQuestion(index)
  }

  typeQuestion(index) {
    const question = this.sceneTargets[index].dataset.question
    const target = this.questionTargets[index]
    target.textContent = ""
    let length = 0
    const typer = setInterval(() => {
      length += 1
      target.textContent = question.slice(0, length)
      if (length >= question.length) {
        clearInterval(typer)
        this.showThinking(index)
      }
    }, TYPE_MS)
    this.timers.push(typer)
  }

  showThinking(index) {
    this.thinkingTargets[index].classList.remove(this.hiddenClass)
    this.timers.push(setTimeout(() => this.showAnswer(index), THINK_MS))
  }

  showAnswer(index) {
    this.caretTargets[index].classList.add(this.hiddenClass)
    this.thinkingTargets[index].classList.add(this.hiddenClass)
    this.answerTargets[index].classList.remove(this.hiddenClass)
    const next = (index + 1) % this.sceneTargets.length
    this.timers.push(setTimeout(() => this.startScene(next), HOLD_MS))
  }

  clearTimers() {
    for (const timer of this.timers || []) {
      clearTimeout(timer)
      clearInterval(timer)
    }
    this.timers = []
  }
}
