# 🔌 SERIALIZERS Y APIs REST COMPLETOS

Este archivo contiene los serializers de DRF (Django REST Framework) y los endpoints que necesitarás.

## 1. SERIALIZERS PARA EMPRESAS

```python
# empresas/serializers.py

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Empresa, PerfilBusqueda, ContactoEmpresa

class EmpresaSerializer(serializers.ModelSerializer):
    """
    Serializer completo de Empresa.
    Usado para listar, crear y actualizar empresas.
    """
    contactos_count = serializers.SerializerMethodField()
    perfiles_activos = serializers.SerializerMethodField()
    
    class Meta:
        model = Empresa
        fields = [
            'id', 'nombre', 'razon_social', 'tipo_empresa',
            'email_principal', 'email_alterno', 'telefono', 'website',
            'pais', 'provincia', 'ciudad', 'direccion',
            'latitud', 'longitud',
            'contacto_nombre', 'contacto_email', 'contacto_telefono',
            'contacto_puesto',
            'comision_porcentaje', 'salario_promedio_ofrecido',
            'activa', 'fecha_registro', 'fecha_ultima_busqueda',
            'google_contact_id', 'google_calendar_id',
            'contactos_count', 'perfiles_activos'
        ]
        read_only_fields = ['id', 'fecha_registro', 'fecha_ultima_busqueda']
    
    def get_contactos_count(self, obj):
        """Retorna cantidad de contactos"""
        return obj.contactos.count()
    
    def get_perfiles_activos(self, obj):
        """Retorna cantidad de perfiles abiertos"""
        return obj.perfiles_busqueda.filter(estado='abierto').count()


class EmpresaDetalleSerializer(EmpresaSerializer):
    """
    Vista detallada con relaciones incluidas.
    """
    contactos = serializers.SerializerMethodField()
    perfiles_busqueda = serializers.SerializerMethodField()
    
    def get_contactos(self, obj):
        """Incluye contactos de la empresa"""
        return ContactoEmpresaSerializer(
            obj.contactos.all(),
            many=True
        ).data
    
    def get_perfiles_busqueda(self, obj):
        """Incluye perfiles de búsqueda activos"""
        return PerfilBusquedaListSerializer(
            obj.perfiles_busqueda.filter(estado='abierto'),
            many=True
        ).data


class PerfilBusquedaListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listar perfiles.
    """
    empresa_nombre = serializers.CharField(
        source='empresa.nombre',
        read_only=True
    )
    cantidad_postulantes = serializers.SerializerMethodField()
    
    class Meta:
        model = PerfilBusqueda
        fields = [
            'id', 'empresa', 'empresa_nombre', 'titulo_puesto',
            'areas', 'nivel', 'estado', 'cantidad_posiciones',
            'salario_minimo', 'salario_maximo',
            'fecha_creacion', 'fecha_vencimiento',
            'cantidad_postulantes'
        ]
        read_only_fields = ['id', 'fecha_creacion']
    
    def get_cantidad_postulantes(self, obj):
        """Retorna cantidad de postulantes enviados"""
        return obj.cantidad_postulantes_enviados()


class PerfilBusquedaDetalleSerializer(serializers.ModelSerializer):
    """
    Serializer completo con todos los detalles del perfil de búsqueda.
    """
    empresa_nombre = serializers.CharField(
        source='empresa.nombre',
        read_only=True
    )
    selector_nombre = serializers.CharField(
        source='selector_asignado.nombre_completo',
        read_only=True,
        allow_null=True
    )
    postulaciones_activas = serializers.SerializerMethodField()
    
    class Meta:
        model = PerfilBusqueda
        fields = [
            'id', 'empresa', 'empresa_nombre', 'titulo_puesto',
            'descripcion', 'areas', 'nivel',
            'habilidades_requeridas', 'educacion_minima',
            'experiencia_minima_anios',
            'es_remoto', 'ubicacion_puesto',
            'salario_minimo', 'salario_maximo', 'beneficios',
            'estado', 'cantidad_posiciones',
            'selector_asignado', 'selector_nombre',
            'fecha_creacion', 'fecha_vencimiento', 'fecha_cierre',
            'prioridad', 'notas_internas',
            'postulaciones_activas'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_cierre']
    
    def get_postulaciones_activas(self, obj):
        """Retorna postulaciones en proceso"""
        postulaciones = obj.postulaciones_activas()
        from postulaciones.serializers import PostulacionListSerializer
        return PostulacionListSerializer(
            postulaciones,
            many=True
        ).data


class ContactoEmpresaSerializer(serializers.ModelSerializer):
    """
    Serializer para contactos dentro de una empresa.
    """
    class Meta:
        model = ContactoEmpresa
        fields = [
            'id', 'empresa', 'nombre', 'puesto', 'email',
            'telefono', 'departamento', 'es_contacto_principal',
            'fecha_agregado'
        ]
        read_only_fields = ['id', 'fecha_agregado']
```

