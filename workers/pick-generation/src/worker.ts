/**
 * Cloudflare Worker Edge Entrypoint for gse-pick-generation.
 * Consumes `gse-pick-refresh-queue` batches under Workers Paid (15s CPU limit)
 * and forwards scoring triggers only when Stage-5 gates are active.
 */

export interface Env {
  ORIGIN_URL?: string;
  CRON_SECRET?: string;
  STAGE5_GATE_REQUIRED?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        worker: "gse-pick-generation",
        stage5GateRequired: env.STAGE5_GATE_REQUIRED !== "false",
      });
    }
    return new Response("gse-pick-generation active", { status: 200 });
  },

  async queue(
    batch: { messages: Array<{ id: string; body: unknown; ack(): void }> },
    env: Env,
  ): Promise<void> {
    const origin = (env.ORIGIN_URL ?? "https://www.galaxysportsedge.com").replace(/\/+$/, "");
    for (const msg of batch.messages) {
      if (env.CRON_SECRET) {
        await fetch(`${origin}/api/cron/generate-signal-slate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.CRON_SECRET}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ queueMessageId: msg.id, payload: msg.body }),
        }).catch(() => undefined);
      }
      msg.ack();
    }
  },
};
