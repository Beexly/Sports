import { CockpitOffice3dBotHq } from "@/components/cockpit/cockpit-office-3d-bot-hq";

export const dynamic = "force-dynamic";

export default function CockpitBotHqPage() {
  return (
    <div
      data-testid="cockpit-bot-hq-page"
      className="relative flex flex-col gap-5 pb-10"
    >
      <header className="rounded-3xl border border-titanium/50 bg-carbon/90 px-6 py-5 shadow-xl shadow-black/30">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-400">
          Galaxy Sports Edge · Hermes Agent Office-3D &amp; Bot HQ Command Deck
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ion-white sm:text-3xl">
          3D Isometric Agent Office · OmniRoute Universal API World · Hermes Bot HQ
        </h1>
        <p className="mt-2 max-w-4xl text-xs leading-relaxed text-ion-2">
          Live spatial workstation telemetry for all 6 autonomous GSE desks,
          universal API &amp; MCP plugin routing across 5 native stealth-skeleton
          models (86.62/100 Composite Scale), and real-time inter-agent bus
          dispatch. Official Season Ledger: 47-19-1 (+24.92u) | Base 38-13-1
          (+22.85u) · Roster Ruling: Geno Smith = NYJ QB · Mike Evans = SF WR.
        </p>
      </header>

      <CockpitOffice3dBotHq fullScreen />
    </div>
  );
}
