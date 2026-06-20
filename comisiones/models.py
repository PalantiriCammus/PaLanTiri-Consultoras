# comisiones/models.py

from django.db import models
from django.utils import timezone
from decimal import Decimal

class EstadoComision(models.Model):
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

    codigo = models.CharField(max_length=50, unique=True, help_text="Código único identificador (ej: pagada)")
    nombre = models.CharField(max_length=100, help_text="Nombre visible (ej: Pagada)")
    descripcion = models.TextField(blank=True, help_text="Descripción del estado")
    color = models.CharField(max_length=7, default='#34c759', help_text="Código de color hexadecimal")
    no_borrable = models.BooleanField(default=False, help_text="Evita la eliminación de estados críticos")

    # Configuración de alertas por estado
    activar_email = models.BooleanField(default=False)
    activar_whatsapp = models.BooleanField(default=False)
    plantilla_email = models.TextField(blank=True, help_text="Variables: {nombre_selector}, {monto_comision}, {candidato_nombre}, {puesto}, {empresa_nombre}")
    plantilla_whatsapp = models.TextField(blank=True, help_text="Variables: {nombre_selector}, {monto_comision}, {candidato_nombre}, {puesto}, {empresa_nombre}")

    destinatarios = models.CharField(max_length=20, choices=DESTINATARIOS_CHOICES, default='cierre')
    destinatario_grupo = models.ForeignKey(
        'selectores.GrupoSelector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='estados_comision_alertas'
    )
    destinatario_especifico = models.ForeignKey(
        'selectores.Selector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='estados_comision_alertas_especificas'
    )

    class Meta:
        db_table = 'estados_comision'
        verbose_name = 'Estado de Comisión'
        verbose_name_plural = 'Estados de Comisión'

    def __str__(self):
        return self.nombre


class EsquemaComision(models.Model):
    """
    Define escalas o reglas para comisiones escalonadas.
    Ej: 'Estándar', 'Premium', etc.
    """
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    
    # Porcentajes base
    porcentaje_sourcing = models.DecimalField(max_digits=5, decimal_places=2, default=10.00, help_text="Porcentaje para quien aporta el candidato")
    porcentaje_cierre = models.DecimalField(max_digits=5, decimal_places=2, default=40.00, help_text="Porcentaje para quien cierra la búsqueda")

    class Meta:
        db_table = 'esquemas_comision'
        verbose_name = 'Esquema de Comisión'
        verbose_name_plural = 'Esquemas de Comisión'

    def __str__(self):
        return self.nombre


