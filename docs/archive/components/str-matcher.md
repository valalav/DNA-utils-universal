# STR Matcher - Основной компонент системы

Подробная техническая документация компонента STR Matcher - ядра системы анализа Y-STR маркеров.

## 🏗️ Архитектура компонента

### Технологический стек
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18 с TypeScript
- **Styling**: Tailwind CSS + custom CSS modules
- **State Management**: Redux Toolkit + React Hooks
- **Storage**: IndexedDB (browser-side)
- **Workers**: Web Workers для тяжелых вычислений
- **HTTP Client**: Axios + fetch API

### Структура файлов
```
str-matcher/src/
├── app/                    # Next.js App Router
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page  
│   └── api/                   # Proxy API routes
├── components/
│   ├── str-matcher/           # Business components
│   ├── layout/               # Layout components
│   └── ui/                   # Reusable UI components
├── hooks/                    # Custom React hooks
├── utils/                    # Utility functions
├── workers/                  # Web Workers
├── store/                    # Redux store
├── types/                    # TypeScript definitions
└── config/                   # Configuration
```

## 🧩 Ключевые компоненты

### 1. STRMatcher.tsx - Главный контейнер

**Назначение**: Центральный компонент, управляющий всем состоянием приложения и координирующий взаимодействие между дочерними компонентами.

#### Основные обязанности
- Управление состоянием STR профилей и результатов поиска
- Координация между загрузчиком данных и таблицей результатов  
- Интеграция с FTDNA Haplo API для фильтрации гаплогрупп
- Обработка пользовательского ввода и валидация

#### Ключевые хуки и состояния
```typescript
const {
  database,              // Массив загруженных STR профилей
  setDatabase,           // Функция обновления базы данных
  query,                 // Текущий поисковый профиль
  setQuery,              // Функция установки поискового профиля
  matches,               // Результаты поиска (STRMatch[])
  setMatches,            // Функция обновления результатов
  loading,               // Состояние загрузки
  error,                 // Состояние ошибки
  // ... другие состояния
} = useSTRMatcher();
```

#### Интеграция с FTDNA Haplo
```typescript
// Фильтрация по субкладам - критический функционал
// Использование Batch API для оптимизации производительности
const applyFilters = useCallback(async () => {
  if (!strMatches.length) return;
  
  // 1. Сбор уникальных гаплогрупп
  const uniqueHaplogroups = [...new Set(
    strMatches.map(match => match.profile.haplogroup).filter(Boolean)
  )];
  
  try {
    // 2. Единый запрос для проверки всех гаплогрупп
    const response = await fetch('/api/batch-check-subclades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        haplogroups: uniqueHaplogroups,
        parent: haplogroupFilter.includeGroups[0]
      })
    });
    
    const { results } = await response.json();
    
    // 3. Фильтрация на клиента
    const filteredMatches = strMatches.filter(match => {
      if (!match.profile.haplogroup) return true;
      return results[match.profile.haplogroup] === true;
    });
    
    setFilteredByHaplogroup(filteredMatches);
    
  } catch (error) {
    console.error('Error checking subclades:', error);
  }
}, [strMatches, haplogroupFilter]);
```

### 2. MatchesTable.tsx - Таблица результатов

**Назначение**: Отображение результатов поиска STR совпадений с расширенными возможностями фильтрации и интерактивности.

#### Ключевые особенности

##### Система выделения маркеров
```typescript
// Расчет редкости маркера в реальном времени
const calculateMarkerRarity = (
  matches: STRMatch[], 
  marker: string, 
  value: string,
  queryValue: string
) => {
  const values = matches
    .map(match => match.profile.markers[marker])
    .filter(Boolean);
    
  const frequency = values.filter(v => v === value).length / values.length;
  
  if (frequency >= 0.33) return 'marker-rarity-common';
  if (frequency >= 0.20) return 'marker-rarity-uncommon';  
  if (frequency >= 0.12) return 'marker-rarity-rare';
  if (frequency >= 0.08) return 'marker-rarity-very-rare';
  return 'marker-rarity-extremely-rare';
};
```

