# 📂 Ключевые файлы и их функциональность

## Обзор

В этом документе описаны все важные файлы системы DNA-utils-universal, их назначение, логика работы и взаимодействие друг с другом.

## 🎯 str-matcher - Основное приложение

### Главные компоненты приложения

#### `src/app/page.tsx` - Точка входа
```typescript
"use client";
import dynamic from 'next/dynamic';

const STRMatcher = dynamic(() => import('@/components/str-matcher/STRMatcher'), {
  ssr: false, // Отключение SSR для тяжелых вычислений
  loading: () => <LoadingSpinner />
});
```

**Функции**:
- Динамическая загрузка главного компонента
- Отключение SSR для повышения производительности
- Отображение загрузчика во время инициализации

#### `src/components/str-matcher/STRMatcher.tsx` - Главный компонент
**Размер**: 655 строк  
**Назначение**: Координирует все операции по сравнению STR маркеров

**Ключевые функции**:
```typescript
const STRMatcher: React.FC = () => {
  // 1. Управление состоянием
  const {
    database,           // База данных STR профилей
    totalProfiles,      // Общее количество профилей
    processingProgress, // Прогресс обработки
    query,             // Поисковый запрос
    matches,           // Найденные совпадения
    setDatabase,       // Установка базы данных
    mergeDatabase,     // Слияние баз данных
    updateQuery,       // Обновление запроса
    searchMatches      // Поиск совпадений
  } = useSTRMatcher();

  // 2. Обработка файлов
  const handleFileUpload = useCallback(async (files: FileList) => {
    const processed = await processFiles(files);
    mergeDatabase(processed);
  }, [mergeDatabase]);

  // 3. Поиск совпадений
  const handleSearch = useCallback(async () => {
    if (!query || database.length === 0) return;
    
    setIsSearching(true);
    try {
      await searchMatches();
    } finally {
      setIsSearching(false);
    }
  }, [query, database, searchMatches]);
};
```

**Основные секции UI**:
- `AppHeader` - Заголовок приложения
- `DatabaseInput` - Загрузка данных
- `STRMarkerGrid` - Ввод STR маркеров
- `SearchSettings` - Настройки поиска
- `HaplogroupFilter` - Фильтр гаплогрупп
- `MatchesTable` - Таблица результатов

#### `src/hooks/useSTRMatcher.ts` - Основная бизнес-логика
**Назначение**: Управление состоянием и операциями STR matching

**Ключевые функции**:
```typescript
export const useSTRMatcher = () => {
  // Состояние базы данных
  const [database, setDatabase] = useState<STRProfile[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [matches, setMatches] = useState<STRMatch[]>([]);

  // Поисковый запрос
  const [query, setQuery] = useState<STRProfile>({
    id: 'query',
    markers: {},
    source: 'Custom'
  });

  // Накопительная загрузка данных
  const mergeDatabase = useCallback((newData: STRProfile[]) => {
    setDatabase(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const uniqueNew = newData.filter(p => !existingIds.has(p.id));
      return [...prev, ...uniqueNew];
    });
  }, []);

  // Поиск совпадений с использованием Web Worker
  const searchMatches = useCallback(async () => {
    if (!database.length || !hasValidMarkers(query)) return;

    const worker = new Worker('/workers/str-worker.js');
    
    return new Promise<void>((resolve) => {
      worker.postMessage({
        type: 'SEARCH_MATCHES',
        database,
        query,
        settings: searchSettings
      });

      worker.onmessage = (e) => {
        const { matches, progress, completed } = e.data;
        
        if (progress !== undefined) {
          setProcessingProgress(progress);
        }
        
        if (completed) {
          setMatches(matches);
          worker.terminate();
          resolve();
        }
      };
    });
  }, [database, query, searchSettings]);
};
```

#### `src/utils/calculations.ts` - Алгоритмы вычислений
**Назначение**: Математические операции для анализа STR данных

**Ключевые алгоритмы**:

