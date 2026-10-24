import https from 'node:https';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const html = await get('https://www.galaxysportsedge.com/board');
  const sections = ['Today&#x27;s Picks', 'Scoring Now', 'Passed On'];
  for (const s of sections) {
    const idx = html.indexOf(s);
    if (idx !== -1) {
      console.log(`=== SECTION: ${s} ===`);
      const slice = html.slice(idx, idx + 1000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(slice);
    }
  }
}

run().catch(console.error);