class Comision(models.Model):
    """
    Gestiona el ciclo de vida de la comisión por una postulación exitosa.
    """
    
    ESTADO_CHOICES = [
        ('calculada', 'Calculada'),
        ('pendiente_cobro', 'Pendiente de Cobro (Empresa)'),
        ('cobrada', 'Cobrada (Empresa)'),
        ('pendiente_pago', 'Pendiente de Pago (Selector)'),
        ('pagada', 'Pagada (Selector)'),
        ('garantia', 'En Período de Garantía'),
        ('completada', 'Completada'),
        ('anulada', 'Anulada'),
    ]
    
    postulacion = models.OneToOneField(
        'postulaciones.Postulacion',
        on_delete=models.CASCADE,
        related_name='comision'
    )
    
    # Relaciones denormalizadas para facilidad de consulta
    selector = models.ForeignKey(
        'selectores.Selector',
        on_delete=models.CASCADE,
        related_name='comisiones_generadas'
    )
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='comisiones_pagadas'
    )
    
    # Datos económicos
    salario_mensual = models.DecimalField(max_digits=12, decimal_places=2)
    comision_porcentaje_empresa = models.DecimalField(max_digits=5, decimal_places=2)
    comision_porcentaje_selector = models.DecimalField(max_digits=5, decimal_places=2)
    
    # División
    porcentaje_sourcing = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    porcentaje_cierre = models.DecimalField(max_digits=5, decimal_places=2, default=40.00)
    
    monto_total = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        help_text="Monto total de la comisión facturada a la empresa"
    )
    monto_empresa = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Ganancia neta para la consultora"
    )
    monto_selector = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Monto total a pagar a los selectores"
    )
    monto_sourcing = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Monto para el selector que aportó el candidato"
    )
    monto_cierre = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Monto para el selector que cerró la posición"
    )
    
    # Selectores involucrados extra
    selector_sourcing = models.ForeignKey(
        'selectores.Selector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='comisiones_sourcing'
    )
    
    # Clawback
    aplica_clawback = models.BooleanField(default=False, help_text="Si el candidato no superó la garantía")
    monto_devolucion = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Monto a descontar por clawback")
    
    # Fechas y control
    estado = models.ForeignKey(
        EstadoComision,
        on_delete=models.PROTECT,
        related_name='comisiones',
        default=1
    )
    
    fecha_calculo = models.DateTimeField(auto_now_add=True)
    fecha_inicio_trabajo = models.DateField()
    fecha_vencimiento_garantia = models.DateField()
    
    # Información de pago final
    fecha_pago = models.DateField(null=True, blank=True)
    numero_comprobante = models.CharField(max_length=100, blank=True)
    metodo_pago = models.CharField(max_length=50, blank=True)
    
    notas = models.TextField(blank=True)
    
    class Meta:
        db_table = 'comisiones'
        ordering = ['-fecha_calculo']

    def __str__(self):
        return f"Comisión {self.postulacion} - {self.monto_total}"

    def calcular_montos(self):
        """Calcula los montos basados en porcentajes"""
        # Monto total = % que paga la empresa sobre el salario
        self.monto_total = (self.salario_mensual * self.comision_porcentaje_empresa) / Decimal('100.00')
        
        # Monto selector = suma de los porcentajes de sourcing y cierre
        pct_total_selectores = self.porcentaje_sourcing + self.porcentaje_cierre
        self.comision_porcentaje_selector = pct_total_selectores
        self.monto_selector = (self.monto_total * pct_total_selectores) / Decimal('100.00')
        
        # Desglose
        self.monto_sourcing = (self.monto_total * self.porcentaje_sourcing) / Decimal('100.00')
        self.monto_cierre = (self.monto_total * self.porcentaje_cierre) / Decimal('100.00')
        
        # Ganancia consultora = Resto
        self.monto_empresa = self.monto_total - self.monto_selector
        self.save()


class PagoComision(models.Model):
    """
    Registro detallado de un pago de comisión (puede haber pagos parciales).
    """
    
    METODO_CHOICES = [
        ('transferencia', 'Transferencia Bancaria'),
        ('efectivo', 'Efectivo'),
        ('cheque', 'Cheque'),
        ('otro', 'Otro'),
    ]
    
    comision = models.ForeignKey(
        Comision,
        on_delete=models.CASCADE,
        related_name='pagos'
    )
    
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_pago = models.DateField(default=timezone.now)
    metodo = models.CharField(max_length=20, choices=METODO_CHOICES, default='transferencia')
    numero_comprobante = models.CharField(max_length=100, blank=True)
    
    # Datos bancarios
    banco_origen = models.CharField(max_length=100, blank=True)
    banco_destino = models.CharField(max_length=100, blank=True)
    cuenta_destino = models.CharField(max_length=100, blank=True)
    
    notas = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'pagos_comision'
        ordering = ['-fecha_pago']

    def __str__(self):
        return f"Pago {self.monto} - {self.fecha_pago}"


from django.db.models.signals import post_save
from django.dispatch import receiver
from postulaciones.models import Postulacion
from postulantes.models import Postulante
from datetime import timedelta

