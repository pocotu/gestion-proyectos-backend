-- Migración: Agregar tabla refresh_tokens para manejo de tokens de refresco
-- Fecha: 2024-01-XX
-- Descripción: Implementa sistema de refresh tokens y blacklist para logout seguro

USE gestion_proyectos;

-- Tabla de Refresh Tokens
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(500) NOT NULL UNIQUE,
    usuario_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de Tokens Blacklist (para logout)
CREATE TABLE token_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_jti VARCHAR(255) NOT NULL UNIQUE, -- JWT ID para identificar tokens únicos
    usuario_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para mejorar performance
CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(is_revoked);

CREATE INDEX idx_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX idx_blacklist_usuario ON token_blacklist(usuario_id);
CREATE INDEX idx_blacklist_expires ON token_blacklist(expires_at);

-- Procedimiento para limpiar tokens expirados (mantenimiento)
DELIMITER //
CREATE PROCEDURE CleanExpiredTokens()
BEGIN
    -- Limpiar refresh tokens expirados
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() OR is_revoked = TRUE;
    
    -- Limpiar tokens blacklist expirados
    DELETE FROM token_blacklist 
    WHERE expires_at < NOW();
END //
DELIMITER ;

-- Evento para ejecutar limpieza automática cada hora
CREATE EVENT IF NOT EXISTS CleanTokensEvent
ON SCHEDULE EVERY 1 HOUR
DO
  CALL CleanExpiredTokens();