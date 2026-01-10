#!/usr/bin/env node
/**
 * Load samples from default Google Sheets database
 * Usage: node scripts/load-default-db.js
 */

require('dotenv').config();

const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTp8VNm5yS63RiflBpMY4b8d4RBTPecjU_RrC10EDcgSitcQxRtt1QbeN67g8bYOyqB088GLOTHIG5g/pub?gid=90746110&single=true&output=csv';
const API_URL = process.env.API_URL || 'http://localhost:9004';
const API_KEY = process.env.MASTER_API_KEY;

if (!API_KEY) {
  console.error('Error: MASTER_API_KEY not set in .env');
  process.exit(1);
}

// STR marker columns
const MARKER_PREFIXES = ['DYS', 'Y-', 'CDY', 'YCAII'];

async function loadDefaultDatabase() {
  console.log('Downloading CSV from Google Sheets...');
  const startTime = Date.now();

  // Download CSV
  const csvResponse = await fetch(DEFAULT_SHEET_URL);
  if (!csvResponse.ok) {
    throw new Error(`Failed to download: ${csvResponse.status}`);
  }
  const csv = await csvResponse.text();
  console.log(`Downloaded ${(csv.length / 1024).toFixed(1)} KB`);

  // Parse CSV
  const lines = csv.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  // Find column indices
  const kitIdx = headers.indexOf('Kit Number');
  const nameIdx = headers.indexOf('Name');
  const countryIdx = headers.indexOf('Country');
  const haploIdx = headers.indexOf('Haplogroup');

  // Find marker columns
  const markerIndices = {};
  headers.forEach((h, i) => {
    if (MARKER_PREFIXES.some(p => h.startsWith(p))) {
      markerIndices[h] = i;
    }
  });

  console.log(`Found ${Object.keys(markerIndices).length} marker columns`);

  // Parse samples
  const samples = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const kitNumber = cols[kitIdx]?.trim();
    const haplogroup = cols[haploIdx]?.trim();

    if (!kitNumber || !haplogroup) continue;

    const markers = {};
    for (const [marker, idx] of Object.entries(markerIndices)) {
      const val = cols[idx]?.trim();
      if (val && val !== '' && val !== '0' && val !== '-') {
        markers[marker] = val;
      }
    }

    if (Object.keys(markers).length === 0) continue;

    samples.push({
      kitNumber,
      name: cols[nameIdx]?.trim() || '',
      country: cols[countryIdx]?.trim() || '',
      haplogroup,
      markers
    });
  }

  console.log(`Parsed ${samples.length} samples`);

  // Upload via bulk API
  console.log('Uploading to database...');
  const response = await fetch(`${API_URL}/api/samples/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ samples })
  });

  const result = await response.json();
  const totalTime = Date.now() - startTime;

  if (!response.ok) {
    console.error('Upload failed:', result.error || result.message);
    process.exit(1);
  }

  console.log('\n=== Result ===');
  console.log(`Inserted: ${result.inserted}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Duplicates removed: ${result.duplicatesRemoved}`);
  console.log(`Cleaned markers: ${result.cleanedMarkers}`);
  console.log(`Speed: ${result.speed}`);
  console.log(`Total time: ${totalTime}ms`);
}

loadDefaultDatabase().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
