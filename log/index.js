const envirnoment = process.env.NODE_ENV;
let logger;
if (envirnoment === 'DEV') {
  // eslint-disable-next-line global-require
  const devLogger = require('./devLogger');
  logger = devLogger;
} else if (envirnoment === 'PROD') {
  // eslint-disable-next-line global-require
  const prodLogger = require('./prodLogger');
  logger = prodLogger;
}

module.exports = logger;
