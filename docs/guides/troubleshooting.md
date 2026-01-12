# 🔧 Решение проблем DNA-utils-universal

## 📋 Обзор

Это руководство поможет диагностировать и решить наиболее частые проблемы в работе системы DNA-utils-universal. Система состоит из нескольких взаимосвязанных компонентов, и проблемы могут возникать как в отдельных модулях, так и в их интеграции.

## 🚨 Критические проблемы и быстрые решения

### ❌ STR Matcher не видит FTDNA Haplo API

**Симптомы:**
- Ошибки "Failed to fetch" при загрузке данных
- Пустые результаты в таблице совпадений
- Консольные ошибки CORS

**Диагностика:**
```bash
# Проверить доступность FTDNA Haplo API
curl http://localhost:9003/api/health

# Проверить CORS заголовки
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:9003/api/check-subclade
```

**Решение:**
1. Убедиться что FTDNA Haplo сервер запущен:
   ```bash
   pm2 status ftdna-haplo-server
   # или
   cd ftdna_haplo && npm run server
   ```

2. Проверить CORS настройки в `ftdna_haplo/server/server.js`:
   ```javascript
   const allowedOrigins = [
     'http://localhost:3000',  // STR Matcher
     'http://localhost:5173'   // FTDNA Client
   ];
   ```

3. Проверить переменные окружения:
   ```bash
   # В str-matcher/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:9003
   
   # В ftdna_haplo/.env
   CORS_ORIGIN=http://localhost:3000,http://localhost:5173
   ```

### ❌ Медленная загрузка данных

**Симптомы:**
- Долгая загрузка источников данных (>30 сек)
- Таймауты при запросах к API
- Зависание интерфейса

**Диагностика:**
```bash
# Проверить использование памяти
pm2 monit

# Проверить логи производительности
pm2 logs ftdna-haplo-server --lines 50 | grep "slow"

# Проверить размер кэша
ls -la ftdna_haplo/cache/
```

**Решение:**
1. Увеличить таймауты:
   ```bash
   # str-matcher/.env.local
   NEXT_PUBLIC_REQUEST_TIMEOUT=60000  # 60 секунд
   
   # ftdna_haplo/.env
   REQUEST_TIMEOUT=60000
   ```

2. Включить кэширование:
   ```bash
   # ftdna_haplo/.env
   ENABLE_CACHE=true
   CACHE_TTL=300000  # 5 минут
   ```

3. Увеличить лимиты памяти PM2:
   ```bash
   # ecosystem.config.js
   max_memory_restart: '2G'
   ```

## 🔍 Диагностика проблем

### Проверка состояния системы

```bash
#!/bin/bash
# system-health-check.sh

echo "🔍 Проверка состояния DNA-utils-universal"

# Проверка PM2 процессов
echo "📊 PM2 процессы:"
pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"'

# Проверка портов
echo "🌐 Открытые порты:"
netstat -tulpn | grep -E "(3000|9003|5173)"

# Проверка API эндпоинтов
echo "🔗 API эндпоинтов:"
curl -s http://localhost:9003/api/health || echo "❌ FTDNA Haplo API недоступен"
curl -s http://localhost:3000/api/health || echo "❌ STR Matcher недоступен"

# Проверка дискового пространства
echo "💿 Дисковое пространство:"
df -h | grep -E "(/$|/tmp)"

# Проверка логов ошибок
echo "📋 Последние ошибки:"
pm2 logs --err --lines 5
```

### Логирование и мониторинг

```javascript
// Включить детальное логирование в ftdna_haplo/server/server.js
const morgan = require('morgan');

// Кастомный формат логирования
morgan.token('response-time-custom', (req, res) => {
  const responseTime = parseFloat(res.get('X-Response-Time'));
  return responseTime > 1000 ? `🐌 ${responseTime}ms` : `⚡ ${responseTime}ms`;
});

app.use(morgan(':method :url :status :response-time-custom'));

// Логирование медленных запросов
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 5000) {  // > 5 секунд
      console.warn(`🐌 Медленный запрос: ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  next();
});
```

## 🚫 Частые ошибки CORS 

### Problem: "Access to fetch blocked by CORS policy"

**Полная ошибка:**
```
Access to fetch at 'http://localhost:9003/api/check-subclade' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Причины и решения:**

1. **FTDNA Haplo сервер не запущен**
   ```bash
   # Проверить и запустить
   pm2 restart ftdna-haplo-server
   ```

