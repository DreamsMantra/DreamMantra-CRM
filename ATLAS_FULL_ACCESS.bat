@echo off
title Atlas Access - Auto Connect CRM
cd /d "%~dp0"
set "ATLAS=C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe"

echo Waiting for Atlas login (dreammantra1@gmail.com)...
echo If not logged in, complete ATLAS_LOGIN.bat in another window.
echo.

:wait
"%ATLAS%" auth whoami >nul 2>&1
if errorlevel 1 (
  timeout /t 5 >nul
  goto wait
)

echo Logged in! Verifying access...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\verify-atlas-access.ps1"
if errorlevel 1 exit /b 1

echo.
echo Configuring CRM for Cluster0...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\finish-atlas-setup.ps1"
if errorlevel 1 exit /b 1

cd backend
call npm run migrate:mongo
echo.
echo DONE - Atlas connected. Restart: npm run dev
pause
