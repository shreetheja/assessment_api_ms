/* eslint-disable max-classes-per-file */
const moment = require('moment');
const httpStatusCodes = require('./httpStatusCode');
const log = require('../log/index');

const logger = log.getApiLogger();

logger.info(`_____________________Restarted At : ${moment.utc()}___________________________`);
function getFormattedLog(obj, isDebug = false) {
  const statusCodeEmotes = {
    404: 'Not 😕 found',
    200: 'Ok ✅',
    401: 'Unauthorized 👮🏻‍♀️🚨',
    500: 'Internal Error 👿',
    400: 'Bad Request ✖'
  };
  
  const out = {
    message:{
    status: `${statusCodeEmotes[obj.statusCode]}`,
    statusCode:obj.statusCode,
    message: obj.message,
    data: obj.data,
    }
    
  };
  if (isDebug) {
    out.message.responseDesc = obj.responseDesc;
    if(obj.statusCode ==500)
    out.message.stack = obj.stack;
  }
  return out;
}

class ApiResponse extends Error {
  constructor(
    message,
    statusCode,
    responseDesc,
    data = null,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.responseDesc = responseDesc;
    this.data = data;
  }

  toStringifiedJson() {
    if (this.statusCode === httpStatusCodes.OK) {
      return JSON.stringify(
        {
          data: this.data,
          message: this.message,
          success: true,
        },
      );
    }
    return JSON.stringify(
      {
        data: null,
        message: this.message,
        success: false,
      },
    );
  }
}
class Api200Success extends ApiResponse {
  constructor(
    message,
    responseDesc,
    data,
    statusCode = httpStatusCodes.OK,
  ) {
    super(message, statusCode, responseDesc, data);
    this.message = message;
    this.data = data;
    this.statusCode = statusCode;
    this.responseDesc = responseDesc;
    logger.http(getFormattedLog(this).message);
    logger.debug(getFormattedLog(this, true));
  }
}

class Api404Error extends ApiResponse {
  constructor(
    message,
    responseDesc,
    statusCode = httpStatusCodes.NOT_FOUND,
  ) {
    super(message, statusCode, responseDesc);
    this.message = message;
    this.responseDesc = responseDesc;
    this.statusCode = statusCode;
    logger.http(getFormattedLog(this).message);
    logger.debug(getFormattedLog(this, true));
  }
}

class Api500Error extends ApiResponse {
  constructor(
    message,
    responseDesc,
    statusCode = httpStatusCodes.INTERNAL_SERVER,
  ) {
    super(message, statusCode, responseDesc);
    this.message = message;
    this.responseDesc = responseDesc;
    this.statusCode = statusCode;
    logger.http(getFormattedLog(this).message);
    logger.debug(getFormattedLog(this, true));
  }
}

class Api401Error extends ApiResponse {
  constructor(
    message,
    responseDesc,
    statusCode = httpStatusCodes.UNAUTHORIZED,
  ) {
    super(message, statusCode, responseDesc);
    this.message = message;
    this.responseDesc = responseDesc;
    this.statusCode = statusCode;
    logger.http(getFormattedLog(this).message);
    logger.debug(getFormattedLog(this, true));
  }
}

class Api400Error extends ApiResponse {
  constructor(
    message,
    responseDesc,
    statusCode = httpStatusCodes.BAD_REQUEST,
  ) {
    super(message, statusCode, responseDesc);
    this.message = message;
    this.responseDesc = responseDesc;
    this.statusCode = statusCode;
    logger.http(getFormattedLog(this).message);
    logger.debug(getFormattedLog(this, true));
  }
}
class Api403Error extends ApiResponse {
  constructor(
    message,
    responseDesc,
    statusCode = httpStatusCodes.FORBIDDEN,
  ) {
    super(message, statusCode, responseDesc);
    this.message = message;
    this.responseDesc = responseDesc;
    this.statusCode = statusCode;
    logger.http(getFormattedLog(this).message);
    logger.debug(getFormattedLog(this, true));
  }
}

module.exports = {
  Api400Error, Api401Error, Api404Error, Api500Error, Api403Error, Api200Success,
};
