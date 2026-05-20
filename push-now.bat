@echo off
REM push-now.bat — wraps push-now.ps1 with execution-policy bypass + logging.
REM Double-click this file in File Explorer. The PowerShell window opens, runs
REM the push, writes a full log to push-now.log, and stays open at the end so
REM you can read the result.

cd /d "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"

echo Starting PickPilot launch push... > push-now.log
echo. >> push-now.log

powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\push-now.ps1" 2>&1 | powershell.exe -NoProfile -Command "$input | Tee-Object -FilePath push-now.log -Append"

echo. >> push-now.log
echo === Exit code: %ERRORLEVEL% === >> push-now.log

echo.
echo === Push complete. Press any key to close. ===
pause >nul
