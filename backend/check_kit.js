const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'ystr_matcher', user: 'postgres', password: 'postgres' });

async function check() {
    try {
        const res = await pool.query(`SELECT kit_number, name FROM ystr_profiles WHERE kit_number = 'B503239'`);
        console.log('DB Result:', res.rows[0]);
    } catch (e) { console.error(e); }
    pool.end();
}
check();
