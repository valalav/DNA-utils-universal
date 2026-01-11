# Task: ftdna-haplo-app Stability Improvements

## Выполнено

### 1. Graceful shutdown handlers
**Файл:** `ftdna_haplo/server/server.js` (строки 456-473)

Добавлено:
- Сохранение инстанса сервера: `const server = app.listen(...)`
- Обработчики SIGTERM/SIGINT для корректного завершения
- Таймаут 10 секунд для принудительного завершения

```javascript
function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 2. Улучшенный health endpoint
**Файл:** `ftdna_haplo/server/server.js` (строки 124-141)

Было:
```javascript
res.json({ status: 'ok', timestamp: new Date().toISOString() });
```

Стало:
```javascript
{
    status: haplogroupService ? 'ok' : 'degraded',
    timestamp: '...',
    service: {
        haplogroupService: 'available' | 'unavailable'
    },
    memory: {
        heapUsed: 'XXX MB',
        heapTotal: 'XXX MB',
        rss: 'XXX MB'
    }
}
```
- HTTP 200 если сервис доступен
- HTTP 503 если сервис недоступен (degraded)

## РЕШЕНО: ftdna-haplo-app постоянные рестарты

**Причина**: Конфликт портов между systemd сервисом (`ftdna-haplo.service`) и PM2 процессом (`ftdna-haplo-app`). Оба пытались использовать порт 9003.

**Решение**:
- PM2 процесс `ftdna-haplo-app` остановлен
- Systemd сервис `ftdna-haplo.service` продолжает работать на порту 9003
- Сервис отвечает корректно: `curl http://localhost:9003/api/health` → `{"status":"ok"}`

**Если нужно использовать PM2 вместо systemd**:
```bash
sudo systemctl stop ftdna-haplo.service
sudo systemctl disable ftdna-haplo.service
pm2 start /home/valalav/DNA-utils-universal/ftdna_haplo/ecosystem.config.js
pm2 save
```

---

## ВАЖНО: Изменения НЕ применены к production!

**Проблема:** Production сервисы запускаются через systemd из `/root/dna-utils/`, а не из `/home/valalav/DNA-utils-universal/`.

**Текущая архитектура:**
| Сервис | Порт | Путь (systemd) |
|--------|------|----------------|
| ftdna-haplo.service | 9003 | /root/dna-utils/ftdna_haplo |
| ystr-backend.service | 9005 | /root/dna-utils/backend |
| str-matcher.service | 3000 | /root/dna-utils/str-matcher |

**PM2 (development):**
| Сервис | Порт | Статус |
|--------|------|--------|
| backend | 9004 | ✅ online |

**Systemd (production):**
| Сервис | Порт | Статус |
|--------|------|--------|
| ftdna-haplo.service | 9003 | ✅ active |
| ystr-backend.service | 9005 | ✅ active |
| str-matcher.service | 3000 | ✅ active |

## Исправлено 2026-01-10

1. **ftdna-haplo-app рестарты** - конфликт портов между systemd и PM2, PM2 процесс удалён
2. **str-matcher PM2 errored** - неправильный путь в PM2, процесс удалён (используется systemd)
3. **backend PM2 unhealthy** - неправильный cwd, dotenv не находил .env, исправлено перезапуском с --cwd

## Чтобы применить изменения

```bash
# Скопировать изменения в production
sudo cp /home/valalav/DNA-utils-universal/ftdna_haplo/server/server.js /root/dna-utils/ftdna_haplo/server/

# Перезапустить сервис
sudo systemctl restart ftdna-haplo

# Проверить
curl http://localhost:9003/api/health
```
