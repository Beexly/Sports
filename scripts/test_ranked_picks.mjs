import fs from 'node:fs';
import https from 'node:https';

const env = fs.readFileSync('.env.production.local', 'utf-8');
const match = env.match(/CRON_SECRET=["']?([^"'\r\n]+)/);
const cronSecret = match ? match[1] : '';

console.log('CRON_SECRET found:', Boolean(cronSecret));

function get(sport) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.galaxysportsedge.com',
      path: `/api/ops/ranked-picks?sport=${sport}`,
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'User-Agent': 'Mozilla/5.0'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    }).on('error', reject);
  });
}

async function run() {
  for (const s of ['NCAAF', 'NFL']) {
    const res = await get(s);
    console.log(`=== SPORT ${s} === Status: ${res.status}`);
    try {
      const json = JSON.parse(res.data);
      console.log('Count:', json.count);
      if (json.picks && json.picks.length > 0) {
        console.log('First pick:', JSON.stringify(json.picks[0], null, 2));
      }
    } catch (e) {
      console.log('Raw:', res.data.slice(0, 300));
    }
  }
}

run().catch(console.error);
