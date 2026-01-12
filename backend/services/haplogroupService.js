const { executeQuery, withTransaction } = require('../config/database');
const Redis = require('redis');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class HaplogroupService {
  constructor() {
    if (process.env.DISABLE_REDIS === 'true') {
      console.log('⚠️ Redis disabled for haplogroupService via config (DISABLE_REDIS=true)');
      this.redis = {
        get: async () => null,
        set: async () => { },
        setEx: async () => { },
        del: async () => { },
        keys: async () => [],
        on: () => { },
        connect: async () => { }
      };
    } else {
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redis.on('error', (err) => {
        console.error('Redis connection error:', err);
      });

      this.redis.connect().catch(console.error);
    }

    // CUDA predictor service configuration
    this.cudaServiceUrl = process.env.CUDA_PREDICTOR_URL || 'http://localhost:8080';
    this.modelPath = process.env.MODEL_PATH || './models';

    // Initialize haplogroup tree cache
    this.haplogroupTree = null;
    this.loadHaplogroupTree();
  }

  // Load and cache haplogroup tree
  async loadHaplogroupTree() {
    const cacheKey = 'haplogroup:tree';

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.haplogroupTree = JSON.parse(cached);
        return;
      }

      const query = `
        WITH RECURSIVE haplogroup_tree AS (
          SELECT
            haplogroup, parent_haplogroup, level,
            ARRAY[haplogroup] as path,
            haplogroup as root
          FROM haplogroups
          WHERE parent_haplogroup IS NULL

          UNION ALL

          SELECT
            h.haplogroup, h.parent_haplogroup, h.level,
            ht.path || h.haplogroup,
            ht.root
          FROM haplogroups h
          INNER JOIN haplogroup_tree ht ON h.parent_haplogroup = ht.haplogroup
        )
        SELECT haplogroup, parent_haplogroup, level, path, root
        FROM haplogroup_tree
        ORDER BY path
      `;

      const result = await executeQuery(query);
      this.haplogroupTree = result.rows;

      // Cache for 24 hours
      await this.redis.setEx(cacheKey, 86400, JSON.stringify(this.haplogroupTree));

    } catch (error) {
      console.error('❌ Error loading haplogroup tree:', error);
      this.haplogroupTree = [];
    }
  }

  // CUDA-accelerated haplogroup prediction
  async predictHaplogroup(markers, options = {}) {
    const {
      method = 'cuda_ml',
      minConfidence = 0.7,
      useEnsemble = true,
      modelVersion = 'v2.1'
    } = options;

    const cacheKey = `prediction:${JSON.stringify(markers)}:${method}:${modelVersion}`;

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        console.log('🎯 Cache hit for haplogroup prediction');
        return JSON.parse(cached);
      }

      let prediction;

      switch (method) {
        case 'cuda_ml':
          prediction = await this.cudaMLPrediction(markers, options);
          break;
        case 'yfull':
          prediction = await this.yfullPrediction(markers, options);
          break;
        case 'ftdna':
          prediction = await this.ftdnaPrediction(markers, options);
          break;
        case 'combined':
          prediction = await this.combinedPrediction(markers, options);
          break;
        default:
          throw new Error(`Unknown prediction method: ${method}`);
      }

      // Enhance prediction with haplogroup tree information
      if (prediction.haplogroup) {
        prediction = await this.enhancePredictionWithTree(prediction);
      }

      // Cache results for 1 hour
      await this.redis.setEx(cacheKey, 3600, JSON.stringify(prediction));

      return prediction;

    } catch (error) {
      console.error('❌ Error predicting haplogroup:', error);
      throw new Error(`Haplogroup prediction failed: ${error.message}`);
    }
  }

  // CUDA ML prediction using external service
  async cudaMLPrediction(markers, options = {}) {
    const startTime = Date.now();

    try {
      // Prepare marker data for ML model
      const markerVector = await this.prepareMarkerVector(markers);

      // Call CUDA prediction service
      const response = await fetch(`${this.cudaServiceUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markers: markerVector,
          model_version: options.modelVersion || 'v2.1',
          use_ensemble: options.useEnsemble || true,
          min_confidence: options.minConfidence || 0.7
        }),
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`CUDA service error: ${response.status}`);
      }

      const result = await response.json();
      const duration = Date.now() - startTime;

      console.log(`🚀 CUDA ML prediction completed in ${duration}ms`);

      return {
        haplogroup: result.prediction,
        confidence: result.confidence,
        alternatives: result.alternatives || [],
        method: 'cuda_ml',
        modelVersion: options.modelVersion,
        processingTime: duration,
        features: result.features_used || Object.keys(markers).length
      };

    } catch (error) {
      console.error('❌ CUDA ML prediction error:', error);

      // Fallback to traditional method
      console.log('🔄 Falling back to traditional prediction...');
      return await this.yfullPrediction(markers, options);
    }
  }

  // Prepare marker vector for ML model
  async prepareMarkerVector(markers) {
    // Standard marker order for consistency
    const standardMarkers = [
      'DYS393', 'DYS390', 'DYS19', 'DYS391', 'DYS385a', 'DYS385b',
      'DYS426', 'DYS388', 'DYS439', 'DYS389I', 'DYS392', 'DYS389II',
      'DYS458', 'DYS459a', 'DYS459b', 'DYS455', 'DYS454', 'DYS447',
      'DYS437', 'DYS448', 'DYS449', 'DYS464a', 'DYS464b', 'DYS464c',
      'DYS464d', 'DYS460', 'Y-GATA-H4', 'YCAII', 'DYS456', 'DYS607',
      'DYS576', 'DYS570', 'CDY', 'DYS442', 'DYS438', 'DYS531', 'DYS578'
    ];

    const vector = standardMarkers.map(marker => {
      const value = markers[marker];
      if (!value || value === '') return -1; // Missing value

      // Handle multi-copy markers
      if (value.includes('-')) {
        return parseFloat(value.split('-')[0]) || -1;
      }

      return parseFloat(value) || -1;
    });

    return vector;
  }

  // YFull-based prediction
  async yfullPrediction(markers, options = {}) {
    try {
      // Query database for closest matches
      const query = `
        SELECT
          haplogroup,
          COUNT(*) as match_count,
          AVG(calculate_genetic_distance($1, markers, 37)) as avg_distance
        FROM ystr_profiles
        WHERE haplogroup IS NOT NULL AND haplogroup != ''
        GROUP BY haplogroup
        HAVING AVG(calculate_genetic_distance($1, markers, 37)) <= 5
        ORDER BY avg_distance ASC, match_count DESC
        LIMIT 10
      `;

      const result = await executeQuery(query, [JSON.stringify(markers)]);

      if (result.rows.length === 0) {
        return {
          haplogroup: null,
          confidence: 0,
          method: 'yfull',
          message: 'No close matches found'
        };
      }

      const bestMatch = result.rows[0];
      const confidence = Math.max(0, 1 - (bestMatch.avg_distance / 10));

      return {
        haplogroup: bestMatch.haplogroup,
        confidence: parseFloat(confidence.toFixed(3)),
        alternatives: result.rows.slice(1, 5).map(row => ({
          haplogroup: row.haplogroup,
          confidence: Math.max(0, 1 - (row.avg_distance / 10)),
          matchCount: row.match_count
        })),
        method: 'yfull',
        avgDistance: parseFloat(bestMatch.avg_distance)
      };

    } catch (error) {
      console.error('❌ YFull prediction error:', error);
      throw error;
    }
  }

  // FTDNA-based prediction
  async ftdnaPrediction(markers, options = {}) {
    // Implement FTDNA prediction logic
    // This would use FTDNA haplogroup tree and rules
    return this.yfullPrediction(markers, options); // Placeholder
  }

  // Combined prediction using multiple methods
  async combinedPrediction(markers, options = {}) {
    try {
      const predictions = await Promise.allSettled([
        this.cudaMLPrediction(markers, options),
        this.yfullPrediction(markers, options)
      ]);

      const successfulPredictions = predictions
        .filter(p => p.status === 'fulfilled')
        .map(p => p.value)
        .filter(p => p.haplogroup && p.confidence >= (options.minConfidence || 0.5));

      if (successfulPredictions.length === 0) {
        return {
          haplogroup: null,
          confidence: 0,
          method: 'combined',
          message: 'No reliable predictions available'
        };
      }

      // Weight predictions by confidence and method
      const weightedPredictions = successfulPredictions.map(pred => ({
        ...pred,
        weight: pred.method === 'cuda_ml' ? 0.7 : 0.3
      }));

      // Find consensus or highest confidence prediction
      const consensus = this.findConsensus(weightedPredictions);

      return {
        ...consensus,
        method: 'combined',
        individualPredictions: successfulPredictions
      };

    } catch (error) {
      console.error('❌ Combined prediction error:', error);
      throw error;
    }
  }

  // Find consensus among predictions
  findConsensus(predictions) {
    if (predictions.length === 1) {
      return predictions[0];
    }

    // Group by haplogroup and calculate weighted confidence
    const groups = {};
    predictions.forEach(pred => {
      const haplo = pred.haplogroup;
      if (!groups[haplo]) {
        groups[haplo] = { predictions: [], totalWeight: 0, weightedConfidence: 0 };
      }
      groups[haplo].predictions.push(pred);
      groups[haplo].totalWeight += pred.weight;
      groups[haplo].weightedConfidence += pred.confidence * pred.weight;
    });

    // Find best consensus
    let bestHaplogroup = null;
    let bestScore = 0;

    Object.entries(groups).forEach(([haplo, group]) => {
      const avgConfidence = group.weightedConfidence / group.totalWeight;
      const consensusScore = avgConfidence * group.totalWeight;

      if (consensusScore > bestScore) {
        bestScore = consensusScore;
        bestHaplogroup = haplo;
      }
    });

    const bestGroup = groups[bestHaplogroup];
    const finalConfidence = bestGroup.weightedConfidence / bestGroup.totalWeight;

    return {
      haplogroup: bestHaplogroup,
      confidence: parseFloat(finalConfidence.toFixed(3)),
      consensusStrength: bestGroup.predictions.length / predictions.length
    };
  }

  // Enhance prediction with haplogroup tree information
  async enhancePredictionWithTree(prediction) {
    if (!this.haplogroupTree) {
      await this.loadHaplogroupTree();
    }

    const haplogroupInfo = this.haplogroupTree.find(
      h => h.haplogroup === prediction.haplogroup
    );

    if (haplogroupInfo) {
      prediction.treeInfo = {
        level: haplogroupInfo.level,
        path: haplogroupInfo.path,
        parent: haplogroupInfo.parent_haplogroup,
        root: haplogroupInfo.root
      };

      // Find related haplogroups
      prediction.relatedHaplogroups = this.haplogroupTree
        .filter(h => h.path.includes(prediction.haplogroup) && h.haplogroup !== prediction.haplogroup)
        .slice(0, 5)
        .map(h => h.haplogroup);
    }

    return prediction;
  }

  // Update haplogroup tree from external sources
  async updateHaplogroupTree(source = 'yfull') {
    try {
      let treeData;

      switch (source) {
        case 'yfull':
          treeData = await this.fetchYFullTree();
          break;
        case 'ftdna':
          treeData = await this.fetchFTDNATree();
          break;
        default:
          throw new Error(`Unknown source: ${source}`);
      }

      // Update database with new tree data
      const result = await withTransaction(async (client) => {
        // Clear existing tree
        await client.query('DELETE FROM haplogroups');

        // Insert new tree data
        let insertedCount = 0;
        for (const node of treeData) {
          await client.query(
            'INSERT INTO haplogroups (haplogroup, parent_haplogroup, level) VALUES ($1, $2, $3)',
            [node.haplogroup, node.parent, node.level]
          );
          insertedCount++;
        }

        return insertedCount;
      });

      // Clear cache
      await this.redis.del('haplogroup:tree');
      this.haplogroupTree = null;

      // Reload tree
      await this.loadHaplogroupTree();

      return {
        source,
        updatedNodes: result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error updating haplogroup tree:', error);
      throw error;
    }
  }

  // Fetch YFull haplogroup tree
  async fetchYFullTree() {
    // This would fetch from YFull API or parse their data files
    // For now, return placeholder implementation
    return [];
  }

  // Fetch FTDNA haplogroup tree
  async fetchFTDNATree() {
    // This would fetch from FTDNA sources
    // For now, return placeholder implementation
    return [];
  }

  // Health check for CUDA service
  async checkCudaService() {
    try {
      const response = await fetch(`${this.cudaServiceUrl}/health`, {
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`Service unavailable: ${response.status}`);
      }

      const status = await response.json();
      return {
        available: true,
        ...status
      };

    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }
}

module.exports = new HaplogroupService();