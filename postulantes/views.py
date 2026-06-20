# postulantes/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from .models import Postulante, Categoria, EstadoPostulante
from selectores.models import Selector
from empresas.models import PerfilBusqueda, Empresa

def lista_postulantes(request):
    from django.core.paginator import Paginator
    from .forms import PostulanteForm

    if request.method == 'POST':
        post_data = request.POST.copy()
        
        # Ajustar booleanos
        post_data['disponibilidad_mudanza'] = request.POST.get('disponibilidad_mudanza') == 'on'
        post_data['acepta_remoto'] = request.POST.get('acepta_remoto') == 'on'
        post_data['acepta_hibrido'] = request.POST.get('acepta_hibrido') == 'on'
        post_data['acepta_presencial'] = request.POST.get('acepta_presencial') == 'on'
        post_data['guardado_en_pool'] = request.POST.get('guardado_en_pool') == 'on'
        
        if not post_data.get('experiencia_anos'): post_data['experiencia_anos'] = 0
        if not post_data.get('pais'): post_data['pais'] = 'Argentina'
        
        # Resolver estado
        estado_val = request.POST.get('estado')
        estado_obj = None
        if estado_val:
            try:
                if estado_val.isdigit():
                    estado_obj = EstadoPostulante.objects.filter(id=int(estado_val)).first()
                else:
                    estado_obj = EstadoPostulante.objects.filter(nombre__iexact=estado_val).first()
            except Exception:
                pass
        if not estado_obj:
            estado_obj = EstadoPostulante.objects.filter(nombre='Activo').first()
            
        if estado_obj:
            post_data['estado'] = estado_obj.id
            
        # Resolver selector
        selector_id = request.POST.get('selector_id')
        selector_cuit = request.POST.get('selector_cuit', '').strip()
        selector = None
        if selector_cuit:
            selector = Selector.objects.filter(cuit=selector_cuit).first()
        if not selector and selector_id:
            try:
                selector = Selector.objects.get(id=selector_id)
            except Selector.DoesNotExist:
                pass
        if selector:
            post_data['selector'] = selector.id
            post_data['selector_cuit'] = selector.cuit

        form = PostulanteForm(post_data, request.FILES)
        if form.is_valid():
            postulante = form.save()
            categorias_ids = request.POST.getlist('categorias')
            if categorias_ids:
                postulante.categorias.set(categorias_ids)
            messages.success(request, 'Postulante registrado con éxito.')
            return redirect('postulantes')
        else:
            messages.error(request, f'Error al registrar el postulante: {form.errors}')

    # Filtros y búsquedas avanzados
    q = request.GET.get('q', '').strip()
    pool_only = request.GET.get('pool_only') == 'on'
    fecha_inicio = request.GET.get('fecha_inicio', '').strip()
    fecha_fin = request.GET.get('fecha_fin', '').strip()
    titulo_puesto_filtro = request.GET.get('titulo_puesto', '').strip()
    localidad_filtro = request.GET.get('localidad', '').strip()
    estado_filtro = request.GET.get('estado', '').strip()
    # Filtros de tab
    vista = request.GET.get('vista', 'activas')   # activas | todos | nuevos | busqueda | empresa | selector
    busqueda_id_filtro = request.GET.get('busqueda_id', '').strip()
    empresa_id_filtro = request.GET.get('empresa_id', '').strip()
    selector_id_filtro = request.GET.get('selector_id_tab', '').strip()

    # BASE: Postulantes de búsquedas activas (estado abierto)
    ids_busquedas_activas = PerfilBusqueda.objects.filter(
        estado__nombre='Abiertas'
    ).values_list('id', flat=True)

    ids_postulantes_activos = Postulante.objects.filter(
        postulaciones__perfil_busqueda_id__in=ids_busquedas_activas
    ).values_list('id', flat=True).distinct()

    hace_30_dias = timezone.now() - timedelta(days=30)

    # Aplicar la vista/tab
    if vista == 'todos':
        postulantes = Postulante.objects.filter(estado__nombre='Activo').select_related('selector')
    elif vista == 'nuevos':
        postulantes = Postulante.objects.filter(
            id__in=ids_postulantes_activos,
            fecha_carga__gte=hace_30_dias
        ).select_related('selector')
    elif vista == 'busqueda' and busqueda_id_filtro:
        # Por defecto excluye rechazados, a menos que se pida explícitamente con &mostrar_rechazados=1
        mostrar_rechazados = request.GET.get('mostrar_rechazados') == '1'
        postulantes_qs = Postulante.objects.filter(
            postulaciones__perfil_busqueda_id=busqueda_id_filtro
        ).distinct().select_related('selector')
        if not mostrar_rechazados:
            postulantes_qs = postulantes_qs.exclude(
                estado__nombre__in=['Rechazado', 'Rechazado por empresa']
            )
        postulantes = postulantes_qs
    elif vista == 'empresa' and empresa_id_filtro:
        postulantes = Postulante.objects.filter(
            postulaciones__perfil_busqueda__empresa_id=empresa_id_filtro
        ).distinct().select_related('selector')
    elif vista == 'selector' and selector_id_filtro:
        postulantes = Postulante.objects.filter(
            Q(selector_id=selector_id_filtro) |
            Q(postulaciones__selector_id=selector_id_filtro)
        ).distinct().select_related('selector')
    else:
        # Default: postulantes en búsquedas activas
        postulantes = Postulante.objects.filter(
            id__in=ids_postulantes_activos
        ).select_related('selector')

    postulantes = postulantes.order_by('-fecha_carga')

    if estado_filtro:
        if estado_filtro.isdigit():
            postulantes = postulantes.filter(estado_id=int(estado_filtro))
        else:
            postulantes = postulantes.filter(estado__nombre__iexact=estado_filtro)

    if pool_only:
        postulantes = postulantes.filter(guardado_en_pool=True)

    if q:
        postulantes = postulantes.filter(
            Q(nombre__icontains=q) |
            Q(apellido__icontains=q) |
            Q(email__icontains=q) |
            Q(titulo_principal__icontains=q) |
            Q(cv_texto_extraido__icontains=q) |
            Q(postulaciones__informe_entrevista__experiencia_detalle__icontains=q) |
            Q(postulaciones__informe_entrevista__formacion_academica__icontains=q) |
            Q(postulaciones__informe_entrevista__comentarios_selector__icontains=q)
        ).distinct()

    if fecha_inicio:
        postulantes = postulantes.filter(fecha_carga__date__gte=fecha_inicio)
    if fecha_fin:
        postulantes = postulantes.filter(fecha_carga__date__lte=fecha_fin)
    if titulo_puesto_filtro:
        postulantes = postulantes.filter(titulo_principal__icontains=titulo_puesto_filtro)
    if localidad_filtro:
        postulantes = postulantes.filter(
            Q(ciudad__icontains=localidad_filtro) | Q(provincia__icontains=localidad_filtro)
        )

    categorias = Categoria.objects.filter(activa=True).order_by('nombre')
    selectores = Selector.objects.filter(estado='activo').order_by('nombre')
    busquedas_activas = PerfilBusqueda.objects.filter(estado__nombre='Abiertas').select_related('empresa').order_by('titulo_puesto')
    empresas_con_busquedas = Empresa.objects.filter(
        perfiles_busqueda__estado__nombre='Abiertas'
    ).distinct().order_by('nombre')

    # Estadísticas
    total_postulantes = postulantes.count()
    postulantes_activos_count = Postulante.objects.filter(id__in=ids_postulantes_activos, estado__nombre='Activo').count()
    postulantes_en_proceso = Postulante.objects.filter(id__in=ids_postulantes_activos, estado__nombre='En evaluación').count()
    nuevos_count = Postulante.objects.filter(
        id__in=ids_postulantes_activos,
        fecha_carga__gte=hace_30_dias
    ).count()

    from decouple import config
    global_form_id = config('GLOBAL_GOOGLE_FORM_ID', default='')

    # Info de la búsqueda actualmente filtrada (para mostrar el titulo en el header)
    busqueda_actual = None
    if busqueda_id_filtro:
        busqueda_actual = PerfilBusqueda.objects.filter(id=busqueda_id_filtro).first()

    from django.core.paginator import Paginator
    paginator = Paginator(postulantes, 20)
    page_number = request.GET.get('page')
    postulantes_paginados = paginator.get_page(page_number)

    context = {
        'postulantes': postulantes_paginados,
        'paginator': paginator,
        'categorias': categorias,
        'selectores': selectores,
        'busquedas_activas': busquedas_activas,
        'empresas_con_busquedas': empresas_con_busquedas,
        'total_postulantes': total_postulantes,
        'postulantes_activos': postulantes_activos_count,
        'postulantes_en_proceso': postulantes_en_proceso,
        'nuevos_count': nuevos_count,
        'q': q,
        'pool_only': pool_only,
        'fecha_inicio': fecha_inicio,
        'fecha_fin': fecha_fin,
        'titulo_puesto': titulo_puesto_filtro,
        'localidad': localidad_filtro,
        'estado_filtro': estado_filtro,
        'vista': vista,
        'busqueda_id_filtro': busqueda_id_filtro,
        'busqueda_actual': busqueda_actual,
        'empresa_id_filtro': empresa_id_filtro,
        'selector_id_filtro': selector_id_filtro,
        'global_form_id': global_form_id,
        'estados': EstadoPostulante.objects.all(),
    }
    return render(request, 'postulantes.html', context)



