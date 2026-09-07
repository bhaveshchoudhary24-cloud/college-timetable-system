@echo off
title College Timetable System
echo ==========================================
echo  College Timetable System Startup Script
echo ==========================================

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed! 
    echo Please install Node.js from https://nodejs.org/ before continuing.
    pause
    exit /b
)

:: Check if the script is running inside a ZIP archive temp folder
echo %~dp0 | findstr /i "Temp" >nul
if %ERRORLEVEL% equ 0 (
    echo [ERROR] You are running this file directly from the ZIP!
    echo Please EXTRACT the folder to your Desktop or Documents first, THEN run start.bat.
    pause
    exit /b
)

echo.
echo Starting Backend Server...
start "Backend API Server" cmd /k "cd backend && npm install && npx prisma generate && npm run dev"

echo.
echo Starting Frontend Server...
start "Frontend UI Server" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Wait 10-15 seconds for the installations to finish, then your browser will open.
echo.
echo Press any key to open the dashboard...
pause >nul

start http://localhost:3000
