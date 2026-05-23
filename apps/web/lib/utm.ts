export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

export function buildVaultSourceHref(source: string): string {
  const params = new URLSearchParams({ source });
  return `/vault?${params.toString()}`;
}
