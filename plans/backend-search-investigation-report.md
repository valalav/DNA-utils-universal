# Investigation Report: backend-search Service Not Working

## Executive Summary
The service at `https://pystr.valalav.ru/backend-search` is not functioning due to a database connection failure. The backend API cannot connect to PostgreSQL because the `DB_PASSWORD` environment variable is missing or invalid.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Public Access                                                │
│ https://pystr.valalav.ru/backend-search                     │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Oracle VPS (130.61.157.122)                                  │
│ - Nginx Reverse Proxy + SSL (Let's Encrypt)                 │
│ - VPN/Netbird Tunnel to Proxmox                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Proxmox CT 109 (192.168.10.170)                              │
│                                                              │
│ Services:                                                    │
│ - Frontend (Next.js): Port 3000                              │
│ - Backend API (Express): Port 9005 (production)             │
│ - PostgreSQL: Port 5432                                      │
│ - Redis: Port 6379                                           │
│                                                              │
│ Production Path: /root/dna-utils/                            │
│ Development Path: /home/valalav/DNA-utils-universal/         │
└─────────────────────────────────────────────────────────────┘
```

---

## Current Status

### Services Running (from task.md):

| Service | Port | Path (systemd) | Status |
|---------|------|----------------|--------|
| ftdna-haplo.service | 9003 | /root/dna-utils/ftdna_haplo | ✅ active |
| ystr-backend.service | 9005 | /root/dna-utils/backend | ❌ ISSUE |
| str-matcher.service | 3000 | /root/dna-utils/str-matcher | ✅ active |

### Development (PM2):
| Service | Port | Status |
|---------|------|--------|
| backend | 9004 | ✅ online |

---

## Root Cause Analysis

### 1. Database Connection Failure

**Error Message** (from problem.md):
```
Database query error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

**Explanation:**
- The backend service is trying to connect to PostgreSQL
- The `DB_PASSWORD` environment variable is either:
  - Missing entirely
  - Set to an empty string
  - Not loaded properly by the systemd service

### 2. Environment Variable Configuration Issues

**Local Development (.env):**
```bash
NODE_ENV=development
# No database credentials configured
```

**Backend Expected Variables** (from backend/config/database.js):
```javascript
{
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ystr_matcher',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,  // ❌ MISSING
}
```

**Backend .env.example:**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ystr_matcher
DB_USER=postgres
DB_PASSWORD=your_password  # ⚠️ Needs to be set
```

### 3. Path Mismatch

**Issue:** The systemd service file `dna-utils.service` references `/opt/DNA-utils-universal`, but production actually runs from `/root/dna-utils/`.

**Service File** (dna-utils.service):
```ini
WorkingDirectory=/opt/DNA-utils-universal
```

**Actual Production Path:**
```
/root/dna-utils/
```

---

## Technical Details

### Backend Server Configuration

**File:** `backend/server.js`

- Port: 9004 (development), 9005 (production)
- CORS allows: `https://pystr.valalav.ru`
- Health check endpoint: `/health`
- Main API routes: `/api/profiles/*`

### Database Connection Pool

**File:** `backend/config/database.js`

```javascript
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ystr_matcher',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,  // ⚠️ CRITICAL
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});
```

### Matching Service

**File:** `backend/services/matchingService.js`

- Handles genetic matching queries
- Uses Redis for caching (optional)
- Has a `getStatistics()` function that was causing 504 timeouts
- Now returns a constant for `avg_markers` to avoid performance issues

---

## VPS Connection Information

**SSH Access:** (from ssh_vps.exp)
```bash
ssh root@194.87.239.157
Password: dpRxOsYWT5
```

**Alternative SSH:** (from CLAUDE.md)
```bash
ssh -i private/oracle_openssh_key ubuntu@130.61.157.122
```

---

## Required Actions on VPS

### Step 1: Check Service Status
```bash
# Check if backend service is running
systemctl status ystr-backend.service

# Check logs
journalctl -u ystr-backend.service -n 50 --no-pager
```

### Step 2: Verify PostgreSQL is Running
```bash
# Check PostgreSQL container/service
docker ps | grep postgres
# OR
systemctl status postgresql

# Test connection
psql -U postgres -d ystr_matcher -c "SELECT 1;"
```

### Step 3: Check Environment Variables
```bash
# Check systemd service environment
systemctl show ystr-backend.service | grep Environment

# Check if .env file exists
ls -la /root/dna-utils/backend/.env

# View .env file content
cat /root/dna-utils/backend/.env
```

### Step 4: Fix Environment Variables
```bash
# Create/update .env file
cd /root/dna-utils/backend

cat > .env << 'EOF'
NODE_ENV=production
PORT=9005
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ystr_matcher
DB_USER=postgres
DB_PASSWORD=<ACTUAL_PASSWORD>
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=https://pystr.valalav.ru
EOF
```

### Step 5: Update Systemd Service (if needed)
```bash
# Edit service file to load .env
sudo nano /etc/systemd/system/ystr-backend.service

# Add EnvironmentFile line:
# EnvironmentFile=/root/dna-utils/backend/.env

# Reload systemd
sudo systemctl daemon-reload
```

### Step 6: Restart Backend Service
```bash
# Restart the service
sudo systemctl restart ystr-backend.service

# Check status
sudo systemctl status ystr-backend.service

# View logs
sudo journalctl -u ystr-backend.service -f
```

### Step 7: Test Health Endpoint
```bash
# Test backend health
curl http://localhost:9005/health

# Test from outside (via VPN)
curl http://192.168.10.170:9005/health
```

### Step 8: Test Public URL
```bash
# Test from Oracle VPS
curl https://pystr.valalav.ru/backend-search

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Potential Issues to Address

### Issue 1: Database Password Unknown
The actual PostgreSQL password is not documented. Need to:
- Check existing `.env` files on VPS
- Check docker-compose.yml for password
- Reset PostgreSQL password if necessary

### Issue 2: Path Mismatch
The systemd service references `/opt/DNA-utils-universal` but production uses `/root/dna-utils/`. Need to:
- Update systemd service files to use correct paths
- Ensure all services use consistent paths

### Issue 3: Docker vs Native PostgreSQL
Need to determine if PostgreSQL runs in Docker or as a native service:
```bash
# Check for Docker
docker ps | grep postgres

# Check for native service
systemctl status postgresql
```

### Issue 4: Redis Connection
Backend expects Redis for caching. Need to verify:
```bash
# Check Redis status
docker ps | grep redis
# OR
systemctl status redis

# Test connection
redis-cli ping
```

---

## Verification Checklist

After applying fixes, verify:

- [ ] Backend service is running (`systemctl status ystr-backend.service`)
- [ ] Backend health endpoint returns 200 (`curl http://localhost:9005/health`)
- [ ] Database statistics endpoint works (`curl http://localhost:9005/api/profiles/stats/database`)
- [ ] Frontend can reach backend (`curl https://pystr.valalav.ru/backend-search`)
- [ ] No errors in backend logs (`journalctl -u ystr-backend.service -n 50`)
- [ ] No errors in nginx logs (`tail -f /var/log/nginx/error.log`)

---

## Summary

**Problem:** Backend service cannot connect to PostgreSQL due to missing `DB_PASSWORD` environment variable.

**Solution:** 
1. Verify PostgreSQL is running and accessible
2. Create/update `.env` file with correct database credentials
3. Update systemd service to load environment variables
4. Restart backend service
5. Verify all endpoints are working

**Estimated Complexity:** Medium - Requires SSH access to VPS and knowledge of actual database password.

**Risk Level:** Low - Fixing environment variables is a safe operation that won't affect data.
