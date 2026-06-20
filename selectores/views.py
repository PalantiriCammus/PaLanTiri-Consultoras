# selectores/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.models import User
from django.db.models import Avg
from .models import Selector, GrupoSelector

def lista_selectores(request):
    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        apellido = request.POST.get('apellido')
        email = request.POST.get('email')
        telefono = request.POST.get('telefono', '')
        especializacion = request.POST.get('especializacion', 'general')
        experiencia_anos = request.POST.get('experiencia_anos') or 0
        descripcion_perfil = request.POST.get('descripcion_perfil', '')
        pais = request.POST.get('pais', 'Argentina')
        provincia = request.POST.get('provincia', '')
        ciudad = request.POST.get('ciudad', '')
        estado = request.POST.get('estado', 'activo')
        cuit = request.POST.get('cuit')
        banco = request.POST.get('banco', '')
        numero_cuenta = request.POST.get('numero_cuenta', '')
        cbu = request.POST.get('cbu', '')
        alias_cvu = request.POST.get('alias_cvu', '')
        comision_porcentaje_defecto = request.POST.get('comision_porcentaje_defecto') or 50.00
        google_email = request.POST.get('google_email', '')
        grupos_ids = request.POST.getlist('grupos')
        dni = request.POST.get('dni', '').strip() or None

        if nombre and apellido and email and cuit:
            try:
                # Buscar o crear el User correspondiente
                username = email
                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        'email': email,
                        'first_name': nombre,
                        'last_name': apellido,
                    }
                )
                if created:
                    user.set_unusable_password()
                    user.save()

                selector = Selector.objects.create(
                    usuario=user,
                    nombre=nombre,
                    apellido=apellido,
                    email=email,
                    telefono=telefono,
                    especializacion=especializacion,
                    experiencia_anos=int(experiencia_anos),
                    descripcion_perfil=descripcion_perfil,
                    pais=pais,
                    provincia=provincia,
                    ciudad=ciudad,
                    estado=estado,
                    cuit=cuit,
                    dni=dni,
                    banco=banco,
                    numero_cuenta=numero_cuenta,
                    cbu=cbu,
                    alias_cvu=alias_cvu,
                    comision_porcentaje_defecto=float(comision_porcentaje_defecto),
                    google_email=google_email or None
                )
                if grupos_ids:
                    selector.grupos.set(grupos_ids)
                messages.success(request, 'Selector registrado exitosamente.')
            except Exception as e:
                messages.error(request, f'Error al registrar el selector: {str(e)}')
            return redirect('selectores')

    selectores = Selector.objects.all().order_by('-fecha_registro')
    
    grupos = GrupoSelector.objects.all().order_by('nombre')
    
    # Estadísticas para el selector dashboard
    total_selectores = selectores.count()
    selectores_activos = selectores.filter(estado='activo').count()
    
    # Calcular promedio de efectividad
    promedio_efectividad = selectores.aggregate(Avg('tasa_efectividad'))['tasa_efectividad__avg'] or 0.0
    promedio_efectividad = round(promedio_efectividad, 2)
    
    context = {
        'selectores': selectores,
        'grupos': grupos,
        'total_selectores': total_selectores,
        'selectores_activos': selectores_activos,
        'promedio_efectividad': promedio_efectividad,
    }
    return render(request, 'selectores.html', context)


