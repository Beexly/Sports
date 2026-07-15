const INTERNAL_FANTASY_PREFIXES = ["/fantasy/studio"] as const;

function isPathOrChild(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isPublicFantasyToolPath(pathname: string): boolean {
  if (isPathOrChild(pathname, "/optimizer")) return true;
  if (!pathname.startsWith("/fantasy/")) return false;

  return !INTERNAL_FANTASY_PREFIXES.some((route) => isPathOrChild(pathname, route));
}

export function fantasyGateDestination(pathname: string): string {
  const params = new URLSearchParams({ from: pathname });
  return `/fantasy?${params.toString()}`;
}
