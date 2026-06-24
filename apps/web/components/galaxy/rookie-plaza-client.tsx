"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { RookiePlazaState } from "@/lib/galaxy/rookie-plaza";
import { GALAXY } from "@/lib/galaxy/theme";

type SpatialModule = typeof import("@sports/galaxy-spatial");
type SpatialWeatherId = Parameters<SpatialModule["createRookiePlazaWorld"]>[1]["weatherId"];
type SpatialMaterialToken = Parameters<SpatialModule["createRookiePlazaWorld"]>[1]["entities"][number]["token"];

type ActionStatus =
  | { kind: "idle"; text: string }
  | { kind: "busy"; text: string }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

export function RookiePlazaClient({ initialState }: { initialState: RookiePlazaState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNpcId, setSelectedNpcId] = useState(initialState.npcStates[0]?.id ?? "coach-signal");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [questOpen, setQuestOpen] = useState(false);
  const [touchControlsEnabled, setTouchControlsEnabled] = useState(false);
  const [answer, setAnswer] = useState<"A" | "B">("B");
  const [confidence, setConfidence] = useState(64);
  const [status, setStatus] = useState<ActionStatus>({ kind: "idle", text: "Talk to Coach Signal." });
  const [fallbackActive, setFallbackActive] = useState(false);
  const [completedQuestIds, setCompletedQuestIds] = useState<readonly string[]>([]);
  const [earnedItemIds, setEarnedItemIds] = useState<readonly string[]>(["rookie-signal-card"]);
  const [skillsGained, setSkillsGained] = useState<readonly string[]>([]);
  const [presenceRoom, setPresenceRoom] = useState(initialState.presenceRoom);
  const [joystickVector, setJoystickVector] = useState({ x: 0, z: 0 });
  const joystickVectorRef = useRef({ x: 0, z: 0 });
  const playerPositionRef = useRef({ x: 0, y: 0.72, z: 1.2 });
  const lastPresenceSyncRef = useRef(0);
  const presenceSyncInFlightRef = useRef(false);
  const selectedNpcLineRef = useRef(initialState.npcStates[0]?.line ?? "Route noted.");

  const selectedNpc = initialState.npcStates.find((npc) => npc.id === selectedNpcId) ?? initialState.npcStates[0];
  const firstQuest = initialState.quests[0];
  const completableQuests = initialState.quests.slice(0, 6);
  const drawerOpen = questOpen || inventoryOpen;

  useEffect(() => {
    selectedNpcLineRef.current = selectedNpc?.line ?? "Route noted.";
  }, [selectedNpc?.line]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cleanup: (() => void) | null = null;
    let mounted = true;

    void import("@sports/galaxy-spatial")
      .then((spatial: SpatialModule) => {
        if (!mounted) return;
        const sceneShell = spatial.createGalaxySpatialScene(canvas, {
          qualityMode: window.matchMedia("(max-width: 720px)").matches ? "medium" : "high",
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          clearColor: "#05070dff",
        });
        const gates = initialState.districtDoors.slice(0, 9).map((door, index) => {
          const node = initialState.sceneEntities.find((entity) => entity.routeNodeId === door.id);
          const angle = (index / 9) * Math.PI * 2;
          return {
            id: door.id,
            label: door.label,
            kind: "door" as const,
            position: [Math.cos(angle) * 5.7, 0.95, Math.sin(angle) * 5.7] as const,
            token: tokenForDoor(door.id),
            node,
          };
        });
        const entities = [
          { id: "player-avatar", label: "Rookie", kind: "player" as const, position: [0, 0.72, 1.2] as const, token: "stadiumGold" as const },
          ...initialState.npcStates.slice(0, 12).map((npc) => ({
            id: npc.id,
            label: npc.name,
            kind: (npc.id.includes("ghost") ? "ghost" : "npc") as "ghost" | "npc",
            position: [npc.position.x, 0.48, npc.position.z] as const,
            token: npc.id.includes("ghost") ? ("ultraviolet" as const) : ("signalCyan" as const),
          })),
          ...initialState.ghostPresence.slice(1).map((ghost, index) => ({
            id: ghost.id,
            label: ghost.label,
            kind: "ghost" as const,
            position: [3.8 - index * 0.8, 0.48, 1.4 + (index % 3)] as const,
            token: "ultraviolet" as const,
          })),
          { id: "quest-board", label: "Quest Board", kind: "quest-marker" as const, position: [-1.8, 0.08, -4.8] as const, token: "stadiumGold" as const },
          { id: "public-trap-marker", label: "Public Trap", kind: "boss-marker" as const, position: [0, 0.08, 5.7] as const, token: "cyberMagenta" as const },
          { id: "beat-wall-marker", label: "The Beat", kind: "quest-marker" as const, position: [1.8, 0.08, -4.9] as const, token: "verifyTeal" as const },
        ];
        const world = spatial.createRookiePlazaWorld(sceneShell.scene, {
          weatherId: toSpatialWeatherId(initialState.activeWeather.weatherId),
          gates,
          entities,
        });

        const pressed = new Set<string>();
        const onKeyDown = (event: KeyboardEvent) => {
          pressed.add(event.code);
          if (event.code === "KeyE" || event.code === "Enter") {
            setStatus({ kind: "done", text: selectedNpcLineRef.current });
          }
        };
        const onKeyUp = (event: KeyboardEvent) => pressed.delete(event.code);
        window.addEventListener("resize", sceneShell.resize);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        void fetch("/api/galaxy/rookie-plaza", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "presence", kind: "load" }),
        })
          .then((response) => response.json() as Promise<{ presenceRoom?: RookiePlazaState["presenceRoom"] }>)
          .then((payload) => {
            if (payload.presenceRoom) setPresenceRoom(payload.presenceRoom);
          })
          .catch(() => undefined);

        let elapsed = 0;
        let velocityX = 0;
        let velocityZ = 0;
        sceneShell.start((delta) => {
          elapsed += delta;
          const player = world.player;
          if (!player) return;
          const joystick = joystickVectorRef.current;
          const targetX = clampUnit((pressed.has("KeyD") || pressed.has("ArrowRight") ? 1 : 0) - (pressed.has("KeyA") || pressed.has("ArrowLeft") ? 1 : 0) + joystick.x);
          const targetZ = clampUnit((pressed.has("KeyS") || pressed.has("ArrowDown") ? 1 : 0) - (pressed.has("KeyW") || pressed.has("ArrowUp") ? 1 : 0) + joystick.z);
          const accel = spatial.INPUT_CONTRACT.smoothing.acceleration * delta;
          const decel = spatial.INPUT_CONTRACT.smoothing.deceleration * delta;
          velocityX = moveToward(velocityX, targetX * spatial.INPUT_CONTRACT.smoothing.maxSpeed, targetX === 0 ? decel : accel);
          velocityZ = moveToward(velocityZ, targetZ * spatial.INPUT_CONTRACT.smoothing.maxSpeed, targetZ === 0 ? decel : accel);
          player.position.x = Math.max(spatial.ROOKIE_PLAZA_COLLISION_BOUNDS.minX, Math.min(spatial.ROOKIE_PLAZA_COLLISION_BOUNDS.maxX, player.position.x + velocityX * delta));
          player.position.z = Math.max(spatial.ROOKIE_PLAZA_COLLISION_BOUNDS.minZ, Math.min(spatial.ROOKIE_PLAZA_COLLISION_BOUNDS.maxZ, player.position.z + velocityZ * delta));
          playerPositionRef.current = { x: player.position.x, y: player.position.y, z: player.position.z };
          if (!presenceSyncInFlightRef.current && elapsed - lastPresenceSyncRef.current > 2.5 && (Math.abs(velocityX) > 0.01 || Math.abs(velocityZ) > 0.01)) {
            lastPresenceSyncRef.current = elapsed;
            presenceSyncInFlightRef.current = true;
            void fetch("/api/galaxy/rookie-plaza", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "position", position: playerPositionRef.current }),
            })
              .then((response) => response.json() as Promise<{ presenceRoom?: RookiePlazaState["presenceRoom"] }>)
              .then((payload) => {
                if (payload.presenceRoom) setPresenceRoom(payload.presenceRoom);
              })
              .catch(() => undefined)
              .finally(() => {
                presenceSyncInFlightRef.current = false;
              });
          }
          sceneShell.camera.target.x += (player.position.x * 0.35 - sceneShell.camera.target.x) * 0.06;
          sceneShell.camera.target.z += (player.position.z * 0.35 - sceneShell.camera.target.z) * 0.06;
          for (const mesh of world.meshes) {
            if (mesh.metadata?.kind === "quest-marker" || mesh.metadata?.kind === "boss-marker") spatial.pulseMesh(mesh, elapsed);
            if (mesh.metadata?.kind === "ghost") {
              spatial.moveGhostAlongPath(mesh, [{ x: 2.2, z: 0.8 }, { x: 4.7, z: 4.7 }, { x: -1.4, z: 5.1 }], elapsed);
            }
          }
        });
        sceneShell.resize();

        cleanup = () => {
          window.removeEventListener("resize", sceneShell.resize);
          window.removeEventListener("keydown", onKeyDown);
          window.removeEventListener("keyup", onKeyUp);
          sceneShell.dispose();
        };
      })
      .catch(() => {
        setFallbackActive(true);
        void fetch("/api/galaxy/rookie-plaza", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "presence", kind: "fallback" }),
        });
      });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [initialState]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetch("/api/galaxy/rookie-plaza", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "presence", kind: "heartbeat" }),
      })
        .then((response) => response.json() as Promise<{ presenceRoom?: RookiePlazaState["presenceRoom"] }>)
        .then((payload) => {
          if (payload.presenceRoom) setPresenceRoom(payload.presenceRoom);
        })
        .catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const syncTouchMode = () => setTouchControlsEnabled(coarsePointer.matches);
    syncTouchMode();
    coarsePointer.addEventListener("change", syncTouchMode);
    return () => coarsePointer.removeEventListener("change", syncTouchMode);
  }, []);

  const routeButtons = useMemo(
    () => initialState.districtDoors.filter((door) => door.href).slice(0, 10),
    [initialState.districtDoors],
  );

  async function runFirstSignal() {
    setStatus({ kind: "busy", text: "Grading First Signal..." });
    try {
      const response = await fetch("/api/galaxy/rookie-plaza", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "signal_check", answer, confidence }),
      });
      const payload = (await response.json()) as { error?: string; signalCheck?: { reward: { xp: number; credits: number }; persisted: boolean } };
      if (!response.ok || payload.error) throw new Error(payload.error ?? "Signal Check failed.");
      const reward = payload.signalCheck?.reward;
      setStatus({
        kind: "done",
        text: reward
          ? `First Signal complete. +${reward.xp} XP, +${reward.credits} Credits. ${payload.signalCheck?.persisted ? "Profile updated." : "Demo mode: no DB write."}`
          : "First Signal complete.",
      });
      setCompletedQuestIds((ids) => [...new Set([...ids, "first-signal"])]);
      setEarnedItemIds((ids) => [...new Set([...ids, "rookie-signal-card", "war-room-pass"])]);
      setSkillsGained((ids) => [...new Set([...ids, "calibration", "signal-discipline"])]);
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Signal Check failed." });
    }
  }

  async function completeQuest(questId: string) {
    setStatus({ kind: "busy", text: "Writing quest progress..." });
    try {
      const response = await fetch("/api/galaxy/rookie-plaza", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "quest", questId }),
      });
      const payload = (await response.json()) as { error?: string; reward?: { xp: number; credits: number }; event?: string };
      if (!response.ok || payload.error) throw new Error(payload.error ?? "Quest failed.");
      setCompletedQuestIds((ids) => [...new Set([...ids, questId])]);
      setSkillsGained((ids) => [...new Set([...ids, "market-reading", "card-scouting"])]);
      setStatus({ kind: "done", text: `Quest complete. +${payload.reward?.xp ?? 0} XP, +${payload.reward?.credits ?? 0} Credits.` });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Quest failed." });
    }
  }

  async function claimItem(itemId: string) {
    setStatus({ kind: "busy", text: "Claiming item..." });
    try {
      const response = await fetch("/api/galaxy/rookie-plaza", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "claim_reward", itemId }),
      });
      const payload = (await response.json()) as { error?: string; item?: { id: string; name: string } };
      if (!response.ok || payload.error) throw new Error(payload.error ?? "Claim failed.");
      setEarnedItemIds((ids) => [...new Set([...ids, itemId])]);
      setStatus({ kind: "done", text: `${payload.item?.name ?? "Item"} added to inventory route.` });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Claim failed." });
    }
  }

  function updateJoystick(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const z = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    const length = Math.hypot(x, z);
    const next = length > 1 ? { x: x / length, z: z / length } : { x, z };
    joystickVectorRef.current = next;
    setJoystickVector(next);
  }

  function clearJoystick() {
    joystickVectorRef.current = { x: 0, z: 0 };
    setJoystickVector({ x: 0, z: 0 });
  }

  return (
    <div style={{ minHeight: "calc(100vh - 32px)", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
      <section
        style={{
          position: "relative",
          minHeight: 620,
          border: `1px solid ${initialState.activeWeather.accent}66`,
          borderRadius: 8,
          overflow: "hidden",
          background: `linear-gradient(180deg, ${GALAXY.void}, #090d19)`,
        }}
      >
        <canvas ref={canvasRef} aria-label="Rookie Plaza spatial scene" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        {fallbackActive && (
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 40%, ${initialState.activeWeather.accent}33, transparent 42%), ${GALAXY.void}` }} />
        )}

        <div style={{ position: "absolute", top: 14, left: 14, zIndex: 8, display: "flex", gap: 10, flexWrap: "wrap", maxWidth: "calc(100% - 28px)" }}>
          <HudChip label="Sports IQ" value={initialState.profileSummary ? `${initialState.profileSummary.sportsIqLabel} L${initialState.profileSummary.sportsIqLevel}` : "Profile needed"} />
          <HudChip label="Galaxy Score" value={initialState.profileSummary ? `${initialState.profileSummary.galaxyScore}` : "0"} accent={GALAXY.gold} />
          <HudChip label="Weather" value={initialState.activeWeather.weatherName} accent={initialState.activeWeather.accent} />
          <HudChip label="Quest Log" value={`${completedQuestIds.length}/${initialState.quests.length}`} accent={GALAXY.violet} />
        </div>

        <div style={{ position: "absolute", right: 14, top: 14, zIndex: 9, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 360 }}>
          <button type="button" onClick={() => setQuestOpen((value) => !value)} style={buttonStyle(GALAXY.cyan)}>
            {questOpen ? "Hide Quest" : "Quest"}
          </button>
          <button type="button" onClick={() => setInventoryOpen((value) => !value)} style={buttonStyle(GALAXY.gold)}>
            {inventoryOpen ? "Hide Gear" : "Inventory"}
          </button>
          <Link href="/galaxy" style={linkButtonStyle(GALAXY.deepBlue)}>
            Campus
          </Link>
          <Link href="/galaxy/dynasty" style={linkButtonStyle(GALAXY.violet)}>
            My Dynasty
          </Link>
        </div>

        {touchControlsEnabled && (
          <div
            aria-label="Touch movement joystick"
            role="application"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateJoystick(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) updateJoystick(event);
            }}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
              clearJoystick();
            }}
            onPointerCancel={clearJoystick}
            style={{
              position: "absolute",
              left: 18,
              bottom: drawerOpen ? "calc(min(42%, 360px) + 34px)" : 26,
              zIndex: 7,
              width: 116,
              height: 116,
              borderRadius: 999,
              border: `1px solid ${GALAXY.cyan}88`,
              background: `radial-gradient(circle at 50% 50%, ${GALAXY.cyan}24, #05070dcc 64%)`,
              boxShadow: `0 14px 48px rgba(0,0,0,0.36), inset 0 0 32px ${GALAXY.cyan}18`,
              touchAction: "none",
            }}
          >
            <div style={{ position: "absolute", inset: 18, borderRadius: 999, border: `1px dashed ${GALAXY.border}` }} />
            <div
              style={{
                position: "absolute",
                width: 36,
                height: 36,
                borderRadius: 999,
                left: 40 + joystickVector.x * 32,
                top: 40 + joystickVector.z * 32,
                border: `1px solid ${GALAXY.gold}`,
                background: `${GALAXY.gold}72`,
                boxShadow: `0 0 28px ${GALAXY.gold}55`,
              }}
            />
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: 14,
            bottom: 14,
            right: "auto",
            zIndex: 4,
            display: "grid",
            gridTemplateColumns: drawerOpen && !touchControlsEnabled ? "minmax(300px, 430px) minmax(320px, 500px)" : "minmax(300px, 430px)",
            gap: 12,
            alignItems: "end",
            maxWidth: "calc(100% - 28px)",
            maxHeight: drawerOpen ? (touchControlsEnabled ? "min(68%, 520px)" : "min(42%, 360px)") : "min(30%, 255px)",
          }}
        >
          <div style={panelStyle}>
            <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
              {initialState.npcStates.slice(0, 12).map((npc) => (
                <button
                  key={npc.id}
                  type="button"
                  onClick={() => {
                    setSelectedNpcId(npc.id);
                    setStatus({ kind: "done", text: npc.line });
                    void fetch("/api/galaxy/rookie-plaza", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ action: "npc", npcId: npc.id }),
                    });
                  }}
                  style={buttonStyle(selectedNpcId === npc.id ? GALAXY.gold : GALAXY.border)}
                >
                  {npc.name}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: GALAXY.gold, fontWeight: 800, letterSpacing: 1.2 }}>{selectedNpc?.role ?? "Guide"}</div>
            <div style={{ fontSize: 17, fontWeight: 900, marginTop: 3 }}>{selectedNpc?.name ?? "Coach Signal"}</div>
            <p style={{ color: GALAXY.textMuted, margin: "6px 0 0", lineHeight: 1.4 }}>{selectedNpc?.line}</p>
            <div style={{ marginTop: 10, color: status.kind === "error" ? GALAXY.magenta : status.kind === "done" ? GALAXY.cyan : GALAXY.textMuted, fontSize: 13 }}>
              {status.text}
            </div>
          </div>

          {drawerOpen && (
          <div style={{ ...panelStyle, display: "grid", gap: 10 }}>
            {questOpen && firstQuest && (
              <div>
                <div style={{ fontSize: 11, color: GALAXY.textMuted, letterSpacing: 1.2 }}>ACTIVE QUEST</div>
                <h2 style={{ margin: "4px 0", fontSize: 20 }}>{firstQuest.title}</h2>
                <div style={{ display: "grid", gap: 6 }}>
                  {firstQuest.objectives.map((objective) => (
                    <div key={objective.id} style={{ fontSize: 13, color: GALAXY.textMuted }}>
                      {objective.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                  <select value={answer} onChange={(event) => setAnswer(event.target.value as "A" | "B")} style={selectStyle}>
                    <option value="A">Ride the hot story</option>
                    <option value="B">Check the moved price</option>
                  </select>
                  <input type="range" min={1} max={99} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} aria-label="Confidence" />
                  <span style={{ fontSize: 12, color: GALAXY.textMuted }}>{confidence}%</span>
                  <button type="button" onClick={runFirstSignal} disabled={status.kind === "busy"} style={buttonStyle(GALAXY.gold)}>
                    Run First Signal
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginTop: 12 }}>
                  {completableQuests.map((quest) => (
                    <button key={quest.id} type="button" onClick={() => void completeQuest(quest.id)} style={buttonStyle(completedQuestIds.includes(quest.id) ? GALAXY.cyan : GALAXY.border)}>
                      {completedQuestIds.includes(quest.id) ? "Complete" : "Complete"} · {quest.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {inventoryOpen && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                {initialState.inventory.map((item) => (
                  <div key={item.id} style={{ border: `1px solid ${GALAXY.border}`, borderRadius: 10, padding: 10, background: "#05070dcc" }}>
                    <div style={{ fontSize: 12, color: GALAXY.gold, fontWeight: 800 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: GALAXY.textMuted, marginTop: 3 }}>{item.use}</div>
                    <button type="button" onClick={() => void claimItem(item.id)} style={{ ...buttonStyle(earnedItemIds.includes(item.id) ? GALAXY.cyan : GALAXY.gold), marginTop: 8 }}>
                      {earnedItemIds.includes(item.id) ? "Earned" : "Claim route"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {routeButtons.map((door) => (
                <Link key={door.id} href={door.href ?? "/galaxy"} style={linkButtonStyle(GALAXY.cyan)}>
                  {door.label}
                </Link>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
              {initialState.skills.map((skill) => (
                <div key={skill.id} style={miniTile(skillsGained.includes(skill.id) ? GALAXY.cyan : GALAXY.border)}>
                  <strong>{skill.label}</strong>
                  <span>{skillsGained.includes(skill.id) ? "XP gained" : skill.districtId}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
              {initialState.blacktopGames.map((game) => (
                <Link key={game.id} href="/galaxy/blacktop" style={miniLink(game.mode === "playable" ? GALAXY.gold : GALAXY.border)}>
                  <strong>{game.title}</strong>
                  <span>{game.mode === "playable" ? "Playable" : "Preview"}</span>
                </Link>
              ))}
              {initialState.bosses.map((boss) => (
                <Link key={boss.id} href="/galaxy/depths" style={miniLink(boss.id === "public-trap" ? GALAXY.magenta : GALAXY.border)}>
                  <strong>{boss.name}</strong>
                  <span>{boss.id === "public-trap" ? "Playable" : "Preview"}</span>
                </Link>
              ))}
            </div>
            <div style={{ display: "grid", gap: 6, color: GALAXY.textMuted, fontSize: 12 }}>
              <div style={{ color: GALAXY.cyan, fontWeight: 800 }}>ROOM: {presenceRoom.players.length}/{presenceRoom.maxPlayers}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {presenceRoom.players.slice(0, 8).map((player) => (
                  <span key={player.sessionId} style={{ border: `1px solid ${player.ghost ? GALAXY.violet : GALAXY.cyan}55`, borderRadius: 999, padding: "4px 7px", background: "#05070dcc" }}>
                    {player.label} · {player.signal}
                  </span>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>
        {!drawerOpen && firstQuest && (
          <div
            style={{
              position: "absolute",
              left: 458,
              right: 14,
              bottom: 16,
              zIndex: 5,
              display: touchControlsEnabled ? "none" : "flex",
              gap: 8,
              alignItems: "center",
              padding: "8px 10px",
              border: `1px solid ${GALAXY.gold}55`,
              borderRadius: 8,
              background: "#05070dd9",
              color: GALAXY.text,
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span style={{ color: GALAXY.gold }}>ACTIVE</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{firstQuest.title}</span>
            <span style={{ color: GALAXY.textMuted }}>First Signal route is open</span>
          </div>
        )}
      </section>
    </div>
  );
}

function HudChip({ label, value, accent = GALAXY.cyan }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ border: `1px solid ${accent}55`, background: "#05070dd9", borderRadius: 8, padding: "8px 10px", minWidth: 118 }}>
      <div style={{ color: GALAXY.textMuted, fontSize: 10, letterSpacing: 1 }}>{label}</div>
      <div style={{ color: accent, fontSize: 13, fontWeight: 900, marginTop: 2 }}>{value}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  border: `1px solid ${GALAXY.border}`,
  background: "#05070de8",
  borderRadius: 8,
  padding: 12,
  boxShadow: "0 14px 54px rgba(0,0,0,0.36)",
  maxHeight: "100%",
  overflowY: "auto",
};

function buttonStyle(accent: string): React.CSSProperties {
  return {
    border: `1px solid ${accent}77`,
    background: `${accent}18`,
    color: GALAXY.text,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  };
}

function linkButtonStyle(accent: string): React.CSSProperties {
  return {
    ...buttonStyle(accent),
    display: "inline-flex",
    alignItems: "center",
    textDecoration: "none",
  };
}

const selectStyle: React.CSSProperties = {
  border: `1px solid ${GALAXY.border}`,
  background: GALAXY.void,
  color: GALAXY.text,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
};

function miniTile(accent: string): React.CSSProperties {
  return {
    border: `1px solid ${accent}66`,
    borderRadius: 8,
    padding: 9,
    background: "#05070dcc",
    color: GALAXY.text,
    display: "grid",
    gap: 3,
    fontSize: 12,
  };
}

function miniLink(accent: string): React.CSSProperties {
  return {
    ...miniTile(accent),
    textDecoration: "none",
  };
}

function moveToward(value: number, target: number, step: number): number {
  if (value < target) return Math.min(value + step, target);
  if (value > target) return Math.max(value - step, target);
  return target;
}

function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function tokenForDoor(doorId: string): SpatialMaterialToken {
  if (doorId.includes("depths")) return "cyberMagenta";
  if (doorId.includes("vault")) return "cardGlow";
  return "glass";
}

function toSpatialWeatherId(weatherId: string): SpatialWeatherId {
  switch (weatherId) {
    case "upset_storm":
    case "rookie_heat":
    case "injury_fog":
    case "trade_shock":
    case "playoff_pressure":
    case "public_collapse":
    case "card_heat":
    case "rivalry_surge":
    case "deadline_shock":
    case "championship_gravity":
    case "fantasy_waiver_surge":
    case "slump_watch":
    case "breakout_signal":
    case "market_whiplash":
      return weatherId;
    default:
      return "rookie_heat";
  }
}
