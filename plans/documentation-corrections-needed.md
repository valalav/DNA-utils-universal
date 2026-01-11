# Documentation Corrections Needed

Based on investigation findings, the following documentation files contain inaccuracies that need to be corrected:

---

## 1. docs/API-CONFIGURATION.md

### ❌ Issue 1: Incorrect Production Port for Backend

**Current (Line 13):**
```markdown
| **Backend** (`backend`) | `:9004` | `:9004` | Глобальный поиск (PostgreSQL), Админка, API Ключи |
```

**Should be:**
```markdown
| **Backend** (`backend`) | `:9004` | `:9005` | Глобальный поиск (PostgreSQL), Админка, API Ключи |
```

**Reason:** Production backend runs on port 9005 (systemd service), not 9004. Port 9004 is for development (PM2).

---

### ❌ Issue 2: Incorrect Backend URL Example

**Current (Line 45):**
```javascript
const backendUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:9004' 
  : 'https://pystr.valalav.ru/backend-search'; // В продакшене
```

**Should be:**
```javascript
const backendUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:9004' 
  : 'https://pystr.valalav.ru'; // В продакшене (Nginx handles routing)
```

**Reason:** The backend API is accessed through Nginx reverse proxy at `https://pystr.valalav.ru/api/*`, not `https://pystr.valalav.ru/backend-search`. The `/backend-search` path is for the frontend page, not the API.

---

### ❌ Issue 3: Missing Production Architecture Details

**Missing Information:**

The documentation should include a section explaining the production architecture:

```markdown
## 🏭 Production Architecture

Production deployment uses **systemd services** instead of PM2, running from `/root/dna-utils/`:

| Сервис | Порт | Путь (systemd) | Статус |
|--------|------|----------------|--------|
| ftdna-haplo.service | 9003 | /root/dna-utils/ftdna_haplo | ✅ active |
| ystr-backend.service | 9005 | /root/dna-utils/backend | ✅ active |
| str-matcher.service | 3000 | /root/dna-utils/str-matcher | ✅ active |

**Development** runs from `/home/valalav/DNA-utils-universal/` using PM2:

| Сервис | Порт | Статус PM2 |
|--------|------|-------------|
| backend | 9004 | ✅ online |
```

---

## 2. docs/USER_GUIDE.md

### ❌ Issue 1: Incorrect Backend URL Reference

**Current (Line 22):**
```markdown
**Адрес**: `http://localhost:3000/backend-search` (или кнопка "Try New Search" на главной)
```

**Should be:**
```markdown
**Адрес**: `http://localhost:3000/backend-search` (или кнопка "Try New Search" на главной)

**Production URL**: `https://pystr.valalav.ru/backend-search`
```

**Reason:** Should explicitly mention the production URL.

---

### ❌ Issue 2: Incorrect Port Information

**Current (Lines 121-124):**
```markdown
Q: Какой порт использовать?
A:
*   `3000`: Основное приложение.
*   `5173`: Haplogroup Viewer.
*   `9004`: API (для разработчиков).
```

**Should be:**
```markdown
Q: Какой порт использовать?
A:
*   `3000`: Основное приложение (Frontend).
*   `5173`: Haplogroup Viewer.
*   `9003`: Legacy Haplo Service (API для гаплогрупп).
*   `9004`: Backend API (Development).
*   `9005`: Backend API (Production).
```

**Reason:** Missing port 9003 (haplo service) and incorrect production backend port (should be 9005, not 9004).

---

## 3. docs/index.md

### ❌ Issue: Missing Production Deployment Guide

**Missing Section:**

Should add a new section:

```markdown
## 🚀 Production Deployment

### Systemd Services (Production)
Production deployment uses **systemd services** instead of PM2:

| Сервис | Порт | Путь | Статус |
|--------|------|------|--------|
| ftdna-haplo.service | 9003 | /root/dna-utils/ftdna_haplo | ✅ active |
| ystr-backend.service | 9005 | /root/dna-utils/backend | ✅ active |
| str-matcher.service | 3000 | /root/dna-utils/str-matcher | ✅ active |

### PM2 (Development)
Development runs from `/home/valalav/DNA-utils-universal/` using PM2:

| Сервис | Порт | Статус |
|--------|------|--------|
| backend | 9004 | ✅ online |

