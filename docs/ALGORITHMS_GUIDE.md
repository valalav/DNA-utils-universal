# 🧮 Алгоритмы и логика вычислений

## Обзор

В этом документе подробно описаны все алгоритмы, используемые в системе DNA-utils-universal для анализа STR маркеров, расчета генетических дистанций и работы с гаплогруппами.

## 🔢 Основные алгоритмы STR анализа

### 1. Расчет генетической дистанции

#### Стандартный алгоритм
```typescript
export const calculateGeneticDistance = (
  profile1: STRMarkers,
  profile2: STRMarkers,
  mode: CalculationMode = 'standard'
): number => {
  let totalDifference = 0;
  let comparedMarkers = 0;

  // Проход по всем известным маркерам
  for (const marker of markers) {
    const val1 = profile1[marker];
    const val2 = profile2[marker];
    
    // Учитываем только маркеры, присутствующие в обоих профилях
    if (val1 !== null && val2 !== null && 
        val1 !== undefined && val2 !== undefined) {
      
      const difference = Math.abs(val1 - val2);
      
      switch (mode) {
        case 'weighted':
          // Взвешенный расчет с учетом стабильности маркера
          const weight = getMarkerWeight(marker);
          totalDifference += difference * weight;
          break;
          
        case 'squared':
          // Квадратичная дистанция (больше штрафует крупные различия)
          totalDifference += Math.pow(difference, 2);
          break;
          
        case 'standard':
        default:
          // Простое суммирование абсолютных различий
          totalDifference += difference;
          break;
      }
      
      comparedMarkers++;
    }
  }

  // Если нет общих маркеров, дистанция бесконечна
  if (comparedMarkers === 0) {
    return Infinity;
  }

  // Возвращаем средний показатель или общую сумму в зависимости от режима
  return mode === 'normalized' 
    ? totalDifference / comparedMarkers 
    : totalDifference;
};
```

#### Взвешенный алгоритм с учетом стабильности маркеров
```typescript
// Коэффициенты стабильности маркеров (из научных исследований)
const markerStability: Record<STRMarker, number> = {
  'DYS393': 0.98,  // Очень стабильный
  'DYS390': 0.95,  // Стабильный
  'DYS19': 0.92,   // Умеренно стабильный
  'DYS391': 0.96,
  'DYS385a': 0.85, // Менее стабильный (палиндромный)
  'DYS385b': 0.85,
  // ... остальные маркеры
};

const getMarkerWeight = (marker: STRMarker): number => {
  const stability = markerStability[marker] || 0.90;
  
  // Чем стабильнее маркер, тем больше вес его различий
  // Нестабильные маркеры менее значимы для расчета дистанции
  return 1 / (1 - stability + 0.01); // +0.01 для избежания деления на ноль
};
```

### 2. Поиск STR совпадений

#### Основной алгоритм поиска
```typescript
export const findMatches = (
  database: STRProfile[],
  query: STRProfile,
  filters: SearchFilters
): STRMatch[] => {
  const {
    maxDistance = 5,
    minMarkers = 20,
    maxResults = 1000,
    haplogroupFilter,
    distanceMode = 'standard'
  } = filters;

  const matches: STRMatch[] = [];
  let processedCount = 0;

  for (const profile of database) {
    processedCount++;
    
    // Предварительная фильтрация по гаплогруппе
    if (haplogroupFilter && !matchesHaplogroupFilter(profile, haplogroupFilter)) {
      continue;
    }

    // Расчет совпадения
    const matchResult = calculateDetailedMatch(query.markers, profile.markers, distanceMode);
    
    // Проверка критериев
    if (matchResult.distance <= maxDistance && 
        matchResult.matchedMarkers >= minMarkers) {
      
      matches.push({
        profile,
        distance: matchResult.distance,
        matchedMarkers: matchResult.matchedMarkers,
        totalMarkers: markers.length,
        differences: matchResult.differences,
        score: calculateMatchScore(matchResult) // Комплексная оценка
      });
    }

    // Прерывание при достижении лимита (для производительности)
    if (matches.length >= maxResults * 2) {
      break;
    }
  }

  // Сортировка по качеству совпадения
  return matches
    .sort((a, b) => compareMatches(a, b))
    .slice(0, maxResults);
};
```

