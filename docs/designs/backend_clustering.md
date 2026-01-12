# Design: Backend Multi-Core Scaling (PM2 Cluster Mode)

## 🎯 Goal
Enable the Backend API (`backend/server.js`) to utilize all available CPU cores on the Proxmox node, increasing throughput and reliability under load.

## 🏗️ Architecture
Current state:
*   `exec_mode`: `fork` (Default) - Single instance, 1 CPU core.
*   `instances`: 1

Target state:
*   `exec_mode`: `cluster` - PM2 Load Balances headers to multiple worker processes.
*   `instances`: `max` (Auto-detect cores) or specific number (e.g., 2).

## 🛠️ Implementation

### 1. `ecosystem.config.js`
Update the `backend` app configuration:

```javascript
    {
      name: "backend",
      cwd: "./backend",
      script: "./server.js",
      instances: "max",     // Use all available cores
      exec_mode: "cluster", // Enable clustering
      env_production: {
        NODE_ENV: "production",
        PORT: 9005
      }
    }
```

### 2. Code Compatibility Check
*   **Stateful Memory**: The backend appears stateless (REST API).
*   **Sessions**: We use JWT (stateless) or Redis (external store)?
    *   *Check*: `backend/server.js` uses `pg-pool` (DB) and `redis` (Cache).
    *   *Result*: Safe. Redis handles shared cache. Postgres handles shared data.
*   **Socket.IO**: Not used.
*   **Cron Jobs**: Are there internal `setInterval` tasks?
    *   *Risk*: If there are scheduled tasks inside `server.js`, they will run N times.
    *   *Audit*: need to check `server.js` for scheduled tasks.

## 🔍 Verification Plan
1.  **Deploy**: `pm2 restart ecosystem.config.js --env production`.
2.  **Verify**: `pm2 status` should show multiple `backend` instances (or `backend` module in cluster mode).
3.  **Load Test**: `curl` multiple requests and ensure load distribution (PM2 logs).
