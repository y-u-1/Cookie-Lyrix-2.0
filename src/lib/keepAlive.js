// src/lib/keepAlive.js
const express = require('express');
const logger = require('./logger');

function startKeepAlive(botName) {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.status(200).send(`${botName} is alive!`);
  });

  app.listen(PORT, () => {
    logger.info(`KeepAlive server started on port ${PORT}`);
  });
}

module.exports = { startKeepAlive };