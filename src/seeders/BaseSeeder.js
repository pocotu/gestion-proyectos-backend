const { pool } = require('../config/db');
const logger = require('../config/logger');

/**
 * BaseSeeder - Clase base para todos los seeders
 * Siguiendo principios SOLID:
 * - Single Responsibility: Maneja la lógica común de seeders
 * - Open/Closed: Extensible para seeders específicos
 * - Liskov Substitution: Los seeders hijos pueden sustituir al padre
 * - Interface Segregation: Métodos específicos por necesidad
 * - Dependency Inversion: Depende de abstracciones (pool de conexiones)
 */
class BaseSeeder {
  constructor(name) {
    this.name = name;
    this.connection = null;
  }

  /**
   * Método abstracto que debe ser implementado por las clases hijas
   */
  async seed() {
    throw new Error(`Seeder ${this.name} must implement seed() method`);
  }

  /**
   * Ejecuta el seeder con manejo de transacciones
   */
  async run() {
    this.connection = await pool.getConnection();
    
    try {
      await this.connection.beginTransaction();
      
      logger.info(`Starting seeder: ${this.name}`);
      const startTime = Date.now();
      
      await this.seed();
      
      await this.connection.commit();
      
      const duration = Date.now() - startTime;
      logger.info(`Seeder ${this.name} completed successfully in ${duration}ms`);
      
      return true;
    } catch (error) {
      await this.connection.rollback();
      logger.error(`Seeder ${this.name} failed:`, error);
      throw error;
    } finally {
      if (this.connection) {
        this.connection.release();
      }
    }
  }

  /**
   * Ejecuta una query con parámetros
   */
  async execute(query, params = []) {
    if (!this.connection) {
      throw new Error('No database connection available');
    }
    
    const [result] = await this.connection.execute(query, params);
    return result;
  }

  /**
   * Verifica si un registro existe
   */
  async exists(table, conditions) {
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');
    
    const values = Object.values(conditions);
    const query = `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`;
    
    const [rows] = await this.connection.execute(query, values);
    return rows[0].count > 0;
  }

  /**
   * Inserta un registro si no existe
   */
  async insertIfNotExists(table, data, uniqueFields = []) {
    // Si no se especifican campos únicos, usar todos los campos
    const checkFields = uniqueFields.length > 0 
      ? uniqueFields.reduce((obj, field) => {
          obj[field] = data[field];
          return obj;
        }, {})
      : data;

    const exists = await this.exists(table, checkFields);
    
    if (!exists) {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = fields.map(() => '?').join(', ');
      
      const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
      const result = await this.execute(query, values);
      
      logger.info(`Inserted new record in ${table}:`, checkFields);
      return result.insertId;
    } else {
      logger.info(`Record already exists in ${table}:`, checkFields);
      return null;
    }
  }

  /**
   * Obtiene el ID de un registro por condiciones
   */
  async getId(table, conditions) {
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');
    
    const values = Object.values(conditions);
    const query = `SELECT id FROM ${table} WHERE ${whereClause} LIMIT 1`;
    
    const [rows] = await this.connection.execute(query, values);
    return rows[0]?.id || null;
  }

  /**
   * Trunca una tabla (solo para desarrollo)
   */
  async truncateTable(table) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Truncate operations are not allowed in production');
    }
    
    await this.execute(`SET FOREIGN_KEY_CHECKS = 0`);
    await this.execute(`TRUNCATE TABLE ${table}`);
    await this.execute(`SET FOREIGN_KEY_CHECKS = 1`);
    
    logger.info(`Table ${table} truncated`);
  }

  /**
   * Genera una fecha aleatoria en un rango
   */
  randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  /**
   * Selecciona un elemento aleatorio de un array
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Genera un número aleatorio en un rango
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

module.exports = BaseSeeder;