1. **Расчет генетической дистанции**:
```typescript
export const calculateGeneticDistance = (
  profile1: STRMarkers,
  profile2: STRMarkers,
  mode: CalculationMode = 'standard'
): number => {
  let totalDifference = 0;
  let comparedMarkers = 0;

  for (const marker of markers) {
    const val1 = profile1[marker];
    const val2 = profile2[marker];
    
    if (val1 !== null && val2 !== null && val1 !== undefined && val2 !== undefined) {
      const diff = Math.abs(val1 - val2);
      
      if (mode === 'weighted') {
        // Взвешенный расчет с учетом стабильности маркера
        const weight = getMarkerWeight(marker);
        totalDifference += diff * weight;
      } else {
        totalDifference += diff;
      }
      
      comparedMarkers++;
    }
  }

  return comparedMarkers > 0 ? totalDifference : Infinity;
};
```

2. **Поиск совпадений**:
```typescript
export const findMatches = (
  database: STRProfile[],
  query: STRProfile,
  maxDistance: number = 5,
  minMarkers: number = 20
): STRMatch[] => {
  const matches: STRMatch[] = [];

  for (const profile of database) {
    const { distance, matchedMarkers, differences } = calculateMatch(
      query.markers,
      profile.markers
    );

    if (distance <= maxDistance && matchedMarkers >= minMarkers) {
      matches.push({
        profile,
        distance,
        matchedMarkers,
        totalMarkers: markers.length,
        differences
      });
    }
  }

  // Сортировка по возрастанию дистанции
  return matches.sort((a, b) => a.distance - b.distance);
};
```

3. **Статистический анализ**:
```typescript
export const calculateStatistics = (matches: STRMatch[]): MatchStatistics => {
  if (matches.length === 0) {
    return { mean: 0, median: 0, std: 0, min: 0, max: 0 };
  }

  const distances = matches.map(m => m.distance);
  
  return {
    mean: distances.reduce((sum, d) => sum + d, 0) / distances.length,
    median: getMedian(distances),
    std: getStandardDeviation(distances),
    min: Math.min(...distances),
    max: Math.max(...distances)
  };
};
```

#### `src/utils/csvParser.ts` - Парсинг CSV файлов
**Назначение**: Обработка различных форматов CSV данных

**Основные функции**:
```typescript
export const parseCSV = async (file: File): Promise<STRProfile[]> => {
  const text = await file.text();
  
  // Определение разделителя
  const delimiter = detectDelimiter(text);
  
  // Парсинг с использованием Papa Parse
  const result = Papa.parse(text, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (header: string) => normalizeHeader(header),
    transform: (value: string, field: string) => transformValue(value, field)
  });

  if (result.errors.length > 0) {
    throw new CSVParseError(`CSV parsing failed: ${result.errors[0].message}`);
  }

  return result.data.map(row => convertRowToProfile(row));
};

const normalizeHeader = (header: string): string => {
  // Удаление лишних символов и нормализация
  return header
    .trim()
    .replace(/[^\w\d]/g, '')
    .toUpperCase();
};

const convertRowToProfile = (row: any): STRProfile => {
  const profile: STRProfile = {
    id: row.ID || row.KIT || generateId(),
    markers: {},
    source: 'Custom'
  };

  // Извлечение маркеров
  for (const [key, value] of Object.entries(row)) {
    if (isMarkerColumn(key) && isValidMarkerValue(value)) {
      const markerName = normalizeMarkerName(key);
      profile.markers[markerName] = Number(value);
    }
  }

  // Извлечение дополнительной информации
  if (row.HAPLOGROUP) profile.haplogroup = row.HAPLOGROUP;
  if (row.ANCESTRALNAMES) profile.ancestralNames = parseAncestralNames(row.ANCESTRALNAMES);

  return profile;
};
```

#### `src/workers/str-worker.ts` - Web Worker для вычислений
**Назначение**: Выполнение тяжелых вычислений в отдельном потоке

