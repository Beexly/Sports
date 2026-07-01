import { describe, it, expect } from "vitest";
import { jsonLdScript } from "@/lib/seo/json-ld";

describe("jsonLdScript (JSON-LD XSS hardening)", () => {
  it("escapes </script> so a dynamic value can't break out of the script tag", () => {
    const out = jsonLdScript({ name: "Bad</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("\\u003c"); // < is escaped
  });

  it("escapes <, >, and & to their \\uXXXX forms (no raw HTML metacharacters remain)", () => {
    const out = jsonLdScript({ a: "<", b: ">", c: "&" });
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u003e");
    expect(out).toContain("\\u0026");
    expect(out).not.toMatch(/[<>&]/);
  });

  it("is parser-transparent — round-trips to the original object", () => {
    // The escaped \\uXXXX decode back to <, >, & inside a JSON parser, so Google's
    // Rich Results reader sees identical data; only the HTML tokenizer is fooled.
    const obj = { "@type": "Article", name: "A < B & C > D", tags: ["x", "</script>"] };
    expect(JSON.parse(jsonLdScript(obj))).toEqual(obj);
  });
});
