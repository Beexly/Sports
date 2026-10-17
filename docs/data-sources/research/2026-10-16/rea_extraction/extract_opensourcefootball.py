import asyncio
from playwright.async_api import async_playwright
import hashlib
import json
import os
import re

async def run():
    chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
    target_url = 'https://opensourcefootball.com/'
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
        )
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
        )
        page = await context.new_page()
        
        captured_requests = []
        page.on('request', lambda req: captured_requests.append({
            'url': req.url,
            'method': req.method,
            'resource_type': req.resource_type
        }))
        
        resp = await page.goto(target_url, wait_until='networkidle', timeout=30000)
        status = resp.status if resp else 0
        content = await page.content()
        title = await page.title()
        
        articles = await page.evaluate('''() => {
            const items = [];
            const seen = new Set();
            const links = document.querySelectorAll('a');
            links.forEach(a => {
                if (a.href.includes('/posts/') && !seen.has(a.href)) {
                    seen.add(a.href);
                    items.push({
                        title: a.innerText.trim(),
                        href: a.href
                    });
                }
            });
            return items;
        }''')
        
        print(f'STATUS: {status}')
        print(f'TITLE: {title}')
        print(f'ARTICLES FOUND: {len(articles)}')
        for a in articles[:10]:
            print(f"  - {a['title'][:60]} -> {a['href']}")
            
        sample_path = r'docs\data-sources\research\2026-10-16\rea_extraction\samples\opensourcefootball_rea_capture.html'
        with open(sample_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        sha256 = hashlib.sha256(content.encode('utf-8')).hexdigest()
        print(f'SHA256: {sha256}, BYTES: {len(content)}')
        
        meta = {
            'target': target_url,
            'status': status,
            'title': title,
            'sha256': sha256,
            'article_count': len(articles),
            'articles': articles,
            'network_requests': len(captured_requests)
        }
        with open(r'docs\data-sources\research\2026-10-16\rea_extraction\samples\opensourcefootball_metadata.json', 'w', encoding='utf-8') as f:
            json.dump(meta, f, indent=2)
            
        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
