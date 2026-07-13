@echo off
setlocal EnableDelayedExpansion
title Dream Mantra CRM - Finish Atlas Setup
cd /d "%~dp0"

set "ATLAS=C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe"

echo.
echo ============================================
echo   Finish MongoDB Atlas Setup
echo ============================================
echo.
echo Account: dreammantra1@gmail.com ONLY
echo Do NOT use eshalohiya45@gmail.com
echo.

"%ATLAS%" auth whoami >nul 2>&1
if errorlevel 1 (
  echo Atlas CLI not logged in. Starting login...
  echo Complete browser auth, then return HERE when you see "Your account is ready."
  echo.
  "%ATLAS%" auth login
)

echo.
echo Logged in as:
"%ATLAS%" auth whoami
echo.

for /f "tokens=*" %%i in ('"%ATLAS%" projects list -o json 2^>nul') do set PROJECTS_JSON=%%i

echo Fetching projects and Cluster0...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\finish-atlas-setup.ps1"
if errorlevel 1 goto fail

echo.
echo Restarting backend with Atlas connection...
cd backend
call npm run migrate:mongo
if errorlevel 1 goto fail

echo.
echo ============================================
echo   Atlas connected! Run: npm run dev
echo ============================================
goto end

:fail
echo.
echo Setup failed. Check the CMD window for errors.
pause
exit /b 1

:end
pause
