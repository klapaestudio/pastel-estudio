#!/bin/bash
# Pastel Studio — inicia el servidor local (Mac/Linux)
cd "$(dirname "$0")"

if [ ! -d venv ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

export PORT=5002
open "http://localhost:5002" 2>/dev/null || true
gunicorn --workers 2 --bind 0.0.0.0:5002 --timeout 120 "api.app:app"
