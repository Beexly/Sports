import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { GeneratedPlate } from "@/components/immersive/generated-plate";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMessages: Record<string, string> = {
    Configuration:
      "Something's misconfigured on my side. Try again in a minute, or email hq@galaxysportsedge.com if it sticks.",
    AccessDenied: "You don't have access to that page yet.",
    Verification: "That sign-in link's expired. Request a fresh one.",
    Default: "Sign-in didn't go through. Give it another shot.",
  };

  const message =
    errorMessages[searchParams.error ?? "Default"] ??
    errorMessages["Default"]!;

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-obsidian px-4 py-12">
      {/* Atmosphere — same calm deep-space plate as /auth/signin */}
      <GeneratedPlate assetId="intro-galaxy" className="-z-10 opacity-20" />

      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-mineral bg-carbon p-8 text-center shadow-2xl shadow-black/60">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-alert/10">
            <svg
              className="h-8 w-8 text-alert"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">
            Member access
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ion-white">
            Sign-in didn&apos;t go through
          </h1>
          <p className="mt-3 text-sm leading-6 text-ion-1">{message}</p>
          <Link
            href="/auth/signin"
            className="mt-6 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-plasma px-4 py-3 text-sm font-semibold text-plasma-ink transition-colors hover:bg-plasma-glow"
          >
            Try sign-in again
          </Link>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-ion-1 transition-colors hover:text-ion-white"
          >
            &larr; Back to {BRAND_NAME}
          </Link>
        </div>
      </div>
    </div>
  );
}
