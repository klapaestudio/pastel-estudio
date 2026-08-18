# Pastel Studio — inicia el servidor local (Windows)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
& ".venv\Scripts\pip.exe" install -q -r requirements.txt

$env:PORT = "5002"
Start-Process "http://localhost:5002"
& ".venv\Scripts\python.exe" "api\app.py"
