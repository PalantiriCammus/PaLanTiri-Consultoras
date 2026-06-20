# Documentación Técnica y Arquitectónica - Plataforma ATS & Consultora HR

Esta documentación proporciona una visión integral y minuciosa de la arquitectura, modelos de datos, flujos de trabajo y el estado general de la plataforma de gestión de talento y reclutamiento. Este archivo está diseñado para que tanto desarrolladores humanos como asistentes de Inteligencia Artificial (IA) puedan entender el proyecto rápidamente y continuar su desarrollo.

---

## 1. Visión General del Sistema

El sistema es un **ATS (Applicant Tracking System)** avanzado con capacidades financieras integradas, diseñado específicamente para agilizar el ciclo de selección de una consultora de recursos humanos. 

### Diferenciadores Principales:
- **Gestión de Selectores Freelance:** Módulo completo para administrar recruiters independientes, asignándoles búsquedas y calculando sus ganancias (comisiones) de forma automatizada.
- **Automatización de Comunicación:** Integración de plantillas dinámicas que envían correos electrónicos y mensajes de WhatsApp (mediante Selenium) de manera invisible y automática al cambiar el estado de un candidato.
- **Control Financiero:** Creación atómica de comisiones y seguimiento estricto de **Garantías de Reemplazo** (ej. 90 días).

---

## 2. Arquitectura Tecnológica

El proyecto se encuentra en una etapa de transición o desarrollo paralelo, contando con dos ecosistemas principales:

### Backend (Core Lógico) - Django
- **Framework:** Django 4.2.x y Django REST Framework (DRF).
- **Rol:** Actúa como el motor de base de datos, panel de administración nativo (Admin), servidor de API REST, y ejecutor de tareas de automatización.
- **Base de Datos Actual:** SQLite (`db.sqlite3`). *Diseñado para ser migrado a PostgreSQL en producción.*

### Frontend Nuevo - Next.js
- **Ubicación:** Carpeta `/webapp`
- **Framework:** Next.js (App Router) con TypeScript y TailwindCSS.
- **Rol:** Se está desarrollando una nueva interfaz de usuario moderna (posiblemente un portal para selectores o el rediseño total del dashboard administrativo). 

### Worker Asíncrono - Selenium
- **Archivo:** `whatsapp_worker.py`
- **Rol:** Proceso en segundo plano que abre una instancia de Google Chrome controlada por Selenium. Tras escanear un código QR de WhatsApp Web, el worker drena la tabla `WhatsAppMessage` de la base de datos enviando los mensajes programados. Esto evita los costos de la API oficial de Meta.

---

## 3. Modelo de Dominio (Aplicaciones Django)

El proyecto backend se divide en varias "apps" que representan el dominio del negocio:

### 3.1. `empresas`
Maneja la relación con el cliente final y sus requerimientos.
- **`Empresa`**: Entidad cliente. Define el porcentaje de comisión predeterminado que paga la empresa por éxito.
- **`PerfilBusqueda` (Job Description)**: El requerimiento específico (ej. "Desarrollador Python Senior"). Define salarios, habilidades requeridas, y se le asignan selectores.
- **`ConfiguracionAlerta`**: Define qué eventos disparan notificaciones a los selectores o a la empresa.

### 3.2. `selectores`
Maneja a los reclutadores freelance.
- **`Selector`**: Perfil del recruiter. Contiene sus datos fiscales (CUIT), cuenta bancaria, y porcentajes de ganancia (Fee de cierre y Fee de sourcing).
- **`CuentaCorriente` / `Movimiento`**: Sistema de contabilidad interna para llevar un saldo de lo que se le debe pagar a cada selector por sus contrataciones exitosas.

### 3.3. `postulantes`
La base de datos de talento.
- **`Postulante`**: Perfil del candidato. Incluye datos personales, habilidades (`Habilidad`), nivel de estudio y CV. El sistema extrae el texto del PDF subido (`cv_texto_extraido`) para permitir búsquedas.
- **`DisponibilidadPostulante`**: Registra los bloques de tiempo libres para agendar entrevistas.

