# Backend - Sistema de Gestión de Proyectos

Backend con Node.js + Express + MySQL siguiendo principios SOLID.

## Estructura

```
src/
  controllers/    # HTTP handlers
  services/       # Logica de negocio
  repositories/   # Acceso a datos
  models/         # Modelos DB
  middleware/     # Middleware
  routes/         # Rutas
```

## Instalacion Local

```bash
npm install
cp .env.example .env
# Editar .env con credenciales MySQL
mysql -u root -p < ../docs/base_de_datos.sql
npm run seed
npm run dev
```

### Variables de Entorno Requeridas

```bash
DB_HOST=tu-host
DB_NAME=tu-database
DB_USER=tu-usuario
DB_PASSWORD=tu-password
JWT_SECRET=tu-secret-32-chars-minimo
FRONTEND_URL=https://tu-frontend.vercel.app
NODE_ENV=production
SETUP_DB=true
CLEAN_DATABASE=false
```

### Limpiar Base de Datos

Para resetear la BD en Render:
1. Cambiar `CLEAN_DATABASE=true` en Environment
2. Esperar deploy (2-3 min)
3. Cambiar `CLEAN_DATABASE=false` (IMPORTANTE)

## Tests

### Resumen de Tests Backend (Integration con Jest)

```
[OK] Auth: 15/15
[OK] Users: 21/21
[OK] Projects: 34/34
[OK] Tasks: 34/34
[OK] Roles: 15/15
[OK] Dashboard: 19/19

Total Backend: 138 tests pasados sin errores
```

### Ejecutar Tests

```bash
npm test                                    # Todos los tests
npm test -- tests/integration/auth.test.js # Test especifico
npm test -- --coverage                      # Con cobertura
npm test -- --maxWorkers=4                  # Con mas workers
```

## Arquitectura

Capas siguiendo principios SOLID:
```
Controllers -> Services -> Repositories -> Models
```

## Scripts

```bash
npm run dev    # Desarrollo
npm start      # Produccion
npm test       # Tests
npm run seed   # Poblar BD
npm run db:clean # Limpiar BD
```

## Seguridad

- JWT Authentication
- Bcrypt (12 rounds)
- Helmet + CORS
- Rate limiting

## API Endpoints

- `/api/auth/*` - Autenticacion
- `/api/users/*` - Usuarios
- `/api/projects/*` - Proyectos
- `/api/tasks/*` - Tareas
- `/api/roles/*` - Roles
- `/api/dashboard` - Dashboard

---

**Stack**: Node.js + Express + MySQL + JWT
