import { redirect } from "next/navigation";

// `/stats/alerts` (movement watch) was merged into the combined "Player Status &
// Movement" page at `/stats/injuries`, which now carries both the status section
// and the movement/risers section — one bucket for "what changed." This route
// redirects so existing/bookmarked links keep working; no content was lost.
export default function Page() {
  redirect("/stats/injuries");
}