def editar_selector(request, selector_id):
    selector = get_object_or_404(Selector, id=selector_id)
    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        apellido = request.POST.get('apellido')
        email = request.POST.get('email')
        telefono = request.POST.get('telefono', '')
        especializacion = request.POST.get('especializacion', 'general')
        experiencia_anos = request.POST.get('experiencia_anos') or 0
        descripcion_perfil = request.POST.get('descripcion_perfil', '')
        pais = request.POST.get('pais', 'Argentina')
        provincia = request.POST.get('provincia', '')
        ciudad = request.POST.get('ciudad', '')
        estado = request.POST.get('estado', 'activo')
        cuit = request.POST.get('cuit')
        banco = request.POST.get('banco', '')
        numero_cuenta = request.POST.get('numero_cuenta', '')
        cbu = request.POST.get('cbu', '')
        alias_cvu = request.POST.get('alias_cvu', '')
        comision_porcentaje_defecto = request.POST.get('comision_porcentaje_defecto') or 50.00
        google_email = request.POST.get('google_email', '')
        grupos_ids = request.POST.getlist('grupos')
        dni = request.POST.get('dni', '').strip() or None

        if nombre and apellido and email and cuit:
            try:
                # Actualizar el User asociado
                user = selector.usuario
                user.email = email
                user.first_name = nombre
                user.last_name = apellido
                user.username = email
                user.save()

                # Actualizar el Selector
                selector.nombre = nombre
                selector.apellido = apellido
                selector.email = email
                selector.telefono = telefono
                selector.especializacion = especializacion
                selector.experiencia_anos = int(experiencia_anos)
                selector.descripcion_perfil = descripcion_perfil
                selector.pais = pais
                selector.provincia = provincia
                selector.ciudad = ciudad
                selector.estado = estado
                selector.cuit = cuit
                selector.dni = dni
                selector.banco = banco
                selector.numero_cuenta = numero_cuenta
                selector.cbu = cbu
                selector.alias_cvu = alias_cvu
                selector.comision_porcentaje_defecto = float(comision_porcentaje_defecto)
                selector.google_email = google_email or None
                selector.save()
                selector.grupos.set(grupos_ids)
                
                messages.success(request, f'Selector "{nombre} {apellido}" actualizado exitosamente.')
            except Exception as e:
                messages.error(request, f'Error al actualizar el selector: {str(e)}')
        else:
            messages.error(request, 'Por favor completa todos los campos requeridos.')
            
    return redirect('selectores')


def crear_grupo_selector(request):
    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        descripcion = request.POST.get('descripcion', '')
        if nombre:
            try:
                GrupoSelector.objects.create(nombre=nombre, descripcion=descripcion)
                messages.success(request, f'Grupo "{nombre}" creado exitosamente.')
            except Exception as e:
                messages.error(request, f'Error al crear el grupo: {str(e)}')
    return redirect('selectores')


def eliminar_selector(request, selector_id):
    """Elimina un selector del sistema"""
    if request.method == 'POST':
        selector = get_object_or_404(Selector, id=selector_id)
        nombre = f"{selector.nombre} {selector.apellido}"
        selector.delete()
        messages.success(request, f'Selector "{nombre}" eliminado con éxito.')
    return redirect('selectores')

def portal_publico(request, alias):
    """
    Vista pública para que los candidatos apliquen a las búsquedas de un selector.
    """
    selector = get_object_or_404(Selector, alias_publico=alias, estado='activo')
    
    from empresas.models import PerfilBusqueda
    busquedas = PerfilBusqueda.objects.filter(
        asignaciones_selectores__selector=selector
    ).exclude(estado__nombre__iexact='cerrada').distinct()
    
    if request.method == 'POST':
        # Recibir los datos del candidato y el CV
        nombre = request.POST.get('nombre')
        apellido = request.POST.get('apellido')
        email = request.POST.get('email')
        telefono = request.POST.get('telefono')
        linkedin_url = request.POST.get('linkedin_url', '')
        busqueda_id = request.POST.get('busqueda_id')
        cv_archivo = request.FILES.get('cv_archivo')
        
        if nombre and apellido and email and cv_archivo and busqueda_id:
            from postulantes.models import Postulante, EstadoPostulante
            from postulaciones.models import Postulacion, EstadoPostulacion
            
            # Obtener estado inicial ("Nuevo")
            estado_inicial = EstadoPostulante.objects.filter(nombre__icontains='nuevo').first()
            if not estado_inicial:
                estado_inicial = EstadoPostulante.objects.first()
                
            # Crear o actualizar postulante
            postulante, created = Postulante.objects.update_or_create(
                email=email,
                defaults={
                    'nombre': nombre,
                    'apellido': apellido,
                    'telefono': telefono,
                    'linkedin_url': linkedin_url,
                    'selector': selector,
                    'estado': estado_inicial
                }
            )
            
            # Guardar el CV
            if cv_archivo:
                postulante.cv_archivo = cv_archivo
                postulante.save()
                
            # Asociar a la búsqueda
            try:
                perfil = PerfilBusqueda.objects.get(id=busqueda_id)
                estado_post_ini = EstadoPostulacion.objects.filter(nombre__icontains='enviada').first() or EstadoPostulacion.objects.first()
                Postulacion.objects.get_or_create(
                    postulante=postulante,
                    perfil_busqueda=perfil,
                    defaults={'estado': estado_post_ini}
                )
                messages.success(request, '¡Gracias por postularte! Hemos recibido tu perfil.')
            except Exception:
                messages.error(request, 'Error al procesar la postulación.')
                
            return redirect('portal_publico', alias=alias)
            
    return render(request, 'portal_publico.html', {
        'selector': selector,
        'busquedas': busquedas,
    })

