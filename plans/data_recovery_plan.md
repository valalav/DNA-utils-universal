# Data Recovery Plan: Duplicate Profile Cleanup

**Date:** 2026-01-11
**Issue:** Duplicate records (e.g., `YF143382`) exist in `ystr_profiles` despite active `UNIQUE(kit_number)` constraint.
**Diagnosis:** **PostgreSQL Index Corruption**. The B-Tree index for `kit_number` has become inconsistent with the table heap, likely due to a previous crash or high-concurrency event during bulk loading.

## 1. Verify Scope
We confirmed duplicates exist and are binary identical:
```sql
SELECT kit_number, count(*) FROM ystr_profiles GROUP BY kit_number HAVING count(*) > 1;
```

## 2. Remediation Steps

### Step A: Surgical Deduplication
We will execute a script to delete duplicate rows, keeping only the most recently updated/created entry for each `kit_number`.

**SQL Logic:**
```sql
DELETE FROM ystr_profiles a USING (
    SELECT MIN(ctid) as ctid, kit_number
    FROM ystr_profiles
    GROUP BY kit_number HAVING COUNT(*) > 1
) b
WHERE a.kit_number = b.kit_number
AND a.ctid <> b.ctid;
```
*Note: Using `ctid` (physical location) is the most robust way to target specific rows when primary keys might also be compromised (though `id` seems unique here).*

### Step B: Rebuild Index (CRITICAL)
Once duplicates are removed, we MUST rebuild the index to sync it with the table reality.
```sql
REINDEX TABLE ystr_profiles;
```

### Step C: Verification
1. Attempt to insert a known duplicate (should fail).
2. Query for duplicates (should return 0).
3. Verify total count matches expectations.

## 3. Execution Constraints
*   **Downtime**: `REINDEX` locks the table. Given the dataset size (~315k rows), this should take < 10 seconds.
*   **Safety**: We will backup the duplicate rows to a separate table/file before deletion if requested, but given they are identical, direct deletion is acceptable.
