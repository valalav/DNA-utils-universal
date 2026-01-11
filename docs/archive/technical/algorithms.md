# 🧮 Алгоритмы расчетов DNA-utils-universal

## 📋 Обзор

Система DNA-utils-universal использует сложные алгоритмы для расчета генетических дистанций, обработки Y-STR маркеров и анализа филогенетических связей. Данный документ подробно описывает все алгоритмы, используемые в системе.

## 🔢 Алгоритмы расчета генетических дистанций

### 1. Simple Distance (Простая дистанция)

Самый базовый алгоритм, подсчитывающий количество несовпадающих маркеров.

```javascript
/**
 * Простой расчет дистанции между двумя наборами маркеров
 * @param {Object} userMarkers - Маркеры пользователя
 * @param {Object} targetMarkers - Маркеры цели
 * @returns {Object} Результат с дистанцией и деталями
 */
function calculateSimpleDistance(userMarkers, targetMarkers) {
  let matches = 0;
  let mismatches = 0;
  let totalCompared = 0;
  const details = [];
  
  // Получаем общие маркеры
  const commonMarkers = getCommonMarkers(userMarkers, targetMarkers);
  
  for (const marker of commonMarkers) {
    const userValue = userMarkers[marker];
    const targetValue = targetMarkers[marker];
    
    totalCompared++;
    
    if (isPalindromicMarker(marker)) {
      // Специальная обработка для палиндромных маркеров
      const distance = calculatePalindromicDistance(userValue, targetValue);
      if (distance === 0) {
        matches++;
      } else {
        mismatches += distance;
      }
      
      details.push({
        marker,
        userValue,
        targetValue, 
        distance,
        type: 'palindromic'
      });
    } else {
      // Обычные маркеры
      const userNum = parseInt(userValue);
      const targetNum = parseInt(targetValue);
      const distance = Math.abs(userNum - targetNum);
      
      if (distance === 0) {
        matches++;
      } else {
        mismatches += distance;
      }
      
      details.push({
        marker,
        userValue,
        targetValue,
        distance,
        type: 'standard'
      });
    }
  }
  
  return {
    distance: mismatches,
    matches,
    mismatches,
    totalCompared,
    details
  };
}

/**
 * Обработка палиндромных маркеров (DYS385, DYS459, CDY)
 */
function calculatePalindromicDistance(value1, value2) {
  const values1 = parseMarkerValue(value1);
  const values2 = parseMarkerValue(value2); 
  
  if (values1.length !== values2.length) {
    // Разное количество аллелей - максимальная дистанция
    return Math.max(values1.length, values2.length);
  }
  
  // Сортируем значения для корректного сравнения
  values1.sort((a, b) => a - b);
  values2.sort((a, b) => a - b);
  
  let totalDistance = 0;
  for (let i = 0; i < values1.length; i++) {
    totalDistance += Math.abs(values1[i] - values2[i]);
  }
  
  return totalDistance;
}

function parseMarkerValue(value) {
  if (typeof value !== 'string') return [];
  return value.split('-').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
}

function isPalindromicMarker(marker) {
  const palindromicMarkers = ['DYS385', 'DYS459', 'CDYa', 'CDYb'];
  return palindromicMarkers.includes(marker);
}
```

### 2. Weighted Distance (Взвешенная дистанция)

Учитывает скорости мутации различных маркеров для более точного расчета.

