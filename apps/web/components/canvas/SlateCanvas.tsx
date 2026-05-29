"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export interface SlateCanvasNode {
  readonly gameId: string;
  readonly matchup: string;
  readonly sport: string;
  readonly edgeIndex: number; // 0-100
  readonly confidence: number; // 0-100
  readonly bandLabel: string;
}

export interface SlateCanvasProps {
  readonly nodes: ReadonlyArray<SlateCanvasNode>;
}

const WIDTH = 720;
const HEIGHT = 520;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const RADIUS = 200;

/**
 * SlateCanvas — the slate as a navigable spatial galaxy.
 *
 * Each game is a node sized by edge index and colored by confidence
 * band, placed on a circular orbit around the model center. Hovering
 * highlights; clicking navigates to /room/[gameId].
 *
 * Built with SVG + React (lightweight; no react-three-fiber dep).
 * Reduced-motion users get a static layout without hover-pop scaling.
 */
export function SlateCanvas({ nodes }: SlateCanvasProps): JSX.Element {
  const router = useRouter();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  return (
    <figure aria-label="Slate canvas" className="rounded-2xl border border-mineral bg-gray-900/55 p-5">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="auto" role="img" aria-labelledby="canvas-title">
        <title id="canvas-title">
          Slate canvas — games orbiting the model center, sized by edge index and colored by confidence.
        </title>

        {/* Concentric guide orbits */}
        {[0.4, 0.6, 0.8].map((scale) => (
          <circle
            key={scale}
            cx={CX}
            cy={CY}
            r={RADIUS * scale}
            fill="none"
            stroke="#374151"
            strokeWidth="0.5"
            strokeDasharray="2 4"
            opacity="0.5"
          />
        ))}

        {/* Model center */}
        <circle cx={CX} cy={CY} r="6" fill="#22d3ee" />
        <text x={CX} y={CY + 24} fontSize="10" fill="#a5f3fc" fontFamily="monospace" textAnchor="middle">
          MODEL
        </text>

        {/* Nodes */}
        {nodes.map((node, i) => {
          const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
          const r = RADIUS * (0.5 + (node.edgeIndex / 100) * 0.5);
          const x = CX + Math.cos(angle) * r;
          const y = CY + Math.sin(angle) * r;
          const size = 6 + Math.sqrt(Math.max(1, node.edgeIndex)) * 1.5;
          const isActive = activeId === node.gameId;
          const color =
            node.confidence >= 80
              ? "#22c55e"
              : node.confidence >= 70
                ? "#22d3ee"
                : node.confidence >= 60
                  ? "#f59e0b"
                  : "#6b7280";

          return (
            <g
              key={node.gameId}
              onMouseEnter={() => setActiveId(node.gameId)}
              onMouseLeave={() => setActiveId(null)}
              onClick={() => router.push(`/room/${node.gameId}`)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={x}
                cy={y}
                r={isActive ? size * 1.2 : size}
                fill={color}
                fillOpacity={isActive ? 0.9 : 0.6}
                stroke={color}
                strokeWidth={isActive ? 2 : 1}
                className="motion-safe:transition-all motion-safe:duration-200"
              />
              {isActive && (
                <g>
                  <rect
                    x={x + size + 4}
                    y={y - 24}
                    width="180"
                    height="48"
                    rx="4"
                    fill="#0f172a"
                    stroke="#334155"
                  />
                  <text
                    x={x + size + 12}
                    y={y - 8}
                    fontSize="10"
                    fill="#e5e7eb"
                    fontFamily="monospace"
                  >
                    {node.matchup}
                  </text>
                  <text
                    x={x + size + 12}
                    y={y + 8}
                    fontSize="9"
                    fill="#9ca3af"
                    fontFamily="monospace"
                  >
                    {node.sport} · edge {node.edgeIndex} · conf {node.confidence}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-4 text-xs text-gray-500">
        Hover a node to see the game. Click to open the Decision Room. Distance from center scales with edge index;
        color reflects confidence band. {nodes.length} game{nodes.length === 1 ? "" : "s"} on canvas.
      </figcaption>
    </figure>
  );
}