#### Детальный расчет совпадения
```typescript
interface MatchResult {
  distance: number;
  matchedMarkers: number;
  differences: Record<string, MarkerDifference>;
  coverage: number; // Процент покрытия маркеров
  quality: number;  // Качество совпадения
}

const calculateDetailedMatch = (
  queryMarkers: STRMarkers,
  profileMarkers: STRMarkers,
  mode: CalculationMode
): MatchResult => {
  const differences: Record<string, MarkerDifference> = {};
  let totalDifference = 0;
  let matchedMarkers = 0;
  let totalPossibleMarkers = 0;

  for (const marker of markers) {
    const queryValue = queryMarkers[marker];
    const profileValue = profileMarkers[marker];
    
    // Подсчет возможных для сравнения маркеров
    if (queryValue !== null && queryValue !== undefined) {
      totalPossibleMarkers++;
    }

    if (queryValue !== null && profileValue !== null &&
        queryValue !== undefined && profileValue !== undefined) {
      
      const difference = Math.abs(queryValue - profileValue);
      
      differences[marker] = {
        query: queryValue,
        match: profileValue,
        difference,
        weight: getMarkerWeight(marker),
        stability: markerStability[marker] || 0.90
      };

      // Расчет взвешенной дистанции
      const weightedDifference = mode === 'weighted' 
        ? difference * getMarkerWeight(marker)
        : difference;
      
      totalDifference += weightedDifference;
      matchedMarkers++;
    }
  }

  const coverage = totalPossibleMarkers > 0 
    ? matchedMarkers / totalPossibleMarkers 
    : 0;

  const quality = calculateMatchQuality(differences, coverage);

  return {
    distance: totalDifference,
    matchedMarkers,
    differences,
    coverage,
    quality
  };
};
```

#### Расчет качества совпадения
```typescript
const calculateMatchQuality = (
  differences: Record<string, MarkerDifference>,
  coverage: number
): number => {
  if (Object.keys(differences).length === 0) return 0;

  // Базовое качество основанное на покрытии
  let quality = coverage * 100;

  // Бонус за точные совпадения
  const exactMatches = Object.values(differences)
    .filter(diff => diff.difference === 0).length;
  quality += exactMatches * 2;

  // Штраф за большие различия
  const largeDifferences = Object.values(differences)
    .filter(diff => diff.difference > 2).length;
  quality -= largeDifferences * 5;

  // Бонус за стабильные маркеры
  const stableMatchScore = Object.values(differences)
    .reduce((sum, diff) => sum + (diff.stability * (diff.difference === 0 ? 1 : 0)), 0);
  quality += stableMatchScore * 3;

  return Math.max(0, Math.min(100, quality));
};
```

### 3. Пакетная обработка для больших датасетов

#### Web Worker для асинхронной обработки
```typescript
// workers/str-worker.ts
interface WorkerMessage {
  type: 'SEARCH_MATCHES' | 'CALCULATE_DISTANCES' | 'PROGRESS_UPDATE';
  database?: STRProfile[];
  query?: STRProfile;
  settings?: SearchSettings;
  batchSize?: number;
}

self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  const { type, database, query, settings, batchSize = 1000 } = e.data;

  switch (type) {
    case 'SEARCH_MATCHES':
      if (database && query && settings) {
        searchMatchesInBatches(database, query, settings, batchSize);
      }
      break;
      
    case 'CALCULATE_DISTANCES':
      if (database && query) {
        calculateDistancesInBatches(database, query, batchSize);
      }
      break;
  }
};

const searchMatchesInBatches = (
  database: STRProfile[],
  query: STRProfile,
  settings: SearchSettings,
  batchSize: number
) => {
  const allMatches: STRMatch[] = [];
  const totalBatches = Math.ceil(database.length / batchSize);
  
  for (let i = 0; i < database.length; i += batchSize) {
    const batch = database.slice(i, i + batchSize);
    const batchMatches = findMatches(batch, query, settings);
    
    allMatches.push(...batchMatches);
    
    // Отправка прогресса
    const progress = Math.min(100, ((i + batchSize) / database.length) * 100);
    self.postMessage({
      type: 'PROGRESS_UPDATE',
      progress,
      batchIndex: Math.floor(i / batchSize) + 1,
      totalBatches,
      foundMatches: allMatches.length
    });
    
    // Периодическая отправка промежуточных результатов
    if (allMatches.length > 0 && (i + batchSize) % (batchSize * 5) === 0) {
      self.postMessage({
        type: 'PARTIAL_RESULTS',
        matches: [...allMatches].sort((a, b) => a.distance - b.distance).slice(0, 100)
      });
    }
  }

  // Финальная сортировка и отправка
  const sortedMatches = allMatches
    .sort((a, b) => compareMatches(a, b))
    .slice(0, settings.maxResults || 1000);

  self.postMessage({
    type: 'SEARCH_COMPLETE',
    matches: sortedMatches,
    totalProcessed: database.length,
    totalFound: allMatches.length
  });
};
```

