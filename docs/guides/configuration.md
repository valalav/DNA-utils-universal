# 🔧 Конфигурация системы DNA-utils-universal

## 📋 Обзор

Система DNA-utils-universal состоит из нескольких микросервисов, каждый со своими конфигурационными требованиями. Данное руководство описывает настройку всех компонентов системы для различных сред разработки и продакшена.

## 🏗️ Архитектура конфигурации

```
DNA-utils-universal/
├── .env                     # Глобальные настройки (PM2, порты)
├── .env.example            # Шаблон переменных окружения
├── ecosystem.config.js     # PM2 конфигурация для продакшена
├── str-matcher/
│   ├── .env.local         # Next.js локальные переменные
│   └── next.config.js     # Конфигурация Next.js
├── ftdna_haplo/
│   ├── .env               # Node.js бэкенд переменные
│   └── client/.env        # React клиент переменные
└── ystr_predictor/        # 🚨 НЕ НАСТРАИВАТЬ - заглушка!
```

## 🌍 Переменные окружения

### Глобальные настройки (.env)

```bash
# Порты микросервисов
STR_MATCHER_PORT=3000
FTDNA_HAPLO_PORT=9003  
FTDNA_CLIENT_PORT=5173

# PM2 настройки
PM2_INSTANCES=2
PM2_MAX_MEMORY_RESTART=1000M

# Режим окружения
NODE_ENV=production  # development | test | production
```

### STR Matcher (.env.local)

```bash
# Next.js настройки
NEXT_PUBLIC_API_URL=http://localhost:9003
NEXT_PUBLIC_FTDNA_API_URL=http://localhost:9003/api

# CORS настройки
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:9002

# Производительность
NEXT_PUBLIC_MAX_CONCURRENT_REQUESTS=5
NEXT_PUBLIC_REQUEST_TIMEOUT=30000

# Отладка
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_LOG_API_CALLS=false
```

### FTDNA Haplo Backend (.env)

```bash
# Сервер настройки
PORT=9003
HOST=localhost

# CORS настройки
CORS_ORIGIN=http://localhost:9002,http://localhost:5173
CORS_CREDENTIALS=true

# Производительность
MAX_PAYLOAD_SIZE=50mb
REQUEST_TIMEOUT=60000

# Кэширование
CACHE_TTL=300000  # 5 минут
ENABLE_CACHE=true

# Логирование
LOG_LEVEL=info  # error | warn | info | debug
LOG_FILE=logs/server.log
```

### FTDNA Haplo Client (.env)

```bash
# API эндпоинты
VITE_API_BASE_URL=http://localhost:9003
VITE_API_TIMEOUT=30000

# Особенности разработки
VITE_DEVELOPMENT_MODE=true
VITE_HOT_RELOAD=true
```

## ⚙️ PM2 конфигурация

### ecosystem.config.js - подробно

```javascript
module.exports = {
  apps: [
    {
      name: 'str-matcher',
      cwd: './str-matcher',
      script: 'npm',
      args: 'start',
      instances: process.env.PM2_INSTANCES || 1,
      exec_mode: 'cluster',
      max_memory_restart: process.env.PM2_MAX_MEMORY_RESTART || '1G',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.STR_MATCHER_PORT || 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      }
    },
    {
      name: 'ftdna-haplo-server',
      cwd: './ftdna_haplo',
      script: 'server/server.js',
      instances: 1,  // Не кластеризуем из-за состояния данных
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.FTDNA_HAPLO_PORT || 9003
      }
    },
    {
      name: 'ftdna-haplo-client',
      cwd: './ftdna_haplo',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      },
      // Только для development
      watch: ['client/src'],
      ignore_watch: ['node_modules', 'logs']
    }
  ]
};
```

## 🌐 CORS и Proxy настройки

### ⚠️ КРИТИЧЕСКИ ВАЖНО для интеграции компонентов!

### Next.js Proxy конфигурация

