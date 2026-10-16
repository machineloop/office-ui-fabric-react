'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const webpack = require('webpack');
const {
  packageRoot, key, hash, inside, installedDependency, originalComponentSource, inventory, options, selectJobs, findRepo, outsideRepo, confined, loadSupport,
  productionFiles, sealProduction, productionBaseline, verifyProduction, expectedProduction, prepareJobs, sealJobs,
  createExecutionInventory, validateResults, baselineContract, supportOnlyRuntimeReceipt, validateHelperConsumer, main,
} = require('./run-suites.cjs');
const { MirrorModulesPlugin, createAdapter } = require('./cypress.config.cjs');

function fixture(t) {
  const root = path.join(__dirname, `.runner-fixture-${process.pid}-${Math.random().toString(16).slice(2)}`);
  fs.mkdirSync(root);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (relative, text) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    return file;
  };
  return { root, write };
}

function compile(config, configure) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config);
    if (configure) configure(compiler);
    compiler.run((error, stats) => compiler.close(closeError => {
      if (error || closeError) reject(error || closeError);
      else resolve(stats);
    }));
  });
}

function attachSeal(job, files) {
  const seal = sealProduction(job.repo, files.map(file => path.relative(job.repo, file)));
  const productionSeal = path.join(job.artifacts, 'production-seal.json');
  fs.writeFileSync(productionSeal, JSON.stringify(seal));
  Object.assign(job, { productionSeal, productionSealSha256: hash(productionSeal) });
  return seal;
}

test('inventory retains 186 original jobs / 188 specs and exact selectors select whole jobs', () => {
  const repo = findRepo();
  const jobs = inventory(repo);
  assert.equal(jobs.length, 186);
  assert.equal(jobs.reduce((count, job) => count + job.specs.length, 0), 188);
  const card = jobs.find(job => job.package === 'card' && job.specs.length === 2);
  assert.ok(card);
  assert.deepEqual(selectJobs(jobs, { specs: [path.relative(packageRoot, card.specs[1])], packages: [] }, repo), [card]);
  assert.deepEqual(selectJobs(jobs, { specs: [path.relative(repo, card.sourceSpecs[0])], packages: [] }, repo), [card]);
  assert.deepEqual(
    selectJobs(jobs, { specs: [], packages: ['react-card'] }, repo),
    selectJobs(jobs, { specs: [], packages: ['card'] }, repo),
  );
  assert.throws(() => selectJobs(jobs, { specs: ['Card'], packages: [] }, repo), /exactly one full spec path/);
  assert.ok(selectJobs(jobs, { specs: [], packages: ['deprecated/infobutton'] }, repo).length > 0);
  assert.throws(() => selectJobs(jobs, { specs: [], packages: ['infobutton'] }, repo), /Unknown exact package/);
});

test('options use eight workers, validate boundaries, and preserve space-containing values', () => {
  assert.equal(options([], {}).workers, 8);
  assert.equal(options(['--output-root=C:\\receipts'], {}).artifacts, 'C:\\receipts');
  assert.deepEqual(options(['--spec=a b.cy.tsx', '--package', 'deprecated/infobutton'], {}).specs, ['a b.cy.tsx']);
  assert.equal(options([], { MIRROR_E2E_WORKERS: '3' }).workers, 3);
  assert.throws(() => options(['--workers=0'], {}), /Workers/);
  assert.throws(() => options(['--workers=1.5'], {}), /Workers/);
  assert.throws(() => options(['--spec'], {}), /Missing value/);
  assert.throws(() => options(['--unknown'], {}), /Unknown argument/);
  assert.throws(() => options(['--timeout=-1'], {}), /Timeout/);
});

test('repository support manifest hashes and primary mappings satisfy the execution contract', {
  skip: !fs.existsSync(path.join(packageRoot, 'support-manifest.json')),
}, () => {
  const repo = findRepo();
  const mapping = loadSupport(repo);
  const jobs = inventory(repo);
  const prepared = prepareJobs(jobs, repo, mapping);
  assert.equal(prepared.length, 186);
  assert.equal(prepared.reduce((count, job) => count + job.specs.length, 0), 188);
  assert.ok(jobs.every(job => job.repo === undefined));
  const baseline = productionBaseline(repo, sealJobs(repo, prepared));
  for (const dependency of ['embla-carousel', 'embla-carousel-autoplay', 'embla-carousel-fade']) {
    const esm = path.join(repo, 'packages', 'react-components', 'react-carousel', 'library', 'node_modules', dependency, 'esm');
    const resources = fs.readdirSync(esm).filter(file => file.endsWith('.js')).map(file => path.join(esm, file));
    assert.ok(resources.length > 0, dependency);
    for (const resource of resources) {
      assert.equal(installedDependency(resource), true);
      assert.equal(originalComponentSource(repo, resource), false);
      assert.equal(baseline.has(key(resource)), false);
    }
  }
  for (const job of prepared) {
    assert.equal(job.repo, repo);
    assert.equal(typeof job.nxProject, 'string');
    assert.equal(typeof job.nxTarget, 'string');
    assert.ok(job.expectedProduction.length, job.id);
    assert.ok(job.targetProductionAnchors.length || job.verifiedBaselineExpectation?.kind === 'support-only-primary', job.id);
    assert.ok(job.targetProductionAnchors.every(anchor => baseline.get(key(anchor.resource))?.sha256), job.id);
    for (let index = 0; index < job.sourceSpecs.length; index++) {
      const entry = mapping.originals.get(key(job.sourceSpecs[index]));
      assert.ok(entry, job.sourceSpecs[index]);
      assert.equal(entry.kind, 'spec');
      assert.equal(entry.sha256, job.entries[index].sha256);
      assert.equal(key(entry.mirror), key(job.specs[index]));
    }
  }
});

test('real no-selector --list uses the execution preflight for all 186 jobs and 188 specs', async () => {
  const originalLog = console.log;
  let listed;
  console.log = value => { listed = JSON.parse(value); };
  try {
    assert.equal(await main(['--list']), 0);
  } finally {
    console.log = originalLog;
  }
  assert.equal(listed.length, 186);
  assert.equal(listed.reduce((count, job) => count + job.specs.length, 0), 188);
  assert.ok(listed.every(job => job.expectedProduction.length > 0));
  assert.ok(listed.every(job => job.targetProductionAnchors.length > 0 || job.baselineExpectation?.kind === 'support-only-primary'));
  assert.equal(listed.filter(job => job.baselineExpectation?.kind === 'support-only-primary').length, 2);
  assert.equal(listed.filter(job => job.specs.length === 2).length, 2);
  const babel = listed.find(job => job.package === 'babel-preset-global-context');
  assert.ok(babel.expectedProduction.some(entry => entry.reason.includes('transformPlugin')));
});