def editar_postulante(request, postulante_id):
    postulante = get_object_or_404(Postulante, id=postulante_id)
    if request.method == 'POST':
        post_data = request.POST.copy()
        
        post_data['disponibilidad_mudanza'] = request.POST.get('disponibilidad_mudanza') == 'on'
        post_data['acepta_remoto'] = request.POST.get('acepta_remoto') == 'on'
        post_data['acepta_hibrido'] = request.POST.get('acepta_hibrido') == 'on'
        post_data['acepta_presencial'] = request.POST.get('acepta_presencial') == 'on'
        post_data['guardado_en_pool'] = request.POST.get('guardado_en_pool') == 'on'
        
        if not post_data.get('experiencia_anos'): post_data['experiencia_anos'] = 0
        if not post_data.get('pais'): post_data['pais'] = 'Argentina'
        
        estado_val = request.POST.get('estado')
        if estado_val:
            try:
                if estado_val.isdigit():
                    estado_obj = EstadoPostulante.objects.filter(id=int(estado_val)).first()
                else:
                    estado_obj = EstadoPostulante.objects.filter(nombre__iexact=estado_val).first()
                if estado_obj:
                    post_data['estado'] = estado_obj.id
            except Exception:
                pass
                
        selector_id = request.POST.get('selector_id')
        selector_cuit = request.POST.get('selector_cuit', '').strip()
        selector = None
        if selector_cuit:
            selector = Selector.objects.filter(cuit=selector_cuit).first()
        if not selector and selector_id:
            try:
                selector = Selector.objects.get(id=selector_id)
            except Selector.DoesNotExist:
                pass
        if selector:
            post_data['selector'] = selector.id
            post_data['selector_cuit'] = selector.cuit

        from .forms import PostulanteForm
        form = PostulanteForm(post_data, request.FILES, instance=postulante)
        
        if form.is_valid():
            postulante = form.save()
            categorias_ids = request.POST.getlist('categorias')
            if categorias_ids:
                postulante.categorias.set(categorias_ids)
            messages.success(request, f'Postulante "{postulante.nombre} {postulante.apellido}" actualizado exitosamente.')
        else:
            messages.error(request, f'Error al actualizar el postulante: {form.errors}')
            
    referer = request.META.get('HTTP_REFERER')
    if referer and 'base-talentos' in referer:
        return redirect('base_talentos')
    return redirect('postulantes')


