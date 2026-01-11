# YSTR Matcher v2.0 - Ускоренная система сравнения Y-STR маркеров

Высокопроизводительная система для сравнения Y-STR маркеров с поддержкой обработки 100-200 тысяч образцов одновременно.

## 📚 Важная документация

- **[Исправление ошибки HTTP 400 в Backend API](docs/API-ERROR-400-FIX.md)** - Решение проблемы с Joi валидацией и undefined полями в запросах
- **[Фильтрация по панелям маркеров](docs/MARKER-PANEL-FILTERING.md)** - Исправление критической проблемы с искусственно завышенным процентом совпадения для профилей с меньшим количеством маркеров

## 🚀 Основные возможности

### ⚡ Производительность
- **PostgreSQL** с оптимизированными индексами для быстрого поиска
- **CUDA-ускоренный** предиктор гаплогрупп с машинным обучением
- **Redis** кэширование для мгновенных повторных запросов
- **Виртуализированный** frontend для плавной работы с большими таблицами
- **Батчевая обработка** с очередями для загрузки больших файлов

### 🧬 Функциональность
- Сравнение до 200,000 профилей одновременно
- Предсказание гаплогрупп на основе ML моделей
- Иерархическая фильтрация по гаплогруппам
- Экспорт результатов в различных форматах
- Реал-тайм мониторинг производительности

### 🔬 CUDA ML Predictor
- Ансамбль из CNN, XGBoost и LightGBM моделей
- Механизм внимания для анализа важности маркеров
- GPU ускорение для быстрого inference
- Confidence scoring и альтернативные предсказания

## 🏗️ Архитектура системы

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend v2   │    │   Backend API   │    │   CUDA Service  │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (FastAPI)     │
│                 │    │                 │    │                 │
│ • Zustand Store │    │ • PostgreSQL    │    │ • PyTorch       │
│ • React Query   │    │ • Redis Cache   │    │ • GPU Models    │
│ • Virtualization│    │ • Bull Queue    │    │ • ML Pipeline   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │                 │
                        │ • Optimized     │
                        │   Indexes       │
                        │ • Partitioning  │
                        │ • Batch Funcs   │
                        └─────────────────┘
```

## 📋 Системные требования

### Минимальные требования
- **CPU**: 8+ ядер
- **RAM**: 16GB
- **GPU**: NVIDIA GTX 1660 или выше (4GB VRAM)
- **Диск**: 500GB SSD
- **ОС**: Ubuntu 20.04+ / Windows 10+ / macOS 12+

### Рекомендуемые требования
- **CPU**: 16+ ядер (Intel i9 / AMD Ryzen 9)
- **RAM**: 64GB
- **GPU**: NVIDIA RTX 3080 или выше (10GB+ VRAM)
- **Диск**: 2TB NVMe SSD
- **Сеть**: Gigabit Ethernet

## 🛠️ Установка и настройка

### 1. Клонирование репозитория
```bash
git clone https://github.com/your-org/DNA-utils-universal.git
cd DNA-utils-universal
```

### 2. Настройка PostgreSQL
```bash
# Установка PostgreSQL 15+
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# Создание базы данных
sudo -u postgres createdb ystr_matcher
sudo -u postgres psql -d ystr_matcher -f database/schema.sql

# Настройка производительности
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Оптимизация `postgresql.conf`:
```ini
# Память
shared_buffers = 8GB                    # 25% от RAM
effective_cache_size = 24GB             # 75% от RAM
work_mem = 256MB
maintenance_work_mem = 2GB

# Параллелизм
max_worker_processes = 16
max_parallel_workers = 16
max_parallel_workers_per_gather = 8

# Логирование
log_min_duration_statement = 1000       # Логировать медленные запросы
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

### 3. Настройка Redis
```bash
# Установка Redis
sudo apt install redis-server

# Настройка для большого объема данных
sudo nano /etc/redis/redis.conf
```

Оптимизация `redis.conf`:
```ini
maxmemory 8gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 4. Настройка CUDA окружения
```bash
# Установка NVIDIA драйверов и CUDA 11.8+
sudo apt install nvidia-driver-520
wget https://developer.download.nvidia.com/compute/cuda/11.8.0/local_installers/cuda_11.8.0_520.61.05_linux.run
sudo sh cuda_11.8.0_520.61.05_linux.run

# Проверка установки
nvidia-smi
nvcc --version
```

### 5. Backend сервис
```bash
cd backend

# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
nano .env
```

Конфигурация `.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ystr_matcher
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_MAX_CONNECTIONS=50

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=9004
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com

# Performance
WORKER_CONCURRENCY=8
BATCH_SIZE=2000
MAX_PROFILES_PER_BATCH=50000
```

### 6. CUDA Predictor Service
```bash
cd cuda-predictor

# Создание виртуального окружения
python3 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Загрузка предобученных моделей
mkdir -p models/v2.1
# Скачать модели с вашего хранилища
wget https://your-models-storage.com/ystr-models-v2.1.tar.gz
tar -xzf ystr-models-v2.1.tar.gz -C models/v2.1/

# Настройка окружения
cp .env.example .env
nano .env
```

### 7. Frontend v2
```bash
cd frontend-v2

# Установка зависимостей
npm install

# Настройка окружения
cp .env.local.example .env.local
nano .env.local
```

Конфигурация `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:9004/api
NEXT_PUBLIC_CUDA_SERVICE_URL=http://localhost:8080
NEXT_PUBLIC_MAX_UPLOAD_SIZE=104857600
```

## 🚀 Запуск системы

### Development режим
```bash
# Терминал 1: Backend
cd backend
npm run dev

# Терминал 2: CUDA Service
cd cuda-predictor
source venv/bin/activate
python main.py

# Терминал 3: Frontend
cd frontend-v2
npm run dev
```

