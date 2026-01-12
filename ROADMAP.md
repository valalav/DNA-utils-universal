# 🗺️ Project Roadmap: DNA-utils-universal

**Goal**: Transform the system into a universally accessible, high-performance Y-DNA analysis platform with external integration capabilities.

## 🟢 Active Development (Priority Order)
*(No active tasks - All Roadmap items complete)*

## 🟡 Planned / Backlog
*   **Feature**: Public API Gateway
    *   Secure endpoints for external sites to query minimal dataset.
*   **Feature**: Haplogroup Tree v2
    *   Sync with latest YFull/FTDNA trees automatically.

## 🔵 Completed / In Review
*   **Feature**: JSON Match Export (for WP Integration)
    *   **Status**: ✅ Deployed (`GET /api/profiles/export/matches/:kitNumber`)
*   **Feature**: Backend Multi-Core Scaling (PM2 Cluster)
    *   **Status**: ✅ Deployed (32 instances, tuned pool)
*   **Feature**: PostgreSQL Signature Filter (Performance)
    *   **Status**: ✅ Deployed (`intarray` + GiST Index)
*   **UI/UX**: FTDNA Panel Badges (Y37/Y67/Y111) with Palindrome logic.
*   **UI/UX**: Edit Query Profile functionality.
*   **Infra**: Hybrid Cloud Setup (Oracle VPS + Proxmox).
*   **Localization**: Full English UI enforcement.

---

## 🟣 Infrastructure Migration (Performance Unlock)
**Context**: Current Proxmox LXC setup blocks Docker SHM/AppArmor, limiting Postgres to single-core performance (~40s search).
**Goal**: Migrate to Privileged VM to unlock `max_parallel_workers` (~10s search).

1.  **Environment Setup**:
    *   Create a **Full VM** (not LXC) or Privileged LXC on Proxmox.
    *   Install Docker & Netbird.
    *   **Verify**: Run `docker run -it --rm --shm-size=4g postgres:15 ipcs` (Must show segments, not "Permission Denied").
2.  **Data Migration**:
    *   Backup current stable DB: `pg_dump -Fc ... > backup.dump`.
    *   Restore on new node.
3.  **Parallelism Activation**:
    *   Uncomment `shm_size: 4gb` in `docker-compose.yml`.
    *   Uncomment `max_parallel_workers` settings.
    *   Apply `008_restore_parallel_sql_logic.sql`.
4.  **Verification**:
    *   Run `benchmark.js` - Expect <12s on 300k profiles.
