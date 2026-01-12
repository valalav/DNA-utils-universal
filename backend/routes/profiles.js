const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const Joi = require('joi');
const matchingService = require('../services/matchingService');
const { validateRequest, asyncHandler } = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Validation schemas
const findMatchesSchema = Joi.object({
  markers: Joi.object().required().min(1),
  maxDistance: Joi.number().integer().min(0).max(100).default(25),
  maxResults: Joi.number().integer().min(1).max(10000).default(1000),
  markerCount: Joi.number().integer().valid(12, 25, 37, 67, 111).default(37),
  haplogroupFilter: Joi.string().allow('', null),
  includeSubclades: Joi.boolean().default(false),
  useCache: Joi.boolean().default(true)
});

const searchProfilesSchema = Joi.object({
  searchTerm: Joi.string().allow(''),
  haplogroup: Joi.string().allow('', null),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0)
});

// Routes

// POST /api/profiles/find-matches - Find genetic matches
router.post('/find-matches',
  validateRequest(findMatchesSchema),
  asyncHandler(async (req, res) => {
    const { markers, ...options } = req.body;

    // Validate that markers object is not empty
    if (!markers || Object.keys(markers).length === 0) {
      return res.status(400).json({
        error: 'Markers object cannot be empty'
      });
    }

    const matches = await matchingService.findMatches(markers, options);

    res.json({
      success: true,
      matches,
      total: matches.length,
      options: {
        maxDistance: options.maxDistance,
        maxResults: options.maxResults,
        markerCount: options.markerCount
      }
    });
  })
);

// POST /api/profiles/upload - Upload CSV file with profiles
router.post('/upload',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const csvContent = req.file.buffer.toString('utf-8');

    // Parse CSV with Papa Parse
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim()
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({
        error: 'CSV parsing failed',
        details: parseResult.errors
      });
    }

    // Transform CSV data to profile objects
    const profiles = parseResult.data.map(row => {
      // Extract kit number, name, country, haplogroup
      const profile = {
        kitNumber: row.kitNumber || row.kit_number || row.KitNumber,
        name: row.name || row.Name || '',
        country: row.country || row.Country || '',
        haplogroup: row.haplogroup || row.Haplogroup || ''
      };

      // Extract markers (all other columns)
      const markers = {};
      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (!['kitnumber', 'kit_number', 'name', 'country', 'haplogroup'].includes(lowerKey)) {
          if (row[key] && row[key] !== '') {
            markers[key] = row[key];
          }
        }
      });

      profile.markers = markers;
      return profile;
    }).filter(profile => profile.kitNumber && Object.keys(profile.markers).length > 0);

    if (profiles.length === 0) {
      return res.status(400).json({
        error: 'No valid profiles found in CSV file'
      });
    }

    // Limit batch size to prevent memory issues
    const maxBatchSize = parseInt(process.env.MAX_PROFILES_PER_BATCH) || 10000;
    if (profiles.length > maxBatchSize) {
      return res.status(400).json({
        error: `Too many profiles. Maximum ${maxBatchSize} profiles per batch.`,
        found: profiles.length
      });
    }

    // Bulk insert profiles
    const result = await matchingService.bulkInsertProfiles(profiles);

    res.json({
      success: true,
      message: 'Profiles uploaded successfully',
      ...result,
      totalProcessed: profiles.length
    });
  })
);

// GET /api/profiles/:kitNumber - Get specific profile
router.get('/:kitNumber',
  asyncHandler(async (req, res) => {
    const { kitNumber } = req.params;

    const profile = await matchingService.getProfile(kitNumber);

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    res.json({
      success: true,
      profile
    });
  })
);

// GET /api/profiles - Search profiles with pagination
router.get('/',
  validateRequest(searchProfilesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const profiles = await matchingService.searchProfiles(
      req.query.searchTerm,
      {
        limit: req.query.limit,
        offset: req.query.offset,
        haplogroup: req.query.haplogroup
      }
    );

    res.json({
      success: true,
      profiles,
      pagination: {
        limit: req.query.limit,
        offset: req.query.offset,
        hasMore: profiles.length === req.query.limit
      }
    });
  })
);

// GET /api/profiles/export/matches/:kitNumber - Export matches as JSON
router.get('/export/matches/:kitNumber',
  asyncHandler(async (req, res) => {
    const { kitNumber } = req.params;
    const options = {
      maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance) : 25,
      markerCount: req.query.markerCount ? parseInt(req.query.markerCount) : 37,
      useCache: req.query.refresh !== 'true'
    };

    const exportData = await matchingService.exportMatches(kitNumber, options);

    res.json(exportData);
  })
);

// GET /api/profiles/stats/database - Get database statistics
router.get('/stats/database',
  asyncHandler(async (req, res) => {
    const stats = await matchingService.getStatistics();

    res.json({
      success: true,
      statistics: stats
    });
  })
);

// DELETE /api/profiles/:kitNumber - Delete profile
router.delete('/:kitNumber',
  asyncHandler(async (req, res) => {
    const { kitNumber } = req.params;

    const query = 'DELETE FROM ystr_profiles WHERE kit_number = $1 RETURNING kit_number';
    const result = await require('../config/database').executeQuery(query, [kitNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    // Clear caches
    await matchingService.clearMatchingCaches();

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });
  })
);

// POST /api/profiles/batch-delete - Delete multiple profiles
router.post('/batch-delete',
  asyncHandler(async (req, res) => {
    const { kitNumbers } = req.body;

    if (!Array.isArray(kitNumbers) || kitNumbers.length === 0) {
      return res.status(400).json({
        error: 'kitNumbers must be a non-empty array'
      });
    }

    const placeholders = kitNumbers.map((_, i) => `$${i + 1}`).join(',');
    const query = `DELETE FROM ystr_profiles WHERE kit_number IN (${placeholders}) RETURNING kit_number`;

    const result = await require('../config/database').executeQuery(query, kitNumbers);

    // Clear caches
    await matchingService.clearMatchingCaches();

    res.json({
      success: true,
      message: 'Profiles deleted successfully',
      deletedCount: result.rows.length,
      deletedKitNumbers: result.rows.map(row => row.kit_number)
    });
  })
);

module.exports = router;