def toggle_pool_status(request, postulante_id):
    if request.method == 'POST':
        postulante = get_object_or_404(Postulante, id=postulante_id)
        postulante.guardado_en_pool = not postulante.guardado_en_pool
        postulante.save()
        status_msg = "agregado a" if postulante.guardado_en_pool else "quitado de"
        messages.success(request, f'Postulante "{postulante.nombre_completo}" {status_msg} la Base de Datos de Talentos.')
    return redirect('postulantes')


def eliminar_postulante(request, postulante_id):
    if request.method == 'POST':
        postulante = get_object_or_404(Postulante, id=postulante_id)
        nombre_completo = postulante.nombre_completo
        postulante.delete()
        messages.success(request, f'Postulante "{nombre_completo}" eliminado permanentemente.')
    
    referer = request.META.get('HTTP_REFERER')
    if referer and 'base-talentos' in referer:
        return redirect('base_talentos')
    return redirect('postulantes')


def cambiar_estado_postulante(request, postulante_id):
    """Permite cambiar el estado del postulante directamente por AJAX sin recargar"""
    if request.method == 'POST':
        from django.http import JsonResponse
        postulante = get_object_or_404(Postulante, id=postulante_id)
        estado_val = request.POST.get('estado')
        estado_obj = None
        if estado_val:
            try:
                if estado_val.isdigit():
                    estado_obj = EstadoPostulante.objects.filter(id=int(estado_val)).first()
                else:
                    mapping = {
                        'activo': 'Activo',
                        'en_proceso': 'En evaluación',
                        'contratado': 'Contratado',
                        'rechazo_empresa': 'Rechazado por empresa',
                        'rechazo_postulante': 'Rechazado',
                        'inactivo': 'Rechazado'
                    }
                    search_name = mapping.get(estado_val.lower(), estado_val)
                    estado_obj = EstadoPostulante.objects.filter(nombre__iexact=search_name).first()
            except Exception:
                pass
        if estado_obj:
            viejo_estado = postulante.estado
            postulante.estado = estado_obj
            postulante.save()  # Dispara el signal actualizar_postulaciones_al_contratar

            comision_creada = False
            comisiones_count = 0

            # Enviar feedback automático si aplica
            if viejo_estado != estado_obj:
                from .services import enviar_feedback_automatico
                enviar_feedback_automatico(postulante, estado_obj)

            # Si el nuevo estado es "Contratado", verificar/crear comisiones de forma explícita
            if estado_obj.nombre.lower() == 'contratado':
                from .services import crear_comisiones_por_contratacion
                comision_creada, comisiones_count = crear_comisiones_por_contratacion(postulante)

            return JsonResponse({
                'status': 'success',
                'estado': estado_obj.nombre,
                'estado_id': estado_obj.id,
                'color': estado_obj.color,
                'fecha_cambio': postulante.fecha_cambio_estado.strftime('%d/%m/%Y %H:%M'),
                'comision_creada': comision_creada,
                'comisiones_count': comisiones_count,
            })
        return JsonResponse({'status': 'error', 'message': 'Estado no válido o no encontrado'}, status=400)

    from django.http import JsonResponse
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'}, status=405)