```javascript
// str-matcher/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/haplo/:path*',
        destination: `http://localhost:${process.env.FTDNA_HAPLO_PORT || 9003}/api/:path*`
      }
    ];
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  
  // Optimization settings
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
  
  webpack: (config, { dev, isServer }) => {
    // Web Workers оптимизация для STR расчетов
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' }
    });
    
    return config;
  }
};

module.exports = nextConfig;
```

### FTDNA Haplo CORS настройка

```javascript
// ftdna_haplo/server/server.js - фрагмент
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:9002',  // STR Matcher
      'http://localhost:5173'   // FTDNA Client
    ];
    
    // Разрешаем запросы без origin (например, мобильные клиенты)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Не разрешено CORS политикой'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

## 🏭 Настройки для разных сред

### Development (разработка)

```bash
# Копировать .env.example в .env
cp .env.example .env

# Установить development переменные
NODE_ENV=development
NEXT_PUBLIC_DEBUG_MODE=true
LOG_LEVEL=debug

# Запуск в dev режиме
npm run dev:all  # Все сервисы в development режиме
```

### Staging (тестирование)

```bash
NODE_ENV=staging
NEXT_PUBLIC_DEBUG_MODE=false
LOG_LEVEL=info
CACHE_TTL=60000  # Меньше кэширования для тестов

# Запуск через PM2
pm2 start ecosystem.config.js --env staging
```

### Production (продакшен)

```bash
NODE_ENV=production
NEXT_PUBLIC_DEBUG_MODE=false
LOG_LEVEL=warn
CACHE_TTL=300000
PM2_INSTANCES=max  # Используем все CPU ядра

# Сборка продакшен версии
npm run build:all

# Запуск через PM2
pm2 start ecosystem.config.js --env production
```

## 🔒 Безопасность

### Настройки безопасности для продакшена

```bash
# .env для продакшена
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100  # запросов в 15 минут
RATE_LIMIT_WINDOW=900000  # 15 минут в мс

# SSL/TLS настройки (если используется)
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
FORCE_HTTPS=true
```

### Express.js security middleware

```javascript
// ftdna_haplo/server/server.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

if (process.env.NODE_ENV === 'production') {
  // Helmet для безопасности заголовков
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX || 100,
    message: 'Слишком много запросов, попробуйте позже'
  });
  app.use('/api/', limiter);
}
```

## 📊 Мониторинг и логирование

### PM2 мониторинг

```bash
# Статус всех процессов
pm2 status

# Подробная информация
pm2 describe str-matcher

# Логи в реальном времени
pm2 logs --lines 200

# Мониторинг ресурсов
pm2 monit
```

### Настройка логирования

```javascript
// Структура логов
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## 🚨 Критические настройки интеграции

### ⚠️ ОБЯЗАТЕЛЬНО проверить для работы системы:

1. **API эндпоинты**: STR Matcher должен знать адрес FTDNA Haplo API
2. **CORS домены**: Все домены должны быть прописаны в CORS_ORIGIN
3. **Порты**: Убедиться что порты не конфликтуют с другими сервисами
4. **Таймауты**: API таймауты должны быть больше времени обработки запросов
5. **Memory limits**: PM2 лимиты памяти должны учитывать размер обрабатываемых данных

### Проверка интеграции

```bash
# Проверить доступность API FTDNA Haplo из STR Matcher
curl http://localhost:3000/api/haplo/health

# Проверить CORS
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:9003/api/check-subclade

# Проверить все сервисы
npm run health-check
```

## 📝 Полезные команды

```bash
# Запуск конкретного сервиса
pm2 start ecosystem.config.js --only str-matcher

# Перезапуск с новой конфигурацией
pm2 reload ecosystem.config.js

# Остановка всех сервисов
pm2 stop all

# Удаление из PM2
pm2 delete all

# Сохранение конфигурации PM2
pm2 save
pm2 startup  # Автозапуск при старте системы
```

## 🔗 Связанные документы

- [Руководство по установке](setup.md)
- [Архитектура системы](../ARCHITECTURE.md)
- [Решение проблем](troubleshooting.md)
- [API справочник](../API_REFERENCE.md)
