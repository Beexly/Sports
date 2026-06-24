import { WebSocketTransport, defineRoom, defineServer } from "colyseus";
import { RookiePlazaPresenceRoom } from "./rookie-plaza-presence-room.js";

export const ROOKIE_PLAZA_ROOM_NAME = "rookie_plaza";
export const DEFAULT_ROOKIE_PLAZA_PRESENCE_PORT = 2567;

export interface RookiePlazaPresenceServerInfo {
  readonly roomName: typeof ROOKIE_PLAZA_ROOM_NAME;
  readonly maxClients: number;
  readonly transport: "colyseus-websocket";
  readonly status: "ready";
}

interface HealthResponse {
  json(body: RookiePlazaPresenceServerInfo): void;
}

export function getRookiePlazaPresenceServerInfo(): RookiePlazaPresenceServerInfo {
  return {
    roomName: ROOKIE_PLAZA_ROOM_NAME,
    maxClients: 16,
    transport: "colyseus-websocket",
    status: "ready",
  };
}

export function createRookiePlazaPresenceServer() {
  return defineServer({
    transport: new WebSocketTransport(),
    rooms: {
      [ROOKIE_PLAZA_ROOM_NAME]: defineRoom(RookiePlazaPresenceRoom),
    },
    express: (app) => {
      app.get("/health", (_request: unknown, response: HealthResponse) => {
        response.json(getRookiePlazaPresenceServerInfo());
      });
    },
  });
}

export async function startRookiePlazaPresenceServer(port = readPort()): Promise<void> {
  const server = createRookiePlazaPresenceServer();
  await server.listen(port);
  console.log(`[GalaxyPresence] ${ROOKIE_PLAZA_ROOM_NAME} listening on ${port}`);
}

function readPort(): number {
  const raw = process.env.GALAXY_PRESENCE_PORT ?? process.env.PORT;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_ROOKIE_PLAZA_PRESENCE_PORT;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ROOKIE_PLAZA_PRESENCE_PORT;
}