---

## 2. SERIALIZERS PARA SELECTORES

```python
# selectores/serializers.py

from rest_framework import serializers
from .models import Selector, AsignacionBusqueda, HistorialSelectores

class SelectorSerializer(serializers.ModelSerializer):
    """
    Serializer para selectores freelance.
    """
    usuario_nombre = serializers.CharField(
        source='usuario.username',
        read_only=True
    )
    
    class Meta:
        model = Selector
        fields = [
            'id', 'usuario', 'usuario_nombre', 'nombre', 'apellido',
            'email', 'telefono', 'especializacion',
            'experiencia_anos', 'descripcion_perfil',
            'pais', 'provincia', 'ciudad',
            'estado',
            'cuit', 'banco', 'numero_cuenta', 'cbu', 'alias_cvu',
            'cantidad_postulantes_enviados', 'cantidad_contratados',
            'tasa_efectividad', 'comision_porcentaje_defecto',
            'fecha_registro', 'fecha_ultima_actividad'
        ]
        read_only_fields = [
            'id', 'cantidad_postulantes_enviados',
            'cantidad_contratados', 'tasa_efectividad',
            'fecha_registro', 'fecha_ultima_actividad'
        ]


class SelectorDetalleSerializer(SelectorSerializer):
    """
    Vista detallada con asignaciones e historial de performance.
    """
    asignaciones = serializers.SerializerMethodField()
    postulaciones_recientes = serializers.SerializerMethodField()
    comisiones_pendientes = serializers.SerializerMethodField()
    
    def get_asignaciones(self, obj):
        """Retorna asignaciones de búsqueda activas"""
        asignaciones = obj.asignaciones_busqueda.filter(
            estado__in=['aceptada', 'nueva']
        )
        return AsignacionBusquedaSerializer(
            asignaciones,
            many=True
        ).data
    
    def get_postulaciones_recientes(self, obj):
        """Últimas 5 postulaciones realizadas"""
        from postulaciones.serializers import PostulacionListSerializer
        postulaciones = obj.postulaciones.all()[:5]
        return PostulacionListSerializer(
            postulaciones,
            many=True
        ).data
    
    def get_comisiones_pendientes(self, obj):
        """Comisiones que aún no han sido pagadas"""
        from comisiones.models import Comision
        comisiones = Comision.objects.filter(
            selector=obj,
            estado__in=['calculada', 'garantia', 'completada']
        )
        total = sum([c.monto_selector for c in comisiones])
        return {'cantidad': comisiones.count(), 'monto_total': total}


class AsignacionBusquedaSerializer(serializers.ModelSerializer):
    """
    Serializer para asignaciones de búsqueda a selectores.
    """
    selector_nombre = serializers.CharField(
        source='selector.nombre_completo',
        read_only=True
    )
    perfil_titulo = serializers.CharField(
        source='perfil_busqueda.titulo_puesto',
        read_only=True
    )
    empresa_nombre = serializers.CharField(
        source='perfil_busqueda.empresa.nombre',
        read_only=True
    )
    
    class Meta:
        model = AsignacionBusqueda
        fields = [
            'id', 'selector', 'selector_nombre',
            'perfil_busqueda', 'perfil_titulo', 'empresa_nombre',
            'estado', 'fecha_asignacion', 'fecha_aceptacion',
            'fecha_rechazo', 'motivo_rechazo',
            'fecha_limite_entrega', 'cantidad_postulantes_esperados',
            'notas',
            'cantidad_postulantes_enviados', 'cantidad_contratados'
        ]
        read_only_fields = [
            'id', 'fecha_asignacion', 'fecha_aceptacion',
            'fecha_rechazo', 'cantidad_postulantes_enviados',
            'cantidad_contratados'
        ]
```

