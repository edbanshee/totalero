# Totalero — Firebase, Railway y GitHub Pages

## 1. Firebase (Google + respaldo en la nube)
1. Entra a https://console.firebase.google.com → **Agregar proyecto** → nombre "totalero" (Analytics opcional).
2. **Authentication → Comenzar → Método de acceso → Google → Habilitar** y guarda.
3. **Authentication → Configuración → Dominios autorizados**: agrega el dominio donde vivirá la app (p. ej. `tuusuario.github.io`, tu dominio de Railway o de Lovable).
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
5. **Configuración del proyecto (engrane) → Tus apps → Web (</>)** → registra la app y copia los valores a un archivo `.env` en la raíz:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   Estas claves son públicas (las protege la regla del paso 4). Sin ellas la app sigue en modo invitado.

Uso: "Continuar con Google" inicia sesión; en **Respaldo** aparecen "Guardar en la nube" y "Restaurar de la nube" (un documento por usuario).

## 2. Railway (opcional)
Railway sirve para hospedar la app completa:
1. Sube el código a GitHub. 2. En https://railway.app → **New Project → Deploy from GitHub repo**.
3. En **Variables** agrega las 4 `VITE_FIREBASE_*`. 4. Build: `bun install && bun run build`; Start: `bun run start` (o `npx vite preview --host 0.0.0.0 --port $PORT`).
5. **Settings → Networking → Generate Domain** y agrega ese dominio en Firebase (paso 1.3).

## 3. GitHub Pages
GitHub Pages solo sirve archivos estáticos. Totalero guarda todo en el navegador, así que funciona como sitio estático, pero hay que generarlo en ese modo:
1. Crea el repositorio en GitHub con el código (desde Lovable: Configuración → GitHub → Conectar).
2. En el repo: **Settings → Secrets and variables → Actions** agrega las 4 `VITE_FIREBASE_*`.
3. **Settings → Pages → Source: GitHub Actions**.
4. Crea `.github/workflows/pages.yml`:
   ```yaml
   name: Pages
   on: { push: { branches: [main] } }
   permissions: { contents: read, pages: write, id-token: write }
   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment: github-pages
       steps:
         - uses: actions/checkout@v4
         - uses: oven-sh/setup-bun@v2
         - run: bun install
         - run: bun run build
           env:
             VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
             VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
             VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
             VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
         - run: cp dist/client/index.html dist/client/404.html
         - uses: actions/upload-pages-artifact@v3
           with: { path: dist/client }
         - uses: actions/deploy-pages@v4
   ```
5. Importante: el proyecto hoy se compila para servidor; para Pages hay que activar el modo estático (SPA) en `vite.config.ts` y, si el sitio vive en `tuusuario.github.io/totalero`, la ruta base `/totalero/`. Pídemelo y lo dejo configurado.
6. Agrega `tuusuario.github.io` a los dominios autorizados de Firebase.

La opción más simple sigue siendo el botón **Publicar** de Lovable.
