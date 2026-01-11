# Руководство разработчика DNA-utils-universal

Полное техническое руководство для разработчиков, участвующих в развитии системы.

## 🏗️ Архитектура проекта

### Микросервисная архитектура
```
DNA-utils-universal/
├── backend/              # Express API + PostgreSQL Core (port 9004) ⭐ MAIN API
├── str-matcher/          # Next.js Frontend (port 9002) ⭐ FRONTEND
├── ftdna_haplo/          # Legacy Haplo Service (port 9003) ⭐ LEGACY/PROXY target
├── ystr_predictor/       # Python ML Service (in development)
└── docs/                 # Documentation
```

### Ключевые обновления августа 2025 ⭐ НОВОЕ

#### STR Matcher - Революционные оптимизации
- **Streaming архитектура**: обработка файлов любого размера без memory overflow
- **95% сокращение памяти**: вместо 500MB → <50MB постоянно
- **Batch Web Workers**: трехэтапная обработка с микро-паузами
- **Потоковое IndexedDB**: чтение по 1000 профилей с паузами для UI

#### FTDNA Haplo - Новые компоненты
- **migration_tracker.js**: отслеживание миграций данных между источниками  
- **snp_history.js**: кэширование и история SNP совпадений
- **yfull_tree.js**: оптимизированная обработка YFull деревьев
- **yfull_adapter.ts**: TypeScript версия с улучшенной типизацией

### Технологический стек

| Компонент | Технологии |
|-----------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express.js, JavaScript |
| **Database** | IndexedDB (client), JSON files (server) |
| **State Management** | Redux Toolkit, React Hooks |
| **Build Tools** | Vite, Webpack (Next.js), PM2 |
| **ML** | Python, FastAPI, scikit-learn (планируется) |

## 🚀 Настройка среды разработки

### Предварительные требования
```bash
Node.js >= 16.0.0
npm >= 8.0.0
Python >= 3.8 (для ystr_predictor)
Git
```

### Установка

#### 1. Клонирование репозитория
```bash
git clone https://github.com/valalav/DNA-utils-universal.git
cd DNA-utils-universal
```

#### 2. Установка зависимостей корневого проекта
```bash
npm install
```

#### 3. Установка зависимостей подпроектов
```bash
# STR Matcher
cd str-matcher && npm install && cd ..

# FTDNA Haplo Server
cd ftdna_haplo/server && npm install && cd ../..

# FTDNA Haplo Client  
cd ftdna_haplo/client && npm install && cd ../..
```

#### 4. Настройка переменных окружения
```bash
# Создать .env файл
cp .env.example .env

# Отредактировать под локальную среду
nano .env
```

**Пример .env**:
```bash
NODE_ENV=development
HOST_IP=localhost
DEV_API_URL=http://localhost:9003/api
ALLOWED_ORIGINS=http://localhost:9002,http://localhost:5173
```

### Запуск в режиме разработки

#### Запуск всех сервисов
```bash
npm run dev
```

#### Запуск отдельных компонентов
```bash
# STR Matcher только  
cd str-matcher && npm run dev

# FTDNA Haplo API только
cd ftdna_haplo && node server/server.js

# FTDNA Haplo Client только
cd ftdna_haplo/client && npm run dev
```

### Проверка работоспособности
- **STR Matcher**: http://localhost:9002
- **FTDNA Haplo API**: http://localhost:9003/api/health
- **Haplo Client**: http://localhost:5173

## 📁 Структура кода

### STR Matcher (Next.js)