### Production режим
```bash
# Сборка и запуск с PM2
npm install -g pm2

# Backend
cd backend
npm run build
pm2 start ecosystem.config.js

# CUDA Service
cd cuda-predictor
pm2 start --name cuda-predictor --interpreter python3 main.py

# Frontend
cd frontend-v2
npm run build
pm2 start --name frontend "npm start"
```

### Docker Compose (рекомендуется)
```bash
# Запуск всей системы
docker-compose up -d

# Мониторинг логов
docker-compose logs -f

# Масштабирование
docker-compose up -d --scale backend=3 --scale cuda-predictor=2
```

## 📊 Мониторинг и производительность

### Prometheus метрики
- Доступны на `http://localhost:9004/metrics`
- Время выполнения запросов
- Использование GPU
- Статистика кэша

### Health checks
```bash
# Backend health
curl http://localhost:9004/health

# CUDA service health
curl http://localhost:8080/health

# Detailed system health
curl http://localhost:9004/api/admin/health-detailed
```

### Grafana Dashboard
Импортируйте dashboard из `monitoring/grafana-dashboard.json` для визуализации метрик.

## 🔧 Оптимизация производительности

### Настройка для больших датасетов

#### PostgreSQL оптимизация
```sql
-- Создание дополнительных индексов для специфических запросов
CREATE INDEX CONCURRENTLY idx_ystr_markers_specific ON ystr_profiles
USING GIN ((markers->'DYS393'), (markers->'DYS390'), (markers->'DYS19'));

-- Партицирование по гаплогруппам (для очень больших БД)
CREATE TABLE ystr_profiles_r1a PARTITION OF ystr_profiles
    FOR VALUES IN ('R1a', 'R1a1a', 'R1a1a1');
```

#### GPU память оптимизация
```python
# В cuda-predictor/main.py
torch.cuda.empty_cache()  # Очистка GPU памяти
torch.backends.cudnn.benchmark = True  # Оптимизация для фиксированного размера входов
```

### Мониторинг производительности
```bash
# GPU utilization
nvidia-smi -l 1

# Database performance
sudo -u postgres psql -d ystr_matcher -c "
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;"

# Redis performance
redis-cli info stats
```

## 📈 Масштабирование

### Горизонтальное масштабирование
- **Backend**: Несколько инстансов за load balancer
- **CUDA Service**: Репликация на несколько GPU серверов
- **Database**: Read replicas для чтения
- **Redis**: Cluster mode для больших кэшей

### Вертикальное масштабирование
- **Database**: Увеличение RAM и CPU
- **GPU**: Более мощные GPU (RTX 4090, A100)
- **Storage**: NVMe RAID для высокого IOPS

## 🔒 Безопасность

### Аутентификация и авторизация
```bash
# Настройка JWT в backend/.env
JWT_SECRET=your-256-bit-secret
JWT_EXPIRES_IN=24h

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### SSL/TLS настройка
```nginx
# Nginx конфигурация
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location /api/ {
        proxy_pass http://localhost:9004/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🧪 Тестирование

### Нагрузочное тестирование
```bash
# Установка k6
sudo apt install k6

# Запуск нагрузочных тестов
k6 run tests/load-test.js
```

### Юнит тесты
```bash
# Backend тесты
cd backend
npm test

# Frontend тесты
cd frontend-v2
npm test

# CUDA service тесты
cd cuda-predictor
pytest tests/
```

## 📚 API документация

### Основные endpoints

#### Поиск совпадений
```http
POST /api/profiles/find-matches
Content-Type: application/json

{
  "markers": {
    "DYS393": "13",
    "DYS390": "24",
    "DYS19": "14"
  },
  "maxDistance": 25,
  "maxResults": 1000,
  "markerCount": 37,
  "haplogroupFilter": "R1a",
  "includeSubclades": true
}
```

#### Загрузка профилей
```http
POST /api/profiles/upload
Content-Type: multipart/form-data

file: profiles.csv (up to 100MB)
```

#### Предсказание гаплогруппы
```http
POST /api/haplogroups/predict
Content-Type: application/json

{
  "markers": [13, 24, 14, 11, 14, 14, 12, 12, 13, 13, 14, 29, 18, 9, 10, 11, 11, 26, 14, 20, 32, 12, 15, 15, 16, 12, 25, 20, 13, 12, 11, 13, 11, 11, 12, 12],
  "method": "cuda_ml",
  "minConfidence": 0.7
}
```

## 🚨 Устранение неполадок

### Частые проблемы

#### GPU не обнаружен
```bash
# Проверка CUDA
nvidia-smi
nvcc --version

# Проверка PyTorch CUDA
python -c "import torch; print(torch.cuda.is_available())"
```

#### Медленные запросы к БД
```sql
-- Анализ медленных запросов
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Обновление статистики
ANALYZE ystr_profiles;
```

#### Переполнение памяти
```bash
# Мониторинг памяти
htop
free -h

# Очистка кэшей
echo 3 | sudo tee /proc/sys/vm/drop_caches
```

## 📞 Поддержка

### Логи системы
```bash
# Backend логи
pm2 logs backend

# CUDA service логи
pm2 logs cuda-predictor

# PostgreSQL логи
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Redis логи
sudo tail -f /var/log/redis/redis-server.log
```

### Контакты
- **GitHub Issues**: [https://github.com/your-org/DNA-utils-universal/issues](https://github.com/your-org/DNA-utils-universal/issues)
- **Email**: support@your-domain.com
- **Документация**: [https://docs.your-domain.com](https://docs.your-domain.com)

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE) для деталей.

---

**YSTR Matcher v2.0** - Высокопроизводительная система для генетических исследований Y-хромосомы.