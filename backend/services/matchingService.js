const { executeQuery, withTransaction } = require('../config/database');
const Redis = require('redis');

class MatchingService {
  constructor() {
    this.redisConnected = false;

    // Initialize Redis client for caching
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.warn('⚠️ Redis unavailable, caching disabled');
            return false; // Stop reconnecting
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.redis.on('error', (err) => {
      this.redisConnected = false;
      console.error('Redis connection error:', err.message);
    });

    this.redis.on('connect', () => {
      this.redisConnected = true;
      console.log('✅ Redis connected');
    });

    this.redis.on('end', () => {
      this.redisConnected = false;
      console.warn('⚠️ Redis disconnected');
    });

    this.redis.connect().catch((err) => {
      this.redisConnected = false;
      console.warn('⚠️ Redis connection failed, caching disabled:', err.message);
    });
  }

  // Safe Redis operation wrapper - returns null if Redis unavailable
  async safeRedisGet(key) {
    if (!this.redisConnected) return null;
    try {
      return await Promise.race([
        this.redis.get(key),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000))
      ]);
    } catch (error) {
      console.warn('Redis get error:', error.message);
      return null;
    }
  }

  async safeRedisSetEx(key, ttl, value) {
    if (!this.redisConnected) return;
    try {
      await Promise.race([
        this.redis.setEx(key, ttl, value),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000))
      ]);
    } catch (error) {
      console.warn('Redis setEx error:', error.message);
    }
  }

  // Main function for finding matches with optimizations
  async findMatches(queryMarkers, options = {}) {
    const {
      maxDistance = 25,
      maxResults = 1000,
      markerCount = 37,
      haplogroupFilter = null,
      includeSubclades = false,
      useCache = true
    } = options;
    console.log(`🔍 findMatches called with maxResults=${maxResults}, maxDistance=${maxDistance}`);
    // CRITICAL FIX: Validate marker values are numeric (prevents 40x slowdown)
    for (const [marker, value] of Object.entries(queryMarkers)) {
      if (value && !/^[0-9]+(.[0-9]+)?(-[0-9]+(.[0-9]+)?)?$/.test(value.toString())) {
        throw new Error(`Invalid marker value for ${marker}: "${value}" - must be numeric`);
      }
    }


    // Generate cache key for this query
    const cacheKey = this.generateCacheKey(queryMarkers, options);

    // Try to get results from cache first
    if (useCache) {
      const cached = await this.safeRedisGet(cacheKey);
      if (cached) {
        console.log('🎯 Cache hit for matching query');
        return JSON.parse(cached);
      }
    }

    const startTime = Date.now();

    try {
      // Use optimized PostgreSQL function for batch matching (v5 with panel filtering)
      const query = `
        SELECT * FROM find_matches_batch($1, $2, $3, $4, $5, $6)
      `;

      const params = [
        JSON.stringify(queryMarkers),
        maxDistance,
        maxResults,
        markerCount,
        haplogroupFilter,
        includeSubclades
      ];

      const result = await executeQuery(query, params);

      const matches = result.rows.map(row => ({
        profile: {
          kitNumber: row.kit_number,
          name: row.name,
          country: row.country,
          haplogroup: row.haplogroup,
          markers: row.markers
        },
        distance: row.genetic_distance,
        comparedMarkers: row.compared_markers,
        identicalMarkers: row.compared_markers - row.genetic_distance,
        percentIdentical: row.percent_identical || (row.compared_markers > 0
          ? ((row.compared_markers - row.genetic_distance) / row.compared_markers * 100).toFixed(1)
          : 0)
      }));

      const duration = Date.now() - startTime;
      console.log(`🔍 Found ${matches.length} matches in ${duration}ms`);

      // Cache results for future use
      if (useCache && matches.length > 0) {
        await this.safeRedisSetEx(cacheKey, 3600, JSON.stringify(matches)); // Cache for 1 hour
      }

      return matches;

    } catch (error) {
      console.error('❌ Error finding matches:', error);
      throw new Error(`Matching failed: ${error.message}`);
    }
  }

  // Bulk insert profiles with conflict resolution
  async bulkInsertProfiles(profiles) {
    const startTime = Date.now();

    try {
      // Validate and prepare data
      const validProfiles = profiles.filter(p =>
        p.kitNumber &&
        p.markers &&
        Object.keys(p.markers).length > 0
      );

      if (validProfiles.length === 0) {
        throw new Error('No valid profiles to insert');
      }

      // Use database function for efficient bulk insert
      const profilesData = validProfiles.map(profile => ({
        kit_number: profile.kitNumber,
        name: profile.name || '',
        country: profile.country || '',
        haplogroup: profile.haplogroup || '',
        markers: profile.markers
      }));

      const query = 'SELECT bulk_insert_profiles($1) as inserted_count';
      const result = await executeQuery(query, [JSON.stringify(profilesData)]);

      const insertedCount = result.rows[0].inserted_count;
      const duration = Date.now() - startTime;

      console.log(`📥 Inserted ${insertedCount} profiles in ${duration}ms`);

      // Clear relevant caches
      await this.clearMatchingCaches();

      return {
        inserted: insertedCount,
        skipped: profiles.length - validProfiles.length,
        duration
      };

    } catch (error) {
      console.error('❌ Bulk insert error:', error);
      throw new Error(`Bulk insert failed: ${error.message}`);
    }
  }

  // Get profile by kit number with caching
  async getProfile(kitNumber) {
    const cacheKey = `profile:${kitNumber}`;

    try {
      // Check cache first
      const cached = await this.safeRedisGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query database
      const query = `
        SELECT kit_number, name, country, haplogroup, markers, created_at
        FROM ystr_profiles
        WHERE kit_number = $1
      `;

      const result = await executeQuery(query, [kitNumber]);

      if (result.rows.length === 0) {
        return null;
      }

      const profile = {
        kitNumber: result.rows[0].kit_number,
        name: result.rows[0].name,
        country: result.rows[0].country,
        haplogroup: result.rows[0].haplogroup,
        markers: result.rows[0].markers,
        createdAt: result.rows[0].created_at
      };

      // Cache for 24 hours
      await this.safeRedisSetEx(cacheKey, 86400, JSON.stringify(profile));

      return profile;

    } catch (error) {
      console.error('❌ Error getting profile:', error);
      throw error;
    }
  }

  // Get database statistics
  async getStatistics() {
    const cacheKey = 'db:statistics';

    try {
      /*
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      */


      const queries = [
        'SELECT COUNT(*) as total_profiles FROM ystr_profiles',
        'SELECT COUNT(DISTINCT haplogroup) as unique_haplogroups FROM ystr_profiles WHERE haplogroup IS NOT NULL',
        'SELECT 37.0 as avg_markers',
        'SELECT haplogroup, COUNT(*) as count FROM ystr_profiles WHERE haplogroup IS NOT NULL GROUP BY haplogroup ORDER BY count DESC LIMIT 10'
      ];

      let totalResult, haplogroupsResult, avgMarkersResult, topHaplogroupsResult;

      try {
        const [total, haplo, avg, top] = await Promise.all(
          queries.map(query => executeQuery(query))
        );
        totalResult = total;
        haplogroupsResult = haplo;
        avgMarkersResult = avg;
        topHaplogroupsResult = top;
      } catch (dbError) {
        console.error('❌ Database error in getStatistics:', dbError);
        // If DB is down, return empty stats with error indicator instead of crashing
        return {
          totalProfiles: 0,
          uniqueHaplogroups: 0,
          avgMarkersPerProfile: "0",
          topHaplogroups: [],
          lastUpdated: new Date().toISOString(),
          status: 'error',
          error: 'Database unavailable'
        };
      }

      const stats = {
        totalProfiles: parseInt(totalResult.rows[0].total_profiles),
        uniqueHaplogroups: parseInt(haplogroupsResult.rows[0].unique_haplogroups),
        avgMarkersPerProfile: parseFloat(avgMarkersResult.rows[0].avg_markers || 0).toFixed(1),
        topHaplogroups: topHaplogroupsResult.rows,
        lastUpdated: new Date().toISOString()
      };

      // Cache for 5 minutes
      await this.safeRedisSetEx(cacheKey, 300, JSON.stringify(stats));

      return stats;

    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      throw error;
    }
  }

  // Search profiles with pagination
  async searchProfiles(searchTerm, options = {}) {
    const {
      limit = 100,
      offset = 0,
      haplogroup = null
    } = options;

    try {
      let query = `
        SELECT kit_number, name, country, haplogroup,
               jsonb_object_keys(markers) as marker_count,
               created_at
        FROM ystr_profiles
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (searchTerm) {
        query += ` AND (kit_number ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`;
        params.push(`%${searchTerm}%`);
        paramIndex++;
      }

      if (haplogroup) {
        query += ` AND haplogroup = $${paramIndex}`;
        params.push(haplogroup);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await executeQuery(query, params);

      return result.rows.map(row => ({
        kitNumber: row.kit_number,
        name: row.name,
        country: row.country,
        haplogroup: row.haplogroup,
        markerCount: row.marker_count,
        createdAt: row.created_at
      }));

    } catch (error) {
      console.error('❌ Error searching profiles:', error);
      throw error;
    }
  }

  // Generate cache key for matching queries
  generateCacheKey(queryMarkers, options) {
    const keyData = {
      markers: queryMarkers,
      ...options
    };
    return `match:${Buffer.from(JSON.stringify(keyData)).toString('base64').substring(0, 50)}`;
  }

  // Clear all matching-related caches
  async clearMatchingCaches() {
    if (!this.redisConnected) return;
    try {
      const keys = await Promise.race([
        this.redis.keys('match:*'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000))
      ]);
      if (keys && keys.length > 0) {
        await this.redis.del(keys);
        console.log(`🧹 Cleared ${keys.length} cache entries`);
      }
    } catch (error) {
      console.warn('Cache clear error:', error.message);
    }
  }

  // Health check for the service
  async healthCheck() {
    try {
      // Test database connection
      await executeQuery('SELECT 1');

      // Redis is optional - report its status but don't fail health check
      const cacheStatus = this.redisConnected ? 'connected' : 'unavailable';

      return {
        status: 'healthy',
        database: 'connected',
        cache: cacheStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new MatchingService();
