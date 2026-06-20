import os
import time
import django
from urllib.parse import quote

# Configurar entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'recurso_humano.settings')
django.setup()

from postulantes.models import WhatsAppMessage
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from django.utils import timezone

def start_whatsapp_worker():
    print("Iniciando WhatsApp Worker...")
    
    # Configurar opciones de Chrome
    options = webdriver.ChromeOptions()
    # Para guardar la sesión de WhatsApp y no tener que escanear QR cada vez
    user_data_dir = os.path.join(os.getcwd(), 'whatsapp_session')
    options.add_argument(f"user-data-dir={user_data_dir}")
    
    # Iniciar navegador
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
    except Exception as e:
        print(f"Error al iniciar Chrome: {e}")
        return

    print("Abriendo WhatsApp Web. Por favor escanea el código QR si es necesario...")
    driver.get("https://web.whatsapp.com")
    
    # Esperar hasta que el elemento de búsqueda esté presente (significa que estamos logueados)
    try:
        WebDriverWait(driver, 60).until(
            EC.presence_of_element_located((By.XPATH, '//div[@contenteditable="true"][@data-tab="3"]'))
        )
        print("¡WhatsApp Web está listo!")
    except TimeoutException:
        print("Tiempo de espera agotado para el escaneo del QR. Asegúrate de escanearlo a tiempo.")
        # Podríamos continuar igual y que el bucle intente de nuevo o cerrarlo.
        
    # Bucle infinito para procesar mensajes
    while True:
        try:
            # Buscar mensajes pendientes
            mensajes_pendientes = WhatsAppMessage.objects.filter(estado='pendiente').order_by('fecha_creacion')
            
            for msg in mensajes_pendientes:
                enviar_mensaje(driver, msg)
                # Pausa para no saturar y ser detectado como bot
                time.sleep(5)
                
        except Exception as e:
            print(f"Error en el bucle principal: {e}")
            
        # Esperar antes de volver a buscar en la BD
        time.sleep(10)

def enviar_mensaje(driver, msg):
    try:
        numero = msg.numero_destino.replace('+', '').replace(' ', '')
        texto_codificado = quote(msg.mensaje)
        
        # Usar la API de enlace directo para abrir el chat con el mensaje pre-rellenado
        url = f"https://web.whatsapp.com/send?phone={numero}&text={texto_codificado}"
        driver.get(url)
        
        # Esperar a que aparezca el botón de enviar
        boton_enviar = WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.XPATH, '//span[@data-icon="send"]'))
        )
        time.sleep(1) # Pequeña pausa
        boton_enviar.click()
        
        # Esperar a que el mensaje se envíe (el botón desaparece)
        time.sleep(2)
        
        # Actualizar estado
        msg.estado = 'enviado'
        msg.fecha_envio = timezone.now()
        msg.save()
        print(f"✅ WhatsApp enviado a {numero}")
        
    except Exception as e:
        print(f"❌ Error al enviar a {msg.numero_destino}: {e}")
        msg.estado = 'error'
        msg.error_log = str(e)
        msg.save()

if __name__ == "__main__":
    start_whatsapp_worker()
