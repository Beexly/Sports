import {
  getProofSurfaceFreshness,
  type ProofSurfaceKey,
} from "@/lib/proof-freshness";

type ProofSurfaceFreshnessProps = {
  surface: ProofSurfaceKey;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ProofSurfaceFreshness({
  surface,
}: ProofSurfaceFreshnessProps) {
  const freshness = getProofSurfaceFreshness(surface);
  const updatedAt = dateFormatter.format(new Date(freshness.updatedAt));

  return (
    <p className="freshness">
      Last updated {updatedAt}. Freshness window: {freshness.maxStaleDays} days.
    </p>
  );
}
