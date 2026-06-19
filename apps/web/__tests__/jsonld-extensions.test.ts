import { describe, expect, it } from "vitest";
import { buildArticleSchema, buildClaimReviewSchema, buildItemListSchema } from "../lib/seo/sports-jsonld";

describe("buildArticleSchema", () => {
  it("builds a valid Article schema", () => {
    const schema = buildArticleSchema({
      headline: "Test Article",
      description: "Test description",
      url: "https://example.com/article",
      datePublished: "2026-06-19",
    });
    expect(schema["@type"]).toBe("Article");
    expect(schema.headline).toBe("Test Article");
    expect(schema["@context"]).toBe("https://schema.org");
  });
  it("includes image when provided", () => {
    const schema = buildArticleSchema({
      headline: "Test",
      description: "Desc",
      url: "https://example.com",
      datePublished: "2026-06-19",
      imageUrl: "https://example.com/image.jpg",
    });
    expect(schema.image).toBeDefined();
  });
});

describe("buildItemListSchema", () => {
  it("builds a valid ItemList schema", () => {
    const schema = buildItemListSchema({
      name: "Today's Picks",
      description: "Pick board",
      url: "https://example.com/board",
      items: [{ name: "Pick 1", url: "https://example.com/pick/1", position: 1 }],
    });
    expect(schema["@type"]).toBe("ItemList");
    expect(schema.numberOfItems).toBe(1);
    expect(schema.itemListElement).toHaveLength(1);
  });
});

describe("buildClaimReviewSchema", () => {
  it("builds a valid ClaimReview schema", () => {
    const schema = buildClaimReviewSchema({
      claimText: "Test claim",
      reviewUrl: "https://example.com/pick/1",
      datePublished: "2026-06-19",
      ratingValue: 5,
    });
    expect(schema["@type"]).toBe("ClaimReview");
    expect(schema.reviewRating.ratingValue).toBe(5);
  });
});
