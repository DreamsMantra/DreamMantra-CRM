@echo off
title Dream Mantra CRM - Paste Atlas Connection String
cd /d "%~dp0\backend"

echo.
echo ============================================
echo   Connect Atlas (no CLI needed)
echo ============================================
echo.
echo In Atlas: Cluster0 -^> Connect -^> Drivers -^> Node.js
echo Copy the connection string, replace ^<password^> with your DB password.
echo.
echo Example:
echo mongodb+srv://dreammantra_crm:PASSWORD@cluster0.xxxxx.mongodb.net/dreammantra_crm?retryWrites=true^&w=majority
echo.
set /p ATLAS_URI=Paste full MONGODB_URI here: 

if "%ATLAS_URI%"=="" (
  echo No URI entered.
  pause
  exit /b 1
)

powershell -NoProfile -Command ^
  "$p='.env'; $c=Get-Content $p -Raw; if($c -match '(?m)^MONGODB_URI=.*$'){$c=$c -replace '(?m)^MONGODB_URI=.*$',('MONGODB_URI='+$env:ATLAS_URI)}else{$c=$c.TrimEnd()+\"`nMONGODB_URI=$($env:ATLAS_URI)`n\"}; Set-Content $p $c -NoNewline" -ATLAS_URI "%ATLAS_URI%"

echo.
echo Migrating data to Atlas...
call npm run migrate:mongo
if errorlevel 1 goto fail

echo.
echo Done! Restart backend: npm run dev
goto end

:fail
echo Migration failed - check password and network access in Atlas.
pause
exit /b 1

:end
pause
