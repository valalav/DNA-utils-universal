#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
REPO_URL="https://github.com/username/DNA-utils-universal"
BRANCH="main"
APP_DIR="$(dirname "$(realpath "$0")")"
LOG_FILE="$APP_DIR/update.log"

ENV_FILES=(
  ".env"
  ".env.production"
  "ftdna_haplo/.env.development"
  "ftdna_haplo/.env.production"
  "ftdna_haplo/client/.env.development"
  "str-matcher/.env.local"
)
# --- End Configuration ---

# Initialize logging
exec > >(tee -a "$LOG_FILE") 2>&1
echo "=== Обновление начато: $(date) ==="

# --- Dependency checks ---
check_dependency() {
  if ! command -v "$1" &> /dev/null; then
    echo "ОШИБКА: $1 не установлен!" | tee -a "$LOG_FILE"
    exit 1
  fi
}

echo "Проверяем зависимости..."
check_dependency git
check_dependency node
check_dependency npm
check_dependency pm2
# --- End Dependency checks ---

cd "$APP_DIR"

# --- Repository setup ---
if [ ! -d ".git" ]; then
  echo "Клонируем репозиторий $REPO_URL..."
  git clone "$REPO_URL" .
  git checkout "$BRANCH"
else
  echo "Обновляем код из репозитория..."
  git fetch origin
  echo "Сбрасываем локальные изменения до состояния origin/$BRANCH..."
  git reset --hard "origin/$BRANCH"
  echo "Очищаем репозиторий от неотслеживаемых файлов..."
  git clean -df
fi
# --- End Repository setup ---

echo "Останавливаем PM2 демон и все процессы..."
pm2 kill || echo "PM2 не был запущен, продолжаем..."

# --- Backup .env files ---
echo "Создаем резервные копии .env файлов..."
TEMP_BACKUP_DIR=$(mktemp -d)
for env_file in "${ENV_FILES[@]}"; do
  if [ -f "$env_file" ]; then
    echo "  - Резервное копирование $env_file"
    mkdir -p "$TEMP_BACKUP_DIR/$(dirname "$env_file")"
    cp "$env_file" "$TEMP_BACKUP_DIR/$env_file"
  else
    echo "  - Файл $env_file не найден, пропуск."
  fi
done
# --- End Backup ---

# --- Restore .env files ---
echo "Восстанавливаем .env файлы из резервной копии..."
for env_file in "${ENV_FILES[@]}"; do
  if [ -f "$TEMP_BACKUP_DIR/$env_file" ]; then
    echo "  - Восстановление $env_file"
    cp "$TEMP_BACKUP_DIR/$env_file" "$env_file"
  fi
done
rm -rf "$TEMP_BACKUP_DIR"
# --- End Restore ---

echo "Устанавливаем/обновляем все зависимости..."
npm install
cd str-matcher && npm install && cd ..
cd ftdna_haplo/client && npm install && cd ../..
cd ftdna_haplo/server && npm install && cd ../..

echo "Собираем продакшн-сборку фронтенд приложений..."
npm run build

echo "Перезапускаем все сервисы через PM2..."
npm start

echo "Проверяем статус сервисов через 5 секунд..."
sleep 5
pm2 list

echo "=== Обновление успешно завершено: $(date) ==="
echo "Лог сохранен в: $LOG_FILE"