```javascript
/**
 * Таблица скоростей мутации маркеров (мутаций на поколение)
 * Источник: Ballantyne et al. (2010), Burgarella & Navascués (2011)
 */
const MUTATION_RATES = {
  'DYS393': 0.00092,   // Медленный маркер
  'DYS390': 0.00201,
  'DYS19': 0.00111,
  'DYS391': 0.00262,
  'DYS385': 0.00203,   // Палиндромный
  'DYS426': 0.00033,   // Очень медленный
  'DYS388': 0.00041,
  'DYS439': 0.00403,   // Быстрый маркер
  'DYS389I': 0.00020,
  'DYS392': 0.00061,
  'DYS389II': 0.00282,
  'DYS458': 0.00306,
  'DYS459': 0.00241,   // Палиндромный
  'DYS455': 0.00021,
  'DYS454': 0.00023,
  'DYS447': 0.00089,
  'DYS437': 0.00012,   // Самый медленный
  'DYS448': 0.00191
};

/**
 * Взвешенный расчет дистанции с учетом скоростей мутации
 */
function calculateWeightedDistance(userMarkers, targetMarkers, options = {}) {
  const mutationRates = { ...MUTATION_RATES, ...options.customRates };
  let weightedDistance = 0;
  let totalWeight = 0;
  let matches = 0;
  let mismatches = 0;
  const details = [];
  
  const commonMarkers = getCommonMarkers(userMarkers, targetMarkers);
  
  for (const marker of commonMarkers) {
    const userValue = userMarkers[marker];
    const targetValue = targetMarkers[marker];
    const mutationRate = mutationRates[marker] || 0.002; // Средняя скорость по умолчанию
    
    // Вес маркера обратно пропорционален скорости мутации
    const weight = 1 / (mutationRate * 1000 + 0.1); // +0.1 для избежания деления на 0
    
    let distance;
    if (isPalindromicMarker(marker)) {
      distance = calculatePalindromicDistance(userValue, targetValue);
    } else {
      distance = Math.abs(parseInt(userValue) - parseInt(targetValue));
    }
    
    if (distance === 0) {
      matches++;
    } else {
      mismatches++;
    }
    
    weightedDistance += distance * weight;
    totalWeight += weight;
    
    details.push({
      marker,
      userValue,
      targetValue,
      distance,
      weight,
      mutationRate,
      contribution: distance * weight
    });
  }
  
  // Нормализуем по общему весу
  const normalizedDistance = totalWeight > 0 ? weightedDistance / totalWeight : 0;
  
  return {
    distance: normalizedDistance,
    rawDistance: weightedDistance,
    totalWeight,
    matches,
    mismatches,
    totalCompared: commonMarkers.length,
    details
  };
}
```

### 3. Genetic Distance (Генетическая дистанция)

Наиболее сложный алгоритм, учитывающий вероятностные модели мутаций.

