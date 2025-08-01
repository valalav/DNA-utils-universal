# Взаимодействие компонентов системы DNA-utils-universal

## Общая архитектура

DNA-utils-universal состоит из трех основных компонентов, взаимодействующих между собой через API и общие структуры данных:

1. **str-matcher** - Интерактивный веб-интерфейс для анализа STR-маркеров
2. **ftdna_haplo** - Сервис для работы с гаплогруппами и филогенетическими деревьями
3. **ystr_predictor** - Сервис машинного обучения для предсказания гаплогрупп

## Схема взаимодействия компонентов

```
+----------------------------------------------+
|                  str-matcher                  |
|  (Next.js, React, TypeScript, Tailwind CSS)   |
+------+-----------------------------------+----+
       |                                   |
       | API запросы                       | API запросы
       | (анализ гаплогрупп)              | (предсказание гаплогрупп)
       v                                   v
+------+-------------------+   +-----------+--------------+
|      ftdna_haplo         |   |      ystr_predictor      |
| (Node.js, Express, API)  |   |  (Python, FastAPI, ML)   |
+--------------------------+   +--------------------------+
```

## Потоки данных

### str-matcher → ftdna_haplo
- Запросы информации о гаплогруппах
- Получение филогенетических путей
- Проверка отношений между гаплогруппами (родитель/потомок)
- Получение метаданных для визуализации

### str-matcher → ystr_predictor
- Отправка STR-профилей для предсказания гаплогрупп
- Получение предсказаний и вероятностей
- Получение информации о важности маркеров

### ftdna_haplo → ystr_predictor
- Обмен информацией о структуре гаплогрупп
- Синхронизация филогенетических деревьев для улучшения предсказаний

## Ключевые точки интеграции

### 1. API Endpoints

**ftdna_haplo API:**
- `/api/haplogroup/{id}` - Получение информации о гаплогруппе
- `/api/search/{term}` - Поиск гаплогрупп
- `/api/tree` - Получение структуры филогенетического дерева
- `/api/check-subclade` - Проверка отношений между гаплогруппами

**ystr_predictor API:**
- `/api/predict` - Предсказание гаплогруппы по STR-маркерам
- `/api/train/csv` - Обучение модели на новых данных
- `/api/important-markers` - Получение важных маркеров для предсказания

### 2. Общие форматы данных

**STR-профиль:**
```json
{
  "kitNumber": "123456",
  "name": "John Doe",
  "haplogroup": "R-M198",
  "country": "USA",
  "markers": {
    "DYS393": "13",
    "DYS390": "24",
    "DYS19": "14",
    "DYS391": "11",
    ...
  }
}
```

**Информация о гаплогруппе:**
```json
{
  "id": "R-M198",
  "ftdna_path": ["R", "R1", "R1a", "R1a1", "R-M198"],
  "yfull_path": ["R", "R1", "R1a", "R1a1", "R1a1a", "R-M198"],
  "age": 4500,
  "confidence": 95,
  "parent": "R1a1",
  "children": ["R-M417", "R-M560"]
}
```

**Предсказание гаплогруппы:**
```json
{
  "path_predictions": [
    {
      "level": 0,
      "predictions": [
        {
          "haplogroup": "R",
          "probability": 0.95
        },
        ...
      ]
    },
    ...
  ]
}
```

## Алгоритм работы системы

1. Пользователь загружает STR-данные в str-matcher
2. str-matcher обрабатывает данные и выполняет одно из действий:
   - Находит совпадения в локальной базе данных
   - Отправляет запрос в ystr_predictor для предсказания гаплогруппы
   - Запрашивает дополнительную информацию о гаплогруппах из ftdna_haplo
3. Результаты анализа и предсказаний визуализируются в интерфейсе
4. Пользователь может взаимодействовать с результатами:
   - Просматривать детали гаплогрупп
   - Анализировать редкие маркеры
   - Экспортировать результаты

## Технические особенности интеграции

- Использование RESTful API для взаимодействия между компонентами
- Асинхронная обработка запросов для повышения производительности
- Кэширование результатов для частых запросов
- Обработка ошибок и отказоустойчивость
- Версионирование API для обеспечения совместимости при обновлениях
