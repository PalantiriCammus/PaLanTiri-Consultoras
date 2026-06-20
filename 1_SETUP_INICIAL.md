# 🚀 Setup Inicial - Webapp de Gestión de Búsquedas de Personal

## 1. Crear el Entorno Virtual

```bash
# En Windows
python -m venv venv
venv\Scripts\activate

# En Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

## 2. Instalar Dependencias

```bash
pip install --upgrade pip

# Django y extensiones
pip install django==4.2.0
pip install djangorestframework==3.14.0
pip install django-cors-headers==4.0.0
pip install python-decouple==3.8

# Base de datos
pip install psycopg2-binary==2.9.6  # Para PostgreSQL (recomendado en producción)

# Google Workspace
pip install google-auth-oauthlib==1.0.0
pip install google-auth-httplib2==0.2.0
pip install google-api-python-client==2.94.0

# Utilidades
pip install python-dateutil==2.8.2
pip install celery==5.3.1  # Para tareas asincrónicas (opcional inicialmente)
pip install redis==5.0.0   # Para cache (opcional inicialmente)

# Desarrollo
pip install django-extensions==3.2.3

# Crear requirements.txt
pip freeze > requirements.txt
```

## 3. Crear Proyecto Django

```bash
django-admin startproject recurso_humano .
cd recurso_humano
python manage.py startapp empresas
python manage.py startapp selectores
python manage.py startapp postulantes
python manage.py startapp postulaciones
python manage.py startapp comisiones
python manage.py startapp integraciones_google
```

## 4. Estructura de Carpetas Final

```
recurso_humano/
├── venv/                          # Entorno virtual
├── manage.py                      # Script de Django
├── requirements.txt               # Dependencias
├── .env                           # Variables de entorno (crear)
├── .gitignore                     # Ignorar archivos (crear)
│
├── recurso_humano/               # Configuración del proyecto
│   ├── __init__.py
│   ├── settings.py               # Configuración (MODIFICAR)
│   ├── urls.py                   # URLs principales
│   ├── asgi.py
│   └── wsgi.py
│
├── empresas/                      # App: Gestión de empresas
│   ├── migrations/
│   ├── admin.py
│   ├── apps.py
│   ├── models.py                 # Modelos (CREAR)
│   ├── views.py                  # Vistas/APIs (CREAR)
│   ├── serializers.py            # Serializadores (CREAR)
│   ├── urls.py                   # URLs (CREAR)
│   └── tests.py
│
├── selectores/                    # App: Gestión de selectores
│   ├── migrations/
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   └── tests.py
│
├── postulantes/                   # App: Base de datos de postulantes
│   ├── migrations/
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   └── tests.py
│
├── postulaciones/                 # App: Seguimiento de postulaciones
│   ├── migrations/
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   └── tests.py
│
├── comisiones/                    # App: Sistema de comisiones
│   ├── migrations/
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   └── tests.py
│
└── integraciones_google/          # App: Integración con Google Workspace
    ├── migrations/
    ├── admin.py
    ├── apps.py
    ├── models.py
    ├── services.py               # Servicios de Google (CREAR)
    ├── views.py
    ├── urls.py
    └── tests.py
```

## 5. Crear archivos .env y .gitignore

**.env**
```
DEBUG=True
SECRET_KEY=tu-clave-secreta-aqui-cambiar-en-produccion
DATABASE_URL=sqlite:///db.sqlite3
# Para producción: postgresql://usuario:contraseña@localhost:5432/recurso_humano

# Google OAuth
GOOGLE_CLIENT_ID=tu-cliente-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-cliente-secreto
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-app-password
```

**.gitignore**
```
# Entorno virtual
venv/
env/
ENV/

# Archivos Python
__pycache__/
*.py[cod]
*$py.class
*.so

# Django
*.log
local_settings.py
db.sqlite3
db.sqlite3-journal

# Variables de entorno
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Sistema
.DS_Store
Thumbs.db

# Archivos de compilación
*.egg-info/
dist/
build/

# Node (si usas frontend)
node_modules/
npm-debug.log
yarn-error.log
```

## 6. Primeros comandos

```bash
# Crear migraciones iniciales
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario (admin)
python manage.py createsuperuser

# Ejecutar servidor
python manage.py runserver
```

## 7. Acceder a Admin Panel

```
http://localhost:8000/admin/
Usuario: (el que creaste en createsuperuser)
Contraseña: (la que ingresaste)
```

---

**Próximos pasos:** Una vez hayas hecho esto, crearé los modelos de base de datos.
