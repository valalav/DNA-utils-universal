const express = require('express');
const Joi = require('joi');
const { executeQuery } = require('../config/database');
const { requireApiKey, logAudit } = require('../middleware/apiKeyAuth');
const { validateRequest, asyncHandler } = require('../middleware/validation');

const router = express.Router();

// Validation schemas
const createSampleSchema = Joi.object({
  kitNumber: Joi.string().required().max(20),
  name: Joi.string().allow('').max(100),
  country: Joi.string().allow('').max(50),
  haplogroup: Joi.string().allow('').max(50),
  markers: Joi.object().required().min(1)
});

const updateSampleSchema = Joi.object({
  kitNumber: Joi.string().optional(), // Allow kitNumber in body (ignored in favor of URL param)
  name: Joi.string().allow('').max(100),
  country: Joi.string().allow('').max(50),
  haplogroup: Joi.string().allow('').max(50),
  markers: Joi.object()
}).min(1); // At least one field must be present

// Schema for bulk sample import
const bulkSamplesSchema = Joi.object({
  samples: Joi.array().items(
    Joi.object({
      kitNumber: Joi.string().required().max(20),
      name: Joi.string().allow('').max(100),
      country: Joi.string().allow('').max(50),
      haplogroup: Joi.string().allow('').max(50),
      markers: Joi.object().required().min(1)
    })
  ).required().min(1).max(5000),
  replaceExisting: Joi.boolean().default(true) // If true, update existing records
});

/**
 * POST /api/samples/bulk - Bulk import samples (optimized for 1000-5000 samples)
 * Requires API key with 'samples.create' permission
 *
 * Uses PostgreSQL bulk_insert_profiles function for single-transaction insert
 * ~100x faster than individual POST /api/samples calls
 */
router.post('/bulk',
  requireApiKey('samples.create'),
  validateRequest(bulkSamplesSchema),
  asyncHandler(async (req, res) => {
    const { samples, replaceExisting = true } = req.body;
    const startTime = Date.now();

    try {
      // Validate marker values (numeric, ranges like 13-14, or multi-copy like 11-12-12-16)
      // Pattern: numbers separated by dashes, with optional decimals
      const markerValueRegex = /^[0-9]+(\.[0-9]+)?(-[0-9]+(\.[0-9]+)?)*$/;
      let cleanedMarkersCount = 0;

      // Clean invalid markers from each sample (don't reject entire sample)
      const validSamples = samples.map(sample => {
        const cleanMarkers = {};
        for (const [marker, value] of Object.entries(sample.markers)) {
          const strValue = value?.toString().trim();
          if (strValue && markerValueRegex.test(strValue)) {
            cleanMarkers[marker] = strValue;
          } else if (strValue) {
            cleanedMarkersCount++;
          }
        }
        return { ...sample, markers: cleanMarkers };
      }).filter(sample => Object.keys(sample.markers).length > 0);

      const invalidSamples = samples.length - validSamples.length;

      if (validSamples.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid samples to import (all samples have no valid markers)'
        });
      }

      // Transform to database format and deduplicate by kitNumber (keep last occurrence)
      const profilesMap = new Map();
      for (const sample of validSamples) {
        profilesMap.set(sample.kitNumber, {
          kit_number: sample.kitNumber,
          name: sample.name || '',
          country: sample.country || '',
          haplogroup: sample.haplogroup || '',
          markers: sample.markers
        });
      }
      const profilesData = Array.from(profilesMap.values());
      const duplicatesRemoved = validSamples.length - profilesData.length;

      // Process in chunks to avoid PostgreSQL statement timeout
      const CHUNK_SIZE = 500; // Optimized for fast batch INSERT
      let insertedCount = 0;

      for (let i = 0; i < profilesData.length; i += CHUNK_SIZE) {
        const chunk = profilesData.slice(i, i + CHUNK_SIZE);
        const query = 'SELECT bulk_insert_profiles($1) as inserted_count';
        const result = await executeQuery(query, [JSON.stringify(chunk)]);
        insertedCount += result.rows[0].inserted_count;
      }
      const duration = Date.now() - startTime;

      // Log single audit entry for bulk operation
      await logAudit(
        req,
        'BULK_CREATE',
        'ystr_profiles',
        `bulk:${insertedCount}`,
        null,
        { count: insertedCount, duration, skipped: invalidSamples, cleanedMarkers: cleanedMarkersCount },
        true
      );

      res.status(201).json({
        success: true,
        message: `Bulk import completed`,
        inserted: insertedCount,
        skipped: invalidSamples,
        duplicatesRemoved,
        cleanedMarkers: cleanedMarkersCount,
        total: samples.length,
        duration,
        speed: Math.round(insertedCount / (duration / 1000)) + ' samples/sec'
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      await logAudit(
        req,
        'BULK_CREATE',
        'ystr_profiles',
        `bulk:failed`,
        null,
        null,
        false,
        error.message
      );

      throw error;
    }
  })
);

/**
 * POST /api/samples - Create or update a sample
 * Requires API key with 'samples.create' permission
 */
