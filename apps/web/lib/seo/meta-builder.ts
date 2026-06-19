/**
 * Next.js Metadata object builder helpers.
 * Pure functions that return partial Metadata objects for composing
 * in Next.js route generateMetadata() functions.
 */
import type { Metadata } from "next";

/** Convert a Date or ISO string to an ISO 8601 string. */
function toIso(date: Date | string): string {
  if (typeof date === "string") return date;
  return date.toISOString();
}

export function buildPageMeta(params: {
  title: string;
  description: string;
  url?: string;
  image?: string;
  siteName?: string;
  type?: "website" | "article";
  twitterCard?: "summary" | "summary_large_image";
}): Metadata {
  const {
    title,
    description,
    url,
    image,
    siteName,
    type = "website",
    twitterCard = "summary_large_image",
  } = params;

  const meta: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      type,
      ...(siteName !== undefined ? { siteName } : {}),
      ...(image !== undefined ? { images: [image] } : {}),
    },
    twitter: {
      card: twitterCard,
      title,
      description,
      ...(image !== undefined ? { images: [image] } : {}),
    },
  };

  if (url !== undefined) {
    meta.alternates = { canonical: url };
  }

  return meta;
}

export function buildPickMeta(params: {
  sport: string;
  homeTeam: string;
  awayTeam: string;
  confidence: number;
  tier: string;
  baseUrl?: string;
}): Metadata {
  const { sport, homeTeam, awayTeam, confidence, tier, baseUrl } = params;

  const title = `${homeTeam} vs ${awayTeam} — ${sport} Pick | Galaxy Sports Edge`;
  const description = `${tier} pick: ${homeTeam} vs ${awayTeam}. Confidence score ${confidence}%. Powered by Galaxy Sports Edge analytics.`;

  const meta: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };

  if (baseUrl !== undefined) {
    meta.alternates = { canonical: baseUrl };
  }

  return meta;
}

export function buildBlogMeta(params: {
  title: string;
  description: string;
  publishedAt: Date | string;
  authorName?: string;
  image?: string;
  url?: string;
}): Metadata {
  const { title, description, publishedAt, authorName, image, url } = params;

  const publishedTime = toIso(publishedAt);

  const meta: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime,
      ...(authorName !== undefined ? { authors: [authorName] } : {}),
      ...(image !== undefined ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image !== undefined ? { images: [image] } : {}),
    },
  };

  if (url !== undefined) {
    meta.alternates = { canonical: url };
  }

  return meta;
}
