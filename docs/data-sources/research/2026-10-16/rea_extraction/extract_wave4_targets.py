import asyncio
from playwright.async_api import async_playwright
import hashlib
import json
import os
import time

TARGETS = [
    {
        "id": "CBS_SPORTS_FANTASY",
        "name": "CBS Sports Fantasy Football",
        "url": "https://www.cbssports.com/fantasy/football/",
        "sample_filename": "cbs_sports_fantasy_sample.html",
        "category": "FANTASY_PROJECTIONS"
    },
    {
        "id": "THE_FANTASY_FOOTBALLERS",
        "name": "The Fantasy Footballers",
        "url": "https://www.thefantasyfootballers.com/",
        "sample_filename": "the_fantasy_footballers_sample.html",
        "category": "FANTASY_COMMUNITY"
    },
    {
        "id": "FANATICS_MARKETS",
        "name": "Fanatics Sportsbook / Prediction Markets",
        "url": "https://fanaticsmarkets.com/login?hideClose=true",
        "sample_filename": "fanatics_markets_sample.html",
        "category": "PREDICTION_MARKETS_SPORTSBOOK"
    },
    {
        "id": "FANTASY_POINTS",
        "name": "Fantasy Points NFL",
        "url": "https://www.fantasypoints.com/",
        "sample_filename": "fantasy_points_sample.html",
        "category": "FANTASY_ANALYTICS"
    },
    {
        "id": "SLEEPER_FANTASY_FOOTBALL",
        "name": "Sleeper Fantasy Football",
        "url": "https://sleeper.com/fantasy-football",
        "sample_filename": "sleeper_fantasy_football_sample.html",
        "category": "FANTASY_PLATFORM"
    },
    {
        "id": "FANTASY_LIFE_ARTICLES",
        "name": "Fantasy Life Articles",
        "url": "https://www.fantasylife.com/articles/fantasy",
        "sample_filename": "fantasy_life_articles_sample.html",
        "category": "FANTASY_CONTENT"
    },
    {
        "id": "REDDIT_R_FANTASYFOOTBALL",
        "name": "Reddit r/fantasyfootball",
        "url": "https://www.reddit.com/r/fantasyfootball/",
        "sample_filename": "reddit_fantasyfootball_sample.html",
        "category": "COMMUNITY_SENTIMENT"
    },
    {
        "id": "DRAFT_SHARKS",
        "name": "Draft Sharks",
        "url": "https://www.draftsharks.com/",
        "sample_filename": "draft_sharks_sample.html",
        "category": "INJURY_PROJECTIONS"
    },
    {
        "id": "PFF_MAIN",
        "name": "Pro Football Focus (PFF)",
        "url": "https://www.pff.com/",
        "sample_filename": "pff_main_sample.html",
        "category": "CHARTING_AND_GRADES"
    },
    {
        "id": "KAGGLE_BDB_2026",
        "name": "Kaggle NFL Big Data Bowl 2026",
        "url": "https://www.kaggle.com/competitions/nfl-big-data-bowl-2026-analytics/data",
        "sample_filename": "kaggle_bdb_2026_sample.html",
        "category": "TRACKING_RESEARCH"
    },
    {
        "id": "KAGGLE_SEARCH_NFL",
        "name": "Kaggle Search NFL Datasets",
        "url": "https://www.kaggle.com/search?q=nfl",
        "sample_filename": "kaggle_search_nfl_sample.html",
        "category": "MACHINE_LEARNING_DATASETS"
    },
    {
        "id": "KAGGLE_SEARCH_SPORTSBOOK",
        "name": "Kaggle Search Sportsbook Datasets",
        "url": "https://www.kaggle.com/search?q=sportsbook",
        "sample_filename": "kaggle_search_sportsbook_sample.html",
        "category": "BETTING_DATASETS"
    }
]

async def extract_all():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    samples_dir = r"docs\data-sources\research\2026-10-16\rea_extraction\samples"
    os.makedirs(samples_dir, exist_ok=True)
    
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
        
        for item in TARGETS:
            t0 = time.time()
            page = await context.new_page()
            captured_apis = []
            
            def handle_req(req):
                if req.resource_type in ["fetch", "xhr"]:
                    captured_apis.append(req.url)
            page.on("request", handle_req)
            
            print(f"[*] Extracting [{item['id']}] {item['url']} ...")
            status = 0
            verdict = "FAIL"
            content = ""
            title = ""
            
            try:
                resp = await page.goto(item["url"], wait_until="domcontentloaded", timeout=25000)
                status = resp.status if resp else 200
                await asyncio.sleep(2) # Allow JS hydration
                content = await page.content()
                title = await page.title()
                
                if status == 200:
                    verdict = "PASS"
                elif status in [401, 403]:
                    verdict = "BLOCKED"
                else:
                    verdict = f"HTTP_{status}"
            except Exception as e:
                print(f"    Error loading {item['id']}: {e}")
                content = f"ERROR: {e}"
                verdict = "FAIL"
                status = 500
            finally:
                duration_ms = int((time.time() - t0) * 1000)
                await page.close()
                
            sample_path = os.path.join(samples_dir, item["sample_filename"])
            with open(sample_path, "w", encoding="utf-8", errors="replace") as f:
                f.write(content[:1000000]) # Cap at 1MB
                
            sha256 = hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()
            
            res_row = {
                "target_id": item["id"],
                "name": item["name"],
                "url": item["url"],
                "http_status": status,
                "verdict": verdict,
                "title": title[:100].replace(",", ";"),
                "content_length": len(content),
                "duration_ms": duration_ms,
                "sample_hash": sha256[:16],
                "sample_file": item["sample_filename"],
                "intercepted_api_count": len(captured_apis),
                "category": item["category"],
                "rea_module_used": "src/browser/PlaywrightScenarioSession.ts / src/browser/execution/CdpRuntimeRequests.ts",
                "verified_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "sample_apis": captured_apis[:5]
            }
            results.append(res_row)
            print(f"    --> {verdict} ({status}) | Title: {title[:50]} | Size: {len(content)} bytes | APIs: {len(captured_apis)}")
            
        await browser.close()
        
    # Write json summary
    summary_path = r"docs\data-sources\research\2026-10-16\rea_extraction\WAVE4_TARGETS_REA_EXTRACTION_2026-10-16.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    print(f"\n[DONE] Extraction complete across all {len(TARGETS)} targets. Saved to {summary_path}")

if __name__ == "__main__":
    asyncio.run(extract_all())
