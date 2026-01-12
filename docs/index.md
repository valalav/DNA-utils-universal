# 🧬 DNA-utils-universal Documentation

Welcome to the documentation hub for **DNA-utils-universal v2.0**, a hybrid Genetic Matching System.

## 📚 General Guides
*   **[User Guide](USER_GUIDE.md)**  
    The complete manual for using the Client-Side Search, Backend Search, and Haplogroup Viewer.
*   **[Setup Guide](guides/setup.md)**  
    Installation, configuration, and running the standard 3-service stack.
*   **[Contributing](CONTRIBUTING.md)**  
    Reference for developers: workflow, testing standards, and architecture overview.

## 🏗️ Architecture & Internals
*   **[System Architecture](ARCHITECTURE_DETAILED.md)**  
    High-level design of the Hybrid v2.0 system (Frontend + Backend + Legacy Haplo).
*   **[Key Files Map](KEY_FILES_GUIDE.md)**  
    Navigator for critical files and components in the codebase.
*   **[Algorithms & Logic](ALGORITHMS_GUIDE.md)**  
    Core implementation details of Genetic Distance, GIST indexing, and Palindrome markers.
    *   *Deep Dive:* [Marker Display Logic](MARKER-DISPLAY-LOGIC.md) (Frontend Visuals)
    *   *Deep Dive:* [80% Panel Filtering Rule](MARKER-PANEL-FILTERING.md) (Quality Assurance)

## 📡 API & Backend
*   **[Sample Management API](SAMPLE-MANAGEMENT-API.md)**  
    Documentation for the secure Node.js Backend (Port 9005): Auth, Profiles CRUD, and Audit Logs.
*   **[Haplo Service API](HAPLO-SERVICE-API.md)**  
    Documentation for the Legacy FTDNA Service (Port 9003): Tree traversal and Autocomplete.
*   **[Proxy & Ports](API-CONFIGURATION.md)**  
    Guide to the application's routing, ports, and CORS policies.

## 🗄️ Data Management
*   **[Data Management Guide](DATA-IMPORT-GUIDE.md)**  
    Comprehensive guide to Database Schema, CSV Imports, and Mass Loading scripts.
*   **[Export API Guide](EXPORT-API-GUIDE.md)**
    Documentation for the secure JSON Match Export endpoint (`/api/export/matches`).
## 🚀 Production Configuration

### Services & Ports (Internal Node)
For production deployment protocols on the Internal Node (`192.168.10.170`), use **PM2** and **Systemd**.

| Service | Port | Manager | Status |
|---------|------|---------|--------|
| **str-matcher** | 3000 | PM2 | ✅ Active |
| **backend** | 9005 | PM2 | ✅ Active |
| **ftdna-haplo-app** | 9003 | PM2 | ✅ Active |
| **postgresql** | 5432 | Systemd | ✅ Active |

> **Critical**: Production Backend runs on **Port 9005** and requires `DB_PASSWORD` in `.env`.
> See [Troubleshooting Guide](TROUBLESHOOTING-PRODUCTION.md) for database, VPN, and Service issues.
