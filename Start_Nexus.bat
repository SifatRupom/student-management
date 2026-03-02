@echo off
title Nexus Scholar - Student Management System
echo ==========================================
echo    Nexus Scholar is starting...
echo ==========================================
cd /d "%~dp0"
echo.
echo LOGIN FROM PHONE:
echo http://192.168.0.101:3000
echo.
echo Opening Dashboard on PC...
start "" "http://localhost:3000"
echo Starting Server...
node server.js
pause
