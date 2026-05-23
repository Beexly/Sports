import type { Metadata } from "next";
import { PickNarratorForm } from "@/components/cockpit/pick-narrator-form";

export const metadata: Metadata = {
  title: "Pick narrator · Cockpit",
  robots: { index: false, follow: false, nocache: true },
};

export default function CockpitPickNarratorPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Pick narrator</h1>
        <p className="mt-1 text-sm text-gray-500">
          Operator-only editorial gloss layered on top of the deterministic
          pick reasoning. Cites factor breakdown only. Public surface is
          unaffected — this view is for cockpit review.
        </p>
      </header>

      <PickNarratorForm />
    </div>
  );
}
