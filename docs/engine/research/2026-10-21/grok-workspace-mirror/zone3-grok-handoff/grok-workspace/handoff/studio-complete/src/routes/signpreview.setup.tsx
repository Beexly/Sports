import { createFileRoute, Link } from "@tanstack/react-router";
import { IG_DM } from "@/lib/kit-offer";
import { StudioNav } from "@/components/studio/nav";

export const Route = createFileRoute("/signpreview/setup")({
  component: SetupPage,
});

const snippet = `<iframe
  src="https://YOUR-ORIGIN/signpreview/embed?shop=Your%20Shop%20Name"
  title="SignPreview"
  width="100%"
  height="820"
  style="border:0;border-radius:16px;background:#0a0908"
  loading="lazy"
></iframe>`;

function SetupPage() {
  return (
    <div className="kit-shell">
      <div className="grain" />
      <StudioNav current="/signpreview" cta={{ href: IG_DM, label: "DM SIGN" }} />
      <article className="mx-auto max-w-[720px] px-5 py-10 md:px-8">
        <p className="kicker">Setup · 8 minutes</p>
        <h1 className="display mt-3 text-3xl">Put SignPreview on your site.</h1>
        <ol className="mt-8 grid gap-6 text-sm leading-[1.6] text-muted">
          <li>
            <strong className="text-paper">1. Copy the iframe.</strong>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-ink-2 p-4 font-mono text-xs text-paper">
              {snippet}
            </pre>
          </li>
          <li>
            <strong className="text-paper">2. Replace YOUR-ORIGIN</strong> with the live host once Garrett ships this.
            Add <code className="text-paper">?shop=</code> your shop name.
          </li>
          <li>
            <strong className="text-paper">3. Paste it</strong> on the quote or “get a sign” page. Width 100%, height
            ~820.
          </li>
          <li>
            <strong className="text-paper">4. Leads.</strong> This preview stores them on the visitor’s device. When the
            inbox is live, the same form posts to you. Until then, they DM @gbeexly.
          </li>
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/signpreview/embed" search={{ shop: "" }} className="btn-primary">
            Preview the embed
          </Link>
          <Link to="/signpreview" className="btn-ghost">
            Back to SignPreview
          </Link>
        </div>
      </article>
    </div>
  );
}
