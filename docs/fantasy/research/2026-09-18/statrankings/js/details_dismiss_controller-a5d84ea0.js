import { Controller } from "@hotwired/stimulus";
import { restoreValueAfterMorph } from "restore_value_after_morph";

// Closes a native <details> dropdown when the visitor moves on: a
// pointer press anywhere outside it, or scrolling the page. A normal
// absolutely-positioned dropdown scrolls away with its trigger, but the
// freshness panel's phone layout is a position: fixed viewport sheet
// (live_odds.scss) -- without this it sits over the board through any
// amount of scrolling, until the next Turbo refresh happens to replace
// it.
//
// The open state also survives the live boards' refresh morphs: the
// server never renders `open`, so idiomorph strips the attribute and
// snapped the panel shut mid-read, every few seconds on a busy board.
// The element itself can't be data-turbo-permanent the way Customize+
// is -- a freshness panel exists to show fresh server data -- so the
// open state is snapshotted before the morph and restored after it
// instead, while the content underneath updates normally.
//
// Listeners are only attached while the panel is open, and the scroll
// listener rides the window without capture, so scrolling INSIDE the
// panel (its own overflow-y: auto) never closes it -- element scroll
// events don't bubble to the window.
//
// `close` is also an action, for the explicit collapse button each
// panel carries at its head: a visitor who has scrolled the book list
// to its end shouldn't have to hunt for the trigger (or scroll the
// page) to put the panel away.
export default class extends Controller {
  // scroll: false keeps the panel open through page scrolling (outside
  // presses still close it) -- the Customize+ editor opts out, since a
  // touch drag that the browser turns into a scroll would otherwise
  // close the panel mid-interaction.
  static values = { scroll: { type: Boolean, default: true } }

  connect() {
    this._onToggle = () => (this.element.open ? this._arm() : this._disarm());
    this.element.addEventListener("toggle", this._onToggle);
    if (this.element.open) this._arm();
    // Restoring `open` fires the native toggle event, so the dismiss
    // listeners re-arm through the same path a real click takes -- no
    // separate apply step needed.
    this._stopRestoring = restoreValueAfterMorph(
      this.element,
      () => this.element.open,
      (open) => (this.element.open = open),
      () => {},
    );
  }

  disconnect() {
    this._stopRestoring();
    this._disarm();
    this.element.removeEventListener("toggle", this._onToggle);
  }

  _arm() {
    if (this._armed) return;
    this._armed = true;
    this._onPointerDown = (event) => {
      if (!this.element.contains(event.target)) this._close();
    };
    document.addEventListener("pointerdown", this._onPointerDown);
    if (!this.scrollValue) return;
    this._onScroll = () => this._close();
    window.addEventListener("scroll", this._onScroll);
  }

  _disarm() {
    if (!this._armed) return;
    this._armed = false;
    document.removeEventListener("pointerdown", this._onPointerDown);
    if (this._onScroll) window.removeEventListener("scroll", this._onScroll);
  }

  close() {
    this._close();
  }

  _close() {
    this.element.open = false;
  }
}
