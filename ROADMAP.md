# 🗺️ Project Roadmap: DNA-utils-universal

**Goal**: Transform the system into a universally accessible, high-performance Y-DNA analysis platform with external integration capabilities.

## 🟢 Active Development (Priority Order)
1.  **Feature**: Backend Multi-Core Scaling (PM2 Cluster)
    *   **Goal**: Utilize all CPU cores on Proxmox node.
    *   **Implementation**: Enable `instances: 'max'` and `exec_mode: 'cluster'` in PM2.
    *   **Status**: 🏗️ Pending Design

2.  **Feature**: PostgreSQL Signature Filter (Performance)
    *   **Goal**: Optimize `find_matches_batch` using `intarray` + GiST Index.
    *   **Implementation**: Add `marker_signature` column and overlap (`&&`) operator query.
    *   **Status**: ⏳ Queued

3.  **Feature**: JSON Match Export (for WP Integration)
    *   **Goal**: Generate portability-focused JSON of Top-30 matches.
    *   **Status**: ⏸️ Paused (Design Approved: `docs/designs/json_export_format.md`)

## 🟡 Planned / Backlog
*   **Feature**: Public API Gateway
    *   Secure endpoints for external sites to query minimal dataset.
*   **Feature**: Haplogroup Tree v2
    *   Sync with latest YFull/FTDNA trees automatically.

## 🔵 Completed
*   **UI/UX**: FTDNA Panel Badges (Y37/Y67/Y111) with Palindrome logic.
*   **UI/UX**: Edit Query Profile functionality.
*   **Infra**: Hybrid Cloud Setup (Oracle VPS + Proxmox).
*   **Localization**: Full English UI enforcement.

---
*Reference Design Docs in `docs/designs/`*
