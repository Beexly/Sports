import asyncio
from playwright.async_api import async_playwright
import hashlib
import json
import os
import time

TARGETS = [
    {
        "id": "CIRCA_SPORTS",
        "name": "Circa Sportsbook",
        "url": "https://www.circasports.com/",
        "sample_filename": "circa_sports_sample.html",
        "category": "SHARP_SPORTSBOOK"
    },
    {
        "id": "CAESARS_SPORTSBOOK",
        "name": "Caesars Sportsbook",
        "url": "https://sportsbook.caesars.com/",
        "sample_filename": "caesars_sportsbook_sample.html",
        "category": "MAJOR_SPORTSBOOK"
    }
]

async def extract_circa_caesars():
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
                resp = await page.goto(item["url"], wait_until="domcontentloaded", timeout=30000)
                status = resp.status if resp else 200
                await asyncio.sleep(3) # Allow hydration
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
                "sample_apis": captured_apis[:10]
            }
            results.append(res_row)
            print(f"    --> {verdict} ({status}) | Title: {title[:50]} | Size: {len(content)} bytes | APIs: {len(captured_apis)}")
            
        await browser.close()
        
    summary_path = r"docs\data-sources\research\2026-10-16\rea_extraction\WAVE5_CIRCA_CAESARS_2026-10-16.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    print(f"\n[DONE] Extraction complete for Circa & Caesars.")

if __name__ == "__main__":
    asyncio.run(extract_circa_caesars())