---

## 3. SERIALIZERS PARA POSTULANTES

```python
# postulantes/serializers.py

from rest_framework import serializers
from .models import Postulante, Categoria, TituloPostulante, NotaPostulante

class CategoriaSerializer(serializers.ModelSerializer):
    """
    Serializer para categorías de postulantes.
    """
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'descripcion', 'area', 'activa']


class PostulanteListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listar postulantes.
    """
    categorias_nombres = serializers.StringRelatedField(
        source='categorias',
        many=True,
        read_only=True
    )
    edad = serializers.SerializerMethodField()
    
    class Meta:
        model = Postulante
        fields = [
            'id', 'nombre', 'apellido', 'email', 'telefono',
            'titulo_principal', 'experiencia_anos',
            'provincia', 'ciudad',
            'estado', 'categorias_nombres', 'edad',
            'fecha_carga'
        ]
        read_only_fields = ['id', 'fecha_carga', 'edad']
    
    def get_edad(self, obj):
        return obj.edad


class PostulanteDetalleSerializer(serializers.ModelSerializer):
    """
    Serializer completo con todos los detalles del postulante.
    """
    categorias_nombres = serializers.StringRelatedField(
        source='categorias',
        many=True,
        read_only=True
    )
    edad = serializers.SerializerMethodField()
    cv_url = serializers.SerializerMethodField()
    postulaciones_activas = serializers.SerializerMethodField()
    notas = serializers.SerializerMethodField()
    
    class Meta:
        model = Postulante
        fields = [
            'id', 'nombre', 'apellido', 'email', 'telefono',
            'fecha_nacimiento', 'genero', 'edad',
            'pais', 'provincia', 'ciudad', 'disponibilidad_mudanza',
            'categorias_nombres',
            'titulo_principal', 'resumen_profesional',
            'experiencia_anos', 'titulaciones',
            'habilidades', 'idiomas',
            'salario_pretendido_minimo', 'salario_pretendido_maximo',
            'acepta_remoto', 'acepta_hibrido', 'acepta_presencial',
            'cv_archivo', 'cv_url',
            'linkedin_url', 'portfolio_url', 'github_url',
            'estado', 'selector', 'fecha_carga',
            'contactado_reciente', 'fecha_ultimo_contacto',
            'postulaciones_activas', 'notas'
        ]
        read_only_fields = [
            'id', 'fecha_carga', 'edad',
            'postulaciones_activas', 'notas'
        ]
    
    def get_edad(self, obj):
        return obj.edad
    
    def get_cv_url(self, obj):
        return obj.obtener_cv_ruta()
    
    def get_postulaciones_activas(self, obj):
        """Retorna postulaciones en proceso"""
        from postulaciones.serializers import PostulacionListSerializer
        postulaciones = obj.postulaciones.filter(
            estado__in=['enviada', 'entrevista', 'oferta']
        )
        return PostulacionListSerializer(
            postulaciones,
            many=True
        ).data
    
    def get_notas(self, obj):
        """Retorna notas del postulante"""
        return NotaPostulanteSerializer(
            obj.notas.all(),
            many=True
        ).data


class NotaPostulanteSerializer(serializers.ModelSerializer):
    """
    Notas sobre un postulante.
    """
    autor_nombre = serializers.CharField(
        source='autor.nombre_completo',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = NotaPostulante
        fields = [
            'id', 'postulante', 'autor', 'autor_nombre',
            'titulo', 'contenido', 'privada',
            'fecha_creacion'
        ]
        read_only_fields = ['id', 'fecha_creacion']
```

