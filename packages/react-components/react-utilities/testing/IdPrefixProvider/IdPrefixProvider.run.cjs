'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const owned = __dirname;
const repo = path.resolve(owned, '../../../../..');
const pkg = path.resolve(owned, '../..');
const scope = path.relative(repo, owned).replaceAll('\\', '/');
const historicalScope = 'packages/react-components/react-utilities/src/hooks/testing/IdPrefixProvider';
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
assert(/^[a-z0-9][a-z0-9-]{0,39}$/.test(label), 'label must be 1-40 lowercase letters/digits/hyphens');
assert(process.argv.length <= 5, 'unexpected arguments');
const round = Number(rawRound);
const evidenceRoot = path.join(owned, '.evidence');
const receipt = path.join(evidenceRoot, `${mode}-r${round}-${label}-${Date.now()}-${process.pid}`);
fs.mkdirSync(receipt, { recursive: true });
const nxRoot = path.join(evidenceRoot, `n-${Date.now().toString(36)}-${process.pid}`);
for (const directory of ['c', 'd', 'n']) {
  fs.mkdirSync(path.join(nxRoot, directory), { recursive: true });
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
  WEBPACK_DEV_SERVER_PORT: '46135',
};
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
function nxJSON(name) {
  const text = fs.readFileSync(path.join(receipt, `${name}.log`), 'utf8');
  return JSON.parse(
    text.replace(
      /^NX {2}Falling back to ts-node for local typescript execution\. This may be a little slower\.\r?\n - To fix this, ensure @swc-node\/register and @swc\/core have been installed\r?\n/,
      '',
    ),
  );
}
function outside() {
  const tracked = git([
    'ls-files',
    'packages/react-components/react-utilities',
    'scripts/cypress',
    'nx.json',
    'tsconfig.base.json',
    'eslint.config.js',
    'package.json',
    'yarn.lock',
  ]).split('\n');
  const dirty = git(['diff', '--name-only', 'HEAD']).split('\n');
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n');
  const files = [...new Set([...tracked, ...dirty, ...untracked])].filter(
    file => file && ![scope, historicalScope].some(root => file.startsWith(`${root}/`)),
  );
  return {
    head: git(['rev-parse', 'HEAD']),
    branch: git(['branch', '--show-current']),
    status: git(['status', '--porcelain', '--untracked-files=all'])
      .split('\n')
      .filter(line => ![scope, historicalScope].some(root => line.slice(3).startsWith(`${root}/`))),
    files: files.map(file => ({
      path: file,
      hash: fs.existsSync(path.join(repo, file)) ? hash(path.join(repo, file)) : null,
    })),
  };
}
function run(entry, args, name, cwd = repo) {
  return runNode([path.join(repo, entry), ...args], name, cwd);
}
function runNode(args, name, cwd = repo) {
  const command = [process.execPath, ...args];
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
  process.stdout.write(`${name}: exit ${record.exitCode}\n`);
  return record;
}
function globalDiscovery() {
  const output = path.join(receipt, 'package-discovery.json');
  const record = runNode(
    [
      '--input-type=module',
      '-e',
      `
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const configPath = path.resolve('cypress.config.ts');
const require = createRequire(pathToFileURL(configPath));
const { default: config } = await import(pathToFileURL(configPath).href);
const patterns = config.component.specPattern;
if (!Array.isArray(patterns) || !patterns.every(pattern => typeof pattern === 'string')) {
  throw new Error('expected the actual package specPattern array');
}
const exclude = config.component.excludeSpecPattern ?? [];
const normalize = value => value.replaceAll('\\\\', '/');
const matches = [...new Set(patterns.flatMap(pattern =>
  require('glob').sync(normalize(pattern), {
    cwd: process.cwd(), absolute: true, nodir: true,
    ignore: (Array.isArray(exclude) ? exclude : [exclude]).map(normalize),
  }).map(file => normalize(path.resolve(file))),
))].sort();
fs.writeFileSync(process.argv[1], JSON.stringify({ configPath, patterns, exclude, matches }, null, 2), { flag: 'wx' });
`,
      output,
    ],
    'package-discovery',
    pkg,
  );
  assert.equal(record.exitCode, 0, fs.readFileSync(path.join(receipt, record.log), 'utf8'));
  const discovery = JSON.parse(fs.readFileSync(output, 'utf8'));
  const providerMatches = discovery.matches.filter(file =>
    [scope, historicalScope].some(root => file.startsWith(`${repo.replaceAll('\\', '/')}/${root}/`)),
  );
  assert.deepEqual(providerMatches, [`${owned.replaceAll('\\', '/')}/IdPrefixProvider.cy.tsx`]);
  const historicalFiles = walk(path.join(repo, historicalScope)).map(file =>
    path.relative(path.join(repo, historicalScope), file),
  );
  assert.deepEqual(historicalFiles, ['.gitignore'], 'old scope retains only its historical evidence ignore file');
  save('global-discovery', {
    ...discovery,
    configSHA256: hash(path.join(pkg, 'cypress.config.ts')),
    providerMatches,
    providerSpecCount: 1,
    oldScopeSpecCount: 0,
    helperSpecCount: 0,
    historicalFiles,
    command: record,
  });
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
const baselinePath = path.join(evidenceRoot, 'entry.json');
const baselineExisted = fs.existsSync(baselinePath);
if (!baselineExisted) {
  fs.writeFileSync(baselinePath, JSON.stringify(protectedBefore, null, 2), { flag: 'wx' });
}
save('entry-initialization', { baselinePath, baselineExisted, initialized: !baselineExisted, scope, historicalScope });
process.stdout.write(`Evidence: ${receipt}\n`);
try {
  if (mode === 'cypress' || mode === 'standard') {
    if (mode === 'standard') {
      globalDiscovery();
    }
    const port = spawnSync(
      process.execPath,
      [
        '-e',
        "const s=require('node:net').createServer();s.on('error',e=>{console.error(e.message);process.exit(1)});s.listen(46135,'127.0.0.1',()=>s.close());",
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    assert.equal(port.status, 0, `port 46135 unavailable: ${port.stderr}`);
    const existing = new Set(fs.readdirSync(evidenceRoot));
    const args = [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--config-file',
      mode === 'standard' ? 'cypress.config.ts' : 'testing/IdPrefixProvider/IdPrefixProvider.cypress.config.cjs',
      '--spec',
      'testing/IdPrefixProvider/IdPrefixProvider.cy.tsx',
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
    assert.equal(command.exitCode, 0, fs.readFileSync(path.join(receipt, 'chrome.log'), 'utf8').slice(-16000));
    const xmlFiles = fs.readdirSync(receipt).filter(file => /^results-.*\.xml$/.test(file));
    assert.equal(xmlFiles.length, 1, 'one canonical JUnit file');
    const xml = fs.readFileSync(path.join(receipt, xmlFiles[0]), 'utf8');
    assert(!/<(?:failure|error|skipped)\b/.test(xml), 'zero errors/failures/skips');
    const decode = value =>
      value
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    const attributes = tag =>
      Object.fromEntries([...tag.matchAll(/\b(\w+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
    const cases = [...xml.matchAll(/<testcase\b([^>]*)>/g)].map(match => attributes(match[1]));
    const suites = [...xml.matchAll(/<testsuite\b([^>]*)>/g)].map(match => attributes(match[1]));
    const root = xml.match(/<testsuites\b([^>]*)>/);
    assert(root, 'JUnit root counters required');
    const counters = attributes(root[1]);
    for (const suite of [counters, ...suites]) {
      for (const key of ['failures', 'errors', 'skipped', 'pending', 'retries']) {
        if (suite[key] !== undefined) {
          assert.equal(suite[key], '0', `zero ${key}`);
        }
      }
      assert(/^\d+$/.test(suite.tests), 'valid test counter');
    }
    const newAudits = fs.readdirSync(evidenceRoot).filter(file => file.startsWith('audits-') && !existing.has(file));
    assert.equal(newAudits.length, 1, 'one unique audit registration');
    const auditRoot = path.join(evidenceRoot, newAudits[0]);
    const manifest = JSON.parse(fs.readFileSync(path.join(auditRoot, 'manifest.json'), 'utf8'));
    const expected = [28, 48, 73][round - 1];
    assert.equal(manifest.round, round);
    assert.equal(manifest.titles.length, expected);
    assert.equal(new Set(manifest.titles).size, expected);
    assert.equal(cases.length, expected);
    assert.equal(Number(counters.tests), expected);
    assert.equal(
      suites.reduce((sum, suite) => sum + Number(suite.tests), 0),
      expected,
    );
    assert.deepEqual(
      cases.map(item => item.name).sort(),
      manifest.titles.map(title => `row135 IdPrefixProvider ${title}`).sort(),
    );
    assert.deepEqual(cases.map(item => item.classname).sort(), [...manifest.titles].sort());
    const audits = fs
      .readdirSync(auditRoot)
      .filter(file => /^audit-\d+\.json$/.test(file))
      .map(file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8')));
    assert.equal(audits.length, expected);
    assert.deepEqual(audits.map(item => item.scenario).sort(), [...manifest.titles].sort());
    for (const audit of audits) {
      assert.equal(audit.kind, 'axe');
      assert.equal(audit.round, round);
      assert.equal(audit.retries, 0);
      assert.equal(audit.fullResults.testEngine.name, 'axe-core');
      assert(audit.fullResults.passes.length > 0);
      assert.deepEqual(audit.fullResults.violations, []);
      assert.deepEqual(audit.fullResults.incomplete, []);
      assert.equal(new Set(audit.ids).size, audit.ids.length);
      assert(Array.isArray(audit.realEvents), 'real event receipts present');
      assert(audit.realEvents.every(event => ['realClick', 'realPress'].includes(event.command)));
    }
    if (round >= 2) {
      const tab = audits.find(
        audit => audit.scenario === 'CDP Tab follows input and both referenced controls in order',
      );
      assert.deepEqual(
        tab.realEvents.filter(event => event.command === 'realPress').map(event => event.args[0]),
        ['Tab', 'Tab'],
      );
      const enter = audits.find(
        audit => audit.scenario === 'CDP Enter opens the uniquely referenced aria-controls panel',
      );
      assert.deepEqual(
        enter.realEvents.filter(event => event.command === 'realPress').map(event => event.args[0]),
        ['Enter'],
      );
    }
    save('summary', {
      mode,
      round,
      command,
      passed: expected,
      failures: 0,
      errors: 0,
      skipped: 0,
      pending: 0,
      retries: 0,
      auditCount: audits.length,
      auditRoot,
      manifest,
      cases,
      counters,
      suites,
      sources: before,
    });
    process.stdout.write(`${expected} passed; ${audits.length} complete default axe audits\n`);
  } else if (mode === 'checks' || mode === 'format') {
    const files = before
      .map(item => `${scope}/${item.path.replaceAll('\\', '/')}`)
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
      records.push(
        run(
          'node_modules/typescript/bin/tsc',
          ['-p', path.join(owned, 'testing/tsconfig.units.json'), '--pretty', 'false'],
          'unit-types',
        ),
      );
    }
    assert(
      records.every(record => record.exitCode === 0),
      'format/lint/typecheck must all pass',
    );
  } else if (mode === 'units') {
    const command = run(
      'node_modules/jest/bin/jest.js',
      [
        '--config',
        'jest.config.cjs',
        '--runInBand',
        '--runTestsByPath',
        'src/hooks/useId.test.tsx',
        'src/ssr/SSRContext.test.tsx',
        'src/ssr/SSRContext-node.test.tsx',
        'testing/IdPrefixProvider/testing/legacy.test.tsx',
        '--json',
        `--outputFile=${path.join(receipt, 'units.json')}`,
        '--cacheDirectory',
        path.join(receipt, 'jest-cache'),
      ],
      'units',
      pkg,
    );
    assert.equal(command.exitCode, 0);
    const result = JSON.parse(fs.readFileSync(path.join(receipt, 'units.json'), 'utf8'));
    assert(result.success && !result.numFailedTests && !result.numPendingTests && !result.numTodoTests);
    assert.equal(result.numPassedTests, 18);
    assert.equal(result.numPassedTestSuites, 4);
    assert(!result.snapshot.failure && !result.snapshot.unmatched && !result.snapshot.updated);
  } else if (mode === 'isolation') {
    const ts = require(path.join(repo, 'node_modules/typescript'));
    const config = ts.readConfigFile(path.join(pkg, 'tsconfig.lib.json'), ts.sys.readFile);
    assert(!config.error);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, pkg);
    assert.deepEqual(parsed.errors, []);
    const inScope = file =>
      [scope, historicalScope].some(root =>
        file.replaceAll('\\', '/').startsWith(`${repo.replaceAll('\\', '/')}/${root}/`),
      );
    const roots = parsed.fileNames.filter(inScope);
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const inputs = program
      .getSourceFiles()
      .map(file => file.fileName)
      .filter(inScope);
    assert.deepEqual(roots, [], 'zero owned production TS roots');
    assert.deepEqual(inputs, [], 'zero owned actual production TS program inputs');
    const candidates = walk(owned).filter(file => /\.tsx?$/.test(file));
    const output = path.join(receipt, 'emitted');
    const record = run(
      'node_modules/@swc/cli/bin/swc.js',
      [
        ...candidates.map(file => path.relative(pkg, file)),
        '--config-file',
        path.join(pkg, '.swcrc'),
        '--out-dir',
        output,
        '--strip-leading-paths',
        '--sync',
      ],
      'swc',
      pkg,
    );
    assert.equal(record.exitCode, 0);
    const emitted = fs.existsSync(output) ? walk(output) : [];
    assert.deepEqual(emitted, [], 'actual package SWC emits zero owned modules');
    save('isolation', { roots, inputs, candidates, emitted, fixtureEmission: 0 });
  } else if (mode === 'discovery') {
    globalDiscovery();
    const projectRecord = run(
      'node_modules/nx/bin/nx.js',
      ['show', 'project', 'idprefixprovider-functional-tests', '--json'],
      'project',
    );
    assert.equal(projectRecord.exitCode, 0);
    const project = nxJSON('project');
    assert.equal(project.root, `${scope}/testing/ci`);
    assert.equal(project.projectType, 'application');
    assert.deepEqual(project.tags, ['vNext', 'platform:web', 'test']);
    assert.deepEqual(project.implicitDependencies, [
      'react-utilities',
      'react-components',
      'react-provider',
      'react-field',
      'react-input',
      'react-theme',
    ]);
    for (const target of ['e2e', 'type-check']) {
      assert(
        project.targets[target].dependsOn.some(item => item.target === 'build' && item.projects === 'scripts-cypress'),
      );
    }
    save('project', project);
    for (const [name, file] of [
      ['production', 'packages/react-components/react-utilities/src/hooks/useId.ts'],
      ['fixture', `${scope}/testing/fixtures.stories.tsx`],
      ['canonical', `${scope}/IdPrefixProvider.cy.tsx`],
      ['consumer', 'packages/react-components/react-field/library/src/components/Field/Field.tsx'],
    ]) {
      const record = run(
        'node_modules/nx/bin/nx.js',
        ['show', 'projects', '--affected', '--files', file, '--json'],
        `affected-${name}`,
      );
      assert.equal(record.exitCode, 0);
      const affected = nxJSON(`affected-${name}`);
      assert(affected.includes('idprefixprovider-functional-tests'), 'affected includes owned functional project');
      save(`affected-${name}`, { file, affected });
    }
    const { fileMap } = JSON.parse(
      fs.readFileSync(path.join(env.NX_WORKSPACE_DATA_DIRECTORY, 'file-map.json'), 'utf8'),
    );
    assert(
      fileMap.projectFileMap['react-utilities'].some(file => file.file === `${scope}/testing/fixtures.stories.tsx`),
    );
    assert(
      fileMap.projectFileMap['idprefixprovider-functional-tests'].some(
        file => file.file === `${scope}/testing/ci/project.json`,
      ),
    );
    save('ownership', { fixtureOwner: 'react-utilities', projectOwner: 'idprefixprovider-functional-tests' });
    const graph = JSON.parse(fs.readFileSync(path.join(env.NX_WORKSPACE_DATA_DIRECTORY, 'project-graph.json'), 'utf8'));
    const application = 'idprefixprovider-functional-tests';
    const consumerProjects = ['react-components', 'react-provider', 'react-field', 'react-input', 'react-theme'];
    assert(
      !graph.dependencies['react-utilities'].some(edge => consumerProjects.includes(edge.target)),
      'test-only consumer imports must not create production utility-to-consumer edges',
    );
    const visited = new Set();
    function visit(name) {
      assert.notEqual(name, application, 'no dependency cycle back to the functional application');
      if (visited.has(name)) {
        return;
      }
      visited.add(name);
      for (const edge of graph.dependencies[name] ?? []) {
        visit(edge.target);
      }
    }
    for (const edge of graph.dependencies[application]) {
      visit(edge.target);
    }
    save('graph', {
      applicationEdges: graph.dependencies[application],
      utilityEdges: graph.dependencies['react-utilities'],
      reachableProjects: [...visited].sort(),
      applicationCycle: false,
    });
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
              `idprefixprovider-functional-tests:${target}`,
              '--skipSync',
              '--skipNxCache',
              '--outputStyle=static',
            ],
          ]);
    const records = requests.map(([name, args]) => {
      const record = run('node_modules/nx/bin/nx.js', args, name);
      const log = fs.readFileSync(path.join(receipt, `${name}.log`), 'utf8');
      return { ...record, windowsTS5023: /TS5023: Unknown compiler option '-'\./.test(log) };
    });
    save('prerequisite', {
      records,
      skipSync: mode === 'registered',
      synchronizationApplied: false,
      coldGreen: records.every(record => record.exitCode === 0),
    });
    assert(
      records.every(record => record.exitCode === 0),
      'registered/helper/sync prerequisite blocked; see raw logs; no bypass',
    );
  } else if (mode === 'invalid') {
    const invalid = [
      ['bogus'],
      ['cypress', '0'],
      ['cypress', '4'],
      ['cypress', '1.0'],
      ['cypress', ' 1'],
      ['cypress', 'NaN'],
      ['cypress', '3', 'UPPER'],
      ['cypress', '3', '../escape'],
      ['cypress', '3', ''],
      ['cypress', '3', 'ok', 'extra'],
    ];
    const records = invalid.map(args => {
      const result = spawnSync(process.execPath, [__filename, ...args], {
        cwd: repo,
        env,
        encoding: 'utf8',
        windowsHide: true,
      });
      assert.equal(result.status, 1, 'invalid arguments fail before running tools');
      assert(/invalid mode|round must be exactly|label must be|unexpected arguments/.test(result.stderr));
      return { args, exitCode: result.status, stderr: result.stderr };
    });
    save('invalid', records);
  } else if (mode === 'seal') {
    const finalReceipts = fs.readdirSync(evidenceRoot).filter(name => /-r[123]-final-/.test(name));
    const required = [
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
    const selected = required.map(prefix => {
      const matches = finalReceipts.filter(name => name.startsWith(`${prefix}-final-`));
      const currentMatches = matches.filter(
        name =>
          JSON.stringify(JSON.parse(fs.readFileSync(path.join(evidenceRoot, name, 'source-before.json'), 'utf8'))) ===
          JSON.stringify(before),
      );
      assert.equal(currentMatches.length, 1, `exactly one current-source final receipt for ${prefix}`);
      const directory = path.join(evidenceRoot, currentMatches[0]);
      for (const phase of ['before', 'after']) {
        assert.deepEqual(
          JSON.parse(fs.readFileSync(path.join(directory, `source-${phase}.json`), 'utf8')),
          before,
          'every final receipt bound to current recursive sources',
        );
      }
      const commands = fs.existsSync(path.join(directory, 'commands.jsonl'))
        ? fs
            .readFileSync(path.join(directory, 'commands.jsonl'), 'utf8')
            .trim()
            .split('\n')
            .map(line => JSON.parse(line))
        : [];
      const prerequisite = ['registered-r3', 'sync-r3'].includes(prefix);
      if (!prerequisite) {
        assert(
          commands.every(command => command.exitCode === 0),
          'final commands green',
        );
      }
      const result = { prefix, directory, commands, prerequisiteBlocked: prerequisite };
      if (prefix.startsWith('cypress') || prefix.startsWith('standard')) {
        const summary = JSON.parse(fs.readFileSync(path.join(directory, 'summary.json'), 'utf8'));
        assert.equal(summary.passed, [28, 48, 73][summary.round - 1]);
        assert.equal(summary.auditCount, summary.passed);
        assert.deepEqual(summary.sources, before);
        result.summary = { passed: summary.passed, auditCount: summary.auditCount, auditRoot: summary.auditRoot };
        result.auditHashes = walk(summary.auditRoot).map(file => ({ path: file, hash: hash(file) }));
      }
      if (prerequisite) {
        const status = JSON.parse(fs.readFileSync(path.join(directory, 'prerequisite.json'), 'utf8'));
        assert.equal(status.coldGreen, false, 'known prerequisite limitation remains explicit');
        if (prefix === 'registered-r3') {
          assert.equal(status.skipSync, true);
          assert(
            status.records.every(record => record.windowsTS5023),
            'exact recorded shared Windows helper blocker',
          );
        } else {
          assert.equal(status.synchronizationApplied, false);
          assert.equal(status.records.find(record => record.log === 'sync-check.log').exitCode, 1);
          assert.equal(status.records.find(record => record.log === 'sync-dry-run.log').exitCode, 0);
        }
      }
      result.receiptHashes = walk(directory).map(file => ({ path: path.relative(directory, file), hash: hash(file) }));
      return result;
    });
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const current = outside();
    const outsideChanges = baseline.files.filter(
      file => !fs.existsSync(path.join(repo, file.path)) || hash(path.join(repo, file.path)) !== file.hash,
    );
    assert.deepEqual(outsideChanges, [], 'original protected source/configuration bytes preserved');
    assert.equal(current.branch, 'master');
    save('seal', {
      row: 135,
      browserReadyForParentReview: true,
      committed: false,
      reviewed: false,
      coldNxGreen: false,
      sourceManifest: before,
      sourceManifestSHA256: crypto.createHash('sha256').update(JSON.stringify(before)).digest('hex'),
      baselineHead: baseline.head,
      finalHead: current.head,
      outsideChanges,
      outsideStatusUnchanged: JSON.stringify(baseline.status) === JSON.stringify(current.status),
      receipts: selected,
      supersededFinalReceipts: finalReceipts.filter(
        name => !selected.some(item => path.basename(item.directory) === name),
      ),
    });
  } else {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const current = outside();
    const changed = baseline.files.filter(
      file => !fs.existsSync(path.join(repo, file.path)) || hash(path.join(repo, file.path)) !== file.hash,
    );
    save('preservation', {
      baselineHead: baseline.head,
      currentHead: current.head,
      headChanged: baseline.head !== current.head,
      branchUnchanged: baseline.branch === current.branch,
      outsideStatusUnchanged: JSON.stringify(baseline.status) === JSON.stringify(current.status),
      changed,
    });
    assert.equal(changed.length, 0, 'outside bytes changed; report concurrent work without reverting');
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
  });
  if (mode !== 'format') {
    assert.deepEqual(after, before, 'recursive owned source unchanged during verification');
  }
}
