import Link from "next/link";
import { HermesPluginUniverseSuite } from "@/components/cockpit/hermes-plugin-universe-suite";

export const dynamic = "force-dynamic";

export default function CockpitHermesPluginsPage() {
  return (
    <div
      data-testid="cockpit-hermes-plugins-page"
      className="flex flex-col gap-5 pb-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ion-3">
          <Link href="/cockpit" className="text-ion-2 hover:text-ion-white">
            ← Cockpit Overview
          </Link>
          <span>·</span>
          <span className="text-plasma">Hermes 11-Plugin Universe & NVIDIA 6-Skill Suite</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-ion-3">
          <span>Ledger: 36-13-1 (73.5%) · +20.14u Verified | All-in 47-19-1 (+24.92u)</span>
          <span>·</span>
          <span className="text-accent-400">Stealth-Skeleton 86.12/100</span>
        </div>
      </div>

      <HermesPluginUniverseSuite />
    </div>
  );
}
