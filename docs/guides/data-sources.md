# 📊 Работа с источниками данных DNA-utils-universal

## 📋 Обзор

DNA-utils-universal поддерживает множественные источники данных для анализа Y-STR маркеров и гаплогрупп. Система позволяет загружать данные из различных репозиториев, каждый со своими особенностями структуры и обработки.

## 🗄️ Поддерживаемые источники данных

### FTDNA (Family Tree DNA)
- **Формат**: JSON с вложенной структурой
- **Особенности**: Иерархические гаплогруппы, палиндромные маркеры
- **Размер**: ~50,000+ записей
- **Обновления**: Еженедельно

### YFull Tree
- **Формат**: JSON с филогенетическим деревом
- **Особенности**: Научная номенклатура SNP, временные рамки
- **Размер**: ~20,000+ записей  
- **Обновления**: Ежемесячно

### YFITTER
- **Формат**: CSV с маркерными профилями
- **Особенности**: Статистические данные, калибровочные наборы
- **Размер**: ~5,000+ записей
- **Обновления**: По запросу

### Custom Repositories (Пользовательские)
- **Формат**: JSON/CSV согласно схеме
- **Особенности**: Локальные данные, специализированные наборы
- **Размер**: Зависит от пользователя
- **Обновления**: Ручные

## 📁 Структура данных

### Стандартная схема записи

```json
{
  "name": "Unique_Sample_ID",
  "haplogroup": "R-M269", 
  "markers": {
    "DYS393": "13",
    "DYS390": "24",
    "DYS19": "14",
    "DYS391": "11",
    "DYS385": "11-14",  // Палиндромный маркер
    "DYS426": "12",
    "DYS388": "12",
    "DYS439": "12",
    "DYS389I": "13",
    "DYS392": "13",
    "DYS389II": "29",
    "DYS458": "17",
    "DYS459": "9-10",   // Палиндромный маркер
    "DYS455": "11",
    "DYS454": "11",
    "DYS447": "25",
    "DYS437": "15",
    "DYS448": "19"
  },
  "metadata": {
    "source": "FTDNA",
    "updated": "2024-01-15",
    "quality": "high",
    "region": "Europe"
  }
}
```

### Обязательные поля

| Поле | Тип | Описание | Пример |
|------|-----|----------|---------|
| `name` | string | Уникальный идентификатор | "FTDNA_12345" |
| `haplogroup` | string | Гаплогруппа Y-хромосомы | "R-M269" |
| `markers` | object | Y-STR маркеры | `{"DYS393": "13"}` |

### Опциональные поля

| Поле | Тип | Описание | Значение по умолчанию |
|------|-----|----------|----------------------|
| `metadata.source` | string | Источник данных | "unknown" |
| `metadata.quality` | string | Качество данных | "medium" |
| `metadata.region` | string | Географический регион | null |
| `metadata.updated` | string | Дата обновления | текущая дата |

## ⚙️ Конфигурация источников

### repositories.config.ts

```typescript
// str-matcher/src/config/repositories.config.ts
export interface Repository {
  name: string;
  description: string;
  url: string;
  type: 'json' | 'csv';
  enabled: boolean;
  priority: number;
  filters?: string[];
  transform?: (data: any) => any;
}

export const repositories: Repository[] = [
  {
    name: 'FTDNA',
    description: 'Family Tree DNA Y-STR Database',
    url: '/data/ftdna-ystr-haplotypes.json',
    type: 'json',
    enabled: true,
    priority: 1,
    filters: ['R-*', 'I-*', 'E-*'],  // Только основные гаплогруппы
    transform: transformFTDNAData
  },
  {
    name: 'YFull',
    description: 'YFull Phylogenetic Tree',
    url: '/data/yfull-samples.json', 
    type: 'json',
    enabled: true,
    priority: 2,
    transform: transformYFullData
  },
  {
    name: 'Custom',
    description: 'User Uploaded Data',
    url: null,  // Загружается через интерфейс
    type: 'csv',
    enabled: true,
    priority: 3
  }
];
```

### Функции трансформации данных

