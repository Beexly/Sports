@echo off
REM final-deploy.bat — autonomous Vercel CLI deploy with prompts piped to 'n'.
REM This bypasses the GitHub webhook entirely. Run after env vars + DNS are set.

cd /d "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"

echo === Galaxy Sports Edge — final deploy === > final-deploy.log
echo. >> final-deploy.log
echo Starting at %DATE% %TIME% >> final-deploy.log

REM Pipe a bunch of 'n' answers to dismiss any plugin prompts the CLI throws.
(echo n & echo n & echo n & echo n) | vercel --prod --yes --no-clipboard --cwd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports" 2>&1

echo. >> final-deploy.log
echo === Exit code: %ERRORLEVEL% === >> final-deploy.log

echo.
echo === Deploy attempt finished. Read final-deploy.log if anything went wrong. ===
pause
