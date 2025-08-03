# ⚠️ ВАЖНО: Персонализация проекта перед загрузкой на GitHub

Перед загрузкой проекта на GitHub обязательно замените следующие placeholder-ы:

## 📝 В README.md:
- `yourusername` → ваш GitHub username
- `your.email@example.com` → ваш реальный email  
- `Ваше имя` → ваше настоящее имя

## 📝 В GITHUB_SETUP.md:
- `yourusername` → ваш GitHub username
- `your.email@example.com` → ваш реальный email
- `Ваше Имя` → ваше настоящее имя

## 📝 В .github/ISSUE_TEMPLATE/config.yml:
- `yourusername` → ваш GitHub username

## 📝 В CHANGELOG.md:
- `yourusername` → ваш GitHub username

## 🔍 Команда для быстрого поиска:
В PowerShell/CMD выполните в корне проекта:
```bash
findstr /r /s "yourusername\|your\.email@example\.com\|Ваше имя" *.md .github\*.* 2>nul
```

В Git Bash/Linux:
```bash
grep -r "yourusername\|your\.email@example\.com\|Ваше имя" *.md .github/ 2>/dev/null
```

## ✅ Готово к загрузке!
После замены всех placeholder-ов ваш проект готов к загрузке на GitHub.

Следуйте инструкциям в файле GITHUB_SETUP.md
