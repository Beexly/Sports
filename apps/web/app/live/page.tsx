import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Live Board",
  description:
    "Live board entry — redirects to the honesty-gated board surface.",
  alternates: { canonical: "/live" },
};

/**
 * /live is a product alias for the board surface.
 * LIVE_BOARD gate still controls what the board may claim; this route
 * must never 404 and must never invent a second performance surface.
 */
export default function LiveAliasPage(): never {
  redirect("/board");
}