#### Оптимизированное сравнение
```typescript
const compareMatches = (a: STRMatch, b: STRMatch): number => {
  // Приоритет 1: Генетическая дистанция (меньше = лучше)
  if (a.distance !== b.distance) {
    return a.distance - b.distance;
  }
  
  // Приоритет 2: Количество совпадающих маркеров (больше = лучше)
  if (a.matchedMarkers !== b.matchedMarkers) {
    return b.matchedMarkers - a.matchedMarkers;
  }
  
  // Приоритет 3: Качество совпадения (больше = лучше)
  if (a.score !== undefined && b.score !== undefined) {
    return b.score - a.score;
  }
  
  // Приоритет 4: Покрытие маркеров
  const coverageA = a.matchedMarkers / a.totalMarkers;
  const coverageB = b.matchedMarkers / b.totalMarkers;
  return coverageB - coverageA;
};
```

## 🌳 Алгоритмы работы с гаплогруппами

### 1. Построение филогенетического дерева

#### Основной класс HaploTree
```javascript
class HaploTree {
  constructor(data) {
    this.data = data;
    this.tree = this.buildTree();
    this.index = this.buildSearchIndex();
    this.cache = new Map(); // Кэш для часто запрашиваемых данных
  }

  buildTree() {
    const tree = new Map();
    const orphans = []; // Узлы без родителей

    // Первый проход: создание узлов
    for (const [haplogroup, data] of Object.entries(this.data)) {
      const node = {
        name: haplogroup,
        snps: this.normalizeSNPs(data.snps || []),
        parent: data.parent,
        children: [],
        level: 0, // Будет вычислен позже
        samples: data.samples || [],
        equivalents: data.equivalents || []
      };
      
      tree.set(haplogroup, node);
    }

    // Второй проход: связывание родителей и детей
    for (const [name, node] of tree) {
      if (node.parent && tree.has(node.parent)) {
        const parent = tree.get(node.parent);
        parent.children.push(name);
        parent.children.sort(); // Сортировка для консистентности
      } else if (node.parent) {
        orphans.push(name);
      }
    }

    // Третий проход: вычисление уровней
    this.calculateLevels(tree);

    // Логирование статистики
    console.log(`Built tree with ${tree.size} nodes, ${orphans.length} orphans`);
    
    return tree;
  }

  calculateLevels(tree) {
    const visited = new Set();
    
    // Поиск корневых узлов (без родителей или с несуществующими родителями)
    const roots = [];
    for (const [name, node] of tree) {
      if (!node.parent || !tree.has(node.parent)) {
        roots.push(name);
      }
    }

    // BFS для вычисления уровней
    const queue = roots.map(root => ({ name: root, level: 0 }));
    
    while (queue.length > 0) {
      const { name, level } = queue.shift();
      
      if (visited.has(name)) continue;
      visited.add(name);
      
      const node = tree.get(name);
      if (node) {
        node.level = level;
        
        // Добавление детей в очередь
        for (const child of node.children) {
          if (!visited.has(child)) {
            queue.push({ name: child, level: level + 1 });
          }
        }
      }
    }
  }

  buildSearchIndex() {
    const index = {
      byLevel: new Map(),
      bySNP: new Map(),
      byPattern: new Map()
    };

    for (const [name, node] of this.tree) {
      // Индекс по уровням
      if (!index.byLevel.has(node.level)) {
        index.byLevel.set(node.level, []);
      }
      index.byLevel.get(node.level).push(name);

      // Индекс по SNP
      for (const snp of node.snps) {
        if (!index.bySNP.has(snp)) {
          index.bySNP.set(snp, []);
        }
        index.bySNP.get(snp).push(name);
      }

      // Индекс по паттернам имен
      const patterns = this.generateNamePatterns(name);
      for (const pattern of patterns) {
        if (!index.byPattern.has(pattern)) {
          index.byPattern.set(pattern, []);
        }
        index.byPattern.get(pattern).push(name);
      }
    }

    return index;
  }
}
```

