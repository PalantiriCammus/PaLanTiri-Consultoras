# recurso_humano/views.py

from django.shortcuts import render
from django.db.models import Sum
from django.utils import timezone
from decimal import Decimal
from empresas.models import PerfilBusqueda
from postulaciones.models import Postulacion, EntrevistaAgendada, HistorialPostulacion
from comisiones.models import Comision

def dashboard(request):
    """Vista principal del dashboard dinámico"""
    
    # 1. Búsquedas Activas
    activas_count = PerfilBusqueda.objects.filter(estado__nombre='Abiertas').count()
    
    # 2. Postulantes en Proceso
    en_proceso_count = Postulacion.objects.filter(
        estado__in=['enviada', 'recibida', 'entrevista', 'oferta']
    ).count()
    
    # 3. Entrevistas hoy
    hoy = timezone.now().date()
    entrevistas_hoy_count = EntrevistaAgendada.objects.filter(
        fecha_hora__date=hoy
    ).count()
    
    # 4. Comisiones Pendientes (monto a cobrar de comisiones en estado de cobro pendiente)
    comisiones_pendientes = Comision.objects.filter(
        estado__codigo='pendiente_cobro'
    ).aggregate(total=Sum('monto_total'))['total'] or Decimal('0.00')
    
    # Formatear la comisión para mostrar algo limpio (ej: $1.2M o $0)
    if comisiones_pendientes >= 1000000:
        comisiones_pendientes_str = f"${(comisiones_pendientes / 1000000):.1f}M"
    elif comisiones_pendientes > 0:
        comisiones_pendientes_str = f"${(comisiones_pendientes / 1000):.0f}k"
    else:
        comisiones_pendientes_str = "$0"

    # 5. Búsquedas IT Recientes
    busquedas_recientes = PerfilBusqueda.objects.all().select_related('empresa').order_by('-fecha_creacion')[:4]
    
    # 6. Actividad Reciente (basado en el historial de postulaciones)
    actividades_recientes = HistorialPostulacion.objects.all().select_related(
        'postulacion__postulante', 
        'postulacion__perfil_busqueda'
    ).order_by('-fecha_cambio')[:4]
    
    context = {
        'activas_count': activas_count,
        'en_proceso_count': en_proceso_count,
        'entrevistas_hoy_count': entrevistas_hoy_count,
        'comisiones_pendientes_monto': comisiones_pendientes_str,
        'busquedas_recientes': busquedas_recientes,
        'actividades_recientes': actividades_recientes,
    }
    
    return render(request, 'dashboard.html', context)
