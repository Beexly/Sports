import asyncio
from playwright.async_api import async_playwright
import hashlib
import json
import os
import time

PAGE2_URL = "https://arxiv.org/search/?searchtype=all&query=nfl&abstracts=show&size=200&order=-announced_date_first&start=200"

async def extract_page2():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    samples_dir = r"docs\arxiv-program\research\2026-10-17\samples"
    os.makedirs(samples_dir, exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-gpu"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()
        print(f"[*] Extracting arXiv NFL Page 2 (items 201-400): {PAGE2_URL} ...")
        
        try:
            resp = await page.goto(PAGE2_URL, wait_until="domcontentloaded", timeout=35000)
            status = resp.status if resp else 200
            await asyncio.sleep(2)
            content = await page.content()
            
            results = await page.evaluate('''() => {
                const items = [];
                const results = document.querySelectorAll('li.arxiv-result');
                results.forEach(res => {
                    const titleEl = res.querySelector('p.title');
                    const title = titleEl ? titleEl.innerText.trim() : '';
                    const linkEl = res.querySelector('p.list-title a');
                    const link = linkEl ? linkEl.href : '';
                    const id = link ? link.split('/abs/').pop() : '';
                    const authors = Array.from(res.querySelectorAll('p.authors a')).map(a => a.innerText.trim());
                    const abstractEl = res.querySelector('span.abstract-full');
                    const abstract = abstractEl ? abstractEl.innerText.trim() : '';
                    const dateEl = res.querySelector('p.is-size-7');
                    const date = dateEl ? dateEl.innerText.trim() : '';
                    if (title) {
                        items.push({ id, title, link, authors, date, abstract: abstract.slice(0, 500) });
                    }
                });
                return items;
            }''')
            
            sha256 = hashlib.sha256(content.encode('utf-8')).hexdigest()
            sample_file = "arxiv_nfl_search_size200_start200.html"
            with open(os.path.join(samples_dir, sample_file), "w", encoding="utf-8", errors="replace") as f:
                f.write(content)
                
            out_file = r"docs\arxiv-program\research\2026-10-17\ARXIV_NFL_PAGE2_EXTRACTION_2026-10-17.json"
            catalog = {
                "url": PAGE2_URL,
                "status": status,
                "item_count": len(results),
                "results": results,
                "sample_hash": sha256[:16],
                "sample_file": sample_file,
                "rea_module_used": "src/browser/PlaywrightScenarioSession.ts / src/browser/execution/CdpRuntimeRequests.ts",
                "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(catalog, f, indent=2)
                
            print(f"[+] Successfully extracted {len(results)} items from Page 2 to {out_file}")
        except Exception as e:
            print(f"Error extracting page 2: {e}")
        finally:
            await page.close()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(extract_page2())