test('execution inventory conversion preserves all mandatory target and injected production annotations', () => {
  const repo = findRepo();
  const current = JSON.parse(fs.readFileSync(path.join(packageRoot, 'execution-manifest.json'), 'utf8'));
  const converted = createExecutionInventory(current, repo, current.sourceInventorySha256);
  assert.equal(converted.jobs.length, 186);
  assert.equal(converted.jobs.filter(job => job.productionAnchors?.length > 0).length, 184);
  assert.equal(converted.jobs.filter(job => job.baselineExpectation).length, 3);
  for (let index = 0; index < current.jobs.length; index++) {
    assert.deepEqual(converted.jobs[index].productionAnchors, current.jobs[index].productionAnchors);
    assert.deepEqual(converted.jobs[index].injectedProductionDependencies, current.jobs[index].injectedProductionDependencies);
    assert.deepEqual(converted.jobs[index].baselineExpectation, current.jobs[index].baselineExpectation);
  }
  const babel = converted.jobs.find(job => job.nxProject === 'babel-preset-global-context');
  assert.equal(babel.injectedProductionDependencies.length, 1);
  const absolute = createExecutionInventory({
    repo, jobs: [{
      ...current.jobs[0],
      productionAnchors: current.jobs[0].productionAnchors.map(anchor => ({ ...anchor, source: path.join(repo, anchor.source) })),
    }],
  }, repo, current.sourceInventorySha256);
  assert.deepEqual(absolute.jobs[0].productionAnchors, current.jobs[0].productionAnchors);
  const support = loadSupport(repo, path.join(packageRoot, 'support-manifest.json'), false);
  const jobs = inventory(repo, undefined, converted);
  assert.equal(prepareJobs(jobs, repo, support).length, 186);
});

function caseReceipt(job, cases) {
  const counts = {
    tests: cases.length, passes: cases.filter(test => test.state === 'passed').length,
    failures: cases.filter(test => test.state === 'failed').length, pending: cases.filter(test => test.state === 'pending').length,
    skipped: cases.filter(test => test.state === 'skipped').length,
  };
  return {
    runs: [{ spec: { absolute: job.specs[0] }, stats: counts, tests: cases }],
    totalTests: counts.tests, totalPassed: counts.passes, totalFailed: counts.failures,
    totalPending: counts.pending, totalSkipped: counts.skipped,
  };
}

test('only the three exact identity/hash-bound baseline contracts accept their original case shapes', () => {
  const repo = findRepo();
  const jobs = inventory(repo).map(job => ({ ...job, repo }));
  const exceptions = jobs.filter(job => job.baselineExpectation);
  assert.equal(exceptions.length, 3);
  for (const job of exceptions) {
    const expected = job.baselineExpectation.expectedCases;
    const receipt = caseReceipt(job, expected);
    const valid = validateResults(job, receipt);
    assert.equal(valid.passed, true, job.id);
    assert.equal(valid.expectedState, expected.length ? 'BASELINE_PENDING' : 'SUPPORT_ONLY');
    assert.equal(valid.realPassingTests, 0);
    assert.equal(validateResults({ ...job, baselineExpectation: undefined }, receipt).passed, false);
    assert.throws(() => baselineContract({
      ...job, baselineExpectation: { ...job.baselineExpectation, sourceSha256: '0'.repeat(64) },
    }), /Unapproved or changed/);
    assert.throws(() => baselineContract({ ...job, id: `${job.id}.different` }), /Unapproved or changed/);
    assert.throws(() => baselineContract({
      ...job, baselineExpectation: { ...job.baselineExpectation, configSha256: '0'.repeat(64) },
    }), /Unapproved or changed/);
    const added = [...expected, { title: ['unexpected authored case'], state: 'pending' }];
    assert.equal(validateResults(job, caseReceipt(job, added)).passed, false);
  }
  const pending = exceptions.find(job => job.baselineExpectation.kind === 'baseline-pending');
  assert.equal(validateResults(pending, caseReceipt(pending, [])).passed, false);
  assert.equal(validateResults(pending, caseReceipt(pending, [{
    title: pending.baselineExpectation.expectedCases[0].title, state: 'passed',
  }])).passed, false);
  assert.equal(validateResults(pending, caseReceipt(pending, [{
    title: ['SwatchPicker', 'changed title'], state: 'pending',
  }])).passed, false);
});

test('zero-test runtime receipts are explicit, exact-support-only, and never a general missing-receipt fallback', () => {
  const repo = findRepo();
  const jobs = inventory(repo).map(job => ({ ...job, repo }));
  const helper = jobs.find(job => job.baselineExpectation?.kind === 'support-only-primary');
  const receipt = supportOnlyRuntimeReceipt(helper, caseReceipt(helper, []));
  assert.equal(receipt.passed, true);
  assert.equal(receipt.origin, 'exact-verified-zero-test-support-primary');
  assert.equal(receipt.baselineExpectation.sourceSha256, helper.entries[0].sha256);
  assert.deepEqual(receipt.runtimeInputReads, []);
  const normal = jobs.find(job => job.package === 'card' && job.specs.length === 2);
  assert.throws(() => supportOnlyRuntimeReceipt(normal, caseReceipt(normal, [])), /No approved/);
  assert.throws(() => supportOnlyRuntimeReceipt(helper, caseReceipt(helper, [{
    title: ['unexpected'], state: 'pending',
  }])), /No approved/);
});

test('support-only primaries require exact passing owner cases and raw mirrored-helper evidence', () => {
  const repo = findRepo();
  const support = loadSupport(repo, path.join(packageRoot, 'support-manifest.json'), false);
  const jobs = prepareJobs(inventory(repo), repo, support);
  for (const helper of jobs.filter(job => job.verifiedBaselineExpectation?.kind === 'support-only-primary')) {
    const contract = helper.verifiedBaselineExpectation;
    const owner = jobs.find(job => job.id === contract.consumers[0].ownerJob);
    const results = owner.specs.map(spec => caseReceipt({ specs: [spec] }, [{ title: ['authored owner case'], state: 'passed' }]));
    const combined = {
      runs: results.flatMap(result => result.runs), totalTests: results.length, totalPassed: results.length,
      totalFailed: 0, totalPending: 0, totalSkipped: 0,
    };
    const resource = {
      resource: helper.specs[0], classification: 'mirrored-test-support', sha256: contract.sourceSha256,
      observedSha256: contract.sourceSha256, observedRawSha256: [contract.sourceSha256], rawReadCount: 1,
    };
    const evidence = {
      job: owner, results: combined, runtime: { passed: true },
      webpack: { assertions: {
        passed: true, actualRawResourceBytesObserved: true, rawResourceBytesMatchSeal: true, targetProductionObserved: true,
      }, resources: [resource] },
    };
    assert.equal(validateHelperConsumer(helper, owner, evidence).passed, true);
    assert.equal(validateHelperConsumer(helper, owner, {
      ...evidence, webpack: { ...evidence.webpack, resources: [] },
    }).passed, false);
    assert.equal(validateHelperConsumer(helper, owner, {
      ...evidence, webpack: { ...evidence.webpack, resources: [{ ...resource, rawReadCount: 0 }] },
    }).passed, false);
    assert.equal(validateHelperConsumer(helper, owner, {
      ...evidence, webpack: { ...evidence.webpack, resources: [{ ...resource, resource: helper.sourceSpecs[0] }] },
    }).passed, false);
    assert.equal(validateHelperConsumer(helper, owner, {
      ...evidence, results: { ...combined, totalPassed: 0 },
    }).passed, false);
    assert.throws(() => prepareJobs([helper], repo, {
      ...support, manifest: { ...support.manifest, edges: support.manifest.edges.filter(edge =>
        !edge.resolved || key(confined(repo, edge.resolved)) !== key(helper.sourceSpecs[0])) },
    }), /Unverified declared/);
  }
});

