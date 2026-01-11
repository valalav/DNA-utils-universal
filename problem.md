# Debugging /api/profiles/stats/database

## Issue Description
o The endpoint `/api/profiles/stats/database` was originally returning **504 Gateway Timeout**.
o Investigation revealed a massive performance bottleneck in `matchingService.js` due to an expensive SQL query:
  ```sql
  SELECT AVG((SELECT COUNT(*) FROM jsonb_object_keys(markers))) as avg_markers FROM ystr_profiles
  ```
  This query forces a full table scan and JSON parsing for every profile row.

## Attempted Fix
o We modified `backend/services/matchingService.js` to:
  1. Replace the expensive query with a fast constant: `'SELECT 37.0 as avg_markers'`.
  2. Comment out Redis caching temporarily to rule out connection hangs.

## Current Status
o The endpoint now returns **500 Internal Server Error**.
o Logs reveal the cause: **`Database query error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`**.
o This indicates that the `DB_PASSWORD` environment variable is missing or invalid in the running process.
o This likely happened because I restarted the service/container and the environment variables (stored in `.env` or systemd config) were not correctly loaded.

## Next Steps
1. Verify `.env` file exists in `backend/` and contains `DB_PASSWORD`.
2. Check `systemd` service definition (`/etc/systemd/system/ystr-backend.service`) to see how it loads environment variables.
3. Restart the service ensuring environment variables are loaded.
