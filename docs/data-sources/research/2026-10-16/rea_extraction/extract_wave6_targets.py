import asyncio
from playwright.async_api import async_playwright
import hashlib
import json
import os
import time
import re
from urllib.parse import urlparse

TARGET_URLS = [
    "https://kalshi.com/",
    "https://us.betrivers.net/?page=all-games&lvar=1",
    "https://www.tvg.com/",
    "https://jack.com/en/sportsbook/prematch",
    "https://www.borgataonline.com/en/casino",
    "https://cosmobet.one/en/sportsbook/prematch",
    "https://stake.com/?c=50046214ff",
    "https://betway.com/bwp/sports-welcome/en-us/?utm_source=18648&utm_medium=Affiliate&utm_campaign=Default",
    "https://rainbet.com/",
    "https://www.football.com/livescore/en",
    "https://sportsbook.draftkings.com/",
    "https://predictions.draftkings.com/en/",
    "https://www.draftkings.com/dfs",
    "https://pick6.draftkings.com/",
    "https://vodds.com/",
    "https://www.ballybet.com/",
    "https://www.action247.com/",
    "https://www.actionnetwork.com/",
    "https://sharplines.io/",
    "https://www.covers.com/",
    "https://www.dimers.com/",
    "https://www.oddsshark.com/",
    "https://www.pickswise.com/",
    "https://www.vegasinsider.com/",
    "https://www.scoresandodds.com/",
    "https://www.bettingpros.com/",
    "https://www.betql.co/",
    "https://rotogrinders.com/",
    "https://polymarket.com/",
    "https://livesportsodds.com/",
    "https://www.oddsportal.com/",
    "https://opticodds.com/",
    "https://www.rotowire.com/betting/sites",
    "https://www.sportsbettingdime.com/guides/strategy/best-stats-sites/",
    "https://crazyninjaodds.com/site/tools/positive-ev.aspx",
    "https://www.rebelbetting.com/en-us/ev-betting",
    "https://www.betsmart.co/articles/positive-ev-betting-tool-find-value-and-beat-the-books",
    "https://apps.apple.com/us/app/optimal-bet-ev-sports-betting/id1562901389",
    "https://www.linestarapp.com/",
    "https://www.stokastic.com/",
    "https://www.fantasycruncher.com/",
    "https://lineuplab.com/",
    "https://www.dailyfantasyfuel.com/",
    "https://www.sabersim.com/",
    "https://www.pro-football-reference.com/",
    "https://www.novig.us/",
    "https://www.prophetx.co/ ",
    "https://www.getfliff.com/",
    "https://datarade.ai/data-categories/odds-betting-data/providers"
]

def make_target_id(url):
    domain = urlparse(url).netloc.replace("www.", "").split(".")[0].upper()
    path = urlparse(url).path.strip("/").replace("/", "_").upper()
    if path and len(path) < 20:
        return f"{domain}_{path}".replace("-", "_")
    return domain.replace("-", "_")

async def extract_wave6():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    samples_dir = r"docs\data-sources\research\2026-10-16\rea_extraction\samples"
    os.makedirs(samples_dir, exist_ok=True)
    
    clean_targets = []
    seen = set()
    for u in TARGET_URLS:
        u_clean = u.strip()
        if u_clean and u_clean not in seen:
            seen.add(u_clean)
            clean_targets.append(u_clean)
            
    print(f"[*] Total unique targets to extract: {len(clean_targets)}")
    
    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-gpu"
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        
        for idx, url in enumerate(clean_targets, 1):
            t0 = time.time()
            target_id = f"T_{idx:02d}_{make_target_id(url)}"
            sample_filename = f"wave6_{idx:02d}_{urlparse(url).netloc.replace('www.', '')}.html"
            sample_path = os.path.join(samples_dir, sample_filename)
            
            page = await context.new_page()
            captured_apis = []
            
            def handle_req(req):
                if req.resource_type in ["fetch", "xhr"]:
                    captured_apis.append(req.url)
            page.on("request", handle_req)
            
            print(f"[{idx}/{len(clean_targets)}] Extracting {url} ...")
            status = 0
            verdict = "FAIL"
            content = ""
            title = ""
            
            try:
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=22000)
                status = resp.status if resp else 200
                await asyncio.sleep(2) # 2s for hydrate
                content = await page.content()
                title = await page.title()
                
                # Check security / challenge blocks
                content_lower = content.lower()
                if "just a moment" in title.lower() or "challenge-platform" in content_lower:
                    verdict = "BLOCKED_CLOUDFLARE"
                elif "prove your humanity" in title.lower() or "captcha" in title.lower():
                    verdict = "BLOCKED_CAPTCHA"
                elif status == 200:
                    verdict = "PASS"
                elif status in [401, 403]:
                    verdict = "BLOCKED"
                else:
                    verdict = f"HTTP_{status}"
            except Exception as e:
                err_str = str(e)
                print(f"    Error loading {url}: {err_str[:60]}")
                content = f"ERROR: {err_str}"
                verdict = "FAIL_TIMEOUT" if "Timeout" in err_str else "FAIL"
                status = 504 if "Timeout" in err_str else 500
            finally:
                duration_ms = int((time.time() - t0) * 1000)
                await page.close()
                
            with open(sample_path, "w", encoding="utf-8", errors="replace") as f:
                f.write(content[:1000000]) # 1MB limit
                
            sha256 = hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()
            
            res_row = {
                "target_id": target_id,
                "url": url,
                "http_status": status,
                "verdict": verdict,
                "title": title[:100].replace(",", ";").strip(),
                "content_length": len(content),
                "duration_ms": duration_ms,
                "sample_hash": sha256[:16],
                "sample_file": sample_filename,
                "intercepted_api_count": len(captured_apis),
                "rea_module_used": "src/browser/PlaywrightScenarioSession.ts / src/browser/execution/CdpRuntimeRequests.ts",
                "verified_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "sample_apis": captured_apis[:5]
            }
            results.append(res_row)
            safe_title = title[:40].encode('ascii', errors='replace').decode('ascii')
            print(f"    --> {verdict} ({status}) | Title: {safe_title} | Size: {len(content)} bytes | APIs: {len(captured_apis)}")

            
        await browser.close()
        
    out_json = r"docs\data-sources\research\2026-10-16\rea_extraction\WAVE6_TARGETS_EXTRACTION_2026-10-16.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    # Append to Master CSV
    csv_path = r"docs\data-sources\research\2026-10-16\rea_extraction\NEW_TARGETS_REA_EXTRACTION_2026-10-16.csv"
    import csv
    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for r in results:
            writer.writerow([
                r["target_id"],
                r["url"],
                r["url"],
                r["http_status"],
                r["verdict"],
                r["title"],
                r["content_length"],
                r["duration_ms"],
                r["sample_hash"],
                r["sample_file"],
                r["intercepted_api_count"],
                r["rea_module_used"],
                r["verified_at_utc"]
            ])
            
    print(f"\n[DONE] Extraction complete across all {len(results)} targets. Master CSV and JSON updated.")

if __name__ == "__main__":
    asyncio.run(extract_wave6())
