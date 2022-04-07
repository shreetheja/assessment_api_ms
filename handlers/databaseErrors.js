/* eslint-disable max-classes-per-file */
const DBStatusCodes = require('./databaseStatusCode');
const log = require('../log/index');

const logger = log.getNormalLogger();
const { BaseError } = require('./baseError');
/**
 * Class For Database Er
 */
class DBError extends BaseError {
  /**
   * 
   * @param {String} name name of database
   * @param {Error} error error instnace
   * @param {PoolConnection} conn connection to close
   * @param {DBStatusCodes} statusCode code of status
   * @param {String} description Description
   * @param {any} rows result
   * @param {Boolean} isCritical isCritical logging
   * @param {String} query query done
   */
  constructor(
    name,
    error,
    conn,
    statusCode = DBStatusCodes.CONN_FAILED,
    description = 'Connection Failed.',
    rows = null,
    isCritical = false,
    query = null,
  ) {
    if (error) { logger.error(error); }
    if (isCritical) { logger.error('Critical Error the above one'); }
    // IMMEDIATE DO SOMETHING
    super(name, statusCode, true, description);
    this.error = error;
    this.rows = rows;
    this.isCritical = isCritical;
    this.query = query;
    if (conn != null) {
      conn.release();
    }
  }
}

class DBSuccess extends DBError {
  /**
   * 
   * @param {String} name name of query done
   * @param {String} description desciption to debug log
   * @param {PoolConnection} conn connection to release
   * @param {any} rows array or result of rows selected
   */
  constructor(name, description, conn, rows = null) {
    super(name, null, conn, DBStatusCodes.OK, description, rows);
  }
}

module.exports = { DBError, DBSuccess };
