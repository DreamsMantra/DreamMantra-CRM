@echo off
title Dream Mantra CRM - MongoDB Atlas Auto Setup
cd /d "%~dp0\backend"

echo.
echo ============================================
echo   MongoDB Atlas Setup - Dream Mantra CRM
echo ============================================
echo.
echo IMPORTANT: Log in with dreammantra1@gmail.com ONLY
echo   Do NOT use eshalohiya45@gmail.com or other accounts.
echo.
echo Opening MongoDB Atlas API Keys page...
echo   1. Organization -^> Access Manager -^> API Keys
echo   2. Create API Key (Organization Project Creator)
echo   3. Copy Public Key + Private Key
echo.
start https://cloud.mongodb.com/v2#/org/6a3bb94aad4ee8ca653e0ca3/access/apiKeys
timeout /t 2 >nul

set /p ATLAS_PUBLIC_KEY=Paste ATLAS PUBLIC KEY: 
set /p ATLAS_PRIVATE_KEY=Paste ATLAS PRIVATE KEY: 

echo.
echo Setting up Cluster0, database user, network access...
echo.

call npm install
call npm run setup:atlas
if errorlevel 1 goto fail

echo.
echo Migrating CRM data to MongoDB...
call npm run migrate:mongo
if errorlevel 1 goto fail

echo.
echo ============================================
echo   Done! Restart backend: npm run dev
echo ============================================
goto end

:fail
echo.
echo Setup failed. See MONGODB_ATLAS_SETUP.md for manual steps.
pause
exit /b 1

:end
pause
