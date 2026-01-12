const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'ystr_matcher', user: 'postgres', password: 'postgres' });

async function check() {
    try {
        const res = await pool.query(`
      SELECT pid, state, query_start, now() - query_start as duration, query 
      FROM pg_stat_activity 
      WHERE state != 'idle' AND pid != pg_backend_pid()
    `);
        console.log('Active queries:', res.rows);
    } catch (e) { console.error(e); }
    pool.end();
}
check();