def base_talentos(request):
    """Vista de la Base de Talentos: todos los postulantes guardados en el pool."""
    q = request.GET.get('q', '').strip()
    fecha_inicio = request.GET.get('fecha_inicio', '').strip()
    fecha_fin = request.GET.get('fecha_fin', '').strip()
    titulo_filtro = request.GET.get('titulo', '').strip()
    localidad_filtro = request.GET.get('localidad', '').strip()
    estado_filtro = request.GET.get('estado', '').strip()
    categoria_filtro = request.GET.get('categoria', '').strip()

    postulantes = Postulante.objects.filter(
        guardado_en_pool=True
    ).select_related('selector').prefetch_related('categorias', 'postulaciones__perfil_busqueda__empresa').order_by('-fecha_carga')

    if estado_filtro:
        if estado_filtro.isdigit():
            postulantes = postulantes.filter(estado_id=int(estado_filtro))
        else:
            postulantes = postulantes.filter(estado__nombre__iexact=estado_filtro)
    if categoria_filtro:
        postulantes = postulantes.filter(categorias__id=categoria_filtro)
    if q:
        postulantes = postulantes.filter(
            Q(nombre__icontains=q) |
            Q(apellido__icontains=q) |
            Q(email__icontains=q) |
            Q(titulo_principal__icontains=q) |
            Q(habilidades__icontains=q) |
            Q(titulaciones__icontains=q) |
            Q(cv_texto_extraido__icontains=q)
        ).distinct()
    if fecha_inicio:
        postulantes = postulantes.filter(fecha_carga__date__gte=fecha_inicio)
    if fecha_fin:
        postulantes = postulantes.filter(fecha_carga__date__lte=fecha_fin)
    if titulo_filtro:
        postulantes = postulantes.filter(titulo_principal__icontains=titulo_filtro)
    if localidad_filtro:
        postulantes = postulantes.filter(
            Q(ciudad__icontains=localidad_filtro) | Q(provincia__icontains=localidad_filtro)
        )

    categorias = Categoria.objects.filter(activa=True).order_by('nombre')
    selectores = Selector.objects.filter(estado='activo').order_by('nombre')

    # Estadísticas del pool
    total_pool = Postulante.objects.filter(guardado_en_pool=True).count()
    pool_activos = Postulante.objects.filter(guardado_en_pool=True, estado__nombre='Activo').count()
    pool_en_proceso = Postulante.objects.filter(guardado_en_pool=True, estado__nombre='En evaluación').count()
    pool_contratados = Postulante.objects.filter(guardado_en_pool=True, estado__nombre='Contratado').count()

    context = {
        'postulantes': postulantes,
        'categorias': categorias,
        'selectores': selectores,
        'total_pool': total_pool,
        'pool_activos': pool_activos,
        'pool_en_proceso': pool_en_proceso,
        'pool_contratados': pool_contratados,
        'q': q,
        'fecha_inicio': fecha_inicio,
        'fecha_fin': fecha_fin,
        'titulo_filtro': titulo_filtro,
        'localidad_filtro': localidad_filtro,
        'estado_filtro': estado_filtro,
        'categoria_filtro': categoria_filtro,
        'filtros_activos': any([q, fecha_inicio, fecha_fin, titulo_filtro, localidad_filtro, estado_filtro, categoria_filtro]),
        'estados': EstadoPostulante.objects.all(),
    }
    return render(request, 'base_talentos.html', context)


