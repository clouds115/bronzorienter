# Starts both the FastAPI Backend (port 8000) and Next.js Frontend (port 3000)
$env:Path = "C:\Users\claud\scoop\apps\nodejs-lts\current\bin;C:\Users\claud\scoop\apps\nodejs-lts\current;C:\Users\claud\scoop\shims;" + $env:Path

Write-Host "Starting FastAPI Sinnoh Backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "Starting Next.js Frontend on http://localhost:3000 ..." -ForegroundColor Green
Set-Location "$PSScriptRoot\frontend"
npm run dev
