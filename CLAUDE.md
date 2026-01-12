Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

# PROJECT_IDENTITY
   - DNA-utils-universal | Monorepo/Bioinformatics | High-performance Y-STR matching system (PostgreSQL/Redis/Next.js/CUDA)
   - !DOCS: See `docs/index.md` for full documentation. Read ONLY relevant sections to save context.

# ARCHITECTURE_MAP
   - backend/ -> Express API + Core Matching Logic (Monolith)
     - services/ -> Business logic (matchingService.js, caching)
     - routes/ -> API endpoints (profiles, admin, stats)
     - config/ -> DB & Redis pools
     - .env -> DB credentials (DB_PASSWORD required!)
   - str-matcher/ -> Frontend Client (Next.js 15, Redux)
     - src/app/ -> App Router pages & layouts
     - src/store/ -> Redux Toolkit + Persistence
     - src/hooks/ -> API Integration (useBackendAPI)
     - next.config.js -> output: 'standalone' mode
   - database/ -> SQL Schemas & Optimization Functions
   - cuda-predictor/ -> Optional ML Service (FastAPI/PyTorch)
   - ftdna_haplo/ -> Haplogroup Service (Port 9003)
     - Implements "Exact Match Priority" in `/autocomplete` (returns single result if exact match exists).

# INFRASTRUCTURE_TOPOLOGY
   - **Public Ingress (Oracle VPS)**: `130.61.157.122` (Ubuntu ARM64)
     - Role: Nginx (Docker) Reverse Proxy + Certbot (SSL)
     - **CRITICAL WARNING**: Do NOT run `systemctl restart nginx`. The host's port 80 is occupied by `nginx-proxy` container.
     - **Reload**: Use Docker commands (e.g., `docker exec ... nginx -s reload`).
     - Nginx config: `~/nginx-proxy/nginx/conf.d/pystr.valalav.ru.conf`
     - Exposure: `https://pystr.valalav.ru` -> Proxies to Proxmox via Netbird VPN
     - Access: `ssh -i private/oracle_openssh_key ubuntu@130.61.157.122`
   - **Internal Node (Proxmox Container CT 109)**: `192.168.10.170`
     - **Netbird VPN IP**: `100.101.218.57` (THIS IS WHERE NGINX PROXIES TO!)
     - FQDN: `pystr.netbird.cloud`
     - Main Entry: `https://pystr.valalav.ru/backend-search`
     - Project Path: `/home/valalav/DNA-utils-universal`

# SERVICES_AND_PORTS (Internal Node)
   | Service          | Port | Process Manager | Config                        |
   |------------------|------|-----------------|-------------------------------|
   | str-matcher      | 3000 | PM2             | ecosystem.config.js           |
   | ftdna-haplo-app  | 9003 | PM2             | ecosystem.config.js           |
   | backend          | 9005 | PM2             | ecosystem.config.js + .env    |
   | PostgreSQL       | 5432 | systemd         | postgres                      |

# PM2_MANAGEMENT
   - **Config file**: `/home/valalav/DNA-utils-universal/ecosystem.config.js`
   - **CRITICAL NETWORKING**: On Proxmox CT (Node B), `localhost` resolution is UNRELIABLE.
     - **Rule**: ALWAYS use the LAN IP (`192.168.10.170`) for `BACKEND_API_URL` in `ecosystem.config.js` and `next.config.js`.
     - **Fix**: Hardcode `http://192.168.10.170:9005`.
   - **ВАЖНО**: Всегда запускай PM2 из корня проекта:
     ```bash
     cd /home/valalav/DNA-utils-universal
     pm2 start ecosystem.config.js --env production
     ```
   - **Автозапуск**: PM2 настроен через `pm2 startup systemd` (сервис pm2-valalav)
   - **Сохранение состояния**: `pm2 save` (автоматически восстановится после reboot)

   Common commands:
   - `pm2 status` - проверить статус всех сервисов
   - `pm2 logs` - посмотреть логи всех сервисов
   - `pm2 restart all` - перезапустить все сервисы
   - `pm2 delete all && pm2 start ecosystem.config.js --env production` - полный перезапуск

# NETBIRD_VPN (КРИТИЧЕСКИ ВАЖНО!)
   - **Сервис**: `netbird.service` (systemd)
   - **Статус**: `sudo netbird status`
   - **Автозапуск**: Включен (`systemctl enable netbird`)
   - **IP адрес**: `100.101.218.57` - используется в nginx конфиге на Oracle VPS

   **ЕСЛИ САЙТ НЕ РАБОТАЕТ (504 Gateway Timeout):**
   1. Проверь netbird: `sudo netbird status`
   2. Если Disconnected: `sudo netbird up`
   3. Если сервис не запущен: `sudo systemctl start netbird`

# TROUBLESHOOTING
   **504 Gateway Timeout:**
   1. SSH на Oracle VPS: `ssh -i private/oracle_openssh_key ubuntu@130.61.157.122`
   2. Проверь ping: `ping 100.101.218.57` (должен отвечать)
   3. Если не отвечает - проблема с Netbird на внутреннем узле
   4. На внутреннем узле: `sudo netbird status` и `sudo netbird up`

   **Сервисы не работают после reboot:**
   1. Проверь PM2: `pm2 status`
   2. Если пусто: `cd /home/valalav/DNA-utils-universal && pm2 start ecosystem.config.js --env production`
   3. Проверь Netbird: `sudo netbird status`, если Disconnected: `sudo netbird up`

   **Port already in use (EADDRINUSE):**
   ```bash
   sudo fuser -k 3000/tcp 9003/tcp 9005/tcp
   # Force kill zombie process on port 9003 (common issue)
   sudo fuser -k -9 9003/tcp
   pm2 restart all
   ```

