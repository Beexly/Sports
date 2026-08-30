import { redirect } from "next/navigation";

// Folded into the Media Intelligence hub's per-platform filter to cut the
// /stats/media sub-route sprawl (the hub now shows the same cards + table).
export default function Page() {
  redirect("/stats/media?platform=youtube");
}