test('support-only compilation proves exact mirrored helper bytes without claiming standalone component tests', t => {
  const { root } = fixture(t);
  const repo = findRepo();
  const mapping = loadSupport(repo, path.join(packageRoot, 'support-manifest.json'), false);
  const helper = prepareJobs(inventory(repo).filter(job => job.baselineExpectation?.kind === 'support-only-primary'), repo, mapping)[0];
  const auxiliary = helper.expectedProduction[0].resource;
  const job = { ...helper, packageRoot, artifacts: root };
  const plugin = new MirrorModulesPlugin(job, mapping, attachSeal(job, [helper.sourceSpecs[0], auxiliary]));
  plugin.compilations = 1;
  for (const [resource, classification, sealedBeforeConfig] of [
    [helper.specs[0], 'mirrored-test-support', false], [auxiliary, 'original-production-or-infrastructure', true],
  ]) {
    const sha256 = hash(resource);
    plugin.observeResource({ resourcePath: resource }, fs.readFileSync(resource));
    plugin.resources.set(key(resource), { resource, classification, sealedBeforeConfig, sha256, observedSha256: sha256 });
  }
  const audit = plugin.persist(true);
  assert.equal(audit.passed, true);
  assert.equal(audit.supportOnlyPrimaryObserved, true);
  assert.equal(audit.componentTargetNotApplicable, true);
  assert.equal(audit.originalComponentProductionObserved, false);
  assert.equal(audit.noCompiledSourceWrites, true);
  plugin.rawMismatches.set(key(helper.specs[0]), { resource: helper.specs[0], expectedSha256: helper.entries[0].sha256 });
  assert.throws(() => plugin.persist(true), /audit failed/);
});

test('manifest paths cannot escape roots and artifacts cannot resolve inside the repository', t => {
  const { root, write } = fixture(t);
  const repo = path.join(root, 'repo');
  write('repo\\marker', '');
  assert.throws(() => confined(repo, '..\\outside.js'), /escapes/);
  assert.throws(() => outsideRepo(repo, path.join(repo, 'artifacts')), /outside/);
  assert.equal(outsideRepo(repo, path.join(root, 'artifacts')), path.join(root, 'artifacts'));
  const source = write('repo\\support.js', 'export const value = 1;');
  const mirror = write('mirror\\support.js', 'export const value = 1;');
  const manifest = write('support-manifest.json', JSON.stringify({
    files: [{ source: 'support.js', destination: 'support.js', sha256: hash(source), kind: 'support' }],
  }));
  const mirrorRoot = path.join(root, 'mirror');
  assert.equal(loadSupport(repo, manifest, true, mirrorRoot).originals.get(key(source)).mirror, mirror);
  const copiedManifest = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  fs.writeFileSync(manifest, JSON.stringify({ ...copiedManifest, productionDependencies: ['support.js'] }));
  assert.throws(() => loadSupport(repo, manifest, true, mirrorRoot), /production dependency must not be copied/);
  fs.writeFileSync(manifest, JSON.stringify(copiedManifest));
  fs.appendFileSync(mirror, '\n// changed');
  assert.throws(() => loadSupport(repo, manifest, true, mirrorRoot), /bytes differ/);
  fs.writeFileSync(manifest, JSON.stringify({
    files: [{ source: 'support.js', destination: 'support.js', sha256: hash(source), kind: 'production' }],
  }));
  assert.throws(() => loadSupport(repo, manifest, true, mirrorRoot), /Production must not be copied/);
});

test('webpack maps copied relative/directory/TS imports and original stable-story aliases without production overlays', async t => {
  const { root, write } = fixture(t);
  const repo = path.join(root, 'repo');
  const mirrorRoot = path.join(root, 'mirror');
  const component = 'packages\\react-components\\react-widget';
  const text = `import { support } from './support';
import { production } from './production.js';
import { typed } from './typed.js';
import { aliased } from 'stable-story';
import { support as queried } from './support/index.ts?fixture=1';
import { support as loaded } from './passthrough-loader.cjs!./support/index.ts';
export const result = [support, production, typed, aliased, queried, loaded];`;
  const originalSpec = write(`repo\\${component}\\suite.cy.js`, text);
  const mirrorSpec = write('mirror\\suite.cy.js', text);
  const supportText = "import { production } from '../production.js'; export const support = production;";
  const originalSupport = write(`repo\\${component}\\support\\index.ts`, supportText);
  const mirrorSupport = write('mirror\\support\\index.ts', supportText);
  const aliasText = "import { production } from './production.js'; export const aliased = production;";
  const originalAlias = write(`repo\\${component}\\aliased-support.js`, aliasText);
  const mirrorAlias = write('mirror\\aliased-support.js', aliasText);
  const production = write(`repo\\${component}\\production.js`, 'export const production = 41;');
  const typed = write(`repo\\${component}\\typed.ts`, 'export const typed = 42;');
  write(`repo\\${component}\\passthrough-loader.cjs`, 'module.exports = source => source;');
  write('mirror\\production.js', "throw new Error('production overlay must never compile');");
  const artifacts = path.join(root, 'artifacts');
  fs.mkdirSync(artifacts);
  const entries = [[originalSpec, mirrorSpec], [originalSupport, mirrorSupport], [originalAlias, mirrorAlias]]
    .map(([original, mirror]) => ({ original, mirror, kind: 'support' }));
  const mapping = {
    manifest: {
      productionDependencies: [path.relative(repo, production), path.relative(repo, typed)],
      edges: [{ importer: path.relative(repo, originalSpec), request: './production.js', typeOnly: false,
        resolved: path.relative(repo, production) }],
    },
    originals: new Map(entries.map(entry => [key(entry.original), entry])),
    mirrors: new Map(entries.map(entry => [key(entry.mirror), entry])),
  };
  const job = {
    repo, packageRoot: mirrorRoot, artifacts, specs: [mirrorSpec],
    productionAnchors: [{ source: path.relative(repo, production), reason: 'Fixture component implementation' }],
  };
  const seal = attachSeal(job, [...entries.map(entry => entry.original), production, typed,
    path.join(repo, component, 'passthrough-loader.cjs')]);
  const plugin = new MirrorModulesPlugin(job, mapping, seal);
  const stats = await compile({
    mode: 'development', context: repo, entry: mirrorSpec, devtool: false,
    output: { path: path.join(artifacts, 'webpack'), filename: 'bundle.js' },
    resolve: {
      extensions: ['.js', '.ts'],
      alias: { 'stable-story': originalAlias },
    },
    plugins: [plugin],
  });
  assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true }));
  const assertions = plugin.persist(true);
  assert.equal(assertions.passed, true);
  assert.ok(plugin.resources.has(key(mirrorSupport)));
  assert.ok(plugin.resources.has(key(mirrorAlias)));
  assert.ok(plugin.resources.has(key(production)));
  assert.ok(plugin.resources.has(key(typed)));
  assert.ok(!plugin.resources.has(key(originalSupport)));
  assert.ok(!plugin.resources.has(key(path.join(mirrorRoot, 'production.js'))));
  fs.appendFileSync(production, '\n// write detection');
  assert.throws(() => plugin.persist(true), /audit failed/);
});

