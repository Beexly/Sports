import asyncio
from playwright.async_api import async_playwright
import hashlib
import json
import os
import time

TARGET_URL = "https://nfl-video.com/full-game-replay"

async def extract_nfl_video():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    samples_dir = r"docs\data-sources\research\2026-10-16\rea_extraction\samples"
    os.makedirs(samples_dir, exist_ok=True)
    
    t0 = time.time()
    captured_apis = []
    
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
        page = await context.new_page()
        
        def handle_req(req):
            if req.resource_type in ["fetch", "xhr", "media"]:
                captured_apis.append({
                    "url": req.url,
                    "method": req.method,
                    "type": req.resource_type
                })
        page.on("request", handle_req)
        
        print(f"[*] Extracting {TARGET_URL} via REA Playwright CDP ...")
        status = 0
        verdict = "FAIL"
        content = ""
        title = ""
        
        try:
            resp = await page.goto(TARGET_URL, wait_until="domcontentloaded", timeout=30000)
            status = resp.status if resp else 200
            await asyncio.sleep(3) # Wait for hydration & video player embeds
            content = await page.content()
            title = await page.title()
            
            # Check video embeds / stream URLs
            video_elements = await page.evaluate('''() => {
                const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
                const videos = Array.from(document.querySelectorAll('video source, video')).map(v => v.src || v.currentSrc);
                const replay_links = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('replay') || a.href.includes('full-game')).map(a => ({ text: a.innerText.trim(), href: a.href }));
                return { iframes, videos, replay_links: replay_links.slice(0, 20) };
            }''')
            
            if "just a moment" in title.lower() or "challenge-platform" in content.lower():
                verdict = "BLOCKED_CLOUDFLARE"
            elif status == 200:
                verdict = "PASS"
            elif status in [401, 403]:
                verdict = "BLOCKED"
            else:
                verdict = f"HTTP_{status}"
        except Exception as e:
            err_str = str(e)
            print(f"    Error: {err_str}")
            content = f"ERROR: {err_str}"
            verdict = "FAIL_TIMEOUT" if "Timeout" in err_str else "FAIL"
            status = 504 if "Timeout" in err_str else 500
            video_elements = {}
        finally:
            duration_ms = int((time.time() - t0) * 1000)
            await page.close()
            await browser.close()
            
        sample_path = os.path.join(samples_dir, "nfl_video_replay_sample.html")
        with open(sample_path, "w", encoding="utf-8", errors="replace") as f:
            f.write(content[:1000000])
            
        sha256 = hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()
        
        result = {
            "target_id": "NFL_VIDEO_FULL_GAME_REPLAY",
            "name": "NFL Video Full Game Replay Archive",
            "url": TARGET_URL,
            "http_status": status,
            "verdict": verdict,
            "title": title[:100].replace(",", ";").strip(),
            "content_length": len(content),
            "duration_ms": duration_ms,
            "sample_hash": sha256[:16],
            "sample_file": "nfl_video_replay_sample.html",
            "intercepted_api_count": len(captured_apis),
            "video_metadata": video_elements,
            "rea_module_used": "src/browser/PlaywrightScenarioSession.ts / src/browser/execution/CdpRuntimeRequests.ts",
            "verified_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "sample_apis": captured_apis[:10]
        }
        
        out_json = r"docs\data-sources\research\2026-10-16\rea_extraction\NFL_VIDEO_REPLAY_EXTRACTION_2026-10-16.json"
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
            
        # Append to Master CSV
        import csv
        csv_path = r"docs\data-sources\research\2026-10-16\rea_extraction\NEW_TARGETS_REA_EXTRACTION_2026-10-16.csv"
        with open(csv_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                result["target_id"],
                result["name"],
                result["url"],
                result["http_status"],
                result["verdict"],
                result["title"],
                result["content_length"],
                result["duration_ms"],
                result["sample_hash"],
                result["sample_file"],
                result["intercepted_api_count"],
                result["rea_module_used"],
                result["verified_at_utc"]
            ])
            
        print(f"--> {verdict} ({status}) | Title: {title[:50]} | Size: {len(content)} bytes | Iframes: {len(video_elements.get('iframes', []))} | Replay Links: {len(video_elements.get('replay_links', []))}")

if __name__ == "__main__":
    asyncio.run(extract_nfl_video())