### Public Access
*   **Frontend**: `https://pystr.valalav.ru` (Nginx → Proxmox CT 109:3000)
*   **Backend API**: `https://pystr.valalav.ru/api/*` (Nginx → Proxmox CT 109:9005)
*   **Haplo Service**: `https://pystr.valalav.ru/api/haplogroups` (Nginx → Proxmox CT 109:9003)

### Environment Variables
Production backend requires `.env` file at `/root/dna-utils/backend/.env`:

```ini
NODE_ENV=production
PORT=9005
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ystr_matcher
DB_USER=postgres
DB_PASSWORD=<ACTUAL_PASSWORD>
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=https://pystr.valalav.ru
```

**Critical:** The `DB_PASSWORD` environment variable must be set for the backend to connect to PostgreSQL.
```

---

## 4. Missing Documentation

### ❌ Issue: No Troubleshooting Guide for Production

**Should Add:**

Create new file: `docs/TROUBLESHOOTING-PRODUCTION.md`

```markdown
# Production Troubleshooting Guide

## Backend Service Issues

### "Database query error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string"

**Cause:** The `DB_PASSWORD` environment variable is missing or invalid.

**Solution:**
1. Check if `.env` file exists:
   ```bash
   cat /root/dna-utils/backend/.env
   ```

2. Find actual database password:
   ```bash
   cat /root/dna-utils/docker-compose.yml | grep DB_PASSWORD
   ```

3. Create/update `.env` file:
   ```bash
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

4. Update systemd service to load `.env`:
   ```bash
   sudo nano /etc/systemd/system/ystr-backend.service
   # Add: EnvironmentFile=/root/dna-utils/backend/.env
   sudo systemctl daemon-reload
   sudo systemctl restart ystr-backend.service
   ```

5. Verify:
   ```bash
   curl http://localhost:9005/health
   curl http://localhost:9005/api/profiles/stats/database
   ```

### Service Not Starting

**Check service status:**
```bash
systemctl status ystr-backend.service
```

**Check logs:**
```bash
journalctl -u ystr-backend.service -n 50 --no-pager
```

### Port Conflicts

If you see "EADDRINUSE" errors:
```bash
# Check what's using the port
netstat -tulpn | grep :9005

# Stop conflicting services
pm2 stop backend  # If PM2 is running
```

## Database Issues

### PostgreSQL Not Running

**Check Docker containers:**
```bash
docker ps | grep postgres
```

**Check native service:**
```bash
systemctl status postgresql
```

### Database Connection Failed

**Test connection:**
```bash
psql -U postgres -d ystr_matcher -c "SELECT 1;"
```

## Nginx Issues

### 502 Bad Gateway

**Check if backend is running:**
```bash
curl http://localhost:9005/health
```

**Check nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

## Redis Issues

### Redis Connection Failed

**Check if Redis is running:**
```bash
docker ps | grep redis
redis-cli ping
```

**Note:** Redis is optional for backend operation. If unavailable, caching will be disabled.
```

---

## Summary of Required Changes

| File | Issue | Action |
|-------|--------|--------|
| docs/API-CONFIGURATION.md | Line 13: Wrong production port (9004 → 9005) | Update table |
| docs/API-CONFIGURATION.md | Line 45: Wrong backend URL | Update example code |
| docs/API-CONFIGURATION.md | Missing production architecture section | Add new section |
| docs/USER_GUIDE.md | Line 22: Missing production URL | Add production URL |
| docs/USER_GUIDE.md | Lines 121-124: Incomplete port list | Add ports 9003 and 9005 |
| docs/index.md | Missing production deployment guide | Add new section |
| docs/ | Missing production troubleshooting guide | Create new file |

---

## Critical Points to Emphasize

1. **Port Mismatch:** Development uses 9004, Production uses 9005
2. **Path Difference:** Development runs from `/home/valalav/DNA-utils-universal/`, Production from `/root/dna-utils/`
3. **Service Manager:** Development uses PM2, Production uses systemd
4. **Environment Variables:** Production backend requires `.env` file with `DB_PASSWORD` set
5. **URL Structure:** Backend API is accessed via Nginx at `https://pystr.valalav.ru/api/*`, not directly