# OPERATIONAL_LEARNINGS
   - **Zombie Processes**: If port 9003 is blocked by a root process, `pm2 restart` might fail. Use `sudo fuser -k -9 9003/tcp`.
   - **Import Logic**: Frontend `SampleManager` uses exclusion patterns (negative lookahead logic) to distinguish `Name` from `Paternal Ancestor Name` during CSV parsing. Always match specific columns before generic ones.
   - **Bulk Import Tuning**: Use large batch sizes (e.g., 5000) via `scripts/import-csv.js` to minimize `REFRESH MATERIALIZED VIEW` overhead.

   - **Proxy Logic Pitfall (Middleware):**
   - `str-matcher/src/middleware.ts` manually proxies `/api/*` and acts as the router.
   - **CRITICAL**: It hardcodes the backend URL if `process.env.BACKEND_API_URL` is missing.
   - **Fix**: Ensure `middleware.ts` uses `process.env.BACKEND_API_URL || 'http://192.168.10.170:9005'`. Do NOT rely on `next.config.js` rewrites for `/api/` as middleware intercepts them first.

   **PostgreSQL Index Corruption:**
   - **Symptom**: Duplicate `kit_number` values exist despite `UNIQUE` constraint. `INSERT` works locally but bulk data has duplicates.
   - **Fix**: 1) Delete duplicates via SQL (keep `MAX(id)`). 2) `REINDEX TABLE ystr_profiles`.
   - **Prevention**: Avoid massive concurrency during `Direct SQL` imports or ensure hardware stability.

   - **Massive Import Protocol**: For robust bulk loading (>1k records), utilize **Direct SQL** (`scripts/direct_db_import.js`). **CRITICAL**: Temporarily DISABLE triggers (`trigger_refresh_marker_stats`) to prevent deadlocks, then re-enable and manually refresh the view.
   - **Concurrent Refresh**: Requires a `UNIQUE INDEX` on the materialized view. If refreshing hangs, check for index and stuck queries.
   - **Redis Disablement**: If Redis is down, set `DISABLE_REDIS=true` in `backend/.env`. ensure `haplogroupService.js` and `admin.js` are patched to respect this flag (conditional initialization).

   **Haplogroup UI Blank Page / API Errors:**
   1. Check CORS in `ftdna_haplo/server/server.js` (Must allow `192.168.x.x` & `100.x.x.x`).
   2. Check if port 9003 is zombie: `sudo netstat -tulpn | grep 9003`.

# DEPLOYMENT_NOTES (Internal Node - Proxmox CT 109)
   - **Mode**: Next.js Standalone (output: 'standalone' in next.config.js)
   - **PM2 Config**: `ecosystem.config.js` в корне проекта
   - **Backend .env**: `backend/.env` (DB_PASSWORD, PORT=9005, CORS_ORIGIN)
   - **После изменений в str-matcher**:
     ```bash
     cd str-matcher && npm run build
     cp -r public .next/standalone/
     cp -r .next/static .next/standalone/.next/
     cd .. && pm2 restart str-matcher-app
     ```

# TECH_STACK_SIGNATURES
   - Language: JavaScript (Node.js 18+), TypeScript (Next.js 15)
   - Frameworks: Express:4.18, Next.js:15, FastAPI (Python)
   - KeyLibs: pg-pool (DB), Redis (Cache), Redux-Toolkit (State), PyTorch (ML)

# CONVENTIONS_HASH
   - CodeStyle: Standard JS/TS (ESLint)
   - Naming: camelCase (JS), snake_case (Python, SQL)
   - Pattern: MVC (Backend), Feature-slices (Frontend)
   - Ref: See `backend/server.js` and `str-matcher/src/store/userSlice.ts`

# PERFORMANCE_RULES (КРИТИЧЕСКИ ВАЖНО!)
   - **СКОРОСТЬ ВАЖНА!** Этот проект обрабатывает тысячи записей. Любое замедление недопустимо.
   - **ДУМАЙ О ПОСЛЕДСТВИЯХ** перед изменением SQL функций, циклов, batch-операций.
   - **НЕ ДОБАВЛЯЙ IF/ELSE внутрь циклов** в PostgreSQL функциях - это замедляет в 100 раз.
   - **ТЕСТИРУЙ СКОРОСТЬ** после изменений в bulk-операциях.
   - **НЕ ДАВАЙ НЕПРОВЕРЕННЫЕ КОМАНДЫ** - сначала проверь что они работают.
   - **СПРАШИВАЙ** прежде чем делать, если не уверен в последствиях.

# CRITICAL_COMMANDS
   - Build: `cd str-matcher && npm run build` (Frontend)
   - Test: `npm test` (Backend), `node comprehensive-test.js` (E2E)
   - Run: `pm2 start ecosystem.config.js --env production`
   - Status: `pm2 status && sudo netbird status`
   - Logs: `pm2 logs`
   - Connect Oracle: `ssh -i private/oracle_openssh_key ubuntu@130.61.157.122`