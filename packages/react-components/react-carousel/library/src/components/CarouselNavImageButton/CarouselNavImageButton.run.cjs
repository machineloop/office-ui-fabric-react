'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../../../../../..');
const library = path.resolve(__dirname, '../../..');
const scope = path.relative(repo, __dirname).replaceAll('\\', '/');
const mode = process.argv[2];
const round = Number(process.argv[3] === undefined ? 3 : process.argv[3]);
assert([1, 2, 3].includes(round), 'round must be 1, 2, or 3');
assert(
  ['snapshot', 'cypress', 'standard', 'format', 'checks', 'preserve', 'evidence'].includes(mode),
  'Expected snapshot, cypress [round], standard [round], format, checks, preserve, or evidence',
);
const validation = ['cypress', 'standard', 'format', 'checks'].includes(mode);
const reports = validation
  ? path.join(__dirname, '.runner-temp', `${mode}-r${round}-${Date.now()}-${process.pid}`)
  : path.join(__dirname, 'reports');
const temporary = path.join(__dirname, '.runner-temp');
fs.mkdirSync(reports, { recursive: true });
fs.mkdirSync(temporary, { recursive: true });
const environment = {
  ...process.env,
  NX_DAEMON: 'false',
  NX_ISOLATE_PLUGINS: 'false',
  NX_NO_CLOUD: 'true',
  NX_CACHE_DIRECTORY: path.join(temporary, 'nx-cache'),
  NX_WORKSPACE_DATA_DIRECTORY: path.join(temporary, 'nx-data'),
  NX_NATIVE_FILE_CACHE_DIRECTORY: path.join(temporary, 'nx-native'),
  V8_COMPILE_CACHE_CACHE_DIR: path.join(temporary, 'v8-cache'),
  TMP: temporary,
  TEMP: temporary,
  TS_NODE_COMPILER: path.join(repo, 'node_modules/typescript/lib/typescript.js'),
  WEBPACK_DEV_SERVER_PORT: '45331',
};
function git(args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(result.stderr);
  }
  return result.stdout.trimEnd();
}
const hash = file =>
  crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(repo, file)))
    .digest('hex');
const outsideStatus = () =>
  git(['status', '--porcelain', '--untracked-files=all'])
    .split('\n')
    .filter(line => line && !line.slice(3).replaceAll('"', '').startsWith(`${scope}/`));
