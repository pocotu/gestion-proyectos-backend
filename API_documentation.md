# Documentación de API - Sistema de Gestión de Proyectos

## Información General

- **Base URL**: `http://localhost:3000/api`
- **Autenticación**: JWT Bearer Token
- **Formato de respuesta**: JSON
- **Versión**: 1.0.0

## Estructura de Respuestas

### Respuesta Exitosa
```json
{
  "success": true,
  "data": {},
  "message": "Mensaje descriptivo"
}
```

### Respuesta de Error
```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": []
}
```

## Códigos de Estado HTTP

- `200` - OK: Operación exitosa
- `201` - Created: Recurso creado exitosamente
- `400` - Bad Request: Datos de entrada inválidos
- `401` - Unauthorized: Token inválido o expirado
- `403` - Forbidden: Sin permisos para la operación
- `404` - Not Found: Recurso no encontrado
- `500` - Internal Server Error: Error interno del servidor

---

# 1. ENDPOINTS DE AUTENTICACIÓN

## 1.1 Registro de Usuario
**POST** `/auth/register`

### Descripción
Registra un nuevo usuario en el sistema.

### Acceso
- **Público** (no requiere autenticación)

### Parámetros del Body
```json
{
  "nombre": "string (requerido)",
  "email": "string (requerido, único)",
  "contraseña": "string (requerido, mín. 6 caracteres)",
  "telefono": "string (opcional)"
}
```

### Respuesta Exitosa (201)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "telefono": "+1234567890",
      "estado": true,
      "es_administrador": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Usuario registrado exitosamente"
}
```

---

## 1.2 Iniciar Sesión
**POST** `/auth/login`

### Descripción
Autentica un usuario y devuelve tokens de acceso.

### Acceso
- **Público** (no requiere autenticación)

### Parámetros del Body
```json
{
  "email": "string (requerido)",
  "contraseña": "string (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "es_administrador": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Inicio de sesión exitoso"
}
```

---

## 1.3 Verificar Token
**POST** `/auth/verify`

### Descripción
Verifica la validez de un token JWT.

### Acceso
- **Público** (no requiere autenticación)

### Parámetros del Body
```json
{
  "token": "string (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com"
    }
  },
  "message": "Token válido"
}
```

---

## 1.4 Refrescar Token
**POST** `/auth/refresh-token`

### Descripción
Genera un nuevo access token usando el refresh token.

### Acceso
- **Público** (requiere refresh token válido)

### Parámetros del Body
```json
{
  "refreshToken": "string (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token refrescado exitosamente"
}
```

---

## 1.5 Obtener Perfil
**GET** `/auth/profile`

### Descripción
Obtiene el perfil del usuario autenticado.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "telefono": "+1234567890",
      "estado": true,
      "es_administrador": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Perfil obtenido exitosamente"
}
```

---

## 1.6 Cambiar Contraseña
**PUT** `/auth/change-password`

### Descripción
Cambia la contraseña del usuario autenticado.

### Acceso
- **Privado** (requiere autenticación)
- **Rate Limit**: 5 intentos cada 15 minutos

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "contraseñaActual": "string (requerido)",
  "nuevaContraseña": "string (requerido, mín. 6 caracteres)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Contraseña cambiada exitosamente"
}
```

---

## 1.7 Cerrar Sesión
**POST** `/auth/logout`

### Descripción
Cierra la sesión del usuario y revoca los tokens.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

---

## 1.8 Cerrar Todas las Sesiones
**POST** `/auth/logout-all`

### Descripción
Cierra todas las sesiones activas del usuario.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Todas las sesiones cerradas exitosamente"
}
```

---

# 2. ENDPOINTS DE GESTIÓN DE USUARIOS

## 2.1 Obtener Perfil del Usuario Actual
**GET** `/users/profile`

### Descripción
Obtiene el perfil completo del usuario autenticado.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "telefono": "+1234567890",
      "estado": true,
      "es_administrador": false,
      "roles": ["responsable_proyecto"],
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 2.2 Actualizar Perfil del Usuario Actual
**PUT** `/users/profile`

### Descripción
Actualiza el perfil del usuario autenticado.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "nombre": "string (opcional)",
  "telefono": "string (opcional)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez Actualizado",
      "email": "juan@example.com",
      "telefono": "+0987654321",
      "updated_at": "2024-01-02T00:00:00.000Z"
    }
  },
  "message": "Perfil actualizado exitosamente"
}
```

---

## 2.3 Listar Todos los Usuarios
**GET** `/users`

### Descripción
Obtiene la lista de todos los usuarios del sistema.

### Acceso
- **Privado** (requiere permisos de lectura de usuarios)
- **Roles permitidos**: Admin, Responsable de Proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 10)
- `search` (opcional): Búsqueda por nombre o email
- `estado` (opcional): Filtrar por estado (true/false)

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "nombre": "Juan Pérez",
        "email": "juan@example.com",
        "telefono": "+1234567890",
        "estado": true,
        "es_administrador": false,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

## 2.4 Crear Nuevo Usuario
**POST** `/users`

### Descripción
Crea un nuevo usuario en el sistema.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "nombre": "string (requerido)",
  "email": "string (requerido, único)",
  "contraseña": "string (requerido)",
  "telefono": "string (opcional)",
  "es_administrador": "boolean (opcional, default: false)"
}
```

### Respuesta Exitosa (201)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "nombre": "María García",
      "email": "maria@example.com",
      "telefono": "+1234567891",
      "estado": true,
      "es_administrador": false,
      "created_at": "2024-01-02T00:00:00.000Z"
    }
  },
  "message": "Usuario creado exitosamente"
}
```

---

## 2.5 Obtener Usuario por ID
**GET** `/users/:id`

### Descripción
Obtiene la información de un usuario específico.

### Acceso
- **Privado** (requiere autenticación)
- **Permisos**: Admin o el propio usuario

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del usuario

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "telefono": "+1234567890",
      "estado": true,
      "es_administrador": false,
      "roles": ["responsable_proyecto"],
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 2.6 Actualizar Usuario
**PUT** `/users/:id`

### Descripción
Actualiza la información de un usuario específico.

### Acceso
- **Privado** (requiere autenticación)
- **Permisos**: Admin o el propio usuario (con limitaciones)

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del usuario

### Parámetros del Body
```json
{
  "nombre": "string (opcional)",
  "telefono": "string (opcional)",
  "es_administrador": "boolean (opcional, solo admin)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez Actualizado",
      "email": "juan@example.com",
      "telefono": "+0987654321",
      "updated_at": "2024-01-02T00:00:00.000Z"
    }
  },
  "message": "Usuario actualizado exitosamente"
}
```

---

## 2.7 Eliminar Usuario
**DELETE** `/users/:id`

### Descripción
Elimina un usuario del sistema.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del usuario

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}
```

---

## 2.8 Cambiar Estado de Usuario
**PATCH** `/users/:id/status`

### Descripción
Activa o desactiva un usuario.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del usuario

### Parámetros del Body
```json
{
  "estado": "boolean (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "estado": false,
      "updated_at": "2024-01-02T00:00:00.000Z"
    }
  },
  "message": "Estado de usuario actualizado exitosamente"
}
```

---

## 2.9 Asignar Rol a Usuario
**POST** `/users/:id/roles`

### Descripción
Asigna un rol específico a un usuario.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del usuario

### Parámetros del Body
```json
{
  "rol_id": "number (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Rol asignado exitosamente"
}
```

---

## 2.10 Remover Rol de Usuario
**DELETE** `/users/:id/roles/:roleId`

