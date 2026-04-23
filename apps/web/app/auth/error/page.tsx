import Link from "next/link";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMessages: Record<string, string> = {
    Configuration: "Server configuration error. Please try again later.",
    AccessDenied: "Access was denied. You may not have permission to sign in.",
    Verification: "The sign-in link has expired or was already used.",
    OAuthSignin: "There was a problem starting Google sign-in. Please try again.",
    OAuthCallback: "Google sign-in was canceled or failed. Please try again.",
    OAuthCreateAccount: "We couldn't create your account from Google. Please try again.",
    OAuthAccountNotLinked:
      "This email is already associated with a different sign-in method. Use the original method.",
    EmailCreateAccount: "We couldn't create your account. Please try again.",
    EmailSignin: "The sign-in email could not be sent. Please try again.",
    Callback: "Sign-in callback failed. Please try again.",
    CredentialsSignin: "The sign-in credentials were invalid.",
    SessionRequired: "Please sign in to access this page.",
    Default: "An error occurred during sign-in. Please try again.",
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
          <h1 className="text-2xl font-bold text-white mb-3">Sign-In Error</h1>
          <p className="text-gray-400 mb-6">{message}</p>
          <Link
            href="/auth/signin"
            className="inline-block w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
          >
            Try Again
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
