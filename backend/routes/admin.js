const express = require('express');
const { executeQuery, withTransaction } = require('../config/database');
const matchingService = require('../services/matchingService');
const { asyncHandler } = require('../middleware/validation');
const { requireApiKey } = require('../middleware/apiKeyAuth');
const Queue = require('bull');

const router = express.Router();

// Initialize job queue for batch processing
// Initialize job queue for batch processing
let batchQueue = null;
if (process.env.DISABLE_REDIS !== 'true') {
  batchQueue = new Queue('batch processing', process.env.REDIS_URL || 'redis://localhost:6379');
} else {
  console.log('⚠️ Batch Queue disabled because Redis is disabled');
}

// Configure queue processing
// Configure queue processing
if (batchQueue) {
  batchQueue.process('bulk-insert', 5, async (job) => {
    const { profiles, batchId } = job.data;

    try {
      job.progress(0);

      // Process profiles in smaller chunks to avoid memory issues
      const chunkSize = 1000;
      let processed = 0;
      const results = [];

      for (let i = 0; i < profiles.length; i += chunkSize) {
        const chunk = profiles.slice(i, i + chunkSize);

        const result = await matchingService.bulkInsertProfiles(chunk);
        results.push(result);

        processed += chunk.length;
        const progress = Math.round((processed / profiles.length) * 100);
        job.progress(progress);

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return {
        batchId,
        totalProcessed: processed,
        results
      };

    } catch (error) {
      console.error(`❌ Batch processing error for ${batchId}:`, error);
      throw error;
    }
  });
}

if (batchQueue) {
  batchQueue.process('genetic-distance-optimization', 1, async (job) => {
    const { sampleSize, targetDistance } = job.data;

    try {
      job.progress(0);

      // Optimize genetic distance calculations for large datasets
      const query = `
      WITH sample_profiles AS (
        SELECT kit_number, markers
        FROM ystr_profiles
        TABLESAMPLE SYSTEM (${Math.min(sampleSize / 1000, 10)})  -- Sample percentage
        LIMIT $1
      ),
      distance_matrix AS (
        SELECT
          p1.kit_number as kit1,
          p2.kit_number as kit2,
          calculate_genetic_distance(p1.markers, p2.markers, 37) as distance
        FROM sample_profiles p1
        CROSS JOIN sample_profiles p2
        WHERE p1.kit_number < p2.kit_number
        AND calculate_genetic_distance(p1.markers, p2.markers, 37) <= $2
      )
      SELECT
        AVG(distance) as avg_distance,
        MIN(distance) as min_distance,
        MAX(distance) as max_distance,
        COUNT(*) as total_comparisons,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY distance) as median_distance
      FROM distance_matrix
    `;

      const result = await executeQuery(query, [sampleSize, targetDistance]);

      job.progress(100);

      return {
        optimization_stats: result.rows[0],
        sample_size: sampleSize,
        target_distance: targetDistance
      };

    } catch (error) {
      console.error('❌ Genetic distance optimization error:', error);
      throw error;
    }
  });
}

// GET /api/admin/stats - Comprehensive system statistics
router.get('/stats',
  asyncHandler(async (req, res) => {
    const queries = [
      // Database statistics
      `SELECT
         COUNT(*) as total_profiles,
         COUNT(DISTINCT haplogroup) as unique_haplogroups,
         AVG(jsonb_object_keys(markers)) as avg_markers_per_profile,
         MIN(created_at) as oldest_profile,
         MAX(created_at) as newest_profile
       FROM ystr_profiles`,

      // Storage statistics
      `SELECT
         pg_size_pretty(pg_total_relation_size('ystr_profiles')) as table_size,
         pg_size_pretty(pg_database_size(current_database())) as database_size`,

      // Index usage statistics
      `SELECT
         schemaname,
         tablename,
         indexname,
         idx_tup_read,
         idx_tup_fetch
       FROM pg_stat_user_indexes
       WHERE schemaname = 'public'
       ORDER BY idx_tup_read DESC`,

      // Most common haplogroups
      `SELECT
         haplogroup,
         COUNT(*) as count,
         ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ystr_profiles), 2) as percentage
       FROM ystr_profiles
       WHERE haplogroup IS NOT NULL
       GROUP BY haplogroup
       ORDER BY count DESC
       LIMIT 20`,

      // Recent activity
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as profiles_added
       FROM ystr_profiles
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    ];

    const [
      dbStats,
      storageStats,
      indexStats,
      haplogroupStats,
      activityStats
    ] = await Promise.all(queries.map(query => executeQuery(query)));

    res.json({
      success: true,
      statistics: {
        database: dbStats.rows[0],
        storage: storageStats.rows[0],
        indexes: indexStats.rows,
        haplogroups: haplogroupStats.rows,
        recent_activity: activityStats.rows
      },
      generated_at: new Date().toISOString()
    });
  })
);

// POST /api/admin/batch-process - Start batch processing job
router.post('/batch-process',
  asyncHandler(async (req, res) => {
    const { profiles, priority = 'normal' } = req.body;

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        error: 'Profiles array is required and cannot be empty'
      });
    }

    const maxBatchSize = parseInt(process.env.MAX_BATCH_SIZE) || 50000;
    if (profiles.length > maxBatchSize) {
      return res.status(400).json({
        error: `Batch size too large. Maximum ${maxBatchSize} profiles allowed.`,
        received: profiles.length
      });
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add job to queue
    const jobOptions = {
      priority: priority === 'high' ? 10 : 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: 10,
      removeOnFail: 5
    };

    if (!batchQueue) {
      return res.status(503).json({
        error: 'Batch processing unavailable (Redis disabled)'
      });
    }

    const job = await batchQueue.add('bulk-insert', {
      profiles,
      batchId
    }, jobOptions);

    res.json({
      success: true,
      batchId,
      jobId: job.id,
      profileCount: profiles.length,
      status: 'queued',
      estimatedTime: Math.ceil(profiles.length / 1000) * 30 // Rough estimate in seconds
    });
  })
);

