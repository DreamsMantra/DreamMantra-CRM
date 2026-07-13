@echo off
title Dream Mantra CRM - Atlas Login (dreammantra1@gmail.com ONLY)
cd /d "%~dp0"

echo.
echo ============================================
echo   MongoDB Atlas Login
echo ============================================
echo.
echo Use ONLY: dreammantra1@gmail.com
echo Do NOT use: eshalohiya45@gmail.com
echo.
echo Step 1: Sign out of any other Atlas account in your browser.
echo Step 2: Complete login in the window that opens.
echo.

"C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe" auth logout 2>nul
start https://account.mongodb.com/account/login
echo Waiting 3 seconds...
timeout /t 3 >nul

"C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe" auth login

echo.
echo Verifying account...
"C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe" auth whoami
echo.
pause