test('webpack reports a genuinely missing original-relative dependency explicitly', async t => {
  const { root, write } = fixture(t);
  const original = write('repo\\suite.cy.js', "import './does-not-exist';");
  const mirror = write('mirror\\suite.cy.js', "import './does-not-exist';");
  const artifacts = path.join(root, 'artifacts');
  fs.mkdirSync(artifacts);
  const entry = { original, mirror };
  const production = write('repo\\packages\\react-components\\react-widget\\index.js', 'export const value = 1;');
  const job = {
    repo: path.join(root, 'repo'), packageRoot: path.join(root, 'mirror'), artifacts, specs: [mirror],
  };
  const plugin = new MirrorModulesPlugin(job,
    { originals: new Map([[key(original), entry]]), mirrors: new Map([[key(mirror), entry]]) },
    attachSeal(job, [production]));
  const stats = await compile({
    mode: 'development', entry: mirror, output: { path: path.join(artifacts, 'webpack') }, plugins: [plugin],
  });
  assert.equal(stats.hasErrors(), true);
  assert.match(stats.toString({ all: false, errors: true }), /Missing mirrored dependency.*does-not-exist/);
  assert.throws(() => plugin.persist(true), /audit failed/);
});

test('adapter preserves original setup/browser/after-run hooks and esbuild rule tsconfigs', async t => {
  const previousCwd = process.cwd();
  t.after(() => process.chdir(previousCwd));
  const { root, write } = fixture(t);
  const repo = path.join(root, 'repo');
  const artifacts = path.join(root, 'artifacts');
  fs.mkdirSync(artifacts);
  write('repo\\package.json', '{}');
  write('repo\\component.html', '<html></html>');
  const original = write('repo\\support.js', 'export const support = 1;');
  const mirror = write('mirror\\support.js', 'export const support = 1;');
  const supportManifest = write('support-manifest.json', JSON.stringify({
    files: [{ source: 'support.js', destination: 'support.js', sha256: hash(original), kind: 'support' }],
  }));
  const configFile = write('repo\\original.config.cjs', `module.exports = {
    component: {
      indexHtmlFile: 'component.html', supportFile: 'support.js',
      devServer: { webpackConfig: {
        resolve: { extensions: ['.tsx'] },
        module: { rules: [{ loader: 'esbuild-loader', options: { tsconfig: 'original.cy.json' } }] }
      } },
      setupNodeEvents(on, config) {
        on('task', { originalTask: () => true });
        on('before:browser:launch', (browser, options) => { options.args.push('--original-hook'); return options; });
        on('after:run', () => { config.originalAfterRunCalled = true; });
        config.originalSetupCalled = true;
        return config;
      }
    }
  };`);
  const production = write('repo\\packages\\react-components\\react-widget\\index.js', 'export const value = 1;');
  const job = {
    repo, cwd: repo, config: configFile, artifacts, packageRoot: path.join(root, 'mirror'), supportManifest, port: 32123, specs: [mirror],
  };
  attachSeal(job, [production]);
  const adapter = createAdapter(job);
  assert.equal(adapter.component.devServer.webpackConfig.module.rules[0].options.tsconfig, 'original.cy.json');
  assert.deepEqual(adapter.component.devServer.webpackConfig.resolve.extensions, ['.tsx']);
  assert.equal(adapter.component.devServer.webpackConfig.output.chunkLoadTimeout, 600000);
  const commands = new Map();
  const fixtureRoot = path.join(repo, 'fixtures');
  vm.runInNewContext(fs.readFileSync(path.join(artifacts, 'isolated-support.js'), 'utf8')
    .replace(/^import .*;$/m, ''), {
    after: () => {},
    Cypress: {
      config: name => name === 'fixturesFolder' ? fixtureRoot : undefined,
      Commands: {
        overwrite: (name, handler) => commands.set(name, handler),
        overwriteQuery: (name, handler) => commands.set(name, handler),
      },
    },
  });
  let destination;
  commands.get('writeFile')((file) => { destination = file; }, `${artifacts}\\..\\repo\\production.js`, 'data');
  assert.ok(inside(artifacts, destination), destination);
  assert.equal(commands.get('readFile')((file) => file, `${artifacts}\\..\\repo\\production.js`), destination);
  commands.get('writeFile')((file) => { destination = file; }, 'reports\\receipt.json', 'data');
  assert.equal(commands.get('readFile')((file) => file, path.join(repo, 'reports', 'receipt.json')), destination);
  assert.equal(commands.get('readFile')((file) => file, 'support.js'), mirror);
  assert.equal(path.resolve(fixtureRoot, commands.get('fixture')((file) => file, '../support.js')), mirror);
  let intercepted;
  commands.get('intercept')((...args) => { intercepted = args; }, 'GET', '/asset', { fixture: '../support.js,null' });
  assert.equal(path.resolve(fixtureRoot, intercepted[2].fixture.replace(/,null$/, '')), mirror);
  commands.get('intercept')((...args) => { intercepted = args; }, 'GET', '/asset',
    request => request.reply({ fixture: '../support.js,null' }));
  let reply;
  intercepted[2]({ reply: response => { reply = response; } });
  assert.equal(path.resolve(fixtureRoot, reply.fixture.replace(/,null$/, '')), mirror);
  const events = new Map();
  const current = await adapter.component.setupNodeEvents(
    (name, handler) => events.set(name, name === 'task' ? { ...events.get(name), ...handler } : handler), adapter,
  );
  assert.equal(current.originalSetupCalled, true);
  assert.ok(events.get('task').originalTask());
  assert.equal(events.get('task').__mirrorE2eRuntimeInputs([{ source: original, resource: mirror, kind: 'support' }]), null);
  events.get('task').__mirrorE2eRuntimeInputs([]);
  assert.equal(JSON.parse(fs.readFileSync(path.join(artifacts, 'runtime-inputs.json'), 'utf8')).inputs.length, 1);
  assert.ok(fs.existsSync(path.join(artifacts, 'runtime-inputs.json')));
  const launched = await events.get('before:browser:launch')({ name: 'chrome' }, {
    args: ['--user-data-dir=old'],
  });
  assert.ok(launched.args.includes('--original-hook'));
  assert.ok(!launched.args.includes('--user-data-dir=old'));
  assert.ok(launched.args.includes(`--user-data-dir=${path.join(artifacts, 'browser-profile')}`));
  await assert.rejects(events.get('after:run')({ totalTests: 1 }), /audit failed/);
  assert.equal(current.originalAfterRunCalled, true);
  assert.equal(current.retries, 0);
  assert.equal(current.reporter, 'junit');
  assert.ok(fs.existsSync(path.join(artifacts, 'cypress-results.json')));
});

