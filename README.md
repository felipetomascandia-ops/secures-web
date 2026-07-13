# Olimpo Coverage Group

Sitio web profesional para Olimpo Coverage Group - Servicios de seguros para negocios.

## Características

- Diseño moderno y responsive
- Tema oscuro profesional
- Secciones: Inicio, Servicios, Nosotros, Contacto
- Listo para deploy en Vercel

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre [https://www.olimpocoveragegroup.com](https://www.olimpocoveragegroup.com) para ver el sitio.

## Deploy en Vercel

1. Haz commit de tu código a GitHub
2. Conecta tu repositorio a Vercel
3. Vercel se encargará del deploy automáticamente

## Deploy en GitHub Pages

1. Instala `gh-pages`:
   ```bash
   npm install -D gh-pages
   ```

2. Añade estos scripts a `package.json`:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d out"
   }
   ```

3. Configura `next.config.mjs`:
   ```javascript
   const nextConfig = {
     output: 'export',
     images: {
       unoptimized: true
     }
   };
   ```

4. Ejecuta:
   ```bash
   npm run deploy
   ```

## Información de Contacto

- **Empresa:** Olimpo Coverage Group
- **Ubicación:** Horsham PA, USA
- **Correo:** contacto@olimpocoveragegroup.com
- **Teléfono:** (445) 325-0112
