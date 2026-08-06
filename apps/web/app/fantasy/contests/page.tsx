import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isContestsPublic } from "@/lib/launch/public-surface-gate";

/**
 * Contest Bay — incomplete product. Default: not public.
 * Set CONTESTS_PUBLIC=true only when the real contest surface ships.
 */

export const metadata: Metadata = {
  title: "Contests · Galaxy Sports Edge",
  description: "Competitive contest surfaces for Galaxy Sports Edge.",
  alternates: { canonical: "/fantasy/contests" },
  robots: { index: false, follow: false },
};

export default function ContestBayPage() {
  if (!isContestsPublic()) {
    notFound();
  }
  // When the flag flips, replace this with the real Contest Bay product.
  notFound();
}
