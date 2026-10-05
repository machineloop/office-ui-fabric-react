'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../../../../../..');
const library = path.resolve(__dirname, '../../..');
const scope = path.relative(repo, __dirname).replaceAll('\\', '/');
const local = name => `${scope}/${name.replaceAll('\\', '/')}`;
const mode = process.argv[2];
const preservation = mode === 'snapshot' || mode === 'preserve';
const requestedRound = preservation || process.argv[3] === undefined ? '4' : process.argv[3];
assert(['1', '2', '3', '4'].includes(requestedRound), 'round must be 1, 2, 3, or 4');
const round = Number(requestedRound);
assert(
  ['cypress', 'standard', 'format', 'checks', 'snapshot', 'preserve'].includes(mode),
  'Expected cypress, standard, format, checks [round], snapshot <label>, or preserve <label>',
);
const label = preservation ? process.argv[3] : undefined;
assert(!preservation || (label && /^[a-zA-Z0-9-]+$/.test(label)), 'snapshot/preserve require an alphanumeric label');
assert(process.argv.length <= 4, 'unexpected arguments');
const temporary = path.join(__dirname, '.temp');
const reports = path.join(
  temporary,
  mode === 'snapshot' ? `snapshot-${label}` : `${mode}-r${round}-${Date.now()}-${process.pid}`,
);
fs.mkdirSync(reports, { recursive: true });
const environment = {
  ...process.env,
  NX_DAEMON: 'false',
  NX_ISOLATE_PLUGINS: 'false',
  NX_NO_CLOUD: 'true',
  NX_CACHE_DIRECTORY: path.join(reports, 'nx-cache'),
  NX_WORKSPACE_DATA_DIRECTORY: path.join(reports, 'nx-data'),
  NX_NATIVE_FILE_CACHE_DIRECTORY: path.join(reports, 'nx-native'),
  V8_COMPILE_CACHE_CACHE_DIR: path.join(reports, 'v8-cache'),
  TMP: temporary,
  TEMP: temporary,
  TS_NODE_COMPILER: path.join(repo, 'node_modules/typescript/lib/typescript.js'),
  WEBPACK_DEV_SERVER_PORT: '45233',
};
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function git(args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trimEnd();
}
const outsideStatus = () =>
  git(['status', '--porcelain', '--untracked-files=all'])
    .split('\n')
    .filter(line => line && !line.slice(3).replaceAll('"', '').startsWith(`${scope}/`));