---

## 4. SERIALIZERS PARA POSTULACIONES

```python
# postulaciones/serializers.py

from rest_framework import serializers
from .models import (
    Postulacion, HistorialPostulacion,
    EntrevistaAgendada, SeguimientoGarantia
)

class PostulacionListSerializer(serializers.ModelSerializer):
    """
    Listado simplificado de postulaciones.
    """
    postulante_nombre = serializers.CharField(
        source='postulante.nombre_completo',
        read_only=True
    )
    perfil_titulo = serializers.CharField(
        source='perfil_busqueda.titulo_puesto',
        read_only=True
    )
    empresa_nombre = serializers.CharField(
        source='perfil_busqueda.empresa.nombre',
        read_only=True
    )
    dias_en_proceso = serializers.SerializerMethodField()
    
    class Meta:
        model = Postulacion
        fields = [
            'id', 'postulante', 'postulante_nombre',
            'perfil_busqueda', 'perfil_titulo', 'empresa_nombre',
            'selector',
            'estado', 'fecha_envio', 'fecha_cierre',
            'dias_en_proceso'
        ]
        read_only_fields = ['id', 'fecha_envio', 'dias_en_proceso']
    
    def get_dias_en_proceso(self, obj):
        return obj.dias_en_proceso()


class PostulacionDetalleSerializer(serializers.ModelSerializer):
    """
    Detalle completo de una postulación con historial.
    """
    postulante_nombre = serializers.CharField(
        source='postulante.nombre_completo',
        read_only=True
    )
    perfil_titulo = serializers.CharField(
        source='perfil_busqueda.titulo_puesto',
        read_only=True
    )
    empresa_nombre = serializers.CharField(
        source='perfil_busqueda.empresa.nombre',
        read_only=True
    )
    selector_nombre = serializers.CharField(
        source='selector.nombre_completo',
        read_only=True,
        allow_null=True
    )
    
    historial = serializers.SerializerMethodField()
    entrevistas = serializers.SerializerMethodField()
    garantia = serializers.SerializerMethodField()
    
    class Meta:
        model = Postulacion
        fields = [
            'id', 'postulante', 'postulante_nombre',
            'perfil_busqueda', 'perfil_titulo',
            'empresa_nombre',
            'selector', 'selector_nombre',
            'estado', 'puede_cambiar_a',
            'fecha_envio', 'fecha_recepcion_empresa',
            'fecha_primera_entrevista', 'fecha_oferta',
            'fecha_aceptacion_postulante', 'fecha_inicio_laboral',
            'fecha_cierre',
            'puntaje_empresa', 'feedback_empresa',
            'motivo_rechazo',
            'notas_selector', 'notas_admin',
            'historial', 'entrevistas', 'garantia',
            'dias_en_proceso'
        ]
        read_only_fields = [
            'id', 'fecha_envio', 'fecha_recepcion_empresa',
            'fecha_primera_entrevista', 'fecha_oferta',
            'fecha_aceptacion_postulante', 'fecha_cierre',
            'historial', 'entrevistas', 'garantia'
        ]
    
    def get_historial(self, obj):
        """Retorna historial de cambios de estado"""
        return HistorialPostulacionSerializer(
            obj.historial.all(),
            many=True
        ).data
    
    def get_entrevistas(self, obj):
        """Retorna entrevistas agendadas"""
        return EntrevistaAgendadaSerializer(
            obj.entrevistas.all(),
            many=True
        ).data
    
    def get_garantia(self, obj):
        """Retorna datos de seguimiento de garantía"""
        try:
            return SeguimientoGarantiaSerializer(obj.garantia).data
        except:
            return None


class HistorialPostulacionSerializer(serializers.ModelSerializer):
    """
    Registro de cambios de estado de una postulación.
    """
    class Meta:
        model = HistorialPostulacion
        fields = [
            'id', 'postulacion', 'estado_anterior', 'estado_nuevo',
            'fecha_cambio', 'motivo'
        ]
        read_only_fields = ['id', 'fecha_cambio']


class EntrevistaAgendadaSerializer(serializers.ModelSerializer):
    """
    Entrevistas agendadas con integraciones de Google Meet/Calendar.
    """
    postulante_nombre = serializers.CharField(
        source='postulacion.postulante.nombre_completo',
        read_only=True
    )
    esta_proxima = serializers.SerializerMethodField()
    horas_hasta = serializers.SerializerMethodField()
    
    class Meta:
        model = EntrevistaAgendada
        fields = [
            'id', 'postulacion', 'postulante_nombre',
            'tipo', 'fecha_hora', 'duracion_minutos',
            'entrevistador', 'usa_google_meet', 'google_meet_url',
            'ubicacion', 'realizada', 'resultado',
            'comentarios_entrevistador',
            'esta_proxima', 'horas_hasta'
        ]
        read_only_fields = [
            'id', 'google_meet_url', 'google_event_id',
            'esta_proxima', 'horas_hasta'
        ]
    
    def get_esta_proxima(self, obj):
        return obj.esta_proxima(minutos=60)
    
    def get_horas_hasta(self, obj):
        return obj.horas_hasta_entrevista()


class SeguimientoGarantiaSerializer(serializers.ModelSerializer):
    """
    Seguimiento del período de garantía.
    """
    postulacion_resumen = serializers.SerializerMethodField()
    esta_vigente = serializers.SerializerMethodField()
    proxima_a_vencer = serializers.SerializerMethodField()
    
    class Meta:
        model = SeguimientoGarantia
        fields = [
            'id', 'postulacion', 'postulacion_resumen',
            'dias_garantia', 'fecha_inicio', 'fecha_vencimiento',
            'estado', 'fecha_fin_real', 'motivo_incumplimiento',
            'perfil_busqueda_reemplazo',
            'postulacion_reemplazo',
            'notas',
            'esta_vigente', 'proxima_a_vencer'
        ]
        read_only_fields = ['id', 'fecha_vencimiento', 'esta_vigente']
    
    def get_postulacion_resumen(self, obj):
        """Resumen de la postulación"""
        p = obj.postulacion
        return {
            'postulante': p.postulante.nombre_completo,
            'empresa': p.perfil_busqueda.empresa.nombre,
            'puesto': p.perfil_busqueda.titulo_puesto
        }
    
    def get_esta_vigente(self, obj):
        return obj.estado == 'vigente'
    
    def get_proxima_a_vencer(self, obj):
        return obj.esta_proxima_a_vencer(dias=15)
```

