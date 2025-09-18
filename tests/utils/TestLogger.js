/**
 * TestLogger - Clase para logging en tests de integración
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo se encarga del logging
 * - Open/Closed: Extensible para nuevos tipos de logs
 * - Interface Segregation: Métodos específicos para cada tipo de log
 */

class TestLogger {
  constructor(options = {}) {
    this.verbose = options.verbose !== false; // Por defecto verbose
    this.colors = options.colors !== false; // Por defecto con colores
    this.prefix = options.prefix || '[TEST]';
  }

  /**
   * Log de información general
   */
  info(message, data = null) {
    if (!this.verbose) return;
    
    console.log(`\n🔵 ${this.prefix} [INFO] ${message}`);
    if (data) {
      this._logData('📋 Datos:', data);
    }
  }

  /**
   * Log de éxito
   */
  success(message, data = null) {
    if (!this.verbose) return;
    
    console.log(`\n✅ ${this.prefix} [SUCCESS] ${message}`);
    if (data) {
      this._logData('📋 Respuesta:', data);
    }
  }

  /**
   * Log de error
   */
  error(message, error = null) {
    console.log(`\n❌ ${this.prefix} [ERROR] ${message}`);
    if (error) {
      this._logError(error);
    }
  }

  /**
   * Log de advertencia
   */
  warning(message, data = null) {
    if (!this.verbose) return;
    
    console.log(`\n⚠️  ${this.prefix} [WARNING] ${message}`);
    if (data) {
      this._logData('📋 Datos:', data);
    }
  }

  /**
   * Log de debug (solo en modo verbose)
   */
  debug(message, data = null) {
    if (!this.verbose) return;
    
    console.log(`\n🔍 ${this.prefix} [DEBUG] ${message}`);
    if (data) {
      this._logData('🔧 Debug:', data);
    }
  }

  /**
   * Separador de sección
   */
  section(title) {
    if (!this.verbose) return;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${title.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);
  }

  /**
   * Separador de subsección
   */
  subsection(title) {
    if (!this.verbose) return;
    
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📝 ${title}`);
    console.log(`${'─'.repeat(40)}`);
  }

  /**
   * Log de inicio de test
   */
  testStart(testName) {
    if (!this.verbose) return;
    
    console.log(`\n🚀 ${this.prefix} Iniciando: ${testName}`);
  }

  /**
   * Log de finalización de test
   */
  testEnd(testName, success = true) {
    if (!this.verbose) return;
    
    const icon = success ? '✅' : '❌';
    const status = success ? 'PASSED' : 'FAILED';
    console.log(`\n${icon} ${this.prefix} ${status}: ${testName}`);
  }

  /**
   * Log de request HTTP
   */
  httpRequest(method, url, data = null) {
    if (!this.verbose) return;
    
    console.log(`\n🌐 ${this.prefix} [HTTP] ${method.toUpperCase()} ${url}`);
    if (data) {
      this._logData('📤 Request Body:', data);
    }
  }

  /**
   * Log de response HTTP
   */
  httpResponse(status, data = null) {
    if (!this.verbose) return;
    
    const icon = status >= 200 && status < 300 ? '✅' : '❌';
    console.log(`\n${icon} ${this.prefix} [HTTP] Response: ${status}`);
    if (data) {
      this._logData('📥 Response Body:', data);
    }
  }

  /**
   * Log de operación de base de datos
   */
  database(operation, details = null) {
    if (!this.verbose) return;
    
    console.log(`\n🗄️  ${this.prefix} [DB] ${operation}`);
    if (details) {
      this._logData('📊 Detalles:', details);
    }
  }

  /**
   * Método privado para formatear datos
   */
  _logData(label, data) {
    try {
      const formatted = typeof data === 'object' 
        ? JSON.stringify(data, null, 2) 
        : data;
      console.log(`   ${label}`, formatted);
    } catch (error) {
      console.log(`   ${label}`, '[Error al formatear datos]');
    }
  }

  /**
   * Método privado para formatear errores
   */
  _logError(error) {
    console.log('   🚨 Detalles:', error.message || error);
    
    if (error.response) {
      console.log('   📋 Status:', error.response.status);
      console.log('   📋 Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.stack && this.verbose) {
      console.log('   📚 Stack:', error.stack);
    }
  }

  /**
   * Crear un logger hijo con configuración específica
   */
  child(options = {}) {
    return new TestLogger({
      verbose: this.verbose,
      colors: this.colors,
      prefix: options.prefix || this.prefix,
      ...options
    });
  }
}

module.exports = TestLogger;