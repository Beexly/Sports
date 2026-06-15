import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

interface SignInPageProps {
  searchParams: { callbackUrl?: string; error?: string };
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();

  // Already signed in — redirect to callbackUrl or dashboard
  if (session?.user) {
    redirect(searchParams.callbackUrl ?? "/dashboard");
  }

  const errorMessage = getErrorMessage(searchParams.error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-obsidian px-4">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 overflow-hidden blur-3xl"
        aria-hidden="true"
      >
        <div className="relative left-1/2 aspect-[1155/678] w-[36rem] -translate-x-1/2 bg-gradient-to-tr from-brand-700 to-blue-600 opacity-10" />
      </div>

      {/* Logo */}
      <Link href="/" className="group mb-10 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 transition-colors group-hover:bg-brand-500">
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
            />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          {BRAND_NAME}
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-titanium bg-carbon p-8 shadow-2xl shadow-black/60">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Sign in to Galaxy Sports Edge</h1>
          <p className="mt-1.5 text-sm text-ion-2">
            Pick up where you left the signal.
          </p>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="mb-5 rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-3">
            <p className="text-center text-sm text-red-400">{errorMessage}</p>
          </div>
        )}

        {/* Google OAuth form — server action */}
        <form
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo: searchParams.callbackUrl ?? "/dashboard",
            });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-titanium bg-white px-4 py-3 text-sm font-semibold text-eclipse shadow-sm transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {/* Google logo SVG */}
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-titanium" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-carbon px-3 text-ion-2">
              Email sign-in coming soon
            </span>
          </div>
        </div>

        {/* Legal */}
        <p className="text-center text-xs leading-relaxed text-ion-2">
          By signing in you agree to our{" "}
          <Link
            href="/terms"
            className="text-ion-3 underline underline-offset-2 hover:text-ion-1"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-ion-3 underline underline-offset-2 hover:text-ion-1"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {/* Back to home */}
      <Link
        href="/"
        className="mt-8 text-sm text-ion-2 transition-colors hover:text-ion-2"
      >
        &larr; Back to {BRAND_NAME}
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getErrorMessage(error?: string): string | null {
  switch (error) {
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCreateAccount":
      return "Google sign-in didn't go through. Give it another shot.";
    case "OAuthAccountNotLinked":
      return "That email's already linked to a different sign-in method.";
    case "SessionRequired":
      return "Please sign in to keep going.";
    case "AccessDenied":
      return "You don't have access to that page yet.";
    case "Verification":
      return "That sign-in link's expired. Request a fresh one.";
    default:
      return error ? "Something didn't go through. Try again." : null;
  }
}
