// const levels = {error: 0,warn: 1, info: 2,http: 3,verbose: 4,debug: 5,silly: 6 };
const { createLogger, format, transports } = require('winston');

const {
  combine, timestamp, prettyPrint, colorize, errors,
} = format;
require('winston-daily-rotate-file');
const { consoleFormat } = require('winston-console-format');

const print = format.printf((info) => {
  const log = `[${info.timestamp}]: [${info.level}]: ${info.message} `;
  return info.stack
    ? `${log}\n${info.stack} `
    : log;
});

const getApiLogger = () => {
  const logConfiguration = {
    level: 'http',
    format: combine(
      errors({ stack: true }), // <-- use errors format
      timestamp(),
      print,
    ),
    transports: [
      new transports.Console({
        format: combine(
          colorize({ all: true }),
          format.padLevels(),
          consoleFormat({
            showMeta: true,
            metaStrip: ['timestamp', 'service'],
            inspectOptions: {
              depth: Infinity,
              colors: true,
              maxArrayLength: Infinity,
              breakLength: 120,
              compact: Infinity,

            },
          }),
          print,

        ),
      }),
      new transports.DailyRotateFile({
        filename: 'AssessmentDebug_',
        dirname: `${__dirname}/logs/api`,
        datePattern: 'YYYY-MM-DD',
        timestamp: 'HH-MM-SSz',
        extension: '.log',
        frequency: '1d',
      }),
      new transports.DailyRotateFile({
        filename: 'AssessmentAPIErrorDebug_',
        dirname: `${__dirname}/logs/error`,
        datePattern: 'YYYY-MM-DD',
        timestamp: 'HH-MM-SSz',
        extension: '.log',
        level: 'error',
        frequency: '1d',
      }),
    ],
  };
  const logger = createLogger(logConfiguration);
  return logger;
};
const getNormalLogger = () => {
  const logConfiguration = {
    level: 'info',
    format: combine(
      errors({ stack: true }), // <-- use errors format

      timestamp(),
      prettyPrint(),
      print,
    ),
    transports: [
      new transports.Console({
        format: combine(
          colorize({ all: true }),
          format.padLevels(),
          consoleFormat({
            showMeta: true,
            metaStrip: ['timestamp', 'service'],
            inspectOptions: {
              depth: Infinity,
              colors: true,
              maxArrayLength: Infinity,
              breakLength: 120,
              compact: Infinity,
            },
          }),
          print,

        ),
      }),
      new transports.DailyRotateFile({
        filename: 'AssessmentDebug_',
        dirname: `${__dirname}/logs/normal`,
        datePattern: 'YYYY-MM-DD',
        timestamp: 'HH-MM-SS',
        extension: '.log',
        frequency: '1d',
      }),
      new transports.DailyRotateFile({
        filename: 'AssessmentDebugNormalError',
        dirname: `${__dirname}/logs/error`,
        datePattern: 'YYYY-MM-DD',
        timestamp: 'HH-MM-SSz',
        extension: '.log',
        level: 'error',
        frequency: '1d',
      }),
    ],
  };
  const logger = createLogger(logConfiguration);
  return logger;
};

module.exports = { getApiLogger, getNormalLogger };
