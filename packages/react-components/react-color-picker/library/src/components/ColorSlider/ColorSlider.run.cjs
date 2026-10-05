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
const requestedRound = process.argv[3] === undefined ? '4' : process.argv[3];
assert(['1', '2', '3', '4'].includes(requestedRound), 'round must be 1, 2, 3, or 4');
const round = Number(requestedRound);
assert(['cypress', 'standard', 'format', 'checks', 'units', 'preserve'].includes(mode), 'invalid verification mode');
assert(process.argv.length <= 4, 'unexpected arguments');
const temporary = path.join(__dirname, '.temp');
const reports = path.join(temporary, `${mode}-r${round}-${Date.now()}-${process.pid}`);
fs.mkdirSync(reports, { recursive: true });
const environment = {
  ...process.env,
  PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}`,
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
  WEBPACK_DEV_SERVER_PORT: '45235',
};
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const save = (name, value) =>
  fs.writeFileSync(path.join(reports, `${name}.json`), JSON.stringify(value, null, 2), { flag: 'wx' });
function git(args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trimEnd();
}
const sourceFiles = () => {
  const walk = directory =>
    fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return entry.name === 'testing' || directory.includes(`${path.sep}testing`) ? walk(file) : [];
      }
      return [{ name: path.relative(__dirname, file).replaceAll('\\', '/'), hash: digest(file) }];
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
save('source-before', sourceBefore);
process.stdout.write(`Evidence: ${reports}\n`);
try {
  if (mode === 'preserve') {
    const entries = fs.readdirSync(temporary).filter(name => name.startsWith('row134-entry-'));
    assert.equal(entries.length, 1, 'one untouched entry snapshot');
    const entry = path.join(temporary, entries[0]);
    const before = JSON.parse(fs.readFileSync(path.join(entry, 'preservation-before.json'), 'utf8'));
    const baseline = fs.readFileSync(path.join(entry, 'ColorSlider.cy.tsx.original'));
    const canonical = fs.readFileSync(path.join(__dirname, 'ColorSlider.cy.tsx'));
    const importEnd = canonical.indexOf(10) + 1;
    assert.equal(
      canonical.subarray(0, importEnd).toString().trimEnd(),
      "import './testing/ColorSlider.cy.stories';",
      'exactly one permitted import',
    );
    assert.deepEqual(canonical.subarray(importEnd), baseline, 'original five Cypress bodies byte-for-byte preserved');
    for (const file of ['ColorSlider.test.tsx', 'useColorSlider.test.tsx']) {
      assert.deepEqual(
        fs.readFileSync(path.join(__dirname, file)),
        fs.readFileSync(path.join(entry, `${file}.original`)),
      );
    }
    const immutable = before.files.filter(
      file =>
        !file.path.startsWith(`${scope}/`) || !/ColorSlider\.(?:cy|cypress|eslint|run)/.test(path.basename(file.path)),
    );
    const changedFiles = immutable.filter(
      file => !fs.existsSync(path.join(repo, file.path)) || digest(path.join(repo, file.path)) !== file.hash,
    );
    const status = git(['status', '--porcelain', '--untracked-files=all']);
    const outside = value =>
      value.split('\n').filter(line => line && !line.slice(3).replaceAll('"', '').startsWith(`${scope}/`));
    const result = {
      head: git(['rev-parse', 'HEAD']),
      beforeHead: before.head,
      branchUnchanged: git(['branch', '--show-current']) === before.branch,
      outsideStatusUnchanged: JSON.stringify(outside(status)) === JSON.stringify(outside(before.status)),
      hashes: immutable.length,
      changedFiles,
      baselineBodiesPreserved: true,
      unitSnapshotsPreserved: true,
    };
    result.headUnchanged = result.head === before.head;
    save('preservation', result);
    assert(
      result.headUnchanged && result.branchUnchanged && result.outsideStatusUnchanged && !changedFiles.length,
      'strict global preservation mismatch; never revert concurrent work',
    );
  } else if (mode === 'cypress' || mode === 'standard') {
    const port = spawnSync(
      process.execPath,
      [
        '-e',
        "const s=require('node:net').createServer();s.on('error',e=>{console.error(e.message);process.exit(1)});s.listen(45235,'127.0.0.1',()=>s.close());",
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    assert.equal(port.status, 0, `owned port unavailable: ${port.stderr}`);
    const existing = new Set(fs.readdirSync(temporary));
    const args = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--config-file',
      mode === 'standard' ? 'cypress.config.ts' : 'src/components/ColorSlider/ColorSlider.cypress.config.cjs',
      '--spec',
      'src/components/ColorSlider/ColorSlider.cy.tsx',
      '--reporter',
      'junit',
      '--reporter-options',
      `mochaFile=${path.join(reports, 'results-[hash].xml')}`,
      '--config',
      `retries=0,trashAssetsBeforeRuns=false,video=false,screenshotsFolder=${path.join(
        reports,
        'screenshots',
      )},downloadsFolder=${path.join(reports, 'downloads')}`,
    ];
    if (round !== 4) {
      args.push('--env', `coverageRound=${round}`);
    }
    const command = run('node_modules/cypress/bin/cypress', args, 'cypress', library);
    const xmlFiles = fs.readdirSync(reports).filter(name => /^results-.*\.xml$/.test(name));
    const evidenceDirectories = fs
      .readdirSync(temporary)
      .filter(name => name.startsWith('audits-') && !existing.has(name));
    save('attempt', { command, xmlFiles, evidenceDirectories });
    assert.equal(command.exitCode, 0, fs.readFileSync(path.join(reports, 'cypress.log'), 'utf8').slice(-12000));
    assert.equal(xmlFiles.length, 1, 'one canonical spec');
    const xml = fs.readFileSync(path.join(reports, xmlFiles[0]), 'utf8');
    assert(!/<(?:failure|error|skipped)\b/.test(xml), 'zero failures/errors/skips/pending');
    const decode = value =>
      value
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    const attributes = tag =>
      Object.fromEntries(
        [...tag.matchAll(/\b([a-zA-Z][a-zA-Z0-9]*)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]),
      );
    const testcases = [...xml.matchAll(/<testcase\b([^>]*)>/g)].map(match => attributes(match[1]));
    const cases = testcases.map(item => item.name);
    const scenarioCases = testcases.map(item => item.classname);
    assert(testcases.every(item => typeof item.name === 'string' && typeof item.classname === 'string'));
    const suites = [...xml.matchAll(/<testsuite\b([^>]*)>/g)].map(match => attributes(match[1]));
    const root = xml.match(/<testsuites\b([^>]*)>/);
    assert(root && suites.length > 0, 'raw JUnit has root and suite counters');
    const rootAttributes = attributes(root[1]);
    for (const suite of [rootAttributes, ...suites]) {
      for (const name of ['failures', 'errors', 'skipped', 'pending', 'retries']) {
        if (suite[name] !== undefined) {
          assert.equal(suite[name], '0', `raw JUnit ${name} counter is zero`);
        }
      }
      assert(/^\d+$/.test(suite.tests), 'valid raw JUnit test counter');
    }
    assert.equal(evidenceDirectories.length, 1, 'one suite registration');
    const auditsPath = path.join(temporary, evidenceDirectories[0]);
    const evidence = fs
      .readdirSync(auditsPath)
      .filter(name => /\.json$/.test(name))
      .map(name => JSON.parse(fs.readFileSync(path.join(auditsPath, name), 'utf8')));
    assert(
      evidence.every(item =>
        ['manifest', 'axe', 'axe-checkpoint', 'pixels', 'functional-baseline'].includes(item.kind),
      ),
    );
    const manifests = evidence.filter(item => item.kind === 'manifest');
    assert.equal(manifests.length, 1);
    const manifest = manifests[0];
    const baseline = [
      'has correct focus behavior',
      'hue channel selected correctly',
      'hue channel selected on left edge correctly',
      'hue channel selected on right edge correctly',
      'has correct a11y attributes',
    ];
    const expected = manifest.tests + baseline.length;
    assert.equal(expected, [42, 102, 139, 180][round - 1], 'fixed reviewed-round case counts');
    const audits = evidence.filter(item => item.kind === 'axe');
    const checkpoints = evidence.filter(item => item.kind === 'axe-checkpoint');
    const pixels = evidence.filter(item => item.kind === 'pixels');
    assert.equal(manifest.round, round);
    assert.equal(manifest.tests, manifest.titles.length);
    assert.equal(cases.length, expected);
    assert.equal(new Set(cases).size, expected);
    assert.equal(Number(rootAttributes.tests), expected);
    assert.equal(
      suites.reduce((sum, suite) => sum + Number(suite.tests), 0),
      expected,
    );
    assert.deepEqual(
      [...cases].sort(),
      [
        ...manifest.titles.map(title => `row134 ColorSlider browser coverage ${title}`),
        ...baseline.map(
          title => `ColorSlider ${title === 'has correct a11y attributes' ? 'mouse' : 'keyboard'} navigation ${title}`,
        ),
      ].sort(),
      'raw JUnit equals exact authored and original titles',
    );
    assert.deepEqual(
      [...scenarioCases].sort(),
      [...manifest.titles, ...baseline].sort(),
      'exact raw classname identities',
    );
    assert.equal(audits.length, manifest.tests);
    assert.equal(new Set(audits.map(item => item.scenario)).size, manifest.tests);
    assert.deepEqual(audits.map(item => item.scenario).sort(), [...manifest.titles].sort());
    assert.deepEqual(checkpoints.map(item => item.scenario).sort(), [...manifest.checkpoints].sort());
    assert.deepEqual(pixels.map(item => item.scenario).sort(), [...manifest.pixels].sort());
    assert(evidence.every(item => item.retries === 0));
    assert([...audits, ...checkpoints].every(item => item.passes.length > 0));
    for (const item of [...audits, ...checkpoints]) {
      assert.deepEqual(
        item.fullResults.passes.map(rule => rule.id),
        item.passes,
      );
      assert.deepEqual(
        item.fullResults.violations.map(rule => rule.id),
        item.violations.map(rule => rule.id),
      );
      assert.deepEqual(
        item.fullResults.incomplete.map(rule => rule.id),
        item.incomplete.map(rule => rule.id),
      );
      assert(item.fullResults.testEngine.name === 'axe-core' && item.fullResults.inapplicable.length > 0);
    }
    assert.equal(checkpoints.length, round < 3 ? 0 : round === 3 ? 1 : 9);
    assert.equal(pixels.length, round < 4 ? 0 : 27);
    assert.equal(new Set(pixels.map(item => item.name)).size, pixels.length);
    for (const item of pixels) {
      assert.equal(item.samples.length, 3);
      assert(fs.statSync(path.join(auditsPath, `${item.name}.png`)).size > 0);
      for (const sample of item.samples) {
        assert.equal(sample.expected.length, 3);
        assert.equal(sample.actual.length, 4);
        assert.equal(sample.actual[3], 255);
        sample.expected.forEach((value, index) => assert(Math.abs(sample.actual[index] - value) <= 4));
      }
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
      scenarioCases,
      junitCounters: { root: rootAttributes, suites },
      manifest,
      auditsPath,
      audits,
      checkpoints,
      pixels,
      evidence,
      sources: sourceBefore,
    };
    save('summary', summary);
    process.stdout.write(
      `${expected} passed; ${audits.length + checkpoints.length} axe evaluations; ${pixels.length} CDP captures\n`,
    );
  } else if (mode === 'units') {
    const command = run(
      'node_modules/jest/bin/jest.js',
      [
        '--config',
        'jest.config.cjs',
        '--runInBand',
        '--runTestsByPath',
        'src/components/ColorSlider/ColorSlider.test.tsx',
        'src/components/ColorSlider/useColorSlider.test.tsx',
        '--json',
        `--outputFile=${path.join(reports, 'units.json')}`,
        '--cacheDirectory',
        path.join(reports, 'jest-cache'),
      ],
      'units',
      library,
    );
    assert.equal(command.exitCode, 0);
    const results = JSON.parse(fs.readFileSync(path.join(reports, 'units.json'), 'utf8'));
    assert(results.success && !results.numFailedTests && !results.numPendingTests && !results.numTodoTests);
    assert.equal(results.numPassedTestSuites, 2);
    assert(!results.snapshot.failure && !results.snapshot.unmatched && !results.snapshot.updated);
  } else {
    const production = new Set([
      'ColorSlider.tsx',
      'ColorSlider.types.ts',
      'useColorSlider.ts',
      'useColorSliderStyles.styles.ts',
      'renderColorSlider.tsx',
      'ColorSlider.constants.ts',
      'index.ts',
      'ColorSlider.test.tsx',
      'useColorSlider.test.tsx',
      'ColorSlider.cy.tsx',
    ]);
    const authored = sourceBefore.map(file => file.name).filter(name => name !== '.gitignore' && !production.has(name));
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
            local('ColorSlider.cy.tsx'),
            '--no-cache',
          ],
          'lint',
        ),
      );
      for (const variant of ['final', 'baseline']) {
        records.push(
          run(
            'node_modules/typescript/bin/tsc',
            [
              '-p',
              local(variant === 'final' ? 'testing/tsconfig.json' : 'ColorSlider.cy-baseline.tsconfig.json'),
              '--pretty',
              'false',
            ],
            `typecheck-${variant}`,
          ),
        );
      }
      const diagnostics = name =>
        fs
          .readFileSync(path.join(reports, `${name}.log`), 'utf8')
          .split('\n')
          .filter(line => /error TS\d+:/.test(line))
          .sort();
      const current = diagnostics('typecheck-final');
      const baseline = diagnostics('typecheck-baseline');
      save('typecheck-comparison', {
        current,
        baseline,
        identical: JSON.stringify(current) === JSON.stringify(baseline),
      });
      assert.deepEqual(current, baseline, 'same imported-story bridge diagnostics, no new typing errors');
      assert(
        records
          .filter(record => record.log.startsWith('typecheck-'))
          .every(record => record.exitCode === 0 || diagnostics(record.log.replace('.log', '')).length),
      );
    }
    assert(
      records.filter(record => !record.log.startsWith('typecheck-')).every(record => record.exitCode === 0),
      'format and ordinary package lint pass',
    );
  }
} finally {
  const after = sourceFiles();
  save('source-after', after);
  if (mode !== 'format') {
    assert.deepEqual(after, sourceBefore, 'recursive source bytes unchanged during verification');
  }
}