```
str-matcher/src/
├── app/                    # Next.js App Router
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   └── api/                   # API routes (proxy)
├── components/
│   ├── str-matcher/           # Business components
│   │   ├── STRMatcher.tsx        # Main container ⭐
│   │   ├── MatchesTable.tsx      # Results table ⭐
│   │   ├── DataRepositories.tsx  # Data loading ⭐
│   │   ├── HaplogroupFilter.tsx  # Haplogroup filtering
│   │   └── STRMarkerGrid.tsx     # Marker input grid
│   ├── layout/               # Layout components
│   └── ui/                   # Reusable UI components
├── hooks/
│   ├── useSTRMatcher.ts       # Main business logic ⭐
│   ├── useHaplogroups.ts      # Haplogroup operations
│   └── useTranslation.ts      # i18n support
├── utils/
│   ├── calculations.ts        # Genetic distance algorithms ⭐
│   ├── dataProcessing.ts      # CSV/Excel parsing
│   ├── constants.ts           # Markers, palindromes ⭐
│   └── storage/              # IndexedDB operations
├── workers/
│   └── comparison.worker.ts   # STR comparison worker ⭐
├── store/                    # Redux store
├── types/                    # TypeScript definitions
└── config/                   # Configuration files
```

**⭐ = Критически важные файлы**

### FTDNA Haplo (Node.js)

```
ftdna_haplo/
├── server/
│   ├── server.js              # Express server ⭐
│   └── services/
│       └── haplogroup-service.js # Business logic ⭐
├── client/                   # React/Vite client
│   ├── src/
│   │   ├── components/
│   │   │   ├── HaploViewer.jsx    # Main viewer
│   │   │   ├── HaploFilters.jsx   # Filtering
│   │   │   └── HaplogroupTree.jsx # Tree visualization
│   │   └── utils/
├── data/                     # JSON data files
│   ├── get.json              # FTDNA tree data ⭐
│   └── ytree.json            # YFull tree data ⭐ 
├── haplo_functions.js        # FTDNA tree processing ⭐
├── yfull_adapter.js          # YFull integration ⭐
├── search_integration.js     # Cross-tree search
└── path_builder.js           # Special path building
```

## 🔧 Ключевые компоненты

### 1. STRMatcher.tsx - Главный контейнер

**Ответственность**:
- Управление состоянием приложения
- Координация между компонентами
- Обработка пользовательского ввода

**Основные хуки**:
```typescript
const {
  database, setDatabase,           // STR profiles database
  query, setQuery,                 // Current search query  
  matches, setMatches,             // Search results
  loading, setLoading,             // Loading states
  // ... другие состояния
} = useSTRMatcher();
```

**Интеграция с FTDNA Haplo**:
```typescript
// Фильтрация по субкладам
const applyFilters = useCallback(async () => {
  for (const uniqueHaplogroup of uniqueHaplogroups) {
    const response = await fetch('/api/check-subclade', {
      method: 'POST',
      body: JSON.stringify({
        haplogroup: match.profile.haplogroup,
        parentHaplogroup: targetHaplogroup
      })
    });
    // Обработка результата...
  }
}, []);
```

### 2. MatchesTable.tsx - Таблица результатов

**Критические особенности**:

#### Система выделения маркеров
```typescript
// Расчет редкости маркера
const { rarity, rarityStyle } = calculateMarkerRarity(
  matches, marker, matchValue, queryValue
);

// CSS класс для фона
const rarityClass = getRarityClass(marker, matchValue);
// marker-rarity-common | uncommon | rare | very-rare | extremely-rare
```

#### Интерактивные элементы
```typescript
// Клик по гаплогруппе - показ popup с путями
const handleHaplogroupClick = async (haplogroup: string) => {
  const response = await fetch(`/api/haplogroup-path/${haplogroup}`);
  const pathData = await response.json();
  // Показать popup с FTDNA и YFull путями
};

// Клик по Kit Number - установка как новый query
const handleKitClick = (kitNumber: string) => {
  const selectedProfile = matches.find(m => m.profile.kitNumber === kitNumber);
  onKitNumberClick(kitNumber);
};
```

#### Фильтрация по маркерам
```typescript
// Чекбоксы в заголовках маркеров
const handleMarkerFilter = (marker: string, checked: boolean) => {
  if (checked) {
    // Показать только профили с таким же значением маркера
    const filteredMatches = matches.filter(match => 
      match.profile.markers[marker] === query?.markers[marker]
    );
    setDisplayedMatches(filteredMatches);
  }
};
```

### 3. useSTRMatcher.ts - Основная бизнес-логика

