'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../../../../../..');
const library = path.resolve(__dirname, '../../..');
const mode = process.argv[2];
const round = Number(process.argv[3] || 4);
assert(Number.isInteger(round) && round >= 1 && round <= 4, 'round must be 1 through 4');
const requestedEvidence = process.env.AVATAR_GROUP_POPOVER_EVIDENCE;
if (requestedEvidence !== undefined && !requestedEvidence.trim()) {
  throw new Error('AVATAR_GROUP_POPOVER_EVIDENCE must be nonempty when provided');
}
const evidence = path.resolve(
  requestedEvidence || path.join(__dirname, '.temp'),
  `${mode}-r${round}-${process.argv[4] || 'fresh'}-${Date.now()}-${process.pid}`,
);
fs.mkdirSync(evidence, { recursive: true });
const sourceFiles = [
  '.gitignore',
  'AvatarGroupPopover.cy.tsx',
  'AvatarGroupPopover.cy.md',
  'AvatarGroupPopover.cy.tsconfig.json',
  'AvatarGroupPopover.cy-baseline.tsconfig.json',
  'AvatarGroupPopover.cy-webpack.tsconfig.json',
  'AvatarGroupPopover.cypress.config.cjs',
  'AvatarGroupPopover.eslint.config.cjs',
  'AvatarGroupPopover.run.cjs',
  ...fs
    .readdirSync(path.join(__dirname, 'testing'))
    .filter(name => name !== 'ci')
    .map(name => path.join('testing', name)),
  'testing/ci/project.json',
];
const manifest = () =>
  sourceFiles.map(relativePath => ({
    relativePath,
    sha256: crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(__dirname, relativePath)))
      .digest('hex'),
  }));
const before = manifest();
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
        WEBPACK_DEV_SERVER_PORT: '46130',
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
    const auditRoot = path.join(__dirname, '.temp');
    fs.mkdirSync(auditRoot, { recursive: true });
    const existing = new Set(fs.readdirSync(auditRoot));
    const args = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--config-file',
      mode === 'standard'
        ? 'cypress.config.ts'
        : 'src/components/AvatarGroupPopover/AvatarGroupPopover.cypress.config.cjs',
      '--spec',
      'src/components/AvatarGroupPopover/AvatarGroupPopover.cy.tsx',
      '--reporter',
      'junit',
      '--reporter-options',
      `mochaFile=${path.join(evidence, 'results-[hash].xml')}`,
      '--config',
      `retries=0,trashAssetsBeforeRuns=false,video=false,viewportWidth=1000,viewportHeight=900,screenshotsFolder=${path.join(
        evidence,
        'screenshots',
      )},downloadsFolder=${path.join(evidence, 'downloads')}`,
    ];
    if (round !== 4) {
      args.push('--env', `coverageRound=${round}`);
    }
    run('node_modules/cypress/bin/cypress', args, library);
    const cases = fs
      .readdirSync(evidence)
      .filter(name => /^results-.*\.xml$/.test(name))
      .flatMap(name => {
        const xml = fs.readFileSync(path.join(evidence, name), 'utf8');
        assert(!/<(?:failure|error|skipped)\b/.test(xml), name);
        return [...xml.matchAll(/<testcase\b[^>]*name="([^"]+)"[^>]*classname="([^"]+)"/g)].map(
          match => `${match[2]} :: ${match[1]}`,
        );
      });
    const roots = fs.readdirSync(auditRoot).filter(name => name.startsWith('audits-') && !existing.has(name));
    assert.equal(roots.length, 1, 'exactly one canonical fixture execution');
    const auditsPath = path.join(auditRoot, roots[0]);
    const audits = fs
      .readdirSync(auditsPath)
      .filter(name => /^audit-\d+\.json$/.test(name))
      .map(name => JSON.parse(fs.readFileSync(path.join(auditsPath, name), 'utf8')));
    const expected = [28, 100, 130, 156][round - 1];
    assert.equal(cases.length, expected, 'full raw JUnit count');
    assert.equal(new Set(cases).size, expected, 'unique raw JUnit count');
    assert.equal(audits.filter(audit => audit.stage === 'final').length, expected);
    assert.equal(new Set(audits.filter(audit => audit.stage === 'final').map(audit => audit.test)).size, expected);
    assert(audits.every(audit => audit.passes > 0));
    assert(audits.every(audit => audit.retries === 0));
    if (round === 4) {
      audits.forEach(audit => assert.deepEqual(audit.environment, {}, 'default Cypress environment'));
    }
    const classifiers = fs.readdirSync(auditsPath).filter(name => /^classifier-\d+\.json$/.test(name));
    assert.equal(classifiers.length, audits.length);
    classifiers.forEach(name => {
      const classifier = JSON.parse(fs.readFileSync(path.join(auditsPath, name), 'utf8'));
      assert(classifier.rejectedMutations.length >= 3, 'empty evaluation and both unknown categories fail closed');
    });
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
          auditsPath,
          audits,
        },
        null,
        2,
      ),
    );
    process.stdout.write(
      `${cases.length} unique cases; 0 failures/skips/pending/retries; ${audits.length} audited phases\n`,
    );
  } else if (mode === 'checks' || mode === 'format') {
    const authored = sourceFiles.filter(name => name !== '.gitignore');
    const local = name => path.relative(repo, path.join(__dirname, name));
    run('node_modules/prettier/bin-prettier.js', [mode === 'format' ? '--write' : '--check', ...authored.map(local)]);
    if (mode === 'checks') {
      run('node_modules/typescript/bin/tsc', ['-p', local('testing/tsconfig.json'), '--pretty', 'false']);
      run('node_modules/eslint/bin/eslint.js', [
        '--config',
        path.join(library, 'eslint.config.cjs'),
        '--no-cache',
        ...authored.filter(name => /\.(?:ts|tsx|cjs)$/.test(name)).map(local),
      ]);
    }
  } else {
    throw new Error('Expected cypress [round], standard [round], format, or checks');
  }
} finally {
  const after = manifest();
  fs.writeFileSync(path.join(evidence, 'source-after.json'), JSON.stringify(after, null, 2));
  if (mode !== 'format') {
    assert.deepEqual(after, before, 'source bytes did not change during validation');
  }
}