##### Интерактивные элементы
```typescript
// Клик по гаплогруппе - показ всплывающего окна с путями
const HaplogroupInfoPopup: React.FC<{haplogroup: string}> = ({ haplogroup }) => {
  const [pathInfo, setPathInfo] = useState(null);
  
  useEffect(() => {
    const fetchHaplogroupPath = async () => {
      try {
        const response = await fetch(`/api/haplogroup-path/${encodeURIComponent(haplogroup)}`);
        const data = await response.json();
        
        setPathInfo({
          ftdna: data.ftdnaDetails ? {
            path: data.ftdnaDetails.path.string,
            url: data.ftdnaDetails.url
          } : undefined,
          yfull: data.yfullDetails ? {
            path: data.yfullDetails.path.string,
            url: data.yfullDetails.url  
          } : undefined
        });
      } catch (error) {
        console.error('Error fetching haplogroup path:', error);
      }
    };
    
    fetchHaplogroupPath();
  }, [haplogroup]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Haplogroup: {haplogroup}</h3>
        
        {pathInfo?.ftdna && (
          <div className="mb-4">
            <strong>FTDNA Path:</strong>
            <p className="text-sm">{pathInfo.ftdna.path}</p>
            <a href={pathInfo.ftdna.url} target="_blank" className="text-blue-600">
              View on FTDNA
            </a>
          </div>
        )}
        
        {pathInfo?.yfull && (
          <div className="mb-4">
            <strong>YFull Path:</strong>
            <p className="text-sm">{pathInfo.yfull.path}</p>
            <a href={pathInfo.yfull.url} target="_blank" className="text-blue-600">
              View on YFull
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
```

##### Фильтрация по маркерам
```typescript
// Чекбоксы в заголовках маркеров для точной фильтрации
const MarkerHeader: React.FC<{marker: string, query: STRProfile}> = ({ marker, query }) => {
  const [isChecked, setIsChecked] = useState(false);
  
  const handleMarkerFilter = (checked: boolean) => {
    setIsChecked(checked);
    
    if (checked && query?.markers[marker]) {
      // Фильтровать только профили с таким же значением маркера
      const filteredMatches = matches.filter(match => 
        match.profile.markers[marker] === query.markers[marker]
      );
      onFilterByMarker(marker, filteredMatches);
    } else {
      onFilterByMarker(marker, null); // Убрать фильтр
    }
  };
  
  return (
    <th className="border p-2">
      <div className="flex flex-col items-center">
        <span className="text-xs font-semibold">{marker}</span>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => handleMarkerFilter(e.target.checked)}
          className="mt-1"
        />
      </div>
    </th>
  );
};
```

### 3. DataRepositories.tsx - Система загрузки данных

**Назначение**: Управление загрузкой STR данных из различных источников (Google Sheets, Excel, CSV, JSON chunks).

#### Поддерживаемые источники данных

##### Google Sheets интеграция
```typescript
const loadGoogleSheetData = async (repository: Repository) => {
  try {
    setLoadingRepo(repository.id);
    setProgress(0);
    
    const response = await fetch(repository.url);
    const csvText = await response.text();
    
    // Парсинг CSV с помощью PapaParse
    const profiles = await parseCSVData(csvText, (progress) => {
      setProgress(progress);
    });
    
    // Сохранение в IndexedDB
    await dbManager.init();
    const existingProfiles = await dbManager.getProfiles();
    const existingKits = new Set(existingProfiles.map(p => p.kitNumber));
    
    // Дедупликация по kitNumber
    const newProfiles = profiles.filter(p => !existingKits.has(p.kitNumber));
    
    await dbManager.saveProfiles([...existingProfiles, ...newProfiles]);
    setDatabase(await dbManager.getProfiles());
    
  } catch (error) {
    console.error('Error loading Google Sheet:', error);
    setError(`Failed to load ${repository.name}: ${error.message}`);
  } finally {
    setLoadingRepo(null);
    setProgress(0);
  }
};
```

##### Chunked JSON для больших баз
```typescript
const loadChunkedJson = async (repository: Repository) => {
  const { url, chunks = 1 } = repository;
  const profiles: STRProfile[] = [];
  const batchSize = 4; // Загружаем по 4 чанка за раз
  
  for (let batch = 0; batch < chunks; batch += batchSize) {
    const endBatch = Math.min(batch + batchSize, chunks);
    const batchPromises = [];
    
    for (let i = batch; i < endBatch; i++) {
      const promise = fetch(`${url}${i}.json`)
        .then(response => response.json())
        .then(chunkData => chunkData.map((profile: any) => ({
          ...profile,
          kitNumber: profile.kitNumber || `AUTO_${i}_${Date.now()}_${Math.random().toString(36).slice(2)}`
        })))
        .catch(error => {
          console.error(`Error loading chunk ${i}:`, error);
          return [];
        });
      
      batchPromises.push(promise);
    }
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(chunkProfiles => {
      profiles.push(...chunkProfiles);
    });
    
    // Обновление прогресса
    const progress = Math.round(((endBatch) / chunks) * 100);
    setProgress(progress);
  }
  
  return profiles;
};
```

