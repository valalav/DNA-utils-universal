const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ystr_matcher',
    user: 'postgres',
    password: 'postgres'
});

async function findTriggers() {
    try {
        const res = await pool.query(`SELECT tgname FROM pg_trigger WHERE tgrelid = 'ystr_profiles'::regclass`);
        console.log('Triggers:', res.rows.map(r => r.tgname));
    } catch (e) { console.error(e); }
    pool.end();
}
findTriggers();
