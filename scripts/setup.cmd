@echo off
REM Wrapper so cmd.exe users can just run `scripts\setup.cmd`.
REM Delegates to the real PowerShell setup script.
setlocal
set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%setup.ps1" %*
exit /b %ERRORLEVEL%