### Descripción
Remueve un rol específico de un usuario.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del usuario
- `roleId`: ID del rol

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Rol removido exitosamente"
}
```

---

## 2.11 Obtener Roles de Usuario
**GET** `/users/:id/roles`

### Descripción
Obtiene todos los roles asignados a un usuario.

### Acceso
- **Privado** (requiere autenticación)
- **Permisos**: Admin o el propio usuario

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del usuario

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": 2,
        "nombre": "responsable_proyecto",
        "activo": true,
        "fecha_asignacion": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 2.12 Buscar Usuarios
**GET** `/users/search`

### Descripción
Busca usuarios por nombre o email.

### Acceso
- **Privado** (requiere permisos de lectura de usuarios)
- **Roles permitidos**: Admin, Responsable de Proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `q` (requerido): Término de búsqueda
- `limit` (opcional): Límite de resultados (default: 10)

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "nombre": "Juan Pérez",
        "email": "juan@example.com",
        "estado": true
      }
    ],
    "total": 1
  }
}
```

---

## 2.13 Obtener Usuarios Disponibles para Proyectos
**GET** `/users/available-for-projects`

### Descripción
Obtiene usuarios que pueden ser asignados a proyectos.

### Acceso
- **Privado** (requiere permisos de gestión de proyectos)
- **Roles permitidos**: Admin, Responsable de Proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "nombre": "Juan Pérez",
        "email": "juan@example.com",
        "roles": ["responsable_proyecto"]
      }
    ]
  }
}
```

---

## 2.14 Obtener Usuarios Disponibles para Tareas
**GET** `/users/available-for-tasks`

### Descripción
Obtiene usuarios que pueden ser asignados a tareas.

### Acceso
- **Privado** (requiere permisos de gestión de tareas o proyectos)
- **Roles permitidos**: Admin, Responsable de Proyecto, Responsable de Tarea

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "nombre": "Juan Pérez",
        "email": "juan@example.com",
        "roles": ["responsable_tarea"]
      }
    ]
  }
}
```

---

# 3. ENDPOINTS DE GESTIÓN DE PROYECTOS

## 3.1 Listar Proyectos
**GET** `/projects`

### Descripción
Obtiene la lista de proyectos según los permisos del usuario.

### Acceso
- **Privado** (requiere autenticación)
- **Filtrado**: Admin ve todos, Responsables ven sus proyectos asignados

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 10)
- `estado` (opcional): Filtrar por estado
- `search` (opcional): Búsqueda por título o descripción

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "titulo": "Sistema de Gestión",
        "descripcion": "Desarrollo de sistema web",
        "fecha_inicio": "2024-01-01",
        "fecha_fin": "2024-06-01",
        "estado": "en_progreso",
        "creado_por": {
          "id": 1,
          "nombre": "Juan Pérez"
        },
        "responsables": [
          {
            "id": 2,
            "nombre": "María García"
          }
        ],
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

## 3.2 Crear Proyecto
**POST** `/projects`

### Descripción
Crea un nuevo proyecto en el sistema.

### Acceso
- **Privado** (requiere permisos de creación de proyectos)
- **Roles permitidos**: Admin, Responsable de Proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "titulo": "string (requerido)",
  "descripcion": "string (opcional)",
  "fecha_inicio": "date (opcional, formato: YYYY-MM-DD)",
  "fecha_fin": "date (opcional, formato: YYYY-MM-DD)"
}
```

### Respuesta Exitosa (201)
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 2,
      "titulo": "Nuevo Proyecto",
      "descripcion": "Descripción del proyecto",
      "fecha_inicio": "2024-02-01",
      "fecha_fin": "2024-08-01",
      "estado": "planificacion",
      "creado_por": 1,
      "created_at": "2024-01-02T00:00:00.000Z"
    }
  },
  "message": "Proyecto creado exitosamente"
}
```

---

## 3.3 Obtener Proyecto por ID
**GET** `/projects/:id`

### Descripción
Obtiene la información detallada de un proyecto específico.

### Acceso
- **Privado** (requiere acceso al proyecto)
- **Permisos**: Admin, Responsables del proyecto, Miembros del equipo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 1,
      "titulo": "Sistema de Gestión",
      "descripcion": "Desarrollo de sistema web completo",
      "fecha_inicio": "2024-01-01",
      "fecha_fin": "2024-06-01",
      "estado": "en_progreso",
      "creado_por": {
        "id": 1,
        "nombre": "Juan Pérez",
        "email": "juan@example.com"
      },
      "responsables": [
        {
          "id": 2,
          "nombre": "María García",
          "rol_responsabilidad": "responsable"
        }
      ],
      "tareas_count": 15,
      "tareas_completadas": 8,
      "progreso": 53.33,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T00:00:00.000Z"
    }
  }
}
```

---

## 3.4 Actualizar Proyecto
**PUT** `/projects/:id`

### Descripción
Actualiza la información de un proyecto específico.

### Acceso
- **Privado** (requiere permisos de actualización del proyecto)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Parámetros del Body
```json
{
  "titulo": "string (opcional)",
  "descripcion": "string (opcional)",
  "fecha_inicio": "date (opcional)",
  "fecha_fin": "date (opcional)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 1,
      "titulo": "Sistema de Gestión Actualizado",
      "descripcion": "Nueva descripción",
      "fecha_inicio": "2024-01-01",
      "fecha_fin": "2024-07-01",
      "updated_at": "2024-01-16T00:00:00.000Z"
    }
  },
  "message": "Proyecto actualizado exitosamente"
}
```

---

## 3.5 Eliminar Proyecto
**DELETE** `/projects/:id`

### Descripción
Elimina un proyecto del sistema.

### Acceso
- **Privado** (requiere permisos de eliminación del proyecto)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Proyecto eliminado exitosamente"
}
```

---

## 3.6 Cambiar Estado del Proyecto
**PATCH** `/projects/:id/status`

### Descripción
Cambia el estado de un proyecto.

### Acceso
- **Privado** (requiere permisos de actualización del proyecto)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Parámetros del Body
```json
{
  "estado": "string (requerido: 'planificacion', 'en_progreso', 'completado', 'cancelado')"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 1,
      "estado": "en_progreso",
      "updated_at": "2024-01-16T00:00:00.000Z"
    }
  },
  "message": "Estado del proyecto actualizado exitosamente"
}
```

---

## 3.7 Iniciar Proyecto
**PATCH** `/projects/:id/start`

### Descripción
Marca un proyecto como iniciado (cambia estado a 'en_progreso').

### Acceso
- **Privado** (requiere permisos de actualización del proyecto)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 1,
      "estado": "en_progreso",
      "updated_at": "2024-01-16T00:00:00.000Z"
    }
  },
  "message": "Proyecto iniciado exitosamente"
}
```

---

## 3.8 Completar Proyecto
**PATCH** `/projects/:id/complete`

### Descripción
Marca un proyecto como completado.

### Acceso
- **Privado** (requiere permisos de actualización del proyecto)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 1,
      "estado": "completado",
      "updated_at": "2024-01-16T00:00:00.000Z"
    }
  },
  "message": "Proyecto completado exitosamente"
}
```

---

## 3.9 Cancelar Proyecto
**PATCH** `/projects/:id/cancel`

### Descripción
Marca un proyecto como cancelado.

### Acceso
- **Privado** (requiere permisos de actualización del proyecto)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 1,
      "estado": "cancelado",
      "updated_at": "2024-01-16T00:00:00.000Z"
    }
  },
  "message": "Proyecto cancelado exitosamente"
}
```

---

## 3.10 Asignar Responsable al Proyecto
**POST** `/projects/:id/responsibles`

### Descripción
Asigna un responsable a un proyecto específico.

### Acceso
- **Privado** (requiere permisos de gestión de proyectos)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Parámetros del Body
```json
{
  "usuario_id": "number (requerido)",
  "rol_responsabilidad": "string (opcional, default: 'responsable')"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Responsable asignado exitosamente"
}
```

---

## 3.11 Remover Responsable del Proyecto
**DELETE** `/projects/:id/responsibles/:userId`

### Descripción
Remueve un responsable de un proyecto específico.

### Acceso
- **Privado** (requiere permisos de gestión de proyectos)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto
- `userId`: ID del usuario responsable

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Responsable removido exitosamente"
}
```

