# Инструкция по загрузке DNA Utils Universal на GitHub

## Шаг 1: Установка Git (если не установлен)

### Windows:
- Скачайте с https://git-scm.com/download/win
- Установите с настройками по умолчанию

### macOS:
```bash
# Через Homebrew
brew install git

# Или скачайте с https://git-scm.com/download/mac
```

### Linux:
```bash
# Ubuntu/Debian
sudo apt-get install git

# CentOS/RHEL
sudo yum install git
```

## Шаг 2: Создание репозитория на GitHub

1. Зайдите на https://github.com
2. Нажмите "New repository" (зеленая кнопка)
3. Заполните поля:
   - **Repository name**: `DNA-utils-universal`
   - **Description**: `Комплексная система для анализа Y-STR маркеров и гаплогрупп Y-хромосомы`
   - **Visibility**: Public (или Private по желанию)
   - **НЕ ВЫБИРАЙТЕ**: "Initialize this repository with a README" (у нас уже есть файлы)
4. Нажмите "Create repository"

## Шаг 3: Инициализация локального репозитория

Откройте терминал в папке проекта (`c:\projects\DNA-utils-universal\`) и выполните:

```bash
# Инициализация Git репозитория
git init

# Настройка пользователя (если не настроено глобально)
git config user.name "Ваше Имя"
git config user.email "your.email@example.com"

# Добавление всех файлов в staging area
git add .

# Первый коммит
git commit -m "Initial commit: DNA Utils Universal project setup

- Add comprehensive README.md with project description
- Add .gitignore for Node.js, Python, and development files  
- Add LICENSE (MIT)
- Add CONTRIBUTING.md with development guidelines
- Add .env.example template
- Include all project components: str-matcher, ftdna_haplo, ystr_predictor"

# Переименование главной ветки в main (современная практика)
git branch -M main

# Добавление remote origin (замените yourusername на ваш GitHub username)
git remote add origin https://github.com/yourusername/DNA-utils-universal.git

# Загрузка на GitHub
git push -u origin main
```

## Шаг 4: Проверка загрузки

1. Обновите страницу вашего репозитория на GitHub
2. Убедитесь, что все файлы загрузились
3. Проверьте, что README.md отображается на главной странице

## Шаг 5: Настройка дополнительных возможностей GitHub

### GitHub Pages (для документации)
1. Перейдите в Settings репозитория
2. Прокрутите до раздела "Pages"
3. Выберите источник: "Deploy from a branch"
4. Выберите ветку: `main` и папку `/docs` (если хотите опубликовать документацию)

### GitHub Actions (для CI/CD)
Создайте файл `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
    
    - name: Run tests
      run: npm test
```

### Topics и Description
1. Перейдите на главную страницу репозитория
2. Нажмите на иконку "шестеренка" рядом с "About"
3. Добавьте описание и темы:
   - **Description**: `Comprehensive Y-STR markers and Y-haplogroup analysis system`
   - **Topics**: `dna`, `genetics`, `y-str`, `haplogroup`, `genealogy`, `nextjs`, `react`, `nodejs`, `python`, `machine-learning`

## Шаг 6: Создание релиза

После загрузки кода:

1. Перейдите во вкладку "Releases"
2. Нажмите "Create a new release"
3. Заполните:
   - **Tag version**: `v1.0.0`
   - **Release title**: `DNA Utils Universal v1.0.0 - Initial Release`
   - **Description**: Опишите основные возможности первой версии

## Шаг 7: Документация и Wiki

### Обновление README.md
Замените placeholder-ы в README.md:
- `yourusername` → ваш GitHub username
- `your.email@example.com` → ваш email
- `Ваше имя` → ваше имя

### Создание Wiki (опционально)
1. Перейдите во вкладку "Wiki" 
2. Создайте страницы для детальной документации:
   - Installation Guide
   - API Reference  
   - Troubleshooting
   - Development Setup

## Шаг 8: Безопасность

### Secrets
Если в проекте есть секретные данные:
1. Перейдите в Settings → Secrets and variables → Actions
2. Добавьте необходимые секреты (API ключи, пароли БД и т.д.)

### .env файл
Убедитесь, что `.env` файл добавлен в `.gitignore` и НЕ загружается на GitHub.

## Готово! 🎉

Ваш проект теперь на GitHub и готов для:
- Совместной разработки
- Issue tracking
- Pull requests
- Continuous Integration
- Публичного использования

## Полезные команды Git

```bash
# Проверка статуса
git status

# Добавление изменений
git add .
git commit -m "Описание изменений"
git push

# Создание новой ветки
git checkout -b feature/new-feature

# Переключение между ветками
git checkout main
git checkout feature/new-feature

# Слияние ветки
git checkout main
git merge feature/new-feature

# Обновление с удаленного репозитория
git pull origin main
```
