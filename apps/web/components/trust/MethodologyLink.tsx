import Link from "next/link";

interface Props {
  href?: string;
  label?: string;
  className?: string;
}

export function MethodologyLink({
  href = "/methodology",
  label = "Methodology",
  className = "",
}: Props) {
  return (
    <Link
      href={href}
      className={[
        "font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500 hover:text-gray-300 transition-colors underline-offset-2 hover:underline",
        className,
      ].join(" ")}
      aria-label="View Galaxy methodology"
    >
      {label}
    </Link>
  );
}
