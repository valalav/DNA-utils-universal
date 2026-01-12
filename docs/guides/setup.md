# Настройка и установка DNA-utils-universal

Пошаговое руководство по установке и настройке системы для разработки и продакшена.

## ⚙️ Системные требования

### Минимальные требования (обновлено август 2025) ⭐
- **OS**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0  
- **RAM**: 4GB (после оптимизаций системы достаточно)
- **Disk**: 2GB свободного места
- **CPU**: 2 cores (оптимизировано для любых процессоров)

### Рекомендуемые требования (для больших файлов) ⭐ ОБНОВЛЕНО
- **RAM**: 8GB (для комфортной работы с файлами 150k+ профилей)
- **CPU**: 4+ cores (для ускорения batch обработки)
- **SSD**: Рекомендуется для IndexedDB операций
- **Интернет**: Стабильное соединение для API запросов

### Поддерживаемые размеры файлов ⭐ НОВОЕ
- **До 10k профилей**: Обработка за < 5 секунд
- **До 50k профилей**: Обработка за < 15 секунд
- **До 150k профилей**: Обработка за < 30 секунд  
- **300k+ профилей**: Протестировано и работает (может занять до 60 секунд)

### Дополнительные требования
- **Python**: >= 3.8 (для ystr_predictor)
- **Git**: для клонирования репозитория
- **PM2**: для управления процессами (устанавливается автоматически)

## 🚀 Быстрая установка

### 1. Клонирование репозитория
```bash
git clone https://github.com/valalav/DNA-utils-universal.git
cd DNA-utils-universal
```

### 2. Установка зависимостей
```bash
# Корневые зависимости
npm install

# Backend (Core Service)
cd backend
npm install
cd ..

# STR Matcher (Frontend)
cd str-matcher
npm install
cd ..

# FTDNA Haplo (Legacy Service)
cd ftdna_haplo/server
npm install
cd ..

# Haplo Client (Legacy Client)
cd ftdna_haplo/client
npm install
cd ../..
```

### 3. Настройка окружения
```bash
cp .env.example .env
# Отредактируйте .env:
# BACKEND_PORT=9005
# HAPLO_PORT=9003
# FRONTEND_PORT=3000
```

### 4. Запуск системы

Система состоит из 3-х сервисов:
1. **Backend** (Port 9005) - Основной API и база данных.
2. **STR Matcher** (Port 3000) - Основной Frontend.
3. **Legacy Haplo** (Port 9003) - Справочник гаплогрупп.

#### Вариант А: Запуск через корневой скрипт (если настроен)
```bash
npm run dev
# Примечание: Проверьте, что backend запустился. Если нет - см. Вариант Б.
```

#### Вариант Б: Ручной запуск (рекомендуется для отладки)
```bash
# Терминал 1: Backend
cd backend && npm run dev

# Терминал 2: Frontend
cd str-matcher && npm run dev

# Терминал 3: Legacy Service
cd ftdna_haplo/server && npm run dev
```

**Проверка работоспособности**:
- **Backend**: http://localhost:9005/health
- **Frontend**: http://localhost:3000
- **Legacy**: http://localhost:9003/api/health

**Тестирование производительности** ⭐ НОВОЕ:
1. Загрузите тестовый файл (включен в str-matcher/test-data-1.csv)
2. Проверьте потоковую загрузку - должен показываться прогресс
3. Выполните поиск - система должна оставаться отзывчивой
4. Проверьте использование памяти в DevTools (должно быть < 100MB)

## 🔧 Детальная установка

### Шаг 1: Подготовка системы

#### Windows
```bash
# Установка Node.js через winget
winget install OpenJS.NodeJS

# Или скачайте с официального сайта
# https://nodejs.org/
```

#### macOS
```bash
# Установка через Homebrew
brew install node

# Или через официальный установщик
# https://nodejs.org/
```

#### Linux (Ubuntu/Debian)
```bash
# Установка Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка установки
node --version
npm --version
```

### Шаг 2: Клонирование и настройка

#### Клонирование репозитория
```bash
git clone https://github.com/valalav/DNA-utils-universal.git
cd DNA-utils-universal

# Проверка структуры
ls -la
# Должны быть папки: str-matcher, ftdna_haplo, ystr_predictor, docs
```

#### Установка корневых зависимостей
```bash
npm install

# Установленные пакеты:
# - cross-env: для кроссплатформенных переменных среды
# - dotenv: для работы с .env файлами  
# - pm2: для управления процессами
```