---

## 3.12 Obtener Responsables del Proyecto
**GET** `/projects/:id/responsibles`

### Descripción
Obtiene la lista de responsables de un proyecto.

### Acceso
- **Privado** (requiere acceso al proyecto)
- **Permisos**: Admin, Responsables del proyecto, Miembros del equipo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "responsibles": [
      {
        "id": 2,
        "nombre": "María García",
        "email": "maria@example.com",
        "rol_responsabilidad": "responsable",
        "activo": true,
        "fecha_asignacion": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 3.13 Obtener Tareas del Proyecto
**GET** `/projects/:id/tasks`

### Descripción
Obtiene todas las tareas asociadas a un proyecto.

### Acceso
- **Privado** (requiere acceso al proyecto)
- **Permisos**: Admin, Responsables del proyecto, Miembros del equipo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Query Parameters
- `estado` (opcional): Filtrar por estado de tarea
- `prioridad` (opcional): Filtrar por prioridad
- `usuario_asignado_id` (opcional): Filtrar por usuario asignado

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "titulo": "Diseño de base de datos",
        "descripcion": "Crear esquema de BD",
        "fecha_inicio": "2024-01-01",
        "fecha_fin": "2024-01-15",
        "estado": "completada",
        "prioridad": "alta",
        "usuario_asignado": {
          "id": 2,
          "nombre": "María García"
        },
        "porcentaje_completado": 100,
        "horas_trabajadas": 40.5
      }
    ],
    "total": 15
  }
}
```

---

## 3.14 Crear Tarea en el Proyecto
**POST** `/projects/:id/tasks`

### Descripción
Crea una nueva tarea dentro de un proyecto específico.

### Acceso
- **Privado** (requiere permisos de gestión del proyecto)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Parámetros del Body
```json
{
  "titulo": "string (requerido)",
  "descripcion": "string (opcional)",
  "fecha_inicio": "date (opcional)",
  "fecha_fin": "date (opcional)",
  "prioridad": "string (opcional: 'baja', 'media', 'alta')",
  "usuario_asignado_id": "number (opcional)"
}
```

### Respuesta Exitosa (201)
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 16,
      "titulo": "Nueva Tarea",
      "descripcion": "Descripción de la tarea",
      "fecha_inicio": "2024-01-17",
      "fecha_fin": "2024-01-31",
      "estado": "pendiente",
      "prioridad": "media",
      "proyecto_id": 1,
      "usuario_asignado_id": 2,
      "creado_por": 1,
      "created_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Tarea creada exitosamente"
}
```

---

## 3.15 Obtener Estadísticas del Proyecto
**GET** `/projects/:id/stats`

### Descripción
Obtiene estadísticas detalladas de un proyecto específico.

### Acceso
- **Privado** (requiere acceso al proyecto)
- **Permisos**: Admin, Responsables del proyecto, Miembros del equipo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "stats": {
      "tareas_total": 15,
      "tareas_completadas": 8,
      "tareas_en_progreso": 5,
      "tareas_pendientes": 2,
      "progreso_general": 53.33,
      "horas_trabajadas_total": 320.5,
      "dias_transcurridos": 16,
      "dias_restantes": 135,
      "responsables_count": 3,
      "archivos_count": 12
    }
  }
}
```

---

## 3.16 Obtener Progreso del Proyecto
**GET** `/projects/:id/progress`

### Descripción
Obtiene información detallada del progreso de un proyecto.

### Acceso
- **Privado** (requiere acceso al proyecto)
- **Permisos**: Admin, Responsables del proyecto, Miembros del equipo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "progress": {
      "porcentaje_completado": 53.33,
      "tareas_por_estado": {
        "pendiente": 2,
        "en_progreso": 5,
        "completada": 8,
        "cancelada": 0
      },
      "tareas_por_prioridad": {
        "baja": 3,
        "media": 8,
        "alta": 4
      },
      "timeline": [
        {
          "fecha": "2024-01-01",
          "tareas_completadas": 0,
          "progreso_acumulado": 0
        },
        {
          "fecha": "2024-01-16",
          "tareas_completadas": 8,
          "progreso_acumulado": 53.33
        }
      ]
    }
  }
}
```

---

## 3.17 Buscar Proyectos
**GET** `/projects/search`

### Descripción
Busca proyectos por título o descripción.

### Acceso
- **Privado** (filtrado según acceso del usuario)

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `q` (requerido): Término de búsqueda
- `estado` (opcional): Filtrar por estado
- `limit` (opcional): Límite de resultados

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "titulo": "Sistema de Gestión",
        "descripcion": "Desarrollo de sistema web",
        "estado": "en_progreso",
        "progreso": 53.33
      }
    ],
    "total": 1
  }
}
```

---

## 3.18 Obtener Proyectos por Estado
**GET** `/projects/by-status/:status`

### Descripción
Obtiene proyectos filtrados por un estado específico.

### Acceso
- **Privado** (filtrado según acceso del usuario)

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `status`: Estado del proyecto ('planificacion', 'en_progreso', 'completado', 'cancelado')

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "titulo": "Sistema de Gestión",
        "estado": "en_progreso",
        "fecha_inicio": "2024-01-01",
        "progreso": 53.33
      }
    ],
    "total": 1
  }
}
```

---

## 3.19 Obtener Mis Proyectos
**GET** `/projects/my-projects`

### Descripción
Obtiene los proyectos donde el usuario autenticado es responsable.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "titulo": "Sistema de Gestión",
        "estado": "en_progreso",
        "rol_responsabilidad": "responsable",
        "progreso": 53.33,
        "tareas_asignadas": 5
      }
    ],
    "total": 1
  }
}
```

---

## 3.20 Obtener Proyectos donde Participo
**GET** `/projects/participating`

### Descripción
Obtiene los proyectos donde el usuario autenticado participa (tiene tareas asignadas).

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 2,
        "titulo": "Proyecto Mobile",
        "estado": "en_progreso",
        "tareas_asignadas": 3,
        "tareas_completadas": 1,
        "mi_progreso": 33.33
      }
    ],
    "total": 1
  }
}
```

---

## 3.21 Obtener Archivos del Proyecto
**GET** `/projects/:id/files`

### Descripción
Obtiene todos los archivos asociados a un proyecto.

### Acceso
- **Privado** (requiere acceso al proyecto)
- **Permisos**: Admin, Responsables del proyecto, Miembros del equipo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 1,
        "nombre_archivo": "documento_1234567890.pdf",
        "nombre_original": "Especificaciones.pdf",
        "tipo": "PDF",
        "tamaño_bytes": 2048576,
        "subido_por": {
          "id": 2,
          "nombre": "María García"
        },
        "created_at": "2024-01-10T00:00:00.000Z"
      }
    ],
    "total": 12
  }
}
```

---

## 3.22 Obtener Timeline del Proyecto
**GET** `/projects/:id/timeline`

### Descripción
Obtiene el timeline de actividades de un proyecto.

### Acceso
- **Privado** (requiere acceso al proyecto)
- **Permisos**: Admin, Responsables del proyecto, Miembros del equipo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "fecha": "2024-01-01T00:00:00.000Z",
        "evento": "Proyecto creado",
        "descripcion": "El proyecto fue creado por Juan Pérez",
        "usuario": "Juan Pérez",
        "tipo": "proyecto"
      },
      {
        "fecha": "2024-01-02T00:00:00.000Z",
        "evento": "Tarea completada",
        "descripcion": "Diseño de base de datos completado",
        "usuario": "María García",
        "tipo": "tarea"
      }
    ]
  }
}
```

