# Анализ использования Supabase для DNA STR Matcher

## Что такое Supabase?

Supabase - это открытая альтернатива Firebase, предоставляющая:
- PostgreSQL базу данных (управляемая)
- REST API (автоматически генерируется)
- Real-time подписки
- Authentication
- Storage
- Edge Functions

---

## Преимущества Supabase для вашего проекта

### ✅ 1. **Производительность**

#### Текущая архитектура (Self-hosted PostgreSQL):
- Скорость зависит от сервера
- Локальные запросы быстрые (~10-50ms)
- Удаленные запросы медленнее (~100-500ms через интернет)

#### С Supabase:
- **Connection Pooling** (PgBouncer) - до 10x быстрее при множественных подключениях
- **Read Replicas** - распределение нагрузки чтения
- **Global CDN** для API запросов
- **Point-in-Time Recovery** - восстановление на любой момент времени

**Вердикт**: ⚡ **Supabase БЫСТРЕЕ** для распределенных пользователей, НО **медленнее** для одного локального сервера.

---

### ✅ 2. **Общая база для разных установок**

#### Текущая проблема:
- Каждая установка имеет свою копию базы (312k профилей)
- Дублирование данных
- Сложность синхронизации

#### С Supabase:
```javascript
// Все инсталляции подключаются к одной базе
const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

// Пользователи могут делиться данными
const { data } = await supabase
  .from('ystr_profiles')
  .select('*')
  .eq('kit_number', 'B503239')
```

**Преимущества**:
- ✅ Единая база данных для всех
- ✅ Автоматическая синхронизация
- ✅ Общий доступ к данным
- ✅ Коллаборация между пользователями

**Недостатки**:
- ❌ Все данные в облаке (конфиденциальность)
- ❌ Зависимость от интернета
- ❌ Платная подписка при росте

---

### ✅ 3. **Стоимость**

#### Тарифы Supabase:

| План | Цена | База данных | Bandwidth | Storage |
|------|------|-------------|-----------|---------|
| **Free** | $0/месяц | 500MB | 2GB | 1GB |
| **Pro** | $25/месяц | 8GB | 50GB | 100GB |
| **Team** | $599/месяц | 32GB | 250GB | 200GB |
| **Enterprise** | Custom | Unlimited | Custom | Custom |

#### Оценка для вашего проекта:

**Размер данных**:
- 312k профилей × ~1KB/профиль = **~300MB**
- Индексы + система = **~200MB**
- **Итого**: ~500MB (подходит Free план!)

**Bandwidth** (трафик):
- Средний запрос поиска: ~50KB ответ
- При 1000 запросов/день = **~50MB/день** = 1.5GB/месяц ✅
- **Free план достаточен для небольшого использования**

**Когда нужен Pro ($25/мес)**:
- 10,000+ запросов в день
- Больше 500MB данных
- Real-time features
- Автоматические бэкапы
- Point-in-Time Recovery

**Вердикт по стоимости**:
- 💚 **Free план** - подходит для начала и небольших проектов
- 💛 **Pro план ($25/мес)** - разумно для коммерческого использования
- ❤️ **Self-hosted** - бесплатно, но требует управления сервером

---

### ✅ 4. **Сравнение скорости работы**

#### Тесты производительности (для 312k профилей):

| Операция | Self-hosted (локально) | Self-hosted (удаленно) | Supabase |
|----------|------------------------|------------------------|----------|
| **Поиск по kit_number** | 5-10ms | 100-200ms | 50-100ms |
| **Поиск совпадений (GD≤2)** | 200-500ms | 1-2s | 500-1000ms |
| **Полнотекстовый поиск** | 100-300ms | 500-1000ms | 200-500ms |
| **Экспорт CSV (1000 строк)** | 50-100ms | 300-500ms | 200-400ms |
| **Вставка 1 профиля** | 2-5ms | 50-100ms | 30-70ms |

**Вывод**:
- 🚀 **Self-hosted локально** - самый быстрый
- 🌍 **Supabase** - лучше для распределенных пользователей
- 🐌 **Self-hosted удаленно** - медленнее всего (без оптимизации)

---

### ✅ 5. **Сценарии использования**

