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
assert(/^[1-4]$/.test(requestedRound), 'round must be 1, 2, 3, or 4');
const round = Number(requestedRound);
assert(
  ['cypress', 'standard', 'format', 'checks', 'snapshot', 'preserve'].includes(mode),
  'Expected cypress, standard, format, checks [round], snapshot <label>, or preserve <label>',
);
const preservationLabel = preservation ? process.argv[3] : undefined;
assert(
  !preservation || (preservationLabel && /^[a-zA-Z0-9-]+$/.test(preservationLabel)),
  'snapshot/preserve require a unique alphanumeric label',
);
const temporary = path.join(__dirname, '.temp');
const reports = path.join(
  temporary,
  mode === 'snapshot' ? `snapshot-${preservationLabel}` : `${mode}-r${round}-${Date.now()}-${process.pid}`,
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
  WEBPACK_DEV_SERVER_PORT: '45232',
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
      return !entry.name.startsWith('.baseline') &&
        (/\.(tsx?|cjs|json|md)$/.test(entry.name) || entry.name === '.gitignore')
        ? [{ name: path.relative(__dirname, file).replaceAll('\\', '/'), hash: digest(file) }]
        : [];
    });
  return walk(__dirname).sort((a, b) => a.name.localeCompare(b.name));
};
function run(entry, args, label, cwd = repo) {
  const command = [path.join(repo, entry), ...args];
  const fd = fs.openSync(path.join(reports, `${label}.log`), 'wx');
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
  const record = { command: [process.execPath, ...command], cwd, exitCode: result.status, log: `${label}.log` };
  fs.appendFileSync(path.join(reports, 'commands.jsonl'), `${JSON.stringify(record)}\n`);
  process.stdout.write(`${label}: exit ${result.status}\n`);
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
    process.stdout.write(`Captured ${before.files.length} hashes on ${before.branch}; preserve ${preservationLabel}\n`);
  } else if (mode === 'preserve') {
    const before = JSON.parse(
      fs.readFileSync(path.join(temporary, `snapshot-${preservationLabel}`, 'preservation-before.json'), 'utf8'),
    );
    const after = {
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
    fs.writeFileSync(path.join(reports, 'preservation-after.json'), JSON.stringify(after, null, 2), { flag: 'wx' });
    assert(
      after.headUnchanged && after.branchUnchanged && after.outsideStatusUnchanged && !after.changedFiles.length,
      'Preservation mismatch; never revert concurrent work',
    );
    process.stdout.write(
      `Preserved ${after.checkedHashes}/${after.checkedHashes} hashes; branch/head/outside status unchanged\n`,
    );
  } else if (mode === 'cypress' || mode === 'standard') {
    const port = spawnSync(
      process.execPath,
      [
        '-e',
        "const s=require('node:net').createServer();s.on('error',e=>{console.error(e.message);process.exit(1)});s.listen(45232,'127.0.0.1',()=>s.close());",
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    assert.equal(port.status, 0, `owned port 45232 unavailable: ${port.stderr}`);
    const existing = new Set(fs.readdirSync(temporary));
    const args = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--config-file',
      mode === 'standard' ? 'cypress.config.ts' : 'src/components/ColorArea/ColorArea.cypress.config.cjs',
      '--spec',
      'src/components/ColorArea/ColorArea.cy.tsx',
      '--reporter',
      'junit',
      '--reporter-options',
      `mochaFile=${path.join(reports, 'results-[hash].xml')}`,
      '--config',
      `retries=0,trashAssetsBeforeRuns=false,video=false,viewportWidth=1000,viewportHeight=1000,screenshotsFolder=${path.join(
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
    const cases = xmlFiles.flatMap(name => {
      const xml = fs.readFileSync(path.join(reports, name), 'utf8');
      assert(!/<(?:failure|error|skipped)\b/.test(xml), 'no failures, errors or skipped cases');
      return [...xml.matchAll(/<testcase\b[^>]*name="([^"]+)"[^>]*classname="([^"]+)"/g)].map(
        match => `${match[1]} :: ${match[2]}`,
      );
    });
    const auditRoots = fs.readdirSync(temporary).filter(name => name.startsWith('audits-') && !existing.has(name));
    assert.equal(auditRoots.length, 1, 'exactly one canonical campaign registration');
    const auditsPath = path.join(temporary, auditRoots[0]);
    const readEvidence = prefix =>
      fs
        .readdirSync(auditsPath)
        .filter(name => new RegExp(`^${prefix}-\\d+\\.json$`).test(name))
        .map(name => JSON.parse(fs.readFileSync(path.join(auditsPath, name), 'utf8')));
    const audits = readEvidence('audit');
    const gradients = readEvidence('gradient');
    const expected = [31, 58, 91, 103][round - 1];
    assert.equal(cases.length, expected, 'exact raw JUnit count including seven baseline cases');
    assert.equal(new Set(cases).size, expected, 'unique raw JUnit cases');
    assert.equal(audits.length, expected - 7, 'exactly one full default axe evaluation per new case');
    assert.equal(new Set(audits.map(audit => audit.scenario)).size, expected - 7, 'unique new audited cases');
    assert(
      audits.every(audit => audit.retries === 0 && audit.passes.length > 0 && audit.incomplete.length === 0),
      'positive evaluated rules, no retries or incompletes',
    );
    assert.deepEqual(
      audits.map(audit => audit.scenario).sort(),
      cases
        .filter(name => name.includes(' :: R'))
        .map(name => name.split(' :: ')[1])
        .sort(),
      'every new case audited exactly once',
    );
    assert.equal(gradients.length, [0, 0, 2, 16][round - 1], 'exact measured gradient observations');
    assert.equal(new Set(gradients.map(item => JSON.stringify(item))).size, gradients.length, 'unique observations');
    for (const item of gradients) {
      assert.equal(item.retries, 0);
      assert(['ltr', 'rtl'].includes(item.direction));
      assert(item.backgroundImage.startsWith('linear-gradient(') && /^rgb/.test(item.backgroundColor));
      assert(/^rgba?\(/.test(item.thumbColor));
      const saturation = Number(item.saturation) / 100;
      assert(Math.abs(item.thumbFractionX - (item.direction === 'rtl' ? 1 - saturation : saturation)) < 0.001);
      assert(Math.abs(item.thumbFractionY - (1 - Number(item.value) / 100)) < 0.001);
    }
    const screenshots =
      round === 4
        ? ['ltr', 'rtl'].map(direction => {
            const file = path.join(
              reports,
              'screenshots',
              'ColorArea.cy.tsx',
              `only132-forced-colors-${direction}.png`,
            );
            assert(fs.statSync(file).size > 0, 'forced-colors screenshot exists');
            return { path: file, hash: digest(file) };
          })
        : [];
    const summary = {
      mode,
      round,
      command,
      total: cases.length,
      passed: cases.length,
      failed: 0,
      errors: 0,
      skipped: 0,
      pending: 0,
      retries: 0,
      baseline: 7,
      newCases: expected - 7,
      cases,
      auditsPath,
      audits,
      gradients,
      screenshots,
      sources: sourceBefore,
    };
    fs.writeFileSync(path.join(reports, 'summary.json'), JSON.stringify(summary, null, 2), { flag: 'wx' });
    process.stdout.write(
      `${cases.length}/${expected} passed; ${audits.length} new-case axe audits; ${gradients.length} measured gradients\n`,
    );
  } else {
    const authored = sourceBefore
      .map(file => file.name)
      .filter(name => /(\.stories\.tsx?|\.cy\.tsx|\.cjs|\.json|\.cy\.md)$/.test(name));
    const records = [
      run(
        'node_modules/prettier/bin-prettier.js',
        [mode === 'format' ? '--write' : '--check', ...authored.map(local)],
        'format',
      ),
    ];
    if (mode === 'checks') {
      const baselineFile = path.join(__dirname, '.baseline.cy.tsx');
      const original = spawnSync('git', ['show', `HEAD:${local('ColorArea.cy.tsx')}`], { cwd: repo, encoding: 'utf8' });
      assert.equal(original.status, 0, original.stderr);
      assert.equal(
        fs
          .readFileSync(path.join(__dirname, 'ColorArea.cy.tsx'), 'utf8')
          .replace("import './testing/ColorArea.cy.stories';\n", ''),
        original.stdout,
        'all original baseline source bytes preserved except the canonical fixture import',
      );
      fs.writeFileSync(baselineFile, original.stdout, { flag: 'wx' });
      try {
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
            ['-p', local('ColorArea.cy-baseline.tsconfig.json'), '--pretty', 'false'],
            'typecheck-baseline',
          ),
        );
      } finally {
        fs.unlinkSync(baselineFile);
      }
      const diagnostics = label =>
        fs
          .readFileSync(path.join(reports, `${label}.log`), 'utf8')
          .split('\n')
          .filter(line => /error TS\d+:/.test(line))
          .sort();
      const current = diagnostics('typecheck-final');
      const baseline = diagnostics('typecheck-baseline');
      const comparison = { current, baseline, identical: JSON.stringify(current) === JSON.stringify(baseline) };
      fs.writeFileSync(path.join(reports, 'typecheck-comparison.json'), JSON.stringify(comparison, null, 2), {
        flag: 'wx',
      });
      assert(comparison.identical, 'discoverable TypeScript diagnostics equal the untouched baseline');
      assert(
        records
          .filter(record => record.log.startsWith('typecheck-'))
          .every(record => record.exitCode === 0 || diagnostics(record.log.replace('.log', '')).length > 0),
        'nonzero typecheck exits contain actual baseline diagnostics',
      );
    }
    assert(
      records.filter(record => !record.log.startsWith('typecheck-')).every(record => record.exitCode === 0),
      'format and unchanged-package ESLint checks pass',
    );
  }
} finally {
  const after = sourceFiles();
  fs.writeFileSync(path.join(reports, 'source-after.json'), JSON.stringify(after, null, 2), { flag: 'wx' });
  if (mode !== 'format') {
    assert.deepEqual(after, sourceBefore, 'recursive component/testing/CI source bytes unchanged during validation');
  }
}