### 2. Поиск и фильтрация гаплогрупп

#### Многокритериальный поиск
```javascript
searchHaplogroups(criteria) {
  const {
    name,
    snp,
    level,
    parent,
    minSamples,
    exactMatch = false
  } = criteria;

  let candidates = new Set();

  // Поиск по имени
  if (name) {
    const nameResults = exactMatch
      ? this.findExactByName(name)
      : this.findByNamePattern(name);
    nameResults.forEach(result => candidates.add(result));
  }

  // Поиск по SNP
  if (snp) {
    const snpResults = this.index.bySNP.get(snp) || [];
    if (candidates.size === 0) {
      snpResults.forEach(result => candidates.add(result));
    } else {
      // Пересечение с предыдущими результатами
      candidates = new Set(snpResults.filter(r => candidates.has(r)));
    }
  }

  // Фильтрация по уровню
  if (level !== undefined) {
    const filtered = Array.from(candidates).filter(name => {
      const node = this.tree.get(name);
      return node && node.level === level;
    });
    candidates = new Set(filtered);
  }

  // Фильтрация по родителю
  if (parent) {
    const filtered = Array.from(candidates).filter(name => {
      const node = this.tree.get(name);
      return node && node.parent === parent;
    });
    candidates = new Set(filtered);
  }

  // Фильтрация по количеству образцов
  if (minSamples) {
    const filtered = Array.from(candidates).filter(name => {
      const node = this.tree.get(name);
      return node && node.samples.length >= minSamples;
    });
    candidates = new Set(filtered);
  }

  // Возврат с дополнительной информацией
  return Array.from(candidates).map(name => ({
    name,
    node: this.tree.get(name),
    path: this.getPathToRoot(name),
    children: this.getDirectChildren(name),
    allDescendants: this.getAllDescendants(name)
  }));
}
```

#### Фильтрация по субкладам
```javascript
filterBySubclades(haplogroup, includeDescendants = true) {
  const cacheKey = `subclades_${haplogroup}_${includeDescendants}`;
  
  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey);
  }

  const results = new Set();
  
  // Добавление самой гаплогруппы
  if (this.tree.has(haplogroup)) {
    results.add(haplogroup);
  }

  if (includeDescendants) {
    // Поиск всех потомков
    const descendants = this.getAllDescendants(haplogroup);
    descendants.forEach(desc => results.add(desc));
  }

  // Поиск эквивалентных обозначений
  const node = this.tree.get(haplogroup);
  if (node && node.equivalents) {
    for (const equivalent of node.equivalents) {
      if (this.tree.has(equivalent)) {
        results.add(equivalent);
        
        if (includeDescendants) {
          const equivDescendants = this.getAllDescendants(equivalent);
          equivDescendants.forEach(desc => results.add(desc));
        }
      }
    }
  }

  const finalResults = Array.from(results);
  this.cache.set(cacheKey, finalResults);
  
  return finalResults;
}

getAllDescendants(haplogroup) {
  const descendants = new Set();
  const visited = new Set();
  const queue = [haplogroup];

  while (queue.length > 0) {
    const current = queue.shift();
    
    if (visited.has(current)) continue;
    visited.add(current);

    const node = this.tree.get(current);
    if (node) {
      for (const child of node.children) {
        descendants.add(child);
        queue.push(child);
      }
    }
  }

  return Array.from(descendants);
}
```

