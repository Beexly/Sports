/**
 * Cloudflare Worker Edge Entrypoint for gse-content-publishing.
 * Mirrors the fail-closed INTERNAL_CALIBRATION_ONLY kill switch without altering src/index.ts.
 */

export interface Env {
  INTERNAL_CALIBRATION_ONLY?: string;
  CONTENT_WORKER_ENABLED?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const internalOnly = env.INTERNAL_CALIBRATION_ONLY !== "false";
    const enabled = env.CONTENT_WORKER_ENABLED === "true";
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        worker: "gse-content-publishing",
        internalCalibrationOnly: internalOnly,
        contentWorkerEnabled: enabled,
      });
    }
    if (internalOnly || !enabled) {
      return Response.json(
        {
          status: "REFUSED",
          refusedByInternalCalibrationGates: internalOnly,
          note: "INTERNAL_CALIBRATION_ONLY / operator-review gate active; auto-publish disabled.",
        },
        { status: 403 },
      );
    }
    return Response.json({
      status: "QUEUED",
      refusedByInternalCalibrationGates: false,
      note: "Queued for operator review only; auto-publish disabled.",
    });
  },
};
