import { Controller } from "@hotwired/stimulus";

// Shrinks this element's own font-size, in whole pixels, until its text fits
// on one line within its current width -- for content whose length varies
// too much for a fixed/breakpoint-stepped font-size to reliably avoid
// wrapping or truncation (e.g. a player's full name). Requires the element
// to already be single-line via CSS (white-space: nowrap) with an ellipsis
// fallback below minSizeValue, in case even the floor doesn't fit.
export default class extends Controller {
  static values = { minSize: { type: Number, default: 10 } };

  connect() {
    this._handleResize = this._debounce(() => this.fit(), 100);
    window.addEventListener("resize", this._handleResize);
    this.fit();
    // Refit after the first paint settles: a fit measured mid-load (grid
    // tracks still sizing, flex containers not yet stretched) can see
    // transient overflow at every size and grind to the floor, and with
    // no resize event afterwards nothing would ever correct it. fit()
    // resets to the CSS size first, so a second pass fully recovers.
    requestAnimationFrame(() => requestAnimationFrame(() => this.fit()));
    // Refit once webfonts finish loading -- a fit measured against the
    // fallback font's metrics can be wrong in either direction once the
    // real font swaps in.
    document.fonts?.ready?.then(() => this.fit());
  }

  disconnect() {
    window.removeEventListener("resize", this._handleResize);
  }

  // Resets to the CSS-declared size first so this is safe to call
  // repeatedly (e.g. on resize, after previously shrinking) rather than
  // only ever shrinking further from whatever size it last landed on.
  fit() {
    this.element.style.fontSize = "";
    const maxSize = parseFloat(getComputedStyle(this.element).fontSize);

    let size = maxSize;
    while (this._overflows() && size > this.minSizeValue) {
      size -= 1;
      this.element.style.fontSize = `${size}px`;
    }
  }

  // An input's placeholder never contributes to scrollWidth, so briefly swap
  // it into the value and let the browser's own text layout report overflow
  // (canvas measureText reads a few px short of the real placeholder render).
  _overflows() {
    const { element } = this;
    if (element.placeholder === undefined) return this._textOverflows();
    if (element.value !== "") return element.scrollWidth > element.clientWidth;

    element.value = element.placeholder;
    const overflows = element.scrollWidth > element.clientWidth;
    element.value = "";
    return overflows;
  }

  // Fractional-width overflow check for text elements. scrollWidth and
  // clientWidth are integer-rounded CSS pixels, so a box that "fits" by
  // equal rounded values (77 == 77) can still hide sub-pixel overflow the
  // browser renders as an ellipsis. Range + getBoundingClientRect measure
  // both sides fractionally (and consistently under ancestor transforms,
  // which scale both rects by the same factor).
  _textOverflows() {
    const { element } = this;
    const range = document.createRange();
    range.selectNodeContents(element);
    const contentWidth = range.getBoundingClientRect().width;
    const style = getComputedStyle(element);
    const available =
      element.getBoundingClientRect().width -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight) -
      parseFloat(style.borderLeftWidth) -
      parseFloat(style.borderRightWidth);
    return contentWidth - available > 0.1;
  }

  _debounce(fn, waitMs) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), waitMs);
    };
  }
}
