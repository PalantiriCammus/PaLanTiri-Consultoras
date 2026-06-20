# postulaciones/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from .models import Postulacion, InformeEntrevista

def gestionar_informe_entrevista(request, postulacion_id):
    postulacion = get_object_or_404(Postulacion, id=postulacion_id)
    
    # Intentar obtener el informe existente
    informe = None
    try:
        informe = postulacion.informe_entrevista
    except InformeEntrevista.DoesNotExist:
        pass

    if request.method == 'POST':
        fecha_entrevista = request.POST.get('fecha_entrevista')
        empresa_puesto_actual = request.POST.get('empresa_puesto_actual', '')
        experiencia_detalle = request.POST.get('experiencia_detalle', '')
        formacion_academica = request.POST.get('formacion_academica', '')
        situacion_actual = request.POST.get('situacion_actual', '')
        sueldo_bruto_pretendido = request.POST.get('sueldo_bruto_pretendido') or None
        comentarios_selector = request.POST.get('comentarios_selector', '')

        if fecha_entrevista:
            try:
                if informe:
                    informe.fecha_entrevista = fecha_entrevista
                    informe.empresa_puesto_actual = empresa_puesto_actual
                    informe.experiencia_detalle = experiencia_detalle
                    informe.formacion_academica = formacion_academica
                    informe.situacion_actual = situacion_actual
                    informe.sueldo_bruto_pretendido = float(sueldo_bruto_pretendido) if sueldo_bruto_pretendido else None
                    informe.comentarios_selector = comentarios_selector
                    informe.save()
                    messages.success(request, 'Informe de entrevista actualizado exitosamente.')
                else:
                    InformeEntrevista.objects.create(
                        postulacion=postulacion,
                        fecha_entrevista=fecha_entrevista,
                        empresa_puesto_actual=empresa_puesto_actual,
                        experiencia_detalle=experiencia_detalle,
                        formacion_academica=formacion_academica,
                        situacion_actual=situacion_actual,
                        sueldo_bruto_pretendido=float(sueldo_bruto_pretendido) if sueldo_bruto_pretendido else None,
                        comentarios_selector=comentarios_selector
                    )
                    messages.success(request, 'Informe de entrevista guardado exitosamente.')
                
                # Redirigir a la lista de postulantes
                return redirect('postulantes')
            except Exception as e:
                messages.error(request, f'Error al guardar el informe: {str(e)}')
        else:
            messages.error(request, 'La fecha de la entrevista es obligatoria.')

    context = {
        'postulacion': postulacion,
        'informe': informe,
    }
    return render(request, 'informe_entrevista.html', context)
