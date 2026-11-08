@echo off
rem Starts the FastAPI backend (port 8000) and the React frontend (port 5173) in two windows.
setlocal
cd /d "%~dp0"
set "PY=python"
if exist "%~dp0.venv\Scripts\python.exe" set "PY=%~dp0.venv\Scripts\python.exe"
if exist "%~dp0..\.venv\Scripts\python.exe" set "PY=%~dp0..\.venv\Scripts\python.exe"
start "Anvesha backend" /d "%~dp0backend" cmd /k ""%PY%" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
start "Anvesha frontend" /d "%~dp0frontend" cmd /k "npm run dev"
timeout /t 8 >nul
start "" "http://localhost:5173/#/itinerary"
