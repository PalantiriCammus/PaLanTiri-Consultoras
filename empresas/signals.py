# empresas/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import PerfilBusqueda, ConfiguracionAlerta
from django.core.mail import send_mail
from django.conf import settings
from postulantes.models import WhatsAppMessage
from selectores.models import Selector
from django.contrib.auth.models import User
from integraciones_google.models import GoogleToken
from integraciones_google.services import GoogleGmailService

def despachar_alerta(evento_codigo, variables, selector_target=None, selector_sourcing=None, selector_cierre=None):
    """
    Función general para enviar alertas por Email y/o WhatsApp basadas en plantillas parametrizables de la base de datos.
    """
    try:
        alerta_config = ConfiguracionAlerta.objects.get(evento_codigo=evento_codigo)
    except ConfiguracionAlerta.DoesNotExist:
        print(f"Configuración de alerta para '{evento_codigo}' no encontrada en la base de datos.")
        return

    if not alerta_config.activar_email and not alerta_config.activar_whatsapp:
        return

    # Determinar destinatarios basados en la parametrización
    selectores_notificar = []
    
    if alerta_config.destinatarios == 'cierre':
        if selector_cierre:
            selectores_notificar = [selector_cierre]
        elif selector_target:
            selectores_notificar = [selector_target]
    elif alerta_config.destinatarios == 'sourcing':
        if selector_sourcing:
            selectores_notificar = [selector_sourcing]
    elif alerta_config.destinatarios == 'ambos_comision':
        if selector_sourcing:
            selectores_notificar.append(selector_sourcing)
        if selector_cierre and selector_cierre not in selectores_notificar:
            selectores_notificar.append(selector_cierre)
        if not selectores_notificar and selector_target:
            selectores_notificar = [selector_target]
    elif alerta_config.destinatarios == 'grupo':
        if alerta_config.destinatario_grupo:
            selectores_notificar = list(alerta_config.destinatario_grupo.selectores.filter(estado='activo'))
    elif alerta_config.destinatarios == 'especifico':
        if alerta_config.destinatario_especifico:
            selectores_notificar = [alerta_config.destinatario_especifico]
    elif alerta_config.destinatarios == 'asignados':
        if selector_target:
            selectores_notificar = [selector_target]
    elif alerta_config.destinatarios == 'activos':
        selectores_notificar = list(Selector.objects.filter(estado='activo'))
    elif alerta_config.destinatarios == 'ambos':
        selectores_notificar = list(Selector.objects.filter(estado='activo'))
        if selector_target and selector_target not in selectores_notificar:
            selectores_notificar.append(selector_target)

    if not selectores_notificar:
        return


    # Inicializar Gmail
    gmail_service = None
    if alerta_config.activar_email:
        admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        if admin_user and GoogleToken.objects.filter(user=admin_user).exists():
            try:
                gmail_service = GoogleGmailService(admin_user)
                if not gmail_service.service:
                    gmail_service = None
            except Exception as e:
                print(f"Error al inicializar Gmail para despachar alerta: {e}")

    for selector in selectores_notificar:
        # Construir variables dinámicas locales para el selector
        local_vars = variables.copy()
        if '{nombre_selector}' not in local_vars:
            local_vars['{nombre_selector}'] = selector.nombre

        email_msg = alerta_config.plantilla_email
        wa_msg = alerta_config.plantilla_whatsapp

        for key, val in local_vars.items():
            email_msg = email_msg.replace(key, str(val))
            wa_msg = wa_msg.replace(key, str(val))

        # Enviar Email
        if alerta_config.activar_email:
            email_enviado_ok = False
            if gmail_service:
                try:
                    email_enviado_ok = gmail_service.enviar_correo(
                        selector.email, 
                        f"Alerta: {alerta_config.nombre}", 
                        email_msg
                    )
                except Exception as e:
                    print(f"Error enviando correo por Gmail API a {selector.email}: {e}")

            if not email_enviado_ok:
                try:
                    send_mail(
                        f"Alerta: {alerta_config.nombre}",
                        email_msg,
                        getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@consultora.com'),
                        [selector.email],
                        fail_silently=True
                    )
                    print(f"Email enviado vía Django mail fallback a {selector.email}")
                except Exception as e:
                    print(f"Error enviando correo fallback a {selector.email}: {e}")

        # Enviar WhatsApp
        if alerta_config.activar_whatsapp and selector.telefono:
            WhatsAppMessage.objects.create(
                numero_destino=selector.telefono,
                mensaje=wa_msg
            )
            print(f"WhatsApp encolado para {selector.telefono}")


