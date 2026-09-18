import { describe, expect, it } from "vitest";
import { RotoWireClient, ROTOWIRE_RSS_SOURCE_ID } from "../rotowire-rss-client.js";

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>RotoWire NFL News</title>
    <item>
      <title><![CDATA[Jameson Williams: Retains modest role in loss]]></title>
      <pubDate>Thu, 17 Sep 2026 9:54:00 PM PDT</pubDate>
      <link>https://www.rotowire.com/football/player.php?id=18001</link>
    </item>
    <item>
      <title>Plain headline without CDATA: roster move</title>
      <pubDate>Thu, 17 Sep 2026 8:00:00 PM PDT</pubDate>
      <link>https://www.rotowire.com/football/player.php?id=18002</link>
    </item>
  </channel>
</rss>`;

const EMPTY_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>RotoWire NFL News</title></channel></rss>`;

function okFetch(body: string) {
  return (async (_url: unknown) => new Response(body, { status: 200 })) as unknown as typeof fetch;
}

describe("RotoWire RSS", () => {
  it("parses the verified Jameson Williams item exactly", async () => {
    const client = new RotoWireClient(okFetch(RSS_FIXTURE));
    const items = await client.getNflNews();
    expect(items).toHaveLength(2);
    const first = items[0];
    expect(first?.title).toBe("Jameson Williams: Retains modest role in loss");
    expect(first?.pubDate).toBe("Thu, 17 Sep 2026 9:54:00 PM PDT");
    expect(first?.link).toBe("https://www.rotowire.com/football/player.php?id=18001");
  });

  it("handles non-CDATA titles too", async () => {
    const client = new RotoWireClient(okFetch(RSS_FIXTURE));
    const items = await client.getNflNews();
    expect(items[1]?.title).toBe("Plain headline without CDATA: roster move");
    expect(items[1]?.pubDate).toBe("Thu, 17 Sep 2026 8:00:00 PM PDT");
  });

  it("returns [] for a feed with no items", async () => {
    const client = new RotoWireClient(okFetch(EMPTY_RSS));
    expect(await client.getNflNews()).toEqual([]);
  });

  it("carries the registered source id", () => {
    expect(ROTOWIRE_RSS_SOURCE_ID).toBe("rotowire-rss");
  });
});
