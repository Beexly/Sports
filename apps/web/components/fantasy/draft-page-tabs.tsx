"use client";

import { useState } from "react";
import { DraftAssistant } from "./draft-assistant";
import { MockDraftRoom } from "./mock-draft-room";
import { BRAND_COLORS } from "@/lib/brand";
import type { Player } from "@/lib/fantasy/players";

type Tab = "assistant" | "mock";

interface Props {
  pool?: readonly Player[];
  canUseFantasyFull?: boolean;
}

export function DraftPageTabs({ pool, canUseFantasyFull }: Props) {
  const [tab, setTab] = useState<Tab>("assistant");

  const tabs: { key: Tab; label: string; desc: string }[] = [
    { key: "assistant", label: "Draft Assistant", desc: "Live recommendations during your real draft" },
    { key: "mock", label: "Mock Draft", desc: "Practice against AI opponents" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, desc }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="rounded-lg px-4 py-2.5 text-left transition-colors"
              style={{
                background: active ? `${BRAND_COLORS.softUltraviolet}22` : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? BRAND_COLORS.softUltraviolet : BRAND_COLORS.steelGray}`,
              }}
            >
              <p className="text-sm font-semibold" style={{ color: active ? BRAND_COLORS.softUltraviolet : "white" }}>{label}</p>
              <p className="text-[10px] text-ink-500">{desc}</p>
            </button>
          );
        })}
      </div>

      {tab === "assistant" && <DraftAssistant pool={pool} canUseFantasyFull={canUseFantasyFull} />}
      {tab === "mock" && <MockDraftRoom pool={pool} />}
    </div>
  );
}
