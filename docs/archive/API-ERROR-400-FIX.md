# Исправление ошибки HTTP 400 в Backend API

## Дата: 2025-10-07

## Проблема

При попытке выполнить поиск совпадений через frontend получали ошибку:
```
Error: HTTP error! status: 400
Source: src\hooks\useBackendAPI.ts (79:15)
```

## Диагностика

### 1. Проверка backend API напрямую через curl

```bash
# Базовый запрос - РАБОТАЕТ
curl -X POST http://localhost:9004/api/profiles/find-matches \
  -H "Content-Type: application/json" \
  -d '{"markers":{"DYS393":"13"},"maxDistance":25,"maxResults":50}'

# С фильтром по гаплогруппе - РАБОТАЕТ
curl -X POST http://localhost:9004/api/profiles/find-matches \
  -H "Content-Type: application/json" \
  -d '{"markers":{"DYS393":"13"},"maxDistance":25,"maxResults":50,"haplogroupFilter":"R-M269"}'
```

**Вывод:** Backend API работает корректно при прямых запросах.

### 2. Анализ схемы валидации

Файл: `backend/routes/profiles.js` (строки 26-34)

```javascript
const findMatchesSchema = Joi.object({
  markers: Joi.object().required().min(1),
  maxDistance: Joi.number().integer().min(0).max(100).default(25),
  maxResults: Joi.number().integer().min(1).max(10000).default(1000),
  markerCount: Joi.number().integer().valid(12, 25, 37, 67, 111).default(37),
  haplogroupFilter: Joi.string().allow('', null),
  includeSubclades: Joi.boolean().default(false),
  useCache: Joi.boolean().default(true)
});
```

Файл: `backend/middleware/validation.js` (строка 9)

```javascript
const { error, value } = schema.validate(data, {
  allowUnknown: false,  // ← КРИТИЧНО: отклоняет любые неизвестные поля
  stripUnknown: true,
  abortEarly: false
});
```

### 3. Анализ frontend запроса

Файл: `str-matcher/src/hooks/useBackendAPI.ts` (строки 61-66)

**ДО ИСПРАВЛЕНИЯ:**
```typescript
const apiParams = {
  markers: params.markers,
  maxDistance: params.maxDistance ?? 25,
  maxResults: params.limit ?? 1000,
  haplogroupFilter: params.haplogroupFilter  // ← может быть undefined
};
```

**Проблема:** Если `haplogroupFilter` имеет значение `undefined`, оно будет отправлено в JSON как поле со значением `undefined`, что не проходит валидацию.

## Решение

### Изменения в `str-matcher/src/hooks/useBackendAPI.ts`

#### 1. Улучшенная обработка параметров (строки 58-75)

```typescript
console.log("🔍 Frontend sending params:", params);

// Transform params to match API expectations
const apiParams = {
  markers: params.markers,
  maxDistance: params.maxDistance ?? 25,
  maxResults: params.limit ?? 1000,
  haplogroupFilter: params.haplogroupFilter || undefined
};

// Remove undefined values to avoid validation issues
Object.keys(apiParams).forEach(key => {
  if (apiParams[key as keyof typeof apiParams] === undefined) {
    delete apiParams[key as keyof typeof apiParams];
  }
});

console.log("🔍 Frontend sending apiParams:", JSON.stringify(apiParams, null, 2));
```

**Ключевой момент:** Удаление всех полей со значением `undefined` перед отправкой на backend.

#### 2. Улучшенная обработка ошибок (строки 78-83)

```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => null);
  const errorMessage = errorData?.error || errorData?.details?.[0]?.message || `HTTP error! status: ${response.status}`;
  console.error('API Error:', errorData);
  throw new Error(errorMessage);
}
```

**Преимущества:**
- Извлекает детали ошибки валидации из ответа backend
- Логирует полную информацию об ошибке в консоль
- Показывает пользователю понятное сообщение об ошибке

## Архитектурные выводы

### 1. Проблема с `allowUnknown: false`

**Плюсы:**
- Строгая валидация предотвращает отправку лишних данных
- Помогает ловить ошибки в API контракте

**Минусы:**
- Требует точного соответствия полей между frontend и backend
- `undefined` значения в JavaScript становятся проблемой

**Альтернативные решения:**

a) **Изменить валидацию на backend** (НЕ РЕКОМЕНДУЕТСЯ для production):
```javascript
const { error, value } = schema.validate(data, {
  allowUnknown: false,
  stripUnknown: true,  // Автоматически удалять неизвестные поля
  abortEarly: false
});
```

b) **Использовать TypeScript строгую типизацию** (РЕКОМЕНДУЕТСЯ):
```typescript
interface BackendSearchParams {
  markers: Record<string, string>;
  maxDistance?: number;
  maxResults?: number;
  haplogroupFilter?: string;  // Должно быть string | undefined, не undefined
}
```

### 2. Best Practices для API запросов

1. **Всегда удалять undefined поля перед отправкой:**
```typescript
const cleanParams = Object.fromEntries(
  Object.entries(params).filter(([_, v]) => v !== undefined)
);
```

2. **Логировать запросы в development режиме:**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('API Request:', endpoint, params);
}
```

3. **Обрабатывать детали ошибок валидации:**
```typescript
if (errorData?.details) {
  errorData.details.forEach(detail => {
    console.error(`Validation error in ${detail.field}: ${detail.message}`);
  });
}
```

## Тестирование

После применения исправлений:

1. ✅ Поиск по номеру кита работает
2. ✅ Поиск по маркерам работает
3. ✅ Фильтр по гаплогруппе работает
4. ✅ Детальные сообщения об ошибках выводятся в консоль

## Связанные файлы

- `backend/routes/profiles.js` - схема валидации
- `backend/middleware/validation.js` - middleware валидации
- `str-matcher/src/hooks/useBackendAPI.ts` - frontend API hook
- `str-matcher/src/components/str-matcher/BackendSearch.tsx` - компонент поиска

## Уроки на будущее

1. **При работе с Joi валидацией всегда учитывать `allowUnknown: false`**
2. **Удалять undefined поля перед отправкой JSON**
3. **Логировать запросы и ответы для упрощения отладки**
4. **Извлекать детали ошибок валидации для показа пользователю**
