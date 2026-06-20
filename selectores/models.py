# selectores/models.py

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

class GrupoSelector(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, help_text="Descripción del grupo de selectores")

    class Meta:
        db_table = 'grupos_selector'
        verbose_name = 'Grupo de Selectores'
        verbose_name_plural = 'Grupos de Selectores'

    def __str__(self):
        return self.nombre


class Selector(models.Model):
    """
    Modelo para los selectores freelance que trabajan para la consultora.
    Estos son los que buscan y proponen postulantes.
    """
    
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('pausado', 'Pausado'),
        ('baja', 'Baja'),
    ]
    
    ESPECIALIZACION_CHOICES = [
        ('it', 'IT'),
        ('admin', 'Administrativo'),
        ('ejecutivo', 'Ejecutivo/Jerárquico'),
        ('general', 'General (Múltiples áreas)'),
    ]
    
    # Datos de usuario
    usuario = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='selector'
    )
    
    # Información personal
    nombre = models.CharField(max_length=255)
    apellido = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20)
    
    # Profesional
    especializacion = models.CharField(
        max_length=20,
        choices=ESPECIALIZACION_CHOICES,
        default='general'
    )
    experiencia_anos = models.PositiveIntegerField(
        default=0,
        help_text="Años de experiencia en selección"
    )
    descripcion_perfil = models.TextField(
        blank=True,
        help_text="Descripción de fortalezas y especialidades"
    )
    
    alias_publico = models.SlugField(
        max_length=100,
        unique=True,
        blank=True,
        null=True,
        help_text="Alias para el portal público (ej: juan-perez)"
    )
    
    # Ubicación
    pais = models.CharField(max_length=100, default='Argentina')
    provincia = models.CharField(max_length=100)
    ciudad = models.CharField(max_length=100)
    
    # Control
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='activo'
    )
    
    # Documentación
    cuit = models.CharField(
        max_length=20,
        unique=True,
        help_text="Para facturación de comisiones"
    )
    dni = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True,
        help_text="DNI del selector"
    )
    banco = models.CharField(max_length=100, blank=True)
    numero_cuenta = models.CharField(max_length=50, blank=True)
    cbu = models.CharField(max_length=22, blank=True, help_text="CBU para transferencias")
    alias_cvu = models.CharField(max_length=50, blank=True, help_text="CVU o alias")
    
    # Estadísticas
    cantidad_postulantes_enviados = models.PositiveIntegerField(default=0)
    cantidad_contratados = models.PositiveIntegerField(default=0)
    tasa_efectividad = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Porcentaje de postulantes que fueron contratados"
    )
    
    # Comisiones
    comision_porcentaje_defecto = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=50.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Porcentaje de comisión (se divide con la empresa)"
    )
    
    # Fechas
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_ultima_actividad = models.DateTimeField(auto_now=True)
    
    # Google Workspace
    google_email = models.EmailField(blank=True, null=True)
    google_contact_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="ID del contacto en Google Contacts"
    )
    grupos = models.ManyToManyField(GrupoSelector, related_name='selectores', blank=True)
    
    class Meta:
        db_table = 'selectores'
        ordering = ['-fecha_registro']
        indexes = [
            models.Index(fields=['estado']),
            models.Index(fields=['especializacion']),
        ]
    
    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.especializacion})"
    
    @property
    def nombre_completo(self):
        return f"{self.nombre} {self.apellido}"
        
    def save(self, *args, **kwargs):
        if not self.alias_publico:
            from django.utils.text import slugify
            base_slug = slugify(f"{self.nombre}-{self.apellido}")
            if not base_slug:
                base_slug = "selector"
            slug = base_slug
            counter = 1
            while Selector.objects.filter(alias_publico=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.alias_publico = slug
        super().save(*args, **kwargs)
    
    def actualizar_tasa_efectividad(self):
        """Calcula y actualiza la tasa de efectividad"""
        total_enviados = self.postulaciones.count()
        if total_enviados == 0:
            self.tasa_efectividad = 0
        else:
            contratados = self.postulaciones.filter(
                estado='contratado'
            ).count()
            self.tasa_efectividad = (contratados / total_enviados) * 100
        self.save()


class AsignacionBusqueda(models.Model):
    """
    Registra la asignación de una búsqueda a un selector.
    Un perfil puede asignarse a múltiples selectores.
    """
    
    ESTADO_ASIGNACION = [
        ('nueva', 'Nueva Asignación'),
        ('aceptada', 'Aceptada'),
        ('rechazada', 'Rechazada'),
        ('completada', 'Completada (Perfil Cubierto)'),
        ('cancelada', 'Cancelada'),
    ]
    
    selector = models.ForeignKey(
        Selector,
        on_delete=models.CASCADE,
        related_name='asignaciones_busqueda'
    )
    perfil_busqueda = models.ForeignKey(
        'empresas.PerfilBusqueda',
        on_delete=models.CASCADE,
        related_name='asignaciones_selectores'
    )
    
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_ASIGNACION,
        default='nueva'
    )
    
    # Detalles de la asignación
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    fecha_aceptacion = models.DateTimeField(null=True, blank=True)
    fecha_rechazo = models.DateTimeField(null=True, blank=True)
    motivo_rechazo = models.TextField(blank=True)
    
    # Plazo
    fecha_limite_entrega = models.DateField(null=True, blank=True)
    cantidad_postulantes_esperados = models.PositiveIntegerField(
        default=3,
        help_text="Cantidad mínima de postulantes esperados"
    )
    
    # Notas
    notas = models.TextField(blank=True, help_text="Instrucciones especiales")
    
    # Seguimiento
    cantidad_postulantes_enviados = models.PositiveIntegerField(default=0)
    cantidad_contratados = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'asignaciones_busqueda'
        unique_together = ['selector', 'perfil_busqueda']
        ordering = ['-fecha_asignacion']
        indexes = [
            models.Index(fields=['selector', 'estado']),
            models.Index(fields=['perfil_busqueda', 'estado']),
        ]
    
    def __str__(self):
        return f"{self.selector.nombre_completo} - {self.perfil_busqueda.titulo_puesto}"


class HistorialSelectores(models.Model):
    """
    Histórico de cambios de estado de asignaciones.
    Útil para auditoría y análisis de performance.
    """
    
    asignacion = models.ForeignKey(
        AsignacionBusqueda,
        on_delete=models.CASCADE,
        related_name='historial'
    )
    
    estado_anterior = models.CharField(max_length=20)
    estado_nuevo = models.CharField(max_length=20)
    fecha_cambio = models.DateTimeField(auto_now_add=True)
    motivo = models.TextField(blank=True)
    
    class Meta:
        db_table = 'historial_selectores'
        ordering = ['-fecha_cambio']
    
    def __str__(self):
        return f"{self.asignacion} - {self.estado_anterior} → {self.estado_nuevo}"
