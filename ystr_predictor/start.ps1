# c:\projects\DNA-utils-universal\ystr_predictor\start.ps1

$curDir = $PSScriptRoot
$filePath = Join-Path $curDir "DB.csv"
$boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"

$headers = @{
    "Content-Type" = "multipart/form-data; boundary=$boundary"
}

$fileContent = [System.IO.File]::ReadAllBytes($filePath)
$fileContentBase64 = [System.Convert]::ToBase64String($fileContent)

$body = @"
--$boundary
Content-Disposition: form-data; name="file"; filename="DB.csv"
Content-Type: text/csv
Content-Transfer-Encoding: base64

$fileContentBase64
--$boundary--
"@

# Проверка существования файла
if (!(Test-Path $filePath)) {
    Write-Host "File not found: $filePath"
    exit 1
}

# Проверка сервиса
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9004/docs" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "Service is running"
    }
} catch {
    Write-Host "Service is not running. Starting service..."
    Start-Process -FilePath "python" -ArgumentList "-m uvicorn app:app --host 0.0.0.0 --port 9004" -NoNewWindow
    Start-Sleep -Seconds 5
}

# Отправка файла
try {
    $response = Invoke-RestMethod -Uri "http://localhost:9004/api/train/csv" -Method Post -Headers $headers -Body $body
    Write-Host "Upload successful. Response:"
    $response | ConvertTo-Json
} catch {
    Write-Host "Error uploading file: $_"
}