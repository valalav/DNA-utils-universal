const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ystr_matcher',
    user: 'postgres',
    password: 'postgres'
});

async function kill() {
    const pids = [2450, 2476, 2477];
    for (const pid of pids) {
        try {
            await pool.query('SELECT pg_terminate_backend($1)', [pid]);
            console.log(`Killed ${pid}`);
        } catch (e) { console.log(`Failed to kill ${pid}: ${e.message}`); }
    }
    pool.end();
}
kill();
