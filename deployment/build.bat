@echo off
echo Building LGU Chat Application...

REM Install ALL dependencies first (including dev dependencies for build)
echo Installing all dependencies...
call npm install

REM Install tsx globally if not available
echo Checking tsx installation...
tsx --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Installing tsx globally...
    call npm install -g tsx
)

REM Initialize database
echo Initializing database...
call npm run init-db

REM Build Next.js application
echo Building Next.js application...
call npm run build

REM Now install only production dependencies
echo Installing production dependencies only...
call npm ci --only=production

REM Copy server file for IIS
echo Preparing for IIS deployment...
copy server.ts server.js

echo Build completed successfully!
echo Ready for IIS deployment.
pause 