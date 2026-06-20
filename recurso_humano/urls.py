# recurso_humano/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import dashboard
from empresas.views import lista_empresas, editar_empresa, lista_busquedas, exportar_jd_word, guardar_flyer, eliminar_flyer, editar_busqueda, cambiar_prioridad, eliminar_busqueda, eliminar_empresa, cambiar_estado, gestionar_estados_busqueda, eliminar_estado_busqueda
from selectores.views import lista_selectores, editar_selector, crear_grupo_selector, eliminar_selector, portal_publico
from postulantes.views import lista_postulantes, editar_postulante, toggle_pool_status, cambiar_estado_postulante, base_talentos, eliminar_postulante, gestionar_estados, eliminar_estado
from comisiones.views import lista_comisiones, editar_comision, gestionar_estados_comision, eliminar_estado_comision
from integraciones_google.views import (
    lista_integraciones, conectar_google, desconectar_google,
    sincronizar_respuestas_form, sincronizar_respuestas_form_global,
    google_callback, generar_formulario_estandar, gestionar_alertas,
    eliminar_alerta, guardar_formulario_existente
)
from postulaciones.views import gestionar_informe_entrevista

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', dashboard, name='dashboard'),
    path('empresas/', lista_empresas, name='empresas'),
    path('empresas/editar/<int:empresa_id>/', editar_empresa, name='editar_empresa'),
    path('empresas/eliminar/<int:empresa_id>/', eliminar_empresa, name='eliminar_empresa'),
    path('busquedas/', lista_busquedas, name='busquedas'),
    path('selectores/', lista_selectores, name='selectores'),
    path('selectores/editar/<int:selector_id>/', editar_selector, name='editar_selector'),
    path('selectores/eliminar/<int:selector_id>/', eliminar_selector, name='eliminar_selector'),
    path('selectores/grupos/crear/', crear_grupo_selector, name='crear_grupo_selector'),
    path('s/<slug:alias>/', portal_publico, name='portal_publico'),
    path('postulantes/', lista_postulantes, name='postulantes'),
    path('postulantes/editar/<int:postulante_id>/', editar_postulante, name='editar_postulante'),
    path('postulantes/toggle-pool/<int:postulante_id>/', toggle_pool_status, name='toggle_pool_status'),
    path('postulantes/cambiar-estado/<int:postulante_id>/', cambiar_estado_postulante, name='cambiar_estado_postulante'),
    path('postulantes/eliminar/<int:postulante_id>/', eliminar_postulante, name='eliminar_postulante'),
    path('base-talentos/', base_talentos, name='base_talentos'),
    path('estados/', gestionar_estados, name='gestionar_estados'),
    path('estados/eliminar/<int:estado_id>/', eliminar_estado, name='eliminar_estado'),
    path('estados-busqueda/', gestionar_estados_busqueda, name='gestionar_estados_busqueda'),
    path('estados-busqueda/eliminar/<int:estado_id>/', eliminar_estado_busqueda, name='eliminar_estado_busqueda'),
    path('comisiones/', lista_comisiones, name='comisiones'),
    path('comisiones/editar/<int:comision_id>/', editar_comision, name='editar_comision'),
    path('comisiones/estados/', gestionar_estados_comision, name='gestionar_estados_comision'),
    path('comisiones/estados/eliminar/<int:estado_id>/', eliminar_estado_comision, name='eliminar_estado_comision'),
    path('integraciones/', lista_integraciones, name='integraciones'),
    path('integraciones/conectar/', conectar_google, name='conectar_google'),
    path('integraciones/desconectar/', desconectar_google, name='desconectar_google'),
    path('integraciones/alertas/', gestionar_alertas, name='gestionar_alertas'),
    path('integraciones/alertas/eliminar/<int:alerta_id>/', eliminar_alerta, name='eliminar_alerta'),
    path('integraciones/google/guardar-form-existente/', guardar_formulario_existente, name='guardar_formulario_existente'),


    path('auth/google/callback/', google_callback, name='google_callback'),
    path('integraciones/google/sync-form/<int:busqueda_id>/', sincronizar_respuestas_form, name='sincronizar_respuestas_form'),
    path('integraciones/google/sync-form-global/', sincronizar_respuestas_form_global, name='sincronizar_respuestas_form_global'),
    path('integraciones/google/generar-form-estandar/', generar_formulario_estandar, name='generar_formulario_estandar'),
    path('postulaciones/informe/<int:postulacion_id>/', gestionar_informe_entrevista, name='gestionar_informe_entrevista'),

    path('busquedas/exportar-word/<int:busqueda_id>/', exportar_jd_word, name='exportar_jd_word'),
    path('busquedas/guardar-flyer/<int:busqueda_id>/', guardar_flyer, name='guardar_flyer'),
    path('busquedas/eliminar-flyer/<int:busqueda_id>/', eliminar_flyer, name='eliminar_flyer'),
    path('busquedas/editar/<int:busqueda_id>/', editar_busqueda, name='editar_busqueda'),
    path('busquedas/cambiar-prioridad/<int:busqueda_id>/', cambiar_prioridad, name='cambiar_prioridad'),
    path('busquedas/cambiar-estado/<int:busqueda_id>/', cambiar_estado, name='cambiar_estado'),
    path('busquedas/eliminar/<int:busqueda_id>/', eliminar_busqueda, name='eliminar_busqueda'),

    # API endpoints
    path('api/empresas/', include('empresas.urls')),
    path('api/selectores/', include('selectores.urls')),
    path('api/postulantes/', include('postulantes.urls')),
    path('api/postulaciones/', include('postulaciones.urls')),
    path('api/comisiones/', include('comisiones.urls')),
    path('api/google/', include('integraciones_google.urls')),

    # Auth
    path('api-auth/', include('rest_framework.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