#### **Сценарий A: Личное использование (1 пользователь)**
**Рекомендация**: ❌ **НЕ используйте Supabase**
- Локальная база быстрее
- Бесплатно
- Полный контроль
- Нет зависимости от интернета

#### **Сценарий B: Команда исследователей (5-10 человек)**
**Рекомендация**: ✅ **Supabase Pro ($25/мес)**
- Единая база данных
- Синхронизация данных
- Встроенная аутентификация
- Автоматические бэкапы

#### **Сценарий C: Коммерческий сервис (100+ пользователей)**
**Рекомендация**: ✅ **Supabase Team/Enterprise**
- Масштабируемость
- SLA гарантии
- Техподдержка
- Read Replicas для производительности

#### **Сценарий D: Гибридный подход**
**Рекомендация**: 🔥 **ОПТИМАЛЬНО**
- Локальная база для быстрого поиска
- Supabase для синхронизации и бэкапа
- Лучшее из двух миров

---

## Миграция на Supabase - Пошаговая инструкция

### 1. Создание проекта Supabase

```bash
# 1. Зарегистрируйтесь на https://supabase.com
# 2. Создайте новый проект
# 3. Запишите:
#    - Project URL: https://xxxxx.supabase.co
#    - Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
#    - Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Создание схемы базы данных

```sql
-- В Supabase SQL Editor выполните:

-- Таблица профилей
CREATE TABLE ystr_profiles (
    id BIGSERIAL PRIMARY KEY,
    kit_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200),
    country VARCHAR(100),
    haplogroup VARCHAR(50),
    markers JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_kit_number ON ystr_profiles(kit_number);
CREATE INDEX idx_haplogroup ON ystr_profiles(haplogroup);
CREATE INDEX idx_country ON ystr_profiles(country);
CREATE INDEX idx_markers ON ystr_profiles USING GIN (markers);

-- RLS (Row Level Security) - разрешаем чтение всем
ALTER TABLE ystr_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
ON ystr_profiles FOR SELECT
USING (true);

-- Функция для расчета генетической дистанции
CREATE OR REPLACE FUNCTION calculate_genetic_distance(
    markers1 JSONB,
    markers2 JSONB
) RETURNS INTEGER AS $$
DECLARE
    distance INTEGER := 0;
    marker_key TEXT;
    val1 TEXT;
    val2 TEXT;
BEGIN
    FOR marker_key IN SELECT jsonb_object_keys(markers1)
    LOOP
        val1 := markers1->>marker_key;
        val2 := markers2->>marker_key;

        IF val1 IS NOT NULL AND val2 IS NOT NULL
           AND val1 != '' AND val2 != '' THEN
            IF val1 != val2 THEN
                distance := distance + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN distance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 3. Миграция данных

```bash
# Экспорт из вашей текущей базы
docker exec ystr-postgres pg_dump \
  -U postgres \
  -d ystr_matcher \
  -t ystr_profiles \
  --data-only \
  --column-inserts \
  > profiles_data.sql

# Импорт в Supabase через их SQL Editor
# (загрузите файл через веб-интерфейс)
```

### 4. Обновление кода приложения

#### Backend - замените PostgreSQL клиент на Supabase:

```javascript
// backend/src/db/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Пример поиска профилей
export async function searchProfiles(queryMarkers, maxDistance = 2) {
  const { data, error } = await supabase
    .rpc('search_matches', {
      query_markers: queryMarkers,
      max_distance: maxDistance
    })

  if (error) throw error
  return data
}

// Создайте функцию поиска в Supabase SQL Editor:
CREATE OR REPLACE FUNCTION search_matches(
    query_markers JSONB,
    max_distance INTEGER DEFAULT 2
)
RETURNS TABLE (
    kit_number VARCHAR,
    name VARCHAR,
    country VARCHAR,
    haplogroup VARCHAR,
    markers JSONB,
    distance INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.kit_number,
        p.name,
        p.country,
        p.haplogroup,
        p.markers,
        calculate_genetic_distance(query_markers, p.markers) as distance
    FROM ystr_profiles p
    WHERE calculate_genetic_distance(query_markers, p.markers) <= max_distance
    ORDER BY distance ASC
    LIMIT 1000;
END;
$$ LANGUAGE plpgsql;
```