function run(entry, args, label, extraEnvironment = {}, cwd = repo) {
  const command = [path.join(repo, entry), ...args];
  const fd = fs.openSync(path.join(reports, `${label}.log`), 'wx');
  let result;
  try {
    result = spawnSync(process.execPath, command, {
      cwd,
      stdio: ['ignore', fd, fd],
      windowsHide: true,
      env: { ...environment, ...extraEnvironment },
    });
  } finally {
    fs.closeSync(fd);
  }
  if (result.error) {
    throw result.error;
  }
  const record = {
    command: ['node', ...command],
    tool: ['node', entry, ...args],
    exitCode: result.status,
    log: `${label}.log`,
    cwd,
  };
  fs.appendFileSync(path.join(reports, 'commands.jsonl'), `${JSON.stringify(record)}\n`);
  process.stdout.write(`${label}: exit ${result.status}\n`);
  return record;
}
const sourceFiles = () => {
  const walk = directory =>
    fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return entry.name === 'testing' || directory.includes(`${path.sep}testing`) ? walk(file) : [];
      }
      return /\.(tsx?|cjs|json|md)$/.test(entry.name) || entry.name === '.gitignore'
        ? [{ name: path.relative(__dirname, file), hash: hash(path.relative(repo, file)) }]
        : [];
    });
  return walk(__dirname);
};
const sourceBefore = validation ? sourceFiles() : undefined;
if (validation) {
  fs.writeFileSync(path.join(reports, 'source-before.json'), JSON.stringify(sourceBefore, null, 2));
  process.stdout.write(`Evidence: ${reports}\n`);
}
try {
  if (mode === 'snapshot') {
    const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean);
    const files = new Set([...tracked, ...git(['ls-files', '-o', '--exclude-standard', '-z']).split('\0')]);
    const before = {
      head: git(['rev-parse', 'HEAD']),
      branch: git(['branch', '--show-current']),
      status: outsideStatus(),
      files: [...files]
        .filter(file => file && (!file.startsWith(`${scope}/`) || tracked.includes(file)))
        .filter(file => fs.existsSync(path.join(repo, file)) && fs.statSync(path.join(repo, file)).isFile())
        .map(file => ({ path: file, hash: hash(file) })),
    };
    fs.writeFileSync(path.join(reports, 'preservation-before.json'), JSON.stringify(before, null, 2), { flag: 'wx' });
    process.stdout.write(`Captured ${before.files.length} hashes on ${before.branch}\n`);
  } else if (mode === 'cypress' || mode === 'standard') {
    const label = 'cypress';
    const existing = new Set(fs.readdirSync(temporary));
    const args = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--config-file',
      mode === 'standard'
        ? 'cypress.config.ts'
        : 'src/components/CarouselNavImageButton/CarouselNavImageButton.cypress.config.cjs',
      '--spec',
      'src/components/CarouselNavImageButton/CarouselNavImageButton.cy.tsx',
      '--reporter',
      'junit',
      '--reporter-options',
      `mochaFile=${path.join(reports, 'results-[hash].xml')}`,
      '--config',
      `retries=0,trashAssetsBeforeRuns=false,video=false,viewportWidth=1000,viewportHeight=800,screenshotsFolder=${path.join(
        reports,
        'screenshots',
      )},downloadsFolder=${path.join(reports, 'downloads')}`,
    ];
    if (round !== 3) {
      args.push('--env', `coverageRound=${round}`);
    }
    const command = run('node_modules/cypress/bin/cypress', args, label, {}, library);
    if (command.exitCode !== 0) {
      throw new Error(fs.readFileSync(path.join(reports, `${label}.log`), 'utf8').slice(-12000));
    }
    const cases = fs
      .readdirSync(reports)
      .filter(name => /^results-.*\.xml$/.test(name))
      .flatMap(name => {
        const xml = fs.readFileSync(path.join(reports, name), 'utf8');
        assert(!/<(?:failure|error|skipped)\b/.test(xml), name);
        return [...xml.matchAll(/<testcase\b[^>]*name="([^"]+)"[^>]*classname="([^"]+)"/g)].map(
          match => `${match[2]} :: ${match[1]}`,
        );
      });
    const auditRoots = fs.readdirSync(temporary).filter(name => name.startsWith('audits-') && !existing.has(name));
    assert.equal(auditRoots.length, 1, 'exactly one canonical fixture execution');
    const auditsPath = path.join(temporary, auditRoots[0]);
    const audits = fs
      .readdirSync(auditsPath)
      .filter(name => /^audit-\d+\.json$/.test(name))
      .map(name => JSON.parse(fs.readFileSync(path.join(auditsPath, name), 'utf8')));
    const expected = [33, 96, 131][round - 1];
    const summary = {
      command,
      mode,
      round,
      total: cases.length,
      passed: cases.length,
      failed: 0,
      pending: 0,
      skipped: 0,
      retries: 0,
      cases,
      auditsPath,
      audits,
      sources: sourceBefore,
    };
    fs.writeFileSync(path.join(reports, 'summary.json'), JSON.stringify(summary, null, 2));
    process.stdout.write(
      `${summary.passed}/${summary.total} passed; ${summary.failed} failed; ${audits.length} audits\n`,
    );
    assert.equal(cases.length, expected, 'exact raw JUnit count');
    assert.equal(new Set(cases).size, expected, 'unique raw JUnit cases');
    assert.equal(audits.length, expected, 'one actual axe evaluation per case');
    assert.equal(new Set(audits.map(audit => audit.test)).size, expected, 'unique audited cases');
    assert(
      audits.every(audit => audit.retries === 0 && audit.passes.length > 0),
      'evaluated with no retries',
    );
  } else if (mode === 'format' || mode === 'checks') {
    const authored = sourceFiles()
      .map(file => file.name)
      .filter(name => /(\.stories\.tsx?|\.cy\.tsx|\.functional\.test\.tsx|\.cjs|\.json|\.cy\.md)$/.test(name));
    const local = name => `${scope}/${name}`;
    const records = [
      run(
        'node_modules/prettier/bin-prettier.js',
        [mode === 'format' ? '--write' : '--check', ...authored.map(local)],
        `format-${mode}`,
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
          'lint-final',
        ),
        run(
          'node_modules/typescript/bin/tsc',
          ['-p', local('testing/tsconfig.json'), '--pretty', 'false'],
          'typecheck-final',
        ),
        run(
          'node_modules/typescript/bin/tsc',
          ['-p', local('CarouselNavImageButton.cy-baseline.tsconfig.json'), '--pretty', 'false'],
          'typecheck-baseline',
        ),
        run(
          'node_modules/typescript/bin/tsc',
          ['-p', local('CarouselNavImageButton.unit.tsconfig.json'), '--pretty', 'false'],
          'typecheck-units',
        ),
        run(
          'node_modules/typescript/bin/tsc',
          ['-p', local('CarouselNavImageButton.unit-baseline.tsconfig.json'), '--pretty', 'false'],
          'typecheck-units-baseline',
        ),
        run(
          'node_modules/jest/bin/jest.js',
          [
            '--config',
            local('CarouselNavImageButton.jest.config.cjs'),
            '--runInBand',
            '--runTestsByPath',
            local('CarouselNavImageButton.test.tsx'),
            local('CarouselNavImageButton.functional.test.tsx'),
            'packages/react-components/react-carousel/library/src/components/CarouselNavButton/CarouselNavButton.test.tsx',
            '--cacheDirectory',
            path.join(temporary, 'jest-cache'),
            '--json',
            '--outputFile',
            path.join(reports, 'units.json'),
          ],
          'units',
        ),
      );
      const diagnostics = label =>
        fs
          .readFileSync(path.join(reports, `${label}.log`), 'utf8')
          .split('\n')
          .filter(line => /error TS\d+:/.test(line))
          .sort();
      const current = diagnostics('typecheck-final');
      const baseline = diagnostics('typecheck-baseline');
      const units = diagnostics('typecheck-units');
      const unitBaseline = diagnostics('typecheck-units-baseline');
      const comparison = {
        current,
        baseline,
        identical: JSON.stringify(current) === JSON.stringify(baseline),
        newDiagnostics: current.filter(line => !baseline.includes(line)),
        units,
        unitBaseline,
        unitsIdentical: JSON.stringify(units) === JSON.stringify(unitBaseline),
        newUnitDiagnostics: units.filter(line => !unitBaseline.includes(line)),
      };
      fs.writeFileSync(path.join(reports, 'typecheck-comparison.json'), JSON.stringify(comparison, null, 2));
      if (
        !comparison.identical ||
        !comparison.unitsIdentical ||
        records.some(
          record =>
            record.log.startsWith('typecheck-') &&
            record.exitCode !== 0 &&
            diagnostics(record.log.replace('.log', '')).length === 0,
        ) ||
        records.filter(record => !record.log.startsWith('typecheck-')).some(record => record.exitCode !== 0)
      ) {
        throw new Error('Scoped checks failed; inspect lint/format/unit and typecheck comparison logs');
      }
    } else if (records.some(record => record.exitCode !== 0)) {
      throw new Error('Formatting failed');
    }
  } else if (mode === 'evidence') {
    const summaries = fs
      .readdirSync(reports)
      .filter(name => /^round-\d+-attempt-\d+-summary\.json$/.test(name))
      .map(name => ({
        name,
        modified: fs.statSync(path.join(reports, name)).mtimeMs,
        result: JSON.parse(fs.readFileSync(path.join(reports, name), 'utf8')),
      }));
    const rounds = [1, 2, 3].map(coverageRound => {
      const successful = summaries
        .filter(
          entry =>
            entry.result.round === coverageRound &&
            entry.result.command.exitCode === 0 &&
            entry.result.passed === entry.result.total &&
            !entry.result.failed,
        )
        .sort((a, b) => b.modified - a.modified)[0];
      if (!successful) {
        throw new Error(`Missing successful coverage round ${coverageRound}`);
      }
      return successful;
    });
    const final = rounds[2].result;
    const units = JSON.parse(fs.readFileSync(path.join(reports, 'units.json'), 'utf8'));
    const typing = JSON.parse(fs.readFileSync(path.join(reports, 'typecheck-comparison.json'), 'utf8'));
    const preservation = JSON.parse(fs.readFileSync(path.join(reports, 'preservation-after.json'), 'utf8'));
    const count = key => ({
      rules: final.audits.reduce((sum, audit) => sum + audit[key].length, 0),
      nodes: final.audits.reduce(
        (sum, audit) => sum + audit[key].reduce((subtotal, rule) => subtotal + rule.nodes.length, 0),
        0,
      ),
    });
    const evidence = {
      scope,
      browserRounds: rounds.map(entry => ({
        file: entry.name,
        total: entry.result.total,
        passed: entry.result.passed,
        failed: entry.result.failed,
        pending: entry.result.pending,
        skipped: entry.result.skipped,
        audits: entry.result.audits.length,
      })),
      finalBrowser: {
        total: final.total,
        passed: final.passed,
        uniqueTitles: new Set(final.cases.map(test => test.title.join(' / '))).size,
      },
      axe: {
        audits: final.audits.length,
        classifications: final.audits.reduce(
          (counts, audit) => ({ ...counts, [audit.classification]: (counts[audit.classification] || 0) + 1 }),
          {},
        ),
        violations: count('violations'),
        incomplete: count('incomplete'),
      },
      units: {
        total: units.numTotalTests,
        passed: units.numPassedTests,
        failed: units.numFailedTests,
        pending: units.numPendingTests,
        suites: units.testResults.map(suite => ({
          file: path.relative(repo, suite.name),
          status: suite.status,
          cases: suite.assertionResults.length,
        })),
      },
      typing,
      preservation: {
        checkedHashes: preservation.checkedHashes,
        unchangedHashes: preservation.checkedHashes - preservation.changedFiles.length,
        changedFiles: preservation.changedFiles,
        headUnchanged: preservation.headUnchanged,
        branchUnchanged: preservation.branchUnchanged,
        outsideStatusUnchanged: preservation.outsideStatusUnchanged,
        concurrentCommits: preservation.concurrentCommits,
        concurrentCommitPaths: preservation.concurrentCommitPaths,
        outsideAddedPaths: preservation.outsideAddedPaths,
        knownCommittedDifferencesOnly: preservation.knownCommittedDifferencesOnly,
        componentSourcesUnchanged: preservation.componentSourcesUnchanged,
        strictPreservation: preservation.strictPreservation,
      },
      commandsFile: 'commands.jsonl',
      traceability: 'CarouselNavImageButton.cy.md',
      sources: fs
        .readdirSync(__dirname)
        .filter(name => /\.(tsx?|cjs|json|md)$/.test(name))
        .map(name => ({ name, hash: hash(`${scope}/${name}`) })),
    };
    fs.writeFileSync(path.join(reports, 'ONLY131-evidence.json'), JSON.stringify(evidence, null, 2), { flag: 'wx' });
    if (
      final.total !== 131 ||
      units.numFailedTests ||
      !typing.identical ||
      !typing.unitsIdentical ||
      !preservation.knownCommittedDifferencesOnly ||
      !preservation.componentSourcesUnchanged ||
      !preservation.branchUnchanged ||
      (!preservation.outsideStatusUnchanged &&
        !preservation.outsideAddedPaths.length &&
        !preservation.concurrentCommitPaths.length)
    ) {
      throw new Error('Evidence contains failed validation or preservation');
    }
    process.stdout.write(
      `ONLY131: ${final.total} browser cases; ${units.numPassedTests} units; ${final.audits.length} exact axe audits; ${
        preservation.checkedHashes - preservation.changedFiles.length
      }/${preservation.checkedHashes} unchanged hashes; ${
        preservation.changedFiles.length
      } concurrent committed differences\n`,
    );
  } else if (mode === 'preserve') {
    const before = JSON.parse(fs.readFileSync(path.join(reports, 'preservation-before.json'), 'utf8'));
    const after = {
      head: git(['rev-parse', 'HEAD']),
      branch: git(['branch', '--show-current']),
      status: outsideStatus(),
      changedFiles: before.files.filter(
        file => !fs.existsSync(path.join(repo, file.path)) || hash(file.path) !== file.hash,
      ),
      checkedHashes: before.files.length,
    };
    after.headUnchanged = after.head === before.head;
    after.branchUnchanged = after.branch === before.branch;
    after.outsideStatusUnchanged = JSON.stringify(after.status) === JSON.stringify(before.status);
    after.concurrentCommits = after.headUnchanged
      ? []
      : git(['log', '--format=%h %s', `${before.head}..${after.head}`]).split('\n');
    after.concurrentCommitPaths = after.headUnchanged
      ? []
      : git(['diff', '--name-only', before.head, after.head]).split('\n');
    after.outsideAddedPaths = after.status
      .filter(line => line.startsWith('?? ') && !before.status.includes(line))
      .map(line => line.slice(3));
    const committedDiff = after.changedFiles.length
      ? spawnSync('git', ['diff', '--quiet', after.head, '--', ...after.changedFiles.map(file => file.path)], {
          cwd: repo,
          encoding: 'utf8',
        })
      : { status: 0, stderr: '', error: undefined };
    if (committedDiff.error || committedDiff.status === null || committedDiff.status > 1) {
      throw committedDiff.error || new Error(committedDiff.stderr);
    }
    after.knownCommittedDifferencesOnly =
      after.changedFiles.every(file => after.concurrentCommitPaths.includes(file.path)) && committedDiff.status === 0;
    after.componentSourcesUnchanged = after.changedFiles.every(file => !file.path.startsWith(`${scope}/`));
    after.strictPreservation =
      after.headUnchanged && after.branchUnchanged && after.outsideStatusUnchanged && !after.changedFiles.length;
    fs.writeFileSync(path.join(reports, 'preservation-after.json'), JSON.stringify(after, null, 2), { flag: 'wx' });
    process.stdout.write(
      `${after.checkedHashes} hashes checked; ${after.changedFiles.length} concurrent committed changes; component sources ${after.componentSourcesUnchanged}; branch ${after.branchUnchanged}; strict preservation ${after.strictPreservation}\n`,
    );
    if (!after.branchUnchanged || !after.knownCommittedDifferencesOnly || !after.componentSourcesUnchanged) {
      throw new Error('Unexplained preservation mismatch; never revert concurrent changes');
    }
  } else {
    throw new Error('Expected snapshot, cypress <round> [attempt], format, checks, preserve, or evidence');
  }
} finally {
  if (validation) {
    const after = sourceFiles();
    fs.writeFileSync(path.join(reports, 'source-after.json'), JSON.stringify(after, null, 2));
    if (mode !== 'format') {
      assert.deepEqual(after, sourceBefore, 'source bytes unchanged during validation');
    }
  }
}
