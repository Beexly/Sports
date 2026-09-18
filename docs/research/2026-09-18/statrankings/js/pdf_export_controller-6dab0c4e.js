import { Controller } from "@hotwired/stimulus";

// Opens the printable rankings sheet and hands it to the browser's own print
// dialog, where "Save as PDF" produces the file. The sheet is a real server
// rendered URL, so the document that prints is built from the same rows the
// CSV exports rather than anything reassembled here.
//
// The sheet loads in an offscreen iframe so the visitor never leaves the
// board. If printing the frame throws -- iOS Safari does not reliably expose
// print() on a frame's contentWindow -- it falls back to opening the sheet in
// a new tab for the visitor to print themselves. Where the call neither works
// nor throws, that fallback cannot fire and the dialog simply does not open.
//
// The trigger is a <button> carrying the URL as a Stimulus value rather than
// an <a href>: the sheet is an HTML page, and a followed link to one opens
// crawl space the board does not own (SEO.md, RDM-02).
export default class extends Controller {
  static values = { url: String };

  disconnect() {
    this.#removeFrame();
  }

  open(event) {
    event.preventDefault();
    this.#removeFrame();

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.visibility = "hidden";
    frame.src = this.urlValue;

    frame.addEventListener("load", () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch {
        this.#removeFrame();
        window.open(this.urlValue, "_blank", "noopener");
      }
    });

    this.frame = frame;
    document.body.appendChild(frame);
  }

  #removeFrame() {
    this.frame?.remove();
    this.frame = null;
  }
}
