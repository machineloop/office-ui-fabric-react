'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../../../../../..');
const library = path.resolve(__dirname, '../../..');
const mode = process.argv[2];
const round = Number(process.argv[3] || 6);
const runId = `${mode}-r${round}-${process.argv[4] || 'fresh'}-${Date.now()}-${process.pid}`;
const evidence = path.resolve(process.env.CARD_PREVIEW_EVIDENCE || path.join(__dirname, '.temp'), runId);
fs.mkdirSync(evidence, { recursive: true });
const sourceFiles = [
  '.gitignore',
  'CardPreview.cy.tsx',
  'CardPreview.cy.md',
  'CardPreview.cy.tsconfig.json',
  'CardPreview.cy-baseline.tsconfig.json',
  'CardPreview.cy-webpack.tsconfig.json',
  'CardPreview.cypress.config.cjs',
  'CardPreview.eslint.config.cjs',
  'CardPreview.run.cjs',
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
        WEBPACK_DEV_SERVER_PORT: '46128',
        CARD_PREVIEW_RUN_ID: runId,
        CARD_PREVIEW_EVIDENCE: evidence,
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
    const paintPath = path.join(evidence, 'paint.jsonl');
    const common = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--env',
      `coverageRound=${round},cardPreviewRunId=${runId},cardPreviewAuditPath=${auditPath},cardPreviewPaintPath=${paintPath}`,
    ];
    if (mode === 'standard') {
      run(
        'node_modules/cypress/bin/cypress',
        [
          ...common,
          '--config-file',
          'cypress.config.ts',
          '--spec',
          'src/components/CardPreview/CardPreview.cy.tsx',
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
        [...common, '--config-file', 'src/components/CardPreview/CardPreview.cypress.config.cjs'],
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
    const paint =
      round >= 4
        ? fs
            .readFileSync(paintPath, 'utf8')
            .trim()
            .split('\n')
            .map(line => JSON.parse(line))
        : [];
    const expected = [22, 50, 115, 156, 174, 188][round - 1];
    assert.equal(cases.length, expected, 'full raw JUnit count');
    assert.equal(new Set(cases).size, expected, 'unique raw JUnit cases');
    assert.equal(audits.length, expected, 'one strict audit per case');
    assert.equal(new Set(audits.map(audit => audit.scenario)).size, expected);
    assert(audits.every(audit => audit.evaluatedNodes > 0 && audit.passes.length > 0));
    assert.equal(paint.length, round >= 4 ? 6 : 0);
    fs.writeFileSync(
      path.join(evidence, 'summary.json'),
      JSON.stringify(
        {
          mode,
          round,
          tests: cases.length,
          failures: 0,
          errors: 0,
          skipped: 0,
          pending: 0,
          retries: 0,
          cases,
          audits,
          paint,
        },
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
      for (const config of ['CardPreview.cy.tsconfig.json', 'CardPreview.cy-baseline.tsconfig.json']) {
        run('node_modules/typescript/bin/tsc', ['-p', path.join(__dirname, config), '--pretty', 'false']);
      }
      run(
        'node_modules/typescript/bin/tsc',
        [
          '-p',
          'tsconfig.cy.json',
          '--noEmit',
          '--pretty',
          'false',
          '--skipLibCheck',
          'false',
          '--allowSyntheticDefaultImports',
          'true',
        ],
        library,
      );
      run('node_modules/eslint/bin/eslint.js', ['src/components/CardPreview', '--no-cache'], library);
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
