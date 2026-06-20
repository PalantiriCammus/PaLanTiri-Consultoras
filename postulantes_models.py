# postulantes/models.py

from django.db import models
from django.utils import timezone
import os
from datetime import timedelta

class Categoria(models.Model):
    """
    Categorías de postulantes para búsqueda rápida.
    Ej: Desarrollador Python, Contador, Gerente General, etc.
    """
    nombre = models.CharField(max_length=255, unique=True)
    descripcion = models.TextField(blank=True)
    area = models.CharField(
        max_length=50,
        choices=[
            ('it', 'IT'),
            ('admin', 'Administrativo'),
            ('ejecutivo', 'Ejecutivo/Jerárquico'),
            ('otro', 'Otro'),
        ]
    )
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'categorias'
        ordering = ['area', 'nombre']
    
    def __str__(self):
        return self.nombre


class Postulante(models.Model):
    """
    Base de datos central de postulantes.
    Un postulante puede participar en múltiples búsquedas.
    """
    
    ESTADO_POSTULANTE = [
        ('activo', 'Activo (Disponible)'),
        ('en_proceso', 'En Proceso'),
        ('contratado', 'Contratado'),
        ('rechazo_empresa', 'Rechazado por Empresa'),
        ('rechazo_postulante', 'Rechazado por Postulante'),
        ('inactivo', 'Inactivo'),
    ]
    
    GENERO = [
        ('masculino', 'Masculino'),
        ('femenino', 'Femenino'),
        ('otro', 'Otro'),
        ('prefiere_no_decir', 'Prefiere no decir'),
    ]
    
    # Datos personales
    nombre = models.CharField(max_length=255)
    apellido = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    genero = models.CharField(
        max_length=20,
        choices=GENERO,
        blank=True
    )
    
    # Ubicación
    pais = models.CharField(max_length=100, default='Argentina')
    provincia = models.CharField(max_length=100)
    ciudad = models.CharField(max_length=100)
    disponibilidad_mudanza = models.BooleanField(default=False)
    
    # Profesional
    categorias = models.ManyToManyField(Categoria, related_name='postulantes')
    titulo_principal = models.CharField(
        max_length=255,
        help_text="Ej: Desarrollador Python Senior"
    )
    resumen_profesional = models.TextField(
        blank=True,
        help_text="Resumen ejecutivo de experiencia"
    )
    
    # Experiencia y educación
    experiencia_anos = models.PositiveIntegerField(
        default=0,
        help_text="Años de experiencia laboral"
    )
    titulaciones = models.TextField(
        blank=True,
        help_text="Títulos obtenidos (separados por comas)"
    )
    
    # Habilidades
    habilidades = models.TextField(
        blank=True,
        help_text="Habilidades clave (separadas por comas)"
    )
    idiomas = models.CharField(
        max_length=255,
        blank=True,
        help_text="Ej: Español (Nativo), Inglés (B2), Francés (A2)"
    )
    
    # Preferencias
    salario_pretendido_minimo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    salario_pretendido_maximo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    acepta_remoto = models.BooleanField(default=True)
    acepta_hibrido = models.BooleanField(default=True)
    acepta_presencial = models.BooleanField(default=True)
    
    # CV y documentos
    cv_archivo = models.FileField(
        upload_to='cvs/%Y/%m/%d/',
        null=True,
        blank=True,
        help_text="PDF del CV"
    )
    cv_texto_extraido = models.TextField(
        blank=True,
        help_text="Texto del CV extraído para búsqueda"
    )
    linkedin_url = models.URLField(blank=True, null=True)
    portfolio_url = models.URLField(blank=True, null=True)
    github_url = models.URLField(blank=True, null=True)
    
    # Estado y control
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_POSTULANTE,
        default='activo'
    )
    
    # Quién lo cargó
    selector = models.ForeignKey(
        'selectores.Selector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='postulantes_cargados'
    )
    
    # Fechas
    fecha_carga = models.DateTimeField(auto_now_add=True)
    fecha_ultima_actualizacion = models.DateTimeField(auto_now=True)
    
    # Flags de seguimiento
    contactado_reciente = models.BooleanField(default=False)
    fecha_ultimo_contacto = models.DateTimeField(null=True, blank=True)
    
    # Google Workspace
    google_contact_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="ID del contacto en Google Contacts"
    )
    
    class Meta:
        db_table = 'postulantes'
        ordering = ['-fecha_carga']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['estado']),
            models.Index(fields=['selector']),
            models.Index(fields=['-fecha_carga']),
        ]
    
    def __str__(self):
        return f"{self.nombre} {self.apellido} - {self.titulo_principal}"
    
    @property
    def nombre_completo(self):
        return f"{self.nombre} {self.apellido}"
    
    @property
    def edad(self):
        """Calcula la edad a partir de fecha_nacimiento"""
        if not self.fecha_nacimiento:
            return None
        hoy = timezone.now().date()
        return (hoy - self.fecha_nacimiento).days // 365
    
    def obtener_cv_ruta(self):
        """Retorna la ruta del CV si existe"""
        if self.cv_archivo:
            return self.cv_archivo.url
        return None
    
    def tiene_postulaciones_activas(self):
        """Retorna True si tiene postulaciones en proceso"""
        from postulaciones.models import Postulacion
        return self.postulaciones.filter(
            estado__in=['enviada', 'entrevista', 'oferta']
        ).exists()


