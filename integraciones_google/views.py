# integraciones_google/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from .models import GoogleToken, GoogleLog
from django.contrib.auth.models import User
from decouple import config

def lista_integraciones(request):
    user = request.user if request.user.is_authenticated else None
    
    if not user:
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        
    token_exists = False
    token_obj = None
    if user:
        token_obj = GoogleToken.objects.filter(user=user).first()
        token_exists = token_obj is not None
        
    google_logs = GoogleLog.objects.all()[:10]
    
    # Comprobar configuraciones en .env
    client_id = config('GOOGLE_CLIENT_ID', default='your-google-client-id')
    client_secret = config('GOOGLE_CLIENT_SECRET', default='your-google-client-secret')
    
    client_configured = (
        client_id != 'your-google-client-id' and 
        client_id != 'tu-cliente-id.apps.googleusercontent.com' and
        client_secret != 'your-google-client-secret' and
        client_secret != 'tu-cliente-secreto'
    )
    
    context = {
        'token_exists': token_exists,
        'token_obj': token_obj,
        'google_logs': google_logs,
        'client_configured': client_configured,
        'client_id': client_id if client_configured else "No configurado / Usando placeholder",
        'user_username': user.username if user else "Admin"
    }
    return render(request, 'integraciones.html', context)


def conectar_google(request):
    import os
    from google_auth_oauthlib.flow import Flow
    
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    
    scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/contacts',
        'https://www.googleapis.com/auth/forms.responses.readonly',
        'https://www.googleapis.com/auth/forms.body.readonly',
        'https://www.googleapis.com/auth/gmail.send'
    ]
    
    client_config = {
        "web": {
            "client_id": config('GOOGLE_CLIENT_ID'),
            "client_secret": config('GOOGLE_CLIENT_SECRET'),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    
    # We resolve loopback dynamically to match current Django server host & port (e.g. localhost:8001)
    host = request.get_host()
    if '127.0.0.1' in host:
        host = host.replace('127.0.0.1', 'localhost')
    redirect_uri = f"http://{host}/auth/google/callback/"
    
    flow = Flow.from_client_config(
        client_config,
        scopes=scopes,
        redirect_uri=redirect_uri
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    request.session['oauth_state'] = state
    return redirect(authorization_url)


def google_callback(request):
    import os
    from google_auth_oauthlib.flow import Flow
    from .models import GoogleToken, GoogleLog
    
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    
    state = request.session.get('oauth_state')
    
    client_config = {
        "web": {
            "client_id": config('GOOGLE_CLIENT_ID'),
            "client_secret": config('GOOGLE_CLIENT_SECRET'),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    
    host = request.get_host()
    if '127.0.0.1' in host:
        host = host.replace('127.0.0.1', 'localhost')
    redirect_uri = f"http://{host}/auth/google/callback/"
    
    flow = Flow.from_client_config(
        client_config,
        scopes=[
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/contacts',
            'https://www.googleapis.com/auth/forms.responses.readonly',
            'https://www.googleapis.com/auth/forms.body.readonly',
            'https://www.googleapis.com/auth/gmail.send'
        ],
        state=state,
        redirect_uri=redirect_uri
    )
    
    authorization_response = request.build_absolute_uri()
    if '127.0.0.1' in authorization_response:
        authorization_response = authorization_response.replace('127.0.0.1', 'localhost')
        
    flow.fetch_token(authorization_response=authorization_response)
    credentials = flow.credentials
    
    user = request.user if request.user.is_authenticated else None
    if not user:
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        
    if user:
        token_data = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        GoogleToken.objects.update_or_create(
            user=user,
            defaults={"token": token_data}
        )
        GoogleLog.objects.create(
            service="OAuth2",
            operation="Conexión de Cuenta",
            status="Success",
            message=f"Cuenta de Google {user.username} vinculada exitosamente con token real de Google."
        )
        messages.success(request, 'Cuenta de Google vinculada con éxito.')
    else:
        messages.error(request, 'No se pudo vincular la cuenta. No hay usuario administrador.')
        
    return redirect('integraciones')


def desconectar_google(request):
    user = request.user if request.user.is_authenticated else None
    if not user:
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        
    if user:
        GoogleToken.objects.filter(user=user).delete()
        GoogleLog.objects.create(
            service="OAuth2",
            operation="Desconexión de Cuenta",
            status="Success",
            message=f"Cuenta de Google {user.username} desvinculada exitosamente."
        )
        messages.success(request, 'Cuenta de Google desvinculada del sistema.')
    else:
        GoogleToken.objects.all().delete()
        messages.success(request, 'Tokens eliminados del sistema.')
        
    return redirect('integraciones')


def parse_respuestas_formulario(answers, question_map):
    import re
    
    email = ""
    nombre = ""
    apellido = ""
    telefono = ""
    experiencia_anos = 0
    codigo_busqueda_resp = ""
    selector_cuit_resp = ""
    lugar_residencia = ""
    movilidad = ""
    empresa_puesto = ""
    experiencia_detalle = ""
    estudios = []
    situacion_laboral = ""
    sueldo_pretendido_str = ""
    informe_selector = ""
    fecha_entrevista = ""
    cv_file_id = ""
    
    for q_id, ans in answers.items():
        title = question_map.get(q_id, '')
        text_vals = ans.get('textAnswers', {}).get('answers', [])
        val = text_vals[0].get('value', '') if text_vals else ''
        
        # Check fileUploadAnswers
        file_vals = ans.get('fileUploadAnswers', {}).get('answers', [])
        file_id = file_vals[0].get('fileId', '') if file_vals else ''
        
        if 'email' in title or 'correo' in title or 'mail' in title:
            email = val.strip()
        elif 'nombre' in title and 'apellido' in title:
            nombre_completo = val.strip()
            partes = nombre_completo.split(maxsplit=1)
            if len(partes) >= 2:
                nombre = partes[0]
                apellido = partes[1]
            else:
                nombre = partes[0]
                apellido = "No especificado"
        elif 'nombre' in title:
            nombre = val.strip()
        elif 'apellido' in title:
            apellido = val.strip()
        elif 'tel' in title or 'celular' in title or 'contacto' in title:
            telefono = val.strip()
        elif 'experiencia' in title:
            experiencia_detalle = val.strip()
            try:
                nums = re.findall(r'\d+', val)
                if nums:
                    experiencia_anos = int(nums[0])
            except:
                pass
        elif 'búsqueda' in title or 'busqueda' in title:
            if 'selector' not in title:
                codigo_busqueda_resp = val.strip()
        elif 'selector' in title:
            selector_cuit_resp = val.strip()
        elif 'cuit' in title:
            selector_cuit_resp = val.strip()
        elif 'residencia' in title:
            lugar_residencia = val.strip()
        elif 'movilidad' in title:
            movilidad = val.strip()
        elif 'empresa' in title or 'puesto actual' in title:
            empresa_puesto = val.strip()
        elif 'estudios' in title or 'título' in title or 'titulo' in title:
            if val.strip():
                estudios.append(val.strip())
        elif 'situación' in title or 'situacion' in title:
            situacion_laboral = val.strip()
        elif 'sueldo' in title or 'pretendido' in title:
            sueldo_pretendido_str = val.strip()
        elif 'informe' in title:
            informe_selector = val.strip()
        elif 'entrevista' in title:
            fecha_entrevista = val.strip()
        elif 'cv' in title or 'curriculum' in title or 'adjuntar' in title or 'archivo' in title:
            cv_file_id = file_id or val.strip()

    # Robust name parsing if one is empty
    if nombre and not apellido:
        partes = nombre.split(maxsplit=1)
        if len(partes) >= 2:
            nombre = partes[0]
            apellido = partes[1]
        else:
            apellido = "No especificado"
    elif apellido and not nombre:
        nombre = "No especificado"
        
    return {
        'email': email,
        'nombre': nombre,
        'apellido': apellido,
        'telefono': telefono,
        'experiencia_anos': experiencia_anos,
        'codigo_busqueda_resp': codigo_busqueda_resp,
        'selector_cuit_resp': selector_cuit_resp,
        'lugar_residencia': lugar_residencia,
        'movilidad': movilidad,
        'empresa_puesto': empresa_puesto,
        'experiencia_detalle': experiencia_detalle,
        'estudios': estudios,
        'situacion_laboral': situacion_laboral,
        'sueldo_pretendido_str': sueldo_pretendido_str,
        'informe_selector': informe_selector,
        'fecha_entrevista': fecha_entrevista,
        'cv_file_id': cv_file_id
    }


def sincronizar_respuestas_form(request, busqueda_id):
    from empresas.models import PerfilBusqueda
    from postulantes.models import Postulante, EstadoPostulante
    from postulaciones.models import Postulacion
    import re
    import random
    
    estado_activo = EstadoPostulante.objects.filter(nombre='Activo').first()
    
    busqueda = get_object_or_404(PerfilBusqueda, id=busqueda_id)
    if not busqueda.google_form_id:
        messages.error(request, 'Esta búsqueda no tiene un Google Form ID configurado.')
        return redirect('busquedas')
        
    user = request.user if request.user.is_authenticated else None
    if not user:
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        
    token_obj = GoogleToken.objects.filter(user=user).first()
    
    # Si tenemos un token real (no mock), intentamos usar la API real
    if token_obj and not token_obj.token.get('token', '').startswith('ya29.a0AfB_mockToken'):
        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build
            
            # Usar todos los scopes para que Drive también funcione con el mismo token
            all_scopes = [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/contacts',
                'https://www.googleapis.com/auth/forms.responses.readonly',
                'https://www.googleapis.com/auth/forms.body.readonly',
                'https://www.googleapis.com/auth/gmail.send'
            ]
            creds = Credentials.from_authorized_user_info(token_obj.token, all_scopes)
            service = build('forms', 'v1', credentials=creds)
            
            # Obtener respuestas del formulario
            response = service.forms().responses().list(formId=busqueda.google_form_id).execute()
            responses = response.get('responses', [])
            
            # Obtener estructura de preguntas para mapear títulos
            form_info = service.forms().get(formId=busqueda.google_form_id).execute()
            items = form_info.get('items', [])
            
            question_map = {}
            for item in items:
                if 'questionItem' in item:
                    q = item['questionItem']['question']
                    question_map[q['questionId']] = item['title'].lower()
            
            creados = 0
            duplicados = 0
            
            for r in responses:
                answers = r.get('answers', {})
                parsed = parse_respuestas_formulario(answers, question_map)
                
                # Buscar selector por CUIT
                from selectores.models import Selector
                selector = None
                if parsed['selector_cuit_resp']:
                    selector = Selector.objects.filter(cuit=parsed['selector_cuit_resp']).first()
                if not selector:
                    selector = busqueda.selector_asignado

                if parsed['email'] and parsed['nombre'] and parsed['apellido']:
                    postulante = Postulante.objects.filter(email=parsed['email'], nombre=parsed['nombre'], apellido=parsed['apellido'], postulaciones__perfil_busqueda=busqueda).first()
                    if postulante:
                        duplicados += 1
                        # If the candidate was already loaded but does not have the CV, download it now
                        if parsed.get('cv_file_id') and not postulante.cv_archivo:
                            try:
                                from googleapiclient.discovery import build
                                from googleapiclient.http import MediaIoBaseDownload
                                import io
                                from django.core.files.base import ContentFile
                                
                                drive_service = build('drive', 'v3', credentials=creds)
                                
                                file_meta = drive_service.files().get(fileId=parsed['cv_file_id'], fields='name').execute()
                                file_name = file_meta.get('name', f"CV_{postulante.nombre}_{postulante.apellido}.pdf")
                                
                                file_request = drive_service.files().get_media(fileId=parsed['cv_file_id'])
                                fh = io.BytesIO()
                                downloader = MediaIoBaseDownload(fh, file_request)
                                done = False
                                while not done:
                                    _, done = downloader.next_chunk()
                                    
                                postulante.cv_archivo.save(file_name, ContentFile(fh.getvalue()), save=True)
                            except Exception as drive_err:
                                GoogleLog.objects.create(
                                    service="Drive API",
                                    operation="Download CV",
                                    status="Error",
                                    message=f"No se pudo descargar el CV para {postulante.email}: {str(drive_err)}"
                                )
                        continue

                    # Parse sueldo
                    salario_min = None
                    if parsed['sueldo_pretendido_str']:
                        try:
                            nums = re.findall(r'\d+', parsed['sueldo_pretendido_str'].replace('.', '').replace(',', ''))
                            if nums:
                                salario_min = float(nums[0])
                        except:
                            pass

                    # Combine details into resumen
                    resumen_parts = []
                    if parsed['empresa_puesto']:
                        resumen_parts.append(f"Empresa/Puesto Actual: {parsed['empresa_puesto']}")
                    if parsed['situacion_laboral']:
                        resumen_parts.append(f"Situación Laboral: {parsed['situacion_laboral']}")
                    if parsed['experiencia_detalle']:
                        resumen_parts.append(f"Detalle de Experiencia: {parsed['experiencia_detalle']}")
                    if parsed['movilidad']:
                        resumen_parts.append(f"Movilidad: {parsed['movilidad']}")
                    if parsed['fecha_entrevista']:
                        resumen_parts.append(f"Fecha de Entrevista: {parsed['fecha_entrevista']}")
                        
                    resumen_profesional = "\n".join(resumen_parts)
                    titulaciones = ", ".join(parsed['estudios']) if parsed['estudios'] else ""
                    
                    # Ubicación parsing (Rosario / Santa Fe)
                    ciudad = busqueda.empresa.ciudad or 'Rosario'
                    provincia = busqueda.empresa.provincia or 'Santa Fe'
                    if parsed['lugar_residencia']:
                        partes_lugar = parsed['lugar_residencia'].split(',')
                        if len(partes_lugar) >= 2:
                            ciudad = partes_lugar[0].strip()
                            provincia = partes_lugar[1].strip()
                        else:
                            ciudad = parsed['lugar_residencia'].strip()

                    postulante = Postulante.objects.create(
                        email=parsed['email'],
                        nombre=parsed['nombre'],
                        apellido=parsed['apellido'],
                        telefono=parsed['telefono'] or "No especificado",
                        titulo_principal=f"Postulante para {busqueda.titulo_puesto}",
                        experiencia_anos=parsed['experiencia_anos'],
                        provincia=provincia,
                        ciudad=ciudad,
                        pais='Argentina',
                        estado=estado_activo,
                        resumen_profesional=resumen_profesional,
                        titulaciones=titulaciones,
                        salario_pretendido_minimo=salario_min,
                        selector=selector,
                        selector_cuit=parsed['selector_cuit_resp'] or (selector.cuit if selector else None),
                    )
                    
                    Postulacion.objects.create(
                        postulante=postulante,
                        perfil_busqueda=busqueda,
                        estado='enviada',
                        selector=selector or busqueda.selector_asignado
                    )
                    
                    # Add Selector note if provided
                    if parsed['informe_selector']:
                        from postulantes.models import NotaPostulante
                        NotaPostulante.objects.create(
                            postulante=postulante,
                            autor=selector,
                            titulo="Informe del Selector (Google Forms)",
                            contenido=parsed['informe_selector']
                        )
                        
                    # Download CV from Google Drive if present
                    if parsed.get('cv_file_id') and not postulante.cv_archivo:
                        try:
                            from googleapiclient.discovery import build
                            from googleapiclient.http import MediaIoBaseDownload
                            import io
                            from django.core.files.base import ContentFile
                            
                            drive_service = build('drive', 'v3', credentials=creds)
                            
                            file_meta = drive_service.files().get(fileId=parsed['cv_file_id'], fields='name').execute()
                            file_name = file_meta.get('name', f"CV_{postulante.nombre}_{postulante.apellido}.pdf")
                            
                            file_request = drive_service.files().get_media(fileId=parsed['cv_file_id'])
                            fh = io.BytesIO()
                            downloader = MediaIoBaseDownload(fh, file_request)
                            done = False
                            while not done:
                                _, done = downloader.next_chunk()
                                
                            postulante.cv_archivo.save(file_name, ContentFile(fh.getvalue()), save=True)
                        except Exception as drive_err:
                            GoogleLog.objects.create(
                                service="Drive API",
                                operation="Download CV",
                                status="Error",
                                message=f"No se pudo descargar el CV para {postulante.email}: {str(drive_err)}"
                            )
                        
                    creados += 1
            
            GoogleLog.objects.create(
                service="Forms API",
                operation="Sync Responses",
                status="Success",
                message=f"Formulario de '{busqueda.titulo_puesto}' sincronizado. Nuevos: {creados}. Duplicados: {duplicados}."
            )
            messages.success(request, f'Sincronización completada. Nuevos postulantes: {creados}. Ya registrados: {duplicados}.')
            
        except Exception as e:
            GoogleLog.objects.create(
                service="Forms API",
                operation="Sync Responses",
                status="Error",
                message=str(e)
            )
            messages.error(request, f'Error al sincronizar con Google Forms: {str(e)}')
            
    else:
        # MODO DEMO / SIMULADO: Ingesta simulada
        nombres = ["Carlos", "Mariela", "Julieta", "Andrés", "Federico", "Lucía"]
        apellidos = ["Ortega", "Spinetta", "Pérez", "Sosa", "Bielsa", "Messi"]
        dominios = ["gmail.com", "live.com.ar", "yahoo.com"]
        
        creados = 0
        duplicados = 0
        
        for i in range(2):
            nom = random.choice(nombres)
            ape = random.choice(apellidos)
            email = f"{nom.lower()}.{ape.lower()}{random.randint(10,99)}@{random.choice(dominios)}"
            tel = f"+54 9 341 {random.randint(1000000, 9999999)}"
            
            postulante, created = Postulante.objects.get_or_create(
                email=email,
                defaults={
                    'nombre': nom,
                    'apellido': ape,
                    'telefono': tel,
                    'titulo_principal': f"Postulante para {busqueda.titulo_puesto}",
                    'experiencia_anos': random.randint(1, 8),
                    'provincia': busqueda.empresa.provincia or 'Santa Fe',
                    'ciudad': busqueda.empresa.ciudad or 'Rosario',
                    'pais': 'Argentina',
                    'estado': estado_activo,
                }
            )
            
            postulacion_created = False
            if not Postulacion.objects.filter(postulante=postulante, perfil_busqueda=busqueda).exists():
                Postulacion.objects.create(
                    postulante=postulante,
                    perfil_busqueda=busqueda,
                    estado='enviada',
                    selector=busqueda.selector_asignado
                )
                postulacion_created = True
                
            if created or postulacion_created:
                creados += 1
            else:
                duplicados += 1
                
        GoogleLog.objects.create(
            service="Forms API (Demo)",
            operation="Sync Responses",
            status="Success",
            message=f"[MODO DEMO] Respuestas simuladas para '{busqueda.titulo_puesto}'. Ingestados: {creados}. Duplicados: {duplicados}."
        )
        messages.success(request, f'[Modo Demo] Respuestas sincronizadas. Nuevos postulantes: {creados}. Ya registrados: {duplicados}.')
        
    return redirect('busquedas')


def sincronizar_respuestas_form_global(request):
    from empresas.models import PerfilBusqueda
    from postulantes.models import Postulante, EstadoPostulante
    from postulaciones.models import Postulacion
    from selectores.models import Selector
    import re
    import random
    
    estado_activo = EstadoPostulante.objects.filter(nombre='Activo').first()
    
    global_form_id = config('GLOBAL_GOOGLE_FORM_ID', default='global-form-id-placeholder')
    
    user = request.user if request.user.is_authenticated else None
    if not user:
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        
    token_obj = GoogleToken.objects.filter(user=user).first()
    
    global_form_id = config('GLOBAL_GOOGLE_FORM_ID', default='global-form-id-placeholder')
    if token_obj and token_obj.global_form_id:
        global_form_id = token_obj.global_form_id
        
    # Redirigir a postulantes después
    redirect_url = 'postulantes'
    
    # Si tenemos un token real (no mock), intentamos usar la API real
    if token_obj and not token_obj.token.get('token', '').startswith('ya29.a0AfB_mockToken'):
        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build
            
            # Usar todos los scopes para que Drive también funcione con el mismo token
            all_scopes = [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/contacts',
                'https://www.googleapis.com/auth/forms.responses.readonly',
                'https://www.googleapis.com/auth/forms.body.readonly',
                'https://www.googleapis.com/auth/gmail.send'
            ]
            creds = Credentials.from_authorized_user_info(token_obj.token, all_scopes)
            service = build('forms', 'v1', credentials=creds)
            
            # Obtener respuestas del formulario
            response = service.forms().responses().list(formId=global_form_id).execute()
            responses = response.get('responses', [])
            
            # Obtener estructura de preguntas para mapear títulos
            form_info = service.forms().get(formId=global_form_id).execute()
            items = form_info.get('items', [])
            
            question_map = {}
            for item in items:
                if 'questionItem' in item:
                    q = item['questionItem']['question']
                    question_map[q['questionId']] = item['title'].lower()
            
            creados = 0
            duplicados = 0
            no_mapeados = 0
            
            for r in responses:
                answers = r.get('answers', {})
                parsed = parse_respuestas_formulario(answers, question_map)
                
                if parsed['email'] and parsed['nombre'] and parsed['apellido'] and parsed['codigo_busqueda_resp']:
                    # Buscar el perfil de búsqueda correspondiente al código
                    busqueda = PerfilBusqueda.objects.filter(codigo_busqueda__iexact=parsed['codigo_busqueda_resp']).first()
                    if not busqueda:
                        no_mapeados += 1
                        continue
                    
                    # Buscar selector por CUIT
                    selector = None
                    if parsed['selector_cuit_resp']:
                        selector = Selector.objects.filter(cuit=parsed['selector_cuit_resp']).first()
                        
                    postulante = Postulante.objects.filter(email=parsed['email'], nombre=parsed['nombre'], apellido=parsed['apellido'], postulaciones__perfil_busqueda=busqueda).first()
                    if postulante:
                        duplicados += 1
                        # If the candidate was already loaded but does not have the CV, download it now
                        if parsed.get('cv_file_id') and not postulante.cv_archivo:
                            try:
                                from googleapiclient.discovery import build
                                from googleapiclient.http import MediaIoBaseDownload
                                import io
                                from django.core.files.base import ContentFile
                                
                                drive_service = build('drive', 'v3', credentials=creds)
                                
                                file_meta = drive_service.files().get(fileId=parsed['cv_file_id'], fields='name').execute()
                                file_name = file_meta.get('name', f"CV_{postulante.nombre}_{postulante.apellido}.pdf")
                                
                                file_request = drive_service.files().get_media(fileId=parsed['cv_file_id'])
                                fh = io.BytesIO()
                                downloader = MediaIoBaseDownload(fh, file_request)
                                done = False
                                while not done:
                                    _, done = downloader.next_chunk()
                                    
                                postulante.cv_archivo.save(file_name, ContentFile(fh.getvalue()), save=True)
                            except Exception as drive_err:
                                GoogleLog.objects.create(
                                    service="Drive API",
                                    operation="Download CV Global",
                                    status="Error",
                                    message=f"No se pudo descargar el CV para {postulante.email}: {str(drive_err)}"
                                )
                        continue

                    # Parse sueldo
                    salario_min = None
                    if parsed['sueldo_pretendido_str']:
                        try:
                            nums = re.findall(r'\d+', parsed['sueldo_pretendido_str'].replace('.', '').replace(',', ''))
                            if nums:
                                salario_min = float(nums[0])
                        except:
                            pass

                    # Combine details into resumen
                    resumen_parts = []
                    if parsed['empresa_puesto']:
                        resumen_parts.append(f"Empresa/Puesto Actual: {parsed['empresa_puesto']}")
                    if parsed['situacion_laboral']:
                        resumen_parts.append(f"Situación Laboral: {parsed['situacion_laboral']}")
                    if parsed['experiencia_detalle']:
                        resumen_parts.append(f"Detalle de Experiencia: {parsed['experiencia_detalle']}")
                    if parsed['movilidad']:
                        resumen_parts.append(f"Movilidad: {parsed['movilidad']}")
                    if parsed['fecha_entrevista']:
                        resumen_parts.append(f"Fecha de Entrevista: {parsed['fecha_entrevista']}")
                        
                    resumen_profesional = "\n".join(resumen_parts)
                    titulaciones = ", ".join(parsed['estudios']) if parsed['estudios'] else ""
                    
                    # Ubicación parsing (Rosario / Santa Fe)
                    ciudad = busqueda.empresa.ciudad or 'Rosario'
                    provincia = busqueda.empresa.provincia or 'Santa Fe'
                    if parsed['lugar_residencia']:
                        partes_lugar = parsed['lugar_residencia'].split(',')
                        if len(partes_lugar) >= 2:
                            ciudad = partes_lugar[0].strip()
                            provincia = partes_lugar[1].strip()
                        else:
                            ciudad = parsed['lugar_residencia'].strip()

                    postulante = Postulante.objects.create(
                        email=parsed['email'],
                        nombre=parsed['nombre'],
                        apellido=parsed['apellido'],
                        telefono=parsed['telefono'] or "No especificado",
                        titulo_principal=f"Postulante para {busqueda.titulo_puesto}",
                        experiencia_anos=parsed['experiencia_anos'],
                        provincia=provincia,
                        ciudad=ciudad,
                        pais='Argentina',
                        estado=estado_activo,
                        resumen_profesional=resumen_profesional,
                        titulaciones=titulaciones,
                        salario_pretendido_minimo=salario_min,
                        selector=selector,
                        selector_cuit=parsed['selector_cuit_resp'] or None,
                    )
                    
                    Postulacion.objects.create(
                        postulante=postulante,
                        perfil_busqueda=busqueda,
                        estado='enviada',
                        selector=selector or busqueda.selector_asignado
                    )
                    
                    # Add Selector note if provided
                    if parsed['informe_selector']:
                        from postulantes.models import NotaPostulante
                        NotaPostulante.objects.create(
                            postulante=postulante,
                            autor=selector,
                            titulo="Informe del Selector (Google Forms)",
                            contenido=parsed['informe_selector']
                        )
                        
                    # Download CV from Google Drive if present
                    if parsed.get('cv_file_id') and not postulante.cv_archivo:
                        try:
                            from googleapiclient.discovery import build
                            from googleapiclient.http import MediaIoBaseDownload
                            import io
                            from django.core.files.base import ContentFile
                            
                            drive_service = build('drive', 'v3', credentials=creds)
                            
                            file_meta = drive_service.files().get(fileId=parsed['cv_file_id'], fields='name').execute()
                            file_name = file_meta.get('name', f"CV_{postulante.nombre}_{postulante.apellido}.pdf")
                            
                            file_request = drive_service.files().get_media(fileId=parsed['cv_file_id'])
                            fh = io.BytesIO()
                            downloader = MediaIoBaseDownload(fh, file_request)
                            done = False
                            while not done:
                                _, done = downloader.next_chunk()
                                
                            postulante.cv_archivo.save(file_name, ContentFile(fh.getvalue()), save=True)
                        except Exception as drive_err:
                            GoogleLog.objects.create(
                                service="Drive API",
                                operation="Download CV Global",
                                status="Error",
                                message=f"No se pudo descargar el CV para {postulante.email}: {str(drive_err)}"
                            )
                        
                    creados += 1
            
            GoogleLog.objects.create(
                service="Forms API Global",
                operation="Sync Responses Global",
                status="Success",
                message=f"Formulario Global Sincronizado. Nuevos: {creados}. Duplicados: {duplicados}. Sin búsqueda asignada (código incorrecto): {no_mapeados}."
            )
            messages.success(request, f'Sincronización global completada. Nuevos postulantes: {creados}. Ya registrados: {duplicados}. Códigos no encontrados: {no_mapeados}')
            
        except Exception as e:
            GoogleLog.objects.create(
                service="Forms API Global",
                operation="Sync Responses Global",
                status="Error",
                message=str(e)
            )
            messages.error(request, f'Error al sincronizar con Google Forms: {str(e)}')
            
    else:
        # MODO DEMO / SIMULADO: Ingesta simulada
        busquedas_activas = PerfilBusqueda.objects.filter(estado__nombre='Abiertas').exclude(codigo_busqueda__isnull=True).exclude(codigo_busqueda='')
        
        if not busquedas_activas.exists():
            messages.warning(request, '[Modo Demo] No hay búsquedas activas con código de búsqueda asignado. Crea una primero.')
            return redirect(redirect_url)
            
        nombres = ["Ignacio", "Valentina", "Sofía", "Martín", "Lucas", "Florencia"]
        apellidos = ["Rodríguez", "Fernández", "García", "González", "López", "Martínez"]
        dominios = ["gmail.com", "outlook.com", "yahoo.com"]
        
        creados = 0
        duplicados = 0
        
        for i in range(3):
            busqueda = random.choice(busquedas_activas)
            nom = random.choice(nombres)
            ape = random.choice(apellidos)
            email = f"{nom.lower()}.{ape.lower()}{random.randint(10,99)}@{random.choice(dominios)}"
            tel = f"+54 9 341 {random.randint(1000000, 9999999)}"
            
            # Selector para simulación
            selector = Selector.objects.filter(estado='activo').first()
            selector_cuit = selector.cuit if selector else "20-12345678-9"
            
            postulante, created = Postulante.objects.get_or_create(
                email=email,
                defaults={
                    'nombre': nom,
                    'apellido': ape,
                    'telefono': tel,
                    'titulo_principal': f"Postulante para {busqueda.titulo_puesto}",
                    'experiencia_anos': random.randint(1, 8),
                    'provincia': busqueda.empresa.provincia or 'Santa Fe',
                    'ciudad': busqueda.empresa.ciudad or 'Rosario',
                    'pais': 'Argentina',
                    'estado': estado_activo,
                    'selector': selector,
                    'selector_cuit': selector_cuit,
                }
            )
            
            postulacion_created = False
            if not Postulacion.objects.filter(postulante=postulante, perfil_busqueda=busqueda).exists():
                Postulacion.objects.create(
                    postulante=postulante,
                    perfil_busqueda=busqueda,
                    estado='enviada',
                    selector=busqueda.selector_asignado
                )
                postulacion_created = True
                
            if created or postulacion_created:
                creados += 1
            else:
                duplicados += 1
                
        GoogleLog.objects.create(
            service="Forms API Global (Demo)",
            operation="Sync Responses Global",
            status="Success",
            message=f"[MODO DEMO] Respuestas globales simuladas. Ingestados: {creados}. Duplicados: {duplicados}."
        )
        messages.success(request, f'[Modo Demo] Respuestas globales sincronizadas. Nuevos postulantes: {creados}. Ya registrados: {duplicados}.')
        
    return redirect(redirect_url)


def generar_formulario_estandar(request):
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from .models import GoogleToken, GoogleLog
    from django.contrib.auth.models import User
    
    user = request.user if request.user.is_authenticated else None
    if not user:
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        
    token_obj = GoogleToken.objects.filter(user=user).first()
    if not token_obj or token_obj.token.get('token', '').startswith('ya29.a0AfB_mockToken'):
        messages.error(request, 'Debes vincular una cuenta de Google real primero antes de generar el formulario.')
        return redirect('integraciones')
        
    try:
        # Use full scopes matching base service
        scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/contacts',
            'https://www.googleapis.com/auth/forms.responses.readonly',
            'https://www.googleapis.com/auth/forms.body.readonly'
        ]
        creds = Credentials.from_authorized_user_info(token_obj.token, scopes)
        service = build('forms', 'v1', credentials=creds)
        
        # 1. Crear el formulario vacío
        form_title = f"Portal de Postulación - {user.username.capitalize()}"
        form_body = {
            "info": {
                "title": form_title,
                "documentTitle": f"Postulantes - {user.username.capitalize()}"
            }
        }
        form = service.forms().create(body=form_body).execute()
        form_id = form.get('formId')
        form_url = form.get('responderUri')
        
        # 2. Agregar las preguntas estandarizadas
        questions = [
            {
                "title": "Código de Búsqueda",
                "required": True,
                "textQuestion": {}
            },
            {
                "title": "Código de Selector",
                "required": True,
                "textQuestion": {}
            },
            {
                "title": "Nombre y Apellido",
                "required": True,
                "textQuestion": {}
            },
            {
                "title": "Fecha de entrevista",
                "required": True,
                "dateQuestion": {
                    "includeYear": True
                }
            },
            {
                "title": "Teléfono Celular",
                "required": True,
                "textQuestion": {}
            },
            {
                "title": "Correo Electrónico",
                "required": True,
                "textQuestion": {}
            },
            {
                "title": "Lugar de Residencia",
                "required": True,
                "textQuestion": {}
            },
            {
                "title": "Posee Movilidad Propia",
                "required": True,
                "choiceQuestion": {
                    "type": "RADIO",
                    "options": [
                        {"value": "No"},
                        {"value": "Auto"},
                        {"value": "Moto"}
                    ]
                }
            },
            {
                "title": "Empresa y Puesto Actual",
                "required": True,
                "textQuestion": {}
            },
            {
                "title": "Experiencia (Años, tecnologías, herramientas usadas)",
                "required": True,
                "textQuestion": {
                    "paragraph": True
                }
            },
            {
                "title": "Estudios Alcanzados",
                "required": False,
                "choiceQuestion": {
                    "type": "RADIO",
                    "options": [
                        {"value": "Primario"},
                        {"value": "Secundario"},
                        {"value": "Terciario"},
                        {"value": "Universitario"},
                        {"value": "Posgrado"},
                        {"value": "Magister"}
                    ]
                }
            },
            {
                "title": "Titulo Obtenido",
                "required": True,
                "choiceQuestion": {
                    "type": "DROP_DOWN",
                    "options": [
                        {"value": "Abogacía / Cs. Jurídicas"},
                        {"value": "Arquitectura / Urbanismo / Diseño"},
                        {"value": "Bioquímica / Farmacia / Biotecnología"},
                        {"value": "Contador Público"},
                        {"value": "Ingeniería (Civil, Industrial, Mecánica, etc.)"},
                        {"value": "Ingeniería o Licenciatura en Sistemas / Informática / Computación"},
                        {"value": "Lic. en Administración / Gestión Empresarial"},
                        {"value": "Lic. en Comunicación Social / Periodismo / RRPP"},
                        {"value": "Lic. en Economía / Cs. Económicas"},
                        {"value": "Lic. en Marketing / Comercialización / Negocios"},
                        {"value": "Lic. en Psicología / Psicopedagogía"},
                        {"value": "Lic. en Recursos Humanos / Relaciones Laborales"},
                        {"value": "Lic. en Turismo / Hotelería / Gastronomía"},
                        {"value": "Medicina / Enfermería / Kinesiología / Salud"},
                        {"value": "Odontología / Veterinaria / Agronomía"},
                        {"value": "Profesorado Universitario / Cs. de la Educación"},
                        {"value": "Traductorado Público / Lic. en Idiomas"},
                        {"value": "Otra Licenciatura / Carrera de Grado Universitario"},
                        {"value": "Analista de Sistemas / Programación (Terciario/Pregrado)"},
                        {"value": "Tecnicatura en Administración / Contabilidad / Finanzas"},
                        {"value": "Tecnicatura en Comercio Exterior / Logística"},
                        {"value": "Tecnicatura en Higiene y Seguridad / Medio Ambiente"},
                        {"value": "Tecnicatura en Marketing / Publicidad / Diseño"},
                        {"value": "Tecnicatura en Recursos Humanos / Relaciones Laborales"},
                        {"value": "Tecnicatura en Turismo / Hotelería / Gastronomía"},
                        {"value": "Otra Tecnicatura Superior / Título Terciario"},
                        {"value": "Secundario Completo (Sin estudios superiores)"},
                        {"value": "Estudios universitarios/terciarios en curso"}
                    ]
                }
            },
            {
                "title": "Escriba el nombre del título Obtenido",
                "required": True,
                "textQuestion": {}
            },
            {
                "title": "Otros Estudios Relacionados",
                "required": False,
                "textQuestion": {
                    "paragraph": True
                }
            },
            {
                "title": "Situación laboral Actual",
                "required": True,
                "choiceQuestion": {
                    "type": "DROP_DOWN",
                    "options": [
                        {"value": "Desempleado/a (En búsqueda activa de empleo)"},
                        {"value": "Empleado/a a tiempo completo (En relación de dependencia)"},
                        {"value": "Empleado/a a tiempo parcial / Part-time (En relación de dependencia)"},
                        {"value": "Trabajador/a independiente / Freelance / Monotributista"},
                        {"value": "Profesional Autónomo / Dueño de negocio / Emprendedor"},
                        {"value": "Estudiante (En búsqueda de su primer empleo o pasantía)"},
                        {"value": "Estudiante (Trabajando actualmente)"},
                        {"value": "Pasantía / Práctica profesional actual"},
                        {"value": "No trabaja actualmente (No se encuentra en búsqueda activa)"}
                    ]
                }
            },
            {
                "title": "Sueldo Pretendido",
                "required": True,
                "textQuestion": {}
            },
            {
                "title": "Informe del Selector (Comentarios, punto de vista)",
                "required": True,
                "textQuestion": {
                    "paragraph": True
                }
            }
        ]

        requests = []
        for i, q in enumerate(questions):
            item = {
                "title": q["title"],
                "questionItem": {
                    "question": {
                        "required": q["required"]
                    }
                }
            }
            if "textQuestion" in q:
                item["questionItem"]["question"]["textQuestion"] = q["textQuestion"]
            elif "choiceQuestion" in q:
                item["questionItem"]["question"]["choiceQuestion"] = q["choiceQuestion"]
            elif "dateQuestion" in q:
                item["questionItem"]["question"]["dateQuestion"] = q["dateQuestion"]
                
            requests.append({
                "createItem": {
                    "item": item,
                    "location": {
                        "index": i
                    }
                }
            })

        update_body = {"requests": requests}
        service.forms().batchUpdate(formId=form_id, body=update_body).execute()
        
        # 3. Guardar en la base de datos
        token_obj.global_form_id = form_id
        token_obj.global_form_url = form_url
        token_obj.save()
        
        GoogleLog.objects.create(
            service="Forms API",
            operation="Create Standard Form",
            status="Success",
            message=f"Formulario estandarizado creado. ID: {form_id}"
        )
        
        messages.success(request, f'Formulario estándar autogenerado con éxito en tu Google Drive.')
        
    except Exception as e:
        GoogleLog.objects.create(
            service="Forms API",
            operation="Create Standard Form",
            status="Error",
            message=str(e)
        )
        messages.error(request, f'Error al autogenerar el formulario de Google: {str(e)}')
        
    return redirect('integraciones')


def gestionar_alertas(request):
    from empresas.models import ConfiguracionAlerta
    from selectores.models import Selector, GrupoSelector
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'update':
            alertas = ConfiguracionAlerta.objects.all()
            for alerta in alertas:
                nombre = request.POST.get(f'nombre_{alerta.id}', '').strip()
                evento_codigo = request.POST.get(f'evento_codigo_{alerta.id}', '').strip()
                if nombre:
                    alerta.nombre = nombre
                if evento_codigo:
                    alerta.evento_codigo = "".join(c for c in evento_codigo.lower() if c.isalnum() or c == '_')
                
                alerta.activar_email = request.POST.get(f'activar_email_{alerta.id}') == 'on'
                alerta.activar_whatsapp = request.POST.get(f'activar_whatsapp_{alerta.id}') == 'on'
                alerta.plantilla_email = request.POST.get(f'plantilla_email_{alerta.id}', '').strip()
                alerta.plantilla_whatsapp = request.POST.get(f'plantilla_whatsapp_{alerta.id}', '').strip()
                alerta.destinatarios = request.POST.get(f'destinatarios_{alerta.id}', 'asignados')
                
                # Obtener FKs del selector específico o grupo
                grupo_id = request.POST.get(f'destinatario_grupo_{alerta.id}')
                alerta.destinatario_grupo_id = int(grupo_id) if grupo_id else None
                
                especifico_id = request.POST.get(f'destinatario_especifico_{alerta.id}')
                alerta.destinatario_especifico_id = int(especifico_id) if especifico_id else None
                
                alerta.save()
            messages.success(request, 'Configuraciones de alerta actualizadas con éxito.')
            return redirect('gestionar_alertas')
            
        elif action == 'create':
            nombre = request.POST.get('nombre', '').strip()
            evento_codigo = request.POST.get('evento_codigo', '').strip()
            destinatarios = request.POST.get('destinatarios', 'asignados')
            
            grupo_id = request.POST.get('destinatario_grupo')
            destinatario_grupo_id = int(grupo_id) if grupo_id else None
            
            especifico_id = request.POST.get('destinatario_especifico')
            destinatario_especifico_id = int(especifico_id) if especifico_id else None
            
            if not nombre or not evento_codigo:
                messages.error(request, 'El nombre y el código de evento son requeridos.')
            else:
                evento_codigo = evento_codigo.lower().replace(' ', '_')
                try:
                    ConfiguracionAlerta.objects.create(
                        evento_codigo=evento_codigo,
                        nombre=nombre,
                        activar_email=request.POST.get('activar_email') == 'on',
                        activar_whatsapp=request.POST.get('activar_whatsapp') == 'on',
                        plantilla_email=request.POST.get('plantilla_email', 'Hola {nombre_selector}, alerta de evento.').strip(),
                        plantilla_whatsapp=request.POST.get('plantilla_whatsapp', 'Hola {nombre_selector}, alerta de evento.').strip(),
                        destinatarios=destinatarios,
                        destinatario_grupo_id=destinatario_grupo_id,
                        destinatario_especifico_id=destinatario_especifico_id
                    )
                    messages.success(request, f'Alerta "{nombre}" agregada exitosamente.')
                except Exception as e:
                    messages.error(request, f'Error al crear la alerta: {str(e)}')
            return redirect('gestionar_alertas')
            
    from empresas.models import EstadoBusqueda
    from comisiones.models import EstadoComision
    from postulantes.models import EstadoPostulante
    from postulaciones.models import Postulacion

    alertas = ConfiguracionAlerta.objects.all().order_by('nombre')
    selectores = Selector.objects.filter(estado='activo').order_by('nombre')
    grupos = GrupoSelector.objects.all().order_by('nombre')
    
    estados_busqueda = EstadoBusqueda.objects.all()
    estados_comision = EstadoComision.objects.all()
    estados_postulante = EstadoPostulante.objects.all()
    estados_postulacion = Postulacion.ESTADO_CHOICES
    
    context = {
        'alertas': alertas,
        'selectores': selectores,
        'grupos': grupos,
        'estados_busqueda': estados_busqueda,
        'estados_comision': estados_comision,
        'estados_postulante': estados_postulante,
        'estados_postulacion': estados_postulacion,
    }
    return render(request, 'alertas.html', context)



def eliminar_alerta(request, alerta_id):
    from empresas.models import ConfiguracionAlerta
    alerta = get_object_or_404(ConfiguracionAlerta, id=alerta_id)
    nombre = alerta.nombre
    alerta.delete()
    messages.success(request, f'La alerta "{nombre}" fue eliminada.')
    return redirect('gestionar_alertas')


def guardar_formulario_existente(request):
    import re
    
    if request.method == 'POST':
        form_id_or_url = request.POST.get('form_id_or_url', '').strip()
        if not form_id_or_url:
            messages.error(request, 'Debes ingresar un ID o URL de Google Form.')
            return redirect('integraciones')
            
        # Intentar extraer el ID si pasaron una URL
        # URL típica: https://docs.google.com/forms/d/1i2345abcde.../edit o /viewform
        match = re.search(r'/forms/d/([a-zA-Z0-9-_]+)', form_id_or_url)
        form_id = match.group(1) if match else form_id_or_url
        
        user = request.user if request.user.is_authenticated else None
        if not user:
            user = User.objects.filter(is_superuser=True).first() or User.objects.first()
            
        if user:
            token_obj = GoogleToken.objects.filter(user=user).first()
            if token_obj:
                token_obj.global_form_id = form_id
                token_obj.global_form_url = f"https://docs.google.com/forms/d/{form_id}/viewform"
                token_obj.save()
                messages.success(request, 'Formulario de Google existente vinculado correctamente.')
            else:
                messages.error(request, 'Primero debes vincular tu cuenta de Google.')
        else:
            messages.error(request, 'No se encontró un usuario administrador activo.')
            
    return redirect('integraciones')




