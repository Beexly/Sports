/**
 * Atmosphere — fixed film-grain + vignette overlays for the cinematic pages.
 *
 * Pure chrome: both layers are pointer-events-none and aria-hidden, so they
 * add photographic depth without touching interaction or the a11y tree. Drop
 * once per cinematic page (intelligence, cipher). Grain sits above content at a
 * whisper opacity; the vignette darkens the frame edges.
 */
export function Atmosphere() {
  return (
    <>
      <div aria-hidden="true" className="gse-vignette" />
      <div aria-hidden="true" className="gse-grain" />
    </>
  );
}