```javascript
/**
 * Генетическая дистанция на основе вероятностной модели
 * Использует модель Stepwise Mutation Model (SMM)
 */
function calculateGeneticDistance(userMarkers, targetMarkers, options = {}) {
  const generations = options.generations || 25; // Поколений на 100 лет
  const details = [];
  let totalLogLikelihood = 0;
  let totalMarkers = 0;
  
  const commonMarkers = getCommonMarkers(userMarkers, targetMarkers);
  
  for (const marker of commonMarkers) {
    const userValue = userMarkers[marker];
    const targetValue = targetMarkers[marker];
    const mutationRate = MUTATION_RATES[marker] || 0.002;
    
    let distance;
    let logLikelihood;
    
    if (isPalindromicMarker(marker)) {
      const result = calculatePalindromicGeneticDistance(
        userValue, 
        targetValue, 
        mutationRate, 
        generations
      );
      distance = result.distance;
      logLikelihood = result.logLikelihood;
    } else {
      const result = calculateStandardGeneticDistance(
        userValue,
        targetValue, 
        mutationRate,
        generations
      );
      distance = result.distance;
      logLikelihood = result.logLikelihood;
    }
    
    totalLogLikelihood += logLikelihood;
    totalMarkers++;
    
    details.push({
      marker,
      userValue,
      targetValue,
      distance,
      logLikelihood,
      mutationRate,
      expectedMutations: mutationRate * generations
    });
  }
  
  // Генетическая дистанция = -логарифм совокупной вероятности
  const geneticDistance = -totalLogLikelihood / totalMarkers;
  
  return {
    distance: geneticDistance,
    logLikelihood: totalLogLikelihood,
    totalMarkers,
    averageLogLikelihood: totalLogLikelihood / totalMarkers,
    details
  };
}

/**
 * Стандартная генетическая дистанция для одиночных маркеров
 */
function calculateStandardGeneticDistance(value1, value2, mutationRate, generations) {
  const diff = Math.abs(parseInt(value1) - parseInt(value2));
  
  if (diff === 0) {
    // Полное совпадение
    return {
      distance: 0,
      logLikelihood: Math.log(1 - mutationRate * generations)
    };
  }
  
  // Вероятность k мутаций за t поколений (модель Пуассона)
  const lambda = mutationRate * generations;
  const probability = poissonProbability(diff, lambda);
  
  return {
    distance: diff,
    logLikelihood: Math.log(probability)
  };
}

/**
 * Генетическая дистанция для палиндромных маркеров
 */
function calculatePalindromicGeneticDistance(value1, value2, mutationRate, generations) {
  const values1 = parseMarkerValue(value1).sort((a, b) => a - b);
  const values2 = parseMarkerValue(value2).sort((a, b) => a - b);
  
  if (values1.length !== values2.length) {
    // Разное количество аллелей - редкое событие
    return {
      distance: Math.max(values1.length, values2.length),
      logLikelihood: Math.log(0.001) // Очень низкая вероятность
    };
  }
  
  let totalDistance = 0;
  let totalLogLikelihood = 0;
  
  for (let i = 0; i < values1.length; i++) {
    const result = calculateStandardGeneticDistance(
      values1[i].toString(),
      values2[i].toString(),
      mutationRate,
      generations
    );
    totalDistance += result.distance;
    totalLogLikelihood += result.logLikelihood;
  }
  
  return {
    distance: totalDistance,
    logLikelihood: totalLogLikelihood
  };
}

/**
 * Функция плотности вероятности распределения Пуассона
 */
function poissonProbability(k, lambda) {
  if (lambda === 0) return k === 0 ? 1 : 0;
  
  // P(X = k) = (λ^k * e^(-λ)) / k!
  const logProb = k * Math.log(lambda) - lambda - logFactorial(k);
  return Math.exp(logProb);
}

function logFactorial(n) {
  if (n <= 1) return 0;
  let result = 0;
  for (let i = 2; i <= n; i++) {
    result += Math.log(i);
  }
  return result;
}
```

## 🌳 Алгоритмы работы с гаплогруппами

### 1. Проверка субкладов (isSubclade)

Определяет, является ли одна гаплогруппа субкладом другой.

