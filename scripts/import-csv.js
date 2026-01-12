#!/usr/bin/env node
const Papa = require('papaparse');
const { execSync } = require('child_process');

const CSV_URL = process.argv[2] || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTp8VNm5yS63RiflBpMY4b8d4RBTPecjU_RrC10EDcgSitcQxRtt1QbeN67g8bYOyqB088GLOTHIG5g/pub?gid=90746110&single=true&output=csv';
const API_KEY = process.argv[3] || 'master_c7ZmTARjt4e9CSS3Dn5re875LknUfZifA67jxmHDyrY5ztfioScmOEqrHF0I0eDF';
const REPLACE = process.argv[4] !== 'false';

console.log('Downloading CSV...');
const csv = execSync(`wget -qO- "${CSV_URL}"`).toString();

console.log('Parsing...');
const rows = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;

const samples = rows.filter(r => r['Kit Number'] && r['Haplogroup']).map(r => {
  const markers = {};
  Object.entries(r).forEach(([k, v]) => {
    if ((k.startsWith('DYS') || k.startsWith('Y-') || k === 'YCAII' || k === 'CDY') && v && v.trim() && v !== '0' && v !== '-') {
      markers[k] = v.trim();
    }
  });
  const n = r['Name'] || '';
  return { kitNumber: r['Kit Number'], name: n, country: r['Country'] || '', haplogroup: r['Haplogroup'], markers };
}).filter(s => Object.keys(s.markers).length > 0);

console.log(`Uploading ${samples.length} samples (replace=${REPLACE})...`);
const startTime = Date.now();

async function upload() {
  const CHUNK_SIZE = 5000;
  let total = 0;
  for (let i = 0; i < samples.length; i += CHUNK_SIZE) {
    const chunk = samples.slice(i, i + CHUNK_SIZE);
    const res = await fetch('http://localhost:9005/api/samples/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({ samples: chunk })
    }).then(async r => {
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`API Error ${r.status}: ${text}`);
      }
      return r.json();
    });
    total += res.inserted || 0;
    console.log(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${res.inserted} inserted`);
  }
  const duration = (Date.now() - startTime) / 1000;
  console.log(`Done! Total: ${total} in ${duration.toFixed(2)}s (${(total / duration).toFixed(1)} samples/sec)`);
}
upload().catch(e => console.error('Fatal Error:', e.message));
