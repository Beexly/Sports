import { Shell, Cards, SimpleTable } from "../_components";
import { loadExpertRegistry } from "@/lib/statking/product";
export const metadata = {
  title: "Expert Board — Tracked Analyst Signals",
  description: "A rights-respecting view of tracked expert and analyst signals across the league.",
  alternates: { canonical: "/stats/expert-board" },
};
export default function Page(){ const experts=loadExpertRegistry(); return <Shell title="Expert Board"><Cards items={[{label:"Experts",value:experts.length},{label:"Signal rights",value:"gated"},{label:"Partner status",value:"queued"},{label:"Active signals",value:0}]}/><SimpleTable rows={experts}/></Shell> }
