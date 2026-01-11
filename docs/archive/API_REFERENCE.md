# API Reference - DNA-utils-universal

Полный справочник API эндпоинтов системы DNA-utils-universal.

## 🌐 Base URLs

| Сервис | URL | Порт |
|--------|-----|------|
| STR Matcher | `http://localhost:9002` | 9002 |
| FTDNA Haplo API | `http://localhost:9003` | 9003 |
| Haplo Client | `http://localhost:5173` | 5173 |

## 🔑 Аутентификация

В текущей версии API не требует аутентификации. Все эндпоинты доступны публично.


### DNA-utils Backend (Port 9004)

Core service for profile management and matching.

#### `POST /api/profiles/find-matches`
Find Y-STR matches for a given profile.
**Body**:
```json
{
  "markers": { "DYS393": "13", ... },
  "maxDistance": 4,
  "markerCount": 37
}
```

#### `GET /api/profiles/:kitNumber`
Get profile details by Kit Number.

#### `POST /api/profiles/upload`
Upload CSV/Excel file with profiles.

---

## 📋 FTDNA Haplo API Endpoints (Port 9003)

Legacy service for haplogroup tree traversal and phylogeny.

### Health Check

#### `GET /api/health`
Проверка состояния сервиса.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-08-01T12:00:00.000Z"
}
```

---

### Поиск гаплогруппы

#### `GET /api/search/:haplogroup`
Поиск информации о гаплогруппе в базах FTDNA и YFull.

**Parameters**:
- `haplogroup` (path): Название гаплогруппы или SNP маркер

**Examples**:
```bash
GET /api/search/R-M269
GET /api/search/R-L23
GET /api/search/Y6
```

**Response 200**:
```json
{
  "name": "R-M269",
  "ftdnaDetails": {
    "path": {
      "nodes": [
        {
          "id": "1",
          "name": "A0-T",
          "variants": ["M91", "P97"]
        }
      ],
      "string": "A0-T > A1 > ... > R-M269"
    },
    "url": "https://discover.familytreedna.com/y-dna/R-M269/tree",
    "statistics": {
      "totalKits": 125000,
      "countryStats": [
        {
          "code": "GB", 
          "name": "United Kingdom",
          "count": 35000
        }
      ]
    },
    "treeData": {
      "id": "12345",
      "name": "R-M269",
      "children": []
    }
  },
  "yfullDetails": {
    "path": {
      "nodes": [...],
      "string": "A0-T > A1 > ... > R-M269"
    },
    "url": "https://www.yfull.com/tree/R-M269/",
    "statistics": {
      "formed": 4300,
      "tmrca": 4300
    }
  }
}
```

**Response 404**:
```json
{
  "error": "Haplogroup R-UNKNOWN not found",
  "details": "No data available in FTDNA or YFull databases"
}
```

---

### Путь гаплогруппы

#### `GET /api/haplogroup-path/:haplogroup`
Получение полного пути гаплогруппы в филогенетическом дереве.

**Parameters**:
- `haplogroup` (path): Название гаплогруппы

**Response 200**:
```json
{
  "name": "R-L23",
  "ftdnaDetails": {
    "path": {
      "nodes": [
        {
          "id": "1",
          "name": "A0-T",
          "variants": ["M91"]
        },
        {
          "id": "234",
          "name": "R-L23", 
          "variants": ["L23"]
        }
      ],
      "string": "A0-T > A1 > BT > CT > CF > F > ... > R > R1 > R1b > R-M269 > R-L23"
    },
    "url": "https://discover.familytreedna.com/y-dna/R-L23/tree"
  },
  "yfullDetails": {
    "path": {
      "nodes": [...],
      "string": "A0-T > A1 > ... > R-L23"  
    },
    "url": "https://www.yfull.com/tree/R-L23/"
  }
}
```

---

### Проверка субкладов ⚠️ КРИТИЧЕСКИЙ ЭНДПОИНТ

#### `POST /api/check-subclade`
Проверяет, является ли одна гаплогруппа субкладом (потомком) другой.

**Body**:
```json
{
  "haplogroup": "R-L23",
  "parentHaplogroup": "R-M269",
  "showNonNegative": true
}
```

**Parameters**:
- `haplogroup` (required): Проверяемая гаплогруппа
- `parentHaplogroup` (required): Предполагаемая родительская гаплогруппа  
- `showNonNegative` (optional): Режим проверки

**Response 200**:
```json
{
  "isSubclade": true
}
```

**Examples**:
```bash
# R-L23 является субкладом R-M269
POST /api/check-subclade
{
  "haplogroup": "R-L23", 
  "parentHaplogroup": "R-M269"
}
# Response: {"isSubclade": true}

