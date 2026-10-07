/**
 * Embed loading boundary — deliberately chrome-free.
 *
 * `app/embed/layout.tsx` ships no site nav/footer because these widgets render
 * inside third-party iframes. Without this override the root `app/loading.tsx`
 * would flash the full Galaxy Sports Edge nav bar inside someone else's page
 * while the widget loads.
 */
export default function EmbedLoading() {
  return (
    <div
      className="min-h-0 bg-obsidian p-4 text-ion-white"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
      <div className="mt-3 h-24 w-full animate-pulse rounded-lg border border-white/5 bg-white/5" />
    </div>
  );
}