const sourceFiles = () => {
  const walk = directory =>
    fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return entry.name === 'testing' || directory.includes(`${path.sep}testing`) ? walk(file) : [];
      }
      return /\.(tsx?|cjs|json|md)$/.test(entry.name) || entry.name === '.gitignore'
        ? [{ name: path.relative(__dirname, file).replaceAll('\\', '/'), hash: digest(file) }]
        : [];
    });
  return walk(__dirname).sort((a, b) => a.name.localeCompare(b.name));
};
function run(entry, args, name, cwd = repo) {
  const command = [path.join(repo, entry), ...args];
  const fd = fs.openSync(path.join(reports, `${name}.log`), 'wx');
  let result;
  try {
    result = spawnSync(process.execPath, command, {
      cwd,
      stdio: ['ignore', fd, fd],
      windowsHide: true,
      env: environment,
    });
  } finally {
    fs.closeSync(fd);
  }
  if (result.error) {
    throw result.error;
  }
  const record = { command: [process.execPath, ...command], cwd, exitCode: result.status, log: `${name}.log` };
  fs.appendFileSync(path.join(reports, 'commands.jsonl'), `${JSON.stringify(record)}\n`);
  process.stdout.write(`${name}: exit ${result.status}\n`);
  return record;
}
const sourceBefore = sourceFiles();
fs.writeFileSync(path.join(reports, 'source-before.json'), JSON.stringify(sourceBefore, null, 2), { flag: 'wx' });
process.stdout.write(`Evidence: ${reports}\n`);
try {
  if (mode === 'snapshot') {
    const files = new Set([
      ...git(['ls-files', '-m', '-o', '--exclude-standard', '-z']).split('\0'),
      ...git([
        'ls-files',
        'packages/react-components/react-color-picker',
        'scripts/cypress',
        'scripts/eslint',
        '-z',
      ]).split('\0'),
      'tsconfig.base.json',
      'eslint.config.js',
      'package.json',
      'yarn.lock',
      'nx.json',
    ]);
    const trackedOwned = new Set(git(['ls-files', scope, '-z']).split('\0'));
    const before = {
      head: git(['rev-parse', 'HEAD']),
      branch: git(['branch', '--show-current']),
      status: outsideStatus(),
      files: [...files]
        .filter(file => file && (!file.startsWith(`${scope}/`) || trackedOwned.has(file)))
        .filter(file => fs.existsSync(path.join(repo, file)) && fs.statSync(path.join(repo, file)).isFile())
        .map(file => ({ path: file, hash: digest(path.join(repo, file)) })),
    };
    fs.writeFileSync(path.join(reports, 'preservation-before.json'), JSON.stringify(before, null, 2), { flag: 'wx' });
    process.stdout.write(`Captured ${before.files.length} hashes on ${before.branch}; preserve ${label}\n`);
  } else if (mode === 'preserve') {
    const before = JSON.parse(
      fs.readFileSync(path.join(temporary, `snapshot-${label}`, 'preservation-before.json'), 'utf8'),
    );
    const after = {
      beforeHead: before.head,
      head: git(['rev-parse', 'HEAD']),
      branch: git(['branch', '--show-current']),
      status: outsideStatus(),
      checkedHashes: before.files.length,
      changedFiles: before.files.filter(
        file => !fs.existsSync(path.join(repo, file.path)) || digest(path.join(repo, file.path)) !== file.hash,
      ),
    };
    after.headUnchanged = after.head === before.head;
    after.branchUnchanged = after.branch === before.branch;
    after.outsideStatusUnchanged = JSON.stringify(after.status) === JSON.stringify(before.status);
    after.outsideStatusAdded = after.status.filter(line => !before.status.includes(line));
    after.outsideStatusRemoved = before.status.filter(line => !after.status.includes(line));
    after.concurrentCommits = after.headUnchanged
      ? []
      : git(['log', '--format=%h %s', `${before.head}..${after.head}`]).split('\n');
    after.concurrentChangedPaths = after.headUnchanged
      ? []
      : git(['diff', '--name-only', before.head, after.head]).split('\n');
    fs.writeFileSync(path.join(reports, 'preservation-after.json'), JSON.stringify(after, null, 2), { flag: 'wx' });
    process.stdout.write(
      `Preserved ${after.checkedHashes - after.changedFiles.length}/${after.checkedHashes} hashes; head unchanged: ${
        after.headUnchanged
      }; branch unchanged: ${after.branchUnchanged}; outside status unchanged: ${after.outsideStatusUnchanged}\n`,
    );
    assert(
      after.headUnchanged && after.branchUnchanged && after.outsideStatusUnchanged && !after.changedFiles.length,
      'Preservation mismatch; never revert concurrent work',
    );
    process.stdout.write(
      `Preserved ${after.checkedHashes}/${after.checkedHashes} hashes; head/branch/outside status unchanged\n`,
    );
  } else if (mode === 'cypress' || mode === 'standard') {
    const port = spawnSync(
      process.execPath,
      [
        '-e',
        "const s=require('node:net').createServer();s.on('error',e=>{console.error(e.message);process.exit(1)});s.listen(45233,'127.0.0.1',()=>s.close());",
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    assert.equal(port.status, 0, `owned port 45233 unavailable: ${port.stderr}`);
    const existing = new Set(fs.readdirSync(temporary));
    const args = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--config-file',
      mode === 'standard' ? 'cypress.config.ts' : 'src/components/ColorPicker/ColorPicker.cypress.config.cjs',
      '--spec',
      'src/components/ColorPicker/ColorPicker.cy.tsx',
      '--reporter',
      'junit',
      '--reporter-options',
      `mochaFile=${path.join(reports, 'results-[hash].xml')}`,
      '--config',
      `trashAssetsBeforeRuns=false,video=false,screenshotsFolder=${path.join(
        reports,
        'screenshots',
      )},downloadsFolder=${path.join(reports, 'downloads')}`,
    ];
    if (round !== 4) {
      args.push('--env', `coverageRound=${round}`);
    }
    const command = run('node_modules/cypress/bin/cypress', args, 'cypress', library);
    assert.equal(command.exitCode, 0, fs.readFileSync(path.join(reports, 'cypress.log'), 'utf8').slice(-14000));
    const xmlFiles = fs.readdirSync(reports).filter(name => /^results-.*\.xml$/.test(name));
    assert.equal(xmlFiles.length, 1, 'one canonical spec result');
    const xml = fs.readFileSync(path.join(reports, xmlFiles[0]), 'utf8');
    assert(!/<(?:failure|error|skipped)\b/.test(xml), 'zero failures/errors/skips/pending');
    const decode = value =>
      value
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    const cases = [...xml.matchAll(/<testcase\b[^>]*name="([^"]+)"/g)].map(match => decode(match[1]));
    const roots = fs.readdirSync(temporary).filter(name => name.startsWith('audits-') && !existing.has(name));
    assert.equal(roots.length, 1, 'one campaign registration');
    const auditsPath = path.join(temporary, roots[0]);
    const evidence = fs
      .readdirSync(auditsPath)
      .map(name => JSON.parse(fs.readFileSync(path.join(auditsPath, name), 'utf8')));
    assert(
      evidence.every(item => ['manifest', 'axe', 'axe-checkpoint', 'gradient'].includes(item.kind)),
      'only declared evidence kinds accepted',
    );
    const manifests = evidence.filter(item => item.kind === 'manifest');
    assert.equal(manifests.length, 1);
    const manifest = manifests[0];
    const audits = evidence.filter(item => item.kind === 'axe');
    const checkpoints = evidence.filter(item => item.kind === 'axe-checkpoint');
    const gradients = evidence.filter(item => item.kind === 'gradient');
    const expected = [21, 45, 60, 112][round - 1];
    assert.equal(manifest.round, round);
    assert.equal(manifest.tests, expected);
    assert.equal(cases.length, expected, 'exact raw JUnit count');
    assert.equal(new Set(cases).size, expected, 'unique JUnit titles');
    assert.deepEqual([...cases].sort(), [...manifest.titles].sort(), 'JUnit identities equal authored manifest');
    assert.equal(audits.length, expected);
    assert.equal(new Set(audits.map(item => item.scenario)).size, expected);
    assert.deepEqual(
      audits.map(item => item.scenario).sort(),
      [...cases].sort(),
      'every executed title audited exactly once',
    );
    assert.equal(checkpoints.length, [0, 0, 4, 7][round - 1]);
    assert.deepEqual(
      checkpoints.map(item => item.scenario).sort(),
      [...manifest.checkpoints].sort(),
      'exact checkpoint title multiplicity',
    );
    assert(
      evidence.every(item => item.retries === 0),
      'zero retries throughout',
    );
    assert(
      [...audits, ...checkpoints].every(item => item.passes.length > 0),
      'no empty axe evaluations',
    );
    assert.equal(gradients.length, [0, 0, 0, 19][round - 1]);
    assert.deepEqual(
      gradients.map(item => item.scenario).sort(),
      [...manifest.gradients].sort(),
      'exact gradient title multiplicity',
    );
    for (const item of gradients) {
      assert(['ltr', 'rtl'].includes(item.dir));
      assert(item.backgroundImage.startsWith('linear-gradient(') && /^rgb/.test(item.backgroundColor));
      assert(/^rgba?\(/.test(item.thumbColor));
      assert(Math.abs(item.thumbFractionX - (item.dir === 'rtl' ? 1 - item.s : item.s)) < 0.001);
      assert(Math.abs(item.thumbFractionY - (1 - item.v)) < 0.001);
    }
    const summary = {
      mode,
      round,
      command,
      total: expected,
      passed: expected,
      failed: 0,
      errors: 0,
      skipped: 0,
      pending: 0,
      retries: 0,
      cases,
      manifest,
      auditsPath,
      audits,
      checkpoints,
      gradients,
      sources: sourceBefore,
    };
    fs.writeFileSync(path.join(reports, 'summary.json'), JSON.stringify(summary, null, 2), { flag: 'wx' });
    process.stdout.write(
      `${expected} passed; ${audits.length + checkpoints.length} axe evaluations; ${
        gradients.length
      } browser gradients\n`,
    );
  } else {
    const authored = sourceBefore
      .map(file => file.name)
      .filter(name => name !== '.gitignore')
      .filter(
        name =>
          !/^(ColorPicker\.tsx|ColorPicker\.types\.ts|ColorPicker\.test\.tsx|useColorPicker.*|renderColorPicker\.tsx|index\.ts)$/.test(
            name,
          ),
      );
    const records = [
      run(
        'node_modules/prettier/bin-prettier.js',
        [mode === 'format' ? '--write' : '--check', ...authored.map(local)],
        'format',
      ),
    ];
    if (mode === 'checks') {
      records.push(
        run(
          'node_modules/eslint/bin/eslint.js',
          [
            '--config',
            path.join(library, 'eslint.config.cjs'),
            ...authored.filter(name => /\.(tsx?|cjs)$/.test(name)).map(local),
            '--no-cache',
          ],
          'lint',
        ),
        run(
          'node_modules/typescript/bin/tsc',
          ['-p', local('testing/tsconfig.json'), '--pretty', 'false'],
          'typecheck-final',
        ),
        run(
          'node_modules/typescript/bin/tsc',
          ['-p', local('ColorPicker.cy-baseline.tsconfig.json'), '--pretty', 'false'],
          'typecheck-baseline',
        ),
        run(
          'node_modules/eslint/bin/eslint.js',
          [
            '--config',
            path.join(library, 'eslint.config.cjs'),
            ...[
              'ColorPicker.tsx',
              'ColorPicker.types.ts',
              'useColorPicker.ts',
              'useColorPickerContextValues.ts',
              'useColorPickerStyles.styles.ts',
              'renderColorPicker.tsx',
              'index.ts',
            ].map(local),
            '--no-cache',
          ],
          'production-lint',
        ),
      );
      const diagnostics = name =>
        fs
          .readFileSync(path.join(reports, `${name}.log`), 'utf8')
          .split('\n')
          .filter(line => /error TS\d+:/.test(line))
          .sort();
      const current = diagnostics('typecheck-final');
      const baseline = diagnostics('typecheck-baseline');
      const comparison = { current, baseline, identical: JSON.stringify(current) === JSON.stringify(baseline) };
      fs.writeFileSync(path.join(reports, 'typecheck-comparison.json'), JSON.stringify(comparison, null, 2), {
        flag: 'wx',
      });
      assert(comparison.identical, 'same imported-story/JSX bridge baseline diagnostics');
      assert(
        records
          .filter(record => record.log.startsWith('typecheck-'))
          .every(record => record.exitCode === 0 || diagnostics(record.log.replace('.log', '')).length),
        'nonzero typing contains actual baseline diagnostics',
      );
    }
    assert(
      records.filter(record => !record.log.startsWith('typecheck-')).every(record => record.exitCode === 0),
      'format and ordinary package lint pass',
    );
  }
} finally {
  const after = sourceFiles();
  fs.writeFileSync(path.join(reports, 'source-after.json'), JSON.stringify(after, null, 2), { flag: 'wx' });
  if (mode !== 'format') {
    assert.deepEqual(after, sourceBefore, 'recursive authored/production/testing/CI source hashes unchanged');
  }
}
