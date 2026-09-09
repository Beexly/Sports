// design-sync shim: next/navigation hooks -> static values (no router in Claude Design).
export function usePathname(): string { return "/"; }
export function useSearchParams(): URLSearchParams { return new URLSearchParams(); }
export function useRouter() {
  return { push: () => {}, replace: () => {}, back: () => {}, forward: () => {}, refresh: () => {}, prefetch: () => {} };
}
export function useParams(): Record<string, string> { return {}; }
export function redirect(): never { throw new Error("redirect() is not available in design previews"); }
export function notFound(): never { throw new Error("notFound() is not available in design previews"); }
