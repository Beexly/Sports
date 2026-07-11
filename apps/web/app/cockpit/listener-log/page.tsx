import Link from "next/link";
import { ListenerLogForm } from "@/components/cockpit/listener-log-form";
import { requireCockpitAdmin } from "@/lib/cockpit/require-admin";

/**
 * /cockpit/listener-log — the legal manual lane for broadcast claims.
 * A human heard it on their own subscription; they type a paraphrase here.
 * Filed as a SCOUT review task; nothing reaches public surfaces unreviewed.
 * Posture: docs/legal/SIRIUSXM_CONNECTION.md · registry: siriusxm-streaming.
 */
export const dynamic = "force-dynamic";

export default async function ListenerLogPage() {
  await requireCockpitAdmin();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-ion-white">Listener log</h1>
      <p
        data-testid="internal-only-banner"
        className="rounded-lg border border-yellow-900 bg-yellow-950/30 px-4 py-2 text-xs text-yellow-200"
      >
        Manual lane only. You listened on your own subscription; you type a paraphrase — never a
        quote, never a recording, never automation. Claims file as SCOUT review tasks.
      </p>
      <ListenerLogForm />
      <Link href="/cockpit" className="w-fit rounded-lg border border-titanium/40 px-3 py-2 text-xs text-ion-1 hover:bg-carbon/60">
        ← Back to Jarvis
      </Link>
    </div>
  );
}
