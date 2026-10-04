'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../../../../../..');
const library = path.resolve(__dirname, '../../..');
const mode = process.argv[2];
const round = Number(process.argv[3] || 8);
const runId = `${mode}-r${round}-${process.argv[4] || 'fresh'}-${Date.now()}-${process.pid}`;
const requestedEvidence = process.env.TOOLBAR_BUTTON_EVIDENCE;
if (requestedEvidence !== undefined && !requestedEvidence.trim()) {
  throw new Error('TOOLBAR_BUTTON_EVIDENCE must be nonempty when provided');
}
const evidence = path.resolve(requestedEvidence || path.join(__dirname, '.temp'), runId);
fs.mkdirSync(evidence, { recursive: true });
const sourceFiles = [
  '.gitignore',
  'ToolbarButton.cy.tsx',
  'ToolbarButton.cy.md',
  'ToolbarButton.cy.tsconfig.json',
  'ToolbarButton.cy-baseline.tsconfig.json',
  'ToolbarButton.cy-webpack.tsconfig.json',
  'ToolbarButton.cypress.config.cjs',
  'ToolbarButton.eslint.config.cjs',
  'ToolbarButton.run.cjs',
  ...fs
    .readdirSync(path.join(__dirname, 'testing'))
    .filter(name => name !== 'ci')
    .map(name => path.join('testing', name)),
  'testing/ci/project.json',
];
const sourceManifest = () =>
  sourceFiles.map(relativePath => ({
    relativePath,
    sha256: crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(__dirname, relativePath)))
      .digest('hex'),
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
        WEBPACK_DEV_SERVER_PORT: '46129',
        NX_DAEMON: 'false',
        NX_CACHE_DIRECTORY: path.join(evidence, 'nx-cache'),
        NX_WORKSPACE_DATA_DIRECTORY: path.join(evidence, 'nx-data'),
      },
    });
  } finally {
    fs.closeSync(fd);
  }
  commands.push({ command, cwd, logPath, exitCode: result.status, error: result.error?.message });
  fs.writeFileSync(path.join(evidence, 'commands.json'), JSON.stringify(commands, null, 2));
  process.stdout.write(`${logPath}: exit ${result.status}\n`);
  if (result.error || result.status !== 0) {
    throw new Error(fs.readFileSync(logPath, 'utf8').split('\n').slice(-100).join('\n'));
  }
}
try {
  if (mode === 'cypress' || mode === 'standard') {
    const defaultAuditRoot = path.join(__dirname, '.temp');
    const existing = new Set(fs.existsSync(defaultAuditRoot) ? fs.readdirSync(defaultAuditRoot) : []);
    const common = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--config-file',
      mode === 'standard' ? 'cypress.config.ts' : 'src/components/ToolbarButton/ToolbarButton.cypress.config.cjs',
      '--spec',
      'src/components/ToolbarButton/ToolbarButton.cy.tsx',
      '--reporter',
      'junit',
      '--reporter-options',
      `mochaFile=${path.join(evidence, 'results-[hash].xml')}`,
      '--config',
      `retries=0,trashAssetsBeforeRuns=false,video=false,viewportWidth=1000,viewportHeight=800,screenshotsFolder=${path.join(
        evidence,
        'screenshots',
      )},downloadsFolder=${path.join(evidence, 'downloads')}`,
    ];
    // The complete/default run deliberately supplies no private Cypress environment.
    if (round !== 8) {
      common.push('--env', `coverageRound=${round}`);
    }
    run('node_modules/cypress/bin/cypress', common, library);
    const xmlPaths = fs.readdirSync(evidence).filter(name => /^results-.*\.xml$/.test(name));
    const cases = xmlPaths.flatMap(name => {
      const xml = fs.readFileSync(path.join(evidence, name), 'utf8');
      assert(!/<(?:failure|error|skipped)\b/.test(xml), name);
      return [...xml.matchAll(/<testcase\b[^>]*name="([^"]+)"[^>]*classname="([^"]+)"/g)].map(
        match => `${match[2]} :: ${match[1]}`,
      );
    });
    const auditRoots = fs
      .readdirSync(defaultAuditRoot)
      .filter(name => name.startsWith('audits-') && !existing.has(name));
    assert.equal(auditRoots.length, 1, 'one canonical fixture execution');
    const auditRoot = path.join(defaultAuditRoot, auditRoots[0]);
    const audits = fs
      .readdirSync(auditRoot)
      .filter(name => /^audit-\d+\.json$/.test(name))
      .map(name => JSON.parse(fs.readFileSync(path.join(auditRoot, name), 'utf8')));
    const expected = [16, 42, 85, 97, 132, 152, 158, 203][round - 1];
    assert.equal(cases.length, expected, 'full raw JUnit count');
    assert.equal(new Set(cases).size, expected, 'unique raw JUnit cases');
    assert.equal(audits.filter(audit => audit.stage === 'final').length, expected);
    assert.equal(new Set(audits.filter(audit => audit.stage === 'final').map(audit => audit.test)).size, expected);
    assert(audits.every(audit => audit.result.passes.length > 0));
    assert(audits.every(audit => audit.retries === 0));
    if (round === 8) {
      audits.forEach(audit => assert.deepEqual(audit.environment, {}, 'canonical default Cypress environment'));
      const classifiers = fs.readdirSync(auditRoot).filter(name => /^classifier-\d+\.json$/.test(name));
      assert.equal(classifiers.length, audits.length, 'the strict classifier and mutations executed for every audit');
      classifiers.forEach(name => {
        const classifier = JSON.parse(fs.readFileSync(path.join(auditRoot, name), 'utf8'));
        assert(classifier.rejectedMutations.length >= 5, 'unknowns and empty audit fail closed');
      });
    }
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
          auditRoot,
          audits,
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
      for (const config of ['ToolbarButton.cy.tsconfig.json', 'ToolbarButton.cy-baseline.tsconfig.json']) {
        run('node_modules/typescript/bin/tsc', ['-p', path.join(__dirname, config), '--pretty', 'false']);
      }
      run(
        'node_modules/typescript/bin/tsc',
        ['-p', 'src/components/ToolbarButton/testing/tsconfig.json', '--pretty', 'false'],
        library,
      );
      run('node_modules/eslint/bin/eslint.js', ['src/components/ToolbarButton', '--no-cache'], library);
    }
  } else if (mode === 'units') {
    run(
      'node_modules/jest/bin/jest.js',
      [
        '--config',
        'jest.config.cjs',
        '--runInBand',
        '--runTestsByPath',
        'src/components/ToolbarButton/ToolbarButton.test.tsx',
        'src/components/ToolbarButton/useToolbarButton.test.tsx',
        '--json',
        `--outputFile=${path.join(evidence, 'units.json')}`,
      ],
      library,
    );
  } else {
    throw new Error('Use cypress|standard <round> [label], checks, format, or units');
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
