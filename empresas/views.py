from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db.models import Q
from .models import Empresa, PerfilBusqueda, Rubro, CodigoPuesto, CodigoTitulo, EstadoBusqueda
from selectores.models import Selector
from django.http import FileResponse


def lista_empresas(request):
    from django.core.paginator import Paginator
    from .forms import EmpresaForm

    if request.method == 'POST':
        post_data = request.POST.copy()
        nuevo_rubro = post_data.get('nuevo_rubro')
        if nuevo_rubro and nuevo_rubro.strip():
            rubro, _ = Rubro.objects.get_or_create(nombre=nuevo_rubro.strip())
            post_data['rubro'] = rubro.id
        elif post_data.get('rubro_id') and post_data.get('rubro_id') != 'new':
            post_data['rubro'] = post_data.get('rubro_id')
            
        # Defaults for modalities if not sent
        if not post_data.get('modalidad_contratacion'): post_data['modalidad_contratacion'] = 'a_riesgo'
        if not post_data.get('garantia'): post_data['garantia'] = 'con_garantia'
        if not post_data.get('comision_porcentaje'): post_data['comision_porcentaje'] = 20.00
            
        form = EmpresaForm(post_data)
        if form.is_valid():
            form.save()
            messages.success(request, 'Empresa creada exitosamente.')
            return redirect('empresas')
        else:
            messages.error(request, f'Error al registrar la empresa: {form.errors}')

    empresas_list = Empresa.objects.all().select_related('rubro').order_by('-fecha_registro')
    
    paginator = Paginator(empresas_list, 20)
    page_number = request.GET.get('page')
    empresas = paginator.get_page(page_number)
    
    rubros = Rubro.objects.all().order_by('nombre')
    
    # Cálculos estadísticos rápidos
    total_empresas = empresas_list.count()
    empresas_activas = empresas_list.filter(activa=True).count()
    
    context = {
        'empresas': empresas,
        'rubros': rubros,
        'total_empresas': total_empresas,
        'empresas_activas': empresas_activas,
        'paginator': paginator,
    }
    return render(request, 'empresas.html', context)


def editar_empresa(request, empresa_id):
    from .forms import EmpresaForm
    empresa = get_object_or_404(Empresa, id=empresa_id)
    
    if request.method == 'POST':
        post_data = request.POST.copy()
        nuevo_rubro = post_data.get('nuevo_rubro')
        if nuevo_rubro and nuevo_rubro.strip():
            rubro, _ = Rubro.objects.get_or_create(nombre=nuevo_rubro.strip())
            post_data['rubro'] = rubro.id
        elif post_data.get('rubro_id') and post_data.get('rubro_id') != 'new':
            post_data['rubro'] = post_data.get('rubro_id')
            
        post_data['activa'] = request.POST.get('activa') == 'on'
        
        if not post_data.get('modalidad_contratacion'): post_data['modalidad_contratacion'] = 'a_riesgo'
        if not post_data.get('garantia'): post_data['garantia'] = 'con_garantia'
        if not post_data.get('comision_porcentaje'): post_data['comision_porcentaje'] = 20.00
        
        form = EmpresaForm(post_data, instance=empresa)
        if form.is_valid():
            form.save()
            messages.success(request, f'Empresa "{empresa.nombre}" actualizada exitosamente.')
        else:
            messages.error(request, f'Error al actualizar la empresa: {form.errors}')
            
    return redirect('empresas')



