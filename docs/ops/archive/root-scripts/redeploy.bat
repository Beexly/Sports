@echo off
REM redeploy.bat — force-trigger Vercel by pushing an empty commit.
REM Use this when Vercel hasn't picked up a previous push.

cd /d "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"

echo Forcing Vercel deploy via empty commit... > redeploy.log
echo. >> redeploy.log

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path .git\index.lock) { Remove-Item .git\index.lock -Force }; git commit --allow-empty -m 'chore: trigger vercel deploy with new env vars and production branch' 2>&1 | Tee-Object -FilePath redeploy.log -Append; git push origin sports-intelligence-os-phase-9-ci 2>&1 | Tee-Object -FilePath redeploy.log -Append"

echo. >> redeploy.log
echo === Exit code: %ERRORLEVEL% === >> redeploy.log

echo.
echo === Redeploy push complete. Press any key to close. ===
pause >nul