**Web Worker интеграция**:
```typescript
const handleFindMatches = useCallback(async () => {
  setLoading(true);
  
  // Запуск Web Worker для расчетов
  const worker = new Worker('/workers/comparison.worker.js');
  
  worker.postMessage({
    type: 'FIND_MATCHES',
    payload: {
      query: queryProfile,
      database: profiles,
      maxDistance,
      minMarkers: markerCount
    }
  });
  
  worker.onmessage = (event) => {
    const { type, payload } = event.data;
    if (type === 'MATCHES_FOUND') {
      setMatches(payload.matches);
      setLoading(false);
    }
  };
}, [queryProfile, profiles, maxDistance, markerCount]);
```

### 4. comparison.worker.ts - STR расчеты

**Основной алгоритм** (обновлен для streaming):
```typescript
class STRComparisonWorker {
  findMatches(params: MatchingParams): STRMatch[] {
    const matches: STRMatch[] = [];
    
    // ⭐ НОВОЕ: Трехэтапная обработка
    switch (params.type) {
      case 'init':
        this.initializeWorker(params);
        break;
        
      case 'processBatch':
        // Обработка порциями по 1000 с микро-паузами
        for (const profile of params.batch) {
          const distance = this.calculateDistance(
            params.query, 
            profile, 
            params.calculationMode
          );
          
          if (distance <= params.maxDistance) {
            matches.push({
              profile,
              distance,
              sharedMarkers: this.countSharedMarkers(params.query, profile),
              differences: this.calculateDifferences(params.query, profile)
            });
          }
          
          // Микро-пауза каждые 100 профилей
          if (matches.length % 100 === 0) {
            await this.pause(0);
          }
        }
        break;
        
      case 'finalize':
        // Финальная сортировка и отправка результатов
        return matches.sort((a, b) => a.distance - b.distance);
    }
  }
}
```

### 5. ⭐ НОВЫЕ КОМПОНЕНТЫ FTDNA Haplo

#### migration_tracker.js - Система миграций
```javascript
class MigrationTracker {
  constructor() {
    this.migrations = new Map();
  }

  addMigration(sourceId, targetId, type, confidence) {
    this.migrations.set(sourceId, {
      targetId,
      type,
      confidence,
      timestamp: Date.now()
    });
  }
}
```

#### snp_history.js - Кэш SNP совпадений  
```javascript
class SNPHistoryHandler {
  constructor() {
    this.history = new Map();
  }

  addMatch(source, target, matchType, confidence) {
    const sourceKey = this.generateKey(source.haplogroup, source.snp);
    // Кэширование для оптимизации повторных запросов
  }
}
```

#### yfull_tree.js - Оптимизированное YFull дерево
```javascript
class YFullTree {
  constructor(jsonData) {
    this.data = jsonData;
    this.idToNode = new Map();
    this.snpToNode = new Map();
    this.initializeIndices(this.data); // Быстрые lookup таблицы
  }
}
```

### 5. HaplogroupService.js - API бизнес-логика

