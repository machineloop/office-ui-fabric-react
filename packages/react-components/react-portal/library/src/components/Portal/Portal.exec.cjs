'use strict';
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const library = path.resolve(__dirname, '../../..');
const repo = path.resolve(library, '../../../..');
function execute(entry, args) {
  const result = spawnSync(process.execPath, [path.join(repo, 'node_modules', entry), ...args], {
    cwd: library,
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...process.env,
      TS_NODE_COMPILER: path.join(repo, 'node_modules/typescript/lib/typescript.js'),
    },
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
  }
}
switch (process.argv[2]) {
  case 'e2e':
    execute('cypress/bin/cypress', [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--config-file',
      path.join(__dirname, 'Portal.cypress.config.cjs'),
      '--spec',
      path.join(__dirname, 'testing', 'Portal.cy-entry.stories.tsx'),
      '--config',
      'retries=0,trashAssetsBeforeRuns=false',
    ]);
    break;
  case 'typecheck':
    for (const config of ['Portal.cy.tsconfig.json', 'Portal.cy-baseline.tsconfig.json']) {
      execute('typescript/bin/tsc', [
        '-p',
        path.join(__dirname, config),
        '--pretty',
        'false',
        '--noEmit',
        '--incremental',
        'false',
        '--composite',
        'false',
      ]);
    }
    break;
  default:
    throw new Error('Expected e2e or typecheck');
}
