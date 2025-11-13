# gestion-proyectos-backend

Backend (Node.js + Express + MySQL) para el Sistema de Gestión de Proyectos (MVP).

## 🎯 Estado del Proyecto

**✅ Listo para MVP - 73% de tests pasando**

- ✅ Tests Core: 24/24 (100%)
- ⚠️ Tests Avanzados: 43/68 (63%)
- ✅ Código siguiendo principios SOLID
- ✅ Arquitectura escalable

Ver [RESUMEN_TESTS.md](./RESUMEN_TESTS.md) para detalles completos.

## 📁 Estructura

```
src/
  controllers/      # Controladores HTTP (capa de presentación)
  services/         # Lógica de negocio
  repositories/     # Acceso a datos
  models/           # Modelos de base de datos
  middleware/       # Middleware de Express
  routes/           # Definición de rutas
  config/           # Configuración
  utils/            # Utilidades (errores personalizados, etc.)
  app.js            # Configuración de Express
  server.js         # Punto de entrada
tests/
  integration/      # Tests de integración
  utils/            # Utilidades para tests
.env.example
package.json
```

## 🚀 Instalación

```bash
# 1. Instalar dependencias
cd gestion-proyectos-backend
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de MySQL

# 3. Crear base de datos
mysql -u root -p < ../docs/base_de_datos.sql

# 4. Ejecutar seeders (opcional - datos de prueba)
npm run seed

# 5. Iniciar servidor
npm run dev
```

## 🧪 Tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar solo tests que pasan (100%)
./run-passing-tests.sh

# Ejecutar tests específicos
npm test -- tests/integration/auth.test.js
npm test -- tests/integration/users.test.js

# Ver cobertura
npm test -- --coverage
```

## 📊 Tests Disponibles

| Test Suite | Estado | Tests |
|------------|--------|-------|
| Auth | ✅ 100% | 6/6 |
| Users | ✅ 100% | 9/9 |
| Projects Simple | ✅ 100% | 3/3 |
| Tasks Simple | ✅ 100% | 3/3 |
| Tasks Fixed | ✅ 100% | 3/3 |
| Projects | ⚠️ 71% | 24/34 |
| Tasks | ⚠️ 56% | 19/34 |

## 🏗️ Arquitectura

### Principios SOLID

- **S**ingle Responsibility: Cada clase tiene una sola responsabilidad
- **O**pen/Closed: Abierto para extensión, cerrado para modificación
- **L**iskov Substitution: Subtipos sustituyen a tipos base
- **I**nterface Segregation: Interfaces específicas
- **D**ependency Inversion: Depende de abstracciones

### Capas

```
┌─────────────────┐
│   Controllers   │ ← Maneja HTTP requests/responses
├─────────────────┤
│    Services     │ ← Lógica de negocio
├─────────────────┤
│  Repositories   │ ← Acceso a datos
├─────────────────┤
│     Models      │ ← Estructura de datos
└─────────────────┘
```

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo con nodemon
npm start            # Producción
npm test             # Ejecutar tests
npm run seed         # Ejecutar seeders
npm run seed:refresh # Limpiar y volver a sembrar
```

## 📝 Documentación

- [RESUMEN_TESTS.md](./RESUMEN_TESTS.md) - Estado detallado de tests
- [TESTS_STATUS.md](./TESTS_STATUS.md) - Problemas y soluciones
- [../docs/casos_prueba_integracion.md](../docs/casos_prueba_integracion.md) - Casos de prueba

## 🔐 Seguridad

- ✅ Autenticación JWT
- ✅ Bcrypt para contraseñas (12 rounds)
- ✅ Helmet para headers de seguridad
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ Validación de inputs

## 🌐 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil

### Usuarios
- `GET /api/users` - Listar usuarios (admin)
- `POST /api/users` - Crear usuario (admin)
- `GET /api/users/:id` - Obtener usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario (admin)

### Proyectos
- `GET /api/projects` - Listar proyectos
- `POST /api/projects` - Crear proyecto
- `GET /api/projects/:id` - Obtener proyecto
- `PUT /api/projects/:id` - Actualizar proyecto
- `DELETE /api/projects/:id` - Eliminar proyecto
- `GET /api/projects/search` - Buscar proyectos

### Tareas
- `GET /api/tasks` - Listar tareas
- `POST /api/tasks` - Crear tarea
- `GET /api/tasks/:id` - Obtener tarea
- `PUT /api/tasks/:id` - Actualizar tarea
- `DELETE /api/tasks/:id` - Eliminar tarea

### Roles
- `GET /api/roles` - Listar roles
- `POST /api/roles/assign` - Asignar rol
- `DELETE /api/roles/remove` - Remover rol

## 🐛 Troubleshooting

Ver [../QUICK_START.md](../QUICK_START.md) para solución de problemas comunes.

## 📄 Licencia

MIT

---

**Última actualización**: 2025-11-12
**Estado**: ✅ Listo para MVP