### 3. Анализ филогенетических отношений

#### Поиск общего предка
```javascript
findMostRecentCommonAncestor(haplogroups) {
  if (haplogroups.length === 0) return null;
  if (haplogroups.length === 1) return haplogroups[0];

  // Получение путей к корню для всех гаплогрупп
  const paths = haplogroups.map(h => this.getPathToRoot(h));
  
  // Поиск общего префикса
  let commonAncestor = null;
  const minLength = Math.min(...paths.map(p => p.length));

  for (let i = 0; i < minLength; i++) {
    const current = paths[0][i];
    
    if (paths.every(path => path[i] === current)) {
      commonAncestor = current;
    } else {
      break;
    }
  }

  return commonAncestor;
}

calculatePhylogeneticDistance(haplogroup1, haplogroup2) {
  const path1 = this.getPathToRoot(haplogroup1);
  const path2 = this.getPathToRoot(haplogroup2);
  
  const mrca = this.findMostRecentCommonAncestor([haplogroup1, haplogroup2]);
  if (!mrca) return Infinity;

  const mrcaIndex1 = path1.indexOf(mrca);
  const mrcaIndex2 = path2.indexOf(mrca);

  if (mrcaIndex1 === -1 || mrcaIndex2 === -1) return Infinity;

  // Дистанция = количество шагов от каждой гаплогруппы до MRCA
  const distance1 = path1.length - 1 - mrcaIndex1;
  const distance2 = path2.length - 1 - mrcaIndex2;

  return distance1 + distance2;
}
```

## 🤖 Машинное обучение для предсказания гаплогрупп

### 1. Подготовка данных

#### Предобработка STR маркеров
```python
class DataPreprocessor:
    def __init__(self):
        self.marker_stats = {}
        self.scaler = StandardScaler()
        self.imputer = SimpleImputer(strategy='median')
        
    def fit(self, df):
        """Обучение препроцессора на данных"""
        # Выделение STR колонок
        str_columns = [col for col in df.columns if col.startswith('DYS')]
        
        # Статистика маркеров
        for col in str_columns:
            self.marker_stats[col] = {
                'mean': df[col].mean(),
                'std': df[col].std(),
                'median': df[col].median(),
                'min': df[col].min(),
                'max': df[col].max(),
                'missing_rate': df[col].isnull().sum() / len(df)
            }
        
        # Обучение импутера и скейлера
        X = df[str_columns]
        X_imputed = self.imputer.fit_transform(X)
        self.scaler.fit(X_imputed)
        
        return self
    
    def transform(self, df):
        """Преобразование данных"""
        str_columns = [col for col in df.columns if col.startswith('DYS')]
        
        # Заполнение пропусков медианными значениями
        X = df[str_columns].copy()
        X_imputed = self.imputer.transform(X)
        
        # Нормализация
        X_scaled = self.scaler.transform(X_imputed)
        
        # Создание дополнительных признаков
        X_enhanced = self.create_features(X_scaled, str_columns)
        
        return X_enhanced
    
    def create_features(self, X, columns):
        """Создание дополнительных признаков"""
        df_features = pd.DataFrame(X, columns=columns)
        
        # Статистические признаки
        df_features['total_repeats'] = df_features.sum(axis=1)
        df_features['mean_repeats'] = df_features.mean(axis=1)
        df_features['std_repeats'] = df_features.std(axis=1)
        df_features['median_repeats'] = df_features.median(axis=1)
        
        # Признаки на основе групп маркеров
        slow_markers = ['DYS393', 'DYS390', 'DYS391']  # Медленные маркеры
        fast_markers = ['DYS385a', 'DYS385b', 'DYS448'] # Быстрые маркеры
        
        if all(col in df_features.columns for col in slow_markers):
            df_features['slow_markers_sum'] = df_features[slow_markers].sum(axis=1)
            
        if all(col in df_features.columns for col in fast_markers):
            df_features['fast_markers_sum'] = df_features[fast_markers].sum(axis=1)
        
        # Палиндромные маркеры
        palindromic = ['DYS385a', 'DYS385b']
        if all(col in df_features.columns for col in palindromic):
            df_features['palindromic_diff'] = abs(
                df_features['DYS385a'] - df_features['DYS385b']
            )
        
        return df_features
```