**Критический компонент для интеграции**:
```javascript
class HaplogroupService {
  async searchHaplogroup(term) {
    const result = { ftdna: null, yfull: null };
    
    // Поиск в FTDNA дереве
    if (this.ftdnaTree) {
      const ftdnaNode = this.ftdnaTree.findHaplogroup(term);
      if (ftdnaNode) {
        const details = this.ftdnaTree.getHaplogroupDetails(ftdnaNode.haplogroupId);
        result.ftdna = {
          path: details.path,
          url: `https://discover.familytreedna.com/y-dna/${term}/tree`,
          statistics: details.statistics
        };
      }
    }
    
    // Поиск в YFull дереве + интеграция через SearchIntegrator
    // ...
    
    return result;
  }
  
  // ⚠️ КРИТИЧЕСКИЙ МЕТОД для фильтрации субкладов
  async checkSubclade(haplogroup, parentHaplogroup) {
    let isSubcladeResult = false;
    
    // Проверка в FTDNA дереве
    if (this.ftdnaTree) {
      isSubcladeResult = this.ftdnaTree.isSubclade(haplogroup, parentHaplogroup);
    }
    
    // Если не найдено в FTDNA, проверяем YFull
    if (!isSubcladeResult && this.yfullTree) {
      isSubcladeResult = this.yfullTree.isSubclade(haplogroup, parentHaplogroup);
    }
    
    return isSubcladeResult;
  }
}
```

## 🔄 Процесс разработки

### Git Workflow

#### Ветки
```
main                    # Production branch
├── develop            # Integration branch  
├── feature/new-algo   # Feature branches
├── bugfix/path-issue  # Bug fix branches
└── hotfix/critical    # Emergency fixes
```

#### Коммиты
Используется Conventional Commits:
```bash
feat: add haplogroup subclade filtering
fix: resolve R-Y6 path building issue  
docs: update API reference
refactor: optimize STR calculation worker
perf: improve large dataset loading
```

### Code Style

#### TypeScript/JavaScript
```typescript
// Используем строгие типы
interface STRProfile {
  kitNumber: string;
  name: string;
  country: string;
  haplogroup: string;
  markers: Record<string, string>;
}

// Предпочитайте функциональные компоненты с хуками
const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<StateType>(initialState);
  
  const handleEvent = useCallback((event: Event) => {
    // Handler logic
  }, [dependencies]);
  
  return <div>Component JSX</div>;
};
```

#### CSS/Tailwind
```typescript
// Предпочитайте Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <span className="text-lg font-semibold text-gray-800">Title</span>
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
    Action
  </button>
</div>

// Для сложных стилей используйте CSS-in-JS или модули
const StyledComponent = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  // ...
`;
```

### Testing Strategy

#### Unit Tests
```typescript
// Jest + React Testing Library для компонентов
describe('STRMatcher', () => {
  test('should calculate genetic distance correctly', () => {
    const query = mockSTRProfile1;
    const target = mockSTRProfile2;
    
    const distance = calculateGeneticDistance(query, target, 'standard');
    
    expect(distance).toBe(expectedDistance);
  });
  
  test('should filter by subclade correctly', async () => {
    const haplogroup = 'R-L23';
    const parent = 'R-M269';
    
    const result = await checkSubclade(haplogroup, parent);
    
    expect(result).toBe(true);
  });
});
```

#### Integration Tests
```typescript
// API integration tests
describe('Haplogroup API', () => {
  test('should return haplogroup path', async () => {
    const response = await fetch('/api/haplogroup-path/R-M269');
    const data = await response.json();
    
    expect(data.ftdnaDetails.path.string).toContain('R-M269');
    expect(data.yfullDetails.path.string).toContain('R-M269');
  });
});
```

#### E2E Tests
```typescript
// Playwright для E2E тестирования
test('full STR matching workflow', async ({ page }) => {
  await page.goto('http://localhost:9002');
  
  // Загрузка данных
  await page.click('[data-testid="load-aadna-data"]');
  await page.waitForSelector('[data-testid="data-loaded"]');
  
  // Поиск матчей
  await page.fill('[data-testid="kit-number"]', '39626');
  await page.click('[data-testid="find-matches"]');
  
  // Проверка результатов
  await expect(page.locator('[data-testid="matches-table"]')).toBeVisible();
  await expect(page.locator('[data-testid="match-row"]').first()).toBeVisible();
});
```

## 🚨 Критические предупреждения

### ⚠️ НЕ ТРОГАТЬ ystr_predictor
```bash
# Этот компонент в разработке - НЕ ИЗМЕНЯТЬ
ystr_predictor/
├── app.py              # Заглушка
├── models/             # Пустые модели
└── requirements.txt    # Базовые зависимости
```

### ⚠️ Критические API эндпоинты

