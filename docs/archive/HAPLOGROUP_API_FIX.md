# Haplogroup API Fix Summary

**Date**: 2025-10-04
**Status**: ✅ Ready for testing

## Problem

Haplogroup tree API was returning 500 Internal Server Error when clicking on haplogroups in the matches table.

## Root Cause

**Environment variable mismatch**:
- `.env.local` contained: `HAPLO_API_URL=http://localhost:9003`
- Code in `route.ts` expected: `BACKEND_API_URL`
- Fallback value was incorrect: `http://127.0.0.1:9004/api` (wrong port 9004 instead of 9003)

## Solution Applied

### 1. Fixed `.env.local`
Changed variable name and added `/api` path:
```env
BACKEND_API_URL=http://localhost:9003/api
```

### 2. Fixed route.ts fallback
Changed default value from port 9004 to 9003:
```typescript
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:9003/api'
```

### 3. Added debug logging
Added console.log to help troubleshoot environment variable loading:
```typescript
console.log('🔧 BACKEND_API_URL:', BACKEND_API_URL, '(env:', process.env.BACKEND_API_URL, ')');
```

## Files Modified

1. **str-matcher/.env.local**
   - Changed `HAPLO_API_URL` → `BACKEND_API_URL`
   - Added `/api` path suffix
   - Changed `localhost` (same as `127.0.0.1`)

2. **str-matcher/src/app/api/[...path]/route.ts**
   - Fixed fallback port from 9004 → 9003
   - Added debug logging for environment variables
   - Added emoji logging for better visibility

## How to Test

1. **Start Next.js dev server** in your terminal:
   ```bash
   cd str-matcher
   npm run dev
   ```

2. **Open the application** in browser (check terminal for the port, usually 3000 or 3001):
   ```
   http://localhost:3000  # or 3001, check terminal output
   ```

3. **Test haplogroup tree**:
   - Import a CSV file or use existing database
   - Perform a search to find matches
   - Click on any haplogroup link in the matches table
   - Should see haplogroup tree popup without errors

## Expected Behavior

- ✅ No 500 Internal Server Error
- ✅ Haplogroup tree loads successfully
- ✅ Both FTDNA and YFull data displayed (if available)
- ✅ Terminal shows debug log on first API request:
  ```
  🔧 BACKEND_API_URL: http://localhost:9003/api (env: http://localhost:9003/api )
  📤 Проксируем запрос к: http://localhost:9003/api/haplogroup-path/...
  ```

## Architecture

```
Browser
  ↓
Next.js :3000 or :3001
  ↓ /api/haplogroup-path/*
Next.js API Route (proxy)
  ↓ BACKEND_API_URL
Haplogroup Service :9003
  ↓ /api/haplogroup-path/*
Response with tree data
```

## Notes

- Next.js must be started in **interactive terminal** (not background process)
- Background processes via Claude Code don't serve static files correctly
- After changing `.env.local`, Next.js dev server must be restarted
- Clearing `.next` cache may be needed if changes don't take effect

## Troubleshooting

If haplogroup API still doesn't work after testing:

1. **Check terminal logs** for the debug message `🔧 BACKEND_API_URL:`
2. **Verify haplogroup service** is running on port 9003:
   ```bash
   curl http://localhost:9003/api/haplogroup-path/R1b
   ```
3. **Clear Next.js cache** and restart:
   ```bash
   rm -rf .next
   npm run dev
   ```
4. **Check browser console** for any client-side errors

## Related Issues Fixed

This fix also resolved the CSV import issues fixed earlier:
- ✅ IndexedDB initialization
- ✅ React Strict Mode duplication
- ✅ Dev mode auto-clear
- ✅ CSV parser column detection

All fixes are now committed and documented.