---

## 3.23 Obtener Actividad Reciente del Proyecto
**GET** `/projects/:id/activity`

### Descripción
Obtiene la actividad reciente de un proyecto.

### Acceso
- **Privado** (requiere acceso al proyecto)
- **Permisos**: Admin, Responsables del proyecto, Miembros del equipo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del proyecto

### Query Parameters
- `limit` (opcional): Límite de actividades (default: 10)

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1,
        "accion": "tarea_completada",
        "descripcion": "María García completó la tarea 'Diseño de base de datos'",
        "usuario": {
          "id": 2,
          "nombre": "María García"
        },
        "entidad_tipo": "tarea",
        "entidad_id": 1,
        "created_at": "2024-01-16T10:30:00.000Z"
      }
    ],
    "total": 25
  }
}
```

---

# 4. ENDPOINTS DE GESTIÓN DE TAREAS

## 4.1 Listar Tareas
**GET** `/tasks`

### Descripción
Obtiene la lista de tareas según los permisos del usuario.

### Acceso
- **Privado** (requiere autenticación)
- **Filtrado**: Admin ve todas, Responsables ven según su acceso

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 10)
- `estado` (opcional): Filtrar por estado
- `prioridad` (opcional): Filtrar por prioridad
- `proyecto_id` (opcional): Filtrar por proyecto
- `usuario_asignado_id` (opcional): Filtrar por usuario asignado
- `search` (opcional): Búsqueda por título o descripción

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "titulo": "Diseño de base de datos",
        "descripcion": "Crear esquema de BD",
        "fecha_inicio": "2024-01-01",
        "fecha_fin": "2024-01-15",
        "estado": "completada",
        "prioridad": "alta",
        "proyecto": {
          "id": 1,
          "titulo": "Sistema de Gestión"
        },
        "usuario_asignado": {
          "id": 2,
          "nombre": "María García"
        },
        "creado_por": {
          "id": 1,
          "nombre": "Juan Pérez"
        },
        "porcentaje_completado": 100,
        "horas_trabajadas": 40.5,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

## 4.2 Crear Tarea
**POST** `/tasks`

### Descripción
Crea una nueva tarea en el sistema.

### Acceso
- **Privado** (requiere permisos de creación de tareas)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "titulo": "string (requerido)",
  "descripcion": "string (opcional)",
  "fecha_inicio": "date (opcional, formato: YYYY-MM-DD)",
  "fecha_fin": "date (opcional, formato: YYYY-MM-DD)",
  "prioridad": "string (opcional: 'baja', 'media', 'alta', default: 'media')",
  "proyecto_id": "number (requerido)",
  "usuario_asignado_id": "number (opcional)",
  "padre_tarea_id": "number (opcional, para subtareas)"
}
```

### Respuesta Exitosa (201)
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 26,
      "titulo": "Nueva Tarea",
      "descripcion": "Descripción de la tarea",
      "fecha_inicio": "2024-01-17",
      "fecha_fin": "2024-01-31",
      "estado": "pendiente",
      "prioridad": "media",
      "proyecto_id": 1,
      "usuario_asignado_id": 2,
      "creado_por": 1,
      "padre_tarea_id": null,
      "porcentaje_completado": 0,
      "horas_trabajadas": 0,
      "created_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Tarea creada exitosamente"
}
```

---

## 4.3 Obtener Tarea por ID
**GET** `/tasks/:id`

### Descripción
Obtiene la información detallada de una tarea específica.

### Acceso
- **Privado** (requiere acceso a la tarea)
- **Permisos**: Admin, Responsables del proyecto, Usuario asignado

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID de la tarea

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "titulo": "Diseño de base de datos",
      "descripcion": "Crear esquema completo de la base de datos",
      "fecha_inicio": "2024-01-01",
      "fecha_fin": "2024-01-15",
      "estado": "completada",
      "prioridad": "alta",
      "proyecto": {
        "id": 1,
        "titulo": "Sistema de Gestión",
        "estado": "en_progreso"
      },
      "usuario_asignado": {
        "id": 2,
        "nombre": "María García",
        "email": "maria@example.com"
      },
      "creado_por": {
        "id": 1,
        "nombre": "Juan Pérez"
      },
      "padre_tarea": null,
      "subtareas": [
        {
          "id": 2,
          "titulo": "Diseño de tablas",
          "estado": "completada"
        }
      ],
      "porcentaje_completado": 100,
      "horas_trabajadas": 40.5,
      "archivos_count": 3,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T00:00:00.000Z"
    }
  }
}
```

---

## 4.4 Actualizar Tarea
**PUT** `/tasks/:id`

### Descripción
Actualiza la información de una tarea específica.

### Acceso
- **Privado** (requiere permisos de actualización de la tarea)
- **Permisos**: Admin, Responsables del proyecto, Usuario asignado

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID de la tarea

### Parámetros del Body
```json
{
  "titulo": "string (opcional)",
  "descripcion": "string (opcional)",
  "fecha_inicio": "date (opcional)",
  "fecha_fin": "date (opcional)",
  "prioridad": "string (opcional)",
  "porcentaje_completado": "number (opcional, 0-100)",
  "horas_trabajadas": "number (opcional)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "titulo": "Diseño de base de datos actualizado",
      "descripcion": "Nueva descripción",
      "porcentaje_completado": 85,
      "horas_trabajadas": 45.5,
      "updated_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Tarea actualizada exitosamente"
}
```

---

## 4.5 Eliminar Tarea
**DELETE** `/tasks/:id`

### Descripción
Elimina una tarea del sistema.

### Acceso
- **Privado** (requiere permisos de eliminación de la tarea)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID de la tarea

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Tarea eliminada exitosamente"
}
```

---

## 4.6 Cambiar Estado de Tarea
**PATCH** `/tasks/:id/status`

### Descripción
Cambia el estado de una tarea específica.

### Acceso
- **Privado** (requiere permisos de actualización de la tarea)
- **Permisos**: Admin, Responsables del proyecto, Usuario asignado

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID de la tarea

### Parámetros del Body
```json
{
  "estado": "string (requerido: 'pendiente', 'en_progreso', 'completada', 'cancelada')"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "estado": "en_progreso",
      "updated_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Estado de tarea actualizado exitosamente"
}
```

---

## 4.7 Iniciar Tarea
**PATCH** `/tasks/:id/start`

### Descripción
Marca una tarea como iniciada (cambia estado a 'en_progreso').

### Acceso
- **Privado** (requiere permisos de gestión de tareas)
- **Permisos**: Admin, Responsables del proyecto, Usuario asignado

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID de la tarea

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "estado": "en_progreso",
      "updated_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Tarea iniciada exitosamente"
}
```

---

## 4.8 Completar Tarea
**PATCH** `/tasks/:id/complete`

### Descripción
Marca una tarea como completada.

### Acceso
- **Privado** (requiere permisos de gestión de tareas)
- **Permisos**: Admin, Responsables del proyecto, Usuario asignado

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID de la tarea

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "estado": "completada",
      "porcentaje_completado": 100,
      "updated_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Tarea completada exitosamente"
}
```

---

## 4.9 Cancelar Tarea
**PATCH** `/tasks/:id/cancel`

### Descripción
Marca una tarea como cancelada.

### Acceso
- **Privado** (requiere permisos de gestión de tareas)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID de la tarea

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "estado": "cancelada",
      "updated_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Tarea cancelada exitosamente"
}
```

---

## 4.10 Asignar Tarea a Usuario
**PATCH** `/tasks/:id/assign`