2. **Неправильные CORS настройки**
   ```javascript
   // ftdna_haplo/server/server.js - ПРАВИЛЬНАЯ настройка
   const corsOptions = {
     origin: [
       'http://localhost:3000',  // STR Matcher
       'http://localhost:5173',  // FTDNA Client  
       'http://localhost:3000'   // Если используется dev сервер
     ],
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization']
   };
   ```

3. **Проблемы с preflight запросами**
   ```javascript
   // Добавить обработку OPTIONS запросов
   app.options('*', cors(corsOptions));
   ```

### Problem: "ERR_CONNECTION_REFUSED"

**Решение:**
1. Проверить порты в использовании:
   ```bash
   netstat -tulpn | grep 9003
   ```

2. Перезапустить сервисы в правильном порядке:
   ```bash
   pm2 stop all
   pm2 start ecosystem.config.js
   ```

## 📊 Проблемы с данными

### ❌ Пустые результаты в таблице совпадений

**Симптомы:**
- Данные загружаются, но таблица пустая
- Консольные ошибки "Cannot read property 'filter' of undefined"

**Диагностика:**
```bash
# Проверить структуру загруженных данных
curl "http://localhost:9003/api/repositories" | jq '.[0] | keys'

# Проверить консоль браузера на ошибки JavaScript
```

**Причины:**
1. **Неправильный формат данных в источнике**
2. **Ошибки в логике фильтрации STR Matcher**
3. **Проблемы с парсингом маркеров**

**Решение:**
```javascript
// Добавить отладочную информацию в STRMatcher.tsx
console.log('Загруженные данные:', loadedData);
console.log('Отфильтрованные результаты:', filteredResults);

// Проверить обязательные поля
const requiredFields = ['name', 'markers', 'haplogroup'];
const isValidData = data.every(item => 
  requiredFields.every(field => item.hasOwnProperty(field))
);
```

### ❌ Ошибки в расчете генетических дистанций

**Симптомы:**
- NaN в колонке дистанции
- Неправильные значения расстояний
- Ошибки в Web Worker

**Диагностика:**
```javascript
// В браузерной консоли
performance.mark('distance-calc-start');
// ... расчеты ...
performance.mark('distance-calc-end');
performance.measure('distance-calc', 'distance-calc-start', 'distance-calc-end');
console.log(performance.getEntriesByType('measure'));
```

**Решение:**
1. **Проверить палиндромные маркеры:**
   ```javascript
   // str-matcher/src/utils/str-calculations.js
   const palindromicMarkers = ['DYS385', 'DYS459', 'CDYa', 'CDYb'];
   
   function handlePalindromicMarker(marker, values) {
     if (palindromicMarkers.includes(marker)) {
       // Специальная логика для палиндромных маркеров
       return values.split('-').map(v => parseInt(v)).filter(v => !isNaN(v));
     }
     return [parseInt(values)];
   }
   ```

2. **Отладка Web Worker:**
   ```javascript
   // str-matcher/src/workers/distance-calculator.worker.js
   self.addEventListener('message', (event) => {
     try {
       const result = calculateDistance(event.data);
       self.postMessage({ success: true, result });
     } catch (error) {
       console.error('Worker error:', error);
       self.postMessage({ success: false, error: error.message });
     }
   });
   ```

## 🔧 Проблемы интеграции

### ❌ FTDNA Haplo не может найти гаплогруппы

**Симптомы:**
- API возвращает "Haplogroup not found"
- Некорректная фильтрация субкладов
- Пустые ответы от check-subclade API

**Диагностика:**
```bash
# Проверить загрузку данных FTDNA
curl "http://localhost:9003/api/repositories" | jq '.[] | select(.name == "FTDNA") | .data[0:3]'

# Тестовый запрос check-subclade
curl -X POST http://localhost:9003/api/check-subclade \
  -H "Content-Type: application/json" \
  -d '{"haplogroup": "R-M269", "subclade": "R-L21"}'
```

**Решение:**
1. **Проверить инициализацию дерева гаплогрупп:**
   ```javascript
   // ftdna_haplo/server/services/haplogroup-service.js
   function initializeHaplogroupTree() {
     console.log('🌳 Инициализация дерева гаплогрупп...');
     const treeSize = Object.keys(haplogroupTree).length;
     console.log(`📊 Загружено ${treeSize} узлов дерева`);
     
     if (treeSize === 0) {
       throw new Error('Дерево гаплогрупп не загружено!');
     }
   }
   ```