---

## 5. SERIALIZERS PARA COMISIONES

```python
# comisiones/serializers.py

from rest_framework import serializers
from .models import Comision, PagoComision

class ComisionListSerializer(serializers.ModelSerializer):
    """
    Listado de comisiones.
    """
    selector_nombre = serializers.CharField(
        source='selector.nombre_completo',
        read_only=True
    )
    postulante_nombre = serializers.CharField(
        source='postulacion.postulante.nombre_completo',
        read_only=True
    )
    empresa_nombre = serializers.CharField(
        source='empresa.nombre',
        read_only=True
    )
    
    class Meta:
        model = Comision
        fields = [
            'id', 'selector', 'selector_nombre',
            'postulante_nombre', 'empresa_nombre',
            'monto_selector', 'monto_empresa', 'monto_total',
            'estado', 'fecha_calculo', 'fecha_pago',
            'numero_comprobante'
        ]
        read_only_fields = ['id', 'fecha_calculo', 'monto_total']


class ComisionDetalleSerializer(serializers.ModelSerializer):
    """
    Detalle completo de una comisión con desgloses.
    """
    selector_nombre = serializers.CharField(
        source='selector.nombre_completo',
        read_only=True
    )
    postulante_nombre = serializers.CharField(
        source='postulacion.postulante.nombre_completo',
        read_only=True
    )
    empresa_nombre = serializers.CharField(
        source='empresa.nombre',
        read_only=True
    )
    garantia = serializers.SerializerMethodField()
    pagos = serializers.SerializerMethodField()
    
    class Meta:
        model = Comision
        fields = [
            'id', 'selector', 'selector_nombre',
            'postulante_nombre', 'empresa_nombre',
            'salario_mensual',
            'comision_porcentaje_empresa',
            'comision_porcentaje_selector',
            'monto_total', 'monto_empresa', 'monto_selector',
            'estado', 'fecha_inicio_trabajo',
            'fecha_vencimiento_garantia',
            'garantia',
            'fecha_pago', 'numero_comprobante', 'metodo_pago',
            'pagos',
            'notas',
            'fecha_calculo'
        ]
        read_only_fields = [
            'id', 'monto_total', 'monto_empresa', 'monto_selector',
            'fecha_calculo', 'garantia', 'pagos'
        ]
    
    def get_garantia(self, obj):
        """Datos de garantía asociada"""
        try:
            from postulaciones.serializers import SeguimientoGarantiaSerializer
            return SeguimientoGarantiaSerializer(
                obj.postulacion.garantia
            ).data
        except:
            return None
    
    def get_pagos(self, obj):
        """Listado de pagos realizados"""
        return PagoComisionSerializer(
            obj.pagos.all(),
            many=True
        ).data


class PagoComisionSerializer(serializers.ModelSerializer):
    """
    Registro de cada pago de comisión.
    """
    class Meta:
        model = PagoComision
        fields = [
            'id', 'comision', 'monto', 'fecha_pago',
            'metodo', 'numero_comprobante',
            'banco_origen', 'banco_destino', 'cuenta_destino',
            'fecha_creacion'
        ]
        read_only_fields = ['id', 'fecha_creacion']
```

