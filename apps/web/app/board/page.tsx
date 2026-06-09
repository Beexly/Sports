// Merged into /picks — /picks (PickCard, factor trail) is the canonical Today's Board; this stale duplicate now redirects.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Page(): never {
  redirect("/picks");
}
