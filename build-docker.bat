@echo off
REM Build script for WenKey Docker image (Windows)
REM This script builds the Docker image with proper environment variables

echo Building WenKey Docker Image
echo ================================
echo.

REM Check if .env file exists
if not exist .env (
    echo Error: .env file not found!
    echo Please copy .env.example to .env and fill in your Supabase credentials
    echo.
    echo   copy .env.example .env
    echo.
    exit /b 1
)

REM Load environment variables from .env
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" (
        set "%%a=%%b"
    )
)

REM Verify required variables are set
if "%VITE_SUPABASE_URL%"=="" (
    echo Error: VITE_SUPABASE_URL is not set in .env
    exit /b 1
)

if "%VITE_SUPABASE_PUBLISHABLE_KEY%"=="" (
    echo Error: VITE_SUPABASE_PUBLISHABLE_KEY is not set in .env
    exit /b 1
)

echo Environment variables loaded
echo Supabase URL: %VITE_SUPABASE_URL%
echo.

REM Build Docker image
echo Building Docker image...
docker build ^
  --build-arg VITE_SUPABASE_URL=%VITE_SUPABASE_URL% ^
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=%VITE_SUPABASE_PUBLISHABLE_KEY% ^
  -t wenkey:latest ^
  .

if %ERRORLEVEL% neq 0 (
    echo.
    echo Build failed!
    exit /b 1
)

echo.
echo Docker image built successfully!
echo.
echo To run the container:
echo   docker run -d -p 80:80 --name wenkey-app wenkey:latest
echo.
echo To stop the container:
echo   docker stop wenkey-app ^&^& docker rm wenkey-app
