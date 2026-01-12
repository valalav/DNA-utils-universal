# 🗺️ Project Roadmap: DNA-utils-universal

**Goal**: Transform the system into a universally accessible, high-performance Y-DNA analysis platform with external integration capabilities.

## 🟢 Active Development
*   **Feature**: JSON Match Export (for WP Integration)
    *   **Goal**: Generate a portability-focused JSON of Top-30 matches for a given Kit.
    *   **Requirements**:
        *   Calculate Rarity Stats on *Full* dataset first.
        *   Truncate to Top 30 by GD.
        *   Include pre-calculated "Rarity Codes" (0-4) for visualization.
    *   **Status**: 🏗️ Design Phase (`docs/designs/json_export_format.md`)

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
