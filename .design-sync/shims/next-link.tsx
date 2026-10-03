// design-sync shim: next/link -> plain anchor (Claude Design renders outside Next.js).
import * as React from "react";
type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string | { pathname?: string; query?: Record<string, string> };
  prefetch?: boolean; replace?: boolean; scroll?: boolean; shallow?: boolean; locale?: string | false;
};
const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch, replace, scroll, shallow, locale, children, ...rest }, ref,
) {
  const h = typeof href === "string" ? href : href.pathname ?? "#";
  return <a ref={ref} href={h} {...rest}>{children}</a>;
});
export default Link;