### 2. Модель предсказания

#### Ансамбль классификаторов
```python
class HaplogroupPredictor:
    def __init__(self):
        self.models = {
            'rf': RandomForestClassifier(
                n_estimators=200,
                max_depth=20,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            ),
            'xgb': XGBClassifier(
                n_estimators=100,
                max_depth=10,
                learning_rate=0.1,
                random_state=42
            ),
            'svm': SVC(
                kernel='rbf',
                probability=True,
                random_state=42
            )
        }
        
        self.meta_model = LogisticRegression(random_state=42)
        self.preprocessor = DataPreprocessor()
        self.label_encoder = LabelEncoder()
        self.is_trained = False
        
    def train(self, df):
        """Обучение ансамбля моделей"""
        # Подготовка данных
        self.preprocessor.fit(df)
        X = self.preprocessor.transform(df)
        y = self.label_encoder.fit_transform(df['haplogroup'])
        
        # Разделение данных
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Обучение базовых моделей
        base_predictions = np.zeros((len(X_train), len(self.models)))
        test_predictions = np.zeros((len(X_test), len(self.models)))
        
        for i, (name, model) in enumerate(self.models.items()):
            print(f"Training {name}...")
            
            # Cross-validation для мета-признаков
            cv_preds = cross_val_predict(
                model, X_train, y_train, cv=5, method='predict_proba'
            )
            base_predictions[:, i] = np.argmax(cv_preds, axis=1)
            
            # Обучение на полном тренировочном наборе
            model.fit(X_train, y_train)
            test_preds = model.predict(X_test)
            test_predictions[:, i] = test_preds
        
        # Обучение мета-модели
        self.meta_model.fit(base_predictions, y_train)
        
        # Оценка качества
        meta_predictions = self.meta_model.predict(test_predictions)
        accuracy = accuracy_score(y_test, meta_predictions)
        
        print(f"Ensemble accuracy: {accuracy:.4f}")
        
        self.is_trained = True
        return {
            'accuracy': accuracy,
            'classification_report': classification_report(
                y_test, meta_predictions, output_dict=True
            )
        }
    
    def predict(self, df):
        """Предсказание с использованием ансамбля"""
        if not self.is_trained:
            raise ValueError("Model not trained")
        
        X = self.preprocessor.transform(df)
        
        # Предсказания базовых моделей
        base_predictions = np.zeros((len(X), len(self.models)))
        base_probabilities = []
        
        for i, (name, model) in enumerate(self.models.items()):
            preds = model.predict(X)
            probs = model.predict_proba(X)
            
            base_predictions[:, i] = preds
            base_probabilities.append(probs)
        
        # Мета-предсказания
        meta_predictions = self.meta_model.predict(base_predictions)
        meta_probabilities = self.meta_model.predict_proba(base_predictions)
        
        # Формирование результатов
        results = []
        for i in range(len(X)):
            predicted_class = meta_predictions[i]
            confidence = np.max(meta_probabilities[i])
            predicted_haplogroup = self.label_encoder.inverse_transform([predicted_class])[0]
            
            # Альтернативные предсказания
            prob_indices = np.argsort(meta_probabilities[i])[::-1][:3]
            alternatives = [
                {
                    'haplogroup': self.label_encoder.inverse_transform([idx])[0],
                    'probability': meta_probabilities[i][idx]
                }
                for idx in prob_indices[1:]
            ]
            
            results.append({
                'haplogroup': predicted_haplogroup,
                'confidence': confidence,
                'alternatives': alternatives,
                'model_agreement': self.calculate_model_agreement(base_predictions[i])
            })
        
        return results
    
    def calculate_model_agreement(self, predictions):
        """Расчет согласованности между моделями"""
        unique_preds, counts = np.unique(predictions, return_counts=True)
        max_agreement = np.max(counts) / len(predictions)
        return max_agreement
```

