export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

export type ShortFormUtmSource =
  | "youtube"
  | "tiktok"
  | "x"
  | "instagram"
  | "internal";

export type ShortFormUtmCampaign =
  | "loss_room_30"
  | "why_we_passed"
  | "methodology_minute"
  | "model_journal_excerpt"
  | "almanac_desk"
  | "live_overlay_demo";

export type ShortFormUtmParams = {
  utmSource: ShortFormUtmSource;
  utmMedium: "short_form";
  utmCampaign: ShortFormUtmCampaign;
  utmContent: string;
};

export type ShortFormUtmParseResult =
  | {
      ok: true;
      params: ShortFormUtmParams;
    }
  | {
      ok: false;
      errors: string[];
    };

const SHORT_FORM_SOURCES: readonly ShortFormUtmSource[] = [
  "youtube",
  "tiktok",
  "x",
  "instagram",
  "internal",
];

const SHORT_FORM_CAMPAIGNS: readonly ShortFormUtmCampaign[] = [
  "loss_room_30",
  "why_we_passed",
  "methodology_minute",
  "model_journal_excerpt",
  "almanac_desk",
  "live_overlay_demo",
];

export function buildVaultSourceHref(source: string): string {
  const params = new URLSearchParams({ source });
  return `/vault?${params.toString()}`;
}

function readUtmValue(input: URLSearchParams | UtmParams, key: keyof UtmParams) {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? "";
  }

  return input[key] ?? "";
}

function isShortFormSource(value: string): value is ShortFormUtmSource {
  return SHORT_FORM_SOURCES.includes(value as ShortFormUtmSource);
}

function isShortFormCampaign(value: string): value is ShortFormUtmCampaign {
  return SHORT_FORM_CAMPAIGNS.includes(value as ShortFormUtmCampaign);
}

export function parseShortFormUtmParams(
  input: URLSearchParams | UtmParams,
): ShortFormUtmParseResult {
  const utmSource = readUtmValue(input, "utm_source");
  const utmMedium = readUtmValue(input, "utm_medium");
  const utmCampaign = readUtmValue(input, "utm_campaign");
  const utmContent = readUtmValue(input, "utm_content");
  const errors: string[] = [];
  const normalizedSource = isShortFormSource(utmSource) ? utmSource : null;
  const normalizedCampaign = isShortFormCampaign(utmCampaign)
    ? utmCampaign
    : null;

  if (!normalizedSource) {
    errors.push("utm_source is not allowed.");
  }

  if (utmMedium !== "short_form") {
    errors.push("utm_medium must be short_form.");
  }

  if (!normalizedCampaign) {
    errors.push("utm_campaign is not allowed.");
  }

  if (!/^SFC-\d{3}$/.test(utmContent)) {
    errors.push("utm_content must use an SFC-000 draft id.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    params: {
      utmSource: normalizedSource ?? "internal",
      utmMedium: "short_form",
      utmCampaign: normalizedCampaign ?? "methodology_minute",
      utmContent,
    },
  };
}
