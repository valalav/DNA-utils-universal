# Остановка PM2
pm2 delete all

# Убиваем процессы на нужных портах
$ports = @(5173, 9002, 9003)
foreach ($port in $ports) {
    $processId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
    if ($processId) {
        Stop-Process -Id $processId -Force
        Write-Host "Killed process on port $port"
    }
}

# Очистка PM2
pm2 kill
pm2 flush