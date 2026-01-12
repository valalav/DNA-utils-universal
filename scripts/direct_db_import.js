const Papa = require('papaparse');
const { execSync } = require('child_process');
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ystr_matcher',
    user: 'postgres',
    password: 'postgres'
});

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTp8VNm5yS63RiflBpMY4b8d4RBTPecjU_RrC10EDcgSitcQxRtt1QbeN67g8bYOyqB088GLOTHIG5g/pub?gid=90746110&single=true&output=csv';

async function importDirect() {
    try {
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

            return {
                kit_number: r['Kit Number'],
                name: n,
                country: r['Country'] || '',
                haplogroup: r['Haplogroup'],
                markers
            };
        }).filter(s => Object.keys(s.markers).length > 0);

        // Deduplicate
        const uniqueSamplesMap = new Map();
        for (const s of samples) {
            uniqueSamplesMap.set(s.kit_number, s);
        }
        const samplesToInsert = Array.from(uniqueSamplesMap.values());

        console.log(`Prepared ${samplesToInsert.length} unique samples. Inserting ONE BY ONE (Raw SQL)...`);

        // Insert one by one (fast enough)
        let count = 0;
        const query = `
      INSERT INTO ystr_profiles (kit_number, name, country, haplogroup, markers) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (kit_number) DO UPDATE SET 
        name = EXCLUDED.name,
        country = EXCLUDED.country,
        haplogroup = EXCLUDED.haplogroup,
        markers = EXCLUDED.markers,
        updated_at = NOW()
    `;

        for (const s of samplesToInsert) {
            console.log(`Inserting ${s.kit_number}...`);
            await pool.query(query, [
                s.kit_number,
                s.name,
                s.country,
                s.haplogroup,
                s.markers // pg automatically handles JSON object to jsonb
            ]);
            count++;
        }

        console.log(`Done! Uploaded ${count} samples.`);

    } catch (e) {
        console.error('Import Failed:', e);
    } finally {
        pool.end();
    }
}

importDirect();
