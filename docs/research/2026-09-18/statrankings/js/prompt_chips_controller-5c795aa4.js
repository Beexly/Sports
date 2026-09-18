import { Controller } from "@hotwired/stimulus"

// Lets the ask-section prompt chips drive the chat demo, and keeps the
// chips' "live" styling synced to it in both directions:
//
// - Tapping a chip that carries a scene index restarts the demo phone at
//   that scene, per the design's "Tap a prompt above to change the
//   conversation."
// - The ai-chat-demo controller (the centre phone) dispatches
//   `ai-chat-demo:scene` whenever its scene changes -- on auto-advance and
//   on a chip-triggered jump alike -- and `sync` toggles the active class
//   on every chip (the marquee duplicates the list) whose scene index
//   matches. The two static-phone chips are marked always-active and never
//   get toggled off.
export default class extends Controller {
  static targets = ["chip"]
  static classes = ["active"]

  pick(event) {
    const index = Number(event.currentTarget.dataset.sceneIndex)
    if (Number.isNaN(index)) return

    const demoElement = this.element.querySelector('[data-controller~="ai-chat-demo"]')
    if (!demoElement) return

    const demo = this.application.getControllerForElementAndIdentifier(demoElement, "ai-chat-demo")
    if (demo) demo.showScene(index)
  }

  sync(event) {
    const index = event.detail.index

    this.chipTargets.forEach((chip) => {
      if (chip.dataset.alwaysActive === "true") return

      chip.classList.toggle(this.activeClass, Number(chip.dataset.sceneIndex) === index)
    })
  }
}