```typescript
// Web Worker для поиска STR совпадений
self.onmessage = function(e) {
  const { type, database, query, settings } = e.data;

  switch (type) {
    case 'SEARCH_MATCHES':
      searchMatches(database, query, settings);
      break;
    
    case 'CALCULATE_DISTANCES':
      calculateDistances(database, query);
      break;
  }
};

const searchMatches = (database: STRProfile[], query: STRProfile, settings: SearchSettings) => {
  const matches: STRMatch[] = [];
  const batchSize = 1000;
  
  for (let i = 0; i < database.length; i += batchSize) {
    const batch = database.slice(i, i + batchSize);
    
    for (const profile of batch) {
      const match = calculateMatch(query.markers, profile.markers);
      
      if (match.distance <= settings.maxDistance && 
          match.matchedMarkers >= settings.minMarkers) {
        matches.push({
          profile,
          ...match
        });
      }
    }

    // Отправка прогресса
    const progress = Math.min(100, ((i + batchSize) / database.length) * 100);
    self.postMessage({ progress });
  }

  // Сортировка и отправка результатов
  matches.sort((a, b) => a.distance - b.distance);
  self.postMessage({ matches, completed: true });
};
```

### Вспомогательные утилиты

#### `src/utils/constants.ts` - Константы и типы
```typescript
// Определение STR маркеров
export const markers = [
  'DYS393', 'DYS390', 'DYS19', 'DYS391', 'DYS385a', 'DYS385b',
  'DYS426', 'DYS388', 'DYS439', 'DYS389I', 'DYS392', 'DYS389II',
  // ... полный список 111 маркеров
] as const;

export type STRMarker = typeof markers[number];

export interface STRProfile {
  id: string;
  markers: Partial<Record<STRMarker, number>>;
  haplogroup?: string;
  source?: 'FTDNA' | 'YFull' | 'Custom';
  kitNumber?: string;
  ancestralNames?: string[];
}

export interface STRMatch {
  profile: STRProfile;
  distance: number;
  matchedMarkers: number;
  totalMarkers: number;
  differences: Record<string, {
    query: number;
    match: number;  
    difference: number;
  }>;
}
```

#### `src/utils/markerOperations.ts` - Операции с маркерами
```typescript
export const markerOperations = {
  // Валидация маркера
  isValidMarker: (name: string): boolean => {
    return markers.includes(name as STRMarker);
  },

  // Нормализация названия маркера
  normalizeMarkerName: (name: string): string => {
    return name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  },

  // Получение стабильности маркера
  getMarkerStability: (marker: STRMarker): number => {
    return markerStability[marker] || 1.0;
  },

  // Подсчет заполненных маркеров
  countFilledMarkers: (markers: STRMarkers): number => {
    return Object.values(markers).filter(v => v !== null && v !== undefined).length;
  },

  // Сравнение двух наборов маркеров
  compareMarkers: (markers1: STRMarkers, markers2: STRMarkers) => {
    const comparison = {
      common: 0,
      different: 0,
      onlyInFirst: 0,
      onlyInSecond: 0
    };

    const allMarkers = new Set([
      ...Object.keys(markers1),
      ...Object.keys(markers2)
    ]);

    for (const marker of allMarkers) {
      const val1 = markers1[marker];
      const val2 = markers2[marker];

      if (val1 !== null && val2 !== null) {
        if (val1 === val2) {
          comparison.common++;
        } else {
          comparison.different++;
        }
      } else if (val1 !== null) {
        comparison.onlyInFirst++;
      } else if (val2 !== null) {
        comparison.onlyInSecond++;
      }
    }

    return comparison;
  }
};
```

## 🌳 ftdna_haplo - Сервис гаплогрупп

### Backend (server/)

#### `server/server.js` - Главный сервер Express
**Размер**: 422 строки  
**Назначение**: HTTP API для работы с гаплогруппами

**Основная структура**:
```javascript
const express = require('express');
const { HaploTree } = require('../haplo_functions');
const { YFullAdapter } = require('../yfull_adapter');
const { SearchIntegrator } = require('../search_integration');

const app = express();

// Инициализация сервисов
let haplogroupService = null;

// Загрузка данных при старте
const initializeServices = () => {
  const ftdnaData = JSON.parse(fs.readFileSync('data/get.json', 'utf8'));
  const yfullData = JSON.parse(fs.readFileSync('data/ytree.json', 'utf8'));
  
  const haploTree = new HaploTree(ftdnaData);
  const yfullAdapter = new YFullAdapter(yfullData);
  const searchIntegrator = new SearchIntegrator(haploTree, yfullAdapter);
  
  haplogroupService = new HaplogroupService(haploTree, yfullAdapter, searchIntegrator);
};

// API маршруты
app.get('/api/haplogroups', async (req, res) => {
  try {
    const haplogroups = await haplogroupService.getAllHaplogroups();
    res.json(haplogroups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/haplogroups/search', async (req, res) => {
  try {
    const { query, filters } = req.body;
    const results = await haplogroupService.searchHaplogroups(query, filters);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### `haplo_functions.js` - Основные функции гаплогрупп
**Назначение**: Работа с деревом гаплогрупп и филогенетическим анализом

**Ключевые классы**:
```javascript
class HaploTree {
  constructor(data) {
    this.data = data;
    this.tree = this.buildTree();
    this.index = this.buildIndex();
  }

