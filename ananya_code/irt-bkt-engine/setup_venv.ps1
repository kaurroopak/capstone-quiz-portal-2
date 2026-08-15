# ──────────────────────────────────────────────────────────────
#  Synapse Physics — Python Virtual Environment Setup
#  Run this ONCE from the ananya_code/irt-bkt-engine/ directory
# ──────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Synapse Physics — Python ML Engine Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create virtual environment
Write-Host "[1/3] Creating Python virtual environment..." -ForegroundColor Yellow
python -m venv venv
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not found or venv creation failed." -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://python.org" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Virtual environment created at .\venv\" -ForegroundColor Green

# Step 2: Activate venv
Write-Host ""
Write-Host "[2/3] Activating virtual environment..." -ForegroundColor Yellow

$activateScript = Join-Path $PSScriptRoot "venv\Scripts\Activate.ps1"
if (-not (Test-Path $activateScript)) {
    Write-Host "ERROR: Activation script not found at $activateScript" -ForegroundColor Red
    exit 1
}

# If ExecutionPolicy blocks activation, fix it automatically
$policy = Get-ExecutionPolicy -Scope CurrentUser
if ($policy -eq "Restricted" -or $policy -eq "AllSigned") {
    Write-Host "  Updating ExecutionPolicy to RemoteSigned for CurrentUser..." -ForegroundColor Yellow
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
}

& $activateScript
Write-Host "  ✅ Virtual environment activated" -ForegroundColor Green

# Step 3: Install all Python dependencies
Write-Host ""
Write-Host "[3/3] Installing Python dependencies..." -ForegroundColor Yellow
$reqFile = Join-Path $PSScriptRoot "requirements_combined.txt"
pip install -r $reqFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pip install failed. Check your internet connection." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  ✅ Python ML Engine ready!" -ForegroundColor Green
Write-Host ""
Write-Host "  To start the ML engine, run:" -ForegroundColor White
Write-Host "  cd bkt-engine\demo_ui" -ForegroundColor Cyan
Write-Host "  uvicorn backend:app --host 0.0.0.0 --port 8080 --reload" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
