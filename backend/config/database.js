const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ystr_matcher',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,

  // Connection pool settings optimized for high throughput
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 50,  // Increased from 20 for better concurrency
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: 5000,

  // Performance optimizations
  statement_timeout: 120000,  // 2 min for bulk operations
  query_timeout: 120000,
  application_name: 'ystr-matcher-backend'
});

// Test connection on startup
pool.on('connect', (client) => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
  process.exit(-1);
});

// Graceful shutdown

module.exports = {
  pool,

  // Helper function for transactions
  async withTransaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Helper for prepared statements
  async executeQuery(text, params = []) {
    const start = Date.now();
    try {
      // Log function name for find_matches calls
      if (text.includes('find_matches_batch')) {
        const match = text.match(/find_matches_batch_v\d+/);
        if (match) console.log(`🔍 Using SQL function: ${match[0]}`);
      }

      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        console.warn(`⚠️  Slow query (${duration}ms):`, text.substring(0, 100));
      }

      return result;
    } catch (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }
  }
};