---

## 6. VIEWSETS Y URLs

```python
# empresas/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Empresa, PerfilBusqueda, ContactoEmpresa
from .serializers import (
    EmpresaSerializer, EmpresaDetalleSerializer,
    PerfilBusquedaListSerializer, PerfilBusquedaDetalleSerializer,
    ContactoEmpresaSerializer
)

class EmpresaViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de empresas.
    
    GET /api/empresas/ - Listar empresas
    POST /api/empresas/ - Crear empresa
    GET /api/empresas/{id}/ - Detalle de empresa
    PUT /api/empresas/{id}/ - Actualizar empresa
    DELETE /api/empresas/{id}/ - Eliminar empresa
    """
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo_empresa', 'activa', 'provincia']
    search_fields = ['nombre', 'email_principal', 'contacto_nombre']
    ordering_fields = ['nombre', 'fecha_registro']
    
    def get_serializer_class(self):
        """Usar serializer detallado para retrieve"""
        if self.action == 'retrieve':
            return EmpresaDetalleSerializer
        return EmpresaSerializer
    
    @action(detail=True, methods=['get'])
    def perfiles_activos(self, request, pk=None):
        """
        GET /api/empresas/{id}/perfiles_activos/
        Retorna perfiles abiertos de la empresa.
        """
        empresa = self.get_object()
        perfiles = empresa.perfiles_busqueda.filter(estado='abierto')
        serializer = PerfilBusquedaListSerializer(perfiles, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def crear_perfil(self, request, pk=None):
        """
        POST /api/empresas/{id}/crear_perfil/
        Crea un nuevo perfil de búsqueda para la empresa.
        """
        empresa = self.get_object()
        serializer = PerfilBusquedaDetalleSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(empresa=empresa)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PerfilBusquedaViewSet(viewsets.ModelViewSet):
    """
    CRUD de Perfiles de Búsqueda.
    
    GET /api/perfiles/ - Listar perfiles
    POST /api/perfiles/ - Crear perfil
    GET /api/perfiles/{id}/ - Detalle
    PUT /api/perfiles/{id}/ - Actualizar
    """
    queryset = PerfilBusqueda.objects.all()
    serializer_class = PerfilBusquedaListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['empresa', 'areas', 'nivel', 'estado']
    search_fields = ['titulo_puesto', 'empresa__nombre']
    ordering_fields = ['-fecha_creacion', 'titulo_puesto']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PerfilBusquedaDetalleSerializer
        return PerfilBusquedaListSerializer
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """
        POST /api/perfiles/{id}/cambiar_estado/
        {
            "nuevo_estado": "pausa" (o cubierto, cancelado, abierto)
        }
        """
        perfil = self.get_object()
        nuevo_estado = request.data.get('nuevo_estado')
        
        if nuevo_estado not in dict(PerfilBusqueda._meta.get_field('estado').choices):
            return Response(
                {'error': 'Estado inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        perfil.estado = nuevo_estado
        if nuevo_estado in ['cubierto', 'cancelado']:
            perfil.fecha_cierre = timezone.now()
        
        perfil.save()
        return Response({'status': 'Estado actualizado'})
    
    @action(detail=True, methods=['post'])
    def asignar_selector(self, request, pk=None):
        """
        POST /api/perfiles/{id}/asignar_selector/
        {
            "selector_id": 123
        }
        """
        perfil = self.get_object()
        selector_id = request.data.get('selector_id')
        
        from selectores.models import Selector
        try:
            selector = Selector.objects.get(id=selector_id)
            perfil.selector_asignado = selector
            perfil.save()
            return Response({'status': 'Selector asignado'})
        except Selector.DoesNotExist:
            return Response(
                {'error': 'Selector no existe'},
                status=status.HTTP_404_NOT_FOUND
            )


# urls.py - Configuración de URLs

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from empresas.views import EmpresaViewSet, PerfilBusquedaViewSet

router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet)
router.register(r'perfiles', PerfilBusquedaViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),
]
```

