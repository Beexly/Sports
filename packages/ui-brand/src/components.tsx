import type { CSSProperties, ReactNode } from "react";
import { colors, identity, microcopy, pickGrades, type PickGradeKey } from "@sports/brand";

type Size = "sm" | "md" | "lg";

const sizePx: Record<Size, number> = { sm: 28, md: 40, lg: 56 };

export function GalaxyMark({
  size = "md",
  title = `${identity.productName} mark`,
}: {
  size?: Size;
  title?: string;
}) {
  const px = sizePx[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      fill="none"
    >
      <path d="M11 38C8 25 18 12 32 12c9.8 0 18 6.7 20.3 15.7" stroke={colors.ionBlue} strokeWidth="3" strokeLinecap="round" />
      <path d="M53 25c3 13-7 27-21 27-8.7 0-16.2-5.4-19.3-13" stroke={colors.ultraviolet} strokeWidth="3" strokeLinecap="round" />
      <path d="M10 16l44 34" stroke={colors.plasmaMagenta} strokeWidth="4" strokeLinecap="round" />
      <path d="M18 51l30-39" stroke={colors.ionBlue} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="34" cy="30" r="6" fill={colors.deepSpace} stroke={colors.text} strokeWidth="3" />
      <circle cx="48" cy="15" r="3" fill={colors.plasmaMagenta} />
    </svg>
  );
}

export function Wordmark({
  variant = "inline",
}: {
  variant?: "inline" | "stacked" | "minimal";
}) {
  if (variant === "minimal") {
    return <span style={wordmarkStyle}>GSE</span>;
  }
  return (
    <span
      style={{
        ...wordmarkStyle,
        display: "inline-flex",
        flexDirection: variant === "stacked" ? "column" : "row",
        gap: variant === "stacked" ? 0 : 6,
        lineHeight: 1,
      }}
    >
      <span>Galaxy</span>
      <span style={{ color: colors.ionBlue }}>Sports Edge</span>
    </span>
  );
}

const wordmarkStyle: CSSProperties = {
  color: colors.text,
  fontFamily: '"Exo 2", Inter, ui-sans-serif, system-ui, sans-serif',
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

export function PickGradeTile({
  grade,
  size = "md",
  variant = "filled",
}: {
  grade: PickGradeKey;
  size?: Size;
  variant?: "filled" | "outline";
}) {
  const meta = pickGrades[grade];
  const filled = variant === "filled";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        border: `1px solid ${meta.color}`,
        background: filled ? meta.color : "transparent",
        color: filled ? colors.deepSpace : meta.color,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        fontSize: size === "sm" ? 11 : size === "md" ? 13 : 15,
        fontWeight: 800,
        padding: size === "sm" ? "3px 8px" : size === "md" ? "5px 10px" : "7px 12px",
      }}
    >
      {meta.label}
    </span>
  );
}

export function ConfidenceMeter({
  value,
  grade,
}: {
  value: number;
  grade: PickGradeKey;
}) {
  const normalized = Math.max(0, Math.min(100, value));
  const color = pickGrades[grade].color;
  return (
    <div
      aria-label={`Confidence ${normalized} out of 100`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalized}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: 74,
        height: 74,
        borderRadius: 999,
        background: `conic-gradient(${color} ${normalized * 3.6}deg, ${colors.line} 0deg)`,
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 58,
          height: 58,
          borderRadius: 999,
          background: colors.deepSpace,
          color: colors.text,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 900,
        }}
      >
        {normalized}
      </span>
    </div>
  );
}

export function EdgeIndexBadge({ value }: { value: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        gap: 6,
        alignItems: "baseline",
        color: colors.text,
        fontWeight: 800,
      }}
    >
      <span style={{ color: colors.plasmaMagenta, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <span style={{ color: colors.muted, fontSize: 12 }}>/100 Edge Index</span>
    </span>
  );
}

export function TabularNum({ children }: { children: ReactNode }) {
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{children}</span>;
}

export function Disclaimer({
  variant = "standard",
}: {
  variant?: keyof typeof microcopy.disclaimer;
}) {
  return <p style={{ color: colors.muted, fontSize: 12 }}>{microcopy.disclaimer[variant]}</p>;
}

function StateShell({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.line}`,
        borderRadius: 12,
        background: colors.panel,
        color: colors.text,
        padding: 20,
      }}
    >
      <strong>{title}</strong>
      <p style={{ color: colors.muted, marginBottom: 0 }}>{body}</p>
    </div>
  );
}

export function EmptyState() {
  return <StateShell title={microcopy.empty.title} body={microcopy.empty.body} />;
}

export function ErrorState() {
  return <StateShell title={microcopy.error.title} body={microcopy.error.body} />;
}

export function LoadingState() {
  return <StateShell title={microcopy.loading.title} body={microcopy.loading.body} />;
}

export function SiteHeader() {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <GalaxyMark />
      <Wordmark />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer style={{ color: colors.muted, fontSize: 12 }}>
      {new Date().getFullYear()} {identity.legalName}. {microcopy.disclaimer.short}
    </footer>
  );
}