  // Построение дерева из данных
  buildTree() {
    const tree = new Map();
    
    for (const [haplogroup, data] of Object.entries(this.data)) {
      const node = {
        name: haplogroup,
        snps: data.snps || [],
        parent: data.parent,
        children: [],
        level: this.calculateLevel(haplogroup)
      };
      
      tree.set(haplogroup, node);
    }

    // Связывание родителей и детей
    for (const [name, node] of tree) {
      if (node.parent && tree.has(node.parent)) {
        tree.get(node.parent).children.push(name);
      }
    }

    return tree;
  }

  // Поиск гаплогруппы
  findHaplogroup(name) {
    return this.tree.get(name) || null;
  }

  // Получение пути к корню
  getPathToRoot(haplogroup) {
    const path = [];
    let current = haplogroup;

    while (current) {
      path.unshift(current);
      const node = this.tree.get(current);
      current = node ? node.parent : null;
    }

    return path;
  }

  // Получение всех потомков
  getDescendants(haplogroup) {
    const descendants = new Set();
    
    const addDescendants = (name) => {
      const node = this.tree.get(name);
      if (node) {
        for (const child of node.children) {
          descendants.add(child);
          addDescendants(child);
        }
      }
    };

    addDescendants(haplogroup);
    return Array.from(descendants);
  }

  // Поиск общего предка
  findCommonAncestor(haplogroup1, haplogroup2) {
    const path1 = this.getPathToRoot(haplogroup1);
    const path2 = this.getPathToRoot(haplogroup2);

    let commonAncestor = null;
    const minLength = Math.min(path1.length, path2.length);

    for (let i = 0; i < minLength; i++) {
      if (path1[i] === path2[i]) {
        commonAncestor = path1[i];
      } else {
        break;
      }
    }

    return commonAncestor;
  }
}
```

#### `yfull_adapter.js` - Адаптер для YFull данных
**Назначение**: Интеграция данных из YFull в единую систему

```javascript
class YFullAdapter {
  constructor(yfullData) {
    this.data = yfullData;
    this.normalizedData = this.normalizeData();
  }

  // Нормализация данных YFull к общему формату
  normalizeData() {
    const normalized = new Map();

    for (const [id, entry] of Object.entries(this.data)) {
      normalized.set(id, {
        id,
        haplogroup: entry.haplogroup,
        snps: entry.snps || [],
        age: entry.age,
        samples: entry.samples || [],
        parent: entry.parent,
        children: entry.children || []
      });
    }

    return normalized;
  }

  // Поиск по YFull данным
  search(criteria) {
    const results = [];

    for (const [id, entry] of this.normalizedData) {
      if (this.matchesCriteria(entry, criteria)) {
        results.push(entry);
      }
    }

    return results;
  }

  // Проверка соответствия критериям
  matchesCriteria(entry, criteria) {
    if (criteria.haplogroup && !entry.haplogroup.includes(criteria.haplogroup)) {
      return false;
    }

    if (criteria.snp && !entry.snps.includes(criteria.snp)) {
      return false;
    }

    if (criteria.minAge && entry.age < criteria.minAge) {
      return false;
    }

    return true;
  }

  // Получение данных по гаплогруппе
  getHaplogroupData(haplogroup) {
    const results = [];

    for (const [id, entry] of this.normalizedData) {
      if (entry.haplogroup === haplogroup || 
          entry.haplogroup.startsWith(haplogroup + '.') ||
          entry.haplogroup.startsWith(haplogroup + '-')) {
        results.push(entry);
      }
    }

    return results;
  }
}
```

#### `search_integration.js` - Интеграция поиска
**Назначение**: Объединение поиска по FTDNA и YFull данным

```javascript
class SearchIntegrator {
  constructor(haploTree, yfullAdapter) {
    this.haploTree = haploTree;
    this.yfullAdapter = yfullAdapter;
  }