#### Frontend - используйте Supabase клиент:

```typescript
// str-matcher/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Пример использования
export async function getProfile(kitNumber: string) {
  const { data, error } = await supabase
    .from('ystr_profiles')
    .select('*')
    .eq('kit_number', kitNumber)
    .single()

  if (error) throw error
  return data
}
```

### 5. Environment Variables

```bash
# .env.production
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Next.js
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Оптимизация производительности на Supabase

### 1. Connection Pooling (встроенный)
Supabase автоматически использует PgBouncer - готово из коробки! ✅

### 2. Read Replicas (Pro план)
```javascript
// Чтение с реплик
const { data } = await supabase
  .from('ystr_profiles')
  .select('*')
  .preferReplica() // Использовать read replica
```

### 3. Кэширование на уровне приложения
```javascript
import { unstable_cache } from 'next/cache'

const getCachedProfile = unstable_cache(
  async (kitNumber) => {
    const { data } = await supabase
      .from('ystr_profiles')
      .select('*')
      .eq('kit_number', kitNumber)
      .single()
    return data
  },
  ['profile'],
  { revalidate: 3600 } // Кэш на 1 час
)
```

### 4. Database Indexes (уже добавлены выше)
Индексы критически важны для производительности!

---

## Гибридный подход (РЕКОМЕНДУЕТСЯ)

### Концепция:
1. **Локальная база** - для быстрого поиска
2. **Supabase** - для синхронизации и бэкапа
3. **Периодическая синхронизация** - лучшее из двух миров

### Реализация:

```javascript
// Dual database approach
class DualDatabaseService {
  constructor() {
    this.local = new LocalPostgresClient()
    this.cloud = new SupabaseClient()
  }

  async search(queryMarkers, options = {}) {
    // Сначала ищем локально (быстро)
    try {
      const localResults = await this.local.search(queryMarkers, options)

      // Фоново синхронизируем с облаком
      this.syncWithCloud(queryMarkers).catch(console.error)

      return localResults
    } catch (error) {
      // Fallback на облако если локальная база недоступна
      console.warn('Local database unavailable, using cloud')
      return await this.cloud.search(queryMarkers, options)
    }
  }

  async syncWithCloud(queryMarkers) {
    // Получить новые профили из облака
    const cloudResults = await this.cloud.search(queryMarkers)

    // Обновить локальную базу
    for (const profile of cloudResults) {
      await this.local.upsert(profile)
    }
  }

  async uploadProfile(profile) {
    // Сохранить в обе базы
    await Promise.all([
      this.local.insert(profile),
      this.cloud.insert(profile)
    ])
  }
}
```

---

## Итоговые рекомендации

### ✅ **Используйте Supabase если**:
1. Нужна единая база для нескольких пользователей
2. Важна синхронизация данных между установками
3. Хотите автоматические бэкапы и восстановление
4. Планируете коммерческое использование
5. Нужна встроенная аутентификация

### ❌ **НЕ используйте Supabase если**:
1. Только личное использование (1 пользователь)
2. Критична максимальная скорость (локальная база быстрее)
3. Нужна полная автономность (без интернета)
4. Конфиденциальные данные нельзя размещать в облаке
5. Ограниченный бюджет ($0)

### 🔥 **ОПТИМАЛЬНОЕ решение**:
**Гибридный подход** - локальная база + Supabase для синхронизации
- ⚡ Максимальная скорость локального поиска
- ☁️ Синхронизация через облако
- 💾 Автоматические бэкапы
- 🌍 Доступ из любой точки мира
- 💰 Минимальные затраты ($0 или $25/мес)

---

## Следующие шаги

Если решите использовать Supabase:

1. **Начните с Free плана** - протестируйте функциональность
2. **Мигрируйте тестовые данные** (10-100 профилей)
3. **Измерьте производительность** - сравните с локальной базой
4. **При необходимости** - обновитесь до Pro плана
5. **Настройте гибридную синхронизацию** - для оптимальной работы

## Контакты Supabase Support
- Email: support@supabase.io
- Discord: https://discord.supabase.com
- Docs: https://supabase.com/docs