### Descripción
Asigna una tarea a un usuario específico.

### Acceso
- **Privado** (requiere permisos de gestión de tareas)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID de la tarea

### Parámetros del Body
```json
{
  "usuario_asignado_id": "number (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "usuario_asignado_id": 3,
      "usuario_asignado": {
        "id": 3,
        "nombre": "Carlos López"
      },
      "updated_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Tarea asignada exitosamente"
}
```

---

## 4.11 Desasignar Tarea
**PATCH** `/tasks/:id/unassign`

### Descripción
Remueve la asignación de una tarea.

### Acceso
- **Privado** (requiere permisos de gestión de tareas)
- **Permisos**: Admin, Responsables del proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID de la tarea

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "usuario_asignado_id": null,
      "updated_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Tarea desasignada exitosamente"
}
```

---

## 4.12 Obtener Archivos de Tarea
**GET** `/tasks/:id/files`

### Descripción
Obtiene todos los archivos asociados a una tarea.

### Acceso
- **Privado** (requiere acceso a la tarea)
- **Permisos**: Admin, Responsables del proyecto, Usuario asignado

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID de la tarea

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 1,
        "nombre_archivo": "archivo_1234567890.pdf",
        "nombre_original": "Documentación.pdf",
        "tipo": "PDF",
        "tamaño_bytes": 1048576,
        "subido_por": {
          "id": 2,
          "nombre": "María García"
        },
        "created_at": "2024-01-10T00:00:00.000Z"
      }
    ],
    "total": 3
  }
}
```

---

## 4.13 Obtener Tareas Asignadas
**GET** `/tasks/assigned`

### Descripción
Obtiene las tareas asignadas al usuario autenticado.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `estado` (opcional): Filtrar por estado
- `prioridad` (opcional): Filtrar por prioridad
- `proyecto_id` (opcional): Filtrar por proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "titulo": "Diseño de base de datos",
        "estado": "en_progreso",
        "prioridad": "alta",
        "proyecto": {
          "id": 1,
          "titulo": "Sistema de Gestión"
        },
        "fecha_fin": "2024-01-15",
        "porcentaje_completado": 75
      }
    ],
    "total": 5
  }
}
```

---

## 4.14 Obtener Tareas Gestionadas
**GET** `/tasks/managed`

### Descripción
Obtiene las tareas que el usuario autenticado puede gestionar (como responsable de proyecto).

### Acceso
- **Privado** (requiere permisos de gestión)
- **Roles permitidos**: Admin, Responsable de Proyecto

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "titulo": "Diseño de base de datos",
        "estado": "en_progreso",
        "usuario_asignado": {
          "id": 2,
          "nombre": "María García"
        },
        "proyecto": {
          "id": 1,
          "titulo": "Sistema de Gestión"
        }
      }
    ],
    "total": 15
  }
}
```

---

## 4.15 Buscar Tareas
**GET** `/tasks/search`

### Descripción
Busca tareas por título o descripción.

### Acceso
- **Privado** (filtrado según acceso del usuario)

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `q` (requerido): Término de búsqueda
- `proyecto_id` (opcional): Filtrar por proyecto
- `estado` (opcional): Filtrar por estado
- `limit` (opcional): Límite de resultados

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "titulo": "Diseño de base de datos",
        "descripcion": "Crear esquema de BD",
        "estado": "completada",
        "proyecto": {
          "id": 1,
          "titulo": "Sistema de Gestión"
        }
      }
    ],
    "total": 3
  }
}
```

---

## 4.16 Obtener Tareas por Estado
**GET** `/tasks/by-status/:status`

### Descripción
Obtiene tareas filtradas por un estado específico.

### Acceso
- **Privado** (filtrado según acceso del usuario)

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `status`: Estado de la tarea ('pendiente', 'en_progreso', 'completada', 'cancelada')

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "titulo": "Diseño de base de datos",
        "estado": "completada",
        "proyecto": {
          "id": 1,
          "titulo": "Sistema de Gestión"
        }
      }
    ],
    "total": 8
  }
}
```

---

## 4.17 Obtener Tareas por Prioridad
**GET** `/tasks/by-priority/:priority`

### Descripción
Obtiene tareas filtradas por prioridad.

### Acceso
- **Privado** (filtrado según acceso del usuario)

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `priority`: Prioridad ('baja', 'media', 'alta')

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "titulo": "Diseño de base de datos",
        "prioridad": "alta",
        "estado": "completada",
        "proyecto": {
          "id": 1,
          "titulo": "Sistema de Gestión"
        }
      }
    ],
    "total": 4
  }
}
```

---

## 4.18 Obtener Tareas por Proyecto
**GET** `/tasks/by-project/:projectId`

### Descripción
Obtiene todas las tareas de un proyecto específico.

### Acceso
- **Privado** (requiere acceso al proyecto)

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `projectId`: ID del proyecto

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "titulo": "Diseño de base de datos",
        "estado": "completada",
        "usuario_asignado": {
          "id": 2,
          "nombre": "María García"
        }
      }
    ],
    "total": 15
  }
}
```

---

## 4.19 Obtener Estadísticas de Tareas
**GET** `/tasks/stats/overview`

### Descripción
Obtiene estadísticas generales de tareas según el acceso del usuario.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_tareas": 25,
      "pendientes": 5,
      "en_progreso": 8,
      "completadas": 10,
      "canceladas": 2,
      "por_prioridad": {
        "alta": 6,
        "media": 12,
        "baja": 7
      },
      "mis_tareas_asignadas": 5,
      "tareas_vencidas": 2
    }
  }
}
```

---

## 4.20 Obtener Estadísticas de Usuario
**GET** `/tasks/stats/user`

### Descripción
Obtiene estadísticas de tareas específicas del usuario autenticado.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "stats": {
      "tareas_asignadas": 5,
      "tareas_completadas": 3,
      "tareas_en_progreso": 2,
      "tareas_pendientes": 0,
      "porcentaje_completado": 60,
      "horas_trabajadas_total": 120.5,
      "promedio_horas_por_tarea": 24.1,
      "tareas_vencidas": 1
    }
  }
}
```

---

## 4.21 Obtener Tareas Vencidas
**GET** `/tasks/overdue`

### Descripción
Obtiene las tareas que han pasado su fecha límite.

### Acceso
- **Privado** (filtrado según acceso del usuario)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 5,
        "titulo": "Tarea Vencida",
        "fecha_fin": "2024-01-10",
        "dias_vencida": 7,
        "estado": "en_progreso",
        "usuario_asignado": {
          "id": 2,
          "nombre": "María García"
        },
        "proyecto": {
          "id": 1,
          "titulo": "Sistema de Gestión"
        }
      }
    ],
    "total": 2
  }
}
```

---

## 4.22 Obtener Tareas Próximas
**GET** `/tasks/upcoming`

### Descripción
Obtiene las tareas que vencen próximamente.

### Acceso
- **Privado** (filtrado según acceso del usuario)

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `days` (opcional): Días hacia adelante (default: 7)

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 6,
        "titulo": "Tarea Próxima",
        "fecha_fin": "2024-01-20",
        "dias_restantes": 3,
        "estado": "en_progreso",
        "usuario_asignado": {
          "id": 2,
          "nombre": "María García"
        }
      }
    ],
    "total": 4
  }
}
```

---

# 5. ENDPOINTS DE GESTIÓN DE ROLES

## 5.1 Obtener Mis Roles
**GET** `/roles/my-roles`

### Descripción
Obtiene los roles del usuario autenticado.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": 2,
        "nombre": "responsable_proyecto",
        "activo": true,
        "fecha_asignacion": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 5.2 Verificar si Tengo Rol
**GET** `/roles/my-roles/has-role`

