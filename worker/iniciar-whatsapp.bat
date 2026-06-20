@echo off
title Worker de WhatsApp - Palantiri
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python no esta instalado. Descargalo de https://www.python.org/downloads/
    echo         y marca "Add Python to PATH" durante la instalacion.
    pause
    exit /b 1
)

if not exist ".deps_instaladas" (
    echo Instalando dependencias por primera vez...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
    echo ok> .deps_instaladas
)

echo.
echo ============================================================
echo  Worker de WhatsApp
echo  - La primera vez: escanea el QR con el telefono de la
echo    consultora (WhatsApp ^> Dispositivos vinculados).
echo  - Deja esta ventana y el Chrome abiertos mientras quieras
echo    que se envien mensajes.
echo  - Para detenerlo: cerra esta ventana.
echo ============================================================
echo.

python whatsapp_worker_supabase.py
pause
