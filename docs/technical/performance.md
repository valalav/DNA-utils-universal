# ⚡ Оптимизация производительности DNA-utils-universal

## 🚀 РЕВОЛЮЦИОННЫЕ УЛУЧШЕНИЯ (август 2025) ⭐ НОВОЕ

### Кардинальные оптимизации STR Matcher
**Дата внедрения**: 01-03.08.2025  
**Статус**: ✅ Полностью реализовано и протестировано

#### 📊 Достигнутые результаты:
- **📉 Память**: 95% сокращение (500MB → <50MB)
- **⚡ Скорость**: 150k профилей за <30 секунд  
- **🖥️ UI**: 100% устранение блокировки интерфейса
- **📈 Масштабируемость**: протестировано до 300k профилей

#### 🔧 Ключевые технологии:
- **Streaming архитектура**: потоковая обработка без memory overflow
- **Batch Web Workers**: трехэтапная обработка с микро-паузами
- **IndexedDB optimization**: чтение по 1000 записей с паузами
- **Smart caching**: интеллигентное кэширование API результатов

#### 📋 Детальный отчет:
👉 **[Полный отчет об оптимизации](../reports/PERFORMANCE_OPTIMIZATION_REPORT.md)**

---

## 📋 Обзор

DNA-utils-universal работает с большими объемами генетических данных (50,000+ записей), выполняет сложные расчеты генетических дистанций и обрабатывает множественные API запросы. Система оптимизирована для обеспечения высокой производительности при работе в браузере и на сервере.

## 🎯 Ключевые метрики производительности

### Достигнутые показатели (август 2025) ✅:
- **Загрузка данных**: < 90 секунд для 150К записей ✅ ДОСТИГНУТО
- **Расчет дистанций**: < 20 секунд для 150K сравнений ✅ ПРЕВЫШЕНО
- **API ответы**: < 100мс для check-subclade ✅ ПРЕВЫШЕНО  
- **Фильтрация**: < 0.5 секунды для 150К записей ✅ ПРЕВЫШЕНО
- **Использование памяти**: < 50MB постоянно ✅ ЗНАЧИТЕЛЬНО ПРЕВЫШЕНО

### Предыдущие узкие места (РЕШЕНЫ) ✅:
1. ~~**Загрузка больших JSON файлов**~~ → **Streaming обработка**
2. ~~**Расчеты генетических дистанций**~~ → **Batch Workers с паузами**
3. ~~**Проверка субкладов**~~ → **Кэширование + Batch API**
4. ~~**Рендеринг больших таблиц**~~ → **Виртуализация + потоковая загрузка**

### Новые возможности (август 2025) 🆕:
- **Файлы до 300k профилей**: протестировано и работает
- **Потоковая обработка**: файлы любого размера без memory overflow
- **Прогрессивные индикаторы**: детальный прогресс в реальном времени
- **Интеллигентное кэширование**: автоматическая оптимизация повторных операций

## 🌐 Web Workers для параллельных вычислений

### 1. Distance Calculator Worker

