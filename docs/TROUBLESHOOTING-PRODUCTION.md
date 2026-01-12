# Production Troubleshooting Guide

> **Context**: This guide focuses on the Production Environment running on the Internal Node (`192.168.10.170` / `Proxmox CT 109`).

## 🚨 Critical Architecture Context
*   **Process Manager**: **PM2** (Config: `ecosystem.config.js`)
*   **Paths**: `/home/valalav/DNA-utils-universal`
*   **Ports**: 
    *   Backend: **9005** (Production)
    *   Frontend: **3000**
    *   Haplo: **9003**
*   **Database**: PostgreSQL (Systemd service `postgresql`)

---

## 🛑 Common Issues

### 1. "Database query error: SASL: SCRAM-SERVER-FIRST-MESSAGE"
**Symptoms**:
*   Backend logs show auth errors.
*   500 Error on search.

**Cause**: Missing `DB_PASSWORD` in `backend/.env`.

**Fix**:
1.  Check the file: `cat backend/.env`.
2.  Ensure `DB_PASSWORD` is set (usually `postgres`).
3.  Restart: `pm2 restart backend`.

### 2. Services "Online" but Site Unreachable (504 Gateway Timeout)
**Cause**: The VPN tunnel between Oracle (Ingress) and Proxmox (Worker) is down.

**Fix**:
1.  **Check Netbird**: `sudo netbird status`.
2.  **Reconnect**: `sudo netbird up`.
3.  **Verify**: Log into Oracle VPS and ping the internal IP (`ping 100.101.218.57`).

### 3. Port Conflicts (EADDRINUSE)
**Symptoms**: PM2 logs show `Error: listen EADDRINUSE: address already in use :::9003`.

**Fix**:
Zombie processes might be holding the port. Kill them:
```bash
sudo fuser -k 9003/tcp
pm2 restart ftdna-haplo-app
```

### 4. PM2 Status is Empty after Reboot
**Cause**: PM2 resurrect failed.

**Fix**:
```bash
cd /home/valalav/DNA-utils-universal
pm2 start ecosystem.config.js --env production
pm2 save
```

56: ```
57: 
58: ### 5. Import Hangs or Deadlocks (Bulk Insert)
59: **Symptoms**: Import script hangs indefinitely logs "Inserting...", backend logs show timeout or deadlocks.
60: 
61: **Cause**: The `bulk_insert_profiles` function triggers a `REFRESH MATERIALIZED VIEW` for every row/batch, causing extensive locking.
62: 
63: **Fix**:
64: 1.  **Kill Locks**: `node scripts/kill_locks.js` or `node scripts/nuke_db_connections.js`.
65: 2.  **Use Direct Protocol**: Follow **Method C** in `DATA-IMPORT-GUIDE.md` (Disable Triggers -> Import -> Enable -> Refresh).
66: 3.  **Check Redis**: If `DISABLE_REDIS=true` is set, ensure backend is actually respecting it (check `haplogroupService.js`).
67: 
68: ---

## 🔍 Diagnostic Commands

| Check | Command |
|-------|---------|
| **Service Status** | `pm2 status` |
| **Real-time Logs** | `pm2 logs` |
| **Backend Health** | `curl http://localhost:9005/health` |
| **API Response** | `curl http://localhost:9005/api/profiles/stats/database` |
| **VPN Status** | `sudo netbird status` |
