'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const owned = __dirname;
const repo = path.resolve(owned, '../../../../../../..');
const pkg = path.resolve(owned, '../../..');
const scope = path.relative(repo, owned).replaceAll('\\', '/');
const mode = process.argv[2] ?? 'standard';
const rawRound = process.argv[3] ?? '3';
const label = process.argv[4] ?? 'verification';
assert(
  [
    'standard',
    'cypress',
    'checks',
    'format',
    'units',
    'isolation',
    'discovery',
    'registered',
    'sync',
    'preserve',
    'invalid',
    'seal',
  ].includes(mode),
  'invalid mode',
);
assert(['1', '2', '3'].includes(rawRound), 'round must be exactly 1, 2, or 3');
assert(/^[a-z0-9][a-z0-9-]{0,39}$/.test(label), 'invalid label');
assert(process.argv.length <= 5, 'unexpected arguments');
const round = Number(rawRound);
const evidenceRoot = path.join(owned, '.evidence');
const receipt = path.join(evidenceRoot, `${mode}-r${round}-${label}-${Date.now()}-${process.pid}`);
fs.mkdirSync(receipt, { recursive: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const walk = directory =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    const file = path.join(directory, item.name);
    return item.name === '.evidence' ? [] : item.isDirectory() ? walk(file) : [file];
  });
const sources = () =>
  walk(owned)
    .map(file => ({ path: path.relative(owned, file), hash: hash(file) }))
    .sort((a, b) => a.path.localeCompare(b.path));
const save = (name, value) =>
  fs.writeFileSync(path.join(receipt, `${name}.json`), JSON.stringify(value, null, 2), { flag: 'wx' });
