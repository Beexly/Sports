export type SpatialBridgeEvent =
  | { type: "select_entity"; entityId: string }
  | { type: "open_dialogue"; npcId: string }
  | { type: "open_quest"; questId: string }
  | { type: "complete_quest"; questId: string }
  | { type: "inspect_inventory"; itemId: string }
  | { type: "start_signal_check"; questId: string }
  | { type: "route_to_district"; routeId: string }
  | { type: "emit_admin_event"; event: string };

export type SpatialBridgeHandler = (event: SpatialBridgeEvent) => void;

export function createSpatialBridge(handler: SpatialBridgeHandler) {
  return {
    emit: handler,
  };
}
