# Post-Mortem: Optimization Attempt & Restoration
**Date**: 2026-01-12
**Status**: Resolved (Reverted to Stable + Data Integrity Improved)

## 1. The Objective (The "Why")
Starting at approx. 08:00 AM, we aimed to maximize the performance of the search engine using the server's 90GB RAM.
*   **Goal**: Reduce search time to <15s (from ~40s).
*   **Strategy**:
    1.  Enable Docker Shared Memory (`shm_size: 4gb`) to allow parallel SQL workers.
    2.  Implement V2/V6 "Parallel SQL" Logic (Concurrent Workers).
    3.  Enable PM2 Clustering (32 backend instances).

## 2. Technical Blockers (The "What went wrong")

### A. Infrastructure Incompatibility (Proxmox vs Docker)
*   **Attempt**: Added `shm_size: 4gb` to `postgres`.
*   **Failure**: The Docker container refused to start.
*   **Root Cause**: Proxmox LXC containers enforce AppArmor profiles that restrict shared memory allocation.
*   **Effect**: We wasted hours creating "Boot Loops" where the database was inaccessible.

### B. Database Locking (The "Concurrency Trap")
*   **Attempt**: Applied `optimizations.sql` to speed up inserts.
*   **Failure**: Data imports failed with `cannot run inside a transaction block` and deadlocks.
*   **Root Cause**: The function `refresh_marker_statistics` used `REFRESH MATERIALIZED VIEW CONCURRENTLY`. This requires unique indexes and strict transaction isolation, which conflicted with our bulk import scripts.

### C. The "Zombie" Ports (PM2 Clustering)
*   **Attempt**: Ran `pm2 start ... -i max` (32 instances).
*   **Failure**: Ports 9005/9006 became "locked" by rogue processes even after stopping PM2.
*   **Effect**: Nginx returned 502 Errors because it couldn't talk to the backend.

### D. Data "Loss" (The Legacy Script Bug)
*   **Incident**: When we tried to re-import data to fix the DB, it failed.
*   **Root Cause**: The script `reimport-all.js` had a legacy bug where it passed arguments with spaces (`--file path`) instead of equals (`--file=path`). This bug was hidden in "Stable" versions but surfaced when we tried to run it manually.

## 3. The Revert Decision (14:00 PM)
After 6 hours of fighting infrastructure, the decision was made to **Cut Losses**:
*   **Action**: `git reset --hard 9e46190` (Revert to "Morning State").
*   **Outcome**: Removed all clustering, removed parallel SQL, removed Docker SHM tweaks.

## 4. The Restoration & Discovery (The "Good News")
While fixing the revert, we actually improved the system beyond its morning state:

1.  **Fixed Nginx**: We found that the Public Proxy (Oracle) was pointing to Port 9006, but the Local App was on 9005. This was fixed. **Public Access is restored.**
2.  **Found Missing Data**: We discovered `R1b.xlsx` (53MB) lying unused in the root.
    *   This file contained ~150,000 profiles (Haplogroup R-M343).
    *   We built a new `stream_convert.js` to process it.
    *   **Total Profiles increased from 162k -> 318k.**
3.  **Fixed Search 500**: The revert accidentally deleted the `marker_panels` table (Dependency Hell). We diagnosed and restored it.

## Summary
We are back to the **Stable Logic (V5)**. It is slower (~30-40s) than our theoretical target (<15s), but it is **Robust**, **Publicly Accessible**, and contains **Double the Data** compared to this morning.