function git(args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trimEnd();
}
const entryPath = path.join(evidenceRoot, 'entry.json');
const entryWasMissing = !fs.existsSync(entryPath);
if (entryWasMissing) {
  const files = new Set([
    ...git([
      'ls-files',
      '--',
      path.relative(repo, pkg).replaceAll('\\', '/'),
      'scripts/cypress',
      'package.json',
      'yarn.lock',
      'nx.json',
      'tsconfig.base.json',
      'eslint.config.js',
    ]).split('\n'),
    ...git(['diff', '--name-only', 'HEAD']).split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
  ]);
  fs.writeFileSync(
    entryPath,
    JSON.stringify(
      {
        head: git(['rev-parse', 'HEAD']),
        branch: git(['branch', '--show-current']),
        status: git(['status', '--porcelain', '--untracked-files=all']),
        files: [...files]
          .filter(file => file && fs.existsSync(path.join(repo, file)) && fs.statSync(path.join(repo, file)).isFile())
          .map(file => ({ path: file, hash: hash(path.join(repo, file)) })),
        originalCypress: git(['ls-files', '--', `${scope}/*.cy.tsx`])
          .split('\n')
          .filter(Boolean)
          .map(file => ({ path: file, hash: hash(path.join(repo, file)) })),
      },
      null,
      2,
    ),
    { flag: 'wx' },
  );
}
const entry = JSON.parse(fs.readFileSync(entryPath, 'utf8'));
save('entry-initialization', {
  entryWasMissing,
  baselineHead: entry.head,
  originalCypress: entry.originalCypress,
  baselineFileCount: entry.files.length,
});
function outside() {
  const files = new Set([
    ...entry.files.map(file => file.path),
    ...git(['diff', '--name-only', 'HEAD']).split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
  ]);
  return {
    head: git(['rev-parse', 'HEAD']),
    status: git(['status', '--porcelain', '--untracked-files=all'])
      .split('\n')
      .filter(line => !line.slice(3).startsWith(`${scope}/`)),
    files: [...files]
      .filter(file => file && !file.startsWith(`${scope}/`))
      .sort()
      .map(file => ({ path: file, hash: fs.existsSync(path.join(repo, file)) ? hash(path.join(repo, file)) : null })),
  };
}
const nxRoot = path.join(evidenceRoot, `n-${Date.now().toString(36)}-${process.pid}`);
for (const name of ['c', 'd', 'n']) {
  fs.mkdirSync(path.join(nxRoot, name), { recursive: true });
}
const env = {
  ...process.env,
  PATH: `${path.dirname(process.execPath)}${path.delimiter}${path.join(repo, 'node_modules/.bin')}${path.delimiter}${
    process.env.PATH
  }`,
  NX_DAEMON: 'false',
  NX_ISOLATE_PLUGINS: 'false',
  NX_NO_CLOUD: 'true',
  NX_CACHE_DIRECTORY: path.join(nxRoot, 'c'),
  NX_WORKSPACE_DATA_DIRECTORY: path.join(nxRoot, 'd'),
  NX_NATIVE_FILE_CACHE_DIRECTORY: path.join(nxRoot, 'n'),
  V8_COMPILE_CACHE_CACHE_DIR: path.join(receipt, 'v8'),
  TS_NODE_COMPILER: path.join(repo, 'node_modules/typescript/lib/typescript.js'),
  TMP: evidenceRoot,
  TEMP: evidenceRoot,
  WEBPACK_DEV_SERVER_PORT: '46139',
};
function run(script, args, name, cwd = repo) {
  const command = [process.execPath, path.join(repo, script), ...args];
  const fd = fs.openSync(path.join(receipt, `${name}.log`), 'wx');
  let result;
  try {
    result = spawnSync(command[0], command.slice(1), { cwd, env, stdio: ['ignore', fd, fd], windowsHide: true });
  } finally {
    fs.closeSync(fd);
  }
  if (result.error) {
    throw result.error;
  }
  const record = { command, cwd, exitCode: result.status, log: `${name}.log` };
  fs.appendFileSync(path.join(receipt, 'commands.jsonl'), `${JSON.stringify(record)}\n`);
  process.stdout.write(`${name}: exit ${result.status}\n`);
  return record;
}
const before = sources();
const outsideBefore = outside();
save('source-before', before);
save('outside-before', outsideBefore);
process.stdout.write(`Evidence: ${receipt}\n`);
try {
  if (mode === 'standard' || mode === 'cypress') {
    const port = spawnSync(
      process.execPath,
      [
        '-e',
        "const s=require('node:net').createServer();s.on('error',e=>{console.error(e.message);process.exit(1)});s.listen(46139,'127.0.0.1',()=>s.close());",
      ],
      { encoding: 'utf8' },
    );
    assert.equal(port.status, 0, `port 46139 occupied; do not kill its owner: ${port.stderr}`);
    const existing = new Set(fs.readdirSync(evidenceRoot));
    const args = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--config-file',
      mode === 'standard'
        ? 'cypress.config.ts'
        : 'src/components/TeachingPopoverFooter/TeachingPopoverFooter.cypress.config.cjs',
      '--spec',
      'src/components/TeachingPopoverFooter/TeachingPopoverFooter.cy.tsx',
      '--reporter',
      'junit',
      '--reporter-options',
      `mochaFile=${path.join(receipt, 'results-[hash].xml')}`,
      '--config',
      `retries=0,video=false,trashAssetsBeforeRuns=false,screenshotsFolder=${path.join(
        receipt,
        'screenshots',
      )},downloadsFolder=${path.join(receipt, 'downloads')}`,
    ];
    if (round !== 3) {
      args.push('--env', `coverageRound=${round}`);
    }
    assert.equal(
      run('node_modules/cypress/bin/cypress', args, 'chrome', pkg).exitCode,
      0,
      fs.readFileSync(path.join(receipt, 'chrome.log'), 'utf8').slice(-24000),
    );
    const xmlFiles = fs.readdirSync(receipt).filter(file => /^results-.*\.xml$/.test(file));
    assert.equal(xmlFiles.length, 1);
    const xml = fs.readFileSync(path.join(receipt, xmlFiles[0]), 'utf8');
    assert(!/<(?:failure|error|skipped)\b/.test(xml), 'zero failed/errored/skipped cases');
    const attrs = text =>
      Object.fromEntries(
        [...text.matchAll(/\b(\w+)="([^"]*)"/g)].map(match => [
          match[1],
          match[2]
            .replaceAll('&quot;', '"')
            .replaceAll('&apos;', "'")
            .replaceAll('&lt;', '<')
            .replaceAll('&gt;', '>')
            .replaceAll('&amp;', '&'),
        ]),
      );
    const cases = [...xml.matchAll(/<testcase\b([^>]*)>/g)].map(match => attrs(match[1]));
    const suites = [...xml.matchAll(/<testsuite\b([^>]*)>/g)].map(match => attrs(match[1]));
    const counters = attrs(xml.match(/<testsuites\b([^>]*)>/)[1]);
    for (const counter of [counters, ...suites]) {
      assert(/^\d+$/.test(counter.tests));
      for (const key of ['failures', 'errors', 'skipped', 'pending', 'retries']) {
        if (counter[key] !== undefined) {
          assert.equal(counter[key], '0');
        }
      }
    }
    const auditDirectories = fs
      .readdirSync(evidenceRoot)
      .filter(name => name.startsWith('audits-') && !existing.has(name));
    assert.equal(auditDirectories.length, 1);
    const auditRoot = path.join(evidenceRoot, auditDirectories[0]);
    const manifest = JSON.parse(fs.readFileSync(path.join(auditRoot, 'manifest.json'), 'utf8'));
    assert.equal(manifest.round, round);
    assert.equal(manifest.expectedCount, [25, 63, 84][round - 1]);
    assert.equal(new Set(manifest.titles).size, manifest.titles.length);
    assert.equal(cases.length, manifest.expectedCount);
    assert.equal(Number(counters.tests), cases.length);
    assert.equal(
      suites.reduce((sum, suite) => sum + Number(suite.tests), 0),
      cases.length,
    );
    assert.deepEqual(
      cases.map(item => item.name).sort(),
      manifest.titles.map(title => `row139 TeachingPopoverFooter ${title}`).sort(),
    );
    assert.deepEqual(cases.map(item => item.classname).sort(), [...manifest.titles].sort());
    const audits = fs
      .readdirSync(auditRoot)
      .filter(file => /^audit-\d+\.json$/.test(file))
      .map(file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8')));
    const finals = audits.filter(audit => audit.phase === 'final');
    assert.equal(audits.length, [32, 88, 118][round - 1], 'exact final and extra checkpoint counts');
    assert.deepEqual(finals.map(audit => audit.scenario).sort(), [...manifest.titles].sort());
    const checkpoints = [
      ...[
        'primary with secondary runs only its action while secondary toggles owner before consumer and root',
        'primary without secondary toggles before its action with the exact same original event',
        'consumer preventDefault is too late to veto internally first composed secondary toggle',
        'capture preventDefault vetoes internal toggle but preserves consumer and bubbling callbacks',
        'owner preventDefault does not undo an accepted uncontrolled close',
        'controlled acceptance consumes close payload and removes the real owned portal',
      ].map(title => [1, 'open-panel', title]),
      [
        1,
        'default-open',
        'controlled refusal records close request while retaining open DOM until external state changes',
      ],
      ...['Enter', 'Space'].flatMap(key => [
        [2, 'open-panel', `native ${key} on primary has exact activation order and original trusted event`],
        [2, 'open-panel', `native ${key} on secondary has exact activation order and original trusted event`],
        [2, 'open-panel', `native ${key} primary-only closes through its internally composed callback`],
      ]),
      ...['disabled', 'disabledFocusable', 'aria-disabled'].flatMap(disabled =>
        ['primary', 'secondary'].map(action => [
          2,
          'open-panel',
          `${disabled} ${action} guards real pointer Enter and Space callbacks without closing`,
        ]),
      ),
      ...[
        'latest owner and action callbacks survive internal rerender without stale closure or duplicate toggle',
        'uncontrolled defaultOpen closes then reopens with fresh source toggle state',
        'outside real pointer closes and Escape independently restores focus to the original trigger',
        'outside real pointer closes and Escape independently restores focus to the original trigger',
        'public hook style render behaves identically inside a real owner',
      ].map(title => [2, 'open-panel', title]),
      [2, 'default-open', 'uncontrolled defaultOpen closes then reopens with fresh source toggle state'],
      ...[
        'two independent real popovers close only their own Footer and retain distinct original callbacks',
        'secondary dismissal does not reopen unmounted uncontrolled portal or duplicate closing action',
        'primary consumer stopPropagation stops root bubbling but does not invent an internal primary close',
        'secondary consumer stopPropagation preserves already-run close and suppresses only root bubbling',
      ].map(title => [3, 'open-panel', title]),
      [
        3,
        'second-owner-open',
        'two independent real popovers close only their own Footer and retain distinct original callbacks',
      ],
      [
        3,
        'forced-colors-active',
        'CDP forced colors is active and uses actual Button system colors while preserving native action and source geometry',
      ],
      [
        3,
        'refused-open',
        'controlled refusal coalesces no state acceptance and each real click retains a distinct original event',
      ],
      ...['Default', 'AppearanceBrand'].map(name => [
        3,
        'stable-open',
        `unchanged stable ${name} uses real Footer primary secondary and header dismiss without relabeling`,
      ]),
    ]
      .filter(item => item[0] <= round)
      .map(item => `${item[1]}|${item[2]}`)
      .sort();
    assert.deepEqual(
      audits
        .filter(audit => audit.phase !== 'final')
        .map(audit => `${audit.phase}|${audit.scenario}`)
        .sort(),
      checkpoints,
      'exact extra audit identities, including the two outside-open checkpoints',
    );
    for (const audit of audits) {
      assert.equal(audit.round, round);
      assert.equal(audit.retries, 0);
      assert.equal(audit.fullResults.testEngine.name, 'axe-core');
      assert(audit.fullResults.passes.length > 0 && audit.auditedRoots.length > 0);
      if (!audit.profile) {
        assert.deepEqual(audit.fullResults.violations, []);
        assert.deepEqual(audit.fullResults.incomplete, []);
      } else {
        assert.equal(audit.profile, 'stable-basic');
        assert.match(audit.scenario, /^unchanged stable (Default|AppearanceBrand) /);
        assert.equal(audit.phase, 'stable-open');
        assert.equal(audit.fullResults.violations.length, 1);
        assert.equal(audit.fullResults.violations[0].id, 'aria-dialog-name');
        assert.equal(audit.fullResults.violations[0].impact, 'serious');
        assert.equal(audit.fullResults.violations[0].nodes.length, 1);
        assert.deepEqual(audit.fullResults.violations[0].nodes[0].target, ['.fui-PopoverSurface']);
        assert.equal(audit.fullResults.incomplete.length, 1);
        assert.equal(audit.fullResults.incomplete[0].id, 'aria-hidden-focus');
        assert.equal(audit.fullResults.incomplete[0].impact, 'serious');
        assert.deepEqual(
          audit.fullResults.incomplete[0].nodes.map(node => node.target),
          [['.fui-PopoverSurface > i:nth-child(1)'], ['i:nth-child(6)']],
        );
      }
    }
    assert(
      !/\b(?:it|scenario)\.(?:only|skip)\b/.test(
        fs.readFileSync(path.join(owned, 'testing/suite.stories.tsx'), 'utf8'),
      ),
    );
    const captures = fs.existsSync(path.join(receipt, 'screenshots'))
      ? walk(path.join(receipt, 'screenshots')).filter(file => file.endsWith('.png'))
      : [];
    assert.equal(captures.length, round === 3 ? 2 : 0);
    const guards = fs
      .readdirSync(auditRoot)
      .filter(file => /^classifier-guards-\d+\.json$/.test(file))
      .map(file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8')));
    assert.equal(guards.length, round === 3 ? 2 : 0);
    for (const guard of guards) {
      assert.deepEqual(guard.guardedProfiles, ['violations', 'incomplete']);
      assert.deepEqual(guard.rejected, [
        'unknown-rule',
        'duplicate-rule',
        'duplicate-node',
        'unknown-check',
        'wrong-target',
        'wrong-impact',
      ]);
    }
    const trust = fs
      .readdirSync(auditRoot)
      .filter(file => /^trust-.*\.json$/.test(file))
      .map(file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8')));
    assert.equal(trust.length, [0, 2, 4][round - 1]);
    assert(trust.every(item => item.trustedClick === false));
    save('summary', {
      round,
      passed: cases.length,
      originalCases: 0,
      newCases: cases.length,
      finalAudits: finals.length,
      totalAudits: audits.length,
      knownViolationAudits: audits.filter(item => item.fullResults.violations.length).length,
      knownIncompleteAudits: audits.filter(item => item.fullResults.incomplete.length).length,
      auditRoot,
      manifest,
      cases,
      counters,
      sources: before,
      cleanAccessibility: false,
      captures,
      guards,
      trust,
      checkpoints,
    });
    process.stdout.write(
      `${cases.length} passed; ${finals.length} final / ${audits.length} total full-default axe audits\n`,
    );
  } else if (mode === 'format' || mode === 'checks') {
    const files = before
      .map(item => `${scope}/${item.path.replaceAll('\\', '/')}`)
      .filter(
        file =>
          !file.endsWith('.gitignore') &&
          (file.includes('/testing/') || /\.(?:cy\.tsx|run\.cjs|cypress\.config\.cjs|cy\.md)$/.test(file)),
      );
    const records = [
      run('node_modules/prettier/bin-prettier.js', [mode === 'format' ? '--write' : '--check', ...files], 'format'),
    ];
    if (mode === 'checks') {
      save('checked-files', files);
      for (const name of ['bridge.stories.ts', 'contracts.stories.tsx', 'fixtures.stories.tsx', 'suite.stories.tsx']) {
        assert(
          files.includes(`${scope}/testing/${name}`),
          `all owned fixtures/contracts included in normal checks: ${name}`,
        );
      }
      records.push(
        run(
          'node_modules/eslint/bin/eslint.js',
          [
            '--config',
            path.join(pkg, 'eslint.config.cjs'),
            ...files.filter(file => /\.(?:[jt]sx?|cjs)$/.test(file)),
            '--no-cache',
          ],
          'lint',
        ),
      );
      records.push(
        run(
          'node_modules/typescript/bin/tsc',
          ['-p', path.join(owned, 'testing/tsconfig.json'), '--pretty', 'false'],
          'types',
        ),
      );
    }
    assert(
      records.every(record => record.exitCode === 0),
      'format/lint/types must pass',
    );
  } else if (mode === 'units') {
    assert.equal(
      run(
        'node_modules/jest/bin/jest.js',
        [
          '--config',
          path.join(owned, 'testing/jest.config.cjs'),
          '--runInBand',
          '--json',
          `--outputFile=${path.join(receipt, 'units.json')}`,
          '--cacheDirectory',
          path.join(receipt, 'jest'),
        ],
        'units',
        pkg,
      ).exitCode,
      0,
    );
    const results = JSON.parse(fs.readFileSync(path.join(receipt, 'units.json'), 'utf8'));
    assert.equal(results.numPassedTests, 38);
    assert(
      results.success &&
        results.numPassedTestSuites === 2 &&
        !results.numFailedTests &&
        !results.numPendingTests &&
        !results.numTodoTests,
    );
    assert(!results.snapshot.failure && !results.snapshot.unmatched && !results.snapshot.updated);
    save('summary', {
      passed: results.numPassedTests,
      suites: results.numPassedTestSuites,
      snapshots: results.snapshot,
    });
  } else if (mode === 'isolation') {
    const ts = require(path.join(repo, 'node_modules/typescript'));
    const config = ts.readConfigFile(path.join(pkg, 'tsconfig.lib.json'), ts.sys.readFile);
    assert(!config.error);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, pkg);
    assert.deepEqual(parsed.errors, []);
    const inScope = file => file.replaceAll('\\', '/').startsWith(`${owned.replaceAll('\\', '/')}/`);
    const original = new Set([
      'index.ts',
      'TeachingPopoverFooter.tsx',
      'TeachingPopoverFooter.types.ts',
      'renderTeachingPopoverFooter.tsx',
      'useTeachingPopoverFooter.ts',
      'useTeachingPopoverFooterStyles.styles.ts',
    ]);
    const roots = parsed.fileNames.filter(inScope);
    const inputs = ts
      .createProgram(parsed.fileNames, parsed.options)
      .getSourceFiles()
      .map(file => file.fileName)
      .filter(inScope);
    assert.equal(roots.length, original.size);
    assert.equal(inputs.length, original.size);
    assert(
      inputs.every(file => original.has(path.basename(file))),
      'no fixtures in actual production TS program',
    );
    assert.equal(
      run(
        'node_modules/@swc/cli/bin/swc.js',
        [
          ...walk(owned)
            .filter(file => /\.tsx?$/.test(file))
            .map(file => path.relative(pkg, file)),
          '--config-file',
          path.join(pkg, '.swcrc'),
          '--out-dir',
          path.join(receipt, 'emitted'),
          '--strip-leading-paths',
          '--sync',
        ],
        'swc',
        pkg,
      ).exitCode,
      0,
    );
    const emitted = walk(path.join(receipt, 'emitted'));
    const modules = emitted.filter(file => file.endsWith('.js'));
    const maps = emitted.filter(file => file.endsWith('.js.map'));
    assert.equal(modules.length, original.size);
    assert.equal(maps.length, original.size);
    assert(modules.every(file => [...original].some(name => name.replace(/\.tsx?$/, '.js') === path.basename(file))));
    save('isolation', { roots, inputs, emitted, modules: modules.length, maps: maps.length, fixtureEmission: 0 });
  } else if (mode === 'invalid') {
    const metadataNames = () =>
      fs
        .readdirSync(evidenceRoot)
        .filter(name => /-r\d+-/.test(name) || /^n-/.test(name) || /^(?:entry|initial).*\.json$/.test(name))
        .sort();
    const beforeInvalid = metadataNames();
    const entryHash = hash(entryPath);
    const records = [
      ['bogus'],
      ['cypress', '0'],
      ['cypress', '4'],
      ['cypress', '1.0'],
      ['cypress', ' 1'],
      ['cypress', 'NaN'],
      ['cypress', '3', '../escape'],
      ['cypress', '3', ''],
      ['cypress', '3', 'ok', 'extra'],
    ].map(args => {
      const result = spawnSync(process.execPath, [__filename, ...args], { env, encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert(/invalid mode|round must be exactly|invalid label|unexpected arguments/.test(result.stderr));
      return { args, exitCode: result.status };
    });
    assert.deepEqual(metadataNames(), beforeInvalid, 'invalid CLI creates no runner metadata');
    assert.equal(hash(entryPath), entryHash, 'invalid CLI does not rewrite entry metadata');
    save('invalid', records);
  } else if (mode === 'registered' || mode === 'sync') {
    const requests =
      mode === 'sync'
        ? [
            ['sync-check', ['sync', '--check', '--verbose']],
            [
              'sync-dry-run',
              ['generate', '@fluentui/workspace-plugin:export-maps-sync', '--dry-run', '--no-interactive'],
            ],
          ]
        : ['e2e', 'type-check'].map(target => [
            target,
            [
              'run',
              `teachingpopoverfooter-functional-tests:${target}`,
              '--skipSync',
              '--skipNxCache',
              '--outputStyle=static',
              '--verbose',
            ],
          ]);
    const records = requests.map(([name, args]) => {
      const record = run('node_modules/nx/bin/nx.js', args, name);
      return {
        ...record,
        windowsTS5023: /TS5023: Unknown compiler option '-'\./.test(
          fs.readFileSync(path.join(receipt, `${name}.log`), 'utf8'),
        ),
      };
    });
    save('prerequisite', {
      records,
      synchronizationApplied: false,
      coldGreen: records.every(record => record.exitCode === 0),
    });
    assert(
      records.every(record => record.exitCode === 0),
      'shared cold prerequisite blocked; no bypass',
    );
  } else if (mode === 'discovery') {
    function nxJSON(name, args) {
      assert.equal(run('node_modules/nx/bin/nx.js', args, name).exitCode, 0);
      return JSON.parse(
        fs
          .readFileSync(path.join(receipt, `${name}.log`), 'utf8')
          .replace(/^NX {2}Falling back to ts-node[^\n]*\r?\n -[^\n]*\r?\n/, ''),
      );
    }
    const project = nxJSON('project', ['show', 'project', 'teachingpopoverfooter-functional-tests', '--json']);
    assert.equal(project.root, `${scope}/testing/ciapp`);
    assert.deepEqual(project.tags, ['vNext', 'platform:web', 'test']);
    assert.deepEqual(project.implicitDependencies, [
      'react-teaching-popover',
      'react-components',
      'react-teaching-popover-stories',
    ]);
    for (const target of ['e2e', 'type-check']) {
      assert(
        project.targets[target].dependsOn.some(item => item.target === 'build' && item.projects === 'scripts-cypress'),
      );
    }
    save('project', project);
    for (const [name, file] of [
      ['production', `${scope}/useTeachingPopoverFooter.ts`],
      ['fixture', `${scope}/testing/fixtures.stories.tsx`],
      ['canonical', `${scope}/TeachingPopoverFooter.cy.tsx`],
      ['consumer', 'packages/react-components/react-components/library/src/index.ts'],
      [
        'story',
        'packages/react-components/react-teaching-popover/stories/src/TeachingPopover/TeachingPopoverDefault.stories.tsx',
      ],
    ]) {
      const affected = nxJSON(`affected-${name}`, ['show', 'projects', '--affected', '--files', file, '--json']);
      assert(affected.includes('teachingpopoverfooter-functional-tests'));
      save(`affected-${name}`, { file, affected });
    }
    const { fileMap } = JSON.parse(
      fs.readFileSync(path.join(env.NX_WORKSPACE_DATA_DIRECTORY, 'file-map.json'), 'utf8'),
    );
    assert(
      fileMap.projectFileMap['react-teaching-popover'].some(
        file => file.file === `${scope}/testing/fixtures.stories.tsx`,
      ),
    );
    const graph = JSON.parse(fs.readFileSync(path.join(env.NX_WORKSPACE_DATA_DIRECTORY, 'project-graph.json'), 'utf8'));
    assert(
      !(graph.dependencies['react-teaching-popover'] ?? []).some(edge =>
        ['react-components', 'react-teaching-popover-stories'].includes(edge.target),
      ),
    );
    const visited = new Set();
    function visit(name) {
      assert.notEqual(name, 'teachingpopoverfooter-functional-tests', 'no application cycle');
      if (visited.has(name)) {
        return;
      }
      visited.add(name);
      for (const edge of graph.dependencies[name] ?? []) {
        visit(edge.target);
      }
    }
    for (const edge of graph.dependencies['teachingpopoverfooter-functional-tests']) {
      visit(edge.target);
    }
    save('ownership', { fixtureOwner: 'react-teaching-popover', applicationCycle: false });
  } else if (mode === 'preserve') {
    const baseline = fs.existsSync(path.join(evidenceRoot, 'initial.json'))
      ? JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'initial.json'), 'utf8'))
      : entry;
    const changes = baseline.files.filter(
      file => !fs.existsSync(path.join(repo, file.path)) || hash(path.join(repo, file.path)) !== file.hash,
    );
    const originalChanges = changes.filter(file => file.path.startsWith(`${scope}/`));
    save('preservation', {
      originalChanges,
      outsideChanges: changes.filter(file => !file.path.startsWith(`${scope}/`)),
      baselineHead: baseline.head,
      currentHead: git(['rev-parse', 'HEAD']),
    });
    assert.deepEqual(originalChanges, [], 'original production/units/snapshot bytes preserved');
  } else {
    const prefixes = [
      'cypress-r1',
      'cypress-r2',
      'cypress-r3',
      'standard-r3',
      'checks-r3',
      'units-r3',
      'isolation-r3',
      'discovery-r3',
      'invalid-r3',
      'registered-r3',
      'sync-r3',
      'preserve-r3',
    ];
    const receipts = prefixes.map(prefix => {
      const matches = fs
        .readdirSync(evidenceRoot)
        .filter(name => name.startsWith(`${prefix}-${label}-`))
        .filter(name => {
          const file = path.join(evidenceRoot, name, 'source-before.json');
          return (
            fs.existsSync(file) && JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8'))) === JSON.stringify(before)
          );
        });
      assert.equal(matches.length, 1, `exactly one current-source ${prefix} receipt`);
      const directory = path.join(evidenceRoot, matches[0]);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'source-after.json'), 'utf8')), before);
      const blocked = prefix === 'registered-r3' || prefix === 'sync-r3';
      if (blocked) {
        const prerequisite = JSON.parse(fs.readFileSync(path.join(directory, 'prerequisite.json'), 'utf8'));
        assert.equal(prerequisite.synchronizationApplied, false);
        assert.equal(prerequisite.coldGreen, false, 'cold prerequisite is not green');
        if (prefix === 'registered-r3') {
          assert(prerequisite.records.every(record => record.windowsTS5023 && record.exitCode !== 0));
        } else {
          assert.equal(prerequisite.records[0].exitCode, 1);
          assert.equal(prerequisite.records[1].exitCode, 0);
        }
      } else {
        assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'outcome.json'), 'utf8')).status, 'passed');
      }
      let auditHashes = [];
      if (prefix.startsWith('cypress') || prefix.startsWith('standard')) {
        const summary = JSON.parse(fs.readFileSync(path.join(directory, 'summary.json'), 'utf8'));
        assert.equal(summary.passed, [25, 63, 84][summary.round - 1]);
        assert.equal(summary.totalAudits, [32, 88, 118][summary.round - 1]);
        auditHashes = walk(summary.auditRoot).map(file => ({ path: file, hash: hash(file) }));
      }
      return {
        prefix,
        directory,
        currentSources: true,
        blocked,
        auditHashes,
        hashes: walk(directory).map(file => ({ path: path.relative(directory, file), hash: hash(file) })),
      };
    });
    save('seal', {
      row: 139,
      parentInitialReviewPerformed: false,
      parentFreshRepeatReviewPerformed: false,
      committed: false,
      implementationVerified: true,
      coldNxGreen: false,
      cleanAccessibility: false,
      rounds: [25, 63, 84],
      fullDefaultFinalAudits: 84,
      fullDefaultTotalAudits: 118,
      originalCypressCases: 0,
      originalJestCases: 38,
      sourceManifest: before,
      sourceManifestSHA256: crypto.createHash('sha256').update(JSON.stringify(before)).digest('hex'),
      receipts,
    });
  }
  save('outcome', { mode, round, label, status: 'passed' });
} finally {
  const after = sources();
  const outsideAfter = outside();
  save('source-after', after);
  save('outside-after', outsideAfter);
  save('preservation-delta', {
    headBefore: outsideBefore.head,
    headAfter: outsideAfter.head,
    outsideChanges: outsideBefore.files.filter(
      file => outsideAfter.files.find(item => item.path === file.path)?.hash !== file.hash,
    ),
    addedOutside: outsideAfter.files.filter(file => !outsideBefore.files.some(item => item.path === file.path)),
    outsideStatusChanged: JSON.stringify(outsideBefore.status) !== JSON.stringify(outsideAfter.status),
  });
  if (mode !== 'format') {
    assert.deepEqual(after, before, 'owned sources unchanged while validating');
  }
}
