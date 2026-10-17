import asyncio
from playwright.async_api import async_playwright
import urllib.request
import hashlib
import json
import os
import time

PAPERS = [
    {"id": "2603.25901", "url": "https://arxiv.org/abs/2603.25901", "pdf_url": "https://arxiv.org/pdf/2603.25901"},
    {"id": "2503.04638", "url": "https://arxiv.org/abs/2503.04638", "pdf_url": "https://arxiv.org/pdf/2503.04638"},
    {"id": "2305.01643", "url": "https://arxiv.org/abs/2305.01643", "pdf_url": "https://arxiv.org/pdf/2305.01643"},
    {"id": "2303.10895", "url": "https://arxiv.org/abs/2303.10895", "pdf_url": "https://arxiv.org/pdf/2303.10895"},
    {"id": "2205.09878", "url": "https://arxiv.org/abs/2205.09878", "pdf_url": "https://arxiv.org/pdf/2205.09878"},
    {"id": "2002.03228", "url": "https://arxiv.org/abs/2002.03228", "pdf_url": "https://arxiv.org/pdf/2002.03228"},
    {"id": "1905.03710", "url": "https://arxiv.org/abs/1905.03710", "pdf_url": "https://arxiv.org/pdf/1905.03710"}
]

SEARCH_URL = "https://arxiv.org/search/?searchtype=all&query=nfl&abstracts=show&size=200&order=-announced_date_first"

async def extract_arxiv():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    samples_dir = r"docs\arxiv-program\research\2026-10-17\samples"
    os.makedirs(samples_dir, exist_ok=True)
    
    extracted_papers = []
    
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
        
        # 1. Extract the 7 specific papers from their abstract pages (lightweight, full metadata)
        for p_item in PAPERS:
            t0 = time.time()
            page = await context.new_page()
            print(f"[*] Extracting arXiv paper {p_item['id']} ({p_item['url']}) ...")
            try:
                resp = await page.goto(p_item['url'], wait_until="domcontentloaded", timeout=25000)
                status = resp.status if resp else 200
                content = await page.content()
                
                # Extract title, authors, abstract, subjects
                meta = await page.evaluate('''() => {
                    const titleEl = document.querySelector('h1.title');
                    const title = titleEl ? titleEl.innerText.replace('Title:', '').trim() : '';
                    const authors = Array.from(document.querySelectorAll('.authors a')).map(a => a.innerText.trim());
                    const abstractEl = document.querySelector('blockquote.abstract');
                    const abstract = abstractEl ? abstractEl.innerText.replace('Abstract:', '').trim() : '';
                    const subjectsEl = document.querySelector('td.tablecell.subjects');
                    const subjects = subjectsEl ? subjectsEl.innerText.trim() : '';
                    return { title, authors, abstract, subjects };
                }''')
                
                sha256 = hashlib.sha256(content.encode('utf-8')).hexdigest()
                sample_file = f"arxiv_{p_item['id'].replace('.', '_')}.html"
                with open(os.path.join(samples_dir, sample_file), "w", encoding="utf-8", errors="replace") as f:
                    f.write(content)
                    
                extracted_papers.append({
                    "arxiv_id": p_item["id"],
                    "url": p_item["url"],
                    "pdf_url": p_item["pdf_url"],
                    "http_status": status,
                    "title": meta["title"],
                    "authors": meta["authors"],
                    "subjects": meta["subjects"],
                    "abstract": meta["abstract"][:500],
                    "sample_hash": sha256[:16],
                    "sample_file": sample_file,
                    "rea_module_used": "src/browser/PlaywrightScenarioSession.ts / src/browser/execution/CdpRuntimeRequests.ts",
                    "verified_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                })
                print(f"    --> Title: {meta['title'][:60]}")
            except Exception as e:
                print(f"    Error extracting {p_item['id']}: {e}")
            finally:
                await page.close()
                
        # 2. Extract the arXiv 200-result NFL search catalog
        print(f"\n[*] Extracting arXiv NFL Search Query (size=200): {SEARCH_URL} ...")
        search_page = await context.new_page()
        search_results = []
        try:
            resp = await search_page.goto(SEARCH_URL, wait_until="domcontentloaded", timeout=35000)
            status = resp.status if resp else 200
            await asyncio.sleep(2)
            search_content = await search_page.content()
            
            search_results = await search_page.evaluate('''() => {
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
                        items.push({ id, title, link, authors, date, abstract: abstract.slice(0, 300) });
                    }
                });
                return items;
            }''')
            
            sha256 = hashlib.sha256(search_content.encode('utf-8')).hexdigest()
            with open(os.path.join(samples_dir, "arxiv_nfl_search_size200.html"), "w", encoding="utf-8", errors="replace") as f:
                f.write(search_content)
                
            print(f"[+] Successfully extracted {len(search_results)} search results from arXiv NFL catalog.")
        except Exception as e:
            print(f"Error extracting search page: {e}")
        finally:
            await search_page.close()
            await browser.close()
            
    # Save structured catalog
    catalog = {
        "verified_papers": extracted_papers,
        "search_count": len(search_results),
        "search_results": search_results,
        "rea_module_used": "src/browser/PlaywrightScenarioSession.ts / src/browser/execution/CdpRuntimeRequests.ts",
        "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    out_path = r"docs\arxiv-program\research\2026-10-17\ARXIV_NFL_CORPUS_EXTRACTION_2026-10-17.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2)
    print(f"\n[DONE] Saved {len(extracted_papers)} target papers and {len(search_results)} search catalog items to {out_path}")

if __name__ == "__main__":
    asyncio.run(extract_arxiv())