  // Интегрированный поиск
  async integratedSearch(query) {
    const results = {
      ftdna: [],
      yfull: [],
      combined: []
    };

    // Поиск в FTDNA данных
    if (query.haplogroup) {
      const ftdnaNode = this.haploTree.findHaplogroup(query.haplogroup);
      if (ftdnaNode) {
        results.ftdna.push(ftdnaNode);
        
        // Добавление потомков
        const descendants = this.haploTree.getDescendants(query.haplogroup);
        results.ftdna.push(...descendants.map(h => this.haploTree.findHaplogroup(h)));
      }
    }

    // Поиск в YFull данных
    const yfullResults = this.yfullAdapter.search(query);
    results.yfull = yfullResults;

    // Объединение результатов
    results.combined = this.mergeResults(results.ftdna, results.yfull);

    return results;
  }

  // Объединение результатов из разных источников
  mergeResults(ftdnaResults, yfullResults) {
    const merged = new Map();

    // Добавление FTDNA результатов
    for (const result of ftdnaResults) {
      if (result) {
        merged.set(result.name, {
          haplogroup: result.name,
          sources: ['FTDNA'],
          ftdnaData: result,
          yfullData: null
        });
      }
    }

    // Добавление YFull результатов
    for (const result of yfullResults) {
      const key = result.haplogroup;
      
      if (merged.has(key)) {
        merged.get(key).sources.push('YFull');
        merged.get(key).yfullData = result;
      } else {
        merged.set(key, {
          haplogroup: result.haplogroup,
          sources: ['YFull'],
          ftdnaData: null,
          yfullData: result
        });
      }
    }

    return Array.from(merged.values());
  }

  // Поиск связанных гаплогрупп
  findRelatedHaplogroups(haplogroup) {
    const related = {
      ancestors: [],
      descendants: [],
      siblings: []
    };

    // Получение предков
    const pathToRoot = this.haploTree.getPathToRoot(haplogroup);
    related.ancestors = pathToRoot.slice(0, -1); // Исключаем саму гаплогруппу

    // Получение потомков
    related.descendants = this.haploTree.getDescendants(haplogroup);

    // Получение siblings (общий родитель)
    const node = this.haploTree.findHaplogroup(haplogroup);
    if (node && node.parent) {
      const parent = this.haploTree.findHaplogroup(node.parent);
      if (parent) {
        related.siblings = parent.children.filter(child => child !== haplogroup);
      }
    }

    return related;
  }
}
```

### Frontend (client/)

#### `client/src/App.jsx` - Главный React компонент
```jsx
import React, { useState, useEffect } from 'react';
import HaplogroupSearch from './components/HaplogroupSearch';
import HaplogroupTree from './components/HaplogroupTree';
import SearchResults from './components/SearchResults';
import { apiClient } from './services/api';

