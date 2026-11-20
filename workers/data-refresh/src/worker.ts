/**
 * Cloudflare Worker Edge Entrypoint for gse-data-refresh.
 * Dispatches 30-minute odds/injury refresh coordination on Workers Paid
 * and enqueues pick re-scoring triggers cleanly without Render build blocks.
 */

export interface Env {
  ORIGIN_URL?: string;
  CRON_SECRET?: string;
  PICK_REFRESH_QUEUE?: { send(msg: unknown): Promise<void> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, worker: "gse-data-refresh", runtime: "cloudflare-workers" });
    }
    if (request.method === "POST" && url.pathname === "/enqueue") {
      if (env.PICK_REFRESH_QUEUE) {
        await env.PICK_REFRESH_QUEUE.send({ trigger: "manual", requestedAt: new Date().toISOString() });
      }
      return Response.json({ ok: true, queued: Boolean(env.PICK_REFRESH_QUEUE) });
    }
    return new Response("gse-data-refresh active", { status: 200 });
  },

  async scheduled(controller: { cron: string }, env: Env): Promise<void> {
    if (env.PICK_REFRESH_QUEUE) {
      await env.PICK_REFRESH_QUEUE.send({
        trigger: "cron",
        cron: controller.cron,
        scheduledAt: new Date().toISOString(),
      });
    }
    const origin = (env.ORIGIN_URL ?? "https://www.galaxysportsedge.com").replace(/\/+$/, "");
    if (env.CRON_SECRET) {
      await fetch(`${origin}/api/cron/refresh-odds`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      }).catch(() => undefined);
    }
  },
};
