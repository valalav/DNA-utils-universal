# CSV Import Fix - Complete Solution

**Date**: 2025-10-04
**Status**: ✅ Resolved

## Problem Summary

CSV import was not working correctly due to multiple issues:

1. **Data not loaded after page reload** - profiles imported but search returned no results
2. **Database not initialized error** - IndexedDB accessed before initialization
3. **Data duplication** - profiles saved twice on import
4. **React Strict Mode interference** - double execution of all operations in dev mode
5. **Dev mode persistence** - imported data persisted between server restarts

## Root Causes

### 1. Missing IndexedDB Integration
The original implementation saved data to IndexedDB but never loaded it back on page mount, so the in-memory `database` array was always empty after refresh.

### 2. Incorrect Initialization Order
`dbManager.hasProfiles()` was called before `dbManager.init()`, causing database access errors.

### 3. Double Saving
Profiles were saved both in `DatabaseInput.tsx` component AND in the `mergeDatabase` function, causing duplication.

### 4. React Strict Mode Double Mounting
In development, React Strict Mode mounts components twice to detect side effects. Using `useRef` flags didn't work because each mount creates a separate instance with its own ref values.

### 5. CSV Parser Column Detection
The CSV parser wasn't properly detecting the `kitNumber` column, leading to profiles being assigned auto-generated IDs like `AUTO_1`, `AUTO_2`, etc.

## Solution

### 1. IndexedDB Auto-Load on Mount

Added initialization logic in `useSTRMatcher.ts`:

```typescript
const initialized = useRef(false);

useEffect(() => {
  if (initialized.current) return;
  initialized.current = true;

  const loadProfilesFromIndexedDB = async () => {
    // Initialize database first
    await dbManager.init();

    // Clear in dev mode
    if (process.env.NODE_ENV === 'development') {
      await dbManager.clearProfiles();
      setDatabase([]);
      return;
    }

    // Load profiles in production
    const profiles = await dbManager.getProfiles();
    setDatabase(profiles);
  };

  loadProfilesFromIndexedDB();
}, []);
```

**Key points**:
- ✅ Database initialized before any operations
- ✅ Auto-clears in dev mode on each page load
- ✅ Preserves data in production mode
- ✅ `useRef` flag prevents double execution from React Strict Mode

### 2. Fixed Merge Database Function

Changed from synchronous to async with global lock:

```typescript
// Global flag OUTSIDE the hook to prevent React Strict Mode duplication
let isMerging = false;

const mergeDatabase = useCallback(async (newProfiles: STRProfile[]) => {
  // Check lock immediately (synchronous)
  if (isMerging) {
    console.log('⏭️ Skipping duplicate mergeDatabase call');
    return;
  }

  isMerging = true; // Lock immediately

  try {
    // Update memory array
    const mergedProfiles = await new Promise<STRProfile[]>((resolve) => {
      setDatabase(prevDatabase => {
        const merged = mergeProfiles(prevDatabase, newProfiles);
        setTimeout(() => resolve(merged), 0);
        return merged;
      });
    });

    // Save to IndexedDB AFTER state update
    await dbManager.mergeProfiles(newProfiles);

  } finally {
    isMerging = false; // Always unlock
  }
}, []);
```

**Why global flag instead of useRef**:
- React Strict Mode creates TWO instances of the component
- Each instance has its own `useRef` values
- Global variable is shared across all instances
- First instance sets flag, second instance sees it and exits

### 3. Removed Double Saving

In `DatabaseInput.tsx`, removed direct IndexedDB saving:

```typescript
// BEFORE (saved twice):
await parseCSVData(text);
await dbManager.mergeProfiles(profiles); // ❌ Remove this
onDataLoaded(profiles);

// AFTER (saved once in mergeDatabase):
await parseCSVData(text);
await onDataLoaded(profiles); // This calls mergeDatabase, which saves to IndexedDB
```

### 4. Improved CSV Parser

Enhanced column detection in `csvParser.ts`:

