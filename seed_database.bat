@echo off
title Seed Database
echo ==========================================
echo  College Timetable System - Data Reset
echo ==========================================
echo.
echo This will wipe your current database and inject all the 
echo original structural data (TE/BE/ME subjects, faculty, rooms).
echo.
echo Press CTRL+C to cancel, or press any key to continue...
pause >nul

cd backend
call npm install
call npx prisma generate
call npx prisma db push --accept-data-loss
call npx tsx prisma/seed.ts

echo.
echo Database has been fully reset and seeded!
pause
