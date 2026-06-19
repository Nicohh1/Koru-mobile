# KORU Mobile

Aplicacion Expo SDK 54 con React Native, Expo Router, SQLite para las funciones locales y Supabase para matchmaking remoto.

## Requisitos

- Node.js 20 o posterior.
- Docker Desktop con Docker Compose para ejecutar la version web en contenedor.
- Expo Go para probar Android o iOS.

## Variables de entorno

Crea el archivo local `.env` desde el ejemplo:

```bash
cp .env.example .env
```

En PowerShell puedes usar:

```powershell
Copy-Item .env.example .env
```

Completa las variables publicas de Supabase:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-clave-publicable
```

`.env` es local y no debe subirse al repositorio. Las variables `EXPO_PUBLIC_*` se incorporan al bundle web durante el build, por lo que un cambio requiere reconstruir la imagen.

## Desarrollo movil

```bash
npm ci
npx expo start
```

Escanea el codigo QR con Expo Go para abrir la aplicacion en Android o iOS.

## Exportacion web local

```bash
npm ci
npx expo export --platform web
```

La salida estatica se genera en `dist/`.

## Web con Docker

Construye la exportacion de Expo y levanta Nginx:

```bash
docker compose up --build
```

Abre [http://localhost:8080](http://localhost:8080/) en el navegador.

Para ejecutar en segundo plano:

```bash
docker compose up --build -d
```

Para detener y eliminar los contenedores:

```bash
docker compose down
```

El build usa `.env` solamente para pasar las variables publicas como argumentos. El archivo `.env` no se copia a ninguna etapa de la imagen. Nginx sirve `dist/` y redirige las rutas desconocidas a `index.html` para mantener la navegacion de Expo Router.