test('runtime asset routing reads thirteen Card assets and TeachingPopover media only from their mirrors', async t => {
  const previousCwd = process.cwd();
  t.after(() => process.chdir(previousCwd));
  const { root, write } = fixture(t);
  const repo = path.join(root, 'repo');
  const mirrorRoot = path.join(root, 'mirror');
  const libraryRelative = 'packages\\react-components\\react-card\\library';
  const cwd = path.join(repo, libraryRelative);
  const fixtures = path.join(repo, 'scripts', 'cypress', 'fixtures');
  const artifacts = path.join(root, 'artifacts');
  fs.mkdirSync(artifacts);
  write('repo\\package.json', '{}');
  write(`repo\\${libraryRelative}\\component.html`, '<html></html>');
  const files = [];
  const add = (source, destination, contents) => {
    const original = write(`repo\\${source}`, contents);
    const mirror = write(`mirror\\${destination}`, contents);
    files.push({ source, destination, sha256: hash(original), kind: 'support' });
    return { original, mirror, contents };
  };
  const support = add(`${libraryRelative}\\support.js`, 'support.js', 'export {};');
  const media = add(`${libraryRelative}\\src\\components\\TeachingPopoverBody\\testing\\media.svg`,
    'teaching-popover\\media.svg', '<svg></svg>');
  const assets = Array.from({ length: 13 }, (_, index) => {
    const name = `asset-${index}.png`;
    return {
      name,
      ...add(`packages\\react-components\\react-card\\stories\\src\\assets\\${name}`,
        `card\\stories\\src\\assets\\${name}`, `asset ${index}`),
    };
  });
  const manifest = write('support-manifest.json', JSON.stringify({ files }));
  const configFile = write(`repo\\${libraryRelative}\\original.config.cjs`, `module.exports = {
    fixturesFolder: ${JSON.stringify(fixtures)},
    component: {
      indexHtmlFile: 'component.html', supportFile: 'support.js',
      devServer: { webpackConfig: {} }
    }
  };`);
  const job = {
    repo, cwd, config: configFile, artifacts, packageRoot: mirrorRoot, supportManifest: manifest,
    port: 32124, specs: [support.mirror],
  };
  attachSeal(job, files.map(file => path.join(repo, file.source)));
  const adapter = createAdapter(job);
  const events = new Map();
  await adapter.component.setupNodeEvents((name, handler) => events.set(name, handler), adapter);
  const commands = new Map();
  let finish;
  vm.runInNewContext(fs.readFileSync(path.join(artifacts, 'isolated-support.js'), 'utf8')
    .replace(/^import .*;$/m, ''), {
    after: handler => { finish = handler; },
    cy: { task: (name, input) => events.get('task')[name](input) },
    Cypress: {
      config: name => name === 'fixturesFolder' ? fixtures : undefined,
      Commands: {
        overwrite: (name, handler) => commands.set(name, handler),
        overwriteQuery: (name, handler) => commands.set(name, handler),
      },
    },
  });
  const read = (request, expected) => commands.get('readFile')(file => {
    assert.equal(file, expected.mirror);
    return fs.readFileSync(file, 'utf8');
  }, request);
  assert.equal(read('src/components/TeachingPopoverBody/testing/media.svg', media), media.contents);
  for (const asset of assets) {
    assert.equal(read(`../stories/src/assets/${asset.name}`, asset), asset.contents);
    let handler;
    commands.get('intercept')((_method, _url, callback) => { handler = callback; }, 'GET', '/asset', request => {
      request.reply({
        fixture: `../../../packages/react-components/react-card/stories/src/assets/${asset.name},null`,
      });
    });
    handler({
      reply(response) {
        assert.ok(response.fixture.endsWith(',null'));
        const actual = path.resolve(fixtures, response.fixture.slice(0, -',null'.length));
        assert.equal(actual, asset.mirror);
        assert.equal(fs.readFileSync(actual, 'utf8'), asset.contents);
      },
    });
  }
  finish();
  const receipt = JSON.parse(fs.readFileSync(path.join(artifacts, 'runtime-inputs.json'), 'utf8'));
  assert.equal(receipt.passed, true);
  assert.equal(receipt.runtimeInputReads.length, 14);
  assert.deepEqual(
    receipt.runtimeInputReads.map(input => key(input.resource)).sort(),
    [media, ...assets].map(input => key(input.mirror)).sort(),
  );
});

