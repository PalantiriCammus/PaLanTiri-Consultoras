from django.core.management.base import BaseCommand
from postulantes.models import NivelEstudio, TipoEmpleo, Habilidad

class Command(BaseCommand):
    help = 'Carga los datos iniciales (maestros) de bibliotecas sin sobrecargar la UI'

    def handle(self, *args, **kwargs):
        self.stdout.write('Iniciando carga de bibliotecas maestras...')

        # Niveles de Estudio
        niveles = [
            {'nombre': 'Primario', 'peso': 1},
            {'nombre': 'Secundario', 'peso': 2},
            {'nombre': 'Terciario', 'peso': 3},
            {'nombre': 'Universitario En Curso', 'peso': 4},
            {'nombre': 'Universitario Completo', 'peso': 5},
            {'nombre': 'Posgrado / Master', 'peso': 6},
            {'nombre': 'Doctorado', 'peso': 7},
        ]
        for n in niveles:
            obj, created = NivelEstudio.objects.get_or_create(nombre=n['nombre'], defaults={'peso': n['peso']})
            if created:
                self.stdout.write(f"Creado: {n['nombre']}")

        # Tipos de Empleo
        tipos = ['Full-Time', 'Part-Time', 'Freelance', 'Por Contrato', 'Pasantía / Prácticas']
        for t in tipos:
            obj, created = TipoEmpleo.objects.get_or_create(nombre=t)
            if created:
                self.stdout.write(f"Creado: {t}")

        # Habilidades Base
        habilidades = [
            {'nombre': 'Python', 'cat': 'IT'},
            {'nombre': 'Java', 'cat': 'IT'},
            {'nombre': 'Liderazgo', 'cat': 'Soft Skills'},
            {'nombre': 'Gestión de Proyectos', 'cat': 'Management'},
            {'nombre': 'Excel Avanzado', 'cat': 'Administrativo'},
            {'nombre': 'Inglés Bilingüe', 'cat': 'Idiomas'},
        ]
        for h in habilidades:
            obj, created = Habilidad.objects.get_or_create(nombre=h['nombre'], defaults={'categoria_sugerida': h['cat']})
            if created:
                self.stdout.write(f"Creado: {h['nombre']}")

        # Configuraciones de Alerta Iniciales
        from empresas.models import ConfiguracionAlerta
        
        default_email_template = (
            "Hola {nombre_selector},\n\n"
            "Tenemos una nueva búsqueda activa.\n\n"
            "Puesto: {titulo_puesto}\n"
            "Empresa: {empresa_nombre}\n"
            "Sueldo mínimo de referencia: {salario_minimo}\n\n"
            "Requisitos: {habilidades_requeridas}\n\n"
            "Por favor ingresa a la plataforma para ver más detalles y enviar candidatos."
        )
        
        default_wa_template = (
            "👋 ¡Hola {nombre_selector}! Nueva búsqueda abierta: *{titulo_puesto}* "
            "para *{empresa_nombre}*. 🚀 Ingresa al portal para más detalles."
        )

        obj, created = ConfiguracionAlerta.objects.get_or_create(
            evento_codigo='nueva_busqueda',
            defaults={
                'nombre': 'Nueva búsqueda de personal abierta',
                'activar_email': True,
                'activar_whatsapp': True,
                'plantilla_email': default_email_template,
                'plantilla_whatsapp': default_wa_template,
                'destinatarios': 'asignados'
            }
        )
        if created:
            self.stdout.write(f"Creada Alerta Default: {obj.nombre}")

        # Pago de comisión
        email_pago = (
            "Hola {nombre_selector},\n\n"
            "Te informamos que se ha registrado el pago de tu comisión.\n\n"
            "Puesto: {puesto}\n"
            "Candidato: {candidato_nombre}\n"
            "Monto pagado: ${monto_comision}\n\n"
            "¡Muchas gracias por tu trabajo en esta búsqueda!"
        )
        wa_pago = "💸 ¡Hola {nombre_selector}! Se ha registrado el pago de tu comisión de *${monto_comision}* por la colocación de *{candidato_nombre}* en *{puesto}*. ¡Gracias por tu gran trabajo! 🙌"

        obj, created = ConfiguracionAlerta.objects.get_or_create(
            evento_codigo='comision_pagada',
            defaults={
                'nombre': 'Pago de comisión al selector',
                'activar_email': True,
                'activar_whatsapp': True,
                'plantilla_email': email_pago,
                'plantilla_whatsapp': wa_pago,
                'destinatarios': 'asignados'
            }
        )
        if created:
            self.stdout.write(f"Creada Alerta Default: {obj.nombre}")

        # Ejecución de garantía
        email_garantia = (
            "Hola {nombre_selector},\n\n"
            "Te informamos que se ha ejecutado la garantía para un ingreso.\n\n"
            "Puesto: {puesto}\n"
            "Candidato: {candidato_nombre}\n"
            "Monto descuento/devolución: ${monto_devolucion}\n\n"
            "Por favor, ponte en contacto con administración si tienes alguna duda."
        )
        wa_garantia = "⚠️ Hola {nombre_selector}, te informamos que se ha ejecutado la garantía por *{candidato_nombre}* en el puesto *{puesto}*. Monto de regularización: *-${monto_devolucion}*."

        obj, created = ConfiguracionAlerta.objects.get_or_create(
            evento_codigo='garantia_ejecutada',
            defaults={
                'nombre': 'Ejecución de garantía (Clawback)',
                'activar_email': True,
                'activar_whatsapp': True,
                'plantilla_email': email_garantia,
                'plantilla_whatsapp': wa_garantia,
                'destinatarios': 'asignados'
            }
        )
        if created:
            self.stdout.write(f"Creada Alerta Default: {obj.nombre}")

        self.stdout.write(self.style.SUCCESS('Carga de bibliotecas finalizada correctamente.'))


