@echo off
cd /d "C:\projects\DNA-utils-universal"
echo Building str-matcher...
cd str-matcher
call npm run build
cd ..
echo Starting application...
call npm start
pause