test('production seal includes tracked ignored files and transitive nonignored sources, and detects additions', t => {
  const { root, write } = fixture(t);
  const repo = path.join(root, 'repo');
  write('repo\\.gitignore', '**/lib/\n**/tracked-ignored.js\n');
  const direct = write('repo\\packages\\react-components\\react-widget\\src\\direct.js', 'export const direct = 1;');
  const transitive = write('repo\\packages\\react-components\\react-widget\\src\\transitive.js', 'export const value = 2;');
  const trackedIgnored = write('repo\\packages\\react-components\\react-widget\\src\\tracked-ignored.js', 'export {};');
  const nestedInstalled = write('repo\\packages\\react-components\\react-widget\\node_modules\\dependency\\index.js', 'export {};');
  write('repo\\packages\\react-components\\react-widget\\lib\\generated.js', 'generated');
  for (const args of [
    ['init', '--quiet', repo],
    ['-C', repo, 'add', '-f', path.relative(repo, trackedIgnored), path.relative(repo, nestedInstalled)],
  ]) {
    const result = spawnSync('git', args, { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
  }
  const listed = productionFiles(repo).map(file => key(path.join(repo, file)));
  assert.deepEqual(listed.sort(), [direct, transitive, trackedIgnored].map(key).sort());
  const seal = sealProduction(repo);
  assert.equal(productionBaseline(repo, seal).size, 3);
  fs.appendFileSync(transitive, '\n// changed before compilation');
  const added = write('repo\\packages\\react-components\\react-widget\\src\\new-production.js', 'export {};');
  const audit = verifyProduction(repo, seal);
  assert.equal(audit.passed, false);
  assert.deepEqual(audit.changed, [transitive]);
  assert.deepEqual(audit.added, [added]);
});

test('nested installed dependencies are not original component sources, but retain write detection', async t => {
  const { root, write } = fixture(t);
  const repo = path.join(root, 'repo');
  const component = 'packages\\react-components\\react-widget';
  const mirrorRoot = path.join(root, 'mirror');
  const artifacts = path.join(root, 'artifacts');
  fs.mkdirSync(artifacts);
  const original = write(`repo\\${component}\\suite.cy.js`, "import { value } from './Widget.js'; export { value };");
  const mirror = write('mirror\\suite.cy.js', fs.readFileSync(original, 'utf8'));
  const packages = ['embla-carousel', 'embla-carousel-autoplay', 'embla-carousel-fade'];
  const production = write(`repo\\${component}\\Widget.js`, packages
    .map((name, index) => `import { value as value${index} } from '${name}';`).join('\n') +
    '\nexport const value = value0 + value1 + value2;');
  const installed = packages.map((name, index) => {
    write(`repo\\${component}\\node_modules\\${name}\\package.json`, JSON.stringify({ name, main: 'esm/index.js' }));
    return write(`repo\\${component}\\node_modules\\${name}\\esm\\index.js`, `export const value = ${index};`);
  });
  assert.equal(installedDependency('C:\\repo\\packages\\react-components\\widget\\NODE_MODULES\\dep\\index.js'), true);
  assert.equal(installedDependency('C:\\repo\\fake_node_modules\\context\\index.ts'), false);
  const entry = { original, mirror, kind: 'spec', sha256: hash(original) };
  const mapping = {
    originals: new Map([[key(original), entry]]), mirrors: new Map([[key(mirror), entry]]),
    manifest: {
      productionDependencies: [path.relative(repo, production)],
      edges: [{ importer: path.relative(repo, original), resolved: path.relative(repo, production), request: './Widget.js', typeOnly: false }],
    },
  };
  const job = {
    repo, packageRoot: mirrorRoot, artifacts, specs: [mirror], sourceSpecs: [original],
    productionAnchors: [{ source: path.relative(repo, production), reason: 'Exact fixture Widget implementation' }],
  };
  const plugin = new MirrorModulesPlugin(job, mapping, attachSeal(job, [original, production]));
  const stats = await compile({
    mode: 'development', context: path.dirname(original), entry: mirror, plugins: [plugin],
    output: { path: path.join(artifacts, 'webpack') },
  });
  assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true }));
  const assertions = plugin.persist(true);
  assert.equal(assertions.passed, true);
  assert.equal(assertions.allCompiledOriginalProductionPresealed, true);
  assert.equal(assertions.targetProductionObserved, true);
  for (const file of installed) {
    assert.equal(plugin.resources.get(key(file)).classification, 'installed-dependency');
    assert.equal(plugin.resources.get(key(file)).sealedBeforeConfig, false);
  }
  fs.appendFileSync(installed[0], '\n// changed dependency');
  assert.throws(() => plugin.persist(true), /audit failed/);
  const changed = JSON.parse(fs.readFileSync(path.join(artifacts, 'webpack-resources.json'), 'utf8'));
  assert.equal(changed.assertions.noCompiledSourceWrites, false);
});

test('pre-config seal rejects setup writes to declared and transitively compiled production', async t => {
  for (const target of ['direct', 'transitive']) {
    await t.test(target, async context => {
      const previousCwd = process.cwd();
      context.after(() => process.chdir(previousCwd));
      const { root, write } = fixture(context);
      const repo = path.join(root, 'repo');
      const component = 'packages\\react-components\\react-widget';
      const cwd = path.join(repo, component);
      const mirrorRoot = path.join(root, 'mirror');
      const artifacts = path.join(root, 'artifacts');
      fs.mkdirSync(artifacts);
      write('repo\\package.json', '{}');
      write(`repo\\${component}\\component.html`, '<html></html>');
      const original = write(`repo\\${component}\\suite.cy.js`, "import { direct } from './direct.js'; export const value = direct;");
      const mirror = write('mirror\\suite.cy.js', fs.readFileSync(original, 'utf8'));
      const direct = write(`repo\\${component}\\direct.js`, "import { value } from './transitive.js'; export const direct = value;");
      const transitive = write(`repo\\${component}\\transitive.js`, 'export const value = 1;');
      const modified = target === 'direct' ? direct : transitive;
      const config = write(`repo\\${component}\\original.config.cjs`, `module.exports = {
        component: {
          indexHtmlFile: 'component.html', supportFile: false, devServer: { webpackConfig: {} },
          setupNodeEvents(on, config) {
            require('node:fs').appendFileSync(${JSON.stringify(modified)}, '\\n// rewritten during setup');
            return config;
          }
        }
      };`);
      const source = path.relative(repo, original);
      const manifest = write('support-manifest.json', JSON.stringify({
        files: [{ source, destination: 'suite.cy.js', sha256: hash(original), kind: 'spec' }],
        productionDependencies: [path.relative(repo, direct)],
        edges: [{ importer: source, request: './direct.js', resolved: path.relative(repo, direct), typeOnly: false }],
      }));
      const job = {
        repo, cwd, config, packageRoot: mirrorRoot, artifacts, supportManifest: manifest, port: 32125,
        specs: [mirror], sourceSpecs: [original],
        productionAnchors: [{ source: path.relative(repo, direct), reason: 'Fixture component implementation' }],
      };
      const seal = attachSeal(job, [original, direct, transitive, config]);
      const adapter = createAdapter(job);
      await adapter.component.setupNodeEvents(() => {}, adapter);
      const plugin = adapter.component.devServer.webpackConfig.plugins.find(entry => entry instanceof MirrorModulesPlugin);
      const stats = await compile({
        mode: 'development', context: cwd, entry: mirror, plugins: [plugin],
        output: { path: path.join(artifacts, 'webpack') },
      });
      assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true }));
      assert.throws(() => plugin.persist(true), /audit failed/);
      const audit = JSON.parse(fs.readFileSync(path.join(artifacts, 'webpack-resources.json'), 'utf8'));
      assert.equal(audit.assertions.noCompiledSourceWrites, false);
      assert.ok(audit.assertions.changedResources.includes(modified));
      assert.equal(verifyProduction(repo, seal, false).passed, false);
      if (target === 'transitive') assert.equal(audit.assertions.expectedProductionObserved, true);
    });
  }
});

