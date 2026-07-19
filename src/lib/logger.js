// src/lib/logger.js

module.exports = {
  info: (...args) => console.log(...args),
  success: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  debug: (...args) => console.log(...args),
};