2. **Отладить функцию isSubclade:**
   ```javascript
   function isSubclade(parent, child, debug = false) {
     if (debug) {
       console.log(`🔍 Проверка: ${child} является субкладом ${parent}?`);
     }
     // ... логика проверки ...
   }
   ```

### ❌ Короткие SNP (R-Y6, Y4, Y2, Y3) обрабатываются некорректно

**Проблема:** Эти SNP требуют специальной обработки из-за их краткости.

**Решение:**
```javascript
// ftdna_haplo/server/services/haplogroup-service.js
const shortSnpMap = {
  'Y2': 'R-Y2',
  'Y3': 'R-Y3', 
  'Y4': 'R-Y4',
  'Y6': 'R-Y6'
};

function normalizeHaplogroup(haplogroup) {
  // Обработка коротких SNP
  if (shortSnpMap[haplogroup]) {
    console.log(`🔄 Нормализация ${haplogroup} -> ${shortSnpMap[haplogroup]}`);
    return shortSnpMap[haplogroup];
  }
  return haplogroup;
}
```

## 🎯 Производительность

### ❌ Медленная загрузка больших файлов данных

**Решение:**
1. **Пагинация данных:**
   ```javascript
   // Загружать данные порциями
   const pageSize = 1000;
   async function loadDataInChunks(repository) {
     const chunks = [];
     for (let i = 0; i < repository.data.length; i += pageSize) {
       chunks.push(repository.data.slice(i, i + pageSize));
     }
     return chunks;
   }
   ```

2. **Виртуализация таблицы:**
   ```jsx
   // Использовать react-window для больших таблиц
   import { FixedSizeList as List } from 'react-window';
   
   <List
     height={600}
     itemCount={matches.length}
     itemSize={50}
     itemData={matches}
   >
     {MatchRow}
   </List>
   ```

3. **Web Workers для расчетов:**
   ```javascript
   // Выносить тяжелые расчеты в Web Worker
   const worker = new Worker('/workers/distance-calculator.worker.js');
   worker.postMessage({ userMarkers, databaseEntries });
   ```

## 📱 Отладка в браузере

### Полезные команды консоли

```javascript
// Проверить состояние загрузки данных
window.localStorage.getItem('str-matcher-repositories');

// Принудительно очистить кэш
window.localStorage.clear();
window.sessionStorage.clear();

// Проверить Web Workers
console.log('Web Workers поддерживаются:', typeof Worker !== 'undefined');

// Мониторинг API запросов
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('API запрос:', args[0]);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('API ответ:', response.status, args[0]);
      return response;
    });
};
```

## 🆘 Критические сценарии

### 🚨 Полная перезагрузка системы

```bash
#!/bin/bash
# emergency-restart.sh

echo "🚨 Экстренная перезагрузка DNA-utils-universal"

# Остановить все процессы
pm2 stop all
sleep 5

# Очистить логи
pm2 flush

# Убить зависшие процессы Node.js
pkill -f "node.*str-matcher"
pkill -f "node.*ftdna_haplo"

# Перезапустить
pm2 start ecosystem.config.js

# Проверить статус
sleep 10
pm2 status

echo "✅ Перезагрузка завершена"
```

### 🔧 Восстановление данных

```bash
# Проверить целостность файлов данных
find . -name "*.json" -exec json_verify {} \;

# Восстановить из бэкапа (если есть)
cp backup/repositories/*.json str-matcher/public/data/

# Пересобрать индексы
npm run rebuild-indexes
```

## 📞 Получение помощи

### Диагностическая информация для отчета об ошибке

```bash
# Собрать диагностическую информацию
echo "=== System Info ===" > debug-report.txt
uname -a >> debug-report.txt
node --version >> debug-report.txt
npm --version >> debug-report.txt

echo "=== PM2 Status ===" >> debug-report.txt
pm2 jlist >> debug-report.txt

echo "=== Environment ===" >> debug-report.txt
cat .env >> debug-report.txt

echo "=== Recent Errors ===" >> debug-report.txt
pm2 logs --err --lines 50 >> debug-report.txt
```

## 🔗 Связанные документы

- [Конфигурация системы](configuration.md)
- [Руководство по установке](setup.md)
- [API справочник](../API_REFERENCE.md)
- [Архитектура системы](../ARCHITECTURE.md)
