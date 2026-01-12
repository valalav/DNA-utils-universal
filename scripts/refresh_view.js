const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ystr_matcher',
    user: 'postgres',
    password: 'postgres'
});

async function refresh() {
    try {
        console.log('Refreshing view...');
        const start = Date.now();
        await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY marker_statistics`);
        console.log(`Refreshed in ${(Date.now() - start) / 1000}s`);
    } catch (e) { console.error(e); }
    pool.end();
}
refresh();