test('unlisted infrastructure cannot substitute for per-job expected runtime production', async t => {
  const { root, write } = fixture(t);
  const repo = path.join(root, 'repo');
  const mirrorRoot = path.join(root, 'mirror');
  const component = 'packages\\react-components\\react-widget';
  const original = write(`repo\\${component}\\suite.cy.js`, "import './infrastructure.js';");
  const mirror = write('mirror\\suite.cy.js', fs.readFileSync(original, 'utf8'));
  const infrastructure = write(`repo\\${component}\\infrastructure.js`, 'export const infrastructure = 1;');
  const declared = write(`repo\\${component}\\declared.js`, 'export const production = 1;');
  const typeFile = write(`repo\\${component}\\Widget.types.ts`, 'export type Widget = string;');
  const entry = { original, mirror, kind: 'spec', sha256: hash(original) };
  for (const declaredExpected of [false, true]) {
    const artifacts = path.join(root, `artifacts-${declaredExpected}`);
    fs.mkdirSync(artifacts);
    const mapping = {
      originals: new Map([[key(original), entry]]), mirrors: new Map([[key(mirror), entry]]),
      manifest: {
        productionDependencies: declaredExpected ? [path.relative(repo, declared), path.relative(repo, typeFile)] : [],
        edges: declaredExpected ? [
          { importer: path.relative(repo, original), request: './declared.js', resolved: path.relative(repo, declared), typeOnly: false },
          { importer: path.relative(repo, original), request: './Widget.types', resolved: path.relative(repo, typeFile), typeOnly: false },
          { importer: path.relative(repo, original), request: './declared.js', resolved: path.relative(repo, declared), typeOnly: true },
        ] : [],
      },
    };
    const job = {
      repo, packageRoot: mirrorRoot, artifacts, specs: [mirror], sourceSpecs: [original],
      productionAnchors: [{ source: path.relative(repo, declared), reason: 'Fixture target distinct from infrastructure' }],
    };
    const plugin = new MirrorModulesPlugin(job, mapping, attachSeal(job, [original, infrastructure, declared, typeFile]));
    assert.equal(plugin.expectedProduction.length, declaredExpected ? 1 : 0);
    const stats = await compile({
      mode: 'development', context: path.dirname(original), entry: mirror, plugins: [plugin],
      output: { path: path.join(artifacts, 'webpack') },
    });
    assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true }));
    assert.throws(() => plugin.persist(true), /audit failed/);
    const audit = JSON.parse(fs.readFileSync(path.join(artifacts, 'webpack-resources.json'), 'utf8'));
    assert.equal(audit.assertions.noCompiledSourceWrites, true);
    assert.equal(audit.assertions.expectedProductionObserved, false);
  }
});

test('actual paired Card job rejects expected theme production when Card implementation is absent', t => {
  const { root } = fixture(t);
  const repo = findRepo();
  const mapping = loadSupport(repo);
  const card = prepareJobs(inventory(repo).filter(job => job.package === 'card' && job.specs.length === 2), repo, mapping)[0];
  const theme = card.expectedProduction.find(entry =>
    key(entry.resource).endsWith('/react-theme/library/src/index.ts')).resource;
  const target = card.targetProductionAnchors[0].resource;
  assert.ok(key(target).endsWith('/react-card/library/src/components/card/card.tsx'));
  const job = { ...card, packageRoot, artifacts: root };
  const plugin = new MirrorModulesPlugin(job, mapping, attachSeal(job, [theme, target]));
  plugin.compilations = 1;
  const observe = (resource, classification, sealedBeforeConfig) => {
    const sha256 = hash(resource);
    plugin.observeResource({ resourcePath: resource }, fs.readFileSync(resource));
    plugin.resources.set(key(resource), { resource, classification, sealedBeforeConfig, sha256, observedSha256: sha256 });
  };
  for (const spec of job.specs) observe(spec, 'mirrored-test-support', false);
  observe(theme, 'original-production-or-infrastructure', true);
  assert.throws(() => plugin.persist(true), /audit failed/);
  const failed = JSON.parse(fs.readFileSync(path.join(root, 'webpack-resources.json'), 'utf8'));
  assert.equal(failed.assertions.expectedProductionObserved, true);
  assert.equal(failed.assertions.targetProductionObserved, false);
  assert.equal(failed.assertions.originalComponentProductionObserved, false);
  assert.deepEqual(failed.assertions.missingTargetProduction, [target]);
  observe(target, 'original-production-or-infrastructure', true);
  assert.equal(plugin.persist(true).passed, true);
});

test('raw resource bytes detect modified production restored before finishModules and retain the mismatch', async t => {
  const { root, write } = fixture(t);
  const repo = path.join(root, 'repo');
  const component = 'packages\\react-components\\react-widget';
  const mirrorRoot = path.join(root, 'mirror');
  const artifacts = path.join(root, 'artifacts');
  fs.mkdirSync(artifacts);
  const original = write(`repo\\${component}\\suite.cy.js`, "import { production } from './Widget.js'; export const value = production;");
  const mirror = write('mirror\\suite.cy.js', fs.readFileSync(original, 'utf8'));
  const source = 'export const production = 1;';
  const changed = 'export const production = 99;';
  const production = write(`repo\\${component}\\Widget.js`, source);
  const entry = { original, mirror, kind: 'spec', sha256: hash(original) };
  const mapping = {
    originals: new Map([[key(original), entry]]), mirrors: new Map([[key(mirror), entry]]),
    manifest: {
      productionDependencies: [path.relative(repo, production)],
      edges: [{ importer: path.relative(repo, original), request: './Widget.js',
        resolved: path.relative(repo, production), typeOnly: false }],
    },
  };
  const job = {
    repo, packageRoot: mirrorRoot, artifacts, specs: [mirror], sourceSpecs: [original],
    productionAnchors: [{ source: path.relative(repo, production), reason: 'Fixture implementation' }],
  };
  const seal = attachSeal(job, [original, production]);
  const plugin = new MirrorModulesPlugin(job, mapping, seal);
  let memory = changed;
  let consumed;
  const restoreBeforeFinish = {
    apply(compiler) {
      compiler.hooks.compilation.tap('RestoreBeforeFinish', compilation => {
        compilation.hooks.succeedModule.tap('RestoreBeforeFinish', module => {
          if (key(module.resource || '') === key(production)) {
            consumed = String(module.originalSource().source());
            memory = source;
          }
        });
      });
    },
  };
  const virtualProduction = compiler => {
    const originalFs = compiler.inputFileSystem;
    compiler.inputFileSystem = Object.create(originalFs);
    compiler.inputFileSystem.readFile = function (file, ...args) {
      if (key(String(file)) !== key(production)) return originalFs.readFile.call(originalFs, file, ...args);
      const callback = args[args.length - 1];
      process.nextTick(() => callback(null, Buffer.from(memory)));
    };
  };
  const config = {
    mode: 'development', cache: false, context: path.dirname(original), entry: mirror,
    output: { path: path.join(artifacts, 'webpack') },
  };
  const first = await compile({ ...config, plugins: [restoreBeforeFinish, plugin] }, virtualProduction);
  assert.equal(first.hasErrors(), false, first.toString({ all: false, errors: true }));
  assert.match(consumed, /production = 99/);
  assert.equal(memory, source);
  assert.equal(verifyProduction(repo, seal, false).passed, true);
  assert.throws(() => plugin.persist(true), /audit failed/);
  let receipt = JSON.parse(fs.readFileSync(path.join(artifacts, 'webpack-resources.json'), 'utf8'));
  assert.equal(receipt.assertions.actualRawResourceBytesObserved, true);
  assert.equal(receipt.assertions.rawResourceBytesMatchSeal, false);
  assert.equal(receipt.assertions.noCompiledSourceWrites, false);
  assert.equal(receipt.assertions.targetProductionObserved, false);
  assert.equal(receipt.assertions.rawResourceMismatches[0].resource, production);
  const second = await compile({ ...config, plugins: [plugin] }, virtualProduction);
  assert.equal(second.hasErrors(), false, second.toString({ all: false, errors: true }));
  assert.equal(plugin.compilations, 2);
  assert.equal(plugin.rawReads.get(key(production)).hashes.size, 2);
  assert.throws(() => plugin.persist(true), /audit failed/);
  receipt = JSON.parse(fs.readFileSync(path.join(artifacts, 'webpack-resources.json'), 'utf8'));
  assert.equal(receipt.assertions.rawResourceBytesMatchSeal, false);
  assert.equal(verifyProduction(repo, seal, false).passed, true);
});