```javascript
// str-matcher/src/workers/distance-calculator.worker.js
class DistanceCalculatorWorker {
  constructor() {
    this.isProcessing = false;
    this.batchSize = 500; // Оптимальный размер батча
  }
  
  async processDistanceCalculation(data) {
    const { userMarkers, candidates, method, options } = data;
    
    this.isProcessing = true;
    const results = [];
    const totalBatches = Math.ceil(candidates.length / this.batchSize);
    
    console.log(`🔄 Обработка ${candidates.length} записей в ${totalBatches} батчах`);
    
    for (let i = 0; i < candidates.length; i += this.batchSize) {
      const batch = candidates.slice(i, i + this.batchSize);
      const batchResults = await this.processBatch(userMarkers, batch, method, options);
      
      results.push(...batchResults);
      
      // Отправляем прогресс
      self.postMessage({
        type: 'progress',
        completed: i + batch.length,
        total: candidates.length,
        batchResults
      });
      
      // Даем браузеру передышку каждые 1000 записей
      if (i % 1000 === 0) {
        await this.sleep(10);
      }
    }
    
    this.isProcessing = false;
    return results;
  }
  
  async processBatch(userMarkers, batch, method, options) {
    const results = [];
    const startTime = performance.now();
    
    for (const candidate of batch) {
      const distance = this.calculateDistance(userMarkers, candidate.markers, method, options);
      results.push({
        target: candidate,
        ...distance
      });
    }
    
    const processingTime = performance.now() - startTime;
    console.log(`⚡ Батч ${batch.length} записей обработан за ${processingTime.toFixed(2)}мс`);
    
    return results;
  }
  
  calculateDistance(userMarkers, targetMarkers, method, options) {
    // Оптимизированные алгоритмы расчета дистанций
    switch (method) {
      case 'simple':
        return this.calculateSimpleDistanceOptimized(userMarkers, targetMarkers);
      case 'weighted':
        return this.calculateWeightedDistanceOptimized(userMarkers, targetMarkers, options);
      case 'genetic':
        return this.calculateGeneticDistanceOptimized(userMarkers, targetMarkers, options);
      default:
        return this.calculateSimpleDistanceOptimized(userMarkers, targetMarkers);
    }
  }
  
  // Оптимизированный простой расчет
  calculateSimpleDistanceOptimized(userMarkers, targetMarkers) {
    const userKeys = Object.keys(userMarkers);
    const targetKeys = new Set(Object.keys(targetMarkers));
    
    let matches = 0;
    let mismatches = 0;
    let totalCompared = 0;
    
    // Предварительно определяем палиндромные маркеры
    const palindromicSet = new Set(['DYS385', 'DYS459', 'CDYa', 'CDYb']);
    
    for (const marker of userKeys) {
      if (!targetKeys.has(marker)) continue;
      
      totalCompared++;
      const userValue = userMarkers[marker];
      const targetValue = targetMarkers[marker];
      
      let distance;
      if (palindromicSet.has(marker)) {
        distance = this.calculatePalindromicDistanceFast(userValue, targetValue);
      } else {
        distance = Math.abs(parseInt(userValue) - parseInt(targetValue));
      }
      
      if (distance === 0) {
        matches++;
      } else {
        mismatches += distance;
      }
    }
    
    return {
      distance: mismatches,
      matches,
      mismatches,
      totalCompared,
      method: 'simple'
    };
  }
  
  calculatePalindromicDistanceFast(value1, value2) {
    // Оптимизированная версия для палиндромных маркеров
    const vals1 = value1.split('-').map(v => parseInt(v)).filter(v => !isNaN(v)).sort();
    const vals2 = value2.split('-').map(v => parseInt(v)).filter(v => !isNaN(v)).sort();
    
    if (vals1.length !== vals2.length) {
      return Math.max(vals1.length, vals2.length);
    }
    
    let totalDistance = 0;
    for (let i = 0; i < vals1.length; i++) {
      totalDistance += Math.abs(vals1[i] - vals2[i]);
    }
    
    return totalDistance;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Главный обработчик сообщений
const worker = new DistanceCalculatorWorker();

self.addEventListener('message', async (event) => {
  const { type, data, requestId } = event.data;
  
  try {
    if (type === 'CALCULATE_DISTANCES') {
      const results = await worker.processDistanceCalculation(data);
      
      self.postMessage({
        type: 'CALCULATION_COMPLETE',
        requestId,
        results
      });
    }
  } catch (error) {
    self.postMessage({
      type: 'CALCULATION_ERROR',
      requestId,
      error: error.message
    });
  }
});
```

### 2. Использование Worker в основном потоке

