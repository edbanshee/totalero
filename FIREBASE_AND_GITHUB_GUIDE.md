# Guía de Conexión: Firebase Spark Gratuito (`oceiros-totalero`) + GitHub Pages (`oceiros.com/totalero`)

¡Todo el código del proyecto ya ha sido actualizado con las credenciales de tu proyecto **`oceiros-totalero`** y optimizado para desplegarse automáticamente en GitHub Pages!

A continuación tienes la lista exacta de lo que ya está listo en el código y los **únicos 3 pasos rápidos** que debes hacer en la consola de Firebase y GitHub.

---

## ✅ Lo que ya quedó listo y configurado en el código:

1. **Credenciales de Firebase migradas**:
   - `firebase-applet-config.json` y `src/utils/firebase.ts` ahora apuntan directamente a tu nuevo proyecto Spark:
     - Project ID: `oceiros-totalero`
     - Auth Domain: `totalero.oceiros.com`
     - Storage Bucket: `oceiros-totalero.firebasestorage.app`
     - App ID: `1:1002830356973:web:93b0d6beab100c4890c7e4`
     - Database: `(default)` (El estándar del plan gratuito Spark)
2. **Compatibilidad total con rutas relativas (`base: './'`)**:
   - Permite que la app funcione tanto en la raíz de un dominio como en un subdirectorio como `oceiros.com/totalero` o `usuario.github.io/repositorio/` sin que se rompan scripts ni estilos.
3. **Soporte GitHub Pages SPA & Jekyll bypass**:
   - Se crearon los archivos `public/.nojekyll` y `public/404.html` para evitar que GitHub Pages bloquee archivos y para resolver refrescos de página en subrutas.
4. **GitHub Actions automatizado (`.github/workflows/deploy.yml`)**:
   - Se generó el `package-lock.json` y se ajustó el workflow con `--legacy-peer-deps` para que la compilación y despliegue en GitHub Pages ocurra en automático en cada `git push` a `main` o `master`.
5. **Doble persistencia (Local y Nube)**:
   - **Modo Local**: Los datos se guardan en el `localStorage` del navegador y pueden exportarse/importarse como archivo `.json`.
   - **Modo Nube**: Inicia sesión con Google y sincroniza automáticamente con tu base de datos Firestore de Firebase.

---

## 📋 Lo que debes hacer en Firebase Console (Solo 2 pasos):

Entra a tu consola de Firebase: [https://console.firebase.google.com/](https://console.firebase.google.com/) y entra al proyecto **oceiros-totalero**:

### Paso 1: Habilitar Google Sign-In y Autorizar tus Dominios
1. En el menú izquierdo ve a **Compilación (Build)** > **Authentication**.
2. Haz clic en **Comenzar (Get Started)** si aún no lo has hecho.
3. En la pestaña **Sign-in method**, haz clic en **Google**, activa el switch **Habilitar**, selecciona tu correo de soporte y presiona **Guardar**.
4. Ahora ve a la pestaña **Settings** (o **Configuración**) dentro de Authentication > **Dominios autorizados (Authorized domains)**:
   - Haz clic en **Agregar dominio (Add domain)** y añade:
     - `oceiros.com`
     - `tu-usuario.github.io` (reemplaza con tu usuario de GitHub donde esté el repositorio)
   *(Nota: `localhost` y `oceiros-totalero.firebaseapp.com` ya vienen por defecto)*.

### Paso 2: Crear la Base de Datos Firestore y sus Reglas
1. En el menú izquierdo ve a **Compilación (Build)** > **Firestore Database**.
2. Haz clic en **Crear base de datos (Create database)**.
3. Elige la ubicación que prefieras (por ejemplo `nam5 (us-central)` o la más cercana) y deja la base de datos con el nombre predeterminado `(default)`.
4. Elige **Comenzar en modo de producción** y haz clic en Crear.
5. Ve a la pestaña **Reglas (Rules)** de Firestore, borra lo que haya y pega exactamente las reglas de seguridad de este proyecto (`firestore.rules`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    match /users/{userId} {
      allow get: if isOwner(userId) && isValidId(userId);
      allow create: if isOwner(userId) && isValidId(userId)
                    && request.resource.data.uid == userId;
      allow update: if isOwner(userId) && isValidId(userId)
                    && request.resource.data.uid == userId;
      allow delete: if isOwner(userId) && isValidId(userId);

      match /financialData/{docId} {
        allow get, list: if isOwner(userId) && isValidId(userId) && isValidId(docId);
        allow create: if isOwner(userId) && isValidId(userId) && isValidId(docId)
                      && request.resource.data.userId == userId;
        allow update: if isOwner(userId) && isValidId(userId) && isValidId(docId)
                      && request.resource.data.userId == userId;
        allow delete: if isOwner(userId) && isValidId(userId) && isValidId(docId);
      }
    }
  }
}
```
6. Haz clic en **Publicar (Publish)**.

---

## 🚀 Lo que debes hacer en tu Repositorio de GitHub (Solo 1 paso):

1. En tu repositorio de GitHub, entra a **Settings** (pestaña superior).
2. En el menú lateral izquierdo, haz clic en **Pages**.
3. En la sección **Build and deployment**:
   - Bajo **Source**, cambia el selector de *"Deploy from a branch"* a **`GitHub Actions`**.
4. ¡Listo! Cada vez que Google AI Studio sincronice con GitHub o hagas un `push`, GitHub Actions compilará la app y la publicará en GitHub Pages automáticamente.

### (Opcional) Variables Secrets en GitHub
Como las credenciales de tu proyecto ya están incluidas de forma segura en `firebase-applet-config.json` en el frontend, el workflow compilará de inmediato sin necesidad de Secrets obligatorios. Sin embargo, si prefieres sobreescribirlas mediante Secrets en el futuro, puedes agregar en **Settings > Secrets and variables > Actions**:
- `VITE_FIREBASE_API_KEY`: `AIzaSyDj-EHzyQoy-B5KJsByQ2Kuyc60SKTWRiQ`
- `VITE_FIREBASE_AUTH_DOMAIN`: `totalero.oceiros.com`
- `VITE_FIREBASE_PROJECT_ID`: `oceiros-totalero`
- `VITE_FIREBASE_STORAGE_BUCKET`: `oceiros-totalero.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: `1002830356973`
- `VITE_FIREBASE_APP_ID`: `1:1002830356973:web:93b0d6beab100c4890c7e4`
- `VITE_FIREBASE_DATABASE_ID`: `(default)`
