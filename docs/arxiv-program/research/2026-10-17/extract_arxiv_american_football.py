import asyncio
from playwright.async_api import async_playwright
import hashlib
import json
import os
import time

TARGET_URL = "https://arxiv.org/search/?query=american+football&searchtype=all&abstracts=show&order=-announced_date_first&size=200"

async def extract_american_football():
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
        print(f"[*] Extracting arXiv American Football query: {TARGET_URL} ...")
        
        try:
            resp = await page.goto(TARGET_URL, wait_until="domcontentloaded", timeout=40000)
            status = resp.status if resp else 200
            await asyncio.sleep(2)
            content = await page.content()
            
            sample_file = "arxiv_american_football_search_size200.html"
            sample_path = os.path.join(samples_dir, sample_file)
            with open(sample_path, "w", encoding="utf-8", errors="replace") as f:
                f.write(content)
                
            sha256 = hashlib.sha256(content.encode('utf-8')).hexdigest()
            print(f"[+] Saved HTML to {sample_path} ({len(content)} bytes, hash: {sha256[:16]})")
            
        except Exception as e:
            print(f"[-] Error during extraction: {e}")
        finally:
            await page.close()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(extract_american_football())