class TituloPostulante(models.Model):
    """
    Histórico de títulos/roles que ha tenido un postulante.
    Útil para análisis de carrera.
    """
    postulante = models.ForeignKey(
        Postulante,
        on_delete=models.CASCADE,
        related_name='titulos'
    )
    titulo = models.CharField(max_length=255)
    empresa = models.CharField(max_length=255, blank=True)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    descripcion = models.TextField(blank=True)
    
    class Meta:
        db_table = 'titulos_postulante'
        ordering = ['-fecha_inicio']
    
    def __str__(self):
        return f"{self.titulo} - {self.empresa} ({self.fecha_inicio})"
    
    @property
    def esta_vigente(self):
        return self.fecha_fin is None


class DisponibilidadPostulante(models.Model):
    """
    Registro de disponibilidad para entrevistas del postulante.
    Integrado con Google Calendar.
    """
    postulante = models.ForeignKey(
        Postulante,
        on_delete=models.CASCADE,
        related_name='disponibilidades'
    )
    
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    tipo = models.CharField(
        max_length=20,
        choices=[
            ('disponible', 'Disponible'),
            ('ocupado', 'Ocupado'),
            ('entrevista', 'Entrevista Confirmada'),
        ]
    )
    
    nota = models.CharField(max_length=255, blank=True)
    google_event_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="ID del evento en Google Calendar"
    )
    
    class Meta:
        db_table = 'disponibilidad_postulante'
        ordering = ['fecha', 'hora_inicio']
    
    def __str__(self):
        return f"{self.postulante.nombre_completo} - {self.fecha} ({self.tipo})"


class NotaPostulante(models.Model):
    """
    Notas y observaciones sobre un postulante.
    Permite que selectores dejen feedback.
    """
    postulante = models.ForeignKey(
        Postulante,
        on_delete=models.CASCADE,
        related_name='notas'
    )
    
    autor = models.ForeignKey(
        'selectores.Selector',
        on_delete=models.SET_NULL,
        null=True,
        related_name='notas_escritas'
    )
    
    titulo = models.CharField(max_length=255, blank=True)
    contenido = models.TextField()
    privada = models.BooleanField(
        default=False,
        help_text="Si es privada, solo el autor y admin la ven"
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notas_postulante'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"Nota en {self.postulante.nombre_completo} - {self.fecha_creacion}"
