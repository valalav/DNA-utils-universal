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
*Reference Design Docs in `docs/designs/`*
