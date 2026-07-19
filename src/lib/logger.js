// src/lib/logger.js

const Colors = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  GRAY: '\x1b[90m',
};

const timestamp = () => {
  const now = new Date();
  const date = now.toLocaleDateString('en-CA');
  const time = now.toLocaleTimeString('en-GB', { hour12: false });
  return `${Colors.DIM}${date} ${time}${Colors.RESET}`;
};

function formatError(err) {
  if (err instanceof Error) {
    const stack = err.stack ? err.stack.split('\n').slice(1).join('\n') : '';
    return `${err.message}${stack ? `\n${Colors.DIM}${stack}${Colors.RESET}` : ''}`;
  }
  return err;
}

module.exports = {
  info: (...args) => {
    const tag = `${Colors.BRIGHT}${Colors.CYAN}[INFO]${Colors.RESET}`;
    console.log(`${timestamp()} ${tag}`, ...args);
  },
  
  success: (...args) => {
    const tag = `${Colors.BRIGHT}${Colors.GREEN}[SUCCESS]${Colors.RESET}`;
    console.log(`${timestamp()} ${tag}`, ...args);
  },
  
  warn: (...args) => {
    const tag = `${Colors.BRIGHT}${Colors.YELLOW}[WARN]${Colors.RESET}`;
    console.warn(`${timestamp()} ${tag}`, ...args.map(a => a instanceof Error ? formatError(a) : a));
  },
  
  error: (...args) => {
    const tag = `${Colors.BRIGHT}${Colors.RED}[ERROR]${Colors.RESET}`;
    console.error(`${timestamp()} ${tag}`, ...args.map(a => a instanceof Error ? formatError(a) : a));
  },
  
  debug: (...args) => {
    const tag = `${Colors.BRIGHT}${Colors.MAGENTA}[DEBUG]${Colors.RESET}`;
    console.log(`${timestamp()} ${tag}`, ...args);
  },
};