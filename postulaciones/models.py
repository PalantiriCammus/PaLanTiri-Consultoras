# postulaciones/models.py

from django.db import models
from django.utils import timezone
from datetime import timedelta

class Postulacion(models.Model):
    """
    Modelo central que conecta un postulante con un perfil de búsqueda.
    Registra todo el ciclo de vida de una postulación.
    """
    
    ESTADO_CHOICES = [
        ('enviada', 'Enviada'),
        ('recibida', 'Recibida por Empresa'),
        ('entrevista', 'En Entrevista'),
        ('oferta', 'Oferta Realizada'),
        ('aceptada_postulante', 'Aceptada por Postulante'),
        ('contratado', 'Contratado'),
        ('rechazada_empresa', 'Rechazada por Empresa'),
        ('rechazada_postulante', 'Rechazada por Postulante'),
        ('cancelada', 'Cancelada'),
    ]
    
    # Relaciones principales
    postulante = models.ForeignKey(
        'postulantes.Postulante',
        on_delete=models.CASCADE,
        related_name='postulaciones'
    )
    perfil_busqueda = models.ForeignKey(
        'empresas.PerfilBusqueda',
        on_delete=models.CASCADE,
        related_name='postulaciones'
    )
    selector = models.ForeignKey(
        'selectores.Selector',
        on_delete=models.SET_NULL,
        null=True,
        related_name='postulaciones'
    )
    
    # Estado y seguimiento
    estado = models.CharField(
        max_length=30,
        choices=ESTADO_CHOICES,
        default='enviada'
    )
    
    # Fechas de progresión
    fecha_envio = models.DateTimeField(auto_now_add=True)
    fecha_recepcion_empresa = models.DateTimeField(null=True, blank=True)
    fecha_primera_entrevista = models.DateTimeField(null=True, blank=True)
    fecha_oferta = models.DateTimeField(null=True, blank=True)
    fecha_aceptacion_postulante = models.DateTimeField(null=True, blank=True)
    fecha_inicio_laboral = models.DateField(null=True, blank=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    
    # Evaluaciones y feedback
    puntaje_empresa = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Puntaje dado por la empresa (1-10)"
    )
    feedback_empresa = models.TextField(
        blank=True,
        help_text="Feedback de la empresa sobre el postulante"
    )
    
    motivo_rechazo = models.CharField(
        max_length=255,
        blank=True,
        help_text="Motivo en caso de rechazo"
    )
    
    # Notas internas
    notas_selector = models.TextField(
        blank=True,
        help_text="Notas privadas del selector"
    )
    notas_admin = models.TextField(
        blank=True,
        help_text="Notas internas del equipo administrativo"
    )
    
    class Meta:
        db_table = 'postulaciones'
        ordering = ['-fecha_envio']
        unique_together = ['postulante', 'perfil_busqueda']
        indexes = [
            models.Index(fields=['estado']),
            models.Index(fields=['postulante', 'estado']),
            models.Index(fields=['perfil_busqueda', 'estado']),
            models.Index(fields=['-fecha_envio']),
        ]
    
    def __str__(self):
        return f"{self.postulante.nombre_completo} → {self.perfil_busqueda.titulo_puesto}"
    
    def cambiar_estado(self, nuevo_estado, motivo='', fecha=None):
        """
        Cambia el estado de la postulación y registra el cambio en el historial.
        """
        if nuevo_estado not in dict(self.ESTADO_CHOICES):
            raise ValueError(f"Estado inválido: {nuevo_estado}")
        
        estado_anterior = self.estado
        self.estado = nuevo_estado
        
        # Actualizar fechas automáticamente según el estado
        ahora = fecha or timezone.now()
        if nuevo_estado == 'recibida':
            self.fecha_recepcion_empresa = ahora
        elif nuevo_estado == 'entrevista':
            self.fecha_primera_entrevista = ahora
        elif nuevo_estado == 'oferta':
            self.fecha_oferta = ahora
        elif nuevo_estado == 'aceptada_postulante':
            self.fecha_aceptacion_postulante = ahora
        elif nuevo_estado in ['contratado', 'rechazada_empresa', 'rechazada_postulante', 'cancelada']:
            self.fecha_cierre = ahora
        
        self.save()
        
        # Registrar en historial
        HistorialPostulacion.objects.create(
            postulacion=self,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            motivo=motivo
        )
    
    def puede_cambiar_a(self, nuevo_estado):
        """
        Valida si el cambio de estado es permitido.
        Define flujo de estados válidos.
        """
        flujos_validos = {
            'enviada': ['recibida', 'rechazada_empresa', 'cancelada'],
            'recibida': ['entrevista', 'rechazada_empresa', 'cancelada'],
            'entrevista': ['oferta', 'rechazada_empresa', 'cancelada'],
            'oferta': ['aceptada_postulante', 'rechazada_postulante', 'cancelada'],
            'aceptada_postulante': ['contratado', 'cancelada'],
            'contratado': [],
            'rechazada_empresa': [],
            'rechazada_postulante': [],
            'cancelada': [],
        }
        
        return nuevo_estado in flujos_validos.get(self.estado, [])
    
    def dias_en_proceso(self):
        """Calcula cuántos días lleva en proceso esta postulación"""
        fecha_fin = self.fecha_cierre or timezone.now()
        return (fecha_fin - self.fecha_envio).days
    
    def esta_pendiente(self):
        """Retorna True si la postulación está pendiente (no tiene resultado final)"""
        return self.estado not in [
            'contratado', 'rechazada_empresa', 
            'rechazada_postulante', 'cancelada'
        ]