#### check-subclade - основа фильтрации ⭐ РАСШИРЕН
```javascript
// Любые изменения в этом эндпоинте могут сломать фильтрацию
app.post('/api/check-subclade', async (req, res) => {
  const { haplogroup, parentHaplogroup } = req.body;
  
  // Критическая логика - тестировать изменения тщательно!
  const result = await haplogroupService.checkSubclade(haplogroup, parentHaplogroup);
  
  res.json({ isSubclade: result });
});

// ⭐ НОВОЕ: Batch API для массовой проверки
app.post('/api/batch-check-subclades', async (req, res) => {
  const { haplogroups, parentHaplogroups } = req.body;
  
  // Оптимизированная групповая проверка
  const results = await haplogroupService.batchCheckSubclades(haplogroups, parentHaplogroups);
  
  res.json({ results });
});
```

### ⚠️ Оптимизации памяти - НЕ ЛОМАТЬ ⭐ НОВОЕ
```typescript
// КРИТИЧЕСКИ ВАЖНО: Всегда использовать streaming
// ❌ НЕ ДЕЛАТЬ ТАК:
const profiles = await dbManager.getProfiles(); // Загружает ВСЕ в память!

// ✅ ДЕЛАТЬ ТАК:
await dbManager.streamProfiles((batch: STRProfile[]) => {
  // Обработка порциями по 1000
}, 1000);
```

### ⚠️ Проблемные SNP маркеры
```javascript
// Особая обработка для коротких SNP
const PROBLEMATIC_SNPS = ['Y6', 'Y4', 'Y2', 'Y3', 'Y27', 'Y28'];

// Используйте PathBuilder для этих случаев
if (PROBLEMATIC_SNPS.some(snp => term.includes(snp))) {
  const specialPath = this.pathBuilder.buildPath(nodeId);
  // ...
}
```

### ⚠️ Палиндромные маркеры
```typescript
// Требуют специальной обработки
const palindromes = {
  'DYS385': 2,    // Формат: "11-14"
  'DYS459': 2,    // Формат: "9-10" 
  'DYS464': 4,    // Формат: "13-14-16-17"
  'CDYa': 1,      // Один из пары CDY
  'CDYb': 1       // Второй из пары CDY
};

function processPalindromicMarker(value: string, marker: string): string {
  if (!(marker in palindromes)) return value;
  
  const values = value.split(/[-,]/);
  return values
    .map(v => cleanValue(v))
    .sort((a, b) => Number(a) - Number(b))
    .join('-');
}
```

## 🔧 Отладка и профилирование

### Логирование

#### Серверная сторона
```javascript
// Используйте консистентное логирование
console.log('Search request:', { term, timestamp: new Date().toISOString() });
console.error('Error in subclade check:', error.message, error.stack);

// Для production добавьте winston или similar
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

#### Клиентская сторона
```typescript
// React DevTools + Redux DevTools
const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production'
});

// Performance профилирование
const [performanceData, setPerformanceData] = useState<PerformanceData>();

useEffect(() => {
  const startTime = performance.now();
  
  // Выполнение операции
  performHeavyCalculation().then(() => {
    const endTime = performance.now();
    setPerformanceData({ duration: endTime - startTime });
  });
}, []);
```

### Профилирование производительности

#### Web Workers мониторинг
```typescript
// Мониторинг производительности Worker'ов
class WorkerMonitor {
  private workers: Map<string, Worker> = new Map();
  private metrics: Map<string, PerformanceMetrics> = new Map();
  