### Descripción
Verifica si el usuario autenticado tiene un rol específico.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `role` (requerido): Nombre del rol a verificar

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "hasRole": true,
    "role": "responsable_proyecto"
  }
}
```

---

## 5.3 Listar Todos los Roles
**GET** `/roles`

### Descripción
Obtiene la lista de todos los roles disponibles en el sistema.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": 1,
        "nombre": "administrador",
        "activo": true,
        "usuarios_count": 2,
        "created_at": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": 2,
        "nombre": "responsable_proyecto",
        "activo": true,
        "usuarios_count": 5,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 5.4 Obtener Roles de Usuario
**GET** `/roles/user/:userId`

### Descripción
Obtiene los roles de un usuario específico.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `userId`: ID del usuario

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "nombre": "María García",
      "email": "maria@example.com"
    },
    "roles": [
      {
        "id": 2,
        "nombre": "responsable_proyecto",
        "activo": true,
        "fecha_asignacion": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 5.5 Verificar si Usuario Tiene Rol
**GET** `/roles/user/:userId/has-role`

### Descripción
Verifica si un usuario específico tiene un rol determinado.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `userId`: ID del usuario

### Query Parameters
- `role` (requerido): Nombre del rol a verificar

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "user_id": 2,
    "hasRole": true,
    "role": "responsable_proyecto"
  }
}
```

---

## 5.6 Verificar si Usuario Tiene Algún Rol
**GET** `/roles/user/:userId/has-any-role`

### Descripción
Verifica si un usuario tiene alguno de los roles especificados.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `userId`: ID del usuario

### Query Parameters
- `roles` (requerido): Lista de roles separados por coma

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "user_id": 2,
    "hasAnyRole": true,
    "matchedRoles": ["responsable_proyecto"]
  }
}
```

---

## 5.7 Obtener Usuarios por Rol
**GET** `/roles/:roleIdentifier/users`

### Descripción
Obtiene todos los usuarios que tienen un rol específico.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `roleIdentifier`: ID o nombre del rol

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "role": {
      "id": 2,
      "nombre": "responsable_proyecto"
    },
    "users": [
      {
        "id": 2,
        "nombre": "María García",
        "email": "maria@example.com",
        "activo": true,
        "fecha_asignacion": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 5
  }
}
```

---

## 5.8 Obtener Estadísticas de Roles
**GET** `/roles/statistics`

### Descripción
Obtiene estadísticas generales sobre los roles del sistema.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_roles": 4,
      "roles_activos": 4,
      "total_asignaciones": 12,
      "usuarios_con_roles": 8,
      "usuarios_sin_roles": 2,
      "roles_mas_asignados": [
        {
          "rol": "responsable_proyecto",
          "asignaciones": 5
        },
        {
          "rol": "responsable_tarea",
          "asignaciones": 4
        }
      ]
    }
  }
}
```

---

## 5.9 Crear Nuevo Rol
**POST** `/roles`

### Descripción
Crea un nuevo rol en el sistema.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "nombre": "string (requerido, único)",
  "activo": "boolean (opcional, default: true)"
}
```

### Respuesta Exitosa (201)
```json
{
  "success": true,
  "data": {
    "role": {
      "id": 5,
      "nombre": "nuevo_rol",
      "activo": true,
      "created_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Rol creado exitosamente"
}
```

---

## 5.10 Asignar Rol a Usuario
**POST** `/roles/assign`

### Descripción
Asigna un rol específico a un usuario.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "usuario_id": "number (requerido)",
  "rol_id": "number (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Rol asignado exitosamente"
}
```

---

## 5.11 Remover Rol de Usuario
**DELETE** `/roles/remove`

### Descripción
Remueve un rol específico de un usuario.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "usuario_id": "number (requerido)",
  "rol_id": "number (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Rol removido exitosamente"
}
```

---

## 5.12 Asignar Múltiples Roles
**POST** `/roles/assign-multiple`

### Descripción
Asigna múltiples roles a un usuario de una vez.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "usuario_id": "number (requerido)",
  "rol_ids": "array of numbers (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "asignados": 3,
    "ya_existentes": 1
  },
  "message": "Roles asignados exitosamente"
}
```

---

## 5.13 Remover Múltiples Roles
**DELETE** `/roles/remove-multiple`

### Descripción
Remueve múltiples roles de un usuario de una vez.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "usuario_id": "number (requerido)",
  "rol_ids": "array of numbers (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "removidos": 2,
    "no_encontrados": 1
  },
  "message": "Roles removidos exitosamente"
}
```

---

## 5.14 Sincronizar Roles de Usuario
**PUT** `/roles/sync`

### Descripción
Sincroniza los roles de un usuario (reemplaza todos los roles actuales).

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "usuario_id": "number (requerido)",
  "rol_ids": "array of numbers (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "roles_anteriores": 2,
    "roles_nuevos": 3,
    "sincronizados": true
  },
---

# 6. ENDPOINTS DE GESTIÓN DE ARCHIVOS

## 6.1 Subir Archivo de Tarea
**POST** `/files/tasks/:taskId/upload`

### Descripción
Sube un archivo asociado a una tarea específica.

### Acceso
- **Privado** (requiere acceso a la tarea)
- **Permisos**: Admin, Responsables del proyecto, Usuario asignado

### Headers
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

### Parámetros de Ruta
- `taskId`: ID de la tarea

### Parámetros del Body (Form Data)
- `file`: Archivo a subir (requerido)
- `descripcion`: Descripción del archivo (opcional)

### Respuesta Exitosa (201)
```json
{
  "success": true,
  "data": {
    "file": {
      "id": 1,
      "nombre_archivo": "archivo_1234567890.pdf",
      "nombre_original": "Documentación.pdf",
      "tipo": "PDF",
      "tamaño_bytes": 1048576,
      "descripcion": "Documentación técnica",
      "tarea_id": 1,
      "subido_por": 2,
      "created_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Archivo subido exitosamente"
}
```

---

## 6.2 Obtener Archivo
**GET** `/files/:id`

### Descripción
Obtiene la información de un archivo específico.

### Acceso
- **Privado** (requiere acceso al archivo)
- **Permisos**: Admin, Responsables del proyecto, Usuario asignado, Subidor del archivo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del archivo

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "file": {
      "id": 1,
      "nombre_archivo": "archivo_1234567890.pdf",
      "nombre_original": "Documentación.pdf",
      "tipo": "PDF",
      "tamaño_bytes": 1048576,
      "descripcion": "Documentación técnica",
      "tarea": {
        "id": 1,
        "titulo": "Diseño de base de datos"
      },
      "subido_por": {
        "id": 2,
        "nombre": "María García"
      },
      "created_at": "2024-01-17T00:00:00.000Z"
    }
  }
}
```

---

## 6.3 Descargar Archivo
**GET** `/files/:id/download`

### Descripción
Descarga un archivo específico.

### Acceso
- **Privado** (requiere acceso al archivo)
- **Permisos**: Admin, Responsables del proyecto, Usuario asignado, Subidor del archivo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del archivo

### Respuesta Exitosa (200)
- **Content-Type**: Tipo MIME del archivo
- **Content-Disposition**: attachment; filename="nombre_original.ext"
- **Body**: Contenido binario del archivo

---

## 6.4 Actualizar Archivo
**PUT** `/files/:id`

### Descripción
Actualiza la información de un archivo (no el contenido).

### Acceso
- **Privado** (requiere permisos de actualización)
- **Permisos**: Admin, Responsables del proyecto, Subidor del archivo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del archivo

### Parámetros del Body
```json
{
  "descripcion": "string (opcional)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "file": {
      "id": 1,
      "descripcion": "Nueva descripción",
      "updated_at": "2024-01-17T00:00:00.000Z"
    }
  },
  "message": "Archivo actualizado exitosamente"
}
```

---

## 6.5 Eliminar Archivo
**DELETE** `/files/:id`

### Descripción
Elimina un archivo del sistema.

### Acceso
- **Privado** (requiere permisos de eliminación)
- **Permisos**: Admin, Responsables del proyecto, Subidor del archivo

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `id`: ID del archivo

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Archivo eliminado exitosamente"
}
```

