@echo off
cd /d "%~dp0"
set PORT=4174
start "" "http://127.0.0.1:%PORT%/admin.html"
node admin-server.mjs
pause
