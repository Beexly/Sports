/**
 * JSON-LD structured data builders for sports content.
 * Schema.org types: SportsEvent, Article, BreadcrumbList, FAQPage, WebSite.
 * Pure functions; no DOM access.
 */

export interface SportsEventSchema {
  "@context": "https://schema.org";
  "@type": "SportsEvent";
  name: string;
  startDate: string; // ISO 8601
  location?: { "@type": "Place"; name: string };
  homeTeam?: { "@type": "SportsTeam"; name: string };
  awayTeam?: { "@type": "SportsTeam"; name: string };
  sport?: string;
  url?: string;
  description?: string;
}

export interface ArticleSchema {
  "@context": "https://schema.org";
  "@type": "Article";
  headline: string;
  description?: string;
  datePublished: string;
  dateModified?: string;
  author?: { "@type": "Person" | "Organization"; name: string };
  publisher?: {
    "@type": "Organization";
    name: string;
    logo?: { "@type": "ImageObject"; url: string };
  };
  image?: string;
  url?: string;
}

export interface BreadcrumbSchema {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item?: string;
  }>;
}

export interface FAQSchema {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
}

export interface WebSiteSchema {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    "@type": "SearchAction";
    target: string;
    "query-input": string;
  };
}

/** Convert a Date or ISO string to an ISO 8601 string. */
function toIso(date: Date | string): string {
  if (typeof date === "string") return date;
  return date.toISOString();
}

export function buildSportsEvent(params: {
  name: string;
  startDate: Date | string;
  homeTeam?: string;
  awayTeam?: string;
  sport?: string;
  location?: string;
  url?: string;
  description?: string;
}): SportsEventSchema {
  const schema: SportsEventSchema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: params.name,
    startDate: toIso(params.startDate),
  };

  if (params.location !== undefined) {
    schema.location = { "@type": "Place", name: params.location };
  }
  if (params.homeTeam !== undefined) {
    schema.homeTeam = { "@type": "SportsTeam", name: params.homeTeam };
  }
  if (params.awayTeam !== undefined) {
    schema.awayTeam = { "@type": "SportsTeam", name: params.awayTeam };
  }
  if (params.sport !== undefined) {
    schema.sport = params.sport;
  }
  if (params.url !== undefined) {
    schema.url = params.url;
  }
  if (params.description !== undefined) {
    schema.description = params.description;
  }

  return schema;
}

export function buildArticle(params: {
  headline: string;
  description?: string;
  datePublished: Date | string;
  dateModified?: Date | string;
  authorName?: string;
  authorType?: "Person" | "Organization";
  publisherName?: string;
  publisherLogo?: string;
  image?: string;
  url?: string;
}): ArticleSchema {
  const schema: ArticleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.headline,
    datePublished: toIso(params.datePublished),
  };

  if (params.description !== undefined) {
    schema.description = params.description;
  }
  if (params.dateModified !== undefined) {
    schema.dateModified = toIso(params.dateModified);
  }
  if (params.authorName !== undefined) {
    schema.author = {
      "@type": params.authorType ?? "Person",
      name: params.authorName,
    };
  }
  if (params.publisherName !== undefined) {
    schema.publisher = {
      "@type": "Organization",
      name: params.publisherName,
      ...(params.publisherLogo !== undefined
        ? { logo: { "@type": "ImageObject", url: params.publisherLogo } }
        : {}),
    };
  }
  if (params.image !== undefined) {
    schema.image = params.image;
  }
  if (params.url !== undefined) {
    schema.url = params.url;
  }

  return schema;
}

export function buildBreadcrumb(
  items: ReadonlyArray<{ name: string; url?: string }>
): BreadcrumbSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const entry: BreadcrumbSchema["itemListElement"][number] = {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
      };
      if (item.url !== undefined) {
        entry.item = item.url;
      }
      return entry;
    }),
  };
}

export function buildFAQ(
  items: ReadonlyArray<{ question: string; answer: string }>
): FAQSchema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function buildWebSite(params: {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
}): WebSiteSchema {
  const schema: WebSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: params.name,
    url: params.url,
  };

  if (params.description !== undefined) {
    schema.description = params.description;
  }
  if (params.searchUrl !== undefined) {
    schema.potentialAction = {
      "@type": "SearchAction",
      target: params.searchUrl + "{search_term_string}",
      "query-input": "required name=search_term_string",
    };
  }

  return schema;
}

/** Returns the JSON.stringify of the schema with 2-space indent (for `<script>` tag content). */
export function jsonLdScript(schema: Record<string, unknown>): string {
  return JSON.stringify(schema, null, 2);
}

/** Returns a JSON array of all schemas as a string (for a single combined script tag). */
export function combinedSchema(
  schemas: readonly Record<string, unknown>[]
): string {
  return JSON.stringify(schemas, null, 2);
}
