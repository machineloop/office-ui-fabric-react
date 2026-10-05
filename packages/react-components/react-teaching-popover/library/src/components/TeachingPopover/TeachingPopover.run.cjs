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
const receipt = path.join(evidenceRoot, `${mode}-r${round}-${label}-${Date.now()}-${process.pid}`);
fs.mkdirSync(receipt, { recursive: true });
const nxRoot = path.join(evidenceRoot, `n-${Date.now().toString(36)}-${process.pid}`);
for (const name of ['c', 'd', 'n']) {
  fs.mkdirSync(path.join(nxRoot, name), { recursive: true });
}
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
const baselinePath = path.join(evidenceRoot, 'entry.json');
if (!fs.existsSync(baselinePath)) {
  const pkgScope = path.relative(repo, pkg).replaceAll('\\', '/');
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
        files: [...files]
          .filter(file => file && fs.existsSync(path.join(repo, file)) && fs.statSync(path.join(repo, file)).isFile())
          .filter(
            file =>
              !file.startsWith(`${scope}/`) ||
              (/\.(?:ts|tsx)$/.test(file) && !file.includes('/testing/') && !file.includes('.stories.')),
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
const fixtureImport = "import './testing/suite.stories';";
const originalBaseline = git(['show', `${baseline.head}:${scope}/TeachingPopover.cy.tsx`]);
const currentBaseline = fs.readFileSync(path.join(owned, 'TeachingPopover.cy.tsx'), 'utf8');
assert.equal(currentBaseline.split(fixtureImport).length - 1, 1, 'one fixture import');
const baselineBodies = text => text.replace(/\r\n/g, '\n').replace(fixtureImport, '').trimEnd();
assert.equal(baselineBodies(currentBaseline), baselineBodies(originalBaseline), 'original baseline bodies unchanged');
function outside() {
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
      .map(file => ({ path: file, hash: fs.existsSync(path.join(repo, file)) ? hash(path.join(repo, file)) : null })),
  };
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
  WEBPACK_DEV_SERVER_PORT: '46137',
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
const protectedBefore = outside();
save('source-before', before);
save('outside-before', protectedBefore);
process.stdout.write(`Evidence: ${receipt}\n`);
try {
  if (mode === 'cypress' || mode === 'standard') {
    const port = spawnSync(
      process.execPath,
      [
        '-e',
        "const s=require('node:net').createServer();s.on('error',e=>{console.error(e.message);process.exit(1)});s.listen(46137,'127.0.0.1',()=>s.close());",
      ],
      { encoding: 'utf8' },
    );
    assert.equal(port.status, 0, `port 46137 occupied: ${port.stderr}; never terminate another owner`);
    const existing = new Set(fs.readdirSync(evidenceRoot));
    const args = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--config-file',
      mode === 'standard' ? 'cypress.config.ts' : 'src/components/TeachingPopover/TeachingPopover.cypress.config.cjs',
      '--spec',
      'src/components/TeachingPopover/TeachingPopover.cy.tsx',
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
    assert(!/<(?:failure|error|skipped)\b/.test(xml), 'zero failures/errors/skips');
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
    for (const suite of [counters, ...suites]) {
      assert(/^\d+$/.test(suite.tests));
      for (const key of ['failures', 'errors', 'skipped', 'pending', 'retries']) {
        if (suite[key] !== undefined) {
          assert.equal(suite[key], '0');
        }
      }
    }
    const newAudits = fs.readdirSync(evidenceRoot).filter(file => file.startsWith('audits-') && !existing.has(file));
    assert.equal(newAudits.length, 1);
    const auditRoot = path.join(evidenceRoot, newAudits[0]);
    const manifest = JSON.parse(fs.readFileSync(path.join(auditRoot, 'manifest.json'), 'utf8'));
    assert.equal(manifest.round, round);
    assert.equal(new Set(manifest.titles).size, manifest.titles.length);
    assert.equal(manifest.titles.length, manifest.expectedCount);
    assert.equal(manifest.expectedCount, [17, 54, 79][round - 1]);
    assert(
      !/\b(?:it|scenario)\.(?:only|skip)\b/.test(
        fs.readFileSync(path.join(owned, 'testing/suite.stories.tsx'), 'utf8'),
      ),
    );
    const campaignCases = cases.filter(item => item.name.startsWith('row137 TeachingPopover '));
    const baselineCases = cases.filter(item => !item.name.startsWith('row137 TeachingPopover '));
    const baselineTitles = [
      ...['uncontrolled', 'controlled'].flatMap(owner =>
        [
          'should open when clicked',
          'should open with {enter}',
          'should open with Space',
          'should dismiss on click outside',
          'should dismiss on Escape keydown',
        ].map(title => `TeachingPopover ${owner} ${title}`),
      ),
      'TeachingPopover focus trap default should trap focus by default',
      'TeachingPopover updating content should not close when inner content changes',
    ];
    assert.equal(campaignCases.length, manifest.titles.length);
    assert.equal(baselineCases.length, 12, 'all original baseline cases execute');
    assert.deepEqual(baselineCases.map(item => item.name).sort(), baselineTitles.sort());
    assert.equal(new Set(cases.map(item => item.name)).size, cases.length, 'unique complete JUnit titles');
    assert.equal(cases.length, [29, 66, 91][round - 1]);
    assert.equal(Number(counters.tests), cases.length);
    assert.equal(
      suites.reduce((sum, suite) => sum + Number(suite.tests), 0),
      cases.length,
    );
    assert.deepEqual(
      campaignCases.map(item => item.name).sort(),
      manifest.titles.map(title => `row137 TeachingPopover ${title}`).sort(),
    );
    assert.deepEqual(campaignCases.map(item => item.classname).sort(), [...manifest.titles].sort());
    const audits = fs
      .readdirSync(auditRoot)
      .filter(file => /^audit-\d+\.json$/.test(file))
      .map(file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8')));
    const finals = audits.filter(audit => audit.phase === 'final');
    assert.equal(finals.length, campaignCases.length);
    assert.deepEqual(finals.map(audit => audit.scenario).sort(), [...manifest.titles].sort());
    assert.equal(audits.length, [18, 55, 86][round - 1]);
    for (const audit of audits) {
      assert.equal(audit.round, round);
      assert.equal(audit.retries, 0);
      assert.equal(audit.fullResults.testEngine.name, 'axe-core');
      assert(audit.fullResults.passes.length > 0);
      const stable = ['stable-basic', 'stable-carousel', 'stable-carousel-text'].includes(audit.modal);
      if (stable) {
        assert.equal(audit.fullResults.violations.length, 1);
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
      } else {
        assert.deepEqual(audit.fullResults.violations, []);
      }
      if (audit.modal) {
        if (stable) {
          assert.match(
            audit.scenario,
            audit.modal === 'stable-basic'
              ? /^stable (Default|AppearanceBrand) mounts unchanged /
              : /^stable (Carousel|CarouselAppearanceBrand|CarouselText) visits exactly three unchanged pages /,
          );
          assert.equal(audit.phase, 'stable-open');
        } else {
          assert.equal(audit.scenario, 'trusted pointer opens once and Escape restores the observed trigger');
          assert.equal(audit.phase, 'open-modal');
        }
        const rule = audit.fullResults.incomplete[0];
        assert.equal(audit.fullResults.incomplete.length, 1);
        assert.equal(rule.id, 'aria-hidden-focus');
        assert.equal(rule.impact, 'serious');
        assert.deepEqual(
          rule.nodes.map(node => node.target),
          audit.modal === 'stable-carousel'
            ? [
                ['.fui-PopoverSurface > i:nth-child(1)'],
                ['.fui-TeachingPopoverCarouselNav > i:nth-child(1)'],
                ['.fui-TeachingPopoverCarouselNav > i:nth-child(5)'],
                ['.fui-PopoverSurface > i:nth-child(5)'],
              ]
            : stable
            ? [
                ['.fui-PopoverSurface > i:nth-child(1)'],
                [audit.modal === 'stable-basic' ? 'i:nth-child(6)' : 'i:nth-child(5)'],
              ]
            : [['#teaching-surface > i:nth-child(1)'], ['i:nth-child(5)']],
        );
        for (const node of rule.nodes) {
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
        assert.deepEqual(audit.fullResults.incomplete, []);
      }
      assert(audit.auditedRoots.length > 0);
      assert(
        audit.events.every(
          (event, index) => event.trusted || (index === 0 && /^native (Enter|Space) activation/.test(audit.scenario)),
        ),
        'only source-enhanced keyboard clicks may be untrusted',
      );
    }
    const captures = fs.existsSync(path.join(receipt, 'screenshots'))
      ? walk(path.join(receipt, 'screenshots')).filter(file => file.endsWith('.png'))
      : [];
    assert.equal(captures.length, round === 3 ? 5 : 0, 'five positive stable-story browser captures in the full round');
    const guards = fs
      .readdirSync(auditRoot)
      .filter(file => /^classifier-guards-\d+\.json$/.test(file))
      .map(file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8')));
    assert.equal(guards.length, round === 3 ? 6 : 1);
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
    save('summary', {
      command,
      round,
      passed: cases.length,
      campaignPassed: campaignCases.length,
      baselinePassed: baselineCases.length,
      finalAudits: finals.length,
      totalAudits: audits.length,
      knownViolationAudits: audits.filter(audit => audit.fullResults.violations.length > 0).length,
      knownIncompleteAudits: audits.filter(audit => audit.fullResults.incomplete.length > 0).length,
      captures,
      auditRoot,
      manifest,
      cases,
      counters,
      sources: before,
      cleanAccessibility: false,
    });
    process.stdout.write(
      `${cases.length} passed; ${finals.length} final / ${audits.length} total full-default axe audits\n`,
    );
  } else if (mode === 'checks' || mode === 'format') {
    const original = new Set(baseline.files.filter(file => file.path.startsWith(`${scope}/`)).map(file => file.path));
    const files = before
      .map(item => `${scope}/${item.path.replaceAll('\\', '/')}`)
      .filter(
        file => !original.has(file) || file.startsWith(`${scope}/testing/`) || file.endsWith('TeachingPopover.cy.tsx'),
      )
      .filter(file => !file.endsWith('.gitignore'));
    const records = [
      run('node_modules/prettier/bin-prettier.js', [mode === 'format' ? '--write' : '--check', ...files], 'format'),
    ];
    if (mode === 'checks') {
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
          '--runTestsByPath',
          'src/components/TeachingPopover/TeachingPopover.test.tsx',
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
    assert.equal(results.numPassedTests, 9);
    assert(
      results.success &&
        results.numPassedTestSuites === 1 &&
        !results.numFailedTests &&
        !results.numPendingTests &&
        !results.numTodoTests,
    );
    assert(!results.snapshot.failure && !results.snapshot.unmatched && !results.snapshot.updated);
  } else if (mode === 'isolation') {
    const ts = require(path.join(repo, 'node_modules/typescript'));
    const config = ts.readConfigFile(path.join(pkg, 'tsconfig.lib.json'), ts.sys.readFile);
    assert(!config.error);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, pkg);
    assert.deepEqual(parsed.errors, []);
    const inScope = file => file.replaceAll('\\', '/').startsWith(`${owned.replaceAll('\\', '/')}/`);
    const original = new Set([
      'index.ts',
      'TeachingPopover.tsx',
      'TeachingPopover.types.ts',
      'renderTeachingPopover.tsx',
      'useTeachingPopover.ts',
      'useTeachingPopoverContextValues.ts',
    ]);
    const roots = parsed.fileNames.filter(inScope);
    const inputs = ts
      .createProgram(parsed.fileNames, parsed.options)
      .getSourceFiles()
      .map(file => file.fileName)
      .filter(inScope);
    assert.equal(roots.length, original.size);
    assert(
      inputs.every(file => original.has(path.basename(file))),
      'zero owned fixtures in actual production TS program',
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
    assert.equal(modules.length, original.size);
    assert(
      modules.every(
        file =>
          original.has(path.basename(file).replace(/\.js$/, '.tsx')) ||
          original.has(path.basename(file).replace(/\.js$/, '.ts')),
      ),
    );
    save('isolation', { roots, inputs, emitted, fixtureEmission: 0 });
  } else if (mode === 'invalid') {
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
              `teachingpopover-functional-tests:${target}`,
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
      'shared cold prerequisite blocked; no dependency bypass',
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
    const project = nxJSON('project', ['show', 'project', 'teachingpopover-functional-tests', '--json']);
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
      ['production', `${scope}/useTeachingPopover.ts`],
      ['fixture', `${scope}/testing/fixtures.stories.tsx`],
      ['canonical', `${scope}/TeachingPopover.cy.tsx`],
      ['consumer', 'packages/react-components/react-components/library/src/index.ts'],
      [
        'story',
        'packages/react-components/react-teaching-popover/stories/src/TeachingPopover/TeachingPopoverDefault.stories.tsx',
      ],
    ]) {
      const affected = nxJSON(`affected-${name}`, ['show', 'projects', '--affected', '--files', file, '--json']);
      assert(affected.includes('teachingpopover-functional-tests'));
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
      'no test-created reverse producer dependency cycle',
    );
    const visited = new Set();
    function visit(name) {
      assert.notEqual(name, 'teachingpopover-functional-tests', 'no application cycle');
      if (visited.has(name)) {
        return;
      }
      visited.add(name);
      for (const edge of graph.dependencies[name] ?? []) {
        visit(edge.target);
      }
    }
    for (const edge of graph.dependencies['teachingpopover-functional-tests']) {
      visit(edge.target);
    }
    save('ownership', {
      fixtureOwner: 'react-teaching-popover',
      projectOwner: 'teachingpopover-functional-tests',
      applicationCycle: false,
    });
  } else if (mode === 'seal') {
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
        .filter(
          name =>
            JSON.stringify(JSON.parse(fs.readFileSync(path.join(evidenceRoot, name, 'source-before.json'), 'utf8'))) ===
            JSON.stringify(before),
        );
      assert.equal(matches.length, 1, `one current-source receipt for ${prefix}`);
      const directory = path.join(evidenceRoot, matches[0]);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'source-after.json'), 'utf8')), before);
      const commands = fs.existsSync(path.join(directory, 'commands.jsonl'))
        ? fs
            .readFileSync(path.join(directory, 'commands.jsonl'), 'utf8')
            .trim()
            .split('\n')
            .map(line => JSON.parse(line))
        : [];
      const blocked = ['registered-r3', 'sync-r3'].includes(prefix);
      if (!blocked) {
        assert(commands.every(command => command.exitCode === 0));
        const outcome = JSON.parse(fs.readFileSync(path.join(directory, 'outcome.json'), 'utf8'));
        assert.equal(outcome.status, 'passed');
      } else {
        const prerequisite = JSON.parse(fs.readFileSync(path.join(directory, 'prerequisite.json'), 'utf8'));
        assert.equal(prerequisite.coldGreen, false, 'known cold blockers must remain explicit');
        assert.equal(prerequisite.synchronizationApplied, false);
        if (prefix === 'registered-r3') {
          assert(prerequisite.records.every(record => record.windowsTS5023 && record.exitCode !== 0));
        } else {
          assert.equal(prerequisite.records[0].exitCode, 1);
          assert.equal(prerequisite.records[1].exitCode, 0);
        }
      }
      let auditFiles = [];
      if (prefix.startsWith('cypress') || prefix.startsWith('standard')) {
        const summary = JSON.parse(fs.readFileSync(path.join(directory, 'summary.json'), 'utf8'));
        assert.deepEqual(summary.sources, before);
        assert.equal(summary.passed, [29, 66, 91][summary.round - 1]);
        assert.equal(summary.campaignPassed, [17, 54, 79][summary.round - 1]);
        assert.equal(summary.baselinePassed, 12);
        auditFiles = walk(summary.auditRoot).map(file => ({ path: file, hash: hash(file) }));
      }
      return {
        prefix,
        directory,
        commands,
        blocked,
        auditFiles,
        hashes: walk(directory).map(file => ({ path: path.relative(directory, file), hash: hash(file) })),
      };
    });
    save('seal', {
      row: 137,
      parentInitialReviewPerformed: false,
      parentFreshRepeatReviewPerformed: false,
      committed: false,
      implementationVerified: true,
      rounds: [29, 66, 91],
      campaignRounds: [17, 54, 79],
      originalBaselineCases: 12,
      fullDefaultFinalAudits: 79,
      fullDefaultTotalAudits: 86,
      knownViolationAudits: 5,
      knownIncompleteAudits: 6,
      cleanAccessibility: false,
      coldNxGreen: false,
      sourceManifest: before,
      sourceManifestSHA256: crypto.createHash('sha256').update(JSON.stringify(before)).digest('hex'),
      receipts,
    });
  } else {
    const changes = baseline.files.filter(
      file => !fs.existsSync(path.join(repo, file.path)) || hash(path.join(repo, file.path)) !== file.hash,
    );
    const originals = changes.filter(
      file => file.path.startsWith(`${scope}/`) && !file.path.endsWith('/TeachingPopover.cy.tsx'),
    );
    save('preservation', {
      originalChanges: originals,
      outsideChanges: changes.filter(file => !file.path.startsWith(`${scope}/`)),
      baselineHead: baseline.head,
      currentHead: protectedBefore.head,
    });
    assert.deepEqual(originals, [], 'original production and unit bytes preserved');
  }
  save('outcome', { mode, round, label, status: 'passed' });
} finally {
  const after = sources();
  const protectedAfter = outside();
  save('source-after', after);
  save('outside-after', protectedAfter);
  save('preservation-delta', {
    headBefore: protectedBefore.head,
    headAfter: protectedAfter.head,
    outsideChanges: protectedBefore.files.filter(
      file => !fs.existsSync(path.join(repo, file.path)) || hash(path.join(repo, file.path)) !== file.hash,
    ),
    outsideStatusUnchanged: JSON.stringify(protectedBefore.status) === JSON.stringify(protectedAfter.status),
  });
  if (mode !== 'format') {
    assert.deepEqual(after, before, 'owned sources unchanged during validation');
  }
}
