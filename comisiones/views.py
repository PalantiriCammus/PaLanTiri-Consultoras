# comisiones/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db.models import Sum
from decimal import Decimal
from .models import Comision, EstadoComision
from selectores.models import Selector, GrupoSelector

def lista_comisiones(request):
    comisiones = Comision.objects.all().select_related('postulacion__postulante', 'selector', 'empresa', 'estado').order_by('-fecha_calculo')
    
    # Filtros
    estado_filtro = request.GET.get('estado', '')
    if estado_filtro:
        if estado_filtro.isdigit():
            comisiones = comisiones.filter(estado_id=int(estado_filtro))
        else:
            comisiones = comisiones.filter(estado__codigo=estado_filtro)
        
    # Estadísticas
    total_comisiones = comisiones.count()
    
    total_facturado = Comision.objects.exclude(estado__codigo='anulada').aggregate(total=Sum('monto_total'))['total'] or Decimal('0.00')
    total_pendiente_cobro = Comision.objects.filter(estado__codigo='pendiente_cobro').aggregate(total=Sum('monto_total'))['total'] or Decimal('0.00')
    total_pendiente_pago = Comision.objects.filter(estado__codigo='pendiente_pago').aggregate(total=Sum('monto_selector'))['total'] or Decimal('0.00')

    context = {
        'comisiones': comisiones,
        'total_comisiones': total_comisiones,
        'total_facturado': total_facturado,
        'total_pendiente_cobro': total_pendiente_cobro,
        'total_pendiente_pago': total_pendiente_pago,
        'estado_filtro': estado_filtro,
        'estados': EstadoComision.objects.all().order_by('nombre')
    }
    return render(request, 'comisiones.html', context)


def editar_comision(request, comision_id):
    comision = get_object_or_404(Comision, id=comision_id)
    if request.method == 'POST':
        estado = request.POST.get('estado')
        numero_comprobante = request.POST.get('numero_comprobante', '')
        metodo_pago = request.POST.get('metodo_pago', '')
        fecha_pago = request.POST.get('fecha_pago') or None
        notas = request.POST.get('notas', '')

        if estado:
            try:
                if estado.isdigit():
                    estado_obj = EstadoComision.objects.get(id=int(estado))
                else:
                    estado_obj = EstadoComision.objects.get(codigo=estado)
                comision.estado = estado_obj
                comision.numero_comprobante = numero_comprobante
                comision.metodo_pago = metodo_pago
                comision.fecha_pago = fecha_pago
                comision.notas = notas
                comision.save()
                messages.success(request, f'Comisión de {comision.postulacion.postulante.nombre_completo} actualizada con éxito.')
            except Exception as e:
                messages.error(request, f'Error al actualizar la comisión: {str(e)}')
        else:
            messages.error(request, 'El estado es requerido.')
            
    return redirect('comisiones')


def gestionar_estados_comision(request):
    """
    Vista premium para listar, crear y actualizar estados de comisión y sus alertas.
    """
    if request.method == 'POST':
        estado_id = request.POST.get('estado_id')
        
        # Obtener o instanciar
        if estado_id:
            estado_obj = get_object_or_404(EstadoComision, id=estado_id)
        else:
            estado_obj = EstadoComision()

        nombre = request.POST.get('nombre')
        codigo = request.POST.get('codigo', '').strip()
        descripcion = request.POST.get('descripcion', '')
        color = request.POST.get('color', '#34c759')
        
        activar_email = request.POST.get('activar_email') == 'on'
        activar_whatsapp = request.POST.get('activar_whatsapp') == 'on'
        plantilla_email = request.POST.get('plantilla_email', '')
        plantilla_whatsapp = request.POST.get('plantilla_whatsapp', '')
        destinatarios = request.POST.get('destinatarios', 'cierre')
        
        grupo_id = request.POST.get('destinatario_grupo')
        especifico_id = request.POST.get('destinatario_especifico')

        # Procesar código
        if codigo:
            codigo = "".join(c for c in codigo.lower() if c.isalnum() or c == '_').strip()
            # Asegurar unicidad excluyendo este id si ya existe
            base_codigo = codigo
            counter = 1
            query = EstadoComision.objects.filter(codigo=codigo)
            if estado_obj.pk:
                query = query.exclude(id=estado_obj.id)
            while query.exists():
                codigo = f"{base_codigo}_{counter}"
                counter += 1
                query = EstadoComision.objects.filter(codigo=codigo)
                if estado_obj.pk:
                    query = query.exclude(id=estado_obj.id)
            estado_obj.codigo = codigo
        elif not estado_obj.pk:
            # Si es nuevo y está vacío, autogenerar
            codigo = "".join(c for c in nombre.lower() if c.isalnum() or c == ' ').replace(' ', '_')
            base_codigo = codigo
            counter = 1
            while EstadoComision.objects.filter(codigo=codigo).exists():
                codigo = f"{base_codigo}_{counter}"
                counter += 1
            estado_obj.codigo = codigo

        estado_obj.nombre = nombre
        estado_obj.descripcion = descripcion
        estado_obj.color = color
        estado_obj.activar_email = activar_email
        estado_obj.activar_whatsapp = activar_whatsapp
        estado_obj.plantilla_email = plantilla_email
        estado_obj.plantilla_whatsapp = plantilla_whatsapp
        estado_obj.destinatarios = destinatarios

        if destinatarios == 'grupo' and grupo_id:
            estado_obj.destinatario_grupo_id = int(grupo_id)
            estado_obj.destinatario_especifico = None
        elif destinatarios == 'especifico' and especifico_id:
            estado_obj.destinatario_especifico_id = int(especifico_id)
            estado_obj.destinatario_grupo = None
        else:
            estado_obj.destinatario_grupo = None
            estado_obj.destinatario_especifico = None

        try:
            estado_obj.save()
            messages.success(request, f"Estado '{nombre}' guardado exitosamente.")
        except Exception as e:
            messages.error(request, f"Error al guardar el estado: {str(e)}")
            
        return redirect('gestionar_estados_comision')

    context = {
        'estados': EstadoComision.objects.all().order_by('nombre'),
        'grupos_selectores': GrupoSelector.objects.all(),
        'selectores': Selector.objects.filter(estado='activo'),
        'destinatarios_choices': EstadoComision.DESTINATARIOS_CHOICES
    }
    return render(request, 'estados_comision.html', context)


def eliminar_estado_comision(request, estado_id):
    estado_obj = get_object_or_404(EstadoComision, id=estado_id)
    if estado_obj.no_borrable:
        messages.error(request, "Este estado es crítico para el sistema y no puede ser eliminado.")
    elif estado_obj.comisiones.exists():
        messages.error(request, "No se puede eliminar este estado porque existen comisiones asignadas a él.")
    else:
        nombre = estado_obj.nombre
        estado_obj.delete()
        messages.success(request, f"Estado '{nombre}' eliminado correctamente.")
    return redirect('gestionar_estados_comision')
