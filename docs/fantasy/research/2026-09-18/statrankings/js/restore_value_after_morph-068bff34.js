// Keeps a Stimulus value attribute intact across Turbo's page-refresh morph.
//
// data-turbo-permanent only protects an element's own subtree from being
// touched by idiomorph's diffing -- it does nothing for a controller value
// that lives on a DIFFERENT (non-permanent) ancestor, which is exactly the
// odds-format/price-filter shape: the toggle buttons could be marked
// permanent, but the value driving them (data-odds-format-format-value /
// data-price-filter-sign-value) lives on the wrapper that also contains the
// board table, which can never be made permanent since it needs fresh
// server data on every refresh.
//
// Whether the server renders the value attribute or not, a broadcast morph
// resets it to the server's idea (strips it when absent from the incoming
// HTML, rewrites it when the server renders a default -- which the odds
// boards now do, so first paint can show the right pressed button). Either
// way the visitor's client-only choice is gone after the morph.
//
// This restores the value after the morph instead: snapshot it right before
// the wrapper element morphs, and if it came back different (i.e. got reset),
// write the snapshot back.
//
// Restoring the attribute is NOT enough to fix the buttons, though -- that's
// what `apply` is for. Stimulus's value observer batches DOM mutations and
// compares the attribute's final value against the last one it recorded, so
// the morph's server-value write and this restore cancel out inside one
// batch: net change nothing, valueChanged never fires. Meanwhile idiomorph
// has separately rewritten the toggle BUTTONS' aria-pressed from the
// server's HTML (the server presses its default), leaving the control
// claiming a format the board is not in. Confirmed live on the deployed
// OddsBoard: board showing American prices under a pressed Cents button
// after every refresh morph. So after every morph -- restored or not, since
// the buttons get clobbered even when the value never drifted -- `apply`
// re-syncs the dependent UI from the (correct) current value, exactly what
// the controller's own valueChanged callback would have done.
//
// The restore listens on the DOCUMENT for turbo:morph, not on the element for
// turbo:morph-element, and the difference is the whole bug this used to have.
// The per-element event fires before the element's own descendants are morphed
// (the same fact market_search_controller.js documents). So restoring there
// put the value back, Stimulus queued its valueChanged callback -- and then
// idiomorph reached the toggle buttons inside and reset their aria-pressed
// from the server's HTML. The board's numbers followed the restored value
// while the buttons showed the server default, so the control claimed a format
// the page was not in. Worse, Stimulus's value callback is asynchronous, so it
// sometimes landed after the buttons were morphed and sometimes before --
// which is why the same board would sometimes reset only the buttons and
// sometimes reset everything. turbo:morph fires once, after the entire page
// has morphed, so nothing can overwrite the restore afterwards.
//
// The snapshot stays on the element's own before-event: that fires while the
// value is still the visitor's, which is exactly what needs capturing.
export function restoreValueAfterMorph(element, get, set, apply) {
  let snapshot

  function onBeforeMorph(event) {
    if (event.target === element) snapshot = get()
  }

  function onMorph() {
    if (snapshot === undefined) return
    if (get() !== snapshot) set(snapshot)
    apply()
  }

  element.addEventListener("turbo:before-morph-element", onBeforeMorph)
  document.addEventListener("turbo:morph", onMorph)

  return () => {
    element.removeEventListener("turbo:before-morph-element", onBeforeMorph)
    document.removeEventListener("turbo:morph", onMorph)
  }
}