### 3. Оценка качества и валидация

#### Кросс-валидация с учетом иерархии
```python
class HierarchicalValidator:
    def __init__(self, haplotree):
        self.haplotree = haplotree
        
    def hierarchical_accuracy(self, y_true, y_pred):
        """Иерархическая точность с учетом близости гаплогрупп"""
        exact_matches = 0
        close_matches = 0
        total = len(y_true)
        
        for true_haplo, pred_haplo in zip(y_true, y_pred):
            if true_haplo == pred_haplo:
                exact_matches += 1
                close_matches += 1
            else:
                # Проверка филогенетической близости
                distance = self.haplotree.calculate_distance(true_haplo, pred_haplo)
                if distance <= 2:  # Близкие в дереве
                    close_matches += 1
        
        return {
            'exact_accuracy': exact_matches / total,
            'close_accuracy': close_matches / total
        }
    
    def validate_with_hierarchy(self, model, X, y, cv_folds=5):
        """Валидация с учетом иерархической структуры"""
        kf = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
        
        exact_scores = []
        close_scores = []
        
        for train_idx, val_idx in kf.split(X, y):
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]
            
            model.fit(X_train, y_train)
            y_pred = model.predict(X_val)
            
            scores = self.hierarchical_accuracy(y_val, y_pred)
            exact_scores.append(scores['exact_accuracy'])
            close_scores.append(scores['close_accuracy'])
        
        return {
            'exact_accuracy_mean': np.mean(exact_scores),
            'exact_accuracy_std': np.std(exact_scores),
            'close_accuracy_mean': np.mean(close_scores),
            'close_accuracy_std': np.std(close_scores)
        }
```

## 📊 Статистические алгоритмы

### 1. Анализ популяций

#### Расчет статистик совпадений
```typescript
export const calculateMatchStatistics = (matches: STRMatch[]): MatchStatistics => {
  if (matches.length === 0) {
    return {
      count: 0,
      distances: { mean: 0, median: 0, std: 0, min: 0, max: 0 },
      markerCoverage: { mean: 0, median: 0, std: 0, min: 0, max: 0 },
      qualityScore: 0,
      haplogroupDistribution: {}
    };
  }

  const distances = matches.map(m => m.distance);
  const coverages = matches.map(m => m.matchedMarkers / m.totalMarkers);
  
  // Распределение по гаплогруппам
  const haplogroupCounts = matches.reduce((acc, match) => {
    const haplogroup = match.profile.haplogroup || 'Unknown';
    acc[haplogroup] = (acc[haplogroup] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    count: matches.length,
    distances: {
      mean: mean(distances),
      median: median(distances),
      std: standardDeviation(distances),
      min: Math.min(...distances),
      max: Math.max(...distances)
    },
    markerCoverage: {
      mean: mean(coverages),
      median: median(coverages),
      std: standardDeviation(coverages),
      min: Math.min(...coverages),
      max: Math.max(...coverages)
    },
    qualityScore: calculateOverallQuality(matches),
    haplogroupDistribution: haplogroupCounts
  };
};

const calculateOverallQuality = (matches: STRMatch[]): number => {
  if (matches.length === 0) return 0;

  // Взвешенная оценка качества
  const weights = {
    distance: 0.4,    // Чем меньше дистанция, тем лучше
    coverage: 0.3,    // Чем больше покрытие, тем лучше
    consistency: 0.3  // Консистентность результатов
  };

  const avgDistance = mean(matches.map(m => m.distance));
  const avgCoverage = mean(matches.map(m => m.matchedMarkers / m.totalMarkers));
  const consistency = calculateConsistency(matches);

  // Нормализация в диапазон 0-100
  const distanceScore = Math.max(0, 100 - avgDistance * 10);
  const coverageScore = avgCoverage * 100;
  const consistencyScore = consistency * 100;

  return (
    distanceScore * weights.distance +
    coverageScore * weights.coverage +
    consistencyScore * weights.consistency
  );
};

const calculateConsistency = (matches: STRMatch[]): number => {
  // Анализ консистентности гаплогрупп в топ-результатах
  const topMatches = matches.slice(0, Math.min(10, matches.length));
  const haplogroups = topMatches
    .map(m => m.profile.haplogroup)
    .filter(h => h && h !== 'Unknown');

  if (haplogroups.length === 0) return 0;

  const haplogroupCounts = haplogroups.reduce((acc, h) => {
    acc[h] = (acc[h] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxCount = Math.max(...Object.values(haplogroupCounts));
  return maxCount / haplogroups.length;
};
```