---

## 6.6 Obtener Mis Archivos
**GET** `/files/my-files`

### Descripción
Obtiene todos los archivos subidos por el usuario autenticado.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 10)
- `tipo` (opcional): Filtrar por tipo de archivo

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 1,
        "nombre_original": "Documentación.pdf",
        "tipo": "PDF",
        "tamaño_bytes": 1048576,
        "tarea": {
          "id": 1,
          "titulo": "Diseño de base de datos"
        },
        "created_at": "2024-01-17T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

## 6.7 Obtener Estadísticas de Archivos
**GET** `/files/stats`

### Descripción
Obtiene estadísticas generales de archivos según el acceso del usuario.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_archivos": 25,
      "mis_archivos": 8,
      "tamaño_total_bytes": 52428800,
      "tamaño_total_mb": 50,
      "por_tipo": {
        "PDF": 10,
        "DOCX": 8,
        "XLSX": 4,
        "IMG": 3
      },
      "archivos_recientes": 5
    }
  }
}
```

---

## 6.8 Obtener Estadísticas de Usuario
**GET** `/files/stats/user`

### Descripción
Obtiene estadísticas de archivos específicas del usuario autenticado.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "stats": {
      "archivos_subidos": 8,
      "tamaño_total_bytes": 20971520,
      "tamaño_total_mb": 20,
      "por_tipo": {
        "PDF": 4,
        "DOCX": 3,
        "XLSX": 1
      },
      "ultimo_archivo": "2024-01-17T00:00:00.000Z",
      "promedio_tamaño_mb": 2.5
    }
  }
}
```

---

## 6.9 Buscar Archivos
**GET** `/files/search`

### Descripción
Busca archivos por nombre o descripción.

### Acceso
- **Privado** (filtrado según acceso del usuario)

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `q` (requerido): Término de búsqueda
- `tipo` (opcional): Filtrar por tipo
- `limit` (opcional): Límite de resultados

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 1,
        "nombre_original": "Documentación.pdf",
        "tipo": "PDF",
        "descripcion": "Documentación técnica",
        "tarea": {
          "id": 1,
          "titulo": "Diseño de base de datos"
        }
      }
    ],
    "total": 3
  }
}
```

---

## 6.10 Filtrar Archivos por Tipo MIME
**GET** `/files/by-mime/:mimeType`

### Descripción
Obtiene archivos filtrados por tipo MIME.

### Acceso
- **Privado** (filtrado según acceso del usuario)

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `mimeType`: Tipo MIME (ej: 'application/pdf', 'image/jpeg')

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 1,
        "nombre_original": "Documentación.pdf",
        "tipo": "PDF",
        "mime_type": "application/pdf",
        "tamaño_bytes": 1048576
      }
    ],
    "total": 10
  }
}
```

---

## 6.11 Obtener Archivos Recientes
**GET** `/files/recent`

### Descripción
Obtiene los archivos más recientes según el acceso del usuario.

### Acceso
- **Privado** (filtrado según acceso del usuario)

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `limit` (opcional): Límite de resultados (default: 10)
- `days` (opcional): Días hacia atrás (default: 7)

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 1,
        "nombre_original": "Documentación.pdf",
        "tipo": "PDF",
        "subido_por": {
          "id": 2,
          "nombre": "María García"
        },
        "created_at": "2024-01-17T00:00:00.000Z"
      }
    ],
    "total": 5
  }
}
```

---

## 6.12 Obtener Todos los Archivos (Admin)
**GET** `/files/admin/all`

### Descripción
Obtiene todos los archivos del sistema (solo administradores).

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `page` (opcional): Número de página
- `limit` (opcional): Elementos por página
- `tipo` (opcional): Filtrar por tipo

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 1,
        "nombre_original": "Documentación.pdf",
        "tipo": "PDF",
        "tamaño_bytes": 1048576,
        "tarea": {
          "id": 1,
          "titulo": "Diseño de base de datos"
        },
        "subido_por": {
          "id": 2,
          "nombre": "María García"
        },
        "created_at": "2024-01-17T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

---

## 6.13 Limpiar Archivos Huérfanos (Admin)
**DELETE** `/files/admin/cleanup-orphans`

### Descripción
Elimina archivos que no están asociados a ninguna tarea (solo administradores).

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "archivos_eliminados": 3,
    "espacio_liberado_bytes": 5242880,
    "espacio_liberado_mb": 5
  },
  "message": "Limpieza de archivos huérfanos completada"
}
```

---

## 6.14 Validar Archivo Pre-subida
**POST** `/files/validate/pre-upload`

### Descripción
Valida un archivo antes de subirlo (tamaño, tipo, etc.).

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros del Body
```json
{
  "filename": "string (requerido)",
  "size": "number (requerido, bytes)",
  "mimetype": "string (requerido)"
}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "valid": true,
    "checks": {
      "size_valid": true,
      "type_allowed": true,
      "extension_valid": true
    }
  },
  "message": "Archivo válido para subida"
}
```

---

## 6.15 Obtener Tipos de Archivo Permitidos
**GET** `/files/validate/allowed-types`

### Descripción
Obtiene la lista de tipos de archivo permitidos en el sistema.

### Acceso
- **Privado** (requiere autenticación)

### Headers
```
Authorization: Bearer <access_token>
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "allowed_types": [
      {
        "extension": ".pdf",
        "mime_type": "application/pdf",
        "max_size_mb": 10
      },
      {
        "extension": ".docx",
        "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "max_size_mb": 5
      },
      {
        "extension": ".xlsx",
        "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "max_size_mb": 5
      },
      {
        "extension": ".jpg",
        "mime_type": "image/jpeg",
        "max_size_mb": 2
      },
      {
        "extension": ".png",
        "mime_type": "image/png",
        "max_size_mb": 2
      }
    ],
    "global_max_size_mb": 10
  }
}
```

---

# 7. ENDPOINTS DE AUDITORÍA

## 7.1 Obtener Logs de Auditoría de Roles
**GET** `/audit/roles`

### Descripción
Obtiene los logs de auditoría relacionados con cambios de roles.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 10)
- `fecha_inicio` (opcional): Fecha de inicio (YYYY-MM-DD)
- `fecha_fin` (opcional): Fecha de fin (YYYY-MM-DD)
- `usuario_id` (opcional): Filtrar por usuario
- `accion` (opcional): Filtrar por tipo de acción

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "accion": "rol_asignado",
        "descripcion": "Rol 'responsable_proyecto' asignado al usuario María García",
        "usuario_afectado": {
          "id": 2,
          "nombre": "María García",
          "email": "maria@example.com"
        },
        "realizado_por": {
          "id": 1,
          "nombre": "Juan Pérez"
        },
        "detalles": {
          "rol_id": 2,
          "rol_nombre": "responsable_proyecto"
        },
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0...",
        "created_at": "2024-01-17T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

## 7.2 Obtener Logs por Usuario
**GET** `/audit/roles/user/:userId`

### Descripción
Obtiene los logs de auditoría de roles para un usuario específico.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `userId`: ID del usuario

