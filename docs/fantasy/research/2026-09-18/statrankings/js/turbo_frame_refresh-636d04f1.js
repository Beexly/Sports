// Shared "refresh a single Turbo Frame in place" primitives, used by any
// Stimulus controller that debounces a user interaction into a scoped
// re-fetch of the current page (customize-weeks, StatBuilder+ stat picker,
// StatBuilder+ player search) instead of a full Turbo visit.
//
// Split into two steps — network fetch and DOM swap — rather than one
// combined function, so a caller that needs to gate the swap on extra state
// (e.g. a staleness/generation check) can inspect the fetched html before
// applying it, without re-implementing the fetch/parse mechanics itself.

export const DEBOUNCE_MS = 300;

// Fetches the current page scoped to a single Turbo Frame and returns the
// raw response HTML. Rejects with an AbortError if `signal` is aborted, and
// now also rejects on a non-2xx response (a 503/504 body has no
// turbo-frame#<id> in it, so applyFrameSwap silently no-ops on it -- the
// caller never learns the request failed, and the stale table sits there
// with no indication it stopped reflecting the selected filters). Throwing
// here is what lets a caller's .catch() show an error state instead.
export async function fetchFrameHtml(frameId, { signal } = {}) {
  const response = await fetch(window.location.href, {
    signal,
    headers: {
      "Turbo-Frame": frameId,
      "Accept": "text/html, application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`Turbo Frame fetch failed: ${response.status}`);
  return response.text();
}

// Parses fetched html and swaps the matching frame's content into the live
// DOM in place. Returns the live frame element, or null if either side is
// missing (nothing to swap).
export function applyFrameSwap(html, frameId) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const newFrame = doc.querySelector(`turbo-frame#${frameId}`);
  const currentFrame = document.getElementById(frameId);
  if (newFrame && currentFrame) {
    currentFrame.innerHTML = newFrame.innerHTML;
    return currentFrame;
  }
  return null;
}

// Loading/error state for the frame while a refresh is in flight, toggled on
// the <turbo-frame> element itself rather than anything inside it -- the
// frame element survives applyFrameSwap's innerHTML replacement (only its
// children are torn down), so a class/attribute set here is still present
// the instant the fetch resolves, even though every Stimulus controller and
// DOM node the swap touches gets rebuilt from scratch. CSS reads
// LOADING_CLASS/ERROR_CLASS off the frame to dim the (stale, still-visible)
// table and reveal a status badge without any layout shift -- see
// week_splits_filter.scss.
export const LOADING_CLASS = "turbo-frame-refresh-loading";
export const ERROR_CLASS = "turbo-frame-refresh-error";
const STATUS_SELECTOR = "[data-turbo-frame-refresh-status]";

export function beginFrameLoading(frameId) {
  const frame = document.getElementById(frameId);
  if (!frame) return;
  frame.classList.remove(ERROR_CLASS);
  frame.classList.add(LOADING_CLASS);
  frame.setAttribute("aria-busy", "true");
  const status = frame.querySelector(STATUS_SELECTOR);
  if (status) status.textContent = "Updating results…";
}

export function endFrameLoading(frameId, { error = false } = {}) {
  const frame = document.getElementById(frameId);
  if (!frame) return;
  frame.classList.remove(LOADING_CLASS);
  frame.removeAttribute("aria-busy");
  frame.classList.toggle(ERROR_CLASS, error);
  // On success the freshly-swapped-in status node already replaced this one;
  // setting text on the (about to be discarded) old node would announce
  // nothing. On error nothing swapped, so this is still the live node.
  if (error) {
    const status = frame.querySelector(STATUS_SELECTOR);
    if (status) status.textContent = "Couldn't update — showing the last loaded results.";
  }
}