### 3.4. `postulaciones`
El corazón del seguimiento (Kanban).
- **`Postulacion`**: Tabla intermedia entre un `Postulante` y un `PerfilBusqueda`. Registra el estado actual (Enviada, Entrevista, Oferta, Contratado, etc.) y a qué selector corresponde.
- **`EntrevistaAgendada`**: Integración con Google Calendar y Meet para fijar citas.
- **`SeguimientoGarantia`**: Cuando un candidato es "Contratado", se activa una cuenta regresiva (ej. 90 días). Si renuncia o lo despiden antes, el estado pasa a "Incumplida" requiriendo un reemplazo sin comisión.

### 3.5. `comisiones`
El motor financiero.
- **`Comision`**: Generada automáticamente en el milisegundo que una postulación cambia a "Contratado". Lee la foto financiera de ese instante (Sueldo del candidato x Porcentaje de la Empresa x Porcentaje del Selector) para hacer un cálculo atómico e inmutable. 

### 3.6. `integraciones_google`
- OAuth 2.0 para interactuar con Google Forms (ingesta de candidatos), Google Calendar (entrevistas) y Google Docs (exportación de Job Descriptions).

---

## 4. Flujos de Trabajo Clave (Workflows)

### 4.1. Flujo de Ingesta de Candidatos (Portal de Selector)
1. El **Selector** comparte su enlace público (ej. `midominio.com/s/juan-perez`).
2. El **Candidato** ve únicamente las búsquedas asignadas a Juan Pérez. Completa sus datos y sube su CV en PDF.
3. El sistema procesa el PDF, crea el `Postulante` y genera una `Postulacion` en la columna "Nuevo" del tablero.
4. El sistema marca automáticamente a "Juan Pérez" como el creador/dueño, garantizándole su comisión si hay éxito.

### 4.2. Flujo de Kanban y Automatización
1. El administrador de la consultora entra al tablero Kanban de `Postulaciones`.
2. Arrastra la tarjeta de un candidato de "Nuevo" a "Entrevista".
3. Django detecta el cambio de estado (`fecha_cambio_estado`).
4. Si el estado "Entrevista" tiene configurada una plantilla, el sistema genera un correo electrónico y encola un registro en la tabla `WhatsAppMessage`.
5. El proceso paralelo `whatsapp_worker.py` envía el mensaje de WhatsApp.

### 4.3. Flujo de Contratación y Garantías
1. Un candidato avanza hasta la columna "Contratado".
2. **Impacto 1 (Comisiones):** Se crea el registro `Comision`.
3. **Impacto 2 (Garantía):** Se crea un registro en `SeguimientoGarantia` con una cuenta regresiva.
4. Si el candidato renuncia al día 40, se marca la garantía como "Incumplida". Se crea automáticamente una nueva búsqueda de reemplazo, donde la comisión configurada es cero ($0).

---

## 5. Próximos Pasos para el Desarrollo

Para Inteligencias Artificiales o desarrolladores que retomen este proyecto, los puntos de enfoque principales son:

1. **Unificación Frontend/Backend:** Continuar el desarrollo en la carpeta `/webapp` (Next.js) consumiendo los endpoints de Django REST Framework ya expuestos. Asegurar la autenticación (JWT o sesiones).
2. **Inteligencia Artificial:** Implementar un parseo de CVs más profundo. En lugar de extraer solo texto, usar un LLM (ej. Gemini o Claude) para mapear automáticamente habilidades, experiencia en años, y hacer *matching* contra el `PerfilBusqueda`.
3. **Estabilidad del Worker:** El worker de Selenium (`whatsapp_worker.py`) es efectivo pero frágil a actualizaciones del DOM de WhatsApp Web. Considerar migrar a una API (oficial o no oficial como Baileys) a futuro si la escala lo requiere.
4. **Despliegue (Deploy):** Preparar la transición de SQLite a PostgreSQL y empaquetar el backend en contenedores (Docker) junto con Celery/Redis para reemplazar procesos en segundo plano bloqueantes.

---
*Documento generado para contexto persistente. Acompañado del archivo `proyecto_knowledge_base.json` para ingesta estructural de IAs.*
