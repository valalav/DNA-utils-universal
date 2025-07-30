# Changelog

Все значимые изменения в проекте DNA Utils Universal документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
и проект придерживается [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Подготовка к следующему релизу

### Changed
- 

### Fixed
- 

### Removed
- 

## [1.0.0] - 2025-01-30

### Added
- 🚀 **Первый релиз DNA Utils Universal**
- 🧬 **STR Matcher**: Next.js приложение для сравнения Y-STR маркеров
  - Поиск совпадений STR-профилей
  - Интерактивная таблица результатов
  - Фильтрация по различным критериям
  - Визуализация данных
- 🌳 **FTDNA Haplo Service**: Система анализа гаплогрупп
  - Node.js API сервер для работы с данными FTDNA и YFull
  - React клиент с современным интерфейсом
  - Унифицированный поиск по гаплогруппам и SNP
  - Построение и визуализация филогенетических деревьев
  - Проверка субкладов и автодополнение
  - Статистический анализ и географическое распределение
- 🤖 **Y-STR Predictor**: Python модель машинного обучения
  - Предсказание гаплогрупп на основе STR-профилей
  - Интеграция с основной системой
- 📚 **Документация**:
  - Подробный README.md с описанием архитектуры
  - Техническая документация компонентов
  - Инструкции по установке и развертыванию
  - API документация
  - Гайд по участию в проекте (CONTRIBUTING.md)
- 🔧 **Инфраструктура**:
  - PM2 конфигурация для управления процессами
  - Docker поддержка
  - GitHub Actions CI/CD pipeline
  - ESLint и Prettier конфигурация
  - Компонентная архитектура с микросервисами
- 🛡️ **Безопасность и качество**:
  - Всесторонний .gitignore
  - Переменные окружения для конфигурации
  - CORS настройки
  - Валидация входных данных
- 🎨 **UI/UX**:
  - Современный дизайн с Tailwind CSS
  - Адаптивная верстка
  - Интерактивные компоненты
  - Темная/светлая тема (где применимо)

### Technical Details
- **Frontend**: React 18, Next.js 14, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js, CORS middleware
- **ML**: Python, scikit-learn, pandas, numpy
- **Build Tools**: npm, webpack, PM2
- **Development**: ESLint, Prettier, GitHub Actions
- **Data Sources**: FTDNA, YFull integration

### Architecture
```
DNA-utils-universal/
├── str-matcher/          # Port 9002
├── ftdna_haplo/
│   ├── server/          # Port 9003 
│   └── client/          # Port 5173
├── ystr_predictor/      # Python ML
└── docs/               # Documentation
```

---

## Типы изменений

- `Added` для новых функций
- `Changed` для изменений в существующей функциональности
- `Deprecated` для функций, которые скоро будут удалены
- `Removed` для удаленных функций
- `Fixed` для исправления ошибок
- `Security` для уязвимостей

## Ссылки

- [1.0.0]: https://github.com/valalav/DNA-utils-universal/releases/tag/v1.0.0
- [Unreleased]: https://github.com/valalav/DNA-utils-universal/compare/v1.0.0...HEAD