# R-M269 НЕ является субкладом R-L23
POST /api/check-subclade
{
  "haplogroup": "R-M269",
  "parentHaplogroup": "R-L23" 
}
# Response: {"isSubclade": false}
```

**Логика проверки**:
1. Проверка базовых гаплогрупп (одинаковый корень: R, I, J, etc.)
2. Получение полных путей в филогенетическом дереве
3. Проверка: является ли путь `parentHaplogroup` префиксом пути `haplogroup`

---

### Автодополнение

#### `GET /api/autocomplete`
Автодополнение при вводе названия гаплогруппы или SNP.

**Query Parameters**:
- `term` (required): Поисковый запрос

**Examples**:
```bash
GET /api/autocomplete?term=R-M
GET /api/autocomplete?term=Y6
```

**Response 200**:
```json
[
  {
    "type": "SNP",
    "value": "M269",
    "haplogroup": "R-M269"
  },
  {
    "type": "Haplogroup", 
    "value": "R-M167",
    "haplogroup": "R-M167"
  }
]
```

---

## 📊 STR Matcher Internal APIs

### Data Loading

#### `POST /api/data/upload`
Загрузка STR профилей из файла.

**Body**: FormData с CSV/Excel файлом

**Response**:
```json
{
  "success": true,
  "profilesLoaded": 1250,
  "duplicatesSkipped": 45,
  "errors": []
}
```

#### `GET /api/data/repositories`
Получение списка доступных репозиториев данных.

**Response**:
```json
[
  {
    "id": "aadna",
    "name": "AADNA.ru Database",
    "description": "Основная база данных Y-DNA",
    "category": "Y-DNA",
    "url": "https://docs.google.com/spreadsheets/d/e/.../output=csv",
    "type": "google_sheet"
  },
  {
    "id": "r1b",
    "name": "R1b Database", 
    "type": "chunked_json",
    "url": "/chunk_",
    "chunks": 16
  }
]
```

---

## 🔍 Коды ошибок

| Код | Описание | Решение |
|-----|----------|---------|
| 200 | Успешный запрос | - |
| 400 | Неверные параметры | Проверьте формат запроса |
| 404 | Гаплогруппа не найдена | Проверьте название гаплогруппы |
| 500 | Внутренняя ошибка сервера | Проверьте логи сервера |

### Примеры ошибок

**400 Bad Request**:
```json
{
  "error": "Missing required parameter: haplogroup",
  "details": "The haplogroup parameter is required for this endpoint"
}
```

**404 Not Found**:
```json
{
  "error": "Haplogroup R-UNKNOWN not found",
  "details": "No data available in FTDNA or YFull databases"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Database connection failed",
  "details": "Unable to load haplogroup data",
  "stack": "Error: ENOENT: no such file or directory..." // только в development
}
```

---

## 📡 WebSocket APIs (планируется)

### Real-time Updates
В будущих версиях планируется WebSocket поддержка для:
- Real-time обновления расчетов STR
- Уведомления о новых данных
- Collaborative фильтрация

---

## 🔧 Rate Limiting

В production среде рекомендуется настроить rate limiting:
- **check-subclade**: 100 запросов/минуту (критический эндпоинт)
- **search**: 60 запросов/минуту  
- **autocomplete**: 30 запросов/минуту

---

## 📝 Request/Response Examples

### Сложный запрос фильтрации субкладов

```javascript
// JavaScript пример использования
async function filterBySubclade(matches, targetHaplogroup) {
  const results = [];
  
  for (const match of matches) {
    try {
      const response = await fetch('/api/check-subclade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          haplogroup: match.profile.haplogroup,
          parentHaplogroup: targetHaplogroup,
          showNonNegative: true
        })
      });
      
      const result = await response.json();
      if (result.isSubclade) {
        results.push(match);
      }
    } catch (error) {
      console.error('Error checking subclade:', error);
    }
  }
  
  return results;
}
```

### Batch запросы (рекомендуется)

```javascript
// Оптимизированный batch запрос для множественной проверки субкладов
async batchCheckSubclades(haplogroups, parentHaplogroup) {
  // Группируем уникальные гаплогруппы
  const uniqueHaplogroups = [...new Set(haplogroups)];
  
  const promises = uniqueHaplogroups.map(haplogroup =>
    fetch('/api/check-subclade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        haplogroup,
        parentHaplogroup,
        showNonNegative: true
      })
    }).then(r => r.json())
  );
  
  const results = await Promise.all(promises);
  
  // Создаем Map для быстрого lookup
  const resultMap = new Map();
  uniqueHaplogroups.forEach((haplogroup, index) => {
    resultMap.set(haplogroup, results[index].isSubclade);
  });
  
  return resultMap;
}
```

---

## 🚀 Best Practices

### 1. Обработка ошибок
```javascript
try {
  const response = await fetch('/api/search/R-M269');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
} catch (error) {
  console.error('API Error:', error);
  // Показать пользователю дружелюбное сообщение об ошибке
}
```

### 2. Кэширование результатов
```javascript
const haplogroupCache = new Map();

async function searchHaplogroupCached(haplogroup) {
  if (haplogroupCache.has(haplogroup)) {
    return haplogroupCache.get(haplogroup);
  }
  
  const result = await fetch(`/api/search/${haplogroup}`).then(r => r.json());
  haplogroupCache.set(haplogroup, result);
  return result;
}
```

### 3. Timeout и retry логика
```javascript
async function apiCallWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
}
```

---

## 🔐 CORS Configuration

API сконфигурирован для работы со следующими origins:

```javascript
const allowedOrigins = [
  'http://localhost:9002',      // STR Matcher (dev)
  'http://localhost:5173',      // Haplo Client (dev)
  'https://str.aadna.ru:8443'   // Production
];
```

### Preflight запросы
Для POST запросов автоматически отправляется OPTIONS preflight:

```http
OPTIONS /api/check-subclade HTTP/1.1
Origin: http://localhost:9002
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:9002
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

*API Reference обновлен: Август 2025*