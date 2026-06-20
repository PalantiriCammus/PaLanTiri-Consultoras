from django import forms
from .models import Postulante

class PostulanteForm(forms.ModelForm):
    class Meta:
        model = Postulante
        fields = '__all__'
        exclude = ['google_contact_id', 'contactado_reciente', 'fecha_ultimo_contacto', 'fecha_cambio_estado']

    def save(self, commit=True):
        postulante = super().save(commit=False)
        
        # Extraer texto del CV si hay archivo y cambió o es nuevo
        if 'cv_archivo' in self.changed_data and postulante.cv_archivo:
            from .services import extraer_texto_cv
            texto = extraer_texto_cv(postulante.cv_archivo)
            if texto:
                postulante.cv_texto_extraido = texto
                
        if commit:
            postulante.save()
            self.save_m2m()
        return postulante
