const { pool } = require('../config/db');

/**
 * BaseRepository - Implementa el patrón Repository con Query Builder
 * Siguiendo principios SOLID:
 * - Single Responsibility: Maneja operaciones de base de datos
 * - Open/Closed: Extensible para repositorios específicos
 * - Liskov Substitution: Los repositorios hijos pueden sustituir al padre
 * - Interface Segregation: Métodos específicos por necesidad
 * - Dependency Inversion: Depende de abstracciones (pool de conexiones)
 */
class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.query = '';
    this.params = [];
    this.reset();
  }

  /**
   * Reinicia el query builder
   */
  reset() {
    this.query = '';
    this.params = [];
    this.selectFields = '*';
    this.whereConditions = [];
    this.joinClauses = [];
    this.orderByClause = '';
    this.limitClause = '';
    this.groupByClause = '';
    this.havingClause = '';
    return this;
  }

  /**
   * SELECT clause
   */
  select(fields = '*') {
    // Asegurar que fields sea un string válido
    if (typeof fields === 'object' && fields !== null) {
      console.error('Error: select() recibió un objeto en lugar de string:', fields);
      fields = '*';
    }
    this.selectFields = Array.isArray(fields) ? fields.join(', ') : String(fields);
    return this;
  }

  /**
   * FROM clause with optional alias
   */
  from(tableWithAlias) {
    this.tableName = tableWithAlias;
    return this;
  }

  /**
   * WHERE clause
   */
  where(field, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }
    this.whereConditions.push(`${field} ${operator} ?`);
    this.params.push(value);
    return this;
  }

  /**
   * WHERE IN clause
   */
  whereIn(field, values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('whereIn requires a non-empty array');
    }
    const placeholders = values.map(() => '?').join(', ');
    this.whereConditions.push(`${field} IN (${placeholders})`);
    this.params.push(...values);
    return this;
  }

  /**
   * WHERE BETWEEN clause
   */
  whereBetween(field, start, end) {
    this.whereConditions.push(`${field} BETWEEN ? AND ?`);
    this.params.push(start, end);
    return this;
  }

  /**
   * WHERE LIKE clause
   */
  whereLike(field, pattern) {
    this.whereConditions.push(`${field} LIKE ?`);
    this.params.push(pattern);
    return this;
  }

  /**
   * WHERE IS NULL clause
   */
  whereNull(field) {
    this.whereConditions.push(`${field} IS NULL`);
    return this;
  }

  /**
   * WHERE IS NOT NULL clause
   */
  whereNotNull(field) {
    this.whereConditions.push(`${field} IS NOT NULL`);
    return this;
  }

  /**
   * JOIN clause
   */
  join(table, firstColumn, operator, secondColumn) {
    if (arguments.length === 3) {
      secondColumn = operator;
      operator = '=';
    }
    this.joinClauses.push(`INNER JOIN ${table} ON ${firstColumn} ${operator} ${secondColumn}`);
    return this;
  }

  /**
   * LEFT JOIN clause
   */
  leftJoin(table, firstColumn, operator, secondColumn) {
    if (arguments.length === 3) {
      secondColumn = operator;
      operator = '=';
    }
    this.joinClauses.push(`LEFT JOIN ${table} ON ${firstColumn} ${operator} ${secondColumn}`);
    return this;
  }

  /**
   * RIGHT JOIN clause
   */
  rightJoin(table, firstColumn, operator, secondColumn) {
    if (arguments.length === 3) {
      secondColumn = operator;
      operator = '=';
    }
    this.joinClauses.push(`RIGHT JOIN ${table} ON ${firstColumn} ${operator} ${secondColumn}`);
    return this;
  }

  /**
   * ORDER BY clause
   */
  orderBy(field, direction = 'ASC') {
    this.orderByClause = `ORDER BY ${field} ${direction.toUpperCase()}`;
    return this;
  }

  /**
   * GROUP BY clause
   */
  groupBy(fields) {
    const groupFields = Array.isArray(fields) ? fields.join(', ') : fields;
    this.groupByClause = `GROUP BY ${groupFields}`;
    return this;
  }

  /**
   * HAVING clause
   */
  having(condition) {
    this.havingClause = `HAVING ${condition}`;
    return this;
  }

  /**
   * LIMIT clause
   */
  limit(count, offset = 0) {
    this.limitClause = offset > 0 ? `LIMIT ${offset}, ${count}` : `LIMIT ${count}`;
    return this;
  }

  /**
   * Construye la query SELECT
   */
  buildSelectQuery() {
    let query = `SELECT ${this.selectFields} FROM ${this.tableName}`;
    
    if (this.joinClauses.length > 0) {
      query += ` ${this.joinClauses.join(' ')}`;
    }
    
    if (this.whereConditions.length > 0) {
      query += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.groupByClause) {
      query += ` ${this.groupByClause}`;
    }
    
    if (this.havingClause) {
      query += ` ${this.havingClause}`;
    }
    
    if (this.orderByClause) {
      query += ` ${this.orderByClause}`;
    }
    
    if (this.limitClause) {
      query += ` ${this.limitClause}`;
    }
    
    return query;
  }

  /**
   * Ejecuta una query SELECT y retorna todos los resultados
   */
  async get() {
    const query = this.buildSelectQuery();
    const [rows] = await pool.execute(query, this.params);
    this.reset();
    return rows;
  }

  /**
   * Ejecuta una query SELECT y retorna el primer resultado
   */
  async first() {
    this.limit(1);
    const results = await this.get();
    return results[0] || null;
  }

  /**
   * Cuenta los registros
   */
  async count(field = '*') {
    // Validar que field sea un string válido
    const validField = typeof field === 'string' && field.trim() ? field.trim() : '*';
    this.select(`COUNT(${validField}) as total`);
    const result = await this.first();
    return result ? result.total : 0;
  }

  /**
   * Verifica si existe al menos un registro
   */
  async exists() {
    const count = await this.count();
    return count > 0;
  }

  /**
   * Inserta un nuevo registro
   */
  async insert(data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const [result] = await pool.execute(query, values);
    
    return {
      id: result.insertId,
      affectedRows: result.affectedRows
    };
  }

  /**
   * Actualiza registros
   */
  async update(data) {
    if (this.whereConditions.length === 0) {
      throw new Error('Update requires WHERE conditions for safety');
    }
    
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.whereConditions.join(' AND ')}`;
    const [result] = await pool.execute(query, [...values, ...this.params]);
    
    this.reset();
    return result.affectedRows;
  }

  /**
   * Elimina registros
   */
  async delete() {
    if (this.whereConditions.length === 0) {
      throw new Error('Delete requires WHERE conditions for safety');
    }
    
    const query = `DELETE FROM ${this.tableName} WHERE ${this.whereConditions.join(' AND ')}`;
    const [result] = await pool.execute(query, this.params);
    
    this.reset();
    return result.affectedRows;
  }

  /**
   * Busca un registro por ID
   */
  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`;
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  /**
   * Ejecuta una query personalizada
   */
  async raw(query, params = []) {
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Inicia una transacción
   */
  async beginTransaction() {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  /**
   * Confirma una transacción
   */
  async commit(connection) {
    await connection.commit();
    connection.release();
  }

  /**
   * Revierte una transacción
   */
  async rollback(connection) {
    await connection.rollback();
    connection.release();
  }

  /**
   * Ejecuta múltiples operaciones en una transacción
   */
  async transaction(callback) {
    const connection = await this.beginTransaction();
    
    try {
      const result = await callback(connection);
      await this.commit(connection);
      return result;
    } catch (error) {
      await this.rollback(connection);
      throw error;
    }
  }
}

module.exports = BaseRepository;