#### Установка зависимостей подпроектов
```bash
# STR Matcher (Next.js)
cd str-matcher
npm install
cd ..

# FTDNA Haplo Server (Node.js)
cd ftdna_haplo/server
npm install  
cd ../..

# FTDNA Haplo Client (React/Vite)
cd ftdna_haplo/client  
npm install
cd ../..

# Проверка установки всех зависимостей
npm run check:dependencies
```

### Шаг 3: Настройка переменных окружения

#### Создание .env файла
```bash
cp .env.example .env
```

#### Редактирование .env
```bash
# .env
NODE_ENV=development
HOST_IP=localhost

# API URLs для разработки
DEV_API_URL=http://localhost:9003/api
PROD_API_URL=https://your-domain.com/api

# CORS origins
DEV_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
PROD_ALLOWED_ORIGINS=https://your-domain.com,https://haplo.your-domain.com

# Опциональные настройки
DEBUG=true
LOG_LEVEL=info
```

#### Настройка для разных сред

**Development (.env.development)**:
```bash
NODE_ENV=development
HOST_IP=localhost
API_URL=http://localhost:9003/api
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
DEBUG=true
```

**Production (.env.production)**:
```bash
NODE_ENV=production
HOST_IP=0.0.0.0
API_URL=https://api.yourdomain.com/api
ALLOWED_ORIGINS=https://yourdomain.com,https://haplo.yourdomain.com
DEBUG=false
```

### Шаг 4: Настройка данных

#### Загрузка тестовых данных FTDNA/YFull
```bash
# Создание папки для данных
mkdir -p ftdna_haplo/data

# Скачивание тестовых данных (если доступны)
cd ftdna_haplo/data
wget https://example.com/test-data/get.json
wget https://example.com/test-data/ytree.json
cd ../..
```

**Важно**: Реальные данные FTDNA и YFull требуют соответствующих лицензий. Для разработки используйте тестовые данные.

#### Структура данных
```json
// ftdna_haplo/data/get.json - FTDNA дерево
{
  "allNodes": {
    "1": {
      "haplogroupId": "1",
      "name": "A0-T",
      "variants": [{"variant": "M91"}],
      "children": ["2", "3"]
    }
  }
}

// ftdna_haplo/data/ytree.json - YFull дерево  
{
  "id": "A0-T",
  "snps": "M91,P97",
  "formed": 200000,
  "tmrca": 200000,
  "children": [...]
}
```

## 🚀 Запуск системы

### Режим разработки

#### Запуск всех сервисов
```bash
npm run dev

# Эквивалентно:
# pm2 start ecosystem.config.js
```

#### Проверка статуса сервисов
```bash
# Список активных процессов
npm run status
# или
pm2 list

# Логи всех сервисов
npm run logs
# или  
pm2 logs

# Логи конкретного сервиса
pm2 logs str-matcher-2
pm2 logs ftdna-haplo-2
pm2 logs haplo-client
```

#### Запуск отдельных компонентов
```bash
# Только STR Matcher
cd str-matcher
npm run dev
# Доступен на http://localhost:3000

# Только FTDNA Haplo API
cd ftdna_haplo
node server/server.js
# Доступен на http://localhost:9003

# Только Haplo Client
cd ftdna_haplo/client  
npm run dev
# Доступен на http://localhost:5173
```

### Режим продакшена

#### Сборка проекта
```bash
npm run build

# Выполняется:
# - npm run build:str-matcher (Next.js build)
# - npm run build:haplo-client (Vite build)
```

#### Запуск продакшена
```bash
npm start

# Эквивалентно:
# cross-env NODE_ENV=production pm2 start ecosystem.config.js
```

## 📊 Проверка работоспособности

### Health Checks

#### Автоматическая проверка
```bash
npm run health-check
```

#### Ручная проверка
```bash
# STR Matcher
curl http://localhost:9002
# Должен вернуть HTML страницу

# FTDNA Haplo API
curl http://localhost:9003/api/health
# Должен вернуть: {"status":"ok","timestamp":"2025-08-01T..."}

# Haplo Client
curl http://localhost:5173
# Должен вернуть HTML страницу Vite
```

### Тестирование интеграции

#### Тест API эндпоинтов
```bash
# Поиск гаплогруппы
curl "http://localhost:9003/api/search/R-M269"

# Проверка субкладов
curl -X POST "http://localhost:9003/api/check-subclade" \
  -H "Content-Type: application/json" \
  -d '{"haplogroup":"R-L23","parentHaplogroup":"R-M269"}'

# Автодополнение
curl "http://localhost:9003/api/autocomplete?term=R-M"
```