```javascript
// str-matcher/src/services/distance-calculation.service.js
class DistanceCalculationService {
  constructor() {
    this.workers = [];
    this.workerCount = Math.min(navigator.hardwareConcurrency || 2, 4);
    this.currentWorkerIndex = 0;
    this.initializeWorkers();
  }
  
  initializeWorkers() {
    console.log(`🚀 Инициализация ${this.workerCount} Web Workers для расчетов`);
    
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker('/workers/distance-calculator.worker.js');
      worker.onmessage = this.handleWorkerMessage.bind(this);
      this.workers.push({
        worker,
        busy: false,
        id: i
      });
    }
  }
  
  async calculateDistances(userMarkers, candidates, method = 'simple', options = {}) {
    if (candidates.length === 0) return [];
    
    console.log(`📊 Расчет дистанций: ${candidates.length} записей, метод: ${method}`);
    
    // Выбираем стратегию в зависимости от размера данных
    if (candidates.length < 100) {
      // Для малых данных - вычисляем в основном потоке
      return this.calculateInMainThread(userMarkers, candidates, method, options);
    } else {
      // Для больших данных - используем Web Workers
      return this.calculateWithWorkers(userMarkers, candidates, method, options);
    }
  }
  
  async calculateWithWorkers(userMarkers, candidates, method, options) {
    const startTime = performance.now();
    
    // Распределяем работу между воркерами
    const workersToUse = Math.min(this.workerCount, Math.ceil(candidates.length / 1000));
    const chunkSize = Math.ceil(candidates.length / workersToUse);
    
    const promises = [];
    
    for (let i = 0; i < workersToUse; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, candidates.length);
      const chunk = candidates.slice(start, end);
      
      if (chunk.length > 0) {
        promises.push(this.processChunkWithWorker(userMarkers, chunk, method, options, i));
      }
    }
    
    const results = await Promise.all(promises);
    const flatResults = results.flat();
    
    const totalTime = performance.now() - startTime;
    console.log(`⚡ Расчеты завершены: ${flatResults.length} результатов за ${totalTime.toFixed(2)}мс`);
    
    return flatResults;
  }
  
  processChunkWithWorker(userMarkers, chunk, method, options, workerId) {
    return new Promise((resolve, reject) => {
      const worker = this.workers[workerId % this.workers.length];
      const requestId = `${Date.now()}-${workerId}`;
      
      worker.busy = true;
      
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${workerId} timeout`));
      }, 30000); // 30 секунд таймаут
      
      const handleMessage = (event) => {
        const { type, requestId: responseId, results, error } = event.data;
        
        if (responseId !== requestId) return;
        
        clearTimeout(timeout);
        worker.worker.removeEventListener('message', handleMessage);
        worker.busy = false;
        
        if (type === 'CALCULATION_COMPLETE') {
          resolve(results);
        } else if (type === 'CALCULATION_ERROR') {
          reject(new Error(error));
        }
      };
      
      worker.worker.addEventListener('message', handleMessage);
      worker.worker.postMessage({
        type: 'CALCULATE_DISTANCES',
        requestId,
        data: { userMarkers, candidates: chunk, method, options }
      });
    });
  }
  
  calculateInMainThread(userMarkers, candidates, method, options) {
    // Синхронные расчеты для небольших объемов данных
    const results = [];
    
    for (const candidate of candidates) {
      const distance = this.calculateSingleDistance(userMarkers, candidate.markers, method, options);
      results.push({
        target: candidate,
        ...distance
      });
    }
    
    return results;
  }
}
```

## 💾 Кэширование и управление памятью

### 1. Многоуровневая система кэширования

```javascript
// str-matcher/src/services/cache.service.js
class AdvancedCacheService {
  constructor() {
    this.memoryCache = new Map();          // L1 - Горячие данные
    this.compressionCache = new Map();     // L2 - Сжатые данные  
    this.diskCache = null;                 // L3 - Диск (если доступен)
    
    this.maxMemorySize = 100 * 1024 * 1024; // 100MB
    this.currentMemoryUsage = 0;
    
    this.statistics = {
      hits: { L1: 0, L2: 0, L3: 0 },
      misses: 0,
      evictions: 0,
      compressions: 0
    };
    
    this.initializeCache();
  }
  
  initializeCache() {
    // Периодическая очистка кэша
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // Каждые 5 минут
    
    // Мониторинг использования памяти
    if (performance.memory) {
      setInterval(() => this.monitorMemoryUsage(), 30 * 1000); // Каждые 30 секунд
    }
  }
  
  async get(key) {
    // L1 - Memory cache
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      this.statistics.hits.L1++;
      return entry.data;
    }
    
    // L2 - Compressed cache
    if (this.compressionCache.has(key)) {
      const compressedEntry = this.compressionCache.get(key);
      const decompressedData = await this.decompress(compressedEntry.data);
      
      // Продвигаем в L1 если есть место
      if (this.canStoreInMemory(decompressedData)) {
        this.setInMemory(key, decompressedData);
      }
      
      this.statistics.hits.L2++;
      return decompressedData;
    }
    
    // L3 - Disk cache (если доступен)
    if (this.diskCache) {
      const diskData = await this.diskCache.get(key);
      if (diskData) {
        this.statistics.hits.L3++;
        return diskData;
      }
    }
    