```typescript
// Трансформация FTDNA данных
function transformFTDNAData(rawData: any[]): ProcessedEntry[] {
  return rawData.map(entry => ({
    name: entry.kit_number || entry.id,
    haplogroup: normalizeHaplogroup(entry.haplogroup),
    markers: extractMarkers(entry.markers),
    metadata: {
      source: 'FTDNA',
      quality: entry.confidence || 'medium',
      region: entry.geographic_region,
      updated: entry.last_updated
    }
  }));
}

// Трансформация YFull данных  
function transformYFullData(rawData: any[]): ProcessedEntry[] {
  return rawData.map(entry => ({
    name: entry.yfull_id,
    haplogroup: entry.terminal_snp,
    markers: parseYFullMarkers(entry.str_markers),
    metadata: {
      source: 'YFull',
      quality: 'high',
      region: inferRegionFromId(entry.yfull_id),
      updated: entry.sample_date
    }
  }));
}
```

## 🔄 Загрузка и обновление данных

### Автоматическая загрузка

```javascript
// str-matcher/src/services/data-loader.service.js
class DataLoaderService {
  async loadRepositories() {
    const results = [];
    
    for (const repo of repositories.filter(r => r.enabled)) {
      try {
        console.log(`📥 Загрузка ${repo.name}...`);
        
        const data = await this.loadRepository(repo);
        const processed = repo.transform ? repo.transform(data) : data;
        const validated = this.validateData(processed);
        
        results.push({
          name: repo.name,
          data: validated,
          loadTime: Date.now(),
          count: validated.length
        });
        
        console.log(`✅ ${repo.name}: ${validated.length} записей`);
      } catch (error) {
        console.error(`❌ Ошибка загрузки ${repo.name}:`, error);
        // Продолжаем загрузку других источников
      }
    }
    
    return results;
  }
  
  async loadRepository(repo: Repository) {
    if (repo.type === 'json') {
      const response = await fetch(repo.url);
      return await response.json();
    } else if (repo.type === 'csv') {
      return await this.parseCSV(repo.url);
    }
  }
  
  validateData(data: any[]): ProcessedEntry[] {
    return data.filter(entry => {
      // Проверка обязательных полей
      if (!entry.name || !entry.haplogroup || !entry.markers) {
        console.warn('⚠️ Пропущена запись без обязательных полей:', entry);
        return false;
      }
      
      // Проверка формата маркеров
      if (typeof entry.markers !== 'object') {
        console.warn('⚠️ Неверный формат маркеров:', entry.name);
        return false;
      }
      
      return true;
    });
  }
}
```

### Обработка ошибок загрузки

```javascript
// Стратегии обработки ошибок
const loadingStrategies = {
  // Повторная попытка с экспоненциальной задержкой
  async retryWithBackoff(loadFunction, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await loadFunction();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`🔄 Попытка ${attempt}/${maxAttempts} неудачна, повтор через ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },
  
  // Загрузка из кэша при ошибке
  async loadWithFallback(repo) {
    try {
      return await this.loadRepository(repo);
    } catch (error) {
      console.warn(`⚠️ Загрузка ${repo.name} неудачна, используем кэш`);
      return this.loadFromCache(repo.name);
    }
  }
};
```

## 📤 Загрузка пользовательских данных

### Поддерживаемые форматы

#### CSV формат
```csv
name,haplogroup,DYS393,DYS390,DYS19,DYS391,DYS385,DYS426,DYS388
Sample001,R-M269,13,24,14,11,11-14,12,12
Sample002,I-M253,13,23,17,10,11-13,12,14
Sample003,E-M215,13,21,13,10,11-14,11,12
```

#### JSON формат
```json
[
  {
    "name": "Sample001",
    "haplogroup": "R-M269",
    "markers": {
      "DYS393": "13",
      "DYS390": "24",
      "DYS19": "14"
    }
  }
]
```

### Валидация пользовательских данных

```javascript
// Валидатор для загружаемых файлов
class UserDataValidator {
  validateFile(file, format) {
    const errors = [];
    const warnings = [];
    
    // Проверка размера файла
    if (file.size > 50 * 1024 * 1024) { // 50MB
      errors.push('Файл слишком большой (максимум 50MB)');
    }
    
    // Проверка формата
    if (format === 'csv' && !file.name.endsWith('.csv')) {
      warnings.push('Файл должен иметь расширение .csv');
    }
    
    return { errors, warnings };
  }
  
  validateData(data) {
    const issues = [];
    const validEntries = [];
    
    data.forEach((entry, index) => {
      const entryIssues = this.validateEntry(entry, index);
      if (entryIssues.errors.length === 0) {
        validEntries.push(entry);
      }
      if (entryIssues.errors.length > 0 || entryIssues.warnings.length > 0) {
        issues.push({ index, ...entryIssues });
      }
    });
    
    return { validEntries, issues };
  }
  
