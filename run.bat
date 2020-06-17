@echo off
IF exist node_modules (npm run start) ELSE ( npm i && npm run start)
pause
exit