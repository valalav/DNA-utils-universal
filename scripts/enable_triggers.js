const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ystr_matcher',
    user: 'postgres',
    password: 'postgres'
});

async function enable() {
    try {
        await pool.query(`ALTER TABLE ystr_profiles ENABLE TRIGGER trigger_refresh_marker_stats`);
        console.log('Enabled trigger_refresh_marker_stats');
    } catch (e) { console.error(e); }
    pool.end();
}
enable();
