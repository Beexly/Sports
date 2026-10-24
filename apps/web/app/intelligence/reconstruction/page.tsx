import { notFound } from "next/navigation";

// Permanently dark: the reconstruction surface was retired and its routes
// were deleted outright. This page exists only to 404 unconditionally —
// no metadata (metadata never serves for a 404), no render path, no NGS copy.
export default function ReconstructionPage() {
  notFound();
}