@receiver(post_save, sender=Postulacion)
def crear_comision_automatica(sender, instance, created, **kwargs):
    if instance.estado == 'contratado':
        # Evitar crear duplicados
        try:
            _ = instance.comision
            return  # Ya existe, no hacer nada
        except Comision.DoesNotExist:
            pass
        if True:  # bloque para mantener indentación
            from selectores.models import Selector
            
            # Obtener el selector
            selector = instance.selector or instance.postulante.selector or (
                instance.perfil_busqueda.selector_asignado
            )
            
            # Si no hay selector asignado, buscar cualquier activo
            if not selector:
                selector = Selector.objects.filter(estado='activo').first()
                
            if not selector:
                return
                
            # Calcular salario mensual (priorizando el salario estipulado para comisión)
            salario = Decimal('0.00')
            if instance.perfil_busqueda.salario_estipulado_comision is not None:
                salario = instance.perfil_busqueda.salario_estipulado_comision
            elif hasattr(instance, 'informe_entrevista') and instance.informe_entrevista.sueldo_bruto_pretendido:
                salario = instance.informe_entrevista.sueldo_bruto_pretendido
            elif instance.postulante.salario_pretendido_minimo:
                salario = instance.postulante.salario_pretendido_minimo
            elif instance.perfil_busqueda.salario_minimo:
                salario = instance.perfil_busqueda.salario_minimo
            
            # Porcentajes
            pct_empresa = Decimal('20.00')
            if instance.perfil_busqueda.comision_porcentaje is not None:
                pct_empresa = instance.perfil_busqueda.comision_porcentaje
            elif instance.perfil_busqueda.empresa.comision_porcentaje is not None:
                pct_empresa = instance.perfil_busqueda.empresa.comision_porcentaje
                
            pct_selector = Decimal('50.00')
            if selector.comision_porcentaje_defecto is not None:
                pct_selector = selector.comision_porcentaje_defecto
                
            # Fechas
            fecha_inicio = instance.fecha_inicio_laboral or timezone.now().date()
            fecha_garantia = fecha_inicio + timedelta(days=90)
            
            # Crear comisión
            com = Comision.objects.create(
                postulacion=instance,
                selector=selector,
                empresa=instance.perfil_busqueda.empresa,
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
            # Calcular montos
            com.calcular_montos()


@receiver(post_save, sender=Postulante)
def actualizar_postulaciones_al_contratar(sender, instance, **kwargs):
    # instance.estado es un objeto EstadoPostulante (FK), comparar por nombre
    estado_nombre = ''
    if instance.estado:
        estado_nombre = instance.estado.nombre.lower()
    
    if estado_nombre == 'contratado':
        # Buscar postulaciones activas y marcarlas como contratado
        postulaciones_activas = instance.postulaciones.exclude(
            estado__in=['contratado', 'rechazada_empresa', 'rechazada_postulante', 'cancelada']
        )
        for post in postulaciones_activas:
            post.estado = 'contratado'
            post.save()  # esto dispara crear_comision_automatica via signal


@receiver(post_save, sender=Comision)
def notificar_cambios_comision(sender, instance, created, **kwargs):
    from empresas.signals import despachar_alerta, despachar_alerta_estado_comision
    
    candidato_completo = f"{instance.postulacion.postulante.nombre} {instance.postulacion.postulante.apellido}"
    variables = {
        '{nombre_selector}': instance.selector.nombre,
        '{titulo_puesto}': instance.postulacion.perfil_busqueda.titulo_puesto,
        '{puesto}': instance.postulacion.perfil_busqueda.titulo_puesto,
        '{empresa_nombre}': instance.empresa.nombre,
        '{salario_minimo}': str(instance.postulacion.perfil_busqueda.salario_minimo or 'No especificado'),
        '{habilidades_requeridas}': instance.postulacion.perfil_busqueda.habilidades_requeridas or 'No especificadas',
        '{monto_comision}': str(instance.monto_selector),
        '{monto_devolucion}': str(instance.monto_devolucion),
        '{candidato_nombre}': candidato_completo,
    }

    # 1. Alerta dinámica de cambio de estado de comisión
    if instance.estado:
        despachar_alerta_estado_comision(
            instance.estado,
            variables,
            selector_target=instance.selector,
            selector_sourcing=instance.selector_sourcing,
            selector_cierre=instance.selector
        )

    # 2. Alerta por Comisión Pagada (Histórico/Legacy)
    if instance.estado and instance.estado.codigo == 'pagada':
        despachar_alerta(
            'comision_pagada', 
            variables, 
            selector_target=instance.selector,
            selector_sourcing=instance.selector_sourcing,
            selector_cierre=instance.selector
        )
        
    # 3. Alerta por Garantía Ejecutada (Clawback) (Legacy)
    if instance.aplica_clawback:
        variables_garantia = variables.copy()
        variables_garantia['{monto_devolucion}'] = str(instance.monto_devolucion)
        despachar_alerta(
            'garantia_ejecutada', 
            variables_garantia, 
            selector_target=instance.selector,
            selector_sourcing=instance.selector_sourcing,
            selector_cierre=instance.selector
        )


