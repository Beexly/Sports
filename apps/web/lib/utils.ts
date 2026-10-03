import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatGameTime(date: Date | string): string {
  return format(new Date(date), "EEE, MMM d · h:mm a");
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function confidenceLabel(confidence: number): {
  label: string;
  color: string;
} {
  // Design-system tokens (dark-safe, on-brand) rather than raw Tailwind
  // green/blue/yellow — avoids the casino palette on any surface this is wired to.
  if (confidence >= 80) return { label: "Strong", color: "text-verify" };
  if (confidence >= 70) return { label: "Good", color: "text-orbital-cyan" };
  if (confidence >= 60) return { label: "Moderate", color: "text-caution" };
  return { label: "Lean", color: "text-ion-2" };
}