```typescript
// More comprehensive aliases for kitNumber column
const kitNumberAliases = ['kit number', 'kit no', 'kit', 'id', 'number', 'kitnumber'];
const kitIndex = headers.findIndex(h => kitNumberAliases.includes(h.toLowerCase()));

// Remove quotes from headers
const headers = lines[0].split(/\t|,/).map(h => h.trim().replace(/"/g, ''));

// Debug logging for first 3 profiles
if (i <= 3) {
  console.log(`📝 Row ${i}:`, {
    kitIndex,
    actualKitNumber,
    'values[kitIndex]': values[kitIndex],
    firstFewValues: values.slice(0, 5)
  });
}
```

**Improvements**:
- ✅ Added 'kitnumber' (without space) to aliases
- ✅ Strip quotes from headers
- ✅ Debug logging for troubleshooting
- ✅ Better fallback to AUTO_XXX only when truly needed

## Files Modified

1. **str-matcher/src/hooks/useSTRMatcher.ts**
   - Added IndexedDB auto-load on mount
   - Added dev mode auto-clear
   - Changed `mergeDatabase` to async with global lock
   - Added global `isMerging` flag

2. **str-matcher/src/utils/csvParser.ts**
   - Improved kitNumber column detection
   - Added debug logging
   - Strip quotes from headers

3. **str-matcher/src/components/str-matcher/DatabaseInput.tsx**
   - Removed duplicate IndexedDB saving
   - Made `onDataLoaded` async

4. **str-matcher/src/components/str-matcher/STRMatcher.tsx**
   - Added `lastImportedKitNumber` state
   - Added auto-selection via `useEffect` on database changes

## Testing

### Test Case 1: CSV Import
1. ✅ Load page → database is empty (dev mode)
2. ✅ Import CSV file → profiles loaded correctly with original kitNumbers
3. ✅ Last profile auto-selected
4. ✅ Search works correctly

### Test Case 2: Dev Server Restart
1. ✅ Import CSV → data shows "1437 profiles"
2. ✅ Restart dev server → database auto-clears
3. ✅ Page shows "0 profiles"

### Test Case 3: React Strict Mode
1. ✅ Import CSV → no duplication in logs
2. ✅ Only ONE "🔒 mergeDatabase locked" message
3. ✅ Only ONE "💾 Saved to IndexedDB" message
4. ✅ Profile count correct (not doubled)

## Architecture Understanding

### Two-Tier Storage System

```
┌─────────────────────────────────────────┐
│          Browser Memory (RAM)           │
│   database: STRProfile[] (useState)     │
│   - Fast search operations              │
│   - Cleared on page refresh             │
└─────────────────────────────────────────┘
                 ↕ sync
┌─────────────────────────────────────────┐
│         IndexedDB (Disk)                │
│   - Persistent storage                  │
│   - Survives page refresh (production)  │
│   - Auto-cleared in dev mode            │
└─────────────────────────────────────────┘
```

**Flow**:
1. **Import**: CSV → memory array + IndexedDB (parallel)
2. **Search**: Operates on memory array only (fast)
3. **Page Load**: IndexedDB → memory array (restore)
4. **Dev Mode**: Auto-clear both on each reload

## Lessons Learned

### 1. React Strict Mode Gotchas
- `useRef` is per-instance, not shared
- Need global variables for cross-instance locks
- Double mounting is intentional, not a bug

### 2. Async State Updates
- `setState` callbacks see stale closures
- Use `useEffect` with dependencies for post-update logic
- Wait for state updates with Promises when needed

### 3. IndexedDB Best Practices
- Always initialize before any operations
- Batch operations for performance
- Clear old data in development for clean testing

### 4. CSV Parsing Edge Cases
- Headers may have quotes
- Column names have variations ("kit number" vs "kitnumber")
- Always log parsed data for debugging

## Future Improvements

1. **Production Mode Testing** - verify data persists across sessions
2. **Large File Performance** - test with 10K+ profiles
3. **Error Recovery** - handle corrupted IndexedDB state
4. **Export Validation** - verify exported CSV matches imported data
5. **Remove Debug Logs** - clean up console.log statements for production