class HistorialPostulacion(models.Model):
    """
    Registro de todos los cambios de estado de una postulación.
    Importante para auditoría y análisis.
    """
    
    postulacion = models.ForeignKey(
        Postulacion,
        on_delete=models.CASCADE,
        related_name='historial'
    )
    
    estado_anterior = models.CharField(max_length=30)
    estado_nuevo = models.CharField(max_length=30)
    fecha_cambio = models.DateTimeField(auto_now_add=True)
    motivo = models.TextField(blank=True)
    
    class Meta:
        db_table = 'historial_postulacion'
        ordering = ['-fecha_cambio']
    
    def __str__(self):
        return f"{self.postulacion} - {self.estado_anterior} → {self.estado_nuevo}"


class EntrevistaAgendada(models.Model):
    """
    Modelo para agendar entrevistas integrado con Google Calendar y Meet.
    """
    
    TIPO_ENTREVISTA = [
        ('seleccion', 'Entrevista de Selección'),
        ('tecnica', 'Entrevista Técnica'),
        ('rrhh', 'Entrevista RRHH'),
        ('final', 'Entrevista Final'),
    ]
    
    postulacion = models.ForeignKey(
        Postulacion,
        on_delete=models.CASCADE,
        related_name='entrevistas'
    )
    
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_ENTREVISTA,
        default='seleccion'
    )
    
    # Detalles
    fecha_hora = models.DateTimeField()
    duracion_minutos = models.PositiveIntegerField(default=60)
    
    entrevistador = models.CharField(
        max_length=255,
        help_text="Nombre/Email de quien realiza la entrevista"
    )
    
    # Videoconferencia
    usa_google_meet = models.BooleanField(default=True)
    google_meet_url = models.URLField(blank=True, null=True)
    google_event_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="ID del evento en Google Calendar"
    )
    
    # Ubicación alternativa
    ubicacion = models.CharField(
        max_length=255,
        blank=True,
        help_text="Si es presencial"
    )
    
    # Resultado
    realizada = models.BooleanField(default=False)
    fecha_resultado = models.DateTimeField(null=True, blank=True)
    resultado = models.CharField(
        max_length=50,
        choices=[
            ('no_evaluado', 'No Evaluado'),
            ('favorable', 'Favorable'),
            ('revisar', 'A Revisar'),
            ('desfavorable', 'Desfavorable'),
            ('no_asistio', 'No Asistió'),
        ],
        default='no_evaluado'
    )
    
    comentarios_entrevistador = models.TextField(blank=True)
    
    class Meta:
        db_table = 'entrevistas_agendadas'
        ordering = ['fecha_hora']
    
    def __str__(self):
        return f"{self.postulacion} - {self.tipo} ({self.fecha_hora})"
    
    def esta_proxima(self, minutos=30):
        """Retorna True si la entrevista es en menos de X minutos"""
        desde = timezone.now()
        hasta = desde + timedelta(minutes=minutos)
        return desde <= self.fecha_hora <= hasta
    
    def es_futura(self):
        """Retorna True si la entrevista aún no sucede"""
        return self.fecha_hora > timezone.now() and not self.realizada
    
    def horas_hasta_entrevista(self):
        """Calcula horas hasta la entrevista"""
        diferencia = self.fecha_hora - timezone.now()
        return diferencia.total_seconds() / 3600


