// Tap-to-show for the CSS hover tooltips (.logo-tooltip, tables.scss):
// team logos and abbreviation codes carry their full name in a
// hover-revealed bubble, which a touch screen can never hover. A tap on
// one toggles the same bubble via the logo-tooltip--open class; tapping
// it again, or anywhere else, dismisses it, and only one stays open at
// a time.
//
// Touch (and pen) pointers only -- a mouse already hovers, and letting
// clicks pin the bubble open on desktop would double up with the hover
// reveal. Tooltips inside a link are left alone entirely: a linked logo's
// tap must stay a navigation (UI::PlayerLink wraps its logos this way),
// and intercepting it to show a name would break the link on exactly the
// devices this exists for.
//
// One delegated document listener rather than per-element wiring: the
// spans are scattered across every stats table, both odds boards, and
// the PM+ matchup cells, and new ones arrive with every refresh morph --
// delegation covers them all with nothing to attach or re-attach.
const OPEN_CLASS = "logo-tooltip--open"

function closeAll(except) {
  document.querySelectorAll(`.${OPEN_CLASS}`).forEach((el) => {
    if (el !== except) el.classList.remove(OPEN_CLASS)
  })
}

document.addEventListener("pointerup", (event) => {
  const tooltip = event.target.closest?.(".logo-tooltip")
  const touch = event.pointerType === "touch" || event.pointerType === "pen"

  if (tooltip && touch && !tooltip.closest("a")) {
    const open = tooltip.classList.contains(OPEN_CLASS)
    closeAll(tooltip)
    tooltip.classList.toggle(OPEN_CLASS, !open)
  } else {
    closeAll()
  }
})
