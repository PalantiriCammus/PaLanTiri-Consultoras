# empresas/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class CodigoPuesto(models.Model):
    codigo = models.CharField(max_length=4, unique=True, help_text="Código de 4 letras (ej: DESA)")
    nombre = models.CharField(max_length=100, help_text="Nombre del puesto (ej: Desarrollador)")

    class Meta:
        db_table = 'codigos_puesto'
        verbose_name = 'Código de Puesto'
        verbose_name_plural = 'Códigos de Puesto'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class CodigoTitulo(models.Model):
    codigo = models.CharField(max_length=4, unique=True, help_text="Código de 4 letras (ej: CONT)")
    nombre = models.CharField(max_length=100, help_text="Nombre de la profesión o título (ej: Contador)")

    class Meta:
        db_table = 'codigos_titulo'
        verbose_name = 'Código de Título'
        verbose_name_plural = 'Códigos de Título'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class Rubro(models.Model):
    """
    Modelo para los rubros o sectores de actividad a los que se dedican las empresas.
    """
    nombre = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'rubros'
        verbose_name = 'Rubro'
        verbose_name_plural = 'Rubros'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


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
    rubro = models.ForeignKey(
        Rubro,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='empresas'
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
    codigo_postal = models.CharField(max_length=20, blank=True, null=True)
    latitud = models.FloatField(null=True, blank=True, help_text="Coordenada GPS")
    longitud = models.FloatField(null=True, blank=True, help_text="Coordenada GPS")
    
    # Contacto de RRHH / responsable de búsquedas
    contacto_nombre = models.CharField(max_length=255)
    contacto_email = models.EmailField()
    contacto_telefono = models.CharField(max_length=20, blank=True)
    contacto_puesto = models.CharField(max_length=100, blank=True)
    
    # Responsable comercial
    contacto_comercial_nombre = models.CharField(max_length=255, blank=True, null=True)
    contacto_comercial_cargo = models.CharField(max_length=100, blank=True, null=True)
    contacto_comercial_telefono = models.CharField(max_length=20, blank=True, null=True)
    contacto_comercial_email = models.EmailField(blank=True, null=True)
    
    # Modalidad de trabajo comercial
    modalidad_contratacion = models.CharField(
        max_length=20,
        choices=[
            ('a_riesgo', 'A riesgo'),
            ('con_anticipo', 'Con anticipo'),
        ],
        default='a_riesgo'
    )
    garantia = models.CharField(
        max_length=20,
        choices=[
            ('con_garantia', 'Con garantía'),
            ('sin_garantia', 'Sin garantía'),
        ],
        default='con_garantia'
    )
    
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

    fecha_registro = models.DateTimeField(auto_now_add=True, db_index=True)
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
    codigo = models.CharField(
        max_length=4,
        blank=True,
        null=True,
        help_text="Código identificador de 4 caracteres para la empresa"
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
        return self.perfiles_busqueda.filter(estado__nombre='Abiertas').exists()

    def save(self, *args, **kwargs):
        if not self.codigo and self.nombre:
            clean_name = "".join(c for c in self.nombre if c.isalnum()).upper()
            self.codigo = clean_name[:4].ljust(4, 'X')
        super().save(*args, **kwargs)


class EstadoBusqueda(models.Model):
    codigo = models.CharField(max_length=50, unique=True, null=True, blank=True, help_text="Código único identificador")
    nombre = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=7, default='#34c759')
    no_borrable = models.BooleanField(default=False)
    orden = models.PositiveIntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'estados_busqueda'
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class PerfilBusqueda(models.Model):
    """
    Modelo para los perfiles de búsqueda que solicita una empresa.
    Define qué tipo de profesional se necesita.
    """
    
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
        blank=True,
        help_text="Lista de habilidades requeridas (separadas por comas)"
    )
    habilidades_tecnicas = models.ManyToManyField(
        'postulantes.Habilidad',
        blank=True,
        related_name='perfiles_requieren'
    )
    educacion_minima = models.CharField(
        max_length=255,
        blank=True,
        help_text="Ej: Licenciatura en Informática, Contador Público, etc."
    )
    nivel_estudio_minimo = models.ForeignKey(
        'postulantes.NivelEstudio',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    experiencia_minima_anios = models.PositiveIntegerField(
        default=1,
        help_text="Años de experiencia mínimos requeridos"
    )
    
    # Ubicación del puesto
    es_remoto = models.BooleanField(default=False)
    ubicacion_puesto = models.CharField(max_length=255, blank=True)
    tipos_empleo = models.ManyToManyField(
        'postulantes.TipoEmpleo',
        blank=True,
        related_name='perfiles_buscan'
    )
    
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
    estado = models.ForeignKey(
        EstadoBusqueda,
        on_delete=models.PROTECT,
        related_name='perfiles_busqueda',
        null=True,
        blank=True
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
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_index=True)
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
    
    # Campos agregados según lógica de selectores ConfiaRH
    jd_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Link al documento de Job Description (JD) de Google Docs"
    )
    flyer_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Link al archivo de Flyer promocional en Google Drive"
    )
    flyer_imagen = models.ImageField(
        upload_to='flyers/',
        blank=True,
        null=True,
        help_text="Imagen del flyer generado para promoción en redes"
    )
    comision_porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Comisión específica para esta búsqueda (sobreescribe la de la empresa)"
    )
    salario_estipulado_comision = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Salario estipulado para pago de comisión"
    )

    # Campos de Job Description para Generación y Exportación en Word
    mision_puesto = models.TextField(
        blank=True,
        null=True,
        help_text="Misión u objetivo principal del puesto"
    )
    responsabilidades = models.TextField(
        blank=True,
        null=True,
        help_text="Responsabilidades y tareas clave del puesto (una por línea o viñetas)"
    )
    requisitos_excluyentes = models.TextField(
        blank=True,
        null=True,
        help_text="Requisitos excluyentes o indispensables (uno por línea)"
    )
    requisitos_deseables = models.TextField(
        blank=True,
        null=True,
        help_text="Requisitos deseables, complementarios o valorados (uno por línea)"
    )
    jornada_laboral = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Días y horarios de trabajo. Ej: Lunes a Viernes de 9 a 18 hs"
    )
    observaciones = models.TextField(
        blank=True,
        null=True,
        help_text="Observaciones o notas de entrega importantes"
    )
    candidato_ideal = models.TextField(
        blank=True,
        null=True,
        help_text="Descripción del perfil del candidato ideal"
    )
    preguntas_informe = models.TextField(
        blank=True,
        null=True,
        help_text="Preguntas filtro a incluir en el informe de entrevista"
    )
    descansos = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Tiempos de descanso/breaks"
    )
    convenio = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Convenio colectivo aplicable (ej: SMATA, Fuera de convenio)"
    )
    edad_rango = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Rango de edad sugerido"
    )
    zona_residencia = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Zona de residencia sugerida"
    )
    fecha_inicio = models.DateField(
        blank=True,
        null=True,
        help_text="Fecha estimada de inicio"
    )
    google_form_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="ID del Formulario de Google para ingesta"
    )
    codigo_puesto = models.CharField(
        max_length=4,
        blank=True,
        null=True,
        help_text="Código de puesto de 4 caracteres (ej: DESA)"
    )
    codigo_titulo = models.CharField(
        max_length=4,
        blank=True,
        null=True,
        help_text="Código de profesión/título de 4 caracteres (ej: CONT)"
    )
    codigo_busqueda = models.CharField(
        max_length=100,
        unique=True,
        blank=True,
        null=True,
        help_text="Código único de la búsqueda para sincronización global"
    )


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
        return self.postulaciones.filter(
            estado__in=['enviada', 'entrevista', 'oferta']
        )
    
    def cantidad_postulantes_enviados(self):
        """Retorna cuántos postulantes se han enviado para este perfil"""
        return self.postulaciones.exclude(
            estado__in=['rechazada', 'cancelada']
        ).count()

    def save(self, *args, **kwargs):
        if self.empresa:
            if not self.empresa.codigo:
                self.empresa.save()
            co_emp = self.empresa.codigo or "XXXX"
            
            co_pue = "".join(c for c in (self.codigo_puesto or "PUE") if c.isalnum()).upper()
            co_pue = co_pue[:4].ljust(4, 'X')
            self.codigo_puesto = co_pue
            
            co_tit = "".join(c for c in (self.codigo_titulo or "TIT") if c.isalnum()).upper()
            co_tit = co_tit[:4].ljust(4, 'X')
            self.codigo_titulo = co_tit
            
            if not self.codigo_busqueda or not self.codigo_busqueda.startswith(f"{co_emp}-{co_pue}-{co_tit}-"):
                seq_num = PerfilBusqueda.objects.filter(empresa=self.empresa).count() + 1
                if self.pk and self.codigo_busqueda:
                    try:
                        seq_str = self.codigo_busqueda.split('-')[-1]
                        if len(seq_str) == 4 and seq_str.isdigit():
                            seq_num = int(seq_str)
                    except:
                        pass
                seq_str = str(seq_num).zfill(4)
                self.codigo_busqueda = f"{co_emp}-{co_pue}-{co_tit}-{seq_str}"
        super().save(*args, **kwargs)


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


