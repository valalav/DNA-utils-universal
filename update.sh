#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

cd /opt/DNA-utils-universal

echo "Останавливаем сервисы..."
pm2 stop all

echo "Обновляем код..."
# Fetch the latest changes from the remote repository
git fetch origin

# Forcefully reset the local branch to match the remote 'main' branch.
# This will discard any local changes or commits on the server.
git reset --hard origin/main

# Remove any untracked files and directories.
# This cleans up files that are not part of the repository (like .env files or logs).
git clean -df

echo "Обновляем зависимости..."
npm install
cd str-matcher && npm install && cd ..
cd ftdna_haplo/client && npm install && cd ../..
cd ftdna_haplo/server && npm install && cd ../..

echo "Перезапускаем сервисы..."
npm run dev

echo "Обновление завершено!"