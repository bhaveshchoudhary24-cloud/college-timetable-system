@echo off
title Clean Project for Sharing
echo ==========================================
echo Cleaning Project to Reduce Zip Size
echo ==========================================
echo.
echo Deleting heavy node_modules folders...
echo (This will make the project much faster to Zip and share!)
echo.

rmdir /s /q backend\node_modules
rmdir /s /q frontend\node_modules
rmdir /s /q frontend\.next

echo.
echo Done! The project is now clean and lightweight.
echo You can now right-click the "college-timetable-system" folder and click "Compress to ZIP file".
pause
