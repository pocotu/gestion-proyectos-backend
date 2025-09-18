/**
 * Permissions - Definiciones de permisos por rol
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo define permisos y roles
 * - Open/Closed: Abierto para extensión (nuevos permisos/roles)
 * - Liskov Substitution: Puede ser sustituido por otros sistemas de permisos
 * - Interface Segregation: Permisos específicos por dominio
 * - Dependency Inversion: Abstracciones para validación de permisos
 */

// ============================================================================
// ROLES DEL SISTEMA
// ============================================================================

const ROLES = {
  ADMIN: 'admin',
  RESPONSABLE_PROYECTO: 'responsable_proyecto',
  RESPONSABLE_TAREA: 'responsable_tarea'
};

// ============================================================================
// ACCIONES/PERMISOS POR DOMINIO
// ============================================================================

const PERMISSIONS = {
  // Gestión de Usuarios
  USERS: {
    CREATE: 'users:create',
    READ: 'users:read',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    LIST_ALL: 'users:list_all',
    MANAGE_ROLES: 'users:manage_roles',
    VIEW_PROFILE: 'users:view_profile',
    UPDATE_PROFILE: 'users:update_profile'
  },

  // Gestión de Proyectos
  PROJECTS: {
    CREATE: 'projects:create',
    READ: 'projects:read',
    UPDATE: 'projects:update',
    DELETE: 'projects:delete',
    LIST_ALL: 'projects:list_all',
    LIST_ASSIGNED: 'projects:list_assigned',
    ASSIGN_RESPONSABLES: 'projects:assign_responsables',
    MANAGE_FILES: 'projects:manage_files'
  },

  // Gestión de Tareas
  TASKS: {
    CREATE: 'tasks:create',
    READ: 'tasks:read',
    UPDATE: 'tasks:update',
    DELETE: 'tasks:delete',
    LIST_ALL: 'tasks:list_all',
    LIST_ASSIGNED: 'tasks:list_assigned',
    ASSIGN_USER: 'tasks:assign_user',
    CHANGE_STATUS: 'tasks:change_status',
    MANAGE_FILES: 'tasks:manage_files'
  },

  // Gestión de Archivos
  FILES: {
    UPLOAD: 'files:upload',
    DOWNLOAD: 'files:download',
    DELETE: 'files:delete',
    LIST: 'files:list',
    VIEW_METADATA: 'files:view_metadata'
  },

  // Gestión de Roles
  ROLES: {
    CREATE: 'roles:create',
    READ: 'roles:read',
    UPDATE: 'roles:update',
    DELETE: 'roles:delete',
    ASSIGN: 'roles:assign',
    REMOVE: 'roles:remove'
  },

  // Logs y Auditoría
  LOGS: {
    READ: 'logs:read',
    EXPORT: 'logs:export',
    DELETE: 'logs:delete'
  }
};

// ============================================================================
// DEFINICIÓN DE PERMISOS POR ROL
// ============================================================================

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Acceso total - gestión de usuarios y roles
    ...Object.values(PERMISSIONS.USERS),
    ...Object.values(PERMISSIONS.PROJECTS),
    ...Object.values(PERMISSIONS.TASKS),
    ...Object.values(PERMISSIONS.FILES),
    ...Object.values(PERMISSIONS.ROLES),
    ...Object.values(PERMISSIONS.LOGS)
  ],

  [ROLES.RESPONSABLE_PROYECTO]: [
    // Gestión de proyectos asignados, asignación de tareas
    PERMISSIONS.USERS.VIEW_PROFILE,
    PERMISSIONS.USERS.UPDATE_PROFILE,
    PERMISSIONS.USERS.READ, // Para asignar usuarios a tareas
    
    PERMISSIONS.PROJECTS.CREATE,
    PERMISSIONS.PROJECTS.READ,
    PERMISSIONS.PROJECTS.UPDATE,
    PERMISSIONS.PROJECTS.LIST_ASSIGNED,
    PERMISSIONS.PROJECTS.ASSIGN_RESPONSABLES,
    PERMISSIONS.PROJECTS.MANAGE_FILES,
    
    PERMISSIONS.TASKS.CREATE,
    PERMISSIONS.TASKS.READ,
    PERMISSIONS.TASKS.UPDATE,
    PERMISSIONS.TASKS.DELETE,
    PERMISSIONS.TASKS.LIST_ALL, // Solo de sus proyectos
    PERMISSIONS.TASKS.ASSIGN_USER,
    PERMISSIONS.TASKS.CHANGE_STATUS,
    PERMISSIONS.TASKS.MANAGE_FILES,
    
    PERMISSIONS.FILES.UPLOAD,
    PERMISSIONS.FILES.DOWNLOAD,
    PERMISSIONS.FILES.DELETE,
    PERMISSIONS.FILES.LIST,
    PERMISSIONS.FILES.VIEW_METADATA
  ],

  [ROLES.RESPONSABLE_TAREA]: [
    // Gestión de tareas asignadas, upload de archivos
    PERMISSIONS.USERS.VIEW_PROFILE,
    PERMISSIONS.USERS.UPDATE_PROFILE,
    
    PERMISSIONS.PROJECTS.READ, // Solo proyectos donde tiene tareas
    PERMISSIONS.PROJECTS.LIST_ASSIGNED,
    
    PERMISSIONS.TASKS.READ,
    PERMISSIONS.TASKS.UPDATE, // Solo tareas asignadas
    PERMISSIONS.TASKS.LIST_ASSIGNED,
    PERMISSIONS.TASKS.CHANGE_STATUS, // Solo tareas asignadas
    PERMISSIONS.TASKS.MANAGE_FILES, // Solo tareas asignadas
    
    PERMISSIONS.FILES.UPLOAD,
    PERMISSIONS.FILES.DOWNLOAD,
    PERMISSIONS.FILES.DELETE, // Solo archivos propios
    PERMISSIONS.FILES.LIST,
    PERMISSIONS.FILES.VIEW_METADATA
  ]
};

