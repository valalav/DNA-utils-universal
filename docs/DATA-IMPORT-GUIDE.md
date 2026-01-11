# 🗄️ Data Management Guide

## 🌐 Overview
DNA-utils-universal использует **гибридную модель данных**:
1.  **Client-Side (Frontend):** Пользователь загружает файлы локально в браузер (IndexedDB). Данные не покидают устройство.
2.  **Server-Side (Backend):** Глобальная база данных (PostgreSQL) для поиска по миллионам профилей.

---

## 🖥️ 1. Client-Side Data (Frontend)
*Для обычных пользователей*

### Поддерживаемые форматы
*   **CSV (FTDNA/YFull):** Стандартный формат экспорта.
*   **Repo JSON:** Специальный формат репозиториев проекта.

### Как загрузить данные
1.  Откройте приложение (`http://localhost:3000` или `https://...`).
2.  Нажмите **"Load/Manage Database"** в навигации.
3.  Перетащите файлы CSV в область загрузки.
4.  Данные сохраняются в `IndexedDB` браузера и доступны оффлайн.

### Ограничения
*   **Память:** Рекомендуется до 500k профилей (ограничение браузера).
*   **Персистентность:** Данные удаляются при очистке кэша браузера.

---

## ☁️ 2. Server-Side Data (Backend)
*Для администраторов сервера*

Бэкенд использует PostgreSQL для хранения глобальной базы данных. Импорт осуществляется через скрипты или API.

### 📋 Prerequisites: Schema Setup
Так как автоматические миграции могут быть отключены, убедитесь, что схема базы данных инициализирована.

**Required SQL Schema:**
```sql
-- Таблица метаданных импорта
CREATE TABLE IF NOT EXISTS haplogroup_databases (
    id SERIAL PRIMARY KEY,
    haplogroup VARCHAR(50) NOT NULL UNIQUE,
    total_profiles INTEGER DEFAULT 0,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    source_file VARCHAR(255),
    avg_markers DECIMAL(5,2),
    file_size_mb DECIMAL(10,2),
    description TEXT
);

-- Таблица профилей (упрощено)
CREATE TABLE IF NOT EXISTS ystr_profiles (
    id SERIAL PRIMARY KEY,
    kit_number VARCHAR(50),
    name VARCHAR(255),
    country VARCHAR(100),
    haplogroup VARCHAR(50),
    markers JSONB, -- Хранение маркеров как JSON
    str_values INTEGER[], -- Для GIST индекса (опционально)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Функция для batch insert (используется скриптами)
CREATE OR REPLACE FUNCTION bulk_insert_profiles(profiles_json JSONB)
RETURNS TABLE(bulk_insert_profiles BIGINT) AS $$
DECLARE
    count BIGINT;
BEGIN
    WITH inserted AS (
        INSERT INTO ystr_profiles (kit_number, name, country, haplogroup, markers)
        SELECT 
            p->>'kit_number',
            p->>'name',
            p->>'country',
            p->>'haplogroup',
            p->'markers'
        FROM jsonb_array_elements(profiles_json) AS p
        ON CONFLICT DO NOTHING -- Игнорировать дубликаты
        RETURNING 1
    )
    SELECT COUNT(*) INTO count FROM inserted;
    
    RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql;
```

### 🚀 Import Procedures

#### Метод А: Automatic Load (Default DB)
Загружает данные из публичного Google Sheet "Database 2024".

```bash
# Использование npm скрипта
npm run db:load

# Прямой вызов
node backend/scripts/load-default-db.js
```
*Требует настройки `MASTER_API_KEY` в `.env`.*

#### Метод Б: Manual CSV Import
Импорт локальных CSV файлов напрямую в PostgreSQL (High Performance).

**Команда:**
```bash
node backend/scripts/import-csv-to-postgres.js \
  --file=./downloads/I.csv \
  --haplogroup=I \
  --batch-size=5000
```

**Опции:**
*   `--file`: Путь к файлу.
*   `--haplogroup`: Присваиваемая гаплогруппа.
*   `--dry-run`: Прогон без записи в БД.
*   `--skip-validation`: Отключение проверок валидности.

---

## 🛠️ Troubleshooting

### "Connection Refused" (Backend)
Убедитесь, что PostgreSQL запущен и переменные окружения в `backend/.env` корректны (`DATABASE_URL` или `DB_HOST`/`DB_USER`...).

### "Api Key Missing" (Load Default)
Скрипт `load-default-db.js` использует API endpoint. Убедитесь, что сервер запущен (`npm run dev`) и ключ `MASTER_API_KEY` совпадает в клиенте и сервере.

### "Table not found"
Выполните SQL Schema setup вручную через `psql`, если миграции не отработали.

---

## 🔥 Appendix: Mass Import Script (Bash)

Для импорта всех баз одной командой используйте этот скрипт:

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
  echo "Importing $haplogroup from $file..."
  
  node scripts/import-csv-to-postgres.js \
    --file="../scripts/downloads/$file" \
    --haplogroup="$haplogroup"
    
  if [ $? -ne 0 ]; then
    echo "❌ Failed to import $haplogroup"
    exit 1
  fi
done

echo "✅ All databases imported!"
```

## 🧪 Verification
Проверьте статус импорта через SQL:

```sql
SELECT haplogroup, total_profiles, status, loaded_at 
FROM haplogroup_databases 
ORDER BY total_profiles DESC;
```