```javascript
/**
 * Проверка является ли childHaplogroup субкладом parentHaplogroup
 * @param {string} parentHaplogroup - Родительская гаплогруппа
 * @param {string} childHaplogroup - Проверяемая дочерняя гаплогруппа
 * @param {Object} haplogroupTree - Дерево гаплогрупп
 * @returns {Object} Результат проверки
 */
function isSubclade(parentHaplogroup, childHaplogroup, haplogroupTree) {
  // Нормализация названий гаплогрупп
  const normalizedParent = normalizeHaplogroup(parentHaplogroup);
  const normalizedChild = normalizeHaplogroup(childHaplogroup);
  
  if (normalizedParent === normalizedChild) {
    return {
      isSubclade: true,
      confidence: 1.0,
      method: 'direct',
      path: [normalizedParent]
    };
  }
  
  // Поиск в дереве с помощью BFS
  const path = findPathInTree(normalizedParent, normalizedChild, haplogroupTree);
  
  if (path) {
    return {
      isSubclade: true,
      confidence: calculatePathConfidence(path),
      method: 'tree_traversal',
      path: path
    };
  }
  
  // Попытка с помощью строкового анализа
  const stringResult = inferFromNaming(normalizedParent, normalizedChild);
  
  return stringResult;
}

/**
 * Поиск пути в дереве гаплогрупп
 */
function findPathInTree(parent, child, tree) {
  const visited = new Set();
  const queue = [[parent]]; // Очередь путей
  
  while (queue.length > 0) {
    const currentPath = queue.shift();
    const currentNode = currentPath[currentPath.length - 1];
    
    if (currentNode === child) {
      return currentPath;
    }
    
    if (visited.has(currentNode)) continue;
    visited.add(currentNode);
    
    const node = tree[currentNode];
    if (node && node.children) {
      for (const childNode of node.children) {
        if (!visited.has(childNode)) {
          queue.push([...currentPath, childNode]);
        }
      }
    }
  }
  
  return null; // Путь не найден
}

/**
 * Вывод связи на основе номенклатуры
 */
function inferFromNaming(parent, child) {
  // Базовая логика для стандартной номенклатуры
  // R-M269 -> R-L21 -> R-L21*
  
  const parentParts = parent.split('-');
  const childParts = child.split('-');
  
  if (parentParts.length < 2 || childParts.length < 2) {
    return { isSubclade: false, confidence: 0, method: 'naming_analysis' };
  }
  
  // Должны иметь одинаковый корень (R, I, E, etc.)
  if (parentParts[0] !== childParts[0]) {
    return { isSubclade: false, confidence: 0, method: 'naming_analysis' };
  }
  
  // Анализ SNP иерархии
  const parentSNP = parentParts[1];
  const childSNP = childParts[1];
  
  // Простая эвристика: более длинные SNP обычно более подробные
  if (childSNP.length > parentSNP.length && childSNP.startsWith(parentSNP)) {
    return {
      isSubclade: true,
      confidence: 0.7, // Умеренная уверенность
      method: 'naming_analysis',
      path: [parent, child]
    };
  }
  
  return { isSubclade: false, confidence: 0, method: 'naming_analysis' };
}

/**
 * Расчет уверенности в найденном пути
 */
function calculatePathConfidence(path) {
  if (path.length <= 2) return 1.0;
  if (path.length <= 4) return 0.9;
  if (path.length <= 6) return 0.8;
  return 0.7; // Длинные пути менее надежны
}

/**
 * Нормализация названий гаплогрупп
 */
function normalizeHaplogroup(haplogroup) {
  if (!haplogroup) return '';
  
  let normalized = haplogroup.trim().toUpperCase();
  
  // Обработка коротких SNP
  const shortSnpMap = {
    'Y2': 'R-Y2',
    'Y3': 'R-Y3',
    'Y4': 'R-Y4', 
    'Y6': 'R-Y6',
    'Y7': 'R-Y7'
  };
  
  if (shortSnpMap[normalized]) {
    normalized = shortSnpMap[normalized];
  }
  
  // Удаляем звездочки и дополнительные символы
  normalized = normalized.replace(/\*+$/, '');
  
  return normalized;
}
```

### 2. Построение дерева гаплогрупп

Алгоритм для построения и индексации филогенетического дерева.

