const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ystr_matcher',
    user: 'postgres',
    password: 'postgres'
});

async function verify() {
    const kits = ['YF078230', 'IN59103', 'IN82338', 'YF143382'];

    console.log('--- Verification Report ---');
    for (const kit of kits) {
        const res = await pool.query(`SELECT kit_number, name FROM ystr_profiles WHERE kit_number = $1`, [kit]);
        if (res.rows.length > 0) {
            console.log(`[${kit}] Name: "${res.rows[0].name}"`);
        } else {
            console.log(`[${kit}] NOT FOUND`);
        }
    }
    pool.end();
}
verify();