@receiver(post_save, sender=PerfilBusqueda)
def notificar_selectores_nueva_busqueda(sender, instance, created, **kwargs):
    # Solo notificar si la busqueda esta en estado abierta (suponiendo que el nombre es "Abierta" o "Abiertas")
    if instance.estado and instance.estado.nombre.lower().startswith('abierta'):
        
        # Variables dinámicas para el evento
        variables = {
            '{titulo_puesto}': instance.titulo_puesto,
            '{empresa_nombre}': instance.empresa.nombre,
            '{salario_minimo}': str(instance.salario_minimo or 'No especificado'),
            '{habilidades_requeridas}': instance.habilidades_requeridas or 'No especificadas'
        }

        # Invocar despachador general
        despachar_alerta('nueva_busqueda', variables, selector_target=instance.selector_asignado)


def despachar_alerta_estado_comision(estado_comision, variables, selector_target=None, selector_sourcing=None, selector_cierre=None):
    """
    Despacha alertas para un cambio de estado de comisión usando la configuración en EstadoComision.
    """
    if not estado_comision.activar_email and not estado_comision.activar_whatsapp:
        return

    # Determinar destinatarios
    selectores_notificar = []
    
    if estado_comision.destinatarios == 'cierre':
        if selector_cierre:
            selectores_notificar = [selector_cierre]
        elif selector_target:
            selectores_notificar = [selector_target]
    elif estado_comision.destinatarios == 'sourcing':
        if selector_sourcing:
            selectores_notificar = [selector_sourcing]
    elif estado_comision.destinatarios == 'ambos_comision':
        if selector_sourcing:
            selectores_notificar.append(selector_sourcing)
        if selector_cierre and selector_cierre not in selectores_notificar:
            selectores_notificar.append(selector_cierre)
        if not selectores_notificar and selector_target:
            selectores_notificar = [selector_target]
    elif estado_comision.destinatarios == 'grupo':
        if estado_comision.destinatario_grupo:
            selectores_notificar = list(estado_comision.destinatario_grupo.selectores.filter(estado='activo'))
    elif estado_comision.destinatarios == 'especifico':
        if estado_comision.destinatario_especifico:
            selectores_notificar = [estado_comision.destinatario_especifico]
    elif estado_comision.destinatarios == 'asignados':
        if selector_target:
            selectores_notificar = [selector_target]
    elif estado_comision.destinatarios == 'activos':
        selectores_notificar = list(Selector.objects.filter(estado='activo'))
    elif estado_comision.destinatarios == 'ambos':
        selectores_notificar = list(Selector.objects.filter(estado='activo'))
        if selector_target and selector_target not in selectores_notificar:
            selectores_notificar.append(selector_target)

    if not selectores_notificar:
        return

    # Inicializar Gmail
    gmail_service = None
    if estado_comision.activar_email:
        admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        if admin_user and GoogleToken.objects.filter(user=admin_user).exists():
            try:
                gmail_service = GoogleGmailService(admin_user)
                if not gmail_service.service:
                    gmail_service = None
            except Exception as e:
                print(f"Error al inicializar Gmail para despachar alerta de comisión: {e}")

    for selector in selectores_notificar:
        # Construir variables dinámicas
        local_vars = variables.copy()
        if '{nombre_selector}' not in local_vars:
            local_vars['{nombre_selector}'] = selector.nombre

        email_msg = estado_comision.plantilla_email
        wa_msg = estado_comision.plantilla_whatsapp

        for key, val in local_vars.items():
            email_msg = email_msg.replace(key, str(val))
            wa_msg = wa_msg.replace(key, str(val))

        # Enviar Email
        if estado_comision.activar_email:
            email_enviado_ok = False
            if gmail_service:
                try:
                    email_enviado_ok = gmail_service.enviar_correo(
                        selector.email, 
                        f"Alerta Estado Comisión: {estado_comision.nombre}", 
                        email_msg
                    )
                except Exception as e:
                    print(f"Error enviando correo por Gmail API a {selector.email}: {e}")

            if not email_enviado_ok:
                try:
                    send_mail(
                        f"Alerta Estado Comisión: {estado_comision.nombre}",
                        email_msg,
                        getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@consultora.com'),
                        [selector.email],
                        fail_silently=True
                    )
                    print(f"Email de comisión enviado vía Django mail fallback a {selector.email}")
                except Exception as e:
                    print(f"Error enviando correo fallback de comisión a {selector.email}: {e}")

        # Enviar WhatsApp
        if estado_comision.activar_whatsapp and selector.telefono:
            WhatsAppMessage.objects.create(
                numero_destino=selector.telefono,
                mensaje=wa_msg
            )
            print(f"WhatsApp de comisión encolado para {selector.telefono}")

