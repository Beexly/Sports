import type { Metadata } from "next";
import { DraftReviewerForm } from "@/components/cockpit/draft-reviewer-form";

export const metadata: Metadata = {
  title: "Draft review · Cockpit",
  robots: { index: false, follow: false, nocache: true },
};

export default function CockpitReviewDraftPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Draft review</h1>
        <p className="mt-1 text-sm text-gray-500">
          Semantic compliance scan over operator-pasted draft text. Catches
          paraphrased trust-claim violations the regex scanner misses. Findings
          are advisory and not persisted — they exist only for this session.
        </p>
      </header>

      <DraftReviewerForm />
    </div>
  );
}