test('raw audit preserves existing and later sync, promise and async resource readers with normal fallback', async t => {
  const { root, write } = fixture(t);
  const repo = path.join(root, 'repo');
  const component = 'packages\\react-components\\react-widget';
  const mirrorRoot = path.join(root, 'mirror');
  const artifacts = path.join(root, 'artifacts');
  fs.mkdirSync(artifacts);
  const original = write(`repo\\${component}\\suite.cy.js`, "import { value } from './Widget.js'; export { value };");
  const mirror = write('mirror\\suite.cy.js', fs.readFileSync(original, 'utf8'));
  const production = write(`repo\\${component}\\Widget.js`, [
    "import { asyncValue } from './async.js';", "import { promiseValue } from './promise.js';",
    "import { syncValue } from './sync.js';", 'export const value = asyncValue + promiseValue + syncValue;',
  ].join('\n'));
  const readers = {
    async: write(`repo\\${component}\\async.js`, 'export const asyncValue = 1;'),
    promise: write(`repo\\${component}\\promise.js`, 'export const promiseValue = 2;'),
    sync: write(`repo\\${component}\\sync.js`, 'export const syncValue = 3;'),
  };
  const calls = { async: 0, promise: 0, sync: 0 };
  const before = {
    apply(compiler) {
      compiler.hooks.compilation.tap('ExistingReader', compilation => {
        webpack.NormalModule.getCompilationHooks(compilation).readResource.for(undefined)
          .tapAsync({ name: 'ExistingReader', stage: -1000 }, (context, callback) => {
            if (key(context.resourcePath) !== key(readers.async)) return callback();
            calls.async++;
            context.addDependency(context.resourcePath);
            callback(null, fs.readFileSync(readers.async));
          });
      });
    },
  };
  const after = {
    apply(compiler) {
      compiler.hooks.compilation.tap('LaterReaders', compilation => {
        const hook = webpack.NormalModule.getCompilationHooks(compilation).readResource.for(undefined);
        hook.tapPromise({ name: 'PromiseReader', stage: -900 }, context => {
          if (key(context.resourcePath) !== key(readers.promise)) return Promise.resolve(undefined);
          calls.promise++;
          context.addDependency(context.resourcePath);
          return Promise.resolve(fs.readFileSync(readers.promise, 'utf8'));
        });
        hook.tap({ name: 'SyncReader', stage: -800 }, context => {
          if (key(context.resourcePath) !== key(readers.sync)) return undefined;
          calls.sync++;
          context.addDependency(context.resourcePath);
          return fs.readFileSync(readers.sync);
        });
      });
    },
  };
  const entry = { original, mirror, kind: 'spec', sha256: hash(original) };
  const mapping = {
    originals: new Map([[key(original), entry]]), mirrors: new Map([[key(mirror), entry]]),
    manifest: {
      productionDependencies: [path.relative(repo, production)],
      edges: [{ importer: path.relative(repo, original), request: './Widget.js',
        resolved: path.relative(repo, production), typeOnly: false }],
    },
  };
  const job = {
    repo, packageRoot: mirrorRoot, artifacts, specs: [mirror], sourceSpecs: [original],
    productionAnchors: [{ source: path.relative(repo, production), reason: 'Fixture implementation' }],
  };
  const plugin = new MirrorModulesPlugin(job, mapping, attachSeal(job, [original, production, ...Object.values(readers)]));
  const stats = await compile({
    mode: 'development', context: path.dirname(original), entry: mirror, plugins: [before, plugin, after],
    output: { path: path.join(artifacts, 'webpack') },
  });
  assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true }));
  assert.deepEqual(calls, { async: 1, promise: 1, sync: 1 });
  const audit = plugin.persist(true);
  assert.equal(audit.passed, true);
  assert.equal(audit.actualRawResourceBytesObserved, true);
  assert.equal(audit.rawResourceBytesMatchSeal, true);
  assert.ok(plugin.rawReads.has(key(mirror)));
  assert.ok(plugin.rawReads.has(key(production)));
  for (const resource of Object.values(readers)) assert.equal(plugin.rawReads.get(key(resource)).count, 1);
});

test('execution receipt requires every selected spec exactly once with real passing outcomes', () => {
  const repo = findRepo();
  const card = inventory(repo).find(job => job.package === 'card' && job.specs.length === 2);
  const run = (spec, states = ['passed']) => ({
    spec: { absolute: spec }, tests: states.map(state => ({ state })),
    stats: {
      tests: states.length, passes: states.filter(state => state === 'passed').length,
      failures: states.filter(state => state === 'failed').length, pending: states.filter(state => state === 'pending').length,
      skipped: states.filter(state => state === 'skipped').length,
    },
  });
  const result = runs => ({
    runs,
    ...Object.fromEntries([
      ['totalTests', 'tests'], ['totalPassed', 'passes'], ['totalFailed', 'failures'],
      ['totalPending', 'pending'], ['totalSkipped', 'skipped'],
    ].map(([total, field]) => [total, runs.reduce((sum, current) => sum + current.stats[field], 0)])),
  });
  assert.equal(validateResults(card, result([
    run(card.specs[0], ['passed', ...Array(9).fill('pending')]), run(card.specs[1]),
  ])).passed, true);
  const omitted = validateResults(card, result([run(card.specs[0])]));
  assert.equal(omitted.passed, false);
  assert.deepEqual(omitted.missingSpecs, [card.specs[1]]);
  assert.equal(validateResults(card, result([
    run(card.specs[0]), run(card.specs[0]), run(card.specs[1]),
  ])).passed, false);
  assert.equal(validateResults(card, result([
    run(card.specs[0], ['pending']), run(card.specs[1], ['pending']),
  ])).passed, false);
  assert.equal(validateResults(card, result([
    run(card.specs[0]), run(card.specs[1], ['pending']),
  ])).passed, false);
  assert.equal(validateResults(card, result([
    run(card.specs[0]), run(card.specs[1], []),
  ])).passed, false);
  assert.equal(validateResults(card, result([
    run(card.specs[0]), run(card.sourceSpecs[1]),
  ])).passed, false);
});
