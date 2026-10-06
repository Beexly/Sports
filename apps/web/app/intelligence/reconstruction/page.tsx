import { notFound } from "next/navigation";

/**
 * /intelligence/reconstruction — PERMANENTLY dark.
 *
 * NGS internal-only doctrine (Garrett, 2026-09-28, HARD): no NGS data,
 * metric names, methodology, or discussion on the public site — no env
 * opt-in can re-expose. This page 404s unconditionally; the former exhibit
 * code (metadata, loaders, panels) lives in git history if the doctrine
 * ever changes.
 */
export default function ReconstructionPage() {
  notFound();
}
