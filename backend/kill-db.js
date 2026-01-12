const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'ystr_matcher', user: 'postgres', password: 'postgres' });

async function kill() {
    try {
        const res = await pool.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE state != 'idle' AND pid != pg_backend_pid()
    `);
        console.log(`Terminated ${res.rowCount} queries`);
    } catch (e) { console.error(e); }
    pool.end();
}
kill();
