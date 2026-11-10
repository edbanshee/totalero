# Totalero — GitHub Pages + Firebase

## Arquitectura y estado actual
- **GitHub Pages:** sitio estático (bienvenida y dashboard), sin un servidor en GitHub.
- **Firebase:** acceso con Google y respaldo privado por usuario.

Hoy los cálculos y los datos de invitado siguen en el navegador; Google y los respaldos llaman directamente a Firebase. No hay servidor propio: no hace falta.

La vista previa de Lovable conserva su configuración normal.

## 1. Firebase (Google + respaldo en la nube)
1. Entra a https://console.firebase.google.com → **Agregar proyecto** → nombre "totalero" (Analytics opcional).
2. **Authentication → Comenzar → Método de acceso → Google → Habilitar** y guarda.
3. **Authentication → Configuración → Dominios autorizados**: agrega el dominio donde vivirá la app (p. ej. `tuusuario.github.io` o el de Lovable).
4. **Firestore Database → Crear base de datos** (modo producción) y en **Reglas** pega:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /backups/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
5. **Configuración del proyecto (engrane) → Tus apps → Web (</>)** → registra la app. Para probar localmente copia `.env.example` a `.env.local` y completa:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   Estas claves son públicas (las protege la regla del paso 4). Sin ellas la app sigue en modo invitado.

Uso: "Continuar con Google" inicia sesión; en **Respaldo** aparecen "Guardar en la nube" y "Restaurar de la nube" (un documento por usuario).

## 2. GitHub Pages
El flujo `.github/workflows/pages.yml` ya está creado. Publica automáticamente al recibir cambios en `main`, o manualmente desde **Actions → Publish Totalero to GitHub Pages → Run workflow**.
1. Crea el repositorio en GitHub con el código (desde Lovable: Configuración → GitHub → Conectar).
2. En el repo: **Settings → Secrets and variables → Actions** agrega las 4 `VITE_FIREBASE_*`.
3. **Settings → Pages → Source: GitHub Actions**.
4. Confirma que tu rama sea `main`; si tiene otro nombre, cambia `branches: [main]` en el flujo. Revisa **Actions** hasta que termine la publicación y abre la URL de **Settings → Pages**.
5. La ruta base se calcula del nombre real del repositorio: `usuario/totalero` → `/totalero/`; `usuario/usuario.github.io` → `/`. No hace falta que me pases el nombre ni editarlo en el código. Los enlaces, estilos, scripts e icono usan esa misma base.
6. Agrega `tuusuario.github.io` a los dominios autorizados de Firebase.

### Dominio propio (opcional)
En **Settings → Secrets and variables → Actions → Variables**, crea `PAGES_CUSTOM_DOMAIN` con el dominio sin `https://` ni ruta. Configura también ese dominio y su DNS en **Settings → Pages**. El flujo usará `/` y generará `CNAME`. Autoriza el dominio en Firebase.

### Qué produce la publicación
`bun run build:pages` genera una envoltura estática sin datos de usuario y prepara `dist/client/index.html`, `dist/client/app/index.html`, los recursos y `.nojekyll`. Solo se sube `dist/client`; el servidor generado durante la compilación no se publica en GitHub. Abrir o refrescar `/totalero/app/` sirve un archivo real, sin depender de un truco con `404.html`.

### Comprobar el despliegue
1. Abre la URL de Pages y entra como invitado.
2. Añade un movimiento, actualiza la página y verifica que siga allí.
3. Abre directamente la URL terminada en `/app/` y comprueba que no salga 404.
4. Inicia sesión con Google y prueba guardar/restaurar un respaldo; requiere Firebase configurado.
5. En **Actions**, confirma que las pruebas y la publicación estén en verde.

Los cambios de claves públicas de Firebase requieren volver a ejecutar la publicación. Los destinos externos y sus permisos se activan en GitHub: crear los archivos aquí no los publica ni confirma que esas cuentas estén conectadas.
