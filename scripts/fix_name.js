const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ystr_matcher',
    user: 'postgres',
    password: 'postgres'
});

async function fix() {
    try {
        const res = await pool.query(`UPDATE ystr_profiles SET name = 'Valeri Metov', updated_at = NOW() WHERE kit_number = 'B503239' RETURNING *`);
        console.log('Fixed:', res.rows[0]);
    } catch (e) { console.error(e); }
    pool.end();
}
fix();
