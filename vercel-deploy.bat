@echo off
REM vercel-deploy.bat — bypass GitHub webhook by deploying directly via Vercel CLI.
REM Run this when Vercel isn't auto-deploying despite git push succeeding.

cd /d "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"

echo === Galaxy Sports Edge Vercel CLI deploy ===
echo.
echo Step 1: Install Vercel CLI globally if missing...
where vercel >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   Installing vercel...
    call npm install -g vercel
) else (
    echo   Vercel CLI already installed.
)
echo.

echo Step 2: Link to the existing sports-web project...
echo   If this is the first time, browser will open for login.
call vercel link --yes --project sports-web --scope pick-pilot-s-projects
echo.

echo Step 3: Deploy to production...
call vercel --prod --yes --no-clipboard
echo.

echo === Deploy complete (or in progress). Check vercel.com dashboard. ===
pause
