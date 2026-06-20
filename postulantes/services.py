from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from comisiones.models import Comision
from selectores.models import Selector

def crear_comisiones_por_contratacion(postulante):
    """
    Crea las comisiones correspondientes cuando un postulante es contratado.
    Retorna una tupla (comision_creada, comisiones_count)
    """
    comision_creada = False
    comisiones_count = 0
    postulaciones = postulante.postulaciones.filter(estado='contratado')
    
    for postulacion in postulaciones:
        if not Comision.objects.filter(postulacion=postulacion).exists():
            try:
                selector = (
                    postulacion.selector
                    or postulante.selector
                    or postulacion.perfil_busqueda.selector_asignado
                    or Selector.objects.filter(estado='activo').first()
                )
                if not selector:
                    continue

                salario = Decimal('0.00')
                if postulacion.perfil_busqueda.salario_estipulado_comision:
                    salario = postulacion.perfil_busqueda.salario_estipulado_comision
                elif postulante.salario_pretendido_minimo:
                    salario = postulante.salario_pretendido_minimo
                elif postulacion.perfil_busqueda.salario_minimo:
                    salario = postulacion.perfil_busqueda.salario_minimo

                pct_empresa = Decimal('20.00')
                if postulacion.perfil_busqueda.comision_porcentaje is not None:
                    pct_empresa = postulacion.perfil_busqueda.comision_porcentaje
                elif postulacion.perfil_busqueda.empresa.comision_porcentaje is not None:
                    pct_empresa = postulacion.perfil_busqueda.empresa.comision_porcentaje

                pct_selector = Decimal('50.00')
                if selector.comision_porcentaje_defecto is not None:
                    pct_selector = selector.comision_porcentaje_defecto

                fecha_inicio = postulacion.fecha_inicio_laboral or timezone.now().date()
                fecha_garantia = fecha_inicio + timedelta(days=90)

                com = Comision.objects.create(
                    postulacion=postulacion,
                    selector=selector,
                    empresa=postulacion.perfil_busqueda.empresa,
                    salario_mensual=salario,
                    comision_porcentaje_empresa=pct_empresa,
                    comision_porcentaje_selector=pct_selector,
                    monto_total=Decimal('0.00'),
                    monto_empresa=Decimal('0.00'),
                    monto_selector=Decimal('0.00'),
                    estado='pendiente_cobro',
                    fecha_inicio_trabajo=fecha_inicio,
                    fecha_vencimiento_garantia=fecha_garantia
                )
                com.calcular_montos()
                comision_creada = True
                comisiones_count += 1
            except Exception:
                pass  # Si ya existe (race condition con signal), ignorar
                
    return comision_creada, comisiones_count

import tempfile
import os
from django.core.mail import send_mail
from django.conf import settings

def extraer_texto_cv(cv_archivo):
    """
    Extrae el texto de un archivo PDF usando pdfminer.six.
    """
    if not cv_archivo or not cv_archivo.name.lower().endswith('.pdf'):
        return ""
    
    try:
        from pdfminer.high_level import extract_text
        
        # Como es un FileField, puede estar en memoria o disco
        # Para pdfminer lo más fácil es guardarlo en temp y leerlo
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            # Si el archivo está cerrado, lo abrimos para leer
            if hasattr(cv_archivo, 'closed') and cv_archivo.closed:
                cv_archivo.open()
            
            # Leer desde el inicio
            if hasattr(cv_archivo, 'seek'):
                cv_archivo.seek(0)
                
            tmp_file.write(cv_archivo.read())
            tmp_file.flush()
            tmp_path = tmp_file.name

        texto = extract_text(tmp_path)
        os.remove(tmp_path)
        
        # Limitar la cantidad de caracteres por precaución
        return texto[:15000].strip() if texto else ""
    except Exception as e:
        print(f"Error extrayendo texto del CV: {str(e)}")
        return ""


import requests

def enviar_mensaje_whatsapp(numero, mensaje):
    """
    Enruta el mensaje de WhatsApp dependiendo de la configuración (QR o META)
    """
    provider = getattr(settings, 'WHATSAPP_PROVIDER', 'QR').upper()
    numero_limpio = ''.join(filter(str.isdigit, str(numero)))
    
    if provider == 'META':
        token = getattr(settings, 'META_WHATSAPP_TOKEN', '')
        phone_id = getattr(settings, 'META_PHONE_NUMBER_ID', '')
        
        if not token or not phone_id:
            print("Error: Faltan credenciales de META para enviar WhatsApp")
            return False
            
        url = f"https://graph.facebook.com/v17.0/{phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": numero_limpio,
            "type": "text",
            "text": {"preview_url": False, "body": mensaje}
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Error enviando por Meta API a {numero_limpio}: {e}")
            return False
    else:
        # Modo QR: Encolar mensaje en la BD
        from .models import WhatsAppMessage
        WhatsAppMessage.objects.create(
            numero_destino=numero_limpio,
            mensaje=mensaje
        )
        return True


def enviar_feedback_automatico(postulante, nuevo_estado):
    """
    Verifica si el nuevo estado tiene habilitado el envío automático y envía el correo y/o WhatsApp.
    """
    if not nuevo_estado or not nuevo_estado.enviar_email_automatico:
        return False
        
    try:
        # 1. Preparar variables comunes
        empresa_nombre = "Nuestra Consultora"
        postulacion = postulante.postulaciones.filter(estado__in=['enviada', 'entrevista', 'oferta']).first()
        if postulacion and postulacion.perfil_busqueda and postulacion.perfil_busqueda.empresa:
            empresa_nombre = postulacion.perfil_busqueda.empresa.nombre

        # 2. Enviar Email si hay plantilla
        if nuevo_estado.plantilla_email:
            plantilla = nuevo_estado.plantilla_email
            plantilla = plantilla.replace('{{nombre}}', postulante.nombre)
            plantilla = plantilla.replace('{{apellido}}', postulante.apellido)
            plantilla = plantilla.replace('{{empresa}}', empresa_nombre)
            
            asunto = f"Actualización sobre tu proceso - {empresa_nombre}"
            
            send_mail(
                subject=asunto,
                message=plantilla,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@consultora.com'),
                recipient_list=[postulante.email],
                fail_silently=True,
            )

        # 3. Enviar WhatsApp si hay plantilla y número de teléfono
        if hasattr(nuevo_estado, 'plantilla_whatsapp') and nuevo_estado.plantilla_whatsapp and postulante.telefono:
            wa_plantilla = nuevo_estado.plantilla_whatsapp
            wa_plantilla = wa_plantilla.replace('{{nombre}}', postulante.nombre)
            wa_plantilla = wa_plantilla.replace('{{apellido}}', postulante.apellido)
            wa_plantilla = wa_plantilla.replace('{{empresa}}', empresa_nombre)

            enviar_mensaje_whatsapp(postulante.telefono, wa_plantilla)

        return True
    except Exception as e:
        print(f"Error enviando feedback automático: {str(e)}")
        return False
