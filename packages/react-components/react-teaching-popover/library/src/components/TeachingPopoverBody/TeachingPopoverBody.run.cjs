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
const mode = process.argv[2] ?? 'cypress';
const rawRound = process.argv[3] ?? '3';
const label = process.argv[4] ?? 'verification';
assert(
  [
    'cypress',
    'standard',
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
fs.mkdirSync(evidenceRoot, { recursive: true });
const receipt = path.join(evidenceRoot, `${mode}-r${round}-${label}-${Date.now()}-${process.pid}`);
fs.mkdirSync(receipt);
const save = (name, value) =>
  fs.writeFileSync(path.join(receipt, `${name}.json`), JSON.stringify(value, null, 2), { flag: 'wx' });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const walk = directory =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.name === '.evidence' ? [] : entry.isDirectory() ? walk(file) : [file];
  });
const sources = () =>
  walk(owned)
    .map(file => ({ path: path.relative(owned, file), hash: hash(file) }))
    .sort((a, b) => a.path.localeCompare(b.path));
function git(args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trimEnd();
}
const production = [
  'index.ts',
  'TeachingPopoverBody.tsx',
  'TeachingPopoverBody.types.ts',
  'renderTeachingPopoverBody.tsx',
  'useTeachingPopoverBody.ts',
  'useTeachingPopoverBodyStyles.styles.ts',
];
const originals = [...production, 'TeachingPopoverBody.test.tsx', '__snapshots__/TeachingPopoverBody.test.tsx.snap'];
const baselinePath = path.join(evidenceRoot, 'entry.json');
const baselineWasMissing = !fs.existsSync(baselinePath);
if (baselineWasMissing) {
  const pkgScope = path.relative(repo, pkg).replaceAll('\\', '/');
  const tracked = git(['ls-files', '--', scope]).split('\n');
  const trackedCy = tracked.includes(`${scope}/TeachingPopoverBody.cy.tsx`)
    ? git(['show', `HEAD:${scope}/TeachingPopoverBody.cy.tsx`])
    : null;
  const originalCy = trackedCy?.trim() === "import './testing/suite.stories';" ? null : trackedCy;
  const files = new Set([
    ...git([
      'ls-files',
      '--',
      pkgScope,
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
    baselinePath,
    JSON.stringify(
      {
        head: git(['rev-parse', 'HEAD']),
        branch: git(['branch', '--show-current']),
        status: git(['status', '--porcelain', '--untracked-files=all']),
        originalCy,
        originalTitleManifest: [],
        originals: originals.map(file => ({ path: file, hash: hash(path.join(owned, file)) })),
        files: [...files]
          .filter(
            file =>
              file &&
              !file.startsWith(`${scope}/`) &&
              fs.existsSync(path.join(repo, file)) &&
              fs.statSync(path.join(repo, file)).isFile(),
          )
          .map(file => ({ path: file, hash: hash(path.join(repo, file)) })),
      },
      null,
      2,
    ),
    { flag: 'wx' },
  );
}
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
assert.equal(baseline.originalCy, null, 'row138 entry inventory found no original Cypress suite');
assert.equal(
  fs.readFileSync(path.join(owned, 'TeachingPopoverBody.cy.tsx'), 'utf8').trim(),
  "import './testing/suite.stories';",
);
function protectedFiles() {
  const files = new Set([
    ...baseline.files.map(file => file.path),
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
      .map(file => ({
        path: file,
        hash:
          fs.existsSync(path.join(repo, file)) && fs.statSync(path.join(repo, file)).isFile()
            ? hash(path.join(repo, file))
            : null,
      })),
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
  V8_COMPILE_CACHE_CACHE_DIR: path.join(receipt, 'v8-cache'),
  TS_NODE_COMPILER: path.join(repo, 'node_modules/typescript/lib/typescript.js'),
  TMP: evidenceRoot,
  TEMP: evidenceRoot,
  WEBPACK_DEV_SERVER_PORT: '46138',
};
function run(entry, args, name, cwd = repo) {
  const command = [process.execPath, path.join(repo, entry), ...args];
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
const outsideBefore = protectedFiles();
save('source-before', before);
save('outside-before', outsideBefore);
save('bootstrap', { baselineWasMissing, originalTitleManifest: baseline.originalTitleManifest, node: process.version });
process.stdout.write(`Evidence: ${receipt}\n`);
try {
  if (mode === 'cypress' || mode === 'standard') {
    const port = spawnSync(
      process.execPath,
      [
        '-e',
        "const s=require('node:net').createServer();s.on('error',e=>{console.error(e.message);process.exit(1)});s.listen(46138,'127.0.0.1',()=>s.close());",
      ],
      { encoding: 'utf8' },
    );
    assert.equal(port.status, 0, `port 46138 occupied: ${port.stderr}; never terminate another owner`);
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
        : 'src/components/TeachingPopoverBody/TeachingPopoverBody.cypress.config.cjs',
      '--spec',
      'src/components/TeachingPopoverBody/TeachingPopoverBody.cy.tsx',
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
    const command = run('node_modules/cypress/bin/cypress', args, 'chrome', pkg);
    assert.equal(command.exitCode, 0, fs.readFileSync(path.join(receipt, 'chrome.log'), 'utf8').slice(-22000));
    const xmlFiles = fs.readdirSync(receipt).filter(file => /^results-.*\.xml$/.test(file));
    assert.equal(xmlFiles.length, 1);
    const xml = fs.readFileSync(path.join(receipt, xmlFiles[0]), 'utf8');
    assert(!/<(?:failure|error|skipped)\b/.test(xml));
    const decode = value =>
      value
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    const attrs = tag =>
      Object.fromEntries([...tag.matchAll(/\b(\w+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
    const cases = [...xml.matchAll(/<testcase\b([^>]*)>/g)].map(match => attrs(match[1]));
    const suites = [...xml.matchAll(/<testsuite\b([^>]*)>/g)].map(match => attrs(match[1]));
    const counters = attrs(xml.match(/<testsuites\b([^>]*)>/)[1]);
    for (const item of [counters, ...suites]) {
      assert(/^\d+$/.test(item.tests));
      for (const key of ['failures', 'errors', 'skipped', 'pending', 'retries']) {
        if (item[key] !== undefined) {
          assert.equal(item[key], '0');
        }
      }
    }
    const auditDirectories = fs
      .readdirSync(evidenceRoot)
      .filter(file => file.startsWith('audits-') && !existing.has(file));
    assert.equal(auditDirectories.length, 1);
    const auditRoot = path.join(evidenceRoot, auditDirectories[0]);
    const manifest = JSON.parse(fs.readFileSync(path.join(auditRoot, 'manifest.json'), 'utf8'));
    assert.equal(manifest.round, round);
    assert.equal(new Set(manifest.titles).size, manifest.titles.length);
    assert.equal(manifest.titles.length, manifest.expectedCount);
    assert.equal(manifest.expectedCount, [18, 35, 53][round - 1]);
    assert(
      !/\b(?:it|scenario)\.(?:only|skip)\b/.test(
        fs.readFileSync(path.join(owned, 'testing/suite.stories.tsx'), 'utf8'),
      ),
    );
    assert.equal(cases.length, manifest.expectedCount);
    assert.equal(new Set(cases.map(item => item.name)).size, cases.length);
    assert.equal(Number(counters.tests), cases.length);
    assert.equal(
      suites.reduce((sum, item) => sum + Number(item.tests), 0),
      cases.length,
    );
    assert.deepEqual(
      cases.map(item => item.name).sort(),
      manifest.titles.map(title => `row138 TeachingPopoverBody ${title}`).sort(),
    );
    assert.deepEqual(cases.map(item => item.classname).sort(), [...manifest.titles].sort());
    const audits = fs
      .readdirSync(auditRoot)
      .filter(file => /^audit-\d+\.json$/.test(file))
      .map(file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8')));
    const finals = audits.filter(audit => audit.phase === 'final');
    assert.equal(audits.length, [18, 35, 65][round - 1]);
    assert.equal(finals.length, cases.length);
    assert.deepEqual(finals.map(audit => audit.scenario).sort(), [...manifest.titles].sort());
    assert.equal(new Set(audits.map(audit => `${audit.scenario}/${audit.phase}`)).size, audits.length);
    for (const audit of audits) {
      assert.equal(audit.round, round);
      assert.equal(audit.retries, 0);
      assert.equal(audit.fullResults.testEngine.name, 'axe-core');
      assert(audit.fullResults.passes.length > 0);
      assert(audit.auditedRoots.some(root => root.exposed && root.nonempty));
      assert.deepEqual(audit.actualFindingShape, audit.expectedFindingShape, 'raw static finding profile');
      if (audit.profile) {
        assert(['stable-basic', 'stable-carousel', 'stable-carousel-text'].includes(audit.profile));
        assert.match(
          audit.scenario,
          /^stable (Default|AppearanceBrand|Carousel|CarouselAppearanceBrand|CarouselText) /,
        );
        assert.match(audit.phase, /^stable-page-[123]$/);
        assert.equal(audit.fullResults.violations.length, 1);
        assert.equal(audit.fullResults.incomplete.length, 1);
        const rule = audit.fullResults.violations[0];
        assert.equal(rule.id, 'aria-dialog-name');
        assert.equal(rule.impact, 'serious');
        assert.equal(rule.nodes.length, 1);
        assert.deepEqual(rule.nodes[0].target, ['.fui-PopoverSurface']);
        assert.deepEqual(
          rule.nodes[0].any.map(check => ({ id: check.id, data: check.data, impact: check.impact })),
          ['aria-label', 'aria-labelledby', 'non-empty-title'].map(id => ({
            id,
            data: id === 'non-empty-title' ? { messageKey: 'noAttr' } : null,
            impact: 'serious',
          })),
        );
        assert.deepEqual(rule.nodes[0].all, []);
        assert.deepEqual(rule.nodes[0].none, []);
        const incomplete = audit.fullResults.incomplete[0];
        assert.equal(incomplete.id, 'aria-hidden-focus');
        assert.equal(incomplete.impact, 'serious');
        assert.deepEqual(
          incomplete.nodes.map(node => node.target),
          audit.profile === 'stable-carousel'
            ? [
                ['.fui-PopoverSurface > i:nth-child(1)'],
                ['.fui-TeachingPopoverCarouselNav > i:nth-child(1)'],
                ['.fui-TeachingPopoverCarouselNav > i:nth-child(5)'],
                ['.fui-PopoverSurface > i:nth-child(5)'],
              ]
            : [
                ['.fui-PopoverSurface > i:nth-child(1)'],
                [audit.profile === 'stable-basic' ? 'i:nth-child(6)' : 'i:nth-child(5)'],
              ],
        );
        for (const node of incomplete.nodes) {
          assert.equal(node.impact, 'serious');
          assert.deepEqual(node.any, []);
          assert.deepEqual(node.none, []);
          assert.equal(node.all.length, 1);
          assert.equal(node.all[0].id, 'focusable-modal-open');
          assert.equal(node.all[0].data, null);
          assert.equal(node.all[0].impact, 'serious');
          assert.equal(node.all[0].relatedNodes.length, 1);
          assert.deepEqual(node.all[0].relatedNodes[0].target, node.target);
          assert.equal(node.all[0].relatedNodes[0].html, node.html);
        }
      } else {
        assert.deepEqual(audit.fullResults.violations, []);
        assert.deepEqual(audit.fullResults.incomplete, []);
      }
      assert(
        audit.events.every(event => event.trusted),
        'native image and interaction events must be trusted',
      );
    }
    const guards = fs
      .readdirSync(auditRoot)
      .filter(file => /^guards-\d+\.json$/.test(file))
      .map(file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8')));
    const profileAudits = audits.filter(audit => audit.profile);
    assert.equal(profileAudits.length, round === 3 ? 11 : 0);
    assert.equal(guards.length, profileAudits.length);
    assert(
      guards.every(
        guard =>
          JSON.stringify(guard.rejected) ===
          JSON.stringify([
            'unknown-rule',
            'duplicate-rule',
            'duplicate-node',
            'unknown-check',
            'wrong-target',
            'wrong-impact',
          ]),
      ),
    );
    const captures = fs.existsSync(path.join(receipt, 'screenshots'))
      ? walk(path.join(receipt, 'screenshots')).filter(file => file.endsWith('.png'))
      : [];
    assert.equal(captures.length, round === 3 ? 5 : 0);
    save('summary', {
      command,
      round,
      passed: cases.length,
      originalBaselineCases: 0,
      finalAudits: finals.length,
      totalAudits: audits.length,
      knownViolationAudits: audits.filter(audit => audit.fullResults.violations.length).length,
      knownIncompleteAudits: audits.filter(audit => audit.fullResults.incomplete.length).length,
      captures,
      auditRoot,
      manifest,
      cases,
      counters,
      sources: before,
      cleanAccessibility: profileAudits.length === 0,
    });
    process.stdout.write(
      `${cases.length} passed; ${finals.length} final / ${audits.length} total full-default axe audits\n`,
    );
  } else if (mode === 'checks' || mode === 'format') {
    const files = before
      .map(item => `${scope}/${item.path.replaceAll('\\', '/')}`)
      .filter(
        file =>
          !originals.includes(file.slice(scope.length + 1)) && !file.endsWith('.gitignore') && !file.endsWith('.svg'),
      );
    const commands = [
      run('node_modules/prettier/bin-prettier.js', [mode === 'format' ? '--write' : '--check', ...files], 'format'),
    ];
    if (mode === 'checks') {
      commands.push(
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
      commands.push(
        run(
          'node_modules/typescript/bin/tsc',
          ['-p', path.join(owned, 'testing/tsconfig.json'), '--pretty', 'false'],
          'types',
        ),
      );
      save('authored-check-inputs', { files });
    }
    assert(
      commands.every(command => command.exitCode === 0),
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
          '--runTestsByPath',
          'src/components/TeachingPopoverBody/TeachingPopoverBody.test.tsx',
          '--json',
          `--outputFile=${path.join(receipt, 'units.json')}`,
          '--cacheDirectory',
          path.join(receipt, 'jest-cache'),
        ],
        'units',
        pkg,
      ).exitCode,
      0,
    );
    const results = JSON.parse(fs.readFileSync(path.join(receipt, 'units.json'), 'utf8'));
    assert.equal(results.numPassedTests, 20);
    assert.equal(results.snapshot.matched, 1);
    assert(
      results.success &&
        results.numPassedTestSuites === 1 &&
        results.numPassedTests > 0 &&
        !results.numFailedTests &&
        !results.numPendingTests &&
        !results.numTodoTests,
    );
    assert(!results.snapshot.failure && !results.snapshot.unmatched && !results.snapshot.updated);
    save('unit-summary', { passed: results.numPassedTests, snapshot: results.snapshot });
  } else if (mode === 'isolation') {
    const ts = require(path.join(repo, 'node_modules/typescript'));
    const config = ts.readConfigFile(path.join(pkg, 'tsconfig.lib.json'), ts.sys.readFile);
    assert(!config.error);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, pkg);
    assert.deepEqual(parsed.errors, []);
    const inScope = file => file.replaceAll('\\', '/').startsWith(`${owned.replaceAll('\\', '/')}/`);
    const roots = parsed.fileNames.filter(inScope);
    const inputs = ts
      .createProgram(parsed.fileNames, parsed.options)
      .getSourceFiles()
      .map(file => file.fileName)
      .filter(inScope);
    assert.equal(roots.length, production.length);
    assert(
      inputs.every(file => production.includes(path.basename(file))),
      'zero fixtures in actual production TS program',
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
    assert.equal(modules.length, production.length);
    assert(
      modules.every(
        file =>
          production.includes(path.basename(file).replace(/\.js$/, '.tsx')) ||
          production.includes(path.basename(file).replace(/\.js$/, '.ts')),
      ),
    );
    save('isolation', { roots, inputs, emitted, fixtureEmission: 0 });
  } else if (mode === 'invalid') {
    const previous = fs.readdirSync(evidenceRoot).sort();
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
    assert.deepEqual(fs.readdirSync(evidenceRoot).sort(), previous, 'invalid arguments fail before side effects');
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
              `teachingpopoverbody-functional-tests:${target}`,
              '--skipSync',
              '--skipNxCache',
              '--outputStyle=static',
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
      'shared cold prerequisite blocked; dependencies retained',
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
    const project = nxJSON('project', ['show', 'project', 'teachingpopoverbody-functional-tests', '--json']);
    assert.equal(project.root, `${scope}/testing/ci`);
    assert.equal(project.projectType, 'application');
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
      ['production', `${scope}/useTeachingPopoverBody.ts`],
      ['fixture', `${scope}/testing/fixtures.stories.tsx`],
      ['canonical', `${scope}/TeachingPopoverBody.cy.tsx`],
      ['consumer', 'packages/react-components/react-components/library/src/index.ts'],
      [
        'story',
        'packages/react-components/react-teaching-popover/stories/src/TeachingPopover/TeachingPopoverDefault.stories.tsx',
      ],
    ]) {
      const affected = nxJSON(`affected-${name}`, ['show', 'projects', '--affected', '--files', file, '--json']);
      assert(affected.includes('teachingpopoverbody-functional-tests'));
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
      assert.notEqual(name, 'teachingpopoverbody-functional-tests', 'no application dependency cycle');
      if (visited.has(name)) {
        return;
      }
      visited.add(name);
      for (const edge of graph.dependencies[name] ?? []) {
        visit(edge.target);
      }
    }
    for (const edge of graph.dependencies['teachingpopoverbody-functional-tests']) {
      visit(edge.target);
    }
    save('ownership', { fixtureOwner: 'react-teaching-popover', applicationCycle: false });
  } else if (mode === 'seal') {
    const receipts = [
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
    ].map(prefix => {
      const candidates = fs
        .readdirSync(evidenceRoot)
        .filter(candidateName => candidateName.startsWith(`${prefix}-${label}-`))
        .sort()
        .reverse();
      const name = candidates.find(candidate => {
        const candidateDirectory = path.join(evidenceRoot, candidate);
        return (
          fs.existsSync(path.join(candidateDirectory, 'source-after.json')) &&
          JSON.stringify(JSON.parse(fs.readFileSync(path.join(candidateDirectory, 'source-before.json'), 'utf8'))) ===
            JSON.stringify(before) &&
          JSON.stringify(JSON.parse(fs.readFileSync(path.join(candidateDirectory, 'source-after.json'), 'utf8'))) ===
            JSON.stringify(before)
        );
      });
      assert(name, `current source-bound receipt for ${prefix}`);
      const directory = path.join(evidenceRoot, name);
      const prerequisiteMode = ['registered-r3', 'sync-r3'].includes(prefix);
      if (!prerequisiteMode) {
        assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'outcome.json'), 'utf8')).status, 'passed');
      }
      const prerequisite = prerequisiteMode
        ? JSON.parse(fs.readFileSync(path.join(directory, 'prerequisite.json'), 'utf8'))
        : null;
      if (prerequisite && !prerequisite.coldGreen) {
        assert.equal(prerequisite.synchronizationApplied, false);
        if (prefix === 'registered-r3') {
          assert(
            prerequisite.records.every(record => record.exitCode !== 0 && record.windowsTS5023),
            'only the reproduced shared Windows TS5023 limitation is sealable',
          );
        } else {
          assert.equal(prerequisite.records[0].exitCode, 1);
          assert.equal(prerequisite.records[1].exitCode, 0);
          assert.match(fs.readFileSync(path.join(directory, 'sync-check.log'), 'utf8'), /workspace is out of sync/);
          assert.match(
            fs.readFileSync(path.join(directory, 'sync-dry-run.log'), 'utf8'),
            /dryRun.*no changes were made/,
          );
        }
      }
      const summary = fs.existsSync(path.join(directory, 'summary.json'))
        ? JSON.parse(fs.readFileSync(path.join(directory, 'summary.json'), 'utf8'))
        : null;
      return {
        prefix,
        directory,
        prerequisite,
        summary,
        hashes: [...walk(directory), ...(summary ? walk(summary.auditRoot) : [])].map(file => ({
          path: file,
          hash: hash(file),
        })),
      };
    });
    save('seal', {
      row: 138,
      implementationVerified: true,
      parentInitialReviewPerformed: false,
      parentFreshRepeatReviewPerformed: false,
      committed: false,
      receipts,
      sourceManifest: before,
      sourceManifestSHA256: crypto.createHash('sha256').update(JSON.stringify(before)).digest('hex'),
    });
  } else {
    save('preservation', {
      originalChanges: baseline.originals.filter(item => hash(path.join(owned, item.path)) !== item.hash),
      outsideChangesSinceBootstrap: baseline.files.filter(
        item => !fs.existsSync(path.join(repo, item.path)) || hash(path.join(repo, item.path)) !== item.hash,
      ),
      baselineHead: baseline.head,
      currentHead: outsideBefore.head,
    });
  }
  for (const original of baseline.originals) {
    assert.equal(hash(path.join(owned, original.path)), original.hash, `original bytes preserved: ${original.path}`);
  }
  save('outcome', { mode, round, label, status: 'passed' });
} finally {
  const after = sources();
  const outsideAfter = protectedFiles();
  save('source-after', after);
  save('outside-after', outsideAfter);
  save('preservation-delta', {
    headBefore: outsideBefore.head,
    headAfter: outsideAfter.head,
    outsideChanges: outsideBefore.files.filter(
      item => !fs.existsSync(path.join(repo, item.path)) || hash(path.join(repo, item.path)) !== item.hash,
    ),
    outsideStatusUnchanged: JSON.stringify(outsideBefore.status) === JSON.stringify(outsideAfter.status),
  });
  if (mode !== 'format') {
    assert.deepEqual(after, before, 'owned sources unchanged during validation');
  }
}