### 2. Алгоритмы кластеризации

#### K-means для группировки профилей
```typescript
interface ClusterResult {
  clusters: STRProfile[][];
  centroids: STRMarkers[];
  wcss: number; // Within-cluster sum of squares
}

export const clusterProfiles = (
  profiles: STRProfile[],
  k: number = 5,
  maxIterations: number = 100
): ClusterResult => {
  // Подготовка данных
  const dataMatrix = profiles.map(profile => 
    markers.map(marker => profile.markers[marker] || 0)
  );

  // Инициализация центроидов (k-means++)
  const centroids = initializeCentroids(dataMatrix, k);
  const clusters: number[] = new Array(profiles.length);
  
  let wcss = Infinity;
  let iteration = 0;

  while (iteration < maxIterations) {
    let newWcss = 0;
    let changed = false;

    // Назначение точек к ближайшим центроидам
    for (let i = 0; i < dataMatrix.length; i++) {
      const point = dataMatrix[i];
      let minDistance = Infinity;
      let nearestCentroid = 0;

      for (let j = 0; j < centroids.length; j++) {
        const distance = euclideanDistance(point, centroids[j]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCentroid = j;
        }
      }

      if (clusters[i] !== nearestCentroid) {
        clusters[i] = nearestCentroid;
        changed = true;
      }
      
      newWcss += minDistance * minDistance;
    }

    // Обновление центроидов
    for (let j = 0; j < k; j++) {
      const clusterPoints = dataMatrix.filter((_, i) => clusters[i] === j);
      if (clusterPoints.length > 0) {
        centroids[j] = calculateCentroid(clusterPoints);
      }
    }

    // Проверка сходимости
    if (!changed || Math.abs(wcss - newWcss) < 1e-6) {
      break;
    }

    wcss = newWcss;
    iteration++;
  }

  // Группировка профилей по кластерам
  const groupedClusters: STRProfile[][] = Array(k).fill(null).map(() => []);
  profiles.forEach((profile, i) => {
    groupedClusters[clusters[i]].push(profile);
  });

  // Преобразование центроидов обратно в формат маркеров
  const centroidMarkers = centroids.map(centroid => {
    const markerObj: STRMarkers = {};
    markers.forEach((marker, i) => {
      markerObj[marker] = Math.round(centroid[i]);
    });
    return markerObj;
  });

  return {
    clusters: groupedClusters,
    centroids: centroidMarkers,
    wcss
  };
};

const initializeCentroids = (data: number[][], k: number): number[][] => {
  const centroids: number[][] = [];
  const n = data.length;
  const dimensions = data[0].length;

  // Первый центроид - случайная точка
  centroids.push([...data[Math.floor(Math.random() * n)]]);

  // Остальные центроиды с помощью k-means++
  for (let c = 1; c < k; c++) {
    const distances = data.map(point => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = euclideanDistance(point, centroid);
        minDist = Math.min(minDist, dist);
      }
      return minDist * minDist;
    });

    const totalDist = distances.reduce((sum, d) => sum + d, 0);
    const random = Math.random() * totalDist;
    
    let cumulative = 0;
    for (let i = 0; i < n; i++) {
      cumulative += distances[i];
      if (cumulative >= random) {
        centroids.push([...data[i]]);
        break;
      }
    }
  }

  return centroids;
};
```

Эта документация покрывает все основные алгоритмы и вычислительную логику системы DNA-utils-universal, от базовых расчетов генетических дистанций до сложных методов машинного обучения.
