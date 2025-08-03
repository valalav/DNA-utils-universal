# 🧬 DNA-utils-universal

> **Комплексная система для анализа Y-STR маркеров и гаплогрупп Y-хромосомы**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org/)

---

## 🎯 О проекте

DNA-utils-universal — это микросервисная система для генеалогических исследований Y-ДНК, которая объединяет:

- **🔍 STR Matcher** - Поиск и анализ совпадений Y-STR профилей
- **🌳 FTDNA Haplo** - Работа с филогенетическими деревьями гаплогрупп  
- **🤖 YSTr Predictor** - ML предсказания гаплогрупп (в разработке)

## ⚡ Быстрый старт

```bash
# Клонирование
git clone https://github.com/valalav/DNA-utils-universal.git
cd DNA-utils-universal

# Установка зависимостей
npm install

# Запуск всех сервисов
npm run dev
```

**Приложение будет доступно:**
- STR Matcher: http://localhost:9002
- FTDNA Haplo API: http://localhost:9003
- FTDNA Haplo UI: http://localhost:5173

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                 DNA-utils-universal                     │
├─────────────────┬─────────────────────┬─────────────────┤
│   STR Matcher   │    FTDNA Haplo     │  YSTr Predictor │
│ (Next.js :9002) │                    │   (Python ML)   │
│                 │  ┌─────────────────┐ │                │
│ ┌─────────────┐ │  │ Server :9003    │ │ ┌─────────────┐ │
│ │React Frontend│ │  │ (Node.js API)  │ │ │  FastAPI    │ │
│ │Web Workers  │ │  └─────────────────┘ │ │(в разработке)│ │
│ └─────────────┘ │  ┌─────────────────┐ │ └─────────────┘ │
│                 │  │ Client :5173    │ │                │
│                 │  │ (React/Vite)    │ │                │
│                 │  └─────────────────┘ │                │
└─────────────────┴─────────────────────┴─────────────────┘
```

## 📚 Документация

### 🎯 Главная точка входа
**➡️ [DOCUMENTATION INDEX](docs/INDEX.md) ⬅️**

*Вся документация проекта доступна через единый индекс с навигацией по разделам.*

### 🚀 Быстрые ссылки
- **[Установка и настройка](docs/guides/setup.md)** - Детальные инструкции
- **[Руководство пользователя](docs/USER_GUIDE.md)** - Как использовать систему
- **[Руководство разработчика](docs/DEVELOPMENT.md)** - Разработка и расширение
- **[API справочник](docs/API_REFERENCE.md)** - Документация API

## 🤝 Участие в проекте

Мы приветствуем вклад в развитие проекта! См. [CONTRIBUTING.md](docs/CONTRIBUTING.md) для получения инструкций.

## 📈 История изменений

Полная история релизов доступна в [CHANGELOG.md](CHANGELOG.md).

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для подробностей.

---

**💡 Для получения полной информации о проекте перейдите к [📚 DOCUMENTATION INDEX](docs/INDEX.md)**
