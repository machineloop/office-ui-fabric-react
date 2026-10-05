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
for (const directory of ['c', 'd', 'n']) {
  fs.mkdirSync(path.join(nxRoot, directory), { recursive: true });
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
function outside() {
  const files = new Set([
    ...git([
      'ls-files',
      'packages/react-components/react-tag-picker',
      'packages/react-components/react-combobox',
      'packages/react-components/react-aria',
      'packages/react-components/react-utilities',
      'scripts/cypress',
      'nx.json',
      'tsconfig.base.json',
      'package.json',
      'yarn.lock',
    ]).split('\n'),
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
  WEBPACK_DEV_SERVER_PORT: '46136',
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
save('cache-paths', {
  nxRoot,
  cache: env.NX_CACHE_DIRECTORY,
  data: env.NX_WORKSPACE_DATA_DIRECTORY,
  native: env.NX_NATIVE_FILE_CACHE_DIRECTORY,
});
process.stdout.write(`Evidence: ${receipt}\n`);
try {
  if (mode === 'cypress' || mode === 'standard') {
    const port = spawnSync(
      process.execPath,
      [
        '-e',
        "const s=require('node:net').createServer();s.on('error',e=>{console.error(e.message);process.exit(1)});s.listen(46136,'127.0.0.1',()=>s.close());",
      ],
      { encoding: 'utf8' },
    );
    assert.equal(port.status, 0, `port 46136 occupied: ${port.stderr}; never terminate other owners`);
    const existing = new Set(fs.readdirSync(evidenceRoot));
    const args = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--config-file',
      mode === 'standard' ? 'cypress.config.ts' : 'src/components/TagPickerButton/TagPickerButton.cypress.config.cjs',
      '--spec',
      'src/components/TagPickerButton/TagPickerButton.cy.tsx',
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
    assert.equal(command.exitCode, 0, fs.readFileSync(path.join(receipt, 'chrome.log'), 'utf8').slice(-20000));
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
    const root = xml.match(/<testsuites\b([^>]*)>/);
    assert(root);
    const counters = attrs(root[1]);
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
    const authored = fs.readFileSync(path.join(owned, 'testing/suite.stories.tsx'), 'utf8');
    assert(!/\bit\.(?:skip|only)|\bscenario\.(?:skip|only)/.test(authored));
    assert.equal(manifest.round, round);
    assert.equal(manifest.titles.length, [29, 59, 96][round - 1], 'exact authored round case count');
    assert.equal(new Set(manifest.titles).size, manifest.titles.length);
    assert(manifest.titles.length > 0);
    assert.equal(cases.length, manifest.titles.length);
    assert.equal(Number(counters.tests), cases.length);
    assert.equal(
      suites.reduce((sum, suite) => sum + Number(suite.tests), 0),
      cases.length,
    );
    assert.deepEqual(
      cases.map(item => item.name).sort(),
      manifest.titles.map(title => `row136 TagPickerButton ${title}`).sort(),
    );
    assert.deepEqual(cases.map(item => item.classname).sort(), [...manifest.titles].sort());
    const audits = fs
      .readdirSync(auditRoot)
      .filter(file => /^audit-\d+\.json$/.test(file))
      .map(file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8')));
    assert.equal(audits.length, cases.length);
    assert.deepEqual(audits.map(audit => audit.scenario).sort(), [...manifest.titles].sort());
    for (const audit of audits) {
      assert.equal(audit.kind, 'axe');
      assert.equal(audit.round, round);
      assert.equal(audit.retries, 0);
      assert.equal(audit.fullResults.testEngine.name, 'axe-core');
      assert(audit.fullResults.passes.length > 0);
      assert.equal(audit.knownMoverTags, manifest.profiles[audit.scenario]);
      if (audit.knownMoverTags) {
        assert.deepEqual(
          audit.fullResults.violations.map(rule => rule.id),
          ['aria-hidden-focus'],
        );
        assert.deepEqual(
          audit.fullResults.violations[0].nodes.map(node => node.target),
          [['i:nth-child(1)'], [`i:nth-child(${audit.knownMoverTags + 2})`]],
        );
        assert(
          audit.fullResults.violations[0].nodes.every(
            node =>
              node.any.length === 0 &&
              node.none.length === 0 &&
              node.all.length === 1 &&
              node.all[0].id === 'focusable-not-tabbable' &&
              node.all[0].data === null,
          ),
        );
        for (const node of audit.fullResults.violations[0].nodes) {
          assert.equal(node.all[0].relatedNodes.length, 1);
          assert.deepEqual(node.all[0].relatedNodes[0].target, node.target);
          assert.equal(node.all[0].relatedNodes[0].html, node.html);
        }
      } else {
        assert.deepEqual(audit.fullResults.violations, []);
      }
      if (audit.knownEmptyList) {
        assert.equal(audit.scenario, 'empty list opens and navigation cannot create a selection or descendant');
        assert.deepEqual(
          audit.fullResults.incomplete.map(rule => rule.id),
          ['aria-required-children'],
        );
        const nodes = audit.fullResults.incomplete[0].nodes;
        assert.equal(nodes.length, 1);
        assert.match(nodes[0].target[0], /^#picker-listbox_r_[a-z0-9]+_$/);
        assert.equal(nodes[0].any.length, 1);
        assert.equal(nodes[0].any[0].id, 'aria-required-children');
        assert.deepEqual(nodes[0].any[0].data, ['group', 'option']);
        assert.deepEqual(nodes[0].all, []);
        assert.deepEqual(nodes[0].none, []);
      } else {
        assert.deepEqual(audit.fullResults.incomplete, []);
      }
      assert(Array.isArray(audit.events) && Array.isArray(audit.realEvents));
      assert(
        audit.events.every(event => event.trusted),
        'all recorded original browser events trusted',
      );
    }
    const metadata = audits.map(audit => ({
      scenario: audit.scenario,
      knownMoverTags: audit.knownMoverTags,
      knownEmptyList: audit.knownEmptyList,
      nativeCommands: audit.realEvents.length,
    }));
    if (round === 3) {
      for (const [name, target, attribute] of [
        ['no-popover', '.fui-TagPickerButton', 'aria-controls'],
        ['custom-list-id', '.fui-TagPickerControl', 'aria-owns'],
      ]) {
        const finding = JSON.parse(fs.readFileSync(path.join(auditRoot, `finding-${name}.json`), 'utf8'));
        assert.deepEqual(
          finding.violations.map(rule => rule.id),
          ['aria-valid-attr-value'],
        );
        assert.deepEqual(finding.incomplete, []);
        assert.equal(finding.violations[0].nodes.length, 1);
        const node = finding.violations[0].nodes[0];
        assert.deepEqual(node.target, [target]);
        assert.deepEqual(node.any, []);
        assert.deepEqual(node.none, []);
        assert.equal(node.all.length, 1);
        assert.equal(node.all[0].id, 'aria-valid-attr-value');
        assert.equal(node.all[0].impact, 'critical');
        assert.equal(node.all[0].data.length, 1);
        assert.match(node.all[0].data[0], new RegExp(`^${attribute}="picker-listbox_r_[a-z0-9]+_"$`));
        assert.deepEqual(node.all[0].relatedNodes, []);
      }
    }
    save('summary', {
      command,
      round,
      passed: cases.length,
      audits: audits.length,
      auditRoot,
      manifest,
      cases,
      counters,
      sources: before,
      knownViolationAudits: audits.filter(audit => audit.knownMoverTags).length,
      knownIncompleteAudits: audits.filter(audit => audit.knownEmptyList).length,
      cleanAccessibility: false,
      metadata,
    });
    process.stdout.write(`${cases.length} passed; ${audits.length} full default axe audits\n`);
  } else if (mode === 'checks' || mode === 'format') {
    const files = before
      .map(item => `${scope}/${item.path.replaceAll('\\', '/')}`)
      .filter(file => !file.endsWith('.gitignore') && !file.includes('__snapshots__'));
    const records = [
      run(
        'node_modules/prettier/bin-prettier.js',
        [
          mode === 'format' ? '--write' : '--check',
          ...files.filter(
            file =>
              !/\/(?:index|TagPickerButton|renderTagPickerButton|useTagPickerButton|useTagPickerButtonStyles\.styles)\.(?:ts|tsx)$/.test(
                file,
              ) &&
              !file.endsWith('.test.tsx') &&
              !file.endsWith('.types.ts'),
          ),
        ],
        'format',
      ),
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
    const record = run(
      'node_modules/jest/bin/jest.js',
      [
        '--config',
        path.join(owned, 'testing/jest.config.cjs'),
        '--runInBand',
        '--runTestsByPath',
        'src/components/TagPickerButton/TagPickerButton.test.tsx',
        'src/components/TagPickerButton/useTagPickerButton.test.tsx',
        '--json',
        `--outputFile=${path.join(receipt, 'units.json')}`,
        '--cacheDirectory',
        path.join(receipt, 'jest-cache'),
      ],
      'units',
      pkg,
    );
    assert.equal(record.exitCode, 0);
    const results = JSON.parse(fs.readFileSync(path.join(receipt, 'units.json'), 'utf8'));
    assert(
      results.success &&
        results.numPassedTestSuites === 2 &&
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
    const normalized = file => file.replaceAll('\\', '/');
    const inScope = file => normalized(file).startsWith(`${normalized(owned)}/`);
    const original = new Set([
      'index.ts',
      'TagPickerButton.tsx',
      'TagPickerButton.types.ts',
      'renderTagPickerButton.tsx',
      'useTagPickerButton.tsx',
      'useTagPickerButtonStyles.styles.ts',
    ]);
    const roots = parsed.fileNames.filter(inScope);
    const inputs = ts
      .createProgram(parsed.fileNames, parsed.options)
      .getSourceFiles()
      .map(file => file.fileName)
      .filter(inScope);
    assert(roots.every(file => original.has(path.basename(file))));
    assert(
      inputs.every(file => original.has(path.basename(file))),
      'zero owned fixtures in actual production TS program',
    );
    const candidates = walk(owned).filter(file => /\.tsx?$/.test(file));
    const record = run(
      'node_modules/@swc/cli/bin/swc.js',
      [
        ...candidates.map(file => path.relative(pkg, file)),
        '--config-file',
        path.join(pkg, '.swcrc'),
        '--out-dir',
        path.join(receipt, 'emitted'),
        '--strip-leading-paths',
        '--sync',
      ],
      'swc',
      pkg,
    );
    assert.equal(record.exitCode, 0);
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
              `tagpickerbutton-functional-tests:${target}`,
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
    const project = nxJSON('project', ['show', 'project', 'tagpickerbutton-functional-tests', '--json']);
    assert.equal(project.root, `${scope}/testing/ci`);
    assert.equal(project.projectType, 'application');
    assert.deepEqual(project.tags, ['vNext', 'platform:web', 'test']);
    assert.deepEqual(project.implicitDependencies, ['react-tag-picker']);
    for (const target of ['e2e', 'type-check']) {
      assert(
        project.targets[target].dependsOn.some(item => item.target === 'build' && item.projects === 'scripts-cypress'),
      );
    }
    save('project', project);
    for (const [name, file] of [
      ['production', `${scope}/useTagPickerButton.tsx`],
      ['fixture', `${scope}/testing/fixtures.stories.tsx`],
      ['canonical', `${scope}/TagPickerButton.cy.tsx`],
    ]) {
      const affected = nxJSON(`affected-${name}`, ['show', 'projects', '--affected', '--files', file, '--json']);
      assert(affected.includes('tagpickerbutton-functional-tests'));
      save(`affected-${name}`, { file, affected });
    }
    const { fileMap } = JSON.parse(
      fs.readFileSync(path.join(env.NX_WORKSPACE_DATA_DIRECTORY, 'file-map.json'), 'utf8'),
    );
    assert(
      fileMap.projectFileMap['react-tag-picker'].some(file => file.file === `${scope}/testing/fixtures.stories.tsx`),
    );
    assert(
      fileMap.projectFileMap['tagpickerbutton-functional-tests'].some(
        file => file.file === `${scope}/testing/ci/project.json`,
      ),
    );
    const graph = JSON.parse(fs.readFileSync(path.join(env.NX_WORKSPACE_DATA_DIRECTORY, 'project-graph.json'), 'utf8'));
    const visited = new Set();
    function visit(name) {
      assert.notEqual(name, 'tagpickerbutton-functional-tests', 'no application dependency cycle');
      if (visited.has(name)) {
        return;
      }
      visited.add(name);
      for (const edge of graph.dependencies[name] ?? []) {
        visit(edge.target);
      }
    }
    for (const edge of graph.dependencies['tagpickerbutton-functional-tests']) {
      visit(edge.target);
    }
    save('ownership', {
      fixtureOwner: 'react-tag-picker',
      projectOwner: 'tagpickerbutton-functional-tests',
      applicationCycle: false,
    });
  } else if (mode === 'seal') {
    const requested = [
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
    const receipts = requested.map(prefix => {
      const matches = fs
        .readdirSync(evidenceRoot)
        .filter(name => name.startsWith(`${prefix}-final-`))
        .filter(
          name =>
            JSON.stringify(JSON.parse(fs.readFileSync(path.join(evidenceRoot, name, 'source-before.json'), 'utf8'))) ===
            JSON.stringify(before),
        );
      assert.equal(matches.length, 1, `one current-source final receipt for ${prefix}`);
      const directory = path.join(evidenceRoot, matches[0]);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'source-after.json'), 'utf8')), before);
      const commands = fs.existsSync(path.join(directory, 'commands.jsonl'))
        ? fs
            .readFileSync(path.join(directory, 'commands.jsonl'), 'utf8')
            .trim()
            .split('\n')
            .map(line => JSON.parse(line))
        : [];
      const prerequisite = ['registered-r3', 'sync-r3'].includes(prefix);
      if (!prerequisite) {
        assert(commands.every(command => command.exitCode === 0));
      }
      if (prefix.startsWith('cypress') || prefix.startsWith('standard')) {
        const summary = JSON.parse(fs.readFileSync(path.join(directory, 'summary.json'), 'utf8'));
        assert.equal(summary.passed, [29, 59, 96][summary.round - 1]);
        assert.equal(summary.audits, summary.passed);
        assert.deepEqual(summary.sources, before);
      }
      if (prerequisite) {
        const result = JSON.parse(fs.readFileSync(path.join(directory, 'prerequisite.json'), 'utf8'));
        assert.equal(result.coldGreen, false, 'known prerequisite failure remains explicit');
        if (prefix.startsWith('registered')) {
          assert(result.records.every(record => record.windowsTS5023));
        } else {
          assert.equal(result.records.find(record => record.log === 'sync-check.log').exitCode, 1);
          assert.equal(result.records.find(record => record.log === 'sync-dry-run.log').exitCode, 0);
        }
      }
      return {
        prefix,
        directory,
        commands,
        prerequisiteBlocked: prerequisite,
        hashes: walk(directory).map(file => ({ path: path.relative(directory, file), hash: hash(file) })),
      };
    });
    const baseline = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'entry.json'), 'utf8').replace(/^\uFEFF/, ''));
    const changes = baseline.files.filter(
      file => !fs.existsSync(path.join(repo, file.path)) || hash(path.join(repo, file.path)) !== file.hash,
    );
    const originalChanges = changes.filter(file => file.path.startsWith(`${scope}/`));
    assert.deepEqual(originalChanges, []);
    save('seal', {
      row: 136,
      passed: 96,
      fullDefaultAudits: 96,
      rounds: [29, 59, 96],
      browserVerified: true,
      parentReviewsPerformed: false,
      committed: false,
      coldNxGreen: false,
      cleanAccessibility: false,
      sourceManifest: before,
      sourceManifestSHA256: crypto.createHash('sha256').update(JSON.stringify(before)).digest('hex'),
      baselineHead: baseline.head,
      currentHead: protectedBefore.head,
      originalChanges,
      outsideChanges: changes.filter(file => !file.path.startsWith(`${scope}/`)),
      outsideStatusUnchanged:
        JSON.stringify(baseline.status.filter(line => !line.slice(3).startsWith(`${scope}/`))) ===
        JSON.stringify(protectedBefore.status),
      receipts,
    });
  } else {
    const baseline = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'entry.json'), 'utf8').replace(/^\uFEFF/, ''));
    const changed = baseline.files.filter(
      file => !fs.existsSync(path.join(repo, file.path)) || hash(path.join(repo, file.path)) !== file.hash,
    );
    save('preservation', {
      originalChanges: changed.filter(file => file.path.startsWith(`${scope}/`)),
      outsideChanges: changed.filter(file => !file.path.startsWith(`${scope}/`)),
      baselineHead: baseline.head,
      currentHead: protectedBefore.head,
      outsideStatusUnchanged:
        JSON.stringify(baseline.status.filter(line => !line.slice(3).startsWith(`${scope}/`))) ===
        JSON.stringify(protectedBefore.status),
    });
    assert.deepEqual(
      changed.filter(file => file.path.startsWith(`${scope}/`)),
      [],
      'original owned sources and snapshots preserved',
    );
  }
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
    assert.deepEqual(after, before, 'recursive owned sources unchanged during validation');
  }
}