  validateEntry(entry, index) {
    const errors = [];
    const warnings = [];
    
    // Проверка обязательных полей
    if (!entry.name) errors.push('Отсутствует поле name');
    if (!entry.haplogroup) errors.push('Отсутствует поле haplogroup');
    if (!entry.markers || Object.keys(entry.markers).length === 0) {
      errors.push('Отсутствуют маркеры');
    }
    
    // Проверка формата гаплогруппы
    if (entry.haplogroup && !this.isValidHaplogroup(entry.haplogroup)) {
      warnings.push(`Нестандартный формат гаплогруппы: ${entry.haplogroup}`);
    }
    
    // Проверка маркеров
    if (entry.markers) {
      Object.entries(entry.markers).forEach(([marker, value]) => {
        if (!this.isValidMarkerValue(marker, value)) {
          warnings.push(`Нестандартное значение маркера ${marker}: ${value}`);
        }
      });
    }
    
    return { errors, warnings };
  }
  
  isValidHaplogroup(haplogroup) {
    // Проверка на соответствие стандартной номенклатуре
    return /^[A-Z]-[A-Z0-9]+/.test(haplogroup);
  }
  
  isValidMarkerValue(marker, value) {
    // Проверка значений маркеров
    if (typeof value !== 'string') return false;
    
    // Палиндромные маркеры могут содержать дефис
    const palindromic = ['DYS385', 'DYS459', 'CDYa', 'CDYb'];
    if (palindromic.includes(marker)) {
      return /^\d+(-\d+)*$/.test(value);
    }
    
    // Обычные маркеры - только числа
    return /^\d+$/.test(value);
  }
}
```

## 🔍 Фильтрация и поиск

### Настройка фильтров по источникам

```typescript
// Конфигурация фильтров для каждого источника
interface RepositoryFilters {
  haplogroups?: string[];      // Фильтр по гаплогруппам
  regions?: string[];          // Фильтр по регионам  
  quality?: string[];          // Фильтр по качеству данных
  markers?: string[];          // Обязательные маркеры
  dateRange?: [Date, Date];    // Диапазон дат обновления
}

const repositoryFilters: Record<string, RepositoryFilters> = {
  'FTDNA': {
    haplogroups: ['R-*', 'I-*', 'E-*', 'J-*', 'G-*'],
    quality: ['high', 'medium'],
    markers: ['DYS393', 'DYS390', 'DYS19']  // Минимум 3 маркера
  },
  'YFull': {
    haplogroups: ['*'],        // Все гаплогруппы
    quality: ['high'],         // Только высокое качество
    regions: ['Europe', 'Asia', 'Americas']
  }
};
```

### Динамические фильтры

```javascript
// Система динамической фильтрации
class DataFilter {
  applyFilters(data, filters) {
    return data.filter(entry => {
      // Фильтр по гаплогруппе
      if (filters.haplogroup && !this.matchesHaplogroup(entry.haplogroup, filters.haplogroup)) {
        return false;
      }
      
      // Фильтр по региону
      if (filters.region && entry.metadata?.region !== filters.region) {
        return false;
      }
      
      // Фильтр по качеству
      if (filters.quality && entry.metadata?.quality !== filters.quality) {
        return false;
      }
      
      // Фильтр по наличию маркеров
      if (filters.requiredMarkers) {
        const hasAllMarkers = filters.requiredMarkers.every(marker => 
          entry.markers.hasOwnProperty(marker)
        );
        if (!hasAllMarkers) return false;
      }
      
      return true;
    });
  }
  
  matchesHaplogroup(entryHaplogroup, filterPattern) {
    if (filterPattern === '*') return true;
    if (filterPattern.endsWith('*')) {
      const prefix = filterPattern.slice(0, -1);
      return entryHaplogroup.startsWith(prefix);
    }
    return entryHaplogroup === filterPattern;
  }
}
```

## 📊 Оптимизация производительности

### Кэширование данных

```javascript
// Стратегия кэширования для больших источников данных
class DataCache {
  constructor() {
    this.memoryCache = new Map();
    this.diskCache = new DiskCache('./cache');
  }
  
  async getRepository(repoName) {
    // 1. Проверяем memory cache
    if (this.memoryCache.has(repoName)) {
      console.log(`🚀 Загрузка ${repoName} из памяти`);
      return this.memoryCache.get(repoName);
    }
    
    // 2. Проверяем disk cache
    const cached = await this.diskCache.get(repoName);
    if (cached && this.isValidCache(cached)) {
      console.log(`💿 Загрузка ${repoName} с диска`);
      this.memoryCache.set(repoName, cached.data);
      return cached.data;
    }
    
    // 3. Загружаем заново
    console.log(`🌐 Загрузка ${repoName} из сети`);
    const data = await this.loadFromNetwork(repoName);
    
    // Сохраняем в кэши
    this.memoryCache.set(repoName, data);
    await this.diskCache.set(repoName, {
      data,
      timestamp: Date.now(),
      ttl: 24 * 60 * 60 * 1000 // 24 часа
    });
    
    return data;
  }
  