const App = () => {
  const [haplogroups, setHaplogroups] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedHaplogroup, setSelectedHaplogroup] = useState(null);
  const [loading, setLoading] = useState(false);

  // Загрузка списка гаплогрупп при инициализации
  useEffect(() => {
    const loadHaplogroups = async () => {
      try {
        const data = await apiClient.getHaplogroups();
        setHaplogroups(data);
      } catch (error) {
        console.error('Failed to load haplogroups:', error);
      }
    };

    loadHaplogroups();
  }, []);

  // Обработка поиска
  const handleSearch = async (query) => {
    setLoading(true);
    try {
      const results = await apiClient.searchHaplogroups(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Haplogroup Analysis</h1>
      </header>
      
      <main>
        <HaplogroupSearch onSearch={handleSearch} loading={loading} />
        
        {searchResults && (
          <SearchResults 
            results={searchResults}
            onSelectHaplogroup={setSelectedHaplogroup}
          />
        )}
        
        {selectedHaplogroup && (
          <HaplogroupTree haplogroup={selectedHaplogroup} />
        )}
      </main>
    </div>
  );
};

export default App;
```

## 🤖 ystr_predictor - ML сервис

#### `app.py` - FastAPI приложение
**Размер**: 99 строк  
**Назначение**: HTTP API для предсказания гаплогрупп с помощью машинного обучения

```python
from fastapi import FastAPI, UploadFile, HTTPException
from models.tree_predictor import TreeHaploPredictor
import pandas as pd

app = FastAPI()

# Инициализация модели
predictor = TreeHaploPredictor()

@app.post("/api/predict")
async def predict(data: Markers):
    """Предсказание гаплогруппы по STR маркерам"""
    if not predictor.is_trained:
        raise HTTPException(status_code=400, detail="Model not trained")

    try:
        # Преобразование в DataFrame
        df = pd.DataFrame([data.markers])
        
        # Предсказание
        predictions = predictor.predict(df)
        
        return {
            "predicted_haplogroup": predictions[0].get("haplogroup"),
            "confidence": predictions[0].get("confidence", 0.0),
            "alternatives": predictions[0].get("alternatives", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/train")
async def train_model(file: UploadFile):
    """Обучение модели на новых данных"""
    try:
        # Загрузка данных
        df = pd.read_csv(file.file)
        
        # Обучение
        metrics = predictor.train(df)
        
        # Сохранение модели
        predictor.save_model()
        
        return {
            "status": "success",
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/model/status")
async def get_model_status():
    """Получение статуса модели"""
    return {
        "is_trained": predictor.is_trained,
        "model_info": predictor.get_model_info(),
        "last_training": predictor.last_training_date
    }
```

#### `models/tree_predictor.py` - ML модель
**Назначение**: Предсказание гаплогрупп на основе STR маркеров

```python
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
from pathlib import Path

class TreeHaploPredictor:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=20,
            random_state=42
        )
        self.feature_columns = None
        self.is_trained = False
        self.last_training_date = None
        
    def prepare_data(self, df):
        """Подготовка данных для обучения"""
        # Выделение STR маркеров
        str_columns = [col for col in df.columns if col.startswith('DYS')]
        
        # Заполнение пропущенных значений медианой
        X = df[str_columns].fillna(df[str_columns].median())
        
        # Целевая переменная
        y = df['haplogroup'] if 'haplogroup' in df.columns else None
        
        self.feature_columns = str_columns
        return X, y
    
    def train(self, df):
        """Обучение модели"""
        X, y = self.prepare_data(df)
        
        if y is None:
            raise ValueError("No haplogroup column found")
        
        # Разделение на train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Обучение
        self.model.fit(X_train, y_train)
        
        # Оценка качества
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        self.is_trained = True
        self.last_training_date = pd.Timestamp.now()
        
        return {
            "accuracy": accuracy,
            "test_samples": len(X_test),
            "feature_count": len(self.feature_columns),
            "classification_report": classification_report(y_test, y_pred, output_dict=True)
        }
    
    def predict(self, df):
        """Предсказание гаплогрупп"""
        if not self.is_trained:
            raise ValueError("Model not trained")
        
        # Подготовка данных
        X = df[self.feature_columns].fillna(0)
        
        # Предсказание с вероятностями
        predictions = self.model.predict(X)
        probabilities = self.model.predict_proba(X)
        
        results = []
        for i, pred in enumerate(predictions):
            # Получение топ-3 альтернатив
            prob_indices = np.argsort(probabilities[i])[::-1][:3]
            alternatives = [
                {
                    "haplogroup": self.model.classes_[idx],
                    "confidence": probabilities[i][idx]
                }
                for idx in prob_indices[1:]  # Исключаем основное предсказание
            ]
            
            results.append({
                "haplogroup": pred,
                "confidence": np.max(probabilities[i]),
                "alternatives": alternatives
            })
        
        return results
    
    def save_model(self, path="models/saved/haplogroup_predictor.pkl"):
        """Сохранение модели"""
        model_data = {
            "model": self.model,
            "feature_columns": self.feature_columns,
            "is_trained": self.is_trained,
            "last_training_date": self.last_training_date
        }
        
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model_data, path)
    
    def load_model(self, path="models/saved/haplogroup_predictor.pkl"):
        """Загрузка модели"""
        try:
            model_data = joblib.load(path)
            self.model = model_data["model"]
            self.feature_columns = model_data["feature_columns"]
            self.is_trained = model_data["is_trained"]
            self.last_training_date = model_data["last_training_date"]
            return True
        except FileNotFoundError:
            return False
    
    def get_model_info(self):
        """Информация о модели"""
        if not self.is_trained:
            return None
            
        return {
            "feature_count": len(self.feature_columns) if self.feature_columns else 0,
            "classes_count": len(self.model.classes_),
            "estimators_count": self.model.n_estimators,
            "max_depth": self.model.max_depth
        }
```

## 🔧 Конфигурационные файлы

### `ecosystem.config.js` - PM2 конфигурация
**Назначение**: Управление процессами в продакшене

```javascript
module.exports = {
  apps: [
    {
      name: "ftdna-haplo-app",
      cwd: "./ftdna_haplo", 
      script: "./server/server.js",
      env_production: {
        NODE_ENV: "production",
        PORT: 9003,
        API_PATH: "/api"
      },
      // Автоперезапуск при сбоях
      restart_delay: 4000,
      max_restarts: 3,
      
      // Ресурсы
      max_memory_restart: "500M",
      
      // Логирование
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log"
    },
    {
      name: "str-matcher-app",
      cwd: "./str-matcher",
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 9002",
      env_production: {
        NODE_ENV: "production",
        HAPLO_API_URL: "http://localhost:9003"
      },
      // Настройки производительности
      instances: 1, // Один экземпляр для Next.js
      exec_mode: "fork"
    }
  ]
};
```

### Корневой `package.json` - Оркестрация проекта
```json
{
  "name": "dna-utils-universal",
  "scripts": {
    "dev": "concurrently \"npm:dev:api\" \"npm:dev:client\"",
    "dev:api": "npm run dev --prefix ftdna_haplo/server",
    "dev:client": "npm run dev --prefix str-matcher", 
    "build": "npm run build:str-matcher && npm run build:haplo-client",
    "start": "cross-env NODE_ENV=production pm2 start ecosystem.config.js",
    "stop": "pm2 delete all"
  },
  "dependencies": {
    "cross-env": "^7.0.3",  // Кроссплатформенные переменные окружения
    "dotenv": "^16.0.3",    // Загрузка .env файлов
    "pm2": "^5.3.0"         // Process manager
  },
  "devDependencies": {
    "concurrently": "^9.2.0" // Параллельный запуск команд
  }
}
```

## 🔄 Взаимодействие компонентов

### Схема взаимодействий

```
┌─────────────────┐    HTTP/9002    ┌─────────────────┐
│   str-matcher   │◄────────────────┤   User Browser  │
│   (Next.js)     │────────────────►│                 │
└─────────────────┘                 └─────────────────┘
         │
         │ Proxy /api/* → localhost:9003
         ▼
┌─────────────────┐    HTTP/9003    ┌─────────────────┐
│ ftdna_haplo     │◄────────────────┤  API Requests   │
│ (Express API)   │────────────────►│                 │
└─────────────────┘                 └─────────────────┘
         │
         │ HTTP/5000 (ML predictions)
         ▼
┌─────────────────┐
│ ystr_predictor  │
│ (FastAPI/ML)    │
└─────────────────┘
```

### Типичный сценарий работы

1. **Загрузка данных**:
   ```
   Пользователь → str-matcher → csvParser.ts → STRMatcher.tsx
   ```

2. **Поиск совпадений**:
   ```
   STRMatcher → useSTRMatcher → str-worker.ts → calculations.ts
   ```

3. **Фильтрация по гаплогруппам**:
   ```
   HaplogroupFilter → /api/haplogroups → ftdna_haplo → HaploTree
   ```

4. **Предсказание ML**:
   ```
   STRMatcher → /api/predict → ystr_predictor → TreeHaploPredictor
   ```

5. **Комбинированный поиск**:
   ```
   SearchIntegrator → HaploTree + YFullAdapter → интегрированные результаты
   ```

Эта документация охватывает все ключевые файлы и их взаимодействие в системе DNA-utils-universal.
