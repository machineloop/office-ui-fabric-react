'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const repo = path.resolve(__dirname, '../../../../../../..');
const library = path.resolve(__dirname, '../../..');
const mode = process.argv[2];
const round = Number(process.argv[3] || 5);
const runId = `${mode}-r${round}-${process.argv[4] || 'fresh'}-${Date.now()}-${process.pid}`;
const evidence = path.resolve(process.env.CARD_FOOTER_EVIDENCE || path.join(__dirname, '.temp'), runId);
fs.mkdirSync(evidence, { recursive: true });
const sourceFiles = [
  '.gitignore',
  'CardFooter.cy.tsx',
  'CardFooter.cy.md',
  'CardFooter.cy.tsconfig.json',
  'CardFooter.cy-baseline.tsconfig.json',
  'CardFooter.cy-webpack.tsconfig.json',
  'CardFooter.cypress.config.cjs',
  'CardFooter.eslint.config.cjs',
  'CardFooter.run.cjs',
  ...fs.readdirSync(path.join(__dirname, 'testing')).map(name => path.join('testing', name)),
];
const sourceManifest = () =>
  sourceFiles.map(relativePath => ({
    relativePath,
    sha256: crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(__dirname, relativePath)))
      .digest('hex')
      .toUpperCase(),
  }));
const before = sourceManifest();
fs.writeFileSync(path.join(evidence, 'source-before.json'), JSON.stringify(before, null, 2));
const commands = [];
function run(entry, args, cwd = repo) {
  const logPath = path.join(evidence, `command-${commands.length + 1}.log`);
  const fd = fs.openSync(logPath, 'wx');
  const command = [process.execPath, path.join(repo, entry), ...args];
  let result;
  try {
    result = spawnSync(command[0], command.slice(1), {
      cwd,
      stdio: ['ignore', fd, fd],
      windowsHide: true,
      env: {
        ...process.env,
        TS_NODE_COMPILER: path.join(repo, 'node_modules/typescript/lib/typescript.js'),
        WEBPACK_DEV_SERVER_PORT: '46127',
        CARD_FOOTER_RUN_ID: runId,
        CARD_FOOTER_EVIDENCE: evidence,
        NX_DAEMON: 'false',
        NX_CACHE_DIRECTORY: path.join(evidence, 'nx-cache'),
        NX_WORKSPACE_DATA_DIRECTORY: path.join(evidence, 'nx-data'),
      },
    });
  } finally {
    fs.closeSync(fd);
  }
  const record = { command, cwd, logPath, exitCode: result.status, error: result.error?.message };
  commands.push(record);
  fs.writeFileSync(path.join(evidence, 'commands.json'), JSON.stringify(commands, null, 2));
  process.stdout.write(`${logPath}: exit ${result.status}\n`);
  if (result.error || result.status !== 0) {
    throw new Error(fs.readFileSync(logPath, 'utf8').split('\n').slice(-100).join('\n'));
  }
}
try {
  if (mode === 'cypress' || mode === 'standard') {
    const auditPath = path.join(evidence, 'audits.jsonl');
    const common = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--env',
      `coverageRound=${round},cardFooterRunId=${runId},cardFooterAuditPath=${auditPath}`,
    ];
    if (mode === 'standard') {
      run(
        'node_modules/cypress/bin/cypress',
        [
          ...common,
          '--config-file',
          'cypress.config.ts',
          '--spec',
          'src/components/CardFooter/CardFooter.cy.tsx',
          '--reporter',
          'junit',
          '--reporter-options',
          `mochaFile=${path.join(evidence, 'results-[hash].xml')}`,
          '--config',
          `retries=0,trashAssetsBeforeRuns=false,video=false,viewportWidth=1000,viewportHeight=800,screenshotsFolder=${path.join(
            evidence,
            'screenshots',
          )},downloadsFolder=${path.join(evidence, 'downloads')}`,
        ],
        library,
      );
    } else {
      run(
        'node_modules/cypress/bin/cypress',
        [...common, '--config-file', 'src/components/CardFooter/CardFooter.cypress.config.cjs'],
        library,
      );
    }
    const xmlPaths = fs.readdirSync(evidence).filter(name => /^results-.*\.xml$/.test(name));
    const cases = xmlPaths.flatMap(name => {
      const xml = fs.readFileSync(path.join(evidence, name), 'utf8');
      assert(!/<(?:failure|error|skipped)\b/.test(xml), name);
      return [...xml.matchAll(/<testcase\b[^>]*name="([^"]+)"[^>]*classname="([^"]+)"/g)].map(
        match => `${match[2]} :: ${match[1]}`,
      );
    });
    const audits = fs
      .readFileSync(auditPath, 'utf8')
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));
    const expected = [19, 48, 90, 106, 120][round - 1];
    assert.equal(cases.length, expected, 'full raw JUnit count');
    assert.equal(new Set(cases).size, expected, 'unique raw JUnit cases');
    assert.equal(audits.length, expected, 'one strict audit per case');
    assert.equal(new Set(audits.map(audit => audit.scenario)).size, expected);
    fs.writeFileSync(
      path.join(evidence, 'summary.json'),
      JSON.stringify(
        { mode, round, tests: cases.length, failures: 0, errors: 0, skipped: 0, pending: 0, retries: 0, cases, audits },
        null,
        2,
      ),
    );
    process.stdout.write(`${mode}: ${cases.length} unique cases, ${audits.length} strict audits\n`);
  } else if (mode === 'checks' || mode === 'format') {
    run('node_modules/prettier/bin-prettier.js', [
      mode === 'format' ? '--write' : '--check',
      ...sourceFiles.filter(name => name !== '.gitignore').map(name => path.join(__dirname, name)),
    ]);
    if (mode === 'checks') {
      for (const config of ['CardFooter.cy.tsconfig.json', 'CardFooter.cy-baseline.tsconfig.json']) {
        run('node_modules/typescript/bin/tsc', ['-p', path.join(__dirname, config), '--pretty', 'false']);
      }
      run('node_modules/typescript/bin/tsc', ['-p', 'tsconfig.cy.json', '--noEmit', '--pretty', 'false'], library);
      run('node_modules/eslint/bin/eslint.js', ['src/components/CardFooter', '--no-cache'], library);
    }
  } else {
    throw new Error('Use cypress|standard <round> [label], checks, or format');
  }
  const after = sourceManifest();
  fs.writeFileSync(path.join(evidence, 'source-after.json'), JSON.stringify(after, null, 2));
  if (mode !== 'format') {
    assert.deepEqual(after, before, 'source must not change during validation');
  }
  fs.writeFileSync(
    path.join(evidence, 'success.json'),
    JSON.stringify({ evidence, commands, sourceStable: mode !== 'format' }, null, 2),
  );
} catch (error) {
  fs.writeFileSync(path.join(evidence, 'failure.json'), JSON.stringify({ message: error.message, commands }, null, 2));
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
}
