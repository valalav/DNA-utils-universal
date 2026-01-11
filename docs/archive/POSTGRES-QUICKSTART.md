# PostgreSQL Integration - Quick Start Guide

## 🎯 Цель

Быстрый старт для импорта Y-DNA профилей в PostgreSQL и начала работы с backend поиском.

---

## ✅ Что уже готово

1. **Backend сервер** (`/backend/`) - Express API на порту 9004
2. **PostgreSQL схема** (`/database/schema.sql`) - таблицы и функции
3. **Frontend компонент** (`/str-matcher/src/components/str-matcher/BackendSearch.tsx`) - UI для поиска
4. **CSV данные** (`/scripts/downloads/`) - 9 файлов, ~120,000 профилей
5. **Скрипт импорта** (`/backend/scripts/import-csv-to-postgres.js`) - автоматизированный импорт

---

## 🚀 Быстрый старт (5 шагов)

### Шаг 1: Подготовка PostgreSQL

```bash
# Создать базу данных
psql -U postgres -c "CREATE DATABASE ystr_matcher;"

# Применить схему
psql -U postgres -d ystr_matcher -f database/schema.sql

# Создать таблицу метаданных
psql -U postgres -d ystr_matcher -f database/haplogroup-databases-table.sql

# Проверить
psql -U postgres -d ystr_matcher -c "\dt"
```

**Ожидаемый результат:**
```
List of relations
Schema | Name                     | Type  | Owner
-------|--------------------------|-------|--------
public | ystr_profiles           | table | postgres
public | haplogroups             | table | postgres
public | haplogroup_databases    | table | postgres
```

### Шаг 2: Тестовый импорт (Genopoisk - 40 профилей)

```bash
# Перейти в директорию backend
cd backend

# Установить зависимости (если не установлены)
npm install

# Запустить dry-run (без импорта в БД)
node scripts/import-csv-to-postgres.js \
  --file=../scripts/downloads/Genopoisk.csv \
  --haplogroup=Mixed \
  --dry-run

# Реальный импорт
node scripts/import-csv-to-postgres.js \
  --file=../scripts/downloads/Genopoisk.csv \
  --haplogroup=Mixed
```

**Ожидаемый вывод:**
```
🚀 Starting CSV Import
📄 File: ../scripts/downloads/Genopoisk.csv
🧬 Haplogroup: Mixed
📦 Batch Size: 5000
---
📖 Reading CSV file (0.02 MB)...
🔍 Parsing CSV...
✅ Parsed 42 rows
🔄 Transforming data...
✅ Valid profiles: 40
📊 Final profile count: 40
📈 Average markers per profile: 25.5
---
💾 Starting database import...
📝 Updating haplogroup_databases metadata...
📥 Importing... 40/40 (100.0%)
🔄 Refreshing statistics...
---
✅ Import completed successfully!
📊 Imported: 40 profiles
⏱️  Duration: 2.3s
⚡ Speed: 17 profiles/second
```

### Шаг 3: Проверка данных

```bash
# Проверить количество профилей
psql -U postgres -d ystr_matcher -c "SELECT COUNT(*) FROM ystr_profiles;"

# Проверить метаданные
psql -U postgres -d ystr_matcher -c "SELECT * FROM haplogroup_databases;"

# Проверить пример профиля
psql -U postgres -d ystr_matcher -c "
  SELECT kit_number, name, haplogroup,
         jsonb_object_keys(markers) as marker_count
  FROM ystr_profiles
  LIMIT 1;
"
```

### Шаг 4: Импорт остальных баз

```bash
# G (8k profiles) - ~20 секунд
node scripts/import-csv-to-postgres.js --file=../scripts/downloads/G.csv --haplogroup=G

# J1 (12k profiles) - ~30 секунд
node scripts/import-csv-to-postgres.js --file=../scripts/downloads/J1.csv --haplogroup=J1

# J2 (13k profiles) - ~35 секунд
node scripts/import-csv-to-postgres.js --file=../scripts/downloads/J2.csv --haplogroup=J2

# E (15k profiles) - ~40 секунд
node scripts/import-csv-to-postgres.js --file=../scripts/downloads/E.csv --haplogroup=E

# Others (14k profiles) - ~35 секунд
node scripts/import-csv-to-postgres.js --file=../scripts/downloads/Others.csv --haplogroup=Others

# r1a (18k profiles) - ~50 секунд
node scripts/import-csv-to-postgres.js --file=../scripts/downloads/r1a.csv --haplogroup=R1a

# I (40k profiles) - ~2 минуты
node scripts/import-csv-to-postgres.js --file=../scripts/downloads/I.csv --haplogroup=I
```

**Общее время:** ~5-7 минут для всех баз

### Шаг 5: Запуск backend и тестирование

```bash
# Запустить backend сервер
cd backend
npm run dev

# В другом терминале - тестовый запрос
curl -X POST http://localhost:9004/api/profiles/find-matches \
  -H "Content-Type: application/json" \
  -d '{
    "markers": {"DYS393": "13", "DYS390": "24", "DYS19": "14"},
    "maxDistance": 5,
    "maxResults": 10
  }'
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "matches": [...],
  "total": 10,
  "options": {
    "maxDistance": 5,
    "maxResults": 10,
    "markerCount": 37
  }
}
```