#### Тест интеграции STR Matcher ↔ FTDNA Haplo
```bash
# Открыть STR Matcher
open http://localhost:3000

# 1. Загрузить тестовые данные
# 2. Выполнить поиск по Kit Number
# 3. Применить фильтр по гаплогруппе с включением субкладов
# 4. Кликнуть по гаплогруппе в результатах
# 5. Проверить всплывающее окно с путями FTDNA/YFull
```

## 🐛 Устранение неполадок

### Частые проблемы

#### Порты заняты
```bash
# Проверка занятых портов
netstat -tulpn | grep :3000
netstat -tulpn | grep :9003  
netstat -tulpn | grep :5173

# Освобождение портов
sudo pkill -f "node.*3000"
sudo pkill -f "node.*9003"
sudo pkill -f "node.*5173"

# Или изменить порты в .env
```

#### Node.js версия несовместима
```bash
# Проверка версии
node --version

# Должна быть >= 16.0.0
# Если нет, обновите Node.js
```

#### npm пакеты не установились
```bash
# Очистка кэша npm
npm cache clean --force

# Удаление node_modules и переустановка
rm -rf node_modules package-lock.json
npm install

# То же для подпроектов
cd str-matcher && rm -rf node_modules package-lock.json && npm install && cd ..
cd ftdna_haplo/server && rm -rf node_modules package-lock.json && npm install && cd ../..
cd ftdna_haplo/client && rm -rf node_modules package-lock.json && npm install && cd ../..
```

#### CORS ошибки
```bash
# Проверьте настройки в .env
echo $ALLOWED_ORIGINS

# Убедитесь, что API сервер запущен
curl http://localhost:9003/api/health

# Проверьте next.config.js для правильного proxy
cat str-matcher/next.config.js
```

#### PM2 проблемы
```bash
# Перезапуск PM2
pm2 kill
npm run dev

# Просмотр детального статуса
pm2 show str-matcher-2
pm2 show ftdna-haplo-2
pm2 show haplo-client

# Просмотр логов ошибок
pm2 logs --err
```

### Логи и отладка

#### Где найти логи
```bash
# PM2 логи
~/.pm2/logs/

# Специфичные логи приложений
tail -f ~/.pm2/logs/str-matcher-2-out.log
tail -f ~/.pm2/logs/ftdna-haplo-2-error.log
```

#### Debug режим
```bash
# Включение debug логов
DEBUG=* npm run dev

# Или только для конкретных модулей
DEBUG=express:* npm run dev
```

## 🔒 Безопасность

### Настройки безопасности для продакшена

#### HTTPS сертификаты
```bash
# Генерация self-signed сертификата для тестирования
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Для продакшена используйте Let's Encrypt или коммерческие сертификаты
```

#### Firewall настройки
```bash
# Ubuntu/Debian
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable

# Блокировка прямого доступа к внутренним портам
sudo ufw deny 9002
sudo ufw deny 9003
sudo ufw deny 5173

# Доступ только через reverse proxy (nginx/apache)
```

#### Environment variables
```bash
# Никогда не коммитьте .env файлы с секретными данными
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

## 📦 Docker установка (опционально)

### Dockerfile для STR Matcher
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY str-matcher/package*.json ./
RUN npm ci --only=production

COPY str-matcher .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  str-matcher:
    build:
      context: .
      dockerfile: str-matcher/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://ftdna-haplo:9003/api
    depends_on:
      - ftdna-haplo

  ftdna-haplo:
    build:
      context: .
      dockerfile: ftdna_haplo/Dockerfile
    ports:
      - "9003:9003"
    environment:
      - NODE_ENV=production
      - PORT=9003
    volumes:
      - ./ftdna_haplo/data:/app/data
```

### Запуск через Docker
```bash
# Сборка и запуск
docker-compose up --build

# В фоновом режиме
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

## 🔄 Обновления

### Обновление зависимостей
```bash
# Проверка устаревших пакетов
npm outdated

# Обновление в подпроектах
cd str-matcher && npm update && cd ..
cd ftdna_haplo/server && npm update && cd ../..
cd ftdna_haplo/client && npm update && cd ../..
```

### Миграции и изменения
```bash
# При обновлении версии проекта
git pull origin main
npm install
npm run build
npm run migrate  # если есть миграции
npm restart
```

---

*Руководство по установке обновлено: Август 2025*