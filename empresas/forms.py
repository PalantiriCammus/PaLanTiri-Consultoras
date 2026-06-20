from django import forms
from .models import Empresa, PerfilBusqueda

class EmpresaForm(forms.ModelForm):
    class Meta:
        model = Empresa
        fields = '__all__'
        exclude = ['codigo', 'google_contact_id', 'google_calendar_id', 'fecha_ultima_busqueda']

class PerfilBusquedaForm(forms.ModelForm):
    class Meta:
        model = PerfilBusqueda
        fields = '__all__'
        exclude = ['codigo_busqueda', 'fecha_cierre']