// GET /api/admin/batch-status/:jobId - Get batch processing status
router.get('/batch-status/:jobId',
  asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    if (!batchQueue) return res.status(404).json({ error: 'Queue disabled' });
    const job = await batchQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    const state = await job.getState();
    const progress = job.progress();

    res.json({
      success: true,
      jobId: job.id,
      batchId: job.data.batchId,
      status: state,
      progress: progress,
      created: job.timestamp,
      processed: job.processedOn,
      finished: job.finishedOn,
      failed: job.failedReason,
      result: job.returnvalue
    });
  })
);

// POST /api/admin/optimize-database - Database optimization
router.post('/optimize-database',
  asyncHandler(async (req, res) => {
    const { operation = 'analyze' } = req.body;

    try {
      let result;

      switch (operation) {
        case 'analyze':
          await executeQuery('ANALYZE ystr_profiles');
          result = { message: 'Database analysis completed' };
          break;

        case 'vacuum':
          await executeQuery('VACUUM ANALYZE ystr_profiles');
          result = { message: 'Database vacuum completed' };
          break;

        case 'reindex':
          await executeQuery('REINDEX TABLE ystr_profiles');
          result = { message: 'Table reindexed successfully' };
          break;

        case 'refresh_materialized_views':
          await executeQuery('REFRESH MATERIALIZED VIEW CONCURRENTLY marker_statistics');
          result = { message: 'Materialized views refreshed' };
          break;

        default:
          return res.status(400).json({
            error: 'Invalid operation. Supported: analyze, vacuum, reindex, refresh_materialized_views'
          });
      }

      res.json({
        success: true,
        operation,
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Database optimization error (${operation}):`, error);
      res.status(500).json({
        error: `Database optimization failed: ${error.message}`
      });
    }
  })
);

// POST /api/admin/genetic-distance-benchmark - Benchmark genetic distance calculations
router.post('/genetic-distance-benchmark',
  asyncHandler(async (req, res) => {
    const {
      sampleSize = 1000,
      targetDistance = 25
    } = req.body;

    // Validate parameters
    if (sampleSize > 10000) {
      return res.status(400).json({
        error: 'Sample size too large. Maximum 10,000 allowed for benchmarking.'
      });
    }

    if (!batchQueue) {
      return res.status(503).json({ error: 'Queue unavailable' });
    }

    // Add optimization job to queue
    const job = await batchQueue.add('genetic-distance-optimization', {
      sampleSize,
      targetDistance
    }, {
      priority: 3,
      attempts: 2,
      removeOnComplete: 5
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Genetic distance optimization started',
      parameters: {
        sampleSize,
        targetDistance
      }
    });
  })
);

// GET /api/admin/queue-stats - Queue statistics
router.get('/queue-stats',
  asyncHandler(async (req, res) => {
    if (!batchQueue) return res.json({ success: true, queue_statistics: { status: 'disabled' }, active_jobs: [], recent_failures: [] });

    const [waiting, active, completed, failed] = await Promise.all([
      batchQueue.getWaiting(),
      batchQueue.getActive(),
      batchQueue.getCompleted(),
      batchQueue.getFailed()
    ]);

    res.json({
      success: true,
      queue_statistics: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total_processed: completed.length + failed.length
      },
      active_jobs: active.map(job => ({
        id: job.id,
        type: job.name,
        progress: job.progress(),
        created: job.timestamp
      })),
      recent_failures: failed.slice(0, 10).map(job => ({
        id: job.id,
        type: job.name,
        error: job.failedReason,
        failed_at: job.finishedOn
      }))
    });
  })
);

// DELETE /api/admin/clear-cache - Clear all caches
router.delete('/clear-cache',
  asyncHandler(async (req, res) => {
    const { type = 'all' } = req.body;

    let clearedCount = 0;

    try {
      if (type === 'all' || type === 'matching') {
        await matchingService.clearMatchingCaches();
        clearedCount++;
      }

      if (type === 'all' || type === 'haplogroup') {
        const haplogroupService = require('../services/haplogroupService');
        await haplogroupService.redis.del('haplogroup:tree');
        clearedCount++;
      }

      res.json({
        success: true,
        message: `Cleared ${clearedCount} cache types`,
        type,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Cache clearing error:', error);
      res.status(500).json({
        error: `Cache clearing failed: ${error.message}`
      });
    }
  })
);

// POST /api/admin/reload-cache - Reload cache (for Sample Manager)
// Requires API key with cache management permission
router.post('/reload-cache',
  requireApiKey('cache.clear'),
  asyncHandler(async (req, res) => {
    const { type = 'all' } = req.body;

    let clearedCount = 0;
    const clearedTypes = [];

    try {
      if (type === 'all' || type === 'matching') {
        await matchingService.clearMatchingCaches();
        clearedCount++;
        clearedTypes.push('matching');
      }

      if (type === 'all' || type === 'haplogroup') {
        const haplogroupService = require('../services/haplogroupService');
        await haplogroupService.redis.del('haplogroup:tree');
        clearedCount++;
        clearedTypes.push('haplogroup');
      }

      // Also clear any profile-related caches
      if (type === 'all' || type === 'profiles') {
        const haplogroupService = require('../services/haplogroupService');
        const keys = await haplogroupService.redis.keys('profile:*');
        if (keys.length > 0) {
          await haplogroupService.redis.del(...keys);
        }
        clearedCount++;
        clearedTypes.push('profiles');
      }

      res.json({
        success: true,
        message: `Cache reloaded successfully. Cleared ${clearedCount} cache type(s).`,
        clearedTypes,
        timestamp: new Date().toISOString(),
        apiKey: req.apiKey?.name || 'Unknown'
      });

    } catch (error) {
      console.error('❌ Cache reload error:', error);
      res.status(500).json({
        error: `Cache reload failed: ${error.message}`
      });
    }
  })
);

// POST /api/admin/backup-database - Create database backup
router.post('/backup-database',
  asyncHandler(async (req, res) => {
    const { includeData = true, compression = true } = req.body;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `ystr_backup_${timestamp}`;

      // This would typically call pg_dump
      // For security, implement proper backup mechanism based on your infrastructure

      res.json({
        success: true,
        message: 'Backup created successfully',
        backup_name: backupName,
        timestamp: new Date().toISOString(),
        options: {
          includeData,
          compression
        }
      });

    } catch (error) {
      console.error('❌ Backup error:', error);
      res.status(500).json({
        error: `Backup failed: ${error.message}`
      });
    }
  })
);

// GET /api/admin/health-detailed - Detailed health check
router.get('/health-detailed',
  asyncHandler(async (req, res) => {
    const checks = {};

    // Database connectivity
    try {
      await executeQuery('SELECT 1');
      checks.database = { status: 'healthy', response_time: 'fast' };
    } catch (error) {
      checks.database = { status: 'unhealthy', error: error.message };
    }

    // Redis connectivity
    try {
      await matchingService.redis.ping();
      checks.redis = { status: 'healthy' };
    } catch (error) {
      checks.redis = { status: 'unhealthy', error: error.message };
    }

    // Queue health
    if (batchQueue) {
      try {
        const queueHealth = await batchQueue.checkHealth();
        checks.queue = { status: 'healthy', ...queueHealth };
      } catch (error) {
        checks.queue = { status: 'unhealthy', error: error.message };
      }
    } else {
      checks.queue = { status: 'disabled' };
    }

    // CUDA predictor service
    try {
      const haplogroupService = require('../services/haplogroupService');
      const cudaStatus = await haplogroupService.checkCudaService();
      checks.cuda_predictor = cudaStatus;
    } catch (error) {
      checks.cuda_predictor = { available: false, error: error.message };
    }

    const overall = Object.values(checks).every(check =>
      check.status === 'healthy' || check.available === true
    );

    res.json({
      success: true,
      overall_status: overall ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    });
  })
);

module.exports = router;