---

## 📊 Итоговая статистика

После импорта всех баз:

```bash
psql -U postgres -d ystr_matcher <<EOF
SELECT
    haplogroup,
    total_profiles,
    avg_markers,
    file_size_mb,
    status,
    loaded_at
FROM haplogroup_databases
ORDER BY total_profiles DESC;
EOF
```

**Ожидаемый результат:**
```
haplogroup | total_profiles | avg_markers | file_size_mb | status | loaded_at
-----------|----------------|-------------|--------------|--------|----------------------
I          | ~40,000        | 36.2        | 16.00        | active | 2025-10-04 16:30:00
R1a        | ~18,000        | 38.1        | 6.90         | active | 2025-10-04 16:28:00
E          | ~15,000        | 35.8        | 5.90         | active | 2025-10-04 16:25:00
Others     | ~14,000        | 34.5        | 5.50         | active | 2025-10-04 16:24:00
J2         | ~13,000        | 36.9        | 5.00         | active | 2025-10-04 16:22:00
J1         | ~12,000        | 37.3        | 4.80         | active | 2025-10-04 16:20:00
G          | ~8,000         | 35.1        | 3.20         | active | 2025-10-04 16:18:00
Mixed      | 40             | 25.5        | 0.02         | active | 2025-10-04 16:15:00
```

---

## 🔥 Массовый импорт (скрипт)

Для импорта всех баз одной командой:

```bash
#!/bin/bash
# scripts/import-all-databases.sh

DATABASES=(
  "Genopoisk.csv:Mixed"
  "G.csv:G"
  "J1.csv:J1"
  "J2.csv:J2"
  "E.csv:E"
  "Others.csv:Others"
  "r1a.csv:R1a"
  "I.csv:I"
)

cd backend

for entry in "${DATABASES[@]}"; do
  IFS=':' read -r file haplogroup <<< "$entry"
  echo "================================================"
  echo "Importing $haplogroup from $file"
  echo "================================================"

  node scripts/import-csv-to-postgres.js \
    --file="../scripts/downloads/$file" \
    --haplogroup="$haplogroup"

  if [ $? -ne 0 ]; then
    echo "❌ Failed to import $haplogroup"
    exit 1
  fi
done

echo ""
echo "✅ All databases imported successfully!"
```

**Использование:**
```bash
chmod +x scripts/import-all-databases.sh
./scripts/import-all-databases.sh
```

---

## 🧪 Тестирование производительности

```bash
# Поиск в малой базе (G - 8k profiles)
time curl -X POST http://localhost:9004/api/profiles/find-matches \
  -H "Content-Type: application/json" \
  -d '{"markers": {"DYS393": "13"}, "maxDistance": 5, "haplogroupFilter": "G"}'

# Поиск в большой базе (I - 40k profiles)
time curl -X POST http://localhost:9004/api/profiles/find-matches \
  -H "Content-Type: application/json" \
  -d '{"markers": {"DYS393": "13"}, "maxDistance": 5, "haplogroupFilter": "I"}'
```

**Целевая производительность:**
- G (8k): < 200ms
- I (40k): < 500ms
- Все базы без фильтра (120k): < 1000ms

---

## ⚙️ Оптимизация PostgreSQL

После импорта, оптимизировать БД:

```sql
-- Обновить статистику
VACUUM ANALYZE ystr_profiles;

-- Обновить materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY marker_statistics;

-- Проверить размер индексов
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'ystr_profiles';
```

---

## 🐛 Troubleshooting

### Проблема: "relation ystr_profiles does not exist"

**Решение:**
```bash
psql -U postgres -d ystr_matcher -f database/schema.sql
```

### Проблема: "function bulk_insert_profiles does not exist"

**Решение:** Функция определена в schema.sql, проверить:
```sql
SELECT proname FROM pg_proc WHERE proname = 'bulk_insert_profiles';
```

### Проблема: "out of memory"

**Решение:** Уменьшить batch size:
```bash
node scripts/import-csv-to-postgres.js \
  --file=... \
  --haplogroup=... \
  --batch-size=1000  # вместо 5000
```

### Проблема: Медленный импорт

**Решение:** Отключить триггеры:
```sql
ALTER TABLE ystr_profiles DISABLE TRIGGER ALL;
-- run import
ALTER TABLE ystr_profiles ENABLE TRIGGER ALL;
REFRESH MATERIALIZED VIEW marker_statistics;
```

---

## 📚 Следующие шаги

1. ✅ Импорт данных
2. ⏭️ Тестирование поиска через UI ([http://localhost:3000/backend-search](http://localhost:3000/backend-search))
3. ⏭️ Добавление фильтра по множественным гаплогруппам
4. ⏭️ Партиционирование для ускорения больших запросов
5. ⏭️ UI для управления базами (load/delete)

---

**Дата создания:** 2025-10-04
**Автор:** Claude Code
**Версия:** 1.0
