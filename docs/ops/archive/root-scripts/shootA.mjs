import { chromium } from "playwright";
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
const shots = [
  ["/academy?intro=skip", "a1-academy-top", 0],
  ["/academy?intro=skip", "a2-academy-game", 2600],
  ["/pricing?intro=skip", "a3-pricing", 350],
  ["/fantasy/contests?intro=skip", "a4-contests-seal", 0],
  ["/fantasy/dfs?intro=skip", "a5-dfs-suite", 300],
  ["/trends?intro=skip", "a6-trends-sealed", 0],
  ["/track?intro=skip", "a7-track-sealed", 0],
];
for (const [path, name, scroll] of shots) {
  await pg.goto("http://localhost:3900" + path, { waitUntil: "networkidle" });
  await pg.waitForTimeout(900);
  if (scroll) { await pg.mouse.wheel(0, scroll); await pg.waitForTimeout(600); }
  await pg.screenshot({ path: `/tmp/${name}.png` });
}
await b.close();