    this.statistics.misses++;
    return null;
  }
  
  async set(key, data, options = {}) {
    const dataSize = this.estimateSize(data);
    const priority = options.priority || 'normal';
    
    // Определяем оптимальное место хранения
    if (priority === 'high' && this.canStoreInMemory(data)) {
      this.setInMemory(key, data);
    } else if (dataSize > 1024 * 1024) { // > 1MB
      // Большие данные сжимаем и храним в L2
      await this.setCompressed(key, data, options);
    } else {
      this.setInMemory(key, data);
    }
  }
  
  setInMemory(key, data) {
    const dataSize = this.estimateSize(data);
    
    // Освобождаем место если нужно
    while (this.currentMemoryUsage + dataSize > this.maxMemorySize) {
      this.evictLRU();
    }
    
    const entry = {
      data,
      size: dataSize,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      level: 'L1'
    };
    
    this.memoryCache.set(key, entry);
    this.currentMemoryUsage += dataSize;
  }
  
  async setCompressed(key, data, options) {
    try {
      const compressed = await this.compress(data);
      const compressedSize = this.estimateSize(compressed);
      
      if (compressedSize < this.estimateSize(data) * 0.7) { // Сжатие эффективно
        this.compressionCache.set(key, {
          data: compressed,
          size: compressedSize,
          timestamp: Date.now(),
          originalSize: this.estimateSize(data),
          compressionRatio: compressedSize / this.estimateSize(data)
        });
        
        this.statistics.compressions++;
        console.log(`📦 Данные сжаты: ${key}, коэффициент: ${(compressedSize / this.estimateSize(data)).toFixed(2)}`);
      } else {
        // Сжатие неэффективно, храним как есть
        this.setInMemory(key, data);
      }
    } catch (error) {
      console.warn('⚠️ Ошибка сжатия данных:', error);
      this.setInMemory(key, data);
    }
  }
  
  evictLRU() {
    let lruKey = null;
    let lruTime = Date.now();
    
    for (const [key, entry] of this.memoryCache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      const entry = this.memoryCache.get(lruKey);
      this.memoryCache.delete(lruKey);
      this.currentMemoryUsage -= entry.size;
      this.statistics.evictions++;
      
      console.log(`🗑️ Evicted from cache: ${lruKey} (freed ${entry.size} bytes)`);
    }
  }
  
  async compress(data) {
    // Используем современные API сжатия если доступны
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const input = encoder.encode(jsonString);
      
      writer.write(input);
      writer.close();
      
      const chunks = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
    } else {
      // Fallback - простое сжатие JSON
      return this.simpleCompress(JSON.stringify(data));
    }
  }
  
  async decompress(compressedData) {
    if (typeof DecompressionStream !== 'undefined' && compressedData instanceof Uint8Array) {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(compressedData);
      writer.close();
      
      const chunks = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      const decoder = new TextDecoder();
      const decompressed = decoder.decode(new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [])));
      
      return JSON.parse(decompressed);
    } else {
      // Fallback деcompression
      return JSON.parse(this.simpleDecompress(compressedData));
    }
  }
  
  canStoreInMemory(data) {
    const dataSize = this.estimateSize(data);
    return dataSize <= this.maxMemorySize * 0.1; // Не более 10% от лимита на одну запись
  }
  
  estimateSize(data) {
    // Приблизительная оценка размера объекта в байтах
    return JSON.stringify(data).length * 2; // UTF-16 encoding
  }
  
  monitorMemoryUsage() {
    if (performance.memory) {
      const memInfo = performance.memory;
      const usagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
      
      if (usagePercent > 80) {
        console.warn(`⚠️ Высокое использование памяти: ${usagePercent.toFixed(1)}%`);
        this.aggressiveCleanup();
      }
    }
  }
  
  aggressiveCleanup() {
    // Агрессивная очистка при нехватке памяти
    const originalSize = this.memoryCache.size;
    
    // Удаляем 50% наименее используемых записей
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
    
    const toRemove = Math.floor(entries.length / 2);
    for (let i = 0; i < toRemove; i++) {
      const [key, entry] = entries[i];
      this.memoryCache.delete(key);
      this.currentMemoryUsage -= entry.size;
    }
    
    console.log(`🧹 Агрессивная очистка: удалено ${toRemove} записей из ${originalSize}`);
  }
  
  getStatistics() {
    const totalHits = this.statistics.hits.L1 + this.statistics.hits.L2 + this.statistics.hits.L3;
    const totalRequests = totalHits + this.statistics.misses;
    
    return {
      ...this.statistics,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      memoryUsage: {
        current: this.currentMemoryUsage,
        max: this.maxMemorySize,
        percentage: (this.currentMemoryUsage / this.maxMemorySize) * 100
      },
      cacheSize: {
        L1: this.memoryCache.size,
        L2: this.compressionCache.size
      }
    };
  }
}
```

## 🏎️ Оптимизация загрузки данных

### 1. Потоковая загрузка с прогрессом

```javascript
// str-matcher/src/services/data-loader-optimized.service.js
class OptimizedDataLoader {
  constructor() {
    this.cache = new AdvancedCacheService();
    this.activeRequests = new Map();
    this.loadingStrategies = {
      'small': this.loadDirectly.bind(this),
      'medium': this.loadInChunks.bind(this),
      'large': this.loadWithStreaming.bind(this)
    };
  }
  
