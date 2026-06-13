import { Shell, Cards, SimpleTable } from "../_components";
import { loadExpertRegistry } from "@/lib/statking/product";
export default function Page(){ const experts=loadExpertRegistry(); return <Shell title="Expert Board"><Cards items={[{label:"Experts",value:experts.length},{label:"Signal rights",value:"gated"},{label:"Partner status",value:"queued"},{label:"Active signals",value:0}]}/><SimpleTable rows={experts}/></Shell> }
