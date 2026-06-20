# empresas/models.py

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import URLValidator, MinValueValidator, MaxValueValidator

class Empresa(models.Model):
    """
    Modelo para las empresas solicitantes de perfiles.
    Pueden ser privadas o públicas.
    """
    
    TIPO_EMPRESA = [
        ('privada', 'Empresa Privada'),
        ('publica', 'Empresa Pública'),
    ]
    
    # Datos básicos
    nombre = models.CharField(
        max_length=255,
        unique=True,
        help_text="Nombre oficial de la empresa"
    )
    razon_social = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )
    tipo_empresa = models.CharField(
        max_length=10,
        choices=TIPO_EMPRESA,
        default='privada'
    )
    
    # Contacto
    email_principal = models.EmailField(unique=True)
    email_alterno = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True, null=True)
    
    # Ubicación
    pais = models.CharField(max_length=100, default='Argentina')
    provincia = models.CharField(max_length=100)
    ciudad = models.CharField(max_length=100)
    direccion = models.CharField(max_length=255, blank=True)
    latitud = models.FloatField(null=True, blank=True, help_text="Coordenada GPS")
    longitud = models.FloatField(null=True, blank=True, help_text="Coordenada GPS")
    
    # Contacto principal
    contacto_nombre = models.CharField(max_length=255)
    contacto_email = models.EmailField()
    contacto_telefono = models.CharField(max_length=20, blank=True)
    contacto_puesto = models.CharField(max_length=100, blank=True)
    
    # Información comercial
    comision_porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=20.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Porcentaje de comisión sobre salario del contratado (ej: 20.00)"
    )
    salario_promedio_ofrecido = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Referencia de salario promedio que ofrece"
    )
    
    # Control
    activa = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_ultima_busqueda = models.DateTimeField(null=True, blank=True)
    
    # Google Workspace
    google_contact_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="ID del contacto en Google Contacts"
    )
    google_calendar_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="ID del calendario de Google Calendar"
    )
    
    class Meta:
        db_table = 'empresas'
        ordering = ['nombre']
        indexes = [
            models.Index(fields=['email_principal']),
            models.Index(fields=['activa']),
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.tipo_empresa})"
    
    def tiene_busquedas_activas(self):
        """Retorna True si la empresa tiene búsquedas sin cerrar"""
        return self.perfiles_busqueda.filter(estado='abierto').exists()


class PerfilBusqueda(models.Model):
    """
    Modelo para los perfiles de búsqueda que solicita una empresa.
    Define qué tipo de profesional se necesita.
    """
    
    ESTADO_CHOICES = [
        ('abierto', 'Abierto'),
        ('pausa', 'Pausa Temporal'),
        ('cubierto', 'Perfil Cubierto'),
        ('cancelado', 'Cancelado'),
    ]
    
    NIVEL_CHOICES = [
        ('senior', 'Senior (5+ años)'),
        ('semi_senior', 'Semi Senior (2-4 años)'),
        ('junior', 'Junior (0-1 años)'),
        ('practicante', 'Practicante'),
    ]
    
    # Identificación
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='perfiles_busqueda'
    )
    titulo_puesto = models.CharField(max_length=255)
    descripcion = models.TextField(help_text="Descripción detallada del puesto")
    
    # Requisitos
    areas = models.CharField(
        max_length=50,
        choices=[
            ('it', 'IT'),
            ('admin', 'Administrativo'),
            ('ejecutivo', 'Ejecutivo/Jerárquico'),
            ('otro', 'Otro'),
        ]
    )
    nivel = models.CharField(
        max_length=20,
        choices=NIVEL_CHOICES,
        default='semi_senior'
    )
    
    # Habilidades requeridas
    habilidades_requeridas = models.TextField(
        help_text="Lista de habilidades requeridas (separadas por comas)"
    )
    educacion_minima = models.CharField(
        max_length=255,
        blank=True,
        help_text="Ej: Licenciatura en Informática, Contador Público, etc."
    )
    experiencia_minima_anios = models.PositiveIntegerField(
        default=1,
        help_text="Años de experiencia mínimos requeridos"
    )
    
    # Ubicación del puesto
    es_remoto = models.BooleanField(default=False)
    ubicacion_puesto = models.CharField(max_length=255, blank=True)
    
    # Compensación
    salario_minimo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    salario_maximo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    beneficios = models.TextField(
        blank=True,
        help_text="Beneficios ofrecidos (obra social, bono, etc)"
    )
    
    # Control de búsqueda
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='abierto'
    )
    cantidad_posiciones = models.PositiveIntegerField(
        default=1,
        help_text="Cantidad de posiciones disponibles"
    )
    
    # Selector asignado
    selector_asignado = models.ForeignKey(
        'selectores.Selector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='perfiles_asignados'
    )
    
    # Fechas
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_vencimiento = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha límite para llenar la posición"
    )
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    
    # Seguimiento
    prioridad = models.CharField(
        max_length=10,
        choices=[
            ('baja', 'Baja'),
            ('normal', 'Normal'),
            ('alta', 'Alta'),
            ('urgente', 'Urgente'),
        ],
        default='normal'
    )
    notas_internas = models.TextField(blank=True)
    
    class Meta:
        db_table = 'perfiles_busqueda'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['empresa', 'estado']),
            models.Index(fields=['areas']),
        ]
    
    def __str__(self):
        return f"{self.titulo_puesto} - {self.empresa.nombre}"
    
    def postulaciones_activas(self):
        """Retorna postulaciones que están en proceso (no rechazadas/canceladas)"""
        from postulaciones.models import Postulacion
        return self.postulaciones.filter(
            estado__in=['enviada', 'entrevista', 'oferta']
        )
    
    def cantidad_postulantes_enviados(self):
        """Retorna cuántos postulantes se han enviado para este perfil"""
        return self.postulaciones.exclude(
            estado__in=['rechazada', 'cancelada']
        ).count()


class ContactoEmpresa(models.Model):
    """
    Permite tener múltiples contactos por empresa.
    """
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='contactos'
    )
    nombre = models.CharField(max_length=255)
    puesto = models.CharField(max_length=255)
    email = models.EmailField()
    telefono = models.CharField(max_length=20, blank=True)
    departamento = models.CharField(max_length=100, blank=True)
    es_contacto_principal = models.BooleanField(default=False)
    
    fecha_agregado = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'contactos_empresa'
        unique_together = ['empresa', 'email']
    
    def __str__(self):
        return f"{self.nombre} - {self.empresa.nombre}"
