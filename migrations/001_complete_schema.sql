-- ========================================
-- MIGRACIÓN COMPACTADA: Schema Completo + Seeds + Cloudinary
-- Combina: 001_initial_schema + 002_seed_roles + 003_expand_file_types
-- ========================================

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    estado BOOLEAN DEFAULT TRUE,
    es_administrador BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Tabla Usuario-Rol
CREATE TABLE IF NOT EXISTS usuario_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    rol_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_usuario_rol (usuario_id, rol_id)
);

-- Tabla de Proyectos
CREATE TABLE IF NOT EXISTS proyectos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    estado ENUM('planificacion', 'en_progreso', 'completado', 'cancelado') DEFAULT 'planificacion',
    creado_por INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

-- Tabla Responsables Proyecto
CREATE TABLE IF NOT EXISTS proyecto_responsables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    rol_responsabilidad ENUM('responsable_principal','responsable_secundario','colaborador','supervisor') DEFAULT 'colaborador',
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATE DEFAULT NULL,
    asignado_por INT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE KEY unique_project_user_role (proyecto_id, usuario_id, rol_responsabilidad)
);

-- Tabla de Tareas
CREATE TABLE IF NOT EXISTS tareas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    estado ENUM('pendiente', 'en_progreso', 'completada', 'cancelada') DEFAULT 'pendiente',
    prioridad ENUM('baja', 'media', 'alta') DEFAULT 'media',
    proyecto_id INT NOT NULL,
    usuario_asignado_id INT,
    creado_por INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

-- Tabla de Asignaciones de Tareas (Muchos a Muchos)
-- Permite asignar múltiples usuarios a una misma tarea
CREATE TABLE IF NOT EXISTS tarea_asignaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarea_id INT NOT NULL,
    usuario_id INT NOT NULL,
    rol_asignacion ENUM('responsable_principal', 'colaborador', 'revisor') DEFAULT 'colaborador',
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    asignado_por INT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE KEY unique_tarea_usuario (tarea_id, usuario_id)
);

-- Tabla Archivos Proyecto (CON SOPORTE CLOUDINARY)
CREATE TABLE IF NOT EXISTS archivos_proyecto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT NOT NULL,
    nombre_archivo VARCHAR(200) NOT NULL,
    nombre_original VARCHAR(200) NOT NULL,
    tipo VARCHAR(10) DEFAULT NULL,
    tipo_mime VARCHAR(100),
    tamaño_bytes INT,
    ruta_archivo VARCHAR(500) NOT NULL,
    subido_por INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (subido_por) REFERENCES usuarios(id)
);

-- Tabla Archivos Tarea (CON SOPORTE CLOUDINARY)
CREATE TABLE IF NOT EXISTS archivos_tarea (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarea_id INT NOT NULL,
    nombre_archivo VARCHAR(200) NOT NULL,
    nombre_original VARCHAR(200) NOT NULL,
    tipo VARCHAR(10) DEFAULT NULL,
    tipo_mime VARCHAR(100),
    tamaño_bytes INT,
    ruta_archivo VARCHAR(500) NOT NULL,
    subido_por INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
    FOREIGN KEY (subido_por) REFERENCES usuarios(id)
);

-- Tabla Logs Actividad
CREATE TABLE IF NOT EXISTS logs_actividad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    accion VARCHAR(100) NOT NULL,
    entidad_tipo VARCHAR(50) NOT NULL,
    entidad_id INT NOT NULL,
    descripcion TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Indices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_proyectos_creado_por ON proyectos(creado_por);
CREATE INDEX idx_tareas_proyecto ON tareas(proyecto_id);
CREATE INDEX idx_tareas_usuario ON tareas(usuario_asignado_id);
CREATE INDEX idx_tarea_asignaciones_tarea ON tarea_asignaciones(tarea_id);
CREATE INDEX idx_tarea_asignaciones_usuario ON tarea_asignaciones(usuario_id);

-- Seed Roles por defecto
INSERT INTO roles (nombre) VALUES ('admin'), ('responsable_proyecto'), ('responsable_tarea')
ON DUPLICATE KEY UPDATE nombre = nombre;