class ConfiguracionAlerta(models.Model):
    DESTINATARIOS_CHOICES = [
        ('asignados', 'Solo selectores asignados a la búsqueda'),
        ('activos', 'Todos los selectores activos'),
        ('ambos', 'Ambos (Asignados y Activos)'),
        ('cierre', 'Solo el selector de Cierre (comisión)'),
        ('sourcing', 'Solo el selector de Sourcing (comisión)'),
        ('ambos_comision', 'Ambos selectores de la comisión (Sourcing y Cierre)'),
        ('grupo', 'Un grupo específico de selectores'),
        ('especifico', 'Un selector individual específico'),
    ]

    evento_codigo = models.CharField(max_length=50, unique=True, help_text="Código único del evento (ej: nueva_busqueda)")
    nombre = models.CharField(max_length=100, help_text="Nombre del tipo de alerta")
    activar_email = models.BooleanField(default=True)
    activar_whatsapp = models.BooleanField(default=True)
    
    plantilla_email = models.TextField(help_text="Plantilla para el Email.")
    plantilla_whatsapp = models.TextField(help_text="Plantilla para WhatsApp.")
    
    destinatarios = models.CharField(max_length=20, choices=DESTINATARIOS_CHOICES, default='asignados')
    
    # Nuevos campos para grupo o selector específico
    destinatario_grupo = models.ForeignKey(
        'selectores.GrupoSelector', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='alertas_configuradas'
    )
    destinatario_especifico = models.ForeignKey(
        'selectores.Selector', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='alertas_especificas'
    )

    class Meta:
        db_table = 'configuracion_alertas'
        verbose_name = 'Configuración de Alerta'
        verbose_name_plural = 'Configuraciones de Alerta'

    def __str__(self):
        return f"{self.nombre} ({self.evento_codigo})"


