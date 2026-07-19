#!/usr/bin/env node

const { spawn } = require('child_process');
const logger = require('./src/lib/logger');

const args = process.argv.slice(2);
const command = args[0]; // 'ignite', 'sync', 'dev'

if (!command) {
  logger.error('Invalid command usage.');
  logger.info('Usage: cookie <ignite|sync|dev>');
  process.exit(1);
}

let script = '';
switch (command) {
  case 'ignite':
    script = 'start';
    break;
  case 'sync':
    script = 'deploy';
    break;
  case 'dev':
    script = 'dev';
    break;
  default:
    logger.error(`Unknown command: ${command}`);
    logger.info('Available commands: ignite, sync, dev');
    process.exit(1);
}

logger.info(`Executing: cookie ${command} (npm run ${script})`);

// プロジェクトのルートディレクトリで npm run を実行
const child = spawn('npm', ['run', script], { 
  stdio: 'inherit', 
  shell: true,
  cwd: __dirname // プロジェクトのルートディレクトリを明示的に指定
});

child.on('close', (code) => {
  process.exit(code);
});