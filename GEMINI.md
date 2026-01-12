# GEMINI.md - High-Fidelity Context Application State

> **SYSTEM IDENTITY**: DNA-utils-universal (Hybrid v2.0)
> **CONTEXT**: This document is the SINGLE SOURCE OF TRUTH for the AI Agent regarding Infrastructure, Architecture, and Deployment protocols.
> **ROADMAP**: Refer to `ROADMAP.md` for active feature planning and `docs/designs/` for technical specs.

---

Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

## 1. 🌍 Infrastructure Topology & Network Flow

The system operates on a distributed **Hybrid Cloud-Local Mesh** architecture comprising two key nodes connected via VPN.

### **Node A: Public Ingress (Oracle VPS)**
*   **IP**: `130.61.157.122` (Ubuntu ARM64)
*   **System Identity**: **Dockerized Nginx** (not systemd nginx).
    *   **CRITICAL WARNING**: Do NOT run `systemctl restart nginx`. The host's port 80 is occupied by `nginx-proxy` container.
    *   **Config Location**: `~/nginx-proxy/nginx/conf.d/pystr.valalav.ru.conf`.
    *   **Reload**: Must use Docker commands to reload proxy.
*   **Hostname**: `hcp.yseq.ru`
*   **Role**: reverse-proxy, ssl-termination
*   **Nginx Config**: `~/nginx-proxy/nginx/conf.d/pystr.valalav.ru.conf`
*   **Flow**:
    *   Accepts Public HTTPS Traffic (`https://pystr.valalav.ru`)
    *   Terminates SSL (Let's Encrypt)
    *   **Proxies** to Internal Node via Netbird VPN IP `100.101.218.57`.
*   **Access**: `ssh -i private/oracle_openssh_key ubuntu@130.61.157.122`

### **Node B: Internal Worker (Proxmox Container)**
*   **IP**: `192.168.10.170` (Local LAN)
*   **Netbird VPN IP**: `100.101.218.57` (Proxy Target)
*   **Proxmox ID**: CT `109` (Host: `192.168.10.138`)
*   **Identity**: `pystr.netbird.cloud`
*   **Production Path**: `/home/valalav/DNA-utils-universal`
*   **Role**: application-host, database-server
*   **Stack (PM2 Managed)**:
    *   **Frontend**: `str-matcher-app` (Port 3000) -> `https://pystr.valalav.ru/backend-search`
    *   **Backend**: `backend` (Port **9005**) -> Node.js + PostgreSQL + `.env`
    *   **Legacy**: `ftdna-haplo-app` (Port 9003) -> Node.js
*   **Network**: Connected to Oracle via **Netbird/WireGuard** Mesh (`netbird.service`).

**🚀 Request Lifecycle**:
`User` -> `https://pystr.valalav.ru` -> `Oracle Nginx` -> `VPN (100.101.218.57)` -> `Proxmox CT 109 (Port 3000/9005)`

---

## 2. 🏗️ Application Architecture (Hybrid v2.0)

The codebase is a monorepo implementing a **Service Triad**:

### **A. Core Services**
| Service | PM2 Name | Port | Stack | Config |
|:---|:---|:---|:---|:---|
| **STR Matcher** | `str-matcher-app` | **3000** | Next.js 15, Redux | `ecosystem.config.js` |
| **Backend API** | `backend` | **9005** | Express, Postgres | `backend/.env` |
| **Haplo Service** | `ftdna-haplo-app` | **9003** | Express (Legacy) | `ecosystem.config.js` |

### **B. Data Strategy**
*   **Local Mode (Client-Side)**:
    *   Users load CSVs directly into Browser `IndexedDB`.
    *   **Privacy**: Data never leaves the client.
    *   **Logic**: Workers calculate genetic distance locally.
*   **Global Mode (Backend)**:
    *   **PostgreSQL**: Stores validated, public profiles.
    *   **Optimization**: GIST Indexes for 1ms vector search.
    *   **Logic**: `find_matches_batch` SQL function implements the **80% Rule** (Match if >80% markers present).

---

## 3. 🚀 Critical Deployment Protocol

**WARNING**: The project uses **Next.js Output Standalone** mode managed by PM2.

### **Management Commands (PM2)**
```bash
# Start/Restart All (Production)
cd /home/valalav/DNA-utils-universal
pm2 start ecosystem.config.js --env production

# Check Status
pm2 status
sudo netbird status

# Logs
pm2 logs
```

> **CRITICAL NETWORKING NOTE**:
> On Proxmox CT (Node B), `localhost` / `127.0.0.1` resolution in Next.js Standalone fetch is **UNRELIABLE**.
> *   **Rule**: ALWAYS use the LAN IP (`192.168.10.170`) for `BACKEND_API_URL` and `HAPLO_API_URL` in `ecosystem.config.js` and `next.config.js`.
> *   **Symptom**: `fetch failed` (500) on endpoints despite services being up.
> *   **Fix**: Hardcode `http://192.168.10.170:9005`.
> *   **Hidden Trap**: `str-matcher/src/middleware.ts` INTERCEPTS `/api/*` requests and ignores `next.config.js` rewrites. It MUST be patched to use `192.168.10.170:9005`.

### **Frontend Rebuild Protocol (Str-Matcher)**
Due to standalone mode, you MUST copy static files after build:
```bash
cd str-matcher
npm run build
# Critical Copy Steps
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
# Restart
cd ..
pm2 restart str-matcher-app
```

### **Network Troubleshooting**
If site shows **504 Gateway Timeout**:
1. Check VPN on Internal Node: `sudo netbird status`.
2. Connect cleanly: `sudo netbird up`.
3. Ping from Oracle: `ssh ... ubuntu@130.61.157.122 "ping 100.101.218.57"`

### **Netbird Integrity (Preventing "Command Not Found")**
Netbird auto-updates can corrupt the binary (0-byte file).
**MANDATORY**: Freeze version to prevent this.
```bash
sudo apt-mark hold netbird
```
To update: `unhold` -> `upgrade` -> `hold`.

---

## 4. 🧠 Key Algorithms & Logic (Agent Knowledge)

### **The "80% Rule" (Marker Filtering)**
*   **Definition**: A candidate profile is only considered a "match" if it shares at least **80%** of the markers present in the Query Profile.
*   **Implementation**:
    *   **Frontend**: `src/utils/calculations.ts` (Client filtering).
    *   **Backend**: `database/schema.sql` (SQL function `find_matches_batch` enforces this threshold).

### **Genetic Distance (GD) Calculation**
*   **Infinite Allele Model**: Standard step-wise mutation model.
*   **Null Handling**: Null/Empty markers are ignored (not penalized).

### **Port Conflicts (Known Issue)**
*   **Port 9003**: Often occupied by "zombie" `ftdna_haplo` processes.
*   **Fix**: `sudo fuser -k 9003/tcp` -> `pm2 restart ftdna-haplo-app`.

---

## 5. 🛠️ Developer Workflow

**Connecting to Environment**:
1.  **Codebase**: You are locally on Proxmox (`192.168.10.170`).
2.  **Public Check**: Run `curl -I https://pystr.valalav.ru/backend-search`.
3.  **Logs**: Check `pm2 logs` locally.

**Documentation Sync**:
*   `CLAUDE.md` must be kept synced between Local and Remote (`./YSTR-Genetic-Matcher/CLAUDE.md`).
