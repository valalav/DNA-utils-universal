@echo off
cd /d "C:\projects\DNA-utils-universal\str-matcher"
echo Current directory: %CD%
echo.
echo Running npm run build...
call npm run build
echo.
echo Build result: %ERRORLEVEL%
pause