def gestionar_estados(request):
    """Muestra y gestiona los estados de los postulantes (CRUD)"""
    if request.method == 'POST':
        estado_id = request.POST.get('estado_id')
        nombre = request.POST.get('nombre', '').strip()
        color = request.POST.get('color', '#34c759').strip()
        orden = request.POST.get('orden', '0')

        try:
            orden = int(orden)
        except ValueError:
            orden = 0

        if nombre:
            if estado_id:
                estado_obj = get_object_or_404(EstadoPostulante, id=estado_id)
                if estado_obj.no_borrable:
                    estado_obj.color = color
                    estado_obj.orden = orden
                else:
                    estado_obj.nombre = nombre
                    estado_obj.color = color
                    estado_obj.orden = orden
                estado_obj.save()
                messages.success(request, f'Estado "{nombre}" actualizado.')
            else:
                EstadoPostulante.objects.create(
                    nombre=nombre,
                    color=color,
                    orden=orden,
                    no_borrable=False
                )
                messages.success(request, f'Estado "{nombre}" creado con éxito.')
        else:
            messages.error(request, 'El nombre del estado es obligatorio.')

        return redirect(request.META.get('HTTP_REFERER', 'postulantes'))
    return redirect('postulantes')


def eliminar_estado(request, estado_id):
    """Elimina un estado personalizado si no tiene postulantes asociados y no es no_borrable"""
    if request.method == 'POST':
        estado_obj = get_object_or_404(EstadoPostulante, id=estado_id)
        if estado_obj.no_borrable:
            messages.error(request, 'Este estado es predeterminado y no se puede eliminar.')
        elif estado_obj.postulantes.exists():
            messages.error(request, f'No se puede eliminar el estado "{estado_obj.nombre}" porque tiene postulantes asociados.')
        else:
            nombre = estado_obj.nombre
            estado_obj.delete()
            messages.success(request, f'Estado "{nombre}" eliminado correctamente.')

    return redirect(request.META.get('HTTP_REFERER', 'postulantes'))
