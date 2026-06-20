# integraciones_google/services.py

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from .models import GoogleToken, GoogleLog

class GoogleBaseService:
    """Clase base para servicios de Google"""
    
    SCOPES = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/contacts',
        'https://www.googleapis.com/auth/forms.responses.readonly',
        'https://www.googleapis.com/auth/forms.body.readonly',
        'https://www.googleapis.com/auth/gmail.send'
    ]
    
    def __init__(self, user):
        self.user = user
        self.creds = self._get_credentials()
        
    def _get_credentials(self):
        """Obtiene o refresca credenciales del usuario"""
        token_obj = GoogleToken.objects.filter(user=self.user).first()
        if not token_obj:
            return None
            
        creds = Credentials.from_authorized_user_info(token_obj.token, self.SCOPES)
        
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            token_obj.token = creds.to_json()
            token_obj.save()
            
        return creds

    def log_operation(self, service_name, operation, status, message=""):
        GoogleLog.objects.create(
            service=service_name,
            operation=operation,
            status=status,
            message=message
        )


class GoogleCalendarService(GoogleBaseService):
    """Integración con Google Calendar y Meet"""
    
    def __init__(self, user):
        super().__init__(user)
        self.service = build('calendar', 'v3', credentials=self.creds)

    def crear_entrevista(self, summary, start_time, end_time, attendees, use_meet=True):
        """Crea un evento en el calendario con link de Meet"""
        event = {
            'summary': summary,
            'start': {'dateTime': start_time.isoformat(), 'timeZone': 'America/Argentina/Buenos_Aires'},
            'end': {'dateTime': end_time.isoformat(), 'timeZone': 'America/Argentina/Buenos_Aires'},
            'attendees': [{'email': email} for email in attendees],
        }
        
        if use_meet:
            event['conferenceData'] = {
                'createRequest': {
                    'requestId': f"meet-{start_time.timestamp()}",
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            }

        try:
            event = self.service.events().insert(
                calendarId='primary', 
                body=event,
                conferenceDataVersion=1
            ).execute()
            
            self.log_operation('Calendar', 'Insert Event', 'Success', f"Event ID: {event.get('id')}")
            return event
        except Exception as e:
            self.log_operation('Calendar', 'Insert Event', 'Error', str(e))
            return None


class GoogleDriveService(GoogleBaseService):
    """Integración con Google Drive para CVs"""
    
    def __init__(self, user):
        super().__init__(user)
        self.service = build('drive', 'v3', credentials=self.creds)

    def subir_cv(self, file_name, file_content, folder_id=None):
        """Sube un archivo a Google Drive"""
        file_metadata = {'name': file_name}
        if folder_id:
            file_metadata['parents'] = [folder_id]
            
        from googleapiclient.http import MediaIoBaseUpload
        import io
        
        media = MediaIoBaseUpload(io.BytesIO(file_content), mimetype='application/pdf')
        
        try:
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, webViewLink'
            ).execute()
            
            self.log_operation('Drive', 'Upload File', 'Success', f"File ID: {file.get('id')}")
            return file
        except Exception as e:
            self.log_operation('Drive', 'Upload File', 'Error', str(e))
            return None


class GoogleGmailService(GoogleBaseService):
    """Integración con Gmail para envío de correos automatizados"""
    
    def __init__(self, user):
        super().__init__(user)
        if self.creds:
            self.service = build('gmail', 'v1', credentials=self.creds)
        else:
            self.service = None

    def enviar_correo(self, to_email, subject, body_text):
        """Envía un correo electrónico usando la API de Gmail"""
        if not self.service:
            print("No credentials or service initialized for Gmail.")
            return False
            
        import base64
        from email.mime.text import MIMEText
        
        message = MIMEText(body_text)
        message['to'] = to_email
        message['subject'] = subject
        
        # En Gmail, el cuerpo crudo debe estar en base64 url-safe
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        try:
            sent_msg = self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            self.log_operation('Gmail', 'Send Email', 'Success', f"Enviado a {to_email}. Msg ID: {sent_msg.get('id')}")
            return True
        except Exception as e:
            self.log_operation('Gmail', 'Send Email', 'Error', f"Error enviando a {to_email}: {str(e)}")
            print(f"Error en Gmail API: {e}")
            return False

