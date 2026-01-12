const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ystr_matcher',
    user: 'postgres',
    password: 'postgres'
});

async function check() {
    try {
        const res = await pool.query(`SELECT pid, query_start, state, query FROM pg_stat_activity WHERE state != 'idle'`);
        console.log('Active Queries:');
        res.rows.forEach(r => console.log(`PID: ${r.pid} | Start: ${r.query_start} | State: ${r.state} | Query: ${r.query}`));
    } catch (e) { console.error(e); }
    pool.end();
}
check();
