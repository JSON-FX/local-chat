@echo off
echo Building LGU Chat Application...

REM Install dependencies
echo Installing dependencies...
call npm ci --only=production

REM Initialize database
echo Initializing database...
call npm run init-db

REM Build Next.js application
echo Building Next.js application...
call npm run build

REM Copy server file for IIS
echo Preparing for IIS deployment...
copy server.ts server.js

echo Build completed successfully!
echo Ready for IIS deployment.
pause 