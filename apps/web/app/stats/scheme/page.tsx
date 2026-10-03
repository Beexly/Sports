import { redirect } from "next/navigation";

// `/stats/scheme` was a near-duplicate of `/stats/teams` — the same team-environment
// data (offense/defense/pace), the same charts, and the same table. It has been
// consolidated into Team Environments to cut the /stats sprawl. This route now
// redirects so any existing/bookmarked links keep working.
export default function Page() {
  redirect("/stats/teams");
}
