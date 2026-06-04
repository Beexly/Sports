import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "DFS Optimizer — Galaxy Fantasy",
  description:
    "A glass-box DFS optimizer: cash, GPP, and leverage objectives, QB stacking, locks and fades, and N unique lineups with real exposure control — every lineup shipped with the why.",
  alternates: { canonical: "/fantasy/dfs" },
};

export default function DfsPage() {
  return (
    <FantasyShell
      eyebrow="DFS Optimizer"
      accent={BRAND_COLORS.orbitalCyan}
      title={<>Solve the slate. <span className="gse-editorial" style={{ fontSize: "1.08em" }}>See the why</span>.</>}
      intro="Most optimizers hand you a lineup and hide the reasoning. This one optimizes for the objective that actually wins your contest — median for cash, ceiling for GPP, or contrarian leverage for tournaments — stacks your QB, respects your locks and fades, and builds a unique portfolio with real exposure control. Every lineup ships with its salary, stack, total field-ownership, and a leverage score."
      note="Illustrative DraftKings-Classic slate and projections. Salary-cap optimization, stacking, exposure, and leverage are computed live in your browser from the sample pool."
      wide
    >
      <DfsOptimizer />
    </FantasyShell>
  );
}
