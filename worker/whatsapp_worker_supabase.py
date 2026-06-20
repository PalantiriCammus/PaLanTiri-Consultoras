# -*- coding: utf-8 -*-
"""
WhatsApp Worker (versión Supabase)
==================================
Worker local que envía mensajes de WhatsApp usando Selenium + WhatsApp Web,
leyendo la cola de mensajes desde Supabase (tabla whatsapp_messages) en lugar
de la base SQLite local de Django.

La webapp (alojada en Vercel) inserta filas en la tabla; este script corre en
tu PC (o cualquier máquina con Chrome) y las despacha.

Requisitos:
    pip install -r requirements.txt

Variables de entorno necesarias (o archivo .env junto a este script):
    SUPABASE_URL=https://tuproyecto.supabase.co
    SUPABASE_SERVICE_KEY=eyJ...   (Service Role Key — NUNCA exponerla en la web)

Uso:
    python whatsapp_worker_supabase.py
"""

import os
import time
from datetime import datetime, timezone
from urllib.parse import quote

import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager

# Carga opcional de .env si python-dotenv está instalado
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise SystemExit(
        "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_KEY. "
        "Definilas como variables de entorno o en un archivo .env."
    )

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

TABLA = f"{SUPABASE_URL}/rest/v1/whatsapp_messages"


def obtener_pendientes():
    """Trae hasta 20 mensajes pendientes, los más antiguos primero."""
    r = requests.get(
        TABLA,
        headers=HEADERS,
        params={
            "estado": "eq.pendiente",
            "order": "fecha_creacion.asc",
            "limit": "20",
            "select": "id,numero_destino,mensaje",
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def actualizar_mensaje(msg_id, datos):
    """Actualiza el estado de un mensaje en la cola."""
    r = requests.patch(
        TABLA,
        headers=HEADERS,
        params={"id": f"eq.{msg_id}"},
        json=datos,
        timeout=30,
    )
    r.raise_for_status()


def ahora_iso():
    return datetime.now(timezone.utc).isoformat()


def enviar_mensaje(driver, msg):
    numero = msg["numero_destino"].replace("+", "").replace(" ", "")
    texto_codificado = quote(msg["mensaje"])

    try:
        # Enlace directo: abre el chat con el mensaje pre-rellenado
        driver.get(f"https://web.whatsapp.com/send?phone={numero}&text={texto_codificado}")

        boton_enviar = WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.XPATH, '//span[@data-icon="send"]'))
        )
        time.sleep(1)
        boton_enviar.click()
        time.sleep(2)  # esperar a que el mensaje salga

        actualizar_mensaje(msg["id"], {"estado": "enviado", "fecha_envio": ahora_iso()})
        print(f"✅ WhatsApp enviado a {numero}")

    except Exception as e:
        print(f"❌ Error al enviar a {numero}: {e}")
        actualizar_mensaje(msg["id"], {"estado": "error", "error_log": str(e)})


def start_whatsapp_worker():
    print("Iniciando WhatsApp Worker (Supabase)...")

    options = webdriver.ChromeOptions()
    # Sesión persistente para no escanear el QR cada vez
    user_data_dir = os.path.join(os.getcwd(), "whatsapp_session")
    options.add_argument(f"user-data-dir={user_data_dir}")

    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
    except Exception as e:
        print(f"Error al iniciar Chrome: {e}")
        return

    print("Abriendo WhatsApp Web. Escaneá el código QR si es necesario...")
    driver.get("https://web.whatsapp.com")

    try:
        WebDriverWait(driver, 60).until(
            EC.presence_of_element_located(
                (By.XPATH, '//div[@contenteditable="true"][@data-tab="3"]')
            )
        )
        print("¡WhatsApp Web está listo!")
    except TimeoutException:
        print("Tiempo de espera agotado para el escaneo del QR.")

    while True:
        try:
            for msg in obtener_pendientes():
                enviar_mensaje(driver, msg)
                time.sleep(5)  # pausa anti-detección de bot
        except requests.RequestException as e:
            print(f"Error de conexión con Supabase: {e}")
        except Exception as e:
            print(f"Error en el bucle principal: {e}")

        time.sleep(10)  # intervalo entre consultas a la cola


if __name__ == "__main__":
    start_whatsapp_worker()
