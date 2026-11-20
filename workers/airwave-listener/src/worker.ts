import {
  assertAirwaveLegalGatesOpen,
  transcribeEphemeralAudio,
  type AirwaveLegalGates,
} from "./transcribe-adapter.js";

export interface Env extends AirwaveLegalGates {
  AIRWAVE_OPERATOR_STATUS?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        worker: "gse-airwave-listener",
        enabled: env.AIRWAVE_ENABLED === "true",
        legalAck: env.AIRWAVE_SIRIUSXM_LEGAL_ACK === "true",
        operatorStatus: "DRAFT",
        publicSafe: false,
      });
    }
    if (request.method === "POST" && url.pathname === "/ingest-paraphrase") {
      try {
        assertAirwaveLegalGatesOpen(env);
        const bytes = new Uint8Array(await request.arrayBuffer());
        const result = await transcribeEphemeralAudio(bytes, env);
        return Response.json(result, { status: 200 });
      } catch (err) {
        return Response.json(
          { error: err instanceof Error ? err.message : "Gate closed" },
          { status: 403 },
        );
      }
    }
    return new Response("gse-airwave-listener idle (fail-closed legal gates)", { status: 200 });
  },

  async scheduled(_controller: { cron: string }, env: Env): Promise<void> {
    if (env.AIRWAVE_ENABLED !== "true" || env.AIRWAVE_SIRIUSXM_LEGAL_ACK !== "true") {
      return;
    }
  },
};