##### File Upload обработка
```typescript
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  setLoading(true);
  setProgress(0);
  setError(null);
  
  try {
    await dbManager.init();
    let profiles: STRProfile[];
    
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      profiles = await parseCSVData(text);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Excel обработка через SheetJS
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const csvData = XLSX.utils.sheet_to_csv(firstSheet);
      profiles = await parseCSVData(csvData);
    } else {
      throw new Error('Unsupported file format');
    }
    
    // Объединение с существующими данными
    const existingProfiles = await dbManager.getProfiles();
    const existingKits = new Set(existingProfiles.map(p => p.kitNumber));
    const newProfiles = profiles.filter(p => !existingKits.has(p.kitNumber));
    
    await dbManager.saveProfiles([...existingProfiles, ...newProfiles]);
    setDatabase(await dbManager.getProfiles());
    
  } catch (error: any) {
    console.error('Error processing file:', error);
    setError(t('database.processingError', { message: error.message }));
  } finally {
    setLoading(false);
    setProgress(0);
  }
};
```

### 4. useSTRMatcher.ts - Основная бизнес-логика

**Назначение**: Центральный хук, инкапсулирующий всю бизнес-логику работы с STR данными.

#### Web Worker интеграция
```typescript
const handleFindMatches = useCallback(async () => {
  if (!query || !database.length) return;
  
  setLoading(true);
  setError(null);
  
  try {
    // Инициализация Web Worker из отдельного файла
    const worker = new Worker(
      new URL('../../workers/comparison.worker.ts', import.meta.url)
    );
    
    worker.postMessage({
      type: 'START_COMPARISON',
      payload: {
        queryProfile: query,
        databaseProfiles: database,
        settings: {
           maxDistance,
           minMarkers: markerCount,
           // ...
        }
      }
    });

    worker.onmessage = (event) => {
      const { type, payload } = event.data;
      
      if (type === 'COMPARISON_COMPLETE') {
         // Сохранение результатов и обновление UI
         setMatches(payload.matches);
         setLoading(false);
         worker.terminate();
      }
    };
    
  } catch (error) {
    console.error('Error in handleFindMatches:', error);
    setError('Failed to find matches');
    setLoading(false);
  }
}, [query, database, maxDistance]);
```

#### Интеграция с FTDNA Haplo (Batch API)
```typescript
// Фильтрация по субкладам с использованием Batch API
// (Решает проблему N+1 запросов)
const applyFilters = useCallback(async () => {
  if (!strMatches.length || !haplogroupFilter.active) return;
  
  setProcessingHaplo(true);
  
  try {
    // 1. Извлекаем уникальные гаплогруппы из результатов
    const uniqueHaplogroups = [...new Set(
      strMatches.map(m => m.profile.haplogroup).filter(Boolean)
    )];
    
    // 2. Отправляем ОДИН запрос на бэкенд
    const response = await fetch('/api/batch-check-subclades', {
      method: 'POST',
      body: JSON.stringify({
        haplogroups: uniqueHaplogroups,
        parent: haplogroupFilter.parentHaplogroup
      })
    });
    
    const { results } = await response.json(); // Map<haplogroup, boolean>
    
    // 3. Фильтруем результаты в памяти
    const filtered = strMatches.filter(match => {
      const h = match.profile.haplogroup;
      return !h || results[h] === true;
    });
    
    setFilteredMatches(filtered);
    
  } catch (error) {
    console.error('Batch filter error:', error);
  } finally {
    setProcessingHaplo(false);
  }
}, [strMatches, haplogroupFilter]);
```

#### IndexedDB интеграция
```typescript
// Автоматическое сохранение состояния
useEffect(() => {
  const saveState = async () => {
    try {
      await dbManager.init();
      await dbManager.saveSearchHistory(searchHistory);
      await dbManager.saveUserSettings({
        defaultMarkerCount: markerCount,
        defaultMaxDistance: maxDistance,
        defaultCalculationMode: calculationMode
      });
    } catch (error) {
      console.error('Error saving state:', error);
    }
  };
  
  const timeoutId = setTimeout(saveState, 1000); // Debounced save
  return () => clearTimeout(timeoutId);
}, [searchHistory, markerCount, maxDistance, calculationMode]);
```

## 🔧 Конфигурация и настройки

### Next.js Configuration
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API запросы к FTDNA Haplo сервису
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:9003/api/:path*',
      },
    ];
  },
  
  // Webpack конфигурация для Web Workers
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // Экспериментальные фичи
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
```

### Tailwind Configuration
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Кастомные анимации для UI
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        scaleIn: 'scaleIn 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      // Кастомные цвета для редкости маркеров
      colors: {
        'marker-common': '#fef3f2',
        'marker-uncommon': '#fed7cc',
        'marker-rare': '#fb9b7a',
        'marker-very-rare': '#f97316',
        'marker-extremely-rare': '#dc2626',
      }
    },
  },
  plugins: [],
};
```

### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6", "webworker"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

## 🚀 Производительность и оптимизации

### Web Workers для тяжелых вычислений
- Все расчеты STR дистанций выполняются в отдельном потоке
- Предотвращение блокировки UI при обработке больших данных
- Early termination для ограничения времени выполнения

### IndexedDB для локального хранения
- Кэширование загруженных STR профилей
- Сохранение истории поиска и пользовательских настроек
- Batch операции для улучшения производительности

### Lazy Loading и код-сплиттинг
- Dynamic imports для больших компонентов
- React.lazy для условно загружаемых компонентов
- Next.js автоматический код-сплиттинг

### Memo и оптимизация рендеринга
```typescript
// Мемоизация тяжелых компонентов
const MatchesTable = React.memo<MatchesTableProps>(({ matches, query, ...props }) => {
  // Мемоизация расчета стилей маркеров
  const memoizedMarkerStyles = useMemo(() => {
    return matches.reduce((acc, match) => {
      markers.forEach(marker => {
        const value = match.profile.markers[marker];
        if (value) {
          acc[`${match.profile.kitNumber}-${marker}`] = calculateMarkerRarity(
            matches, marker, value, query?.markers[marker]
          );
        }
      });
      return acc;
    }, {} as Record<string, string>);
  }, [matches, query]);
  
  return (
    // JSX с использованием мемоизированных стилей
  );
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для memo
  return (
    prevProps.matches.length === nextProps.matches.length &&
    prevProps.query?.kitNumber === nextProps.query?.kitNumber
  );
});
```

## 🔒 Безопасность

### Input Validation
```typescript
// Валидация STR профилей
const validateSTRProfile = (profile: Partial<STRProfile>): profile is STRProfile => {
  if (!profile.kitNumber || typeof profile.kitNumber !== 'string') {
    return false;
  }
  
  if (profile.kitNumber.length > 20) {
    return false;
  }
  
  // Проверка маркеров
  if (profile.markers) {
    for (const [marker, value] of Object.entries(profile.markers)) {
      if (!markers.includes(marker)) {
        console.warn(`Unknown marker: ${marker}`);
      }
      
      if (typeof value !== 'string' || !/^\d+(-\d+)*$/.test(value)) {
        console.warn(`Invalid marker value for ${marker}: ${value}`);
        return false;
      }
    }
  }
  
  return true;
};
```

### XSS Prevention
```typescript
// Sanitization пользовательского ввода
import DOMPurify from 'dompurify';

const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

// Использование в компонентах
const ProfileDisplay: React.FC<{profile: STRProfile}> = ({ profile }) => {
  return (
    <div>
      <span>{sanitizeInput(profile.name)}</span>
      <span>{sanitizeInput(profile.country)}</span>
    </div>
  );
};
```

## 🧪 Тестирование

### Unit Tests
```typescript
// __tests__/components/STRMatcher.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import STRMatcher from '../src/components/str-matcher/STRMatcher';

const mockStore = configureStore({
  reducer: {
    // Mock reducers
  }
});

describe('STRMatcher', () => {
  test('should load and display STR profiles', async () => {
    render(
      <Provider store={mockStore}>
        <STRMatcher />
      </Provider>
    );
    
    // Тест загрузки данных
    const loadButton = screen.getByText('Load AADNA Database');
    fireEvent.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/profiles loaded/i)).toBeInTheDocument();
    });
  });
  
  test('should find STR matches correctly', async () => {
    render(
      <Provider store={mockStore}>
        <STRMatcher />
      </Provider>
    );
    
    // Установка тестового профиля
    const kitInput = screen.getByLabelText('Kit Number');
    fireEvent.change(kitInput, { target: { value: 'TEST123' } });
    
    // Запуск поиска
    const findButton = screen.getByText('Find Matches');
    fireEvent.click(findButton);
    
    await waitFor(() => {
      expect(screen.getByText(/matches found/i)).toBeInTheDocument();
    });
  });
});
```

### Integration Tests
```typescript
// __tests__/integration/api-integration.test.tsx
describe('STR Matcher API Integration', () => {
  test('should filter by haplogroup subclades', async () => {
    // Mock API response
    fetchMock.mockResponseOnce(JSON.stringify({ isSubclade: true }));
    
    const result = await checkSubclade('R-L23', 'R-M269');
    
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/check-subclade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        haplogroup: 'R-L23',
        parentHaplogroup: 'R-M269'
      })
    });
  });
});
```

---

*Документация STR Matcher обновлена: Август 2025*