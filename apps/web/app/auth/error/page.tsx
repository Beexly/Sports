import Link from "next/link";

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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Sign-in didn&apos;t go through</h1>
          <p className="text-gray-400 mb-6">{message}</p>
          <Link
            href="/auth/signin"
            className="inline-block w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
          >
            Try sign-in again
          </Link>
          <Link
            href="/"
            className="inline-block mt-3 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
