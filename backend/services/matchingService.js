const { executeQuery, withTransaction } = require('../config/database');
const Redis = require('redis');

class MatchingService {
  constructor() {
    this.redisConnected = false;

    // Initialize Redis client for caching (Optional)
    // To disable Redis, set DISABLE_REDIS=true in .env
    const redisEnabled = process.env.DISABLE_REDIS !== 'true';

    if (redisEnabled) {
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
        // Reduce log spam
        if (!this.lastRedisError || Date.now() - this.lastRedisError > 5000) {
          console.error('Redis connection error:', err.message);
          this.lastRedisError = Date.now();
        }
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
    } else {
      console.log('⚠️ Redis disabled via config (DISABLE_REDIS=true)');
      this.redis = null;
    }
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

  // FTDNA Marker Constants (matching frontend utils/constants.ts)
  const FTDNA_MARKERS = [
    "DYS393", "DYS390", "DYS19", "DYS391", "DYS385",
    "DYS426", "DYS388", "DYS439", "DYS389i", "DYS392",
    "DYS389ii", "DYS458", "DYS459", "DYS455", "DYS454",
    "DYS447", "DYS437", "DYS448", "DYS449", "DYS464",
    "DYS460", "Y-GATA-H4", "YCAII", "DYS456", "DYS607",
    "DYS576", "DYS570", "CDY", "DYS442", "DYS438",
    "DYS531", "DYS578", "DYF395S1", "DYS590", "DYS537",
    "DYS641", "DYS472", "DYF406S1", "DYS511", "DYS425",
    "DYS413", "DYS557", "DYS594", "DYS436", "DYS490",
    "DYS534", "DYS450", "DYS444", "DYS481", "DYS520",
    "DYS446", "DYS617", "DYS568", "DYS487", "DYS572",
    "DYS640", "DYS492", "DYS565",
    "DYS710", "DYS485", "DYS632", "DYS495", "DYS540",
    "DYS714", "DYS716", "DYS717", "DYS505", "DYS556",
    "DYS549", "DYS589", "DYS522", "DYS494", "DYS533",
    "DYS636", "DYS575", "DYS638", "DYS462", "DYS452",
    "DYS445", "Y-GATA-A10", "DYS463", "DYS441", "Y-GGAAT-1B07",
    "DYS525", "DYS712", "DYS593", "DYS650", "DYS532",
    "DYS715", "DYS504", "DYS513", "DYS561", "DYS552",
    "DYS726", "DYS635", "DYS587", "DYS643", "DYS497",
    "DYS510", "DYS434", "DYS461", "DYS435"
  ];

  const MARKER_PANELS = {
    12: FTDNA_MARKERS.slice(0, 11),
    37: FTDNA_MARKERS.slice(0, 30),
    67: FTDNA_MARKERS.slice(0, 58),
    111: FTDNA_MARKERS.slice(0, 102)
  };

  // Export matches as JSON with rarity analysis
  async exportMatches(kitNumber, options = {}) {
    try {
      // 1. Get Query Profile
      const queryProfile = await this.getProfile(kitNumber);
      if (!queryProfile) {
        throw new Error('Profile not found');
      }

      // Determine panel markers based on requested count (default 37)
      const requestedCount = options.markerCount || 37;
      const panelMarkers = MARKER_PANELS[requestedCount] || MARKER_PANELS[37];

      // 2. Prepare Match Options
      const searchOptions = {
        maxDistance: options.maxDistance || 25,
        maxResults: 5000,
        markerCount: requestedCount,
        haplogroupFilter: queryProfile.haplogroup,
        includeSubclades: true,
        useCache: true,
        ...options
      };

      // 3. Find Matches (Global Context)
      const matches = await this.findMatches(queryProfile.markers, searchOptions);
      const totalMatches = matches.length;

      // 4. Calculate Rarity Scores
      const rarityScores = {};
      const queryValues = {}; // Filtered query values

      // Iterate ONLY over the requested panel markers
      // This strictly filters the output to the requested panel (e.g. Y37)
      panelMarkers.forEach(marker => {
        const queryValue = queryProfile.markers[marker];

        // Skip markers that the query profile technically doesn't have populated
        // (though in FTDNA/YSeq imports usually all are present)
        if (!queryValue) return;

        queryValues[marker] = queryValue;

        let sameCount = 0;
        matches.forEach(m => {
          if (m.profile.markers[marker] === queryValue) {
            sameCount++;
          }
        });

        const frequency = totalMatches > 0 ? (sameCount / totalMatches) : 0;

        if (frequency <= 0.04) rarityScores[marker] = 4;
        else if (frequency <= 0.08) rarityScores[marker] = 3;
        else if (frequency <= 0.15) rarityScores[marker] = 2;
        else if (frequency <= 0.25) rarityScores[marker] = 1;
        else rarityScores[marker] = 0;
      });

      // 5. Truncate to Top 30 Matches
      const topMatches = matches
        .sort((a, b) => {
          if (a.distance !== b.distance) return a.distance - b.distance;
          return a.profile.kitNumber.localeCompare(b.profile.kitNumber);
        })
        .slice(0, 30);

      // 6. Format JSON Output
      const output = {
        meta: {
          query_kit: queryProfile.kitNumber,
          query_name: queryProfile.name,
          query_haplogroup: queryProfile.haplogroup,
          panel: `Y${requestedCount}`,
          generated_at: new Date().toISOString(),
          total_matches_found: totalMatches,
          matches_included: topMatches.length
        },
        // Explicitly ordered marker list
        markers: Object.keys(queryValues),
        query_values: queryValues,
        rarity_scores: rarityScores,
        matches: topMatches.map(m => {
          const diffs = {};

          Object.keys(queryValues).forEach(key => {
            const v1 = parseFloat(queryValues[key]);
            const v2 = parseFloat(m.profile.markers[key]);
            if (!isNaN(v1) && !isNaN(v2) && v1 !== v2) {
              diffs[key] = v2 - v1;
            }
          });

          // Only exporting marker values relevant to the panel?
          // User requested "only what query has" based on panel.
          // Let's filter the values object too for clean output.
          const filteredValues = {};
          Object.keys(queryValues).forEach(k => {
            if (m.profile.markers[k]) filteredValues[k] = m.profile.markers[k];
          });

          return {
            kit: m.profile.kitNumber,
            name: m.profile.name,
            country: m.profile.country,
            haplo: m.profile.haplogroup,
            gd: m.distance,
            shared: m.comparedMarkers,
            values: filteredValues,
            diffs: diffs
          };
        })
      };

      return output;

    } catch (error) {
      console.error('❌ Error exporting matches:', error);
      throw error;
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
