# Исправление сетевой ошибки в компоненте HaplogroupInfoPopup

**Дата:** 13.04.2025
**Время:** 10:08

## Обнаруженная проблема

В компоненте `MatchesTable.tsx` (который содержит вложенный компонент `HaplogroupInfoPopup`) обнаружена сетевая ошибка при выполнении запроса к API:

```
AxiosError: Network Error
Source: src\components\str-matcher\MatchesTable.tsx (47:26) @ async HaplogroupInfoPopup.useEffect.fetchHaplogroupPath
```

Ошибка возникала при вызове API:
```javascript
const response = await apiClient.get(`/haplogroup-path/${encodeURIComponent(haplogroup)}`);
```

## Внесённые изменения

### 1. Исправлена конфигурация API клиента (`src/utils/axios.ts`)

**До:**
```javascript
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9003/api';
```

**После:**
```javascript
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
```

Это изменение обеспечивает корректную работу с API через Next.js API Routes, в соответствии с переменными окружения в `.env.local`.

### 2. Улучшена обработка ошибок в `MatchesTable.tsx`

- Добавлена инициализация состояния загрузки при запросе
- Добавлено логирование для диагностики
- Улучшена обработка ошибок с более детальной информацией

```javascript
try {
  setLoading(true);
  setError(null);
  console.log(`Отправка запроса к API: /haplogroup-path/${encodeURIComponent(haplogroup)}`);
  
  const response = await apiClient.get(`/haplogroup-path/${encodeURIComponent(haplogroup)}`);
  // ...
  console.log('Получен ответ от API:', response.data);
  // ...
} catch (err) {
  console.error('Error fetching haplogroup path:', err);
  // Добавляем более подробную информацию об ошибке
  let errorMessage = 'Failed to load haplogroup path';
  if (err instanceof Error) {
    errorMessage = `${err.message} (${err.name})`;
  } else if (typeof err === 'object' && err !== null) {
    errorMessage = JSON.stringify(err);
  }
  setError(errorMessage);
} finally {
  setLoading(false);
}
```

### 3. Улучшен API прокси-маршрутизатор в Next.js (`src/app/api/[...path]/route.ts`)

- Добавлена обработка ошибок с детальной информацией
- Добавлены таймауты для запросов (10 секунд)
- Добавлены дополнительные заголовки для запросов
- Добавлено логирование для отладки
- Улучшена обработка ответов от API

Эти изменения улучшают обработку ошибок и делают код более устойчивым к проблемам сетевых подключений.

## Рекомендации по дальнейшей отладке

1. Убедиться, что бэкенд-сервер `ftdna-haplo-2` запущен на порту 9003
2. Проверить наличие и доступность данных в директории `ftdna_haplo/data`
3. При необходимости перезапустить все сервисы через PM2: `pm2 start ecosystem.config.js`

## Примечания

Изменения позволяют лучше диагностировать причину проблемы и должны устранить сетевую ошибку за счет улучшения конфигурации и обработки исключений. Если проблема сохраняется, следует проверить сетевую доступность API-сервера и корректность настроек в `.env.local`.