  startWorker(id: string, task: WorkerTask) {
    const worker = new Worker('/workers/comparison.worker.js');
    const startTime = performance.now();
    
    worker.onmessage = (event) => {
      const endTime = performance.now();
      this.metrics.set(id, {
        duration: endTime - startTime,
        memoryUsed: (performance as any).memory?.usedJSHeapSize || 0
      });
    };
    
    this.workers.set(id, worker);
    worker.postMessage(task);
  }
}
```

#### IndexedDB производительность
```typescript
// Мониторинг операций с базой данных
class IndexedDBMonitor {
  async measureQuery<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      console.log(`IndexedDB operation took ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      console.error('IndexedDB operation failed:', error);
      throw error;
    }
  }
}
```

## 🔒 Безопасность

### API Security

#### Input Validation
```javascript
// Валидация входных параметров
function validateHaplogroupInput(haplogroup) {
  if (!haplogroup || typeof haplogroup !== 'string') {
    throw new Error('Invalid haplogroup parameter');
  }
  
  // Разрешены только буквенно-цифровые символы, дефисы и некоторые спецсимволы
  if (!/^[A-Za-z0-9\-_\/]+$/.test(haplogroup)) {
    throw new Error('Invalid haplogroup format');
  }
  
  if (haplogroup.length > 50) {
    throw new Error('Haplogroup name too long');
  }
  
  return haplogroup;
}
```

#### Rate Limiting
```javascript
// Простой rate limiter для критических эндпоинтов
const rateLimiter = new Map();

function checkRateLimit(ip, endpoint) {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const window = 60000; // 1 minute
  const maxRequests = endpoint === '/api/check-subclade' ? 100 : 60;
  
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, { count: 1, resetTime: now + window });
    return true;
  }
  
  const record = rateLimiter.get(key);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + window;
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}
```

### Client Security

#### XSS Prevention
```typescript
// Sanitize пользовательский ввод
import DOMPurify from 'dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input);
}

// Используйте для отображения пользовательских данных
<div dangerouslySetInnerHTML={{ __html: sanitizeInput(userInput) }} />
```

#### CSP Headers
```javascript
// Content Security Policy
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://docs.google.com;"
  );
  next();
});
```

## 📦 Deployment

### Build Process

#### Production Build
```bash
# Build всех компонентов
npm run build

# Отдельные сборки
npm run build:str-matcher    # Next.js build
npm run build:haplo-client   # Vite build
```

#### Docker Configuration
```dockerfile
# Dockerfile для STR Matcher
FROM node:18-alpine

WORKDIR /app
COPY str-matcher/package*.json ./
RUN npm ci --only=production

COPY str-matcher .
RUN npm run build

EXPOSE 9002
CMD ["npm", "start"]
```

### Environment Configuration

#### Production .env
```bash
NODE_ENV=production
HOST_IP=0.0.0.0
PROD_API_URL=https://api.yourdomain.com/api
ALLOWED_ORIGINS=https://yourdomain.com,https://haplo.yourdomain.com
```

#### PM2 Production Config
```javascript
// ecosystem.production.js
module.exports = {
  apps: [{
    name: 'str-matcher-prod',
    script: './str-matcher/node_modules/next/dist/bin/next',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 9002
    }
  }]
};
```

### Monitoring

#### Health Checks
```javascript
// Health check эндпоинт
app.get('/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    services: {
      ftdnaTree: !!this.ftdnaTree,
      yfullTree: !!this.yfullTree,
      searchIntegrator: !!this.searchIntegrator
    }
  };
  
  res.status(200).json(healthCheck);
});
```

#### Performance Metrics
```javascript
// Basic metrics collection
const metrics = {
  requestCount: 0,
  errorCount: 0,
  responseTime: []
};

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    metrics.requestCount++;
    metrics.responseTime.push(Date.now() - start);
    
    if (res.statusCode >= 400) {
      metrics.errorCount++;
    }
  });
  
  next();
});
```

## 🤝 Contributing Guidelines

### Pull Request Process

1. **Fork репозитория** и создайте feature branch
2. **Убедитесь, что тесты проходят**: `npm test`
3. **Добавьте тесты** для новой функциональности
4. **Обновите документацию** при необходимости
5. **Создайте PR** с подробным описанием изменений

### Code Review Checklist

- [ ] Код соответствует style guide
- [ ] Добавлены/обновлены тесты
- [ ] Документация обновлена
- [ ] Нет breaking changes без миграционного пути
- [ ] Performance impact оценен
- [ ] Security implications рассмотрены

### Release Process

1. **Update version** в package.json
2. **Update CHANGELOG.md** с новыми features/fixes
3. **Create git tag**: `git tag v1.2.3`
4. **Push tag**: `git push origin v1.2.3`
5. **Create GitHub release** с release notes

---

*Руководство разработчика обновлено: Август 2025*