```javascript
/**
 * Построение дерева гаплогрупп из плоского списка
 */
class HaplogroupTreeBuilder {
  constructor(rawData) {
    this.rawData = rawData;
    this.tree = {};
    this.parentMap = new Map();
    this.childrenMap = new Map();
  }
  
  buildTree() {
    // Шаг 1: Создание узлов
    this.createNodes();
    
    // Шаг 2: Установка связей parent-child
    this.establishRelationships();
    
    // Шаг 3: Расчет уровней
    this.calculateLevels();
    
    // Шаг 4: Валидация дерева
    this.validateTree();
    
    return this.tree;
  }
  
  createNodes() {
    for (const entry of this.rawData) {
      const haplogroup = normalizeHaplogroup(entry.haplogroup);
      
      if (!this.tree[haplogroup]) {
        this.tree[haplogroup] = {
          name: haplogroup,
          parent: null,
          children: [],
          level: 0,
          snps: this.extractSNPs(entry),
          metadata: {
            source: entry.source || 'unknown',
            confidence: entry.confidence || 0.8,
            estimatedAge: entry.age,
            frequency: entry.frequency
          }
        };
      }
    }
  }
  
  establishRelationships() {
    const sortedHaplogroups = Object.keys(this.tree).sort((a, b) => {
      // Сортируем по специфичности (менее специфичные сначала)
      return this.getSpecificityLevel(a) - this.getSpecificityLevel(b);
    });
    
    for (const haplogroup of sortedHaplogroups) {
      const potentialParent = this.findParent(haplogroup, sortedHaplogroups);
      
      if (potentialParent) {
        this.tree[haplogroup].parent = potentialParent;
        this.tree[potentialParent].children.push(haplogroup);
        this.parentMap.set(haplogroup, potentialParent);
        
        if (!this.childrenMap.has(potentialParent)) {
          this.childrenMap.set(potentialParent, []);
        }
        this.childrenMap.get(potentialParent).push(haplogroup);
      }
    }
  }
  
  findParent(haplogroup, sortedHaplogroups) {
    const parts = haplogroup.split('-');
    if (parts.length < 2) return null;
    
    const root = parts[0]; // R, I, E, etc.
    const snp = parts[1];
    
    // Поиск наиболее близкого родителя
    let bestParent = null;
    let maxSimilarity = 0;
    
    for (const candidate of sortedHaplogroups) {
      if (candidate === haplogroup) continue;
      
      const candidateParts = candidate.split('-');
      if (candidateParts[0] !== root) continue;
      
      const similarity = this.calculateSimilarity(haplogroup, candidate);
      if (similarity > maxSimilarity && this.isValidParent(candidate, haplogroup)) {
        maxSimilarity = similarity;
        bestParent = candidate;
      }
    }
    
    return bestParent;
  }
  
  calculateSimilarity(child, parent) {
    // Простая мера схожести на основе длины общего префикса
    const childParts = child.split('-');
    const parentParts = parent.split('-');
    
    if (childParts[0] !== parentParts[0]) return 0;
    
    const childSNP = childParts[1] || '';
    const parentSNP = parentParts[1] || '';
    
    // Чем больше общий префикс, тем выше схожесть
    let commonLength = 0;
    for (let i = 0; i < Math.min(childSNP.length, parentSNP.length); i++) {
      if (childSNP[i] === parentSNP[i]) {
        commonLength++;
      } else {
        break;
      }
    }
    
    return commonLength / Math.max(childSNP.length, parentSNP.length);
  }
  
  isValidParent(parent, child) {
    const parentSpecificity = this.getSpecificityLevel(parent);
    const childSpecificity = this.getSpecificityLevel(child);
    
    // Родитель должен быть менее специфичным
    return parentSpecificity < childSpecificity;
  }
  
  getSpecificityLevel(haplogroup) {
    const parts = haplogroup.split('-');
    if (parts.length < 2) return 0;
    
    const snp = parts[1];
    // Длинные SNP считаются более специфичными
    return snp.length;
  }
  
  calculateLevels() {
    // Поиск корневых узлов
    const roots = Object.keys(this.tree).filter(h => 
      this.tree[h].parent === null
    );
    
    // BFS для расчета уровней
    const queue = roots.map(root => ({ haplogroup: root, level: 0 }));
    
    while (queue.length > 0) {
      const { haplogroup, level } = queue.shift();
      this.tree[haplogroup].level = level;
      
      for (const child of this.tree[haplogroup].children) {
        queue.push({ haplogroup: child, level: level + 1 });
      }
    }
  }
  
  validateTree() {
    // Проверка на циклы
    for (const haplogroup of Object.keys(this.tree)) {
      if (this.hasCycle(haplogroup)) {
        console.warn(`Обнаружен цикл в дереве: ${haplogroup}`);
      }
    }
    
    // Проверка на изолированные узлы
    const isolatedNodes = Object.keys(this.tree).filter(h => 
      this.tree[h].parent === null && this.tree[h].children.length === 0
    );
    
    if (isolatedNodes.length > 0) {
      console.warn(`Изолированные узлы: ${isolatedNodes.join(', ')}`);
    }
  }
  
  hasCycle(startNode) {
    const visited = new Set();
    const recursionStack = new Set();
    
    return this.hasCycleHelper(startNode, visited, recursionStack);
  }
  
  hasCycleHelper(node, visited, recursionStack) {
    if (recursionStack.has(node)) return true;
    if (visited.has(node)) return false;
    
    visited.add(node);
    recursionStack.add(node);
    
    for (const child of this.tree[node].children) {
      if (this.hasCycleHelper(child, visited, recursionStack)) {
        return true;
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  extractSNPs(entry) {
    // Извлечение SNP из названия гаплогруппы
    const parts = entry.haplogroup.split('-');
    if (parts.length < 2) return [];
    
    return [{
      name: parts[1],
      quality: 'confirmed',
      source: entry.source
    }];
  }
}
```

## 🔍 Алгоритмы поиска и фильтрации

### 1. Быстрый поиск совпадений

Оптимизированный алгоритм для поиска близких совпадений.

```javascript
/**
 * Быстрый поиск совпадений с использованием индексов
 */
class FastMatchFinder {
  constructor(database) {
    this.database = database;
    this.markerIndex = this.buildMarkerIndex();
    this.haplogroupIndex = this.buildHaplogroupIndex();
  }
  
  findMatches(userMarkers, options = {}) {
    const maxDistance = options.maxDistance || 10;
    const method = options.method || 'simple';
    const minMarkers = options.minMarkers || 5;
    
    // Шаг 1: Предварительная фильтрация по маркерам
    const candidates = this.prefilterCandidates(userMarkers, minMarkers);
    
    // Шаг 2: Расчет дистанций для кандидатов
    const matches = [];
    for (const candidate of candidates) {
      const result = this.calculateDistance(userMarkers, candidate, method);
      
      if (result.distance <= maxDistance) {
        matches.push({
          ...result,
          target: candidate
        });
      }
    }
    
    // Шаг 3: Сортировка по дистанции
    matches.sort((a, b) => a.distance - b.distance);
    
    return matches;
  }
  
  prefilterCandidates(userMarkers, minMarkers) {
    const userMarkerNames = Object.keys(userMarkers);
    const candidates = [];
    
    // Используем индекс для быстрого поиска
    for (const entry of this.database) {
      const entryMarkerNames = Object.keys(entry.markers);
      const commonMarkers = userMarkerNames.filter(m => 
        entryMarkerNames.includes(m)
      );
      
      if (commonMarkers.length >= minMarkers) {
        candidates.push(entry);
      }
    }
    
    return candidates;
  }
  
  buildMarkerIndex() {
    const index = new Map();
    
    for (const entry of this.database) {
      for (const [marker, value] of Object.entries(entry.markers)) {
        if (!index.has(marker)) {
          index.set(marker, new Map());
        }
        
        const markerIndex = index.get(marker);
        if (!markerIndex.has(value)) {
          markerIndex.set(value, []);
        }
        
        markerIndex.get(value).push(entry);
      }
    }
    
    return index;
  }
  
  buildHaplogroupIndex() {
    const index = new Map();
    
    for (const entry of this.database) {
      const haplogroup = entry.haplogroup;
      if (!index.has(haplogroup)) {
        index.set(haplogroup, []);
      }
      index.get(haplogroup).push(entry);
    }
    
    return index;
  }
}
```

## ⚡ Web Worker для параллельных вычислений

### Distance Calculator Worker

