@echo off
REM Development startup script for Windows
REM Starts both backend and frontend dev servers

echo Starting AI Fitness Tracker Development Environment
echo ==================================================
echo.

REM Start backend in new window
echo Starting Flask backend server...
start "Flask Backend" cmd /k "cd backend && python server.py"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start frontend in new window
echo Starting Vite frontend dev server...
start "Vite Frontend" cmd /k "cd frontend\frontend && npm run dev"

echo.
echo Both servers started in separate windows!
echo   Backend API: http://localhost:5000
echo   Frontend: http://localhost:5173
echo.
pause