class SeguimientoGarantia(models.Model):
    """
    Modelo para el período de garantía.
    Si el postulante no completa X días/meses, se debe enviar sin comisión.
    """
    
    ESTADO_GARANTIA = [
        ('vigente', 'Vigente'),
        ('completada', 'Completada (Garantía OK)'),
        ('incumplida', 'Incumplida (Necesita Reemplazo)'),
        ('anulada', 'Anulada'),
    ]
    
    postulacion = models.OneToOneField(
        Postulacion,
        on_delete=models.CASCADE,
        related_name='garantia'
    )
    
    # Parámetros de garantía
    dias_garantia = models.PositiveIntegerField(
        default=90,
        help_text="Días que el postulante debe estar empleado"
    )
    
    # Fecha de inicio (cuando fue contratado)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_vencimiento = models.DateField(null=True, blank=True)
    
    # Estado
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_GARANTIA,
        default='vigente'
    )
    
    # Seguimiento
    fecha_fin_real = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha en que terminó el contrato (si fue antes de vencimiento)"
    )
    motivo_incumplimiento = models.CharField(
        max_length=255,
        blank=True,
        choices=[
            ('empresa_despidio', 'Empresa despidió al empleado'),
            ('postulante_renuncio', 'Postulante renunció'),
            ('acuerdo', 'Acuerdo mutuo'),
            ('otro', 'Otro'),
        ]
    )
    
    # Reemplazo obligatorio
    perfil_busqueda_reemplazo = models.ForeignKey(
        'empresas.PerfilBusqueda',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='garantias_incumplidas',
        help_text="Nueva búsqueda sin comisión para reemplazo"
    )
    postulacion_reemplazo = models.ForeignKey(
        Postulacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='es_reemplazo_de',
        help_text="Postulación del postulante de reemplazo (sin comisión)"
    )
    
    # Notas
    notas = models.TextField(blank=True)
    
    class Meta:
        db_table = 'seguimiento_garantia'
    
    def __str__(self):
        return f"Garantía de {self.postulacion} ({self.estado})"
    
    def calcular_vencimiento(self):
        """Calcula la fecha de vencimiento de garantía"""
        if self.fecha_inicio:
            self.fecha_vencimiento = self.fecha_inicio + timedelta(days=self.dias_garantia)
    
    def esta_proxima_a_vencer(self, dias=15):
        """Retorna True si la garantía vence en menos de X días"""
        if not self.fecha_vencimiento:
            return False
        dias_restantes = (self.fecha_vencimiento - timezone.now().date()).days
        return 0 < dias_restantes <= dias
    
    def ya_vencio(self):
        """Retorna True si ya pasó la fecha de vencimiento"""
        if not self.fecha_vencimiento:
            return False
        return self.fecha_vencimiento <= timezone.now().date()
    
    def marcar_completada(self):
        """Marca la garantía como completada"""
        self.estado = 'completada'
        self.save()
    
    def marcar_incumplida(self, motivo, fecha_fin):
        """Marca la garantía como incumplida y requiere reemplazo"""
        self.estado = 'incumplida'
        self.motivo_incumplimiento = motivo
        self.fecha_fin_real = fecha_fin
        self.save()


class InformeEntrevista(models.Model):
    """
    Formulario de informe de entrevista detallado por el selector.
    """
    postulacion = models.OneToOneField(
        Postulacion,
        on_delete=models.CASCADE,
        related_name='informe_entrevista'
    )
    
    fecha_entrevista = models.DateField(default=timezone.now)
    empresa_puesto_actual = models.CharField(max_length=255, blank=True)
    
    experiencia_detalle = models.TextField(
        blank=True,
        help_text="Años de experiencia, tecnologías, herramientas usadas, etc."
    )
    formacion_academica = models.TextField(
        blank=True,
        help_text="Título obtenido, en curso, etc."
    )
    situacion_actual = models.CharField(
        max_length=100,
        blank=True,
        help_text="Trabajando, desempleado, en búsqueda, etc."
    )
    sueldo_bruto_pretendido = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    comentarios_selector = models.TextField(
        blank=True,
        help_text="Comentarios y punto de vista del selector"
    )
    
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'informes_entrevista'
        ordering = ['-fecha_entrevista']

    def __str__(self):
        return f"Informe Entrevista: {self.postulacion.postulante.nombre_completo} para {self.postulacion.perfil_busqueda.titulo_puesto}"

