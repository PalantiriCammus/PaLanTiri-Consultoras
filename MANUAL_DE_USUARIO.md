# Manual de Usuario - Plataforma ATS & Consultora HR

Bienvenido al manual oficial de la plataforma de gestión de talento y reclutamiento. Este sistema (ATS - Applicant Tracking System) ha sido diseñado específicamente para agilizar el ciclo completo de selección: desde la captación del candidato hasta la facturación de comisiones.

---

## Índice
1. [Primeros Pasos](#1-primeros-pasos)
2. [Gestión de Empresas y Búsquedas](#2-gestión-de-empresas-y-búsquedas)
3. [El Portal Público (Marca de Selectores)](#3-el-portal-público-marca-de-selectores)
4. [La Base de Postulantes y Tablero Kanban](#4-la-base-de-postulantes-y-tablero-kanban)
5. [Automatizaciones: WhatsApp y Email](#5-automatizaciones-whatsapp-y-email)
6. [Sistema de Comisiones y Finanzas](#6-sistema-de-comisiones-y-finanzas)
7. [Integraciones (Google Workspace)](#7-integraciones-google-workspace)

---

## 1. Primeros Pasos

El sistema se compone de dos partes principales:
1. **La Aplicación Web:** Donde realizas toda la gestión visual. (Se arranca con `python manage.py runserver`).
2. **El Worker de Notificaciones:** Un robot en segundo plano que envía tus WhatsApps de forma humana. (Se arranca con `python whatsapp_worker.py`).

Para iniciar el trabajo del día, asegúrate de tener ambos procesos corriendo en dos terminales distintas.

---

## 2. Gestión de Empresas y Búsquedas

### Empresas (Tus Clientes)
En la sección **Empresas** puedes dar de alta a tus clientes corporativos.
- Define el porcentaje de comisión predeterminado que te paga esa empresa por contratación (ej: `20%`).
- Visualiza un historial rápido de las búsquedas que tienen abiertas.

### Búsquedas de Personal (Job Descriptions)
Al crear una Búsqueda desde la sección **Búsquedas**:
1. Le asignas la posición a una empresa y estableces el **Salario Estipulado**.
2. **Asignación de Selectores:** Eliges qué selectores freelance (recruiters) van a trabajar en esta búsqueda. Al asignar a un selector, el sistema automáticamente le mandará un Email y un WhatsApp avisándole que tiene trabajo nuevo.
3. Puedes generar un flyer de publicidad o exportar el documento "JD" a Word con un solo clic.

---

## 3. El Portal Público (Marca de Selectores)

Para evitar la carga manual de datos, cada Selector en tu sistema cuenta con su propio "Portal Público de Candidatos".

- **La URL Única:** Cada selector tiene un enlace (ej: `tu-web.com/s/nombre-apellido`).
- **Uso:** El selector puede pegar este enlace en LinkedIn, Instagram o compartirlo por chat.
- **Funcionamiento:** Cuando un candidato entra a ese enlace, solo verá las Búsquedas que ese Selector tiene asignadas. 
- **Postulación Mágica:** El candidato completa sus datos (Nombre, Mail, LinkedIn) y sube su CV en PDF. Inmediatamente, la aplicación extrae la información del CV y el candidato aparece en la vista principal etiquetado como "Nuevo", asignado a ese Selector (garantizando sus comisiones futuras).

---

## 4. La Base de Postulantes y Tablero Kanban

El menú de **Postulantes** es el corazón operativo. Aquí ocurre la magia del seguimiento.

### Vista Listado vs Kanban
- Puedes alternar entre la vista de **Tabla** (ideal para ver datos de contacto y CV) y el **Tablero Kanban** (ideal para mover candidatos rápidamente).
- El Tablero Kanban funciona como *Trello*. Solo debes arrastrar la tarjeta del candidato a la columna del siguiente estado (ej: de "Nuevo" a "Entrevista").

### Lector Automático de CV
Cuando tú, o el portal público, suben un archivo PDF de un candidato, el sistema lo lee, extrae el texto completo de su experiencia y genera un resumen profesional para que no tengas que abrir el PDF para saber de qué trata su perfil.

### Base de Talentos (Pool)
Si un candidato no queda en la búsqueda actual, pero te gustó su perfil, pulsa el botón **"A Base"**. Esto lo resguarda en tu "Base de Talentos" permanente para usarlo como filtro en búsquedas futuras, evitando perder buenos contactos.

---

## 5. Automatizaciones: WhatsApp y Email

¡Olvídate de notificar a los candidatos manualmente!

1. **Configurar Plantillas:** Ve al botón **"Gestionar Estados"** en el tablero de postulantes. Allí verás cada estado (Nuevo, Entrevista, Rechazado, etc.).
2. Puedes redactar una plantilla de Email y una plantilla de WhatsApp. Utiliza variables como `{{nombre}}` o `{{empresa}}`.
3. **El Disparador:** Cada vez que *arrastres* un candidato en el tablero Kanban hacia ese estado, la plataforma le enviará automáticamente un email desde el correo corporativo y meterá a la cola el mensaje de WhatsApp.

### El Motor de WhatsApp (Código QR)
Para enviar WhatsApp sin pagar APIs costosas, usamos tecnología *Selenium*.
- Siempre ten corriendo una terminal con: `python whatsapp_worker.py`
- Al iniciar, se abrirá un Google Chrome. Escanea el Código QR con tu teléfono celular.
- Minimiza la ventana. El "robot" detectará cada vez que muevas a un candidato en tu tablero y operará el Chrome automáticamente para tipear y enviar el mensaje. Hace pausas de varios segundos para evitar ser catalogado como spam por Meta.

---

## 6. Sistema de Comisiones y Finanzas

La plataforma protege las finanzas calculando los honorarios atómicamente.

- **¿Cuándo se crea una comisión?** Única y exclusivamente cuando arrastras a un postulante al estado **"Contratado"**.
- En ese milisegundo, la plataforma calcula el salario x porcentaje de la Empresa x porcentaje del Selector.
- **¿Qué pasa si cambias el contrato con el selector mañana?** Las comisiones pasadas no se modifican, porque se calcularon con la "foto" del porcentaje vigente al momento de la contratación.
- **Panel de control:** Entrando a "Comisiones" podrás cambiar el estado de las facturas (Pendiente de Cobro, Cobrado, Pagado al Selector) y rastrear los vencimientos de la garantía (90 días de prueba).

---

## 7. Integraciones (Google Workspace)

*(Para uso avanzado)*
Si activas la conexión con Google en la solapa "Integraciones":
- **Calendar:** Las entrevistas programadas enviarán eventos directos.
- **Forms:** Si usas un formulario global general de Google, podrás presionar el botón "Sincronizar" en la pantalla de Postulantes, y el sistema importará todas las respuestas nuevas convirtiéndolas en candidatos mágicamente.
