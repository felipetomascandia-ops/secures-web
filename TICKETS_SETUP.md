# Sistema de Tickets - Configuración de Supabase

## Paso 1: Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta o inicia sesión
2. Crea un nuevo proyecto
3. Espera a que el proyecto se configure (puede tomar unos minutos)

## Paso 2: Configurar autenticación con Google

1. En el dashboard de Supabase, ve a **Authentication > Providers**
2. Selecciona **Google**
3. Activa el toggle para habilitar Google OAuth
4. Necesitarás configurar credenciales en Google Cloud Console:
   - Ve a [console.cloud.google.com](https://console.cloud.google.com)
   - Crea un nuevo proyecto o selecciona uno existente
   - Ve a **API & Services > Credentials**
   - Crea credenciales de tipo **OAuth client ID**
   - Tipo de aplicación: **Web application**
   - Agrega los orígenes autorizados y URI de redireccionamiento que te indica Supabase
   - Copia el **Client ID** y **Client Secret**
5. Pega estas credenciales en la configuración de Google en Supabase
6. Guarda los cambios

## Paso 3: Configurar la base de datos

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Crea una nueva consulta
3. Copia y pega el contenido del archivo `supabase-schema.sql`
4. Ejecuta la consulta para crear las tablas y políticas

## Paso 4: Configurar variables de entorno

1. En el dashboard de Supabase, ve a **Project Settings > API**
2. Copia el **Project URL** y el **anon public key**
3. Abre el archivo `.env.local` en tu proyecto
4. Pega los valores:

```env
NEXT_PUBLIC_SUPABASE_URL=tu-url-del-proyecto
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
```

## Paso 5: Iniciar el servidor

Ejecuta el comando:

```bash
npm run dev
```

¡Listo! Ahora los usuarios pueden iniciar sesión con Google y crear tickets en `/tickets`.

## Funcionalidades

- ✅ Autenticación con Google
- ✅ Creación de tickets con título, descripción y prioridad
- ✅ Listado de tickets del usuario
- ✅ Chat en tiempo real para cada ticket
- ✅ Estados de ticket (abierto, en progreso, cerrado)
- ✅ Prioridades (baja, media, alta, urgente)
- ✅ Diseño con tema oscuro profesional