def lista_busquedas(request):
    if request.method == 'POST':
        empresa_id = request.POST.get('empresa_id')
        titulo_puesto = request.POST.get('titulo_puesto')
        descripcion = request.POST.get('descripcion', '')
        areas = request.POST.get('areas', 'it')
        nivel = request.POST.get('nivel', 'semi_senior')
        habilidades_requeridas = request.POST.get('habilidades_requeridas', '')
        educacion_minima = request.POST.get('educacion_minima', '')
        experiencia_minima_anios = request.POST.get('experiencia_minima_anios') or 1
        es_remoto = request.POST.get('es_remoto') == 'on'
        ubicacion_puesto = request.POST.get('ubicacion_puesto', '')
        salario_minimo = request.POST.get('salario_minimo') or 0
        salario_maximo = request.POST.get('salario_maximo') or 0
        beneficios = request.POST.get('beneficios', '')
        prioridad = request.POST.get('prioridad', 'normal')
        cantidad_posiciones = request.POST.get('cantidad_posiciones') or 1
        selector_id = request.POST.get('selector_asignado_id')
        jd_url = request.POST.get('jd_url', '')
        flyer_url = request.POST.get('flyer_url', '')
        comision_porcentaje = request.POST.get('comision_porcentaje')
        salario_estipulado_comision = request.POST.get('salario_estipulado_comision')
        mision_puesto = request.POST.get('mision_puesto', '')
        responsabilidades = request.POST.get('responsabilidades', '')
        requisitos_excluyentes = request.POST.get('requisitos_excluyentes', '')
        requisitos_deseables = request.POST.get('requisitos_deseables', '')
        jornada_laboral = request.POST.get('jornada_laboral', '')
        
        # Nuevos campos del generador de perfil avanzado
        fecha_inicio_str = request.POST.get('fecha_inicio', '')
        fecha_inicio = None
        if fecha_inicio_str:
            try:
                from datetime import datetime
                fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            except ValueError:
                pass
                
        observaciones = request.POST.get('observaciones', '')
        candidato_ideal = request.POST.get('candidato_ideal', '')
        preguntas_informe = request.POST.get('preguntas_informe', '')
        descansos = request.POST.get('descansos', '')
        convenio = request.POST.get('convenio', '')
        edad_rango = request.POST.get('edad_rango', '')
        zona_residencia = request.POST.get('zona_residencia', '')
        google_form_id = request.POST.get('google_form_id', '') or None
        codigo_puesto = request.POST.get('codigo_puesto', '').strip() or None
        codigo_titulo = request.POST.get('codigo_titulo', '').strip() or None
        
        tipo_asignacion = request.POST.get('tipo_asignacion', 'unico')
        grupo_asignado_id = request.POST.get('grupo_asignado_id')
        selectores_asignados_ids = request.POST.getlist('selectores_asignados_ids')
        
        # Fetch default or requested state
        estado_val = request.POST.get('estado')
        estado_obj = None
        if estado_val:
            try:
                if estado_val.isdigit():
                    estado_obj = EstadoBusqueda.objects.filter(id=int(estado_val)).first()
                else:
                    estado_obj = EstadoBusqueda.objects.filter(nombre__iexact=estado_val).first()
            except Exception:
                pass
        if not estado_obj:
            estado_obj = EstadoBusqueda.objects.filter(nombre='Abiertas').first()

        if empresa_id:
            try:
                empresa = get_object_or_404(Empresa, id=empresa_id)
                selector = None
                if selector_id:
                    selector = get_object_or_404(Selector, id=selector_id)

                perfil = PerfilBusqueda.objects.create(
                    empresa=empresa,
                    titulo_puesto=titulo_puesto,
                    descripcion=descripcion,
                    areas=areas,
                    nivel=nivel,
                    habilidades_requeridas=habilidades_requeridas,
                    educacion_minima=educacion_minima,
                    experiencia_minima_anios=int(experiencia_minima_anios),
                    es_remoto=es_remoto,
                    ubicacion_puesto=ubicacion_puesto,
                    salario_minimo=float(salario_minimo),
                    salario_maximo=float(salario_maximo),
                    beneficios=beneficios,
                    prioridad=prioridad,
                    cantidad_posiciones=int(cantidad_posiciones),
                    selector_asignado=selector,
                    estado=estado_obj,
                    jd_url=jd_url or None,
                    flyer_url=flyer_url or None,
                    comision_porcentaje=float(comision_porcentaje) if comision_porcentaje else None,
                    salario_estipulado_comision=float(salario_estipulado_comision) if salario_estipulado_comision else None,
                    mision_puesto=mision_puesto or None,
                    responsabilidades=responsabilidades or None,
                    requisitos_excluyentes=requisitos_excluyentes or None,
                    requisitos_deseables=requisitos_deseables or None,
                    jornada_laboral=jornada_laboral or None,
                    fecha_inicio=fecha_inicio,
                    observaciones=observaciones or None,
                    candidato_ideal=candidato_ideal or None,
                    preguntas_informe=preguntas_informe or None,
                    descansos=descansos or None,
                    convenio=convenio or None,
                    edad_rango=edad_rango or None,
                    zona_residencia=zona_residencia or None,
                    google_form_id=google_form_id,
                    codigo_puesto=codigo_puesto,
                    codigo_titulo=codigo_titulo
                )
                
                # Procesar asignaciones
                from selectores.models import AsignacionBusqueda, GrupoSelector
                selectores_para_asignar = []
                if tipo_asignacion == 'unico' and selector:
                    selectores_para_asignar.append(selector)
                elif tipo_asignacion == 'todos':
                    selectores_para_asignar = list(Selector.objects.filter(estado='activo'))
                elif tipo_asignacion == 'grupo' and grupo_asignado_id:
                    try:
                        grupo = GrupoSelector.objects.get(id=grupo_asignado_id)
                        selectores_para_asignar = list(grupo.selectores.filter(estado='activo'))
                    except GrupoSelector.DoesNotExist:
                        pass
                elif tipo_asignacion == 'multiples' and selectores_asignados_ids:
                    selectores_para_asignar = list(Selector.objects.filter(id__in=selectores_asignados_ids))

                from django.core.mail import send_mail
                from django.conf import settings
                from postulantes.services import enviar_mensaje_whatsapp

                for sel in selectores_para_asignar:
                    AsignacionBusqueda.objects.get_or_create(selector=sel, perfil_busqueda=perfil)
                    
                    # Notificar por Email
                    if sel.email:
                        asunto = f"Nueva búsqueda asignada: {perfil.titulo_puesto} - {empresa_obj.nombre}"
                        mensaje_email = f"Hola {sel.nombre},\n\nSe te ha asignado una nueva búsqueda: {perfil.titulo_puesto} para la empresa {empresa_obj.nombre}.\nPor favor, revisa la plataforma para más detalles."
                        try:
                            send_mail(asunto, mensaje_email, getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@consultora.com'), [sel.email], fail_silently=True)
                        except Exception:
                            pass
                            
                    # Notificar por WhatsApp
                    if sel.telefono:
                        mensaje_wa = f"👋 Hola {sel.nombre},\n\nSe te ha asignado una nueva búsqueda: *{perfil.titulo_puesto}* para la empresa *{empresa_obj.nombre}*.\n\nPor favor, revisa la plataforma para más detalles."
                        try:
                            enviar_mensaje_whatsapp(sel.telefono, mensaje_wa)
                        except Exception:
                            pass

                messages.success(request, 'Búsqueda de personal creada exitosamente y selectores notificados.')
            except Exception as e:
                messages.error(request, f'Error al registrar la búsqueda: {str(e)}')
            
            return redirect('busquedas')

    # Filtros y búsquedas
    q = request.GET.get('q', '')
    estado_filtro = request.GET.get('estado', '')
    area_filtro = request.GET.get('area', '')
    prioridad_filtro = request.GET.get('prioridad', '')

    busquedas = PerfilBusqueda.objects.all().select_related('empresa', 'selector_asignado').order_by('-fecha_creacion')

    if q:
        busquedas = busquedas.filter(
            Q(titulo_puesto__icontains=q) | 
            Q(empresa__nombre__icontains=q) | 
            Q(habilidades_requeridas__icontains=q)
        )
    if estado_filtro:
        if estado_filtro.isdigit():
            busquedas = busquedas.filter(estado_id=int(estado_filtro))
        else:
            busquedas = busquedas.filter(estado__nombre__iexact=estado_filtro)
    if area_filtro:
        busquedas = busquedas.filter(areas=area_filtro)
    if prioridad_filtro:
        busquedas = busquedas.filter(prioridad=prioridad_filtro)

    # Autopopular si están vacíos con algunos códigos comunes
    if not CodigoPuesto.objects.exists():
        puestos_defecto = [
            ('DESA', 'Desarrollador'),
            ('DISN', 'Diseñador'),
            ('CONT', 'Contador'),
            ('ANAL', 'Analista de Negocio'),
            ('GERT', 'Gerente'),
            ('SELE', 'Selector / Recruiter'),
            ('SOPA', 'Soporte Administrativo'),
            ('INFR', 'Infraestructura / DevOps'),
            ('MARK', 'Marketing / Redes'),
            ('VENT', 'Vendedor / Ejecutivo Comercial'),
        ]
        for cod, nom in puestos_defecto:
            CodigoPuesto.objects.get_or_create(codigo=cod, defaults={'nombre': nom})

    if not CodigoTitulo.objects.exists():
        titulos_defecto = [
            ('INFS', 'Ingeniero de Software / Sistemas'),
            ('COPU', 'Contador Público'),
            ('LIRA', 'Licenciado en Recursos Humanos'),
            ('LIAE', 'Licenciado en Administración de Empresas'),
            ('DISG', 'Diseñador Gráfico / UX'),
            ('MARK', 'Especialista en Marketing / Comunicación'),
            ('TECH', 'Técnico Electrónico / Sistemas'),
            ('PSIC', 'Psicólogo / Lic. Psicología'),
            ('ABOG', 'Abogado / Lic. Derecho'),
            ('BACH', 'Bachiller / Secundario Completo'),
        ]
        for cod, nom in titulos_defecto:
            CodigoTitulo.objects.get_or_create(codigo=cod, defaults={'nombre': nom})

    codigos_puesto = CodigoPuesto.objects.all().order_by('nombre')
    codigos_titulo = CodigoTitulo.objects.all().order_by('nombre')

    # Métricas estadísticas reales
    total_busquedas = PerfilBusqueda.objects.count()
    activas = PerfilBusqueda.objects.filter(estado__nombre='Abiertas').count()
    urgentes = PerfilBusqueda.objects.filter(estado__nombre='Abiertas', prioridad='urgente').count()
    cubiertas = PerfilBusqueda.objects.filter(estado__nombre='Cubiertas').count()

    # Obtener todas las empresas y selectores activos
    empresas = Empresa.objects.filter(activa=True).order_by('nombre')
    selectores = Selector.objects.filter(estado='activo').order_by('nombre')
    from selectores.models import GrupoSelector
    grupos = GrupoSelector.objects.all().order_by('nombre')

    # Paginación
    from django.core.paginator import Paginator
    paginator = Paginator(busquedas, 20)
    page_number = request.GET.get('page')
    busquedas_paginadas = paginator.get_page(page_number)

    context = {
        'busquedas': busquedas_paginadas,
        'paginator': paginator,
        'empresas': empresas,
        'selectores': selectores,
        'grupos': grupos,
        'total_busquedas': total_busquedas,
        'activas': activas,
        'urgentes': urgentes,
        'cubiertas': cubiertas,
        'q': q,
        'estado_filtro': estado_filtro,
        'area_filtro': area_filtro,
        'prioridad_filtro': prioridad_filtro,
        'codigos_puesto': codigos_puesto,
        'codigos_titulo': codigos_titulo,
        'estados': EstadoBusqueda.objects.all(),
    }
    return render(request, 'busquedas.html', context)


def exportar_jd_word(request, busqueda_id):
    """Genera y descarga la Job Description en formato Word .docx con el estilo premium del generador"""
    from .services import generar_jd_word_doc
    try:
        busqueda = PerfilBusqueda.objects.select_related('empresa').get(id=busqueda_id)
    except PerfilBusqueda.DoesNotExist:
        messages.error(request, "La búsqueda de personal no existe.")
        return redirect('busquedas')
        
    buffer = generar_jd_word_doc(busqueda)
    
    filename = f"JD_{busqueda.titulo_puesto.replace(' ', '_')}_{busqueda.empresa.nombre.replace(' ', '_')}.docx"
    import urllib.parse
    safe_filename = urllib.parse.quote(filename)
    
    response = FileResponse(buffer, as_attachment=True, filename=filename)
    response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    response['Content-Disposition'] = f"attachment; filename*=UTF-8''{safe_filename}"
    return response


def guardar_flyer(request, busqueda_id):
    """Guarda el flyer generado para una búsqueda en el servidor"""
    if request.method == 'POST':
        import base64
        from django.core.files.base import ContentFile
        from django.http import JsonResponse
        from django.shortcuts import get_object_or_404
        
        busqueda = get_object_or_404(PerfilBusqueda, id=busqueda_id)
        image_data = request.POST.get('image_data')
        
        if image_data:
            try:
                # Decodificar el string base64
                if ';base64,' in image_data:
                    format, imgstr = image_data.split(';base64,')
                    ext = format.split('/')[-1]
                else:
                    imgstr = image_data
                    ext = 'jpg'
                
                if ext == 'jpeg':
                    ext = 'jpg'
                
                data = ContentFile(base64.b64decode(imgstr), name=f"flyer_{busqueda.id}.{ext}")
                
                # Eliminar el flyer anterior si existe para no llenar el disco
                if busqueda.flyer_imagen:
                    try:
                        busqueda.flyer_imagen.delete(save=False)
                    except Exception:
                        pass
                
                busqueda.flyer_imagen = data
                busqueda.save()
                
                # También actualizamos la URL de texto del flyer
                busqueda.flyer_url = busqueda.flyer_imagen.url
                busqueda.save()
                
                return JsonResponse({
                    'status': 'success',
                    'url': busqueda.flyer_imagen.url
                })
            except Exception as e:
                return JsonResponse({
                    'status': 'error',
                    'message': f'Error al decodificar la imagen: {str(e)}'
                }, status=400)
        
        return JsonResponse({
            'status': 'error',
            'message': 'No se envió la data de la imagen'
        }, status=400)
        
    return JsonResponse({
        'status': 'error',
        'message': 'Método no permitido'
    }, status=405)


def eliminar_flyer(request, busqueda_id):
    """Elimina el flyer de la búsqueda en el servidor"""
    if request.method == 'POST':
        from django.http import JsonResponse
        from django.shortcuts import get_object_or_404
        
        busqueda = get_object_or_404(PerfilBusqueda, id=busqueda_id)
        if busqueda.flyer_imagen:
            try:
                # Eliminar el archivo físico de la imagen
                busqueda.flyer_imagen.delete(save=False)
            except Exception:
                pass
            
            # Limpiar campos de flyer
            busqueda.flyer_imagen = None
            busqueda.flyer_url = None
            busqueda.save()
            
            return JsonResponse({
                'status': 'success',
                'message': 'Flyer eliminado correctamente'
            })
        
        return JsonResponse({
            'status': 'error',
            'message': 'Esta búsqueda no tiene un flyer asociado'
        }, status=400)
        
    return JsonResponse({
        'status': 'error',
        'message': 'Método no permitido'
    }, status=405)


def editar_busqueda(request, busqueda_id):
    """Procesa el formulario de edición completa del Perfil de Búsqueda"""
    busqueda = get_object_or_404(PerfilBusqueda, id=busqueda_id)
    if request.method == 'POST':
        # Parsear campos principales
        busqueda.titulo_puesto = request.POST.get('titulo_puesto')
        
        empresa_id = request.POST.get('empresa_id')
        if empresa_id:
            busqueda.empresa = get_object_or_404(Empresa, id=empresa_id)
            
        busqueda.descripcion = request.POST.get('descripcion', '')
        busqueda.areas = request.POST.get('areas', 'it')
        busqueda.nivel = request.POST.get('nivel', 'semi_senior')
        busqueda.habilidades_requeridas = request.POST.get('habilidades_requeridas', '')
        busqueda.educacion_minima = request.POST.get('educacion_minima', '')
        busqueda.experiencia_minima_anios = int(request.POST.get('experiencia_minima_anios') or 1)
        
        # Modalidad presencial/remoto
        modalidad = request.POST.get('modalidad_trabajo')
        busqueda.es_remoto = (modalidad == 'remoto' or request.POST.get('es_remoto') == 'on')
        busqueda.ubicacion_puesto = request.POST.get('ubicacion_puesto', '')
        
        busqueda.salario_minimo = float(request.POST.get('salario_minimo') or 0)
        busqueda.salario_maximo = float(request.POST.get('salario_maximo') or 0)
        busqueda.beneficios = request.POST.get('beneficios', '')
        busqueda.prioridad = request.POST.get('prioridad', 'normal')
        busqueda.cantidad_posiciones = int(request.POST.get('cantidad_posiciones') or 1)
        
        tipo_asignacion = request.POST.get('tipo_asignacion', 'unico')
        grupo_asignado_id = request.POST.get('grupo_asignado_id')
        selectores_asignados_ids = request.POST.getlist('selectores_asignados_ids')

        selector_id = request.POST.get('selector_asignado_id')
        if selector_id and tipo_asignacion == 'unico':
            busqueda.selector_asignado = get_object_or_404(Selector, id=selector_id)
        else:
            busqueda.selector_asignado = None
            
        busqueda.jd_url = request.POST.get('jd_url', '') or None
        busqueda.flyer_url = request.POST.get('flyer_url', '') or None
        
        comision = request.POST.get('comision_porcentaje')
        busqueda.comision_porcentaje = float(comision) if comision else None
        
        salario_est_com = request.POST.get('salario_estipulado_comision')
        busqueda.salario_estipulado_comision = float(salario_est_com) if salario_est_com else None
        
        busqueda.mision_puesto = request.POST.get('mision_puesto', '') or None
        busqueda.responsabilidades = request.POST.get('responsabilidades', '') or None
        busqueda.requisitos_excluyentes = request.POST.get('requisitos_excluyentes', '') or None
        busqueda.requisitos_deseables = request.POST.get('requisitos_deseables', '') or None
        busqueda.jornada_laboral = request.POST.get('jornada_laboral', '') or None
        
        # Nuevos campos avanzados
        fecha_inicio_str = request.POST.get('fecha_inicio', '')
        if fecha_inicio_str:
            try:
                from datetime import datetime
                busqueda.fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            except ValueError:
                busqueda.fecha_inicio = None
        else:
            busqueda.fecha_inicio = None
            
        busqueda.observaciones = request.POST.get('observaciones', '') or None
        busqueda.candidato_ideal = request.POST.get('candidato_ideal', '') or None
        busqueda.preguntas_informe = request.POST.get('preguntas_informe', '') or None
        busqueda.descansos = request.POST.get('descansos', '') or None
        busqueda.convenio = request.POST.get('convenio', '') or None
        busqueda.edad_rango = request.POST.get('edad_rango', '') or None
        busqueda.zona_residencia = request.POST.get('zona_residencia', '') or None
        busqueda.google_form_id = request.POST.get('google_form_id', '') or None
        busqueda.codigo_puesto = request.POST.get('codigo_puesto', '').strip() or None
        busqueda.codigo_titulo = request.POST.get('codigo_titulo', '').strip() or None
        
        # Estado de la búsqueda
        estado_val = request.POST.get('estado')
        if estado_val:
            estado_obj = None
            try:
                if estado_val.isdigit():
                    estado_obj = EstadoBusqueda.objects.filter(id=int(estado_val)).first()
                else:
                    estado_obj = EstadoBusqueda.objects.filter(nombre__iexact=estado_val).first()
            except Exception:
                pass
            if estado_obj:
                busqueda.estado = estado_obj
                if estado_obj.nombre in ['Cubiertas', 'Canceladas']:
                    from django.utils import timezone
                    busqueda.fecha_cierre = timezone.now()
                else:
                    busqueda.fecha_cierre = None
        
        try:
            busqueda.save()
            
            # Actualizar asignaciones
            from selectores.models import AsignacionBusqueda, GrupoSelector
            AsignacionBusqueda.objects.filter(perfil_busqueda=busqueda).delete()
            
            selectores_para_asignar = []
            if tipo_asignacion == 'unico' and busqueda.selector_asignado:
                selectores_para_asignar.append(busqueda.selector_asignado)
            elif tipo_asignacion == 'todos':
                selectores_para_asignar = list(Selector.objects.filter(estado='activo'))
            elif tipo_asignacion == 'grupo' and grupo_asignado_id:
                try:
                    grupo = GrupoSelector.objects.get(id=grupo_asignado_id)
                    selectores_para_asignar = list(grupo.selectores.filter(estado='activo'))
                except GrupoSelector.DoesNotExist:
                    pass
            elif tipo_asignacion == 'multiples' and selectores_asignados_ids:
                selectores_para_asignar = list(Selector.objects.filter(id__in=selectores_asignados_ids))

            for sel in selectores_para_asignar:
                AsignacionBusqueda.objects.get_or_create(selector=sel, perfil_busqueda=busqueda)

            messages.success(request, f'Búsqueda "{busqueda.titulo_puesto}" actualizada con éxito.')
        except Exception as e:
            messages.error(request, f'Error al actualizar la búsqueda: {str(e)}')
            
        return redirect('busquedas')
        
    return redirect('busquedas')


def cambiar_prioridad(request, busqueda_id):
    """Permite cambiar la prioridad de la búsqueda directamente por AJAX sin recargar"""
    if request.method == 'POST':
        from django.http import JsonResponse
        busqueda = get_object_or_404(PerfilBusqueda, id=busqueda_id)
        nueva_prioridad = request.POST.get('prioridad')
        if nueva_prioridad in ['baja', 'normal', 'alta', 'urgente']:
            busqueda.prioridad = nueva_prioridad
            busqueda.save()
            return JsonResponse({'status': 'success', 'prioridad': nueva_prioridad})
        return JsonResponse({'status': 'error', 'message': 'Prioridad no válida'}, status=400)
    
    from django.http import JsonResponse
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'}, status=405)


def cambiar_estado(request, busqueda_id):
    """Permite cambiar el estado de la búsqueda directamente por AJAX sin recargar"""
    if request.method == 'POST':
        from django.http import JsonResponse
        busqueda = get_object_or_404(PerfilBusqueda, id=busqueda_id)
        estado_val = request.POST.get('estado')
        estado_obj = None
        if estado_val:
            try:
                if estado_val.isdigit():
                    estado_obj = EstadoBusqueda.objects.filter(id=int(estado_val)).first()
                else:
                    mapping = {
                        'abierto': 'Abiertas',
                        'pausa': 'En Pausa',
                        'cubierto': 'Cubiertas',
                        'cancelado': 'Canceladas'
                    }
                    search_name = mapping.get(estado_val.lower(), estado_val)
                    estado_obj = EstadoBusqueda.objects.filter(nombre__iexact=search_name).first()
            except Exception:
                pass
        if estado_obj:
            busqueda.estado = estado_obj
            if estado_obj.nombre in ['Cubiertas', 'Canceladas']:
                from django.utils import timezone
                busqueda.fecha_cierre = timezone.now()
            else:
                busqueda.fecha_cierre = None
            busqueda.save()
            return JsonResponse({
                'status': 'success',
                'estado': estado_obj.nombre,
                'estado_id': estado_obj.id,
                'color': estado_obj.color
            })
        return JsonResponse({'status': 'error', 'message': 'Estado no válido'}, status=400)
    
    from django.http import JsonResponse
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'}, status=405)


def eliminar_busqueda(request, busqueda_id):
    """Elimina una búsqueda de personal del sistema"""
    if request.method == 'POST':
        busqueda = get_object_or_404(PerfilBusqueda, id=busqueda_id)
        titulo = busqueda.titulo_puesto
        busqueda.delete()
        messages.success(request, f'Búsqueda "{titulo}" eliminada con éxito.')
    return redirect('busquedas')


def eliminar_empresa(request, empresa_id):
    """Elimina una empresa del sistema"""
    if request.method == 'POST':
        empresa = get_object_or_404(Empresa, id=empresa_id)
        nombre = empresa.nombre
        empresa.delete()
        messages.success(request, f'Empresa "{nombre}" eliminada con éxito.')
    return redirect('empresas')


def gestionar_estados_busqueda(request):
    """Muestra y gestiona los estados de las búsquedas (CRUD)"""
    from .models import EstadoBusqueda
    if request.method == 'POST':
        estado_id = request.POST.get('estado_id')
        nombre = request.POST.get('nombre', '').strip()
        codigo = request.POST.get('codigo', '').strip()
        color = request.POST.get('color', '#34c759').strip()
        orden = request.POST.get('orden', '0')

        try:
            orden = int(orden)
        except ValueError:
            orden = 0

        if nombre:
            # Slugify si está vacío
            if not codigo:
                codigo = "".join(c for c in nombre.lower() if c.isalnum() or c == ' ').replace(' ', '_')

            if estado_id:
                estado_obj = get_object_or_404(EstadoBusqueda, id=estado_id)
                if estado_obj.no_borrable:
                    estado_obj.color = color
                    estado_obj.orden = orden
                    estado_obj.codigo = codigo
                else:
                    estado_obj.nombre = nombre
                    estado_obj.color = color
                    estado_obj.orden = orden
                    estado_obj.codigo = codigo
                estado_obj.save()
                messages.success(request, f'Estado "{nombre}" actualizado.')
            else:
                try:
                    # Garantizar código único
                    base_codigo = codigo
                    counter = 1
                    while EstadoBusqueda.objects.filter(codigo=codigo).exists():
                        codigo = f"{base_codigo}_{counter}"
                        counter += 1
                        
                    EstadoBusqueda.objects.create(
                        nombre=nombre,
                        codigo=codigo,
                        color=color,
                        orden=orden,
                        no_borrable=False
                    )
                    messages.success(request, f'Estado "{nombre}" creado con éxito.')
                except Exception as e:
                    messages.error(request, f'Error al crear el estado: {str(e)}')
        else:
            messages.error(request, 'El nombre del estado es obligatorio.')

        return redirect(request.META.get('HTTP_REFERER', 'busquedas'))
    return redirect('busquedas')


def eliminar_estado_busqueda(request, estado_id):
    """Elimina un estado personalizado de búsquedas si no tiene búsquedas asociadas y no es no_borrable"""
    from .models import EstadoBusqueda
    if request.method == 'POST':
        estado_obj = get_object_or_404(EstadoBusqueda, id=estado_id)
        if estado_obj.no_borrable:
            messages.error(request, 'Este estado es predeterminado y no se puede eliminar.')
        elif estado_obj.perfiles_busqueda.exists():
            messages.error(request, f'No se puede eliminar el estado "{estado_obj.nombre}" porque tiene búsquedas asociadas.')
        else:
            nombre = estado_obj.nombre
            estado_obj.delete()
            messages.success(request, f'Estado "{nombre}" eliminado correctamente.')

    return redirect(request.META.get('HTTP_REFERER', 'busquedas'))
