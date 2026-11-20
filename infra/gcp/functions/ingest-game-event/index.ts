// gcp/functions/ingest-game-event/index.ts
// Scale-to-zero Cloud Run Function Gen 2 (Node.js 22) triggered by Pub/Sub.
// Idempotent ingestion of live game/odds/signal events into time-partitioned BigQuery.

import { cloudEvent, CloudEvent } from "@google-cloud/functions-framework";
import { BigQuery } from "@google-cloud/bigquery";

interface PubSubMessageData {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
    attributes?: Record<string, string>;
  };
}

interface GameEventPayload {
  event_id: string;
  league: string;
  game_id: string;
  event_type: string;
  event_ts: string;
  source: string;
  payload: Record<string, unknown>;
}

const bq = new BigQuery();
const DATASET = process.env.BQ_DATASET || "gse_analytics";
const TABLE = process.env.BQ_TABLE || "game_events";

cloudEvent("ingestGameEvent", async (evt: CloudEvent<PubSubMessageData>) => {
  const msg = evt.data?.message;
  if (!msg?.data) {
    console.warn(JSON.stringify({ level: "WARN", msg: "Empty Pub/Sub payload", id: evt.id }));
    return;
  }

  const decoded = Buffer.from(msg.data, "base64").toString("utf8");
  const parsed: GameEventPayload = JSON.parse(decoded);

  // Use event_id or Pub/Sub messageId as insertId for at-least-once deduplication
  const insertId = parsed.event_id || msg.messageId || evt.id;

  const row = {
    insertId,
    json: {
      event_id: insertId,
      league: parsed.league || "NFL",
      game_id: parsed.game_id,
      event_type: parsed.event_type,
      event_ts: parsed.event_ts || msg.publishTime || new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      source: parsed.source || "gse-ingest",
      payload_json: JSON.stringify(parsed.payload || {}),
    },
  };

  await bq.dataset(DATASET).table(TABLE).insert([row], { raw: true });
  console.log(
    JSON.stringify({
      level: "INFO",
      msg: "Ingested game event",
      event_id: insertId,
      game_id: parsed.game_id,
      event_type: parsed.event_type,
    })
  );
});
