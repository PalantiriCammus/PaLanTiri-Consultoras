# 📦 GUÍA COMPLETA: Deploy a Vercel

## PUNTO 7: DEPLOY A VERCEL

---

## PASO 1: Configurar Git localmente

Abrí PowerShell y ejecutá esto **línea por línea**:

```powershell
git config --global user.email "josed@midominio.com"
```

```powershell
git config --global user.name "Josed"
```

> Nota: Cambiá el email si quieres. Ese email va a estar vinculado a tus commits.

---

## PASO 2: Inicializar el repositorio Git

Desde PowerShell, asegurate de estar en la carpeta raíz del proyecto:

```powershell
cd "C:\Users\josed\OneDrive\Desktop\Workspace\aplicacion consultora"
```

Ejecutá:

```powershell
git init
```

Esperá a que termine (debería decir algo como `Initialized empty Git repository...`).

---

## PASO 3: Agregar archivos a Git

Ejecutá:

```powershell
git add webapp/
```

Verificá que se agregó bien:

```powershell
git status
```

Deberías ver un listado con los archivos de `webapp/` en verde (mostrado como "Changes to be committed").

---

## PASO 4: Crear el primer commit

Ejecutá:

```powershell
git commit -m "Primer commit: ATS Consultora con Next.js y Supabase"
```

---

## PASO 5: Cambiar el nombre de la rama a `main`

Ejecutá:

```powershell
git branch -M main
```

---

## PASO 6: Crear repositorio en GitHub

1. Abrí [github.com/new](https://github.com/new) en el navegador
2. Completá el formulario así:
   - **Repository name:** `ats-consultora`
   - **Description:** `ATS Consultora - Plataforma de gestión de talento con Next.js y Supabase`
   - **Public o Private:** elige **Public** por ahora
   - **Initialize this repository with:** dejá todo sin marcar
3. Click en el botón verde **Create repository**

---

## PASO 7: Conectar tu repositorio local con GitHub

GitHub te va a mostrar una pantalla con instrucciones. En PowerShell, ejecutá esto **exactamente como aparece en la pantalla de GitHub**:

```powershell
git remote add origin https://github.com/TU_USUARIO/ats-consultora.git
```

> ⚠️ Reemplazá `TU_USUARIO` por tu nombre de usuario real de GitHub.

Verificá que se conectó bien:

```powershell
git remote -v
```

Deberías ver dos líneas con `https://github.com/TU_USUARIO/ats-consultora.git`.

---

## PASO 8: Subir el código a GitHub

Ejecutá:

```powershell
git push -u origin main
```

**Si pide credenciales:**
- Opción 1: Entrá tu usuario y contraseña de GitHub
- Opción 2: Usa un **Personal Access Token** (más seguro) que generas en GitHub Settings

Esperá a que termine. Cuando veas un mensaje como `✓ [new branch] main -> main`, ¡está subido! 🎉

Recargá la página de GitHub en el navegador y deberías ver los archivos de `webapp/` ahí.

---

## PASO 9: Conectar Vercel con tu repositorio de GitHub

1. Abrí [vercel.com](https://vercel.com) en el navegador
2. Si no tenés cuenta, creá una. **Recomendación:** usa **Sign up with GitHub** (así conecta directo)
3. Verificá que estés logueado
4. Click en el botón **Add New** (arriba a la derecha)
5. Elegí **Project**

Vercel te va a mostrar una lista de tus repositorios de GitHub.

6. Buscá **ats-consultora** en la lista
7. Click en **Import**

---

## PASO 10: Configurar el Directorio Raíz y Variables en Vercel

Vercel te va a mostrar la pantalla **Configure Project**.

### ⚠️ MUY IMPORTANTE: Configurar el Root Directory
Como el código de Next.js está dentro de la carpeta `webapp` y no en la raíz del repositorio, debes decirle a Vercel dónde buscarlo:
1. En la configuración del proyecto, buscá la opción **Root Directory**.
2. Hacé click en **Edit**.
3. Seleccioná o escribí `webapp` y dale a **Save** o continuar.

---

### Configurar Variables de Entorno
En la sección **Environment Variables**, necesitás agregar 3 variables.

#### Variable 1: `NEXT_PUBLIC_SUPABASE_URL`

1. Click en **Add New** (o **Add Environment Variable**)
2. En el campo **Name**, escribí: `NEXT_PUBLIC_SUPABASE_URL`
3. En el campo **Value**, pegá: `https://lpynbcssjtreddyhekfe.supabase.co`
4. Click en **Add**

### Variable 2: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

1. Click en **Add New** de nuevo
2. En el campo **Name**, escribí: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. En el campo **Value**, pegá: `[TU_ANON_KEY_AQUI]`
4. Click en **Add**

### Variable 3: `SUPABASE_SERVICE_ROLE_KEY`

1. Click en **Add New** de nuevo
2. En el campo **Name**, escribí: `SUPABASE_SERVICE_ROLE_KEY`
3. En el campo **Value**, pegá: `[TU_SERVICE_ROLE_KEY_AQUI]`
4. Click en **Add**

---

## PASO 11: Hacer el deploy

1. Bajá hasta el final de la página
2. Click en el botón **Deploy**

Vercel va a empezar a compilar tu app. Vas a ver:
- ⏳ **Building...** (2-3 minutos)
- ✅ **Deployed!** (cuando termine)

---

## PASO 12: Probar que funciona

1. Cuando veas **Deployed**, hacé click en el botón **Visit**
2. Se va a abrir tu sitio en la nube. La URL será algo como:
   ```
   https://ats-consultora.vercel.app
   ```
3. Deberías ver la **pantalla de login** (fondo violeta)
4. Ingresá con:
   - Email: el de tu super admin
   - Contraseña: la que creaste

Si ves el **panel de administración** con las tarjetas del dashboard → ¡Funcionó! 🎉

---

## PRÓXIMOS DEPLOYS (automáticos)

De ahora en adelante, cada vez que hagas cambios en el código:

1. Hacés los cambios en `webapp/`
2. Testeas en local (`npm run dev`)
3. Commitás y pusheas a GitHub:
   ```powershell
   git add webapp/
   git commit -m "Mi descripción del cambio"
   git push origin main
   ```
4. **Vercel redeploya automáticamente** (~1-2 minutos) sin que tengas que hacer nada más

---

## ¿Algo no funcionó?

Contame exactamente en qué paso y qué error ves, y lo resolvemos.
