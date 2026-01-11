# CORS Issue Fix - Multiple Frontend Ports

## Проблема

**Ошибка в консоли браузера:**
```
TypeError: Failed to fetch
Source: src\hooks\useBackendAPI.ts (155:30)
```

**Причина:**
- Frontend Next.js запускается на разных портах (3000, 3001, 3002, 3003) в зависимости от занятости портов
- Backend имеет CORS ограничения только для определенных портов
- Когда frontend запускается на новом порту (например, 3003), backend блокирует запросы с ошибкой CORS

## Решение

### 1. Добавить все порты в CORS allowedOrigins

**Файл:** `backend/server.js`

```javascript
// CORS configuration - allow multiple ports for development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',  // Добавлен порт 3003
  process.env.CORS_ORIGIN
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};
app.use(cors(corsOptions));
```

### 2. Перезапустить backend контейнер

```bash
cd c:/projects/DNA-utils-universal
docker-compose restart backend
```

### 3. Проверить что CORS работает

```bash
curl -H "Origin: http://localhost:3003" http://localhost:9004/api/profiles/stats/database -v 2>&1 | grep "Access-Control-Allow-Origin"
```

**Ожидаемый результат:**
```
< Access-Control-Allow-Origin: http://localhost:3003
```

## Альтернативное решение (для продакшена)

Для production окружения лучше использовать конкретный домен через переменную окружения:

**Файл:** `backend/.env`
```env
CORS_ORIGIN=https://your-domain.com
```

## История изменений

| Дата | Порты | Комментарий |
|------|-------|-------------|
| 2025-10-05 | 3000, 3001, 3002 | Исходная конфигурация |
| 2025-10-05 | 3000, 3001, 3002, 3003 | Добавлен порт 3003 для dev |

## Проверка статуса

После исправления проверьте в браузере:
- Откройте http://localhost:3003/backend-search
- Проверьте что статистика базы данных загружается
- Убедитесь что нет ошибок CORS в консоли браузера
