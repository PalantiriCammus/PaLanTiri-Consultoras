# integraciones_google/models.py

from django.db import models
from django.contrib.auth.models import User

class GoogleToken(models.Model):
    """
    Almacena los tokens de OAuth2 para cada usuario que conecte su cuenta de Google.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='google_token')
    token = models.JSONField()
    global_form_id = models.CharField(max_length=255, blank=True, null=True)
    global_form_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'google_tokens'

    def __str__(self):
        return f"Token for {self.user.username}"


class GoogleLog(models.Model):
    """
    Registro de operaciones realizadas con las APIs de Google.
    Útil para auditoría y debug.
    """
    service = models.CharField(max_length=50) # Calendar, Drive, etc.
    operation = models.CharField(max_length=100)
    status = models.CharField(max_length=20) # Success, Error
    message = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'google_logs'
        ordering = ['-timestamp']
