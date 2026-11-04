@echo off
chcp 65001 >nul
title Mercedes dijelovi
cd /d "%~dp0"
python server.py
pause
