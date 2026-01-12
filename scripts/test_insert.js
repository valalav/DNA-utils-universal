const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ystr_matcher',
    user: 'postgres',
    password: 'postgres'
});

async function test() {
    try {
        console.log('Testing single insert/update...');
        const text = `
      INSERT INTO ystr_profiles (kit_number, name) 
      VALUES ($1, $2) 
      ON CONFLICT (kit_number) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
      RETURNING kit_number, name
    `;
        const res = await pool.query(text, ['TEST001', 'Test User']);
        console.log('Success:', res.rows[0]);
    } catch (e) { console.error('Failed:', e); }
    pool.end();
}
test();