```javascript
// str-matcher/src/workers/distance-calculator.worker.js

/**
 * Web Worker для параллельного расчета дистанций
 */
self.addEventListener('message', async (event) => {
  const { userMarkers, candidates, method, options, batchId } = event.data;
  
  try {
    const results = [];
    const batchSize = 100; // Обрабатываем по 100 записей за раз
    
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      const batchResults = processBatch(userMarkers, batch, method, options);
      results.push(...batchResults);
      
      // Отправляем промежуточный прогресс
      self.postMessage({
        type: 'progress',
        batchId,
        processed: i + batch.length,
        total: candidates.length,
        results: batchResults
      });
      
      // Даем браузеру передохнуть
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    self.postMessage({
      type: 'complete',
      batchId,
      results
    });
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      batchId,
      error: error.message
    });
  }
});

function processBatch(userMarkers, candidates, method, options) {
  const results = [];
  
  for (const candidate of candidates) {
    let result;
    
    switch (method) {
      case 'simple':
        result = calculateSimpleDistance(userMarkers, candidate.markers);
        break;
      case 'weighted':
        result = calculateWeightedDistance(userMarkers, candidate.markers, options);
        break;
      case 'genetic':
        result = calculateGeneticDistance(userMarkers, candidate.markers, options);
        break;
      default:
        result = calculateSimpleDistance(userMarkers, candidate.markers);
    }
    
    results.push({
      ...result,
      target: candidate
    });
  }
  
  return results;
}

// Импортируем алгоритмы расчета дистанций
// (код алгоритмов должен быть доступен в worker контексте)
```

## 📊 Алгоритмы статистического анализа

### 1. Анализ распределения маркеров

```javascript
/**
 * Статистический анализ распределения значений маркеров
 */
class MarkerStatistics {
  constructor(database) {
    this.database = database;
  }
  
  analyzeMarkerDistribution(markerName) {
    const values = this.extractMarkerValues(markerName);
    
    return {
      marker: markerName,
      totalSamples: values.length,
      uniqueValues: new Set(values).size,
      distribution: this.calculateDistribution(values),
      statistics: this.calculateBasicStats(values),
      histogram: this.createHistogram(values)
    };
  }
  
  extractMarkerValues(markerName) {
    const values = [];
    
    for (const entry of this.database) {
      if (entry.markers[markerName]) {
        const value = entry.markers[markerName];
        if (isPalindromicMarker(markerName)) {
          // Для палиндромных маркеров берем все значения
          values.push(...parseMarkerValue(value));
        } else {
          values.push(parseInt(value));
        }
      }
    }
    
    return values.filter(v => !isNaN(v));
  }
  
  calculateDistribution(values) {
    const distribution = new Map();
    
    for (const value of values) {
      distribution.set(value, (distribution.get(value) || 0) + 1);
    }
    
    // Конвертируем в проценты
    const total = values.length;
    const percentDistribution = new Map();
    
    for (const [value, count] of distribution) {
      percentDistribution.set(value, (count / total) * 100);
    }
    
    return Object.fromEntries(
      Array.from(percentDistribution).sort((a, b) => b[1] - a[1])
    );
  }
  
  calculateBasicStats(values) {
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    // Медиана
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    // Мода
    const frequency = new Map();
    for (const value of values) {
      frequency.set(value, (frequency.get(value) || 0) + 1);
    }
    const mode = Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
    
    // Стандартное отклонение
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: parseFloat(mean.toFixed(2)),
      median,
      mode,
      stdDev: parseFloat(stdDev.toFixed(2)),
      range: Math.max(...values) - Math.min(...values)
    };
  }
  
  createHistogram(values, bins = 10) {
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;
    
    const histogram = Array(bins).fill(0);
    
    for (const value of values) {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[binIndex]++;
    }
    
    return histogram.map((count, index) => ({
      bin: index,
      rangeStart: min + index * binWidth,
      rangeEnd: min + (index + 1) * binWidth,
      count,
      percentage: (count / values.length) * 100
    }));
  }
}
```

## 🔗 Связанные документы

- [Структуры данных](database-structure.md)
- [Оптимизация производительности](performance.md)
- [Фильтрация гаплогрупп](haplogroup-filtering.md)
- [API справочник](../API_REFERENCE.md)
- [Архитектура системы](../ARCHITECTURE.md)
