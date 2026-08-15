# ╔══════════════════════════════════════════════════════════════════════╗
# ║  Synapse Physics — One-Click Startup Launcher                        ║
# ║  Starts all 3 services: Backend (5000) · ML Engine (8080) · UI (5173)║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# HOW TO RUN:
#   Right-click start.ps1 → "Run with PowerShell"
#   OR in PowerShell:  .\start.ps1

$rootDir = $PSScriptRoot
$backendDir  = Join-Path $rootDir "tanya_code\capstone-quiz-portal\backend"
$frontendDir = Join-Path $rootDir "tanya_code\capstone-quiz-portal\frontend"
$mlDir       = Join-Path $rootDir "ananya_code\irt-bkt-engine\bkt-engine\demo_ui"
$mlRoot      = Join-Path $rootDir "ananya_code\irt-bkt-engine"

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀  Synapse Physics — Starting Up    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Helper: Check if a port is already in use ──────────────────────────
function Test-Port($port) {
    $conn = netstat -ano | findstr ":$port "
    return ($null -ne $conn -and $conn -ne "")
}

# ── Check node_modules exist ──────────────────────────────────────────
if (-not (Test-Path (Join-Path $backendDir "node_modules"))) {
    Write-Host "⚠️  Backend node_modules missing. Running npm install..." -ForegroundColor Yellow
    Push-Location $backendDir
    npm install
    Pop-Location
}

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "⚠️  Frontend node_modules missing. Running npm install..." -ForegroundColor Yellow
    Push-Location $frontendDir
    npm install
    Pop-Location
}

# ── Check Prisma DB exists ────────────────────────────────────────────
$dbPath = Join-Path $backendDir "dev.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "⚠️  Database not found. Running Prisma migrate + seed..." -ForegroundColor Yellow
    Push-Location $backendDir
    npx prisma migrate dev --name init
    npx ts-node prisma/seed.ts
    Pop-Location
    Write-Host "  ✅ Database ready" -ForegroundColor Green
}

# ── Check Python venv ─────────────────────────────────────────────────
$venvActivate = Join-Path $mlRoot "venv\Scripts\Activate.ps1"
if (-not (Test-Path $venvActivate)) {
    Write-Host "⚠️  Python venv not found. Running setup..." -ForegroundColor Yellow
    Push-Location $mlRoot
    python -m venv venv
    & (Join-Path $mlRoot "venv\Scripts\Activate.ps1")
    pip install -r requirements_combined.txt
    Pop-Location
}

Write-Host ""
Write-Host "Starting all 3 services in separate windows..." -ForegroundColor White
Write-Host ""

# ── Window 1: Node.js Backend (Port 5000) ─────────────────────────────
if (Test-Port 5000) {
    Write-Host "  ℹ️  Port 5000 already in use — skipping backend start" -ForegroundColor DarkYellow
} else {
    Write-Host "  🟢 Starting Node.js Backend on port 5000..." -ForegroundColor Green
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$backendDir'; Write-Host '🟢 BACKEND — Express + Prisma (Port 5000)' -ForegroundColor Green; npm run dev"
    ) -WindowStyle Normal
}

Start-Sleep -Seconds 2

# ── Window 2: Python ML Engine (Port 8080) ────────────────────────────
if (Test-Port 8080) {
    Write-Host "  ℹ️  Port 8080 already in use — skipping ML engine start" -ForegroundColor DarkYellow
} else {
    Write-Host "  🔵 Starting Python ML Engine on port 8080..." -ForegroundColor Blue
    $mlActivate  = Join-Path $mlRoot "venv\Scripts\Activate.ps1"
    $mlStartCmd  = "Set-Location '$mlDir'; . '$mlActivate'; Write-Host '🔵 ML ENGINE — FastAPI IRT+BKT (Port 8080)' -ForegroundColor Blue; uvicorn backend:app --host 0.0.0.0 --port 8080 --reload"
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        $mlStartCmd
    ) -WindowStyle Normal
}

Start-Sleep -Seconds 2

# ── Window 3: React Frontend (Port 5173) ──────────────────────────────
if (Test-Port 5173) {
    Write-Host "  ℹ️  Port 5173 already in use — skipping frontend start" -ForegroundColor DarkYellow
} else {
    Write-Host "  🟡 Starting React Frontend on port 5173..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$frontendDir'; Write-Host '🟡 FRONTEND — React + Vite (Port 5173)' -ForegroundColor Yellow; npm run dev"
    ) -WindowStyle Normal
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅  All services starting!                   ║" -ForegroundColor Green
Write-Host "║                                                ║" -ForegroundColor Green
Write-Host "║   🌐 App:      http://localhost:5173           ║" -ForegroundColor Green
Write-Host "║   ⚙️  Backend:  http://localhost:5000/health   ║" -ForegroundColor Green
Write-Host "║   🐍 ML Docs:  http://localhost:8080/docs      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Opening app in browser in 8 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 8
Start-Process "http://localhost:5173"