// ============================================================================
// FUNCIONES DE UTILIDAD PARA VALIDACIÓN DE PERMISOS
// ============================================================================

/**
 * Verifica si un rol tiene un permiso específico
 * @param {string} role - Nombre del rol
 * @param {string} permission - Permiso a verificar
 * @returns {boolean} - True si el rol tiene el permiso
 */
function roleHasPermission(role, permission) {
  if (!ROLE_PERMISSIONS[role]) {
    return false;
  }
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Verifica si un usuario (con múltiples roles) tiene un permiso específico
 * @param {Array<string>} userRoles - Array de roles del usuario
 * @param {string} permission - Permiso a verificar
 * @returns {boolean} - True si alguno de los roles tiene el permiso
 */
function userHasPermission(userRoles, permission) {
  if (!Array.isArray(userRoles) || userRoles.length === 0) {
    return false;
  }
  
  return userRoles.some(role => roleHasPermission(role, permission));
}

/**
 * Obtiene todos los permisos de un usuario basado en sus roles
 * @param {Array<string>} userRoles - Array de roles del usuario
 * @returns {Array<string>} - Array de permisos únicos
 */
function getUserPermissions(userRoles) {
  if (!Array.isArray(userRoles) || userRoles.length === 0) {
    return [];
  }
  
  const allPermissions = new Set();
  
  userRoles.forEach(role => {
    if (ROLE_PERMISSIONS[role]) {
      ROLE_PERMISSIONS[role].forEach(permission => {
        allPermissions.add(permission);
      });
    }
  });
  
  return Array.from(allPermissions);
}

/**
 * Verifica si un usuario puede acceder a un recurso específico
 * @param {Array<string>} userRoles - Array de roles del usuario
 * @param {string} resource - Tipo de recurso (project, task, file)
 * @param {string} action - Acción a realizar
 * @param {Object} context - Contexto adicional (ownerId, projectId, etc.)
 * @returns {boolean} - True si puede acceder
 */
function canAccessResource(userRoles, resource, action, context = {}) {
  // Admin siempre tiene acceso
  if (userRoles.includes(ROLES.ADMIN)) {
    return true;
  }
  
  const permission = `${resource}:${action}`;
  
  // Verificar permiso básico
  if (!userHasPermission(userRoles, permission)) {
    return false;
  }
  
  // Verificaciones adicionales basadas en contexto
  switch (resource) {
    case 'projects':
      // Responsable de proyecto puede gestionar solo proyectos asignados
      if (userRoles.includes(ROLES.RESPONSABLE_PROYECTO)) {
        return context.isAssignedToProject || action === 'create';
      }
      break;
      
    case 'tasks':
      // Responsable de tarea solo puede gestionar tareas asignadas
      if (userRoles.includes(ROLES.RESPONSABLE_TAREA) && !userRoles.includes(ROLES.RESPONSABLE_PROYECTO)) {
        return context.isAssignedToTask || context.isProjectResponsible;
      }
      break;
      
    case 'files':
      // Verificar propiedad del archivo o acceso al proyecto/tarea
      return context.isOwner || context.hasProjectAccess || context.hasTaskAccess;
  }
  
  return true;
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  roleHasPermission,
  userHasPermission,
  getUserPermissions,
  canAccessResource
};