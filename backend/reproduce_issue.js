
require('dotenv').config();
const { executeQuery, pool } = require('./config/database');

async function testStats() {
    console.log('Testing stats queries with REAL DB...');

    // Test simpler query first
    try {
        console.log('Test 1: SELECT 1');
        await executeQuery('SELECT 1');
        console.log('✅ SELECT 1 passed');
    } catch (e) {
        console.error('❌ SELECT 1 failed:', e);
    }

    const queries = [
        'SELECT COUNT(*) as total_profiles FROM ystr_profiles',
        'SELECT COUNT(DISTINCT haplogroup) as unique_haplogroups FROM ystr_profiles WHERE haplogroup IS NOT NULL',
        'SELECT 37.0 as avg_markers',
        'SELECT haplogroup, COUNT(*) as count FROM ystr_profiles WHERE haplogroup IS NOT NULL GROUP BY haplogroup ORDER BY count DESC LIMIT 10'
    ];

    try {
        console.log('Test 2: Batched queries');
        const results = await Promise.all(
            queries.map(query => executeQuery(query))
        );

        console.log('✅ Batch passed');
    } catch (error) {
        console.error('❌ Batch failed details:');
        console.log('Type of error:', typeof error);
        console.log('Is Error instance:', error instanceof Error);
        console.log('Error message:', error.message);
        console.log('Full error:', error);
    } finally {
        await pool.end();
    }
}

testStats();