---

## 7. EJEMPLO DE USO (DESDE FRONTEND O POSTMAN)

```bash
# Listar empresas
GET http://localhost:8000/api/empresas/
Authorization: Bearer {token}

# Crear empresa
POST http://localhost:8000/api/empresas/
{
    "nombre": "Tech Corp S.A.",
    "tipo_empresa": "privada",
    "email_principal": "rrhh@techcorp.com",
    "contacto_nombre": "Juan García",
    "contacto_email": "juan@techcorp.com",
    "contacto_telefono": "+54 9 11 1234-5678",
    "pais": "Argentina",
    "provincia": "Buenos Aires",
    "ciudad": "San Isidro",
    "comision_porcentaje": 20.00
}

# Crear perfil de búsqueda
POST http://localhost:8000/api/perfiles/
{
    "empresa": 1,
    "titulo_puesto": "Desarrollador Python Senior",
    "areas": "it",
    "nivel": "senior",
    "habilidades_requeridas": "Python, Django, REST APIs, PostgreSQL",
    "experiencia_minima_anios": 5,
    "salario_minimo": 100000,
    "salario_maximo": 150000,
    "es_remoto": true
}

# Cambiar estado de perfil
POST http://localhost:8000/api/perfiles/1/cambiar_estado/
{
    "nuevo_estado": "pausa"
}

# Ver postulaciones activas de una empresa
GET http://localhost:8000/api/empresas/1/perfiles_activos/
```

---

## Próximo Paso

Estos serializers y viewsets te dan una API REST completa. El siguiente paso será:
1. Integración con Google Workspace (OAuth2)
2. Notificaciones automáticas
3. Dashboards con Plotly
4. Sistema de autenticación JWT

¿Continuamos?