### Query Parameters
- `page` (opcional): Número de página
- `limit` (opcional): Elementos por página
- `accion` (opcional): Filtrar por tipo de acción

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "nombre": "María García",
      "email": "maria@example.com"
    },
    "logs": [
      {
        "id": 1,
        "accion": "rol_asignado",
        "descripcion": "Rol 'responsable_proyecto' asignado",
        "realizado_por": {
          "id": 1,
          "nombre": "Juan Pérez"
        },
        "detalles": {
          "rol_id": 2,
          "rol_nombre": "responsable_proyecto"
        },
        "created_at": "2024-01-17T10:30:00.000Z"
      }
    ],
    "total": 5
  }
}
```

---

## 7.3 Obtener Logs por Acción
**GET** `/audit/roles/action/:action`

### Descripción
Obtiene los logs de auditoría filtrados por tipo de acción.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Parámetros de Ruta
- `action`: Tipo de acción ('rol_asignado', 'rol_removido', 'rol_creado', etc.)

### Query Parameters
- `page` (opcional): Número de página
- `limit` (opcional): Elementos por página
- `fecha_inicio` (opcional): Fecha de inicio
- `fecha_fin` (opcional): Fecha de fin

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "action": "rol_asignado",
    "logs": [
      {
        "id": 1,
        "descripcion": "Rol 'responsable_proyecto' asignado al usuario María García",
        "usuario_afectado": {
          "id": 2,
          "nombre": "María García"
        },
        "realizado_por": {
          "id": 1,
          "nombre": "Juan Pérez"
        },
        "created_at": "2024-01-17T10:30:00.000Z"
      }
    ],
    "total": 12
  }
}
```

---

## 7.4 Obtener Resumen de Auditoría
**GET** `/audit/roles/summary`

### Descripción
Obtiene un resumen estadístico de la actividad de auditoría de roles.

### Acceso
- **Privado** (requiere permisos de administrador)
- **Roles permitidos**: Admin

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `fecha_inicio` (opcional): Fecha de inicio para el resumen
- `fecha_fin` (opcional): Fecha de fin para el resumen

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_eventos": 45,
      "por_accion": {
        "rol_asignado": 20,
        "rol_removido": 15,
        "rol_creado": 5,
        "rol_actualizado": 3,
        "rol_eliminado": 2
      },
      "usuarios_mas_activos": [
        {
          "usuario": "Juan Pérez",
          "eventos": 25
        },
        {
          "usuario": "Admin Sistema",
          "eventos": 20
        }
      ],
      "actividad_por_dia": [
        {
          "fecha": "2024-01-17",
          "eventos": 8
        },
        {
          "fecha": "2024-01-16",
          "eventos": 12
        }
      ],
      "periodo": {
        "fecha_inicio": "2024-01-01",
        "fecha_fin": "2024-01-17"
      }
    }
  }
}
```

---

# 8. CÓDIGOS DE ERROR COMUNES

## 8.1 Errores de Autenticación (401)
```json
{
  "success": false,
  "message": "Token no proporcionado",
  "code": "AUTH_TOKEN_MISSING"
}
```

```json
{
  "success": false,
  "message": "Token inválido o expirado",
  "code": "AUTH_TOKEN_INVALID"
}
```

## 8.2 Errores de Autorización (403)
```json
{
  "success": false,
  "message": "No tienes permisos para realizar esta acción",
  "code": "AUTH_INSUFFICIENT_PERMISSIONS"
}
```

```json
{
  "success": false,
  "message": "Acceso denegado al recurso",
  "code": "AUTH_ACCESS_DENIED"
}
```

## 8.3 Errores de Validación (400)
```json
{
  "success": false,
  "message": "Datos de entrada inválidos",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "El email es requerido"
    },
    {
      "field": "contraseña",
      "message": "La contraseña debe tener al menos 6 caracteres"
    }
  ]
}
```

## 8.4 Errores de Recurso No Encontrado (404)
```json
{
  "success": false,
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

```json
{
  "success": false,
  "message": "Proyecto no encontrado",
  "code": "PROJECT_NOT_FOUND"
}
```

```json
{
  "success": false,
  "message": "Tarea no encontrada",
  "code": "TASK_NOT_FOUND"
}
```

## 8.5 Errores de Conflicto (409)
```json
{
  "success": false,
  "message": "El email ya está registrado",
  "code": "EMAIL_ALREADY_EXISTS"
}
```

```json
{
  "success": false,
  "message": "El rol ya está asignado al usuario",
  "code": "ROLE_ALREADY_ASSIGNED"
}
```

## 8.6 Errores de Servidor (500)
```json
{
  "success": false,
  "message": "Error interno del servidor",
  "code": "INTERNAL_SERVER_ERROR"
}
```

```json
{
  "success": false,
  "message": "Error de conexión a la base de datos",
  "code": "DATABASE_CONNECTION_ERROR"
}
```

---

# 9. EJEMPLOS DE USO

## 9.1 Flujo de Autenticación Completo

### 1. Registro de Usuario
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "contraseña": "password123",
    "telefono": "+1234567890"
  }'
```

### 2. Inicio de Sesión
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "contraseña": "password123"
  }'
```

### 3. Uso del Token
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 9.2 Gestión de Proyectos

### 1. Crear Proyecto
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Sistema de Gestión",
    "descripcion": "Desarrollo de sistema web",
    "fecha_inicio": "2024-01-01",
    "fecha_fin": "2024-06-01"
  }'
```

### 2. Asignar Responsable
```bash
curl -X POST http://localhost:3000/api/projects/1/responsibles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "usuario_id": 2,
    "rol_responsabilidad": "responsable"
  }'
```

### 3. Crear Tarea en Proyecto
```bash
curl -X POST http://localhost:3000/api/projects/1/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Diseño de base de datos",
    "descripcion": "Crear esquema de BD",
    "fecha_inicio": "2024-01-01",
    "fecha_fin": "2024-01-15",
    "prioridad": "alta",
    "usuario_asignado_id": 2
  }'
```

## 9.3 Gestión de Archivos

### 1. Subir Archivo a Tarea
```bash
curl -X POST http://localhost:3000/api/files/tasks/1/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/document.pdf" \
  -F "descripcion=Documentación técnica"
```

### 2. Descargar Archivo
```bash
curl -X GET http://localhost:3000/api/files/1/download \
  -H "Authorization: Bearer <token>" \
  -o downloaded_file.pdf
```

---

# 10. NOTAS ADICIONALES

## 10.1 Rate Limiting
- **Autenticación**: 5 intentos por IP cada 15 minutos
- **Cambio de contraseña**: 5 intentos por usuario cada 15 minutos
- **Subida de archivos**: 10 archivos por usuario cada hora
- **API general**: 1000 requests por usuario cada hora

## 10.2 Tamaños de Archivo
- **Máximo por archivo**: 10 MB
- **Tipos permitidos**: PDF, DOCX, XLSX, JPG, PNG, GIF
- **Total por usuario**: 100 MB

## 10.3 Paginación
- **Límite por defecto**: 10 elementos
- **Límite máximo**: 100 elementos
- **Parámetros**: `page` (número de página), `limit` (elementos por página)

## 10.4 Filtros y Búsqueda
- **Búsqueda de texto**: Insensible a mayúsculas/minúsculas
- **Filtros de fecha**: Formato ISO 8601 (YYYY-MM-DD)
- **Ordenamiento**: Parámetro `sort` con valores como `created_at`, `-created_at` (descendente)

## 10.5 Websockets (Tiempo Real)
- **Endpoint**: `ws://localhost:3000/ws`
- **Autenticación**: Token JWT en query parameter `?token=<jwt_token>`
- **Eventos**: Actualizaciones de tareas, proyectos, notificaciones

## 10.6 Versionado de API
- **Versión actual**: v1
- **Header**: `Accept: application/vnd.api+json;version=1`
- **URL**: Todas las rutas incluyen `/api/` como prefijo

---

**Documentación generada el**: 2024-01-17  
**Versión del sistema**: 1.0.0  
**Última actualización**: 2024-01-17