router.post('/',
  requireApiKey('samples.create'),
  validateRequest(createSampleSchema),
  asyncHandler(async (req, res) => {
    const { kitNumber, name, country, haplogroup, markers } = req.body;

    try {
      // Check if sample already exists
      const existingQuery = await executeQuery(
        'SELECT * FROM ystr_profiles WHERE kit_number = $1',
        [kitNumber]
      );

      const oldData = existingQuery.rows[0] || null;
      const isUpdate = !!oldData;

      // Insert or update sample
      const query = `
        INSERT INTO ystr_profiles (kit_number, name, country, haplogroup, markers)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (kit_number)
        DO UPDATE SET
          name = EXCLUDED.name,
          country = EXCLUDED.country,
          haplogroup = EXCLUDED.haplogroup,
          markers = EXCLUDED.markers,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await executeQuery(query, [
        kitNumber,
        name || '',
        country || '',
        haplogroup || '',
        JSON.stringify(markers)
      ]);

      const newData = result.rows[0];

      // Log audit entry
      await logAudit(
        req,
        isUpdate ? 'UPDATE' : 'CREATE',
        'ystr_profiles',
        kitNumber,
        oldData,
        newData,
        true
      );

      res.status(isUpdate ? 200 : 201).json({
        success: true,
        action: isUpdate ? 'updated' : 'created',
        sample: {
          kitNumber: newData.kit_number,
          name: newData.name,
          country: newData.country,
          haplogroup: newData.haplogroup,
          markers: newData.markers,
          createdAt: newData.created_at,
          updatedAt: newData.updated_at
        }
      });
    } catch (error) {
      // Log failed operation
      await logAudit(
        req,
        'CREATE',
        'ystr_profiles',
        kitNumber,
        null,
        null,
        false,
        error.message
      );

      throw error;
    }
  })
);

/**
 * PUT /api/samples/:kitNumber - Update existing sample
 * Requires API key with 'samples.update' permission
 */
router.put('/:kitNumber',
  requireApiKey('samples.update'),
  validateRequest(updateSampleSchema),
  asyncHandler(async (req, res) => {
    const { kitNumber } = req.params;
    const updates = req.body;

    try {
      // Get existing sample
      const existingQuery = await executeQuery(
        'SELECT * FROM ystr_profiles WHERE kit_number = $1',
        [kitNumber]
      );

      if (existingQuery.rows.length === 0) {
        await logAudit(
          req,
          'UPDATE',
          'ystr_profiles',
          kitNumber,
          null,
          null,
          false,
          'Sample not found'
        );

        return res.status(404).json({
          error: 'Sample not found',
          kitNumber
        });
      }

      const oldData = existingQuery.rows[0];

      // Build UPDATE query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updates.name);
      }
      if (updates.country !== undefined) {
        updateFields.push(`country = $${paramIndex++}`);
        updateValues.push(updates.country);
      }
      if (updates.haplogroup !== undefined) {
        updateFields.push(`haplogroup = $${paramIndex++}`);
        updateValues.push(updates.haplogroup);
      }
      if (updates.markers !== undefined) {
        updateFields.push(`markers = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.markers));
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(kitNumber);

      const query = `
        UPDATE ystr_profiles
        SET ${updateFields.join(', ')}
        WHERE kit_number = $${paramIndex}
        RETURNING *
      `;

      const result = await executeQuery(query, updateValues);
      const newData = result.rows[0];

      // Log audit entry
      await logAudit(
        req,
        'UPDATE',
        'ystr_profiles',
        kitNumber,
        oldData,
        newData,
        true
      );

      res.json({
        success: true,
        action: 'updated',
        sample: {
          kitNumber: newData.kit_number,
          name: newData.name,
          country: newData.country,
          haplogroup: newData.haplogroup,
          markers: newData.markers,
          createdAt: newData.created_at,
          updatedAt: newData.updated_at
        }
      });
    } catch (error) {
      await logAudit(
        req,
        'UPDATE',
        'ystr_profiles',
        kitNumber,
        null,
        null,
        false,
        error.message
      );

      throw error;
    }
  })
);

/**
 * DELETE /api/samples/:kitNumber - Delete a sample
 * Requires API key with 'samples.delete' permission
 */
router.delete('/:kitNumber',
  requireApiKey('samples.delete'),
  asyncHandler(async (req, res) => {
    const { kitNumber } = req.params;

    try {
      // Get existing sample
      const existingQuery = await executeQuery(
        'SELECT * FROM ystr_profiles WHERE kit_number = $1',
        [kitNumber]
      );

      if (existingQuery.rows.length === 0) {
        await logAudit(
          req,
          'DELETE',
          'ystr_profiles',
          kitNumber,
          null,
          null,
          false,
          'Sample not found'
        );

        return res.status(404).json({
          error: 'Sample not found',
          kitNumber
        });
      }

      const oldData = existingQuery.rows[0];

      // Delete sample
      await executeQuery(
        'DELETE FROM ystr_profiles WHERE kit_number = $1',
        [kitNumber]
      );

      // Log audit entry
      await logAudit(
        req,
        'DELETE',
        'ystr_profiles',
        kitNumber,
        oldData,
        null,
        true
      );

      res.json({
        success: true,
        action: 'deleted',
        kitNumber
      });
    } catch (error) {
      await logAudit(
        req,
        'DELETE',
        'ystr_profiles',
        kitNumber,
        null,
        null,
        false,
        error.message
      );

      throw error;
    }
  })
);

/**
 * GET /api/samples/:kitNumber - Get sample details (public, no API key required)
 */
router.get('/:kitNumber',
  asyncHandler(async (req, res) => {
    const { kitNumber } = req.params;

    const result = await executeQuery(
      'SELECT * FROM ystr_profiles WHERE kit_number = $1',
      [kitNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Sample not found',
        kitNumber
      });
    }

    const sample = result.rows[0];

    res.json({
      success: true,
      sample: {
        kitNumber: sample.kit_number,
        name: sample.name,
        country: sample.country,
        haplogroup: sample.haplogroup,
        markers: sample.markers,
        createdAt: sample.created_at,
        updatedAt: sample.updated_at
      }
    });
  })
);

module.exports = router;
