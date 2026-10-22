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
  const data = await get('https://www.galaxysportsedge.com/picks');
  const re = /class=["']mt-0\.5 text-lg font-bold text-white["']>([^<]+)<\/p>/g;
  let match;
  const items = [];
  while ((match = re.exec(data)) !== null) {
    items.push(match[1]);
  }
  console.log('Selections found on /picks (' + items.length + '):');
  items.forEach(i => console.log(' - ' + i));

  // Check for confidence on page
  const confMatches = data.match(/Confidence.*?(\d+\/100|Locked|Missing)/gi) || [];
  console.log('Confidence matches:', confMatches.slice(0, 10));

  // Check for factor breakdown
  const factors = data.match(/Factor Breakdown|Bookmaker Consensus/gi) || [];
  console.log('Factor mentions:', factors.length);
}

run().catch(console.error);