  isValidCache(cached) {
    return Date.now() - cached.timestamp < cached.ttl;
  }
}
```

### Lazy Loading

```javascript
// Ленивая загрузка больших источников данных
class LazyDataLoader {
  async loadRepositoryChunks(repoName, chunkSize = 1000) {
    const chunks = [];
    let offset = 0;
    
    while (true) {
      const chunk = await this.loadChunk(repoName, offset, chunkSize);
      if (chunk.length === 0) break;
      
      chunks.push(chunk);
      offset += chunkSize;
      
      // Даем браузеру передохнуть
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return chunks.flat();
  }
  
  async loadChunk(repoName, offset, limit) {
    const response = await fetch(`/api/repositories/${repoName}?offset=${offset}&limit=${limit}`);
    return await response.json();
  }
}
```

## 🔧 Обслуживание данных

### Регулярные задачи

```bash
#!/bin/bash
# data-maintenance.sh - Скрипт обслуживания данных

echo "🔧 Обслуживание данных DNA-utils-universal"

# Проверка целостности файлов
echo "📋 Проверка целостности данных..."
find ./str-matcher/public/data -name "*.json" -exec node scripts/validate-json.js {} \;

# Очистка старых кэшей
echo "🧹 Очистка старых кэшей..."
find ./cache -name "*.cache" -mtime +7 -delete

# Обновление индексов
echo "📊 Обновление поисковых индексов..."
node scripts/rebuild-search-index.js

# Статистика по источникам данных
echo "📈 Статистика источников данных:"
node scripts/data-statistics.js

echo "✅ Обслуживание завершено"
```

### Мониторинг качества данных

```javascript
// scripts/data-quality-monitor.js
class DataQualityMonitor {
  async checkDataQuality() {
    const repositories = await loadAllRepositories();
    const report = {};
    
    for (const repo of repositories) {
      report[repo.name] = {
        totalRecords: repo.data.length,
        duplicates: this.findDuplicates(repo.data),
        missingMarkers: this.findMissingMarkers(repo.data),
        invalidHaplogroups: this.findInvalidHaplogroups(repo.data),
        qualityScore: this.calculateQualityScore(repo.data)
      };
    }
    
    return report;
  }
  
  findDuplicates(data) {
    const seen = new Set();
    const duplicates = [];
    
    data.forEach(entry => {
      if (seen.has(entry.name)) {
        duplicates.push(entry.name);
      }
      seen.add(entry.name);
    });
    
    return duplicates;
  }
  
  calculateQualityScore(data) {
    let score = 100;
    
    // Штрафы за проблемы
    const duplicateRate = this.findDuplicates(data).length / data.length;
    score -= duplicateRate * 20;
    
    const missingMarkerRate = this.findMissingMarkers(data).length / data.length;
    score -= missingMarkerRate * 15;
    
    return Math.max(0, Math.round(score));
  }
}
```

## 🔗 API интеграция

### REST API для источников данных

```javascript
// ftdna_haplo/server/routes/repositories.js
app.get('/api/repositories', async (req, res) => {
  try {
    const repositories = await dataService.getAllRepositories();
    const summary = repositories.map(repo => ({
      name: repo.name,
      description: repo.description,
      count: repo.data.length,
      lastUpdated: repo.metadata.lastUpdated,
      quality: repo.metadata.qualityScore
    }));
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/repositories/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { offset = 0, limit = 1000, filters } = req.query;
    
    const repository = await dataService.getRepository(name);
    let data = repository.data;
    
    // Применить фильтры
    if (filters) {
      data = dataFilter.applyFilters(data, JSON.parse(filters));
    }
    
    // Пагинация
    const paginatedData = data.slice(offset, offset + limit);
    
    res.json({
      data: paginatedData,
      total: data.length,
      offset: parseInt(offset),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🔗 Связанные документы

- [Архитектура системы](../ARCHITECTURE.md)
- [Конфигурация системы](configuration.md)
- [API справочник](../API_REFERENCE.md)
- [Руководство разработчика](../DEVELOPMENT.md)
