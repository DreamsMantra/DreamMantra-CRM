@echo off

title Dream Mantra CRM - Atlas Auto Connect

cd /d "%~dp0"



echo.

echo ============================================

echo   Atlas Auto Connect

echo ============================================

echo.

echo Account: dreammantra1@gmail.com ONLY

echo.

echo A browser tab will open. Sign in and approve within 3 minutes.

echo.



powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\atlas-login-and-connect.ps1"

if errorlevel 1 goto fail



echo.

echo Restarting backend...

cd backend

start "Dream Mantra Backend" cmd /c "npm run dev"

cd ..

echo.

echo Done. Open http://localhost:5174

goto end



:fail

echo.

echo Login timed out or failed. Run this file again and complete browser auth faster.

pause

exit /b 1



:end

pause

