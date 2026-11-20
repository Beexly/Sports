/**
 * Cloudflare Worker Edge Entrypoint for gse-twitter-bot.
 * Preserves fail-closed MUTE_BOT, MUSE_X_PUBLISH_APPROVED, DRAFT_ONLY, and
 * idempotent outbox handoff without altering existing CommonJS oauth1/sender tests.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const muted = env.MUTE_BOT !== "false";
    const approved = env.MUSE_X_PUBLISH_APPROVED === "true";
    const draftOnly = env.DRAFT_ONLY !== "false";

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        worker: "gse-twitter-bot",
        muted,
        approved,
        draftOnly,
      });
    }

    if (muted || !approved || draftOnly) {
      return Response.json(
        { status: "BLOCKED", muted, approved, draftOnly, reason: "Fail-closed draft/mute gate active." },
        { status: 403 },
      );
    }

    return Response.json({ status: "READY", muted, approved, draftOnly });
  },

  async scheduled(_controller, env) {
    if (env.MUTE_BOT !== "false" || env.MUSE_X_PUBLISH_APPROVED !== "true" || env.DRAFT_ONLY !== "false") {
      return;
    }
    const origin = (env.ORIGIN_URL || "https://www.galaxysportsedge.com").replace(/\/+$/, "");
    if (env.CRON_SECRET) {
      await fetch(`${origin}/api/cron/bot-outbox`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      }).catch(() => undefined);
    }
  },
};
