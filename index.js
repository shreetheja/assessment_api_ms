const cors = require('cors');
const { config } = require('dotenv');
const express = require('express');
const moment = require('moment');
config();
const log = require('./log/index');
const indexRoutes = require('./routes/indexRoute');
const { Api500Error } = require('./handlers/apiErrors');
const logger = log.getNormalLogger();
logger.info(`________________________Startrd At:${moment.utc().toString()} ___________________`);

const app = express();


app.use(express.json());
app.use(cors());
app.use('/', indexRoutes);
app.use((err, req, res, next) => {
  logger.error(`error => ${err.toString()}`);
  const resObj = Api500Error('Internal Error', `Error Occured For => ${err.toString()}`);
  res.status(500).send(resObj.toStringifiedJson());
});

app.listen(process.env.PORT, () => { logger.info(`Server is Up and Listening at ${process.env.PORT}👂🏻`); });