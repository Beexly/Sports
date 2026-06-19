/**
 * SkipNav — skip to main content link for keyboard/screen reader users.
 * Visually hidden until focused, then appears as a prominent skip link.
 * Zero npm deps.
 */
"use client";

interface SkipNavProps {
  /** ID of the main content element to skip to (default: "main-content") */
  contentId?: string;
}

export function SkipNav({ contentId = "main-content" }: SkipNavProps): JSX.Element {
  return (
    <a
      href={`#${contentId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-[#9F87FF] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black focus:shadow-lg focus:outline-none"
    >
      Skip to main content
    </a>
  );
}