  async loadRepository(repositoryConfig, onProgress) {
    const cacheKey = `repo_${repositoryConfig.name}_${repositoryConfig.version || 'latest'}`;
    
    // Проверяем кэш
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`📋 Репозиторий ${repositoryConfig.name} загружен из кэша`);
      onProgress && onProgress({ loaded: cached.length, total: cached.length, status: 'cached' });
      return cached;
    }
    
    // Предотвращаем дублирование запросов
    if (this.activeRequests.has(cacheKey)) {
      console.log(`⏳ Ожидание активного запроса для ${repositoryConfig.name}`);
      return await this.activeRequests.get(cacheKey);
    }
    
    // Определяем стратегию загрузки
    const strategy = await this.selectLoadingStrategy(repositoryConfig);
    console.log(`🚀 Загрузка ${repositoryConfig.name} стратегией: ${strategy}`);
    
    const loadPromise = this.loadingStrategies[strategy](repositoryConfig, onProgress);
    this.activeRequests.set(cacheKey, loadPromise);
    
    try {
      const data = await loadPromise;
      
      // Кэшируем результат
      await this.cache.set(cacheKey, data, { priority: 'high' });
      
      return data;
    } finally {
      this.activeRequests.delete(cacheKey);
    }
  }
  
  async selectLoadingStrategy(repositoryConfig) {
    // Определяем размер файла если возможно
    try {
      const response = await fetch(repositoryConfig.url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      
      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);
        
        if (sizeInMB < 1) return 'small';
        if (sizeInMB < 10) return 'medium'; 
        return 'large';
      }
    } catch (error) {
      console.warn('⚠️ Не удалось определить размер файла:', error);
    }
    
    // Используем эвристики на основе названия репозитория
    if (repositoryConfig.name === 'FTDNA') return 'large';
    if (repositoryConfig.name === 'YFull') return 'medium';
    return 'small';
  }
  
  async loadDirectly(repositoryConfig, onProgress) {
    const response = await fetch(repositoryConfig.url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const processedData = this.processRawData(data, repositoryConfig);
    
    onProgress && onProgress({ 
      loaded: processedData.length, 
      total: processedData.length, 
      status: 'complete' 
    });
    
    return processedData;
  }
  
  async loadInChunks(repositoryConfig, onProgress) {
    const response = await fetch(repositoryConfig.url);
    const reader = response.body.getReader();
    
    let receivedLength = 0;
    const contentLength = parseInt(response.headers.get('content-length')) || 0;
    const chunks = [];
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      onProgress && onProgress({
        loaded: receivedLength,
        total: contentLength,
        status: 'loading',
        percentage: contentLength > 0 ? (receivedLength / contentLength) * 100 : 0
      });
      
      // Даем браузеру передышку каждые 1MB
      if (receivedLength % (1024 * 1024) === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    // Объединяем чанки и парсим JSON
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }
    
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(allChunks); 
    const data = JSON.parse(jsonString);
    
    onProgress && onProgress({ loaded: 0, total: data.length, status: 'processing' });
    
    const processedData = await this.processRawDataAsync(data, repositoryConfig, onProgress);
    
    return processedData;
  }
  
  async loadWithStreaming(repositoryConfig, onProgress) {
    // Для очень больших файлов - используем потоковую обработку
    console.log(`🌊 Потоковая загрузка ${repositoryConfig.name}`);
    
    const response = await fetch(repositoryConfig.url);
    const stream = response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new JSONParseStream()); // Кастомный transform stream
    
    const reader = stream.getReader();
    const processedData = [];
    let processedCount = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Обрабатываем порцию данных
        const processedBatch = this.processRawDataBatch(value, repositoryConfig);
        processedData.push(...processedBatch);
        processedCount += processedBatch.length;
        
        onProgress && onProgress({
          loaded: processedCount,
          total: null, // Неизвестно для потоковой загрузки
          status: 'streaming'
        });
        
        // Передышка каждые 1000 записей
        if (processedCount % 1000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    onProgress && onProgress({
      loaded: processedData.length,
      total: processedData.length,
      status: 'complete'
    });
    
    return processedData;
  }
  
  async processRawDataAsync(rawData, repositoryConfig, onProgress) {
    const processedData = [];
    const batchSize = 1000;
    const totalBatches = Math.ceil(rawData.length / batchSize);
    
    for (let i = 0; i < rawData.length; i += batchSize) {
      const batch = rawData.slice(i, i + batchSize);
      const processedBatch = this.processRawDataBatch(batch, repositoryConfig);
      
      processedData.push(...processedBatch);
      
      onProgress && onProgress({
        loaded: processedData.length,
        total: rawData.length,
        status: 'processing',
        batch: Math.floor(i / batchSize) + 1,
        totalBatches
      });
      
      // Передышка каждый батч
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    return processedData;
  }
  
  processRawDataBatch(batch, repositoryConfig) {
    return batch
      .map(entry => this.transformEntry(entry, repositoryConfig))
      .filter(entry => this.validateEntry(entry));
  }
  
  transformEntry(rawEntry, repositoryConfig) {
    // Применяем трансформацию если есть
    if (repositoryConfig.transform) {
      return repositoryConfig.transform(rawEntry);
    }
    
    // Стандартная трансформация
    return {
      name: rawEntry.name || rawEntry.id,
      haplogroup: this.normalizeHaplogroup(rawEntry.haplogroup),
      markers: this.normalizeMarkers(rawEntry.markers),
      metadata: {
        source: repositoryConfig.name,
        quality: rawEntry.quality || 'medium',
        updated: rawEntry.updated || new Date().toISOString()
      }
    };
  }
  
  validateEntry(entry) {
    return entry.name && 
           entry.haplogroup && 
           entry.markers && 
           Object.keys(entry.markers).length > 0;
  }
}
```

## 📊 Оптимизация рендеринга

### 1. Виртуализация больших таблиц

```javascript
// str-matcher/src/components/VirtualizedMatchesTable.tsx
import { FixedSizeList as List } from 'react-window';
import { useMemo, useCallback } from 'react';

interface VirtualizedMatchesTableProps {
  matches: DistanceResult[];
  onRowClick: (match: DistanceResult) => void;
  height: number;
}

const VirtualizedMatchesTable: React.FC<VirtualizedMatchesTableProps> = ({
  matches,
  onRowClick,
  height = 600
}) => {
  const itemData = useMemo(() => ({
    matches,
    onRowClick
  }), [matches, onRowClick]);
  
  const MatchRow = useCallback(({ index, style, data }) => {
    const match = data.matches[index];
    
    return (
      <div 
        style={style} 
        className="matches-row"
        onClick={() => data.onRowClick(match)}
      >
        <OptimizedMatchRow match={match} />
      </div>
    );
  }, []);
  
  if (matches.length === 0) {
    return <div>Нет результатов</div>;
  }
  
  return (
    <List
      height={height}
      itemCount={matches.length}
      itemSize={60} // Высота строки в пикселях
      itemData={itemData}
      overscanCount={10} // Рендерим дополнительные строки для плавной прокрутки
    >
      {MatchRow}
    </List>
  );
};

// Оптимизированный компонент строки
const OptimizedMatchRow = React.memo<{ match: DistanceResult }>(({ match }) => {
  return (
    <div className="match-row-content">
      <span className="match-name">{match.target.name}</span>
      <span className="match-haplogroup">{match.target.haplogroup}</span>
      <span className="match-distance">{match.distance}</span>
      <span className="match-markers">{match.matchedMarkers}/{match.totalMarkers}</span>
    </div>
  );
});
```

### 2. Мемоизация дорогих вычислений

```javascript
// str-matcher/src/hooks/useOptimizedMatches.ts
import { useMemo, useCallback } from 'react';
import { debounce } from 'lodash';

export const useOptimizedMatches = (
  userMarkers: MarkerSet,
  repositories: Repository[],
  filters: FilterOptions
) => {
  // Мемоизируем обработанные данные
  const processedRepositories = useMemo(() => {
    console.log('🔄 Пересчет обработанных репозиториев');
    
    return repositories.map(repo => ({
      ...repo,
      processedData: repo.data.map(entry => ({
        ...entry,
        // Предварительно рассчитываем общие маркеры для оптимизации
        commonMarkers: Object.keys(entry.markers).filter(marker => 
          userMarkers.hasOwnProperty(marker)
        ),
        markerCount: Object.keys(entry.markers).length
      }))
    }));
  }, [repositories, userMarkers]);
  
  // Мемоизируем отфильтрованные результаты
  const filteredData = useMemo(() => {
    console.log('🔍 Применение фильтров');
    
    return processedRepositories.flatMap(repo => 
      repo.processedData.filter(entry => {
        // Быстрые проверки сначала
        if (filters.minMarkers && entry.commonMarkers.length < filters.minMarkers) {
          return false;
        }
        
        if (filters.haplogroup && filters.haplogroup !== 'all') {
          // Здесь будет вызов API для проверки субкладов
          // Но мы кэшируем результаты для оптимизации
          return true; // Упрощенная версия
        }
        
        return true;
      })
    );
  }, [processedRepositories, filters]);
  
  // Дебаунсированный расчет дистанций
  const calculateDistancesDebounced = useCallback(
    debounce(async (data: ProcessedEntry[]) => {
      const distanceService = new DistanceCalculationService();
      return await distanceService.calculateDistances(
        userMarkers,
        data,
        filters.method || 'simple'
      );
    }, 300),
    [userMarkers, filters.method]
  );
  
  return {
    processedRepositories,
    filteredData,
    calculateDistancesDebounced
  };
};
```

## 🚀 Оптимизация API запросов

### 1. Батчинг и дедупликация

```javascript
// ftdna_haplo/server/middleware/api-optimization.js
class APIOptimizationMiddleware {
  constructor() {
    this.requestBatcher = new RequestBatcher();
    this.responseCache = new Map();
    this.pendingRequests = new Map();
  }
  
  // Батчинг запросов check-subclade
  async batchSubcladeChecks(req, res, next) {
    if (req.path !== '/api/check-subclade' || req.method !== 'POST') {
      return next();
    }
    
    const { haplogroup, subclade, source } = req.body;
    const requestKey = `${haplogroup}|${subclade}|${source}`;
    
    // Проверяем кэш
    if (this.responseCache.has(requestKey)) {
      const cached = this.responseCache.get(requestKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 минут TTL
        return res.json(cached.data);
      }
    }
    
    // Дедупликация одинаковых запросов
    if (this.pendingRequests.has(requestKey)) {
      const pendingPromise = this.pendingRequests.get(requestKey);
      const result = await pendingPromise;
      return res.json(result);
    }
    
    // Создаем новый запрос
    const requestPromise = this.processSubcladeCheck(haplogroup, subclade, source);
    this.pendingRequests.set(requestKey, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // Кэшируем результат
      this.responseCache.set(requestKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return res.json(result);
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }
  
  async processSubcladeCheck(haplogroup, subclade, source) {
    // Реальная обработка запроса
    const result = await haplogroupService.isSubclade(haplogroup, subclade, source);
    
    return {
      isSubclade: result.isSubclade,
      confidence: result.confidence,
      method: result.method,
      path: result.path,
      source: source,
      timestamp: Date.now()
    };
  }
}

// Батчер для группировки запросов
class RequestBatcher {
  constructor() {
    this.batches = new Map();
    this.batchTimeout = 50; // Ждем 50мс перед обработкой батча
  }
  
  addToBatch(key, request) {
    if (!this.batches.has(key)) {
      this.batches.set(key, []);
      
      // Устанавливаем таймер для обработки батча
      setTimeout(() => {
        this.processBatch(key);
      }, this.batchTimeout);
    }
    
    this.batches.get(key).push(request);
  }
  
  async processBatch(key) {
    const requests = this.batches.get(key);
    if (!requests || requests.length === 0) return;
    
    this.batches.delete(key);
    
    console.log(`📦 Обработка батча ${key}: ${requests.length} запросов`);
    
    // Обрабатываем все запросы в батче параллельно
    const results = await Promise.allSettled(
      requests.map(req => this.processRequest(req))
    );
    
    // Возвращаем результаты всем ожидающим клиентам
    results.forEach((result, index) => {
      const request = requests[index];
      if (result.status === 'fulfilled') {
        request.resolve(result.value);
      } else {
        request.reject(result.reason);
      }
    });
  }
}
```

## 📈 Мониторинг производительности

### 1. Performance метрики

```javascript
// str-matcher/src/services/performance-monitor.service.js
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isMonitoring = false;
    
    this.initializeObservers();
  }
  
  initializeObservers() {
    // Performance Observer для Web Vitals
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, entry.duration, {
            type: entry.entryType,
            startTime: entry.startTime
          });
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      this.observers.push(observer);
    }
  }
  
  startMonitoring() {
    this.isMonitoring = true;
    console.log('📊 Мониторинг производительности запущен');
    
    // Мониторинг памяти
    if (performance.memory) {
      setInterval(() => {
        this.recordMemoryUsage();
      }, 10000); // Каждые 10 секунд
    }
    
    // Мониторинг FPS
    this.startFPSMonitoring();
  }
  
  measureAsync(name, asyncFunction) {
    return async (...args) => {
      const startTime = performance.now();
      performance.mark(`${name}-start`);
      
      try {
        const result = await asyncFunction.apply(this, args);
        
        const endTime = performance.now();
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const duration = endTime - startTime;
        this.recordMetric(name, duration, { status: 'success' });
        
        console.log(`⚡ ${name}: ${duration.toFixed(2)}мс`);
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        this.recordMetric(name, duration, { status: 'error', error: error.message });
        
        console.error(`❌ ${name} failed after ${duration.toFixed(2)}мс:`, error);
        throw error;
      }
    };
  }
  
  recordMetric(name, value, metadata = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        values: []
      });
    }
    
    const metric = this.metrics.get(name);
    metric.count++;
    metric.total += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    
    // Храним последние 100 значений для расчета процентилей
    metric.values.push(value);
    if (metric.values.length > 100) {
      metric.values.shift();
    }
    
    // Записываем метаданные
    metric.lastMetadata = metadata;
    metric.lastUpdated = Date.now();
  }
  
  getMetrics() {
    const result = {};
    
    for (const [name, metric] of this.metrics) {
      const sortedValues = [...metric.values].sort((a, b) => a - b);
      
      result[name] = {
        count: metric.count,
        average: metric.total / metric.count,
        min: metric.min,
        max: metric.max,
        p95: this.percentile(sortedValues, 0.95),
        p99: this.percentile(sortedValues, 0.99),
        lastUpdated: metric.lastUpdated
      };
    }
    
    return result;
  }
  
  percentile(sortedValues, p) {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil(sortedValues.length * p) - 1;
    return sortedValues[Math.max(0, index)];
  }
  
  recordMemoryUsage() {
    if (performance.memory) {
      const memory = performance.memory;
      
      this.recordMetric('memory.used', memory.usedJSHeapSize);
      this.recordMetric('memory.total', memory.totalJSHeapSize);
      this.recordMetric('memory.limit', memory.jsHeapSizeLimit);
      
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      this.recordMetric('memory.usage_percent', usagePercent);
      
      // Предупреждение при высоком использовании памяти
      if (usagePercent > 85) {
        console.warn(`⚠️ Высокое использование памяти: ${usagePercent.toFixed(1)}%`);
      }
    }
  }
  
  startFPSMonitoring() {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) { // Каждую секунду
        const fps = frameCount / ((currentTime - lastTime) / 1000);
        this.recordMetric('fps', fps);
        
        if (fps < 30) {
          console.warn(`⚠️ Низкий FPS: ${fps.toFixed(1)}`);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (this.isMonitoring) {
        requestAnimationFrame(measureFPS);
      }
    };
    
    requestAnimationFrame(measureFPS);
  }
  
  generateReport() {
    const metrics = this.getMetrics();
    
    const report = {
      timestamp: new Date().toISOString(),
      performance: metrics,
      recommendations: this.generateRecommendations(metrics),
      systemInfo: {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency,
        memory: performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null
      }
    };
    
    return report;
  }
  
  generateRecommendations(metrics) {
    const recommendations = [];
    
    // Анализ времени загрузки данных
    if (metrics['data-loading'] && metrics['data-loading'].average > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        issue: 'Медленная загрузка данных',
        suggestion: 'Рассмотрите использование потоковой загрузки или кэширования'
      });
    }
    
    // Анализ расчетов дистанций
    if (metrics['distance-calculation'] && metrics['distance-calculation'].average > 3000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        issue: 'Медленные расчеты дистанций',
        suggestion: 'Увеличьте количество Web Workers или оптимизируйте алгоритмы'
      });
    }
    
    // Анализ использования памяти
    if (metrics['memory.usage_percent'] && metrics['memory.usage_percent'].average > 80) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        issue: 'Высокое использование памяти',
        suggestion: 'Включите агрессивную очистку кэша или уменьшите размер обрабатываемых данных'
      });
    }
    
    return recommendations;
  }
}

// Глобальный экземпляр монитора
export const performanceMonitor = new PerformanceMonitor();
```

## 🔗 Связанные документы

- [Алгоритмы расчетов](algorithms.md) - детали оптимизированных алгоритмов
- [Структуры данных](database-structure.md) - эффективные структуры данных
- [Архитектура системы](../ARCHITECTURE.md) - общая архитектура
- [Решение проблем](../guides/troubleshooting.md) - диагностика проблем производительности
- [Конфигурация системы](../guides/configuration.md) - настройки производительности
