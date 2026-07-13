@echo off
title MongoDB Atlas Login - dreammantra1@gmail.com ONLY
cd /d "%~dp0"
set "ATLAS=C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe"

echo.
echo ============================================================
echo   MongoDB Atlas - Device Code Login
echo ============================================================
echo.
echo  USE ONLY: dreammantra1@gmail.com
echo  DO NOT USE: eshalohiya45@gmail.com
echo.
echo  Browser opens automatically. Approve within 3 minutes.
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\atlas-login-and-connect.ps1"
if errorlevel 1 (
  echo Login failed or timed out.
  pause
  exit /b 1
)

echo.
echo Next: restart backend with npm run dev
pause
