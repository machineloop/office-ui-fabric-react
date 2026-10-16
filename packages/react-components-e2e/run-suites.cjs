'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');

const packageRoot = __dirname;
const key = value => path.normalize(value).replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
const portable = value => value.replace(/[\\/]/g, path.sep);
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const inside = (root, file) => key(file) === key(root) || key(file).startsWith(`${key(root)}/`);
const installedDependency = file => /(?:^|[\\/])node_modules(?:[\\/]|$)/i.test(file);
const originalComponentSource = (repo, file) => inside(path.join(repo, 'packages', 'react-components'), file) &&
  !installedDependency(file);
const baselineContracts = {
  'packages/react-components/react-card/library/src/components/Card/Card.functional.styles.cy.tsx': {
    kind: 'support-only-primary', sourceSha256: '66b38e8bd66b13d518807d865cc4d1c5df389604205ee1bc0bf470869ea75f74',
    config: 'packages/react-components/react-card/library/cypress.config.ts',
    cwd: 'packages/react-components/react-card/library', expectedCases: [],
    consumers: [{
      ownerJob: 'packages/react-components/react-card/library/src/components/Card/Card.cy.tsx',
      specSource: 'packages/react-components/react-card/library/src/components/Card/Card.functional.cy.tsx',
      specSha256: '729136e83b056dadef8f7b1be6a8ff6f8c9c471e23d7b2f69bbba5f2572612ac',
    }],
  },
  'packages/react-components/react-tags/library/src/components/Tag/Tag.cy.styles.cy.tsx': {
    kind: 'support-only-primary', sourceSha256: '7badcd3a9bdaaf8c4b829e903fc589cc351a69fb931573dee2430771f15b5e4f',
    config: 'packages/react-components/react-tags/library/cypress.config.ts',
    cwd: 'packages/react-components/react-tags/library', expectedCases: [],
    consumers: [{
      ownerJob: 'packages/react-components/react-tags/library/src/components/Tag/Tag.cy.tsx',
      specSource: 'packages/react-components/react-tags/library/src/components/Tag/Tag.cy.tsx',
      specSha256: 'd55a68116e71e9d28f5cd28951554279002355815b5e3401043461a3e6d711f4',
    }],
  },
  'packages/react-components/react-headless-components-preview/library/src/components/SwatchPicker/SwatchPicker.cy.tsx': {
    kind: 'baseline-pending', sourceSha256: '75400fea4f089950766700461c5592323c46cae11ed1c73b822fabb75ffb7b1e',
    config: 'packages/react-components/react-headless-components-preview/library/cypress.config.ts',
    cwd: 'packages/react-components/react-headless-components-preview/library',
    expectedCases: [{ title: ['SwatchPicker', 'moves focus through a grid with arrow keys and wraps'], state: 'pending' }],
    consumers: [],
  },
};

function baselineContract(job) {
  const contract = job.baselineExpectation;
  if (!contract) return null;
  const identity = job.id.replace(/\\/g, '/');
  const allowed = baselineContracts[identity];
  const samePath = (left, right) => key(confined(job.repo, left)) === key(confined(job.repo, right));
  if (!allowed || contract.version !== 1 || contract.kind !== allowed.kind ||
    contract.sourceSha256 !== allowed.sourceSha256 || !contract.reason ||
    !samePath(contract.source, identity) || !samePath(contract.config, allowed.config) ||
    !samePath(contract.cwd, allowed.cwd) || key(job.config) !== key(confined(job.repo, allowed.config)) ||
    key(job.cwd) !== key(confined(job.repo, allowed.cwd)) || job.entries.length !== 1 || job.specs.length !== 1 ||
    !samePath(job.entries[0].source, identity) || job.entries[0].sha256 !== allowed.sourceSha256 ||
    hash(confined(job.repo, identity)) !== allowed.sourceSha256 || hash(job.specs[0]) !== allowed.sourceSha256 ||
    contract.configSha256 !== '40d144427b2fb38821ecec0878256a6d17e8b65c4e455ff1a187d1fd7e160aff' ||
    hash(job.config) !== contract.configSha256 ||
    JSON.stringify(contract.expectedCases) !== JSON.stringify(allowed.expectedCases) ||
    JSON.stringify(contract.consumers) !== JSON.stringify(allowed.consumers)) {
    throw new Error(`Unapproved or changed exact baseline contract: ${job.id}`);
  }
  return contract;
}

function findRepo(start = packageRoot) {
  for (let directory = start; ; directory = path.dirname(directory)) {
    if (fs.existsSync(path.join(directory, 'nx.json')) && fs.existsSync(path.join(directory, 'package.json'))) {
      return directory;
    }
    if (path.dirname(directory) === directory) throw new Error(`Cannot find Nx repository above ${start}`);
  }
}

function confined(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(portable(relative))) {
    throw new Error(`Expected a relative manifest path: ${relative}`);
  }
  const file = path.resolve(root, portable(relative));
  if (!inside(root, file) || key(root) === key(file)) throw new Error(`Manifest path escapes its root: ${relative}`);
  return file;
}

function outsideRepo(repo, directory) {
  const resolved = path.resolve(directory);
  let ancestor = resolved;
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const real = path.resolve(fs.realpathSync(ancestor), path.relative(ancestor, resolved));
  if (inside(repo, resolved) || inside(fs.realpathSync(repo), real)) {
    throw new Error(`Artifacts must be outside the repository: ${directory}`);
  }
  return resolved;
}

function loadSupport(repo, manifestFile = path.join(packageRoot, 'support-manifest.json'), verify = true, mirrorRoot = packageRoot) {
  const manifest = readJson(manifestFile);
  if (!Array.isArray(manifest.files)) throw new Error('support-manifest.json must contain a files array');
  const originals = new Map();
  const mirrors = new Map();
  for (const entry of manifest.files) {
    if (entry.kind === 'production') throw new Error(`Production must not be copied: ${entry.source}`);
    if (!['spec', 'support', 'config'].includes(entry.kind)) throw new Error(`Unknown support kind: ${entry.kind}`);
    const original = confined(repo, entry.source);
    const mirror = confined(mirrorRoot, entry.destination);
    if (inside(mirrorRoot, original)) throw new Error(`Support source is already inside the mirror: ${entry.source}`);
    if (originals.has(key(original)) || mirrors.has(key(mirror))) {
      throw new Error(`Duplicate support mapping: ${entry.source} -> ${entry.destination}`);
    }
    if (!/^[a-f0-9]{64}$/i.test(entry.sha256 || '')) throw new Error(`Missing support hash: ${entry.source}`);
    if (verify && (hash(original) !== entry.sha256 || hash(mirror) !== entry.sha256)) {
      throw new Error(`Support bytes differ from the manifest: ${entry.source} -> ${entry.destination}`);
    }
    const mapped = { ...entry, original, mirror };
    originals.set(key(original), mapped);
    mirrors.set(key(mirror), mapped);
  }
  for (const dependency of manifest.productionDependencies || []) {
    const original = confined(repo, dependency);
    if (originals.has(key(original))) throw new Error(`Declared production dependency must not be copied: ${dependency}`);
  }
  return { manifest, originals, mirrors };
}

function productionFiles(repo) {
  const result = spawnSync('git', [
    '-C', repo, 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'packages/react-components',
  ], { encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Cannot enumerate original production inputs: ${result.error?.message || result.stderr}`);
  return [...new Set(result.stdout.split('\0').filter(Boolean))].filter(file => !installedDependency(file)).sort();
}

function sealProduction(repo, files = productionFiles(repo)) {
  const root = path.join(repo, 'packages', 'react-components');
  const external = path.join(repo, 'node_modules');
  return {
    version: 1, createdAt: new Date().toISOString(),
    scope: 'All Git-tracked and nonignored untracked original react-components files, including tracked ignored files, plus explicit external target anchors',
    files: [...new Set(files)].map(relative => {
      const file = confined(repo, relative);
      if (!inside(root, file) && !inside(external, file)) throw new Error(`Production seal path is outside original production roots: ${relative}`);
      return { file: path.relative(repo, file), sha256: fs.existsSync(file) ? hash(file) : null };
    }),
  };
}

function productionBaseline(repo, seal) {
  if (seal?.version !== 1 || !Array.isArray(seal.files) || !seal.files.length) throw new Error('Missing pre-config production seal');
  const result = new Map();
  const root = path.join(repo, 'packages', 'react-components');
  const external = path.join(repo, 'node_modules');
  for (const entry of seal.files) {
    const file = confined(repo, entry.file);
    if ((!inside(root, file) && !inside(external, file)) || result.has(key(file)) ||
      (entry.sha256 !== null && !/^[a-f0-9]{64}$/.test(entry.sha256 || ''))) {
      throw new Error(`Invalid production seal entry: ${entry.file}`);
    }
    result.set(key(file), { file, sha256: entry.sha256 });
  }
  return result;
}

function verifyProduction(repo, seal, checkInventory = true) {
  const baseline = productionBaseline(repo, seal);
  const changed = [...baseline.values()].filter(entry => {
    const current = fs.existsSync(entry.file) ? hash(entry.file) : null;
    return current !== entry.sha256;
  }).map(entry => entry.file);
  const added = checkInventory ? productionFiles(repo).map(file => confined(repo, file))
    .filter(file => !baseline.has(key(file))) : [];
  return { passed: changed.length === 0 && added.length === 0, sealedFiles: baseline.size, changed, added };
}

function expectedProduction(job, mapping) {
  const { repo } = job;
  if (typeof repo !== 'string' || !repo) throw new Error('Production expectations require an explicit job.repo');
  const manifest = mapping.manifest || {};
  const production = new Set((manifest.productionDependencies || []).map(file => key(confined(repo, file))));
  const runtimeFile = file => !/(?:\.d\.[cm]?ts|\.types\.[cm]?[jt]sx?)$/i.test(file);
  const edges = new Map();
  for (const edge of manifest.edges || []) {
    const importer = key(confined(repo, edge.importer));
    if (!edges.has(importer)) edges.set(importer, []);
    edges.get(importer).push(edge);
  }
  const pending = job.sourceSpecs || job.specs.map(spec => mapping.mirrors.get(key(spec))?.original).filter(Boolean);
  const queue = [...pending];
  const visited = new Set();
  const expected = new Map();
  while (queue.length) {
    const importer = queue.pop();
    if (visited.has(key(importer))) continue;
    visited.add(key(importer));
    for (const edge of edges.get(key(importer)) || []) {
      if (edge.typeOnly || !edge.resolved || !runtimeFile(edge.resolved)) continue;
      const resource = confined(repo, edge.resolved);
      const mapped = mapping.originals.get(key(resource));
      if (mapped && ['spec', 'support'].includes(mapped.kind)) queue.push(resource);
      else if (production.has(key(resource))) {
        expected.set(key(resource), { resource, importer, request: edge.request, reason: 'static runtime support closure' });
      }
    }
  }
  for (const injected of job.injectedProductionDependencies || []) {
    const resource = confined(repo, injected.source);
    if (!production.has(key(resource)) || !runtimeFile(resource) || !injected.reason) {
      throw new Error(`Invalid loader-injected production contract: ${JSON.stringify(injected)}`);
    }
    expected.set(key(resource), { resource, reason: injected.reason });
  }
  return [...expected.values()];
}

function targetProduction(job, mapping) {
  const seen = new Set();
  return (job.productionAnchors || []).map(anchor => {
    const resource = confined(job.repo, anchor.source);
    if (!anchor.reason || mapping.originals.has(key(resource)) || /\.d\.[cm]?ts$|\.types\.[cm]?[jt]sx?$/i.test(resource) ||
      !fs.existsSync(resource) || seen.has(key(resource))) {
      throw new Error(`Invalid component-under-test production anchor for ${job.id}: ${JSON.stringify(anchor)}`);
    }
    seen.add(key(resource));
    return { resource, reason: anchor.reason };
  });
}

function prepareJobs(selected, repo, support) {
  return selected.map(originalJob => {
    const job = { ...originalJob, repo };
    job.verifiedBaselineExpectation = baselineContract(job);
    job.expectedProduction = expectedProduction(job, support);
    if (!job.expectedProduction.length) throw new Error(`No statically expected runtime production for ${job.id}`);
    job.targetProductionAnchors = targetProduction(job, support);
    if (!job.targetProductionAnchors.length && job.verifiedBaselineExpectation?.kind !== 'support-only-primary') {
      throw new Error(`No component-under-test production anchors for ${job.id}`);
    }
    if (job.verifiedBaselineExpectation?.kind === 'support-only-primary') {
      if (job.targetProductionAnchors.length) throw new Error(`Support-only primary must not claim component anchors: ${job.id}`);
      for (const consumer of job.verifiedBaselineExpectation.consumers) {
        const source = confined(repo, consumer.specSource);
        const mapped = support.originals.get(key(source));
        const imported = support.manifest.edges.some(edge => !edge.typeOnly &&
          key(confined(repo, edge.importer)) === key(source) && edge.resolved &&
          key(confined(repo, edge.resolved)) === key(confined(repo, job.verifiedBaselineExpectation.source)));
        if (!mapped || mapped.sha256 !== consumer.specSha256 || !imported) {
          throw new Error(`Unverified declared support-primary consumer: ${job.id}`);
        }
      }
    }
    for (const entry of job.entries) {
      const mapped = support.originals.get(key(confined(repo, entry.source)));
      if (!mapped || key(mapped.mirror) !== key(confined(packageRoot, entry.destination)) || mapped.sha256 !== entry.sha256) {
        throw new Error(`Primary spec is absent or inconsistent in support-manifest.json: ${entry.source}`);
      }
    }
    if (!fs.existsSync(job.config) || !fs.existsSync(job.cwd)) throw new Error(`Missing original config/cwd: ${job.id}`);
    return job;
  });
}

function sealJobs(repo, prepared) {
  const externalAnchors = prepared.flatMap(job => job.targetProductionAnchors)
    .map(anchor => anchor.resource).filter(file => !originalComponentSource(repo, file));
  return sealProduction(repo, [
    ...productionFiles(repo), ...externalAnchors.map(file => path.relative(repo, file)),
  ]);
}

function validateResults(job, result) {
  const baseline = baselineContract(job);
  const expected = new Map(job.specs.map(spec => [key(spec), spec]));
  const seen = new Map();
  const issues = [];
  const runs = [];
  const totals = { tests: 0, passes: 0, failures: 0, pending: 0, skipped: 0 };
  if (!Array.isArray(result.runs)) issues.push('Missing Cypress runs array');
  for (const run of result.runs || []) {
    const absolute = run.spec?.absolute;
    const validPath = typeof absolute === 'string' && path.isAbsolute(portable(absolute));
    const spec = validPath ? path.normalize(portable(absolute)) : '';
    if (!validPath) issues.push('Run is missing its absolute spec identity');
    else seen.set(key(spec), (seen.get(key(spec)) || 0) + 1);
    const stats = run.stats || {};
    const tests = Array.isArray(run.tests) ? run.tests : [];
    const states = { passed: 0, failed: 0, pending: 0, skipped: 0 };
    for (const test of tests) {
      if (!(test.state in states)) issues.push(`Unknown test state in ${spec}: ${test.state}`);
      else states[test.state]++;
    }
    for (const field of Object.keys(totals)) {
      if (!Number.isInteger(stats[field]) || stats[field] < 0) issues.push(`Invalid ${field} count in ${spec}`);
      else totals[field] += stats[field];
    }
    if (!baseline && (!tests.length || states.passed === 0 || !(stats.passes > 0))) {
      issues.push(`Spec has no real passing outcomes: ${spec}`);
    }
    if (baseline && JSON.stringify(tests.map(test => ({ title: test.title, state: test.state }))) !==
      JSON.stringify(baseline.expectedCases)) issues.push(`Exact baseline case titles/states changed: ${spec}`);
    if (stats.tests !== tests.length || stats.passes !== states.passed || stats.failures !== states.failed ||
      stats.pending !== states.pending || stats.skipped !== states.skipped) {
      issues.push(`Per-spec stats disagree with test outcomes: ${spec}`);
    }
    if (run.error || states.failed > 0) issues.push(`Spec failed: ${spec}`);
    runs.push({ spec, ...states, tests: tests.length });
  }
  const missingSpecs = [...expected].filter(([file]) => !seen.has(file)).map(([, spec]) => spec);
  const unexpectedSpecs = [...seen].filter(([file]) => !expected.has(file)).map(([file]) => file);
  const duplicateSpecs = [...seen].filter(([, count]) => count !== 1).map(([file, count]) => ({ spec: file, count }));
  for (const [field, total] of [
    ['tests', 'totalTests'], ['passes', 'totalPassed'], ['failures', 'totalFailed'],
    ['pending', 'totalPending'], ['skipped', 'totalSkipped'],
  ]) {
    if (result[total] !== totals[field]) issues.push(`Aggregate ${total} disagrees with per-spec runs`);
  }
  if ((!baseline && !(result.totalPassed > 0)) || result.totalFailed !== 0) {
    issues.push('Job must have passing tests and zero failures');
  }
  return {
    passed: !issues.length && !missingSpecs.length && !unexpectedSpecs.length && !duplicateSpecs.length,
    expectedSpecs: [...expected.values()], executedSpecs: [...seen.keys()],
    missingSpecs, unexpectedSpecs, duplicateSpecs, issues, runs,
    expectedState: baseline?.kind === 'support-only-primary' ? 'SUPPORT_ONLY' :
      baseline?.kind === 'baseline-pending' ? 'BASELINE_PENDING' : 'PASSED',
    baselineExpectation: baseline, realPassingTests: result.totalPassed || 0,
  };
}

function supportOnlyRuntimeReceipt(job, results) {
  const contract = baselineContract(job);
  if (contract?.kind !== 'support-only-primary' || !validateResults(job, results).passed) {
    throw new Error(`No approved zero-test runtime receipt contract: ${job.id}`);
  }
  return {
    passed: true, inputs: [], runtimeInputReads: [],
    origin: 'exact-verified-zero-test-support-primary', baselineExpectation: contract,
  };
}

function validateHelperConsumer(job, owner, evidence) {
  const contract = baselineContract(job);
  const consumer = contract?.consumers.find(item => item.ownerJob === owner.id);
  const issues = [];
  if (contract?.kind !== 'support-only-primary' || !consumer) issues.push('No exact declared owner consumer');
  if (evidence.job?.id !== owner.id || key(evidence.job?.config || '') !== key(owner.config)) {
    issues.push('Owner job/config identity changed');
  }
  const recorded = evidence.job?.entries || [];
  if (recorded.length !== owner.entries.length || owner.entries.some(entry => !recorded.some(old =>
    key(confined(job.repo, old.source)) === key(confined(job.repo, entry.source)) && old.sha256 === entry.sha256))) {
    issues.push('Owner primary hashes changed');
  }
  const execution = validateResults(owner, evidence.results);
  if (!execution.passed || evidence.results.totalPassed <= 0) issues.push('Owner authored outcomes are not strictly passing');
  const helper = evidence.webpack?.resources?.find(entry => key(entry.resource) === key(job.specs[0]));
  if (!evidence.webpack?.assertions?.passed || !evidence.webpack.assertions.actualRawResourceBytesObserved ||
    !evidence.webpack.assertions.rawResourceBytesMatchSeal || !evidence.webpack.assertions.targetProductionObserved ||
    helper?.classification !== 'mirrored-test-support' || helper.sha256 !== contract?.sourceSha256 ||
    helper.observedSha256 !== contract?.sourceSha256 || !(helper.rawReadCount > 0) ||
    !helper.observedRawSha256?.length || helper.observedRawSha256.some(value => value !== contract?.sourceSha256)) {
    issues.push('Owner did not compile the exact mirrored helper bytes with target/source proofs');
  }
  if (!evidence.runtime?.passed) issues.push('Owner runtime-input audit is missing or failed');
  return {
    passed: issues.length === 0, issues, ownerJob: owner.id, consumer, helper: job.specs[0],
    sourceSha256: contract?.sourceSha256, ownerCounts: {
      tests: evidence.results.totalTests, passed: evidence.results.totalPassed, pending: evidence.results.totalPending,
    },
  };
}

function verifyBaselineRun(repo, support, root) {
  root = outsideRepo(repo, root);
  const state = readJson(path.join(root, 'timing-results.json'));
  if (!state.productionAudit?.passed || state.changedInputs?.length !== 0) {
    throw new Error('Baseline owner run does not have unchanged original/input proofs');
  }
  const inputs = new Map(readJson(path.join(root, 'input-hashes.json')).map(entry => [key(entry.file), entry.sha256]));
  for (const entry of support.originals.values()) {
    if (inputs.get(key(entry.original)) !== entry.sha256 || inputs.get(key(entry.mirror)) !== entry.sha256) {
      throw new Error(`Baseline spec/support/config input differs: ${entry.source}`);
    }
  }
  const production = verifyProduction(repo, readJson(path.join(root, 'production-seal.json')));
  if (!production.passed) throw new Error(`Baseline original production differs: ${JSON.stringify(production)}`);
  return { root, jobs: state.jobs, production, unchangedMappedInputs: support.originals.size * 2 };
}

function createExecutionInventory(source, repo, sourceHash) {
  const relative = value => {
    const result = path.isAbsolute(portable(value)) ? path.relative(portable(source.repo || repo), portable(value)) : portable(value);
    confined(repo, result);
    return result.replace(/\\/g, '/');
  };
  return {
    version: 1, sourceInventorySha256: sourceHash, jobCount: source.jobs.length,
    uniquePrimarySpecs: new Set(source.jobs.flatMap(job => job.specs.map(relative))).size,
    jobs: source.jobs.map(job => ({
      id: relative(job.specs[0]), name: relative(job.name), config: relative(job.config), cwd: relative(job.cwd),
      group: relative(job.group || job.cwd), specs: job.specs.map(relative),
      configEnv: job.configEnv || {}, nxProject: job.nxProject, nxTarget: job.nxTarget,
      ...(job.nxTargetReason ? { nxTargetReason: job.nxTargetReason } : {}),
      ...(job.productionAnchors ? {
        productionAnchors: job.productionAnchors.map(anchor => ({ ...anchor, source: relative(anchor.source) })),
      } : {}),
      ...(job.injectedProductionDependencies ? {
        injectedProductionDependencies: job.injectedProductionDependencies
          .map(dependency => ({ ...dependency, source: relative(dependency.source) })),
      } : {}),
      ...(job.baselineExpectation ? { baselineExpectation: JSON.parse(JSON.stringify(job.baselineExpectation)) } : {}),
    })),
  };
}

function inventory(repo, manifest = readJson(path.join(packageRoot, 'manifest.json')),
  execution = readJson(path.join(packageRoot, 'execution-manifest.json'))) {
  if (!Array.isArray(manifest.specs) || !manifest.specs.length) throw new Error('No specs in manifest.json');
  if (!Array.isArray(execution.jobs) || execution.jobCount !== execution.jobs.length) {
    throw new Error('Invalid local execution-manifest.json job inventory');
  }
  const primary = new Map(manifest.specs.map(entry => [key(confined(repo, entry.source)), entry]));
  if (primary.size !== manifest.specs.length) throw new Error('Duplicate primary spec mapping');
  const seen = new Set();
  const ids = new Set();
  const jobs = execution.jobs.map((record, index) => {
    if (ids.has(record.id)) throw new Error(`Duplicate execution job ID: ${record.id}`);
    ids.add(record.id);
    const config = confined(repo, record.config);
    const cwd = confined(repo, record.cwd);
    const sourceSpecs = record.specs.map(spec => confined(repo, spec));
    if (!sourceSpecs.length) throw new Error(`Empty execution job: ${record.id}`);
    const entries = sourceSpecs.map(original => {
      const entry = primary.get(key(original));
      if (!entry || seen.has(key(original))) throw new Error(`Missing or duplicate execution spec: ${original}`);
      if (key(confined(repo, entry.originalConfig)) !== key(config) ||
        key(confined(repo, entry.originalWorkingDirectory)) !== key(cwd)) {
        throw new Error(`Execution inventory disagrees with primary config/cwd: ${original}`);
      }
      seen.add(key(original));
      return entry;
    });
    const parts = portable(entries[0].destination).split(path.sep);
    return {
      ...record, index, config, cwd, group: key(confined(repo, record.group || record.cwd)),
      package: parts[0] === 'deprecated' ? parts.slice(0, 2).join('/') : parts[0],
      sourceSpecs, entries, specs: entries.map(entry => confined(packageRoot, entry.destination)),
    };
  });
  if (seen.size !== primary.size || execution.uniquePrimarySpecs !== primary.size) {
    throw new Error('Local execution inventory must include every primary manifest spec exactly once');
  }
  return jobs;
}

function options(argv, env = process.env) {
  const result = {
    workers: Number(env.MIRROR_E2E_WORKERS || 8), node: env.MIRROR_E2E_NODE || process.execPath,
    artifacts: env.MIRROR_E2E_OUTPUT_ROOT || env.MIRROR_E2E_ARTIFACTS, browser: env.MIRROR_E2E_BROWSER || 'chrome',
    port: Number(env.MIRROR_E2E_PORT || 30000), timeout: Number(env.MIRROR_E2E_TIMEOUT || 1200),
    baselineRun: env.MIRROR_E2E_BASELINE_RUN,
    specs: [], packages: [], list: false, help: false,
  };
  const values = new Map([
    ['workers', 'workers'], ['node', 'node'], ['artifacts', 'artifacts'], ['output-root', 'artifacts'], ['browser', 'browser'],
    ['port', 'port'], ['timeout', 'timeout'], ['spec', 'specs'], ['package', 'packages'],
    ['baseline-run', 'baselineRun'],
  ]);
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--') continue;
    if (argument === '--list' || argument === '--help') {
      result[argument.slice(2)] = true;
      continue;
    }
    const match = /^--([^=]+)(?:=(.*))?$/.exec(argument);
    if (!match || !values.has(match[1])) throw new Error(`Unknown argument: ${argument}`);
    const value = match[2] === undefined ? argv[++index] : match[2];
    if (value === undefined || value === '' || value.startsWith('--')) throw new Error(`Missing value for --${match[1]}`);
    const field = values.get(match[1]);
    if (Array.isArray(result[field])) result[field].push(value);
    else result[field] = ['workers', 'port', 'timeout'].includes(field) ? Number(value) : value;
  }
  if (!Number.isInteger(result.workers) || result.workers < 1 || result.workers > 32) {
    throw new Error('Workers must be an integer between 1 and 32');
  }
  if (!Number.isInteger(result.port) || result.port < 1024 || result.port > 65000) throw new Error('Invalid base port');
  if (!Number.isInteger(result.timeout) || result.timeout < 1) throw new Error('Timeout must be positive seconds');
  return result;
}

function selectJobs(jobs, selected, repo) {
  const matches = new Set();
  for (const spec of selected.specs) {
    const candidates = [path.resolve(repo, portable(spec)), path.resolve(packageRoot, portable(spec))].map(key);
    const found = jobs.filter(job => [...job.specs, ...job.sourceSpecs].some(file => candidates.includes(key(file))));
    if (found.length !== 1) throw new Error(`--spec must identify exactly one full spec path, not a display name: ${spec}`);
    matches.add(found[0]);
  }
  for (const selector of selected.packages) {
    const normalized = selector.replace(/\\/g, '/').replace(/\/$/, '');
    const found = jobs.filter(job => {
      const sourcePackage = job.entries[0].source.replace(/\\/g, '/').split('/').slice(
        0, job.package.startsWith('deprecated/') ? 4 : 3,
      ).join('/');
      return [
        job.package, sourcePackage, sourcePackage.replace(/^packages\/react-components\//, ''),
        `packages/react-components-e2e/${job.package}`,
      ].includes(normalized);
    });
    if (!found.length) throw new Error(`Unknown exact package selector: ${selector}`);
    found.forEach(job => matches.add(job));
  }
  return selected.specs.length || selected.packages.length ? jobs.filter(job => matches.has(job)) : jobs;
}

function defaultArtifacts(repo, manifest) {
  if (process.env.COPILOT_SESSION_DIR || process.env.SCOUT_SESSION_DIR) {
    return path.join(process.env.COPILOT_SESSION_DIR || process.env.SCOUT_SESSION_DIR, 'files', 'mirrored-validation');
  }
  if (manifest.sourceManifest) {
    let directory = path.dirname(path.resolve(repo, portable(manifest.sourceManifest)));
    while (path.dirname(directory) !== directory) {
      if (path.basename(directory) === 'files') return path.join(directory, 'mirrored-validation');
      directory = path.dirname(directory);
    }
  }
  return path.join(os.homedir(), '.scout', 'mirrored-validation');
}

function assertNode22(executable) {
  const check = spawnSync(executable, ['-p', 'process.versions.node'], { encoding: 'utf8', windowsHide: true });
  if (check.error || check.status !== 0 || !/^22\./.test(check.stdout.trim())) {
    throw new Error('Use supported Node 22: set MIRROR_E2E_NODE or pass --node=<node executable>');
  }
  return check.stdout.trim();
}

function terminate(child, log, record) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    const command = `$all = Get-CimInstance Win32_Process; function StopOwned([int]$root) { foreach ($p in $all | Where-Object ParentProcessId -eq $root) { StopOwned $p.ProcessId }; Stop-Process -Id $root -Force -ErrorAction SilentlyContinue }; StopOwned ${child.pid}`;
    const killer = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      stdio: ['ignore', log, log], windowsHide: true,
    });
    killer.on('error', error => { record.terminationError = error.message; });
  } else {
    child.kill('SIGTERM');
  }
}

async function run(selected, repo, manifest, parsed) {
  const supportFile = path.join(packageRoot, 'support-manifest.json');
  const support = loadSupport(repo, supportFile);
  const prepared = prepareJobs(selected, repo, support);
  const allJobs = prepareJobs(inventory(repo, manifest), repo, support);
  const selectedIds = new Set(prepared.map(job => job.id));
  for (const job of prepared) {
    if (job.verifiedBaselineExpectation?.kind !== 'support-only-primary') continue;
    if (job.verifiedBaselineExpectation.consumers.some(consumer => !selectedIds.has(consumer.ownerJob)) && !parsed.baselineRun) {
      throw new Error(`Support-only primary requires its owner job or --baseline-run=<unchanged verified run>: ${job.id}`);
    }
  }
  const baselineReference = parsed.baselineRun ? verifyBaselineRun(repo, support, parsed.baselineRun) : null;
  const productionSeal = sealJobs(repo, prepared);
  const version = assertNode22(parsed.node);
  const output = outsideRepo(repo, parsed.artifacts || defaultArtifacts(repo, manifest));
  fs.mkdirSync(output, { recursive: true });
  const runRoot = path.join(output, `execution-${Date.now()}-${process.pid}`);
  fs.mkdirSync(runRoot);
  const sealFile = path.join(runRoot, 'production-seal.json');
  writeJson(sealFile, productionSeal);
  const sealHash = hash(sealFile);
  for (const file of ['manifest.json', 'execution-manifest.json', 'support-manifest.json', 'run-suites.cjs', 'cypress.config.cjs']) {
    fs.copyFileSync(path.join(packageRoot, file), path.join(runRoot, file));
  }
  const report = path.join(runRoot, 'timing-results.json');
  const state = {
    status: 'RUNNING', startedAt: new Date().toISOString(), node: parsed.node, nodeVersion: version,
    mode: 'Nx repository-local harness; direct isolated Cypress children, original config/cwd preserved',
    requestedBrowser: parsed.browser, maximumWorkers: parsed.workers, peakWorkers: 0,
    inventoryJobs: inventory(repo, manifest).length, selectedJobs: selected.length,
    selectedSpecs: selected.reduce((count, job) => count + job.specs.length, 0),
    active: 0, completed: 0, jobs: [],
    productionSeal: { file: sealFile, sha256: sealHash, sealedFiles: productionSeal.files.length },
    baselineReference: baselineReference ? {
      root: baselineReference.root, production: baselineReference.production,
      unchangedMappedInputs: baselineReference.unchangedMappedInputs,
    } : undefined,
  };
  const inputs = new Map();
  for (const mapped of support.originals.values()) {
    inputs.set(mapped.original, mapped.sha256);
    inputs.set(mapped.mirror, mapped.sha256);
  }
  for (const job of selected) inputs.set(job.config, hash(job.config));
  for (const file of ['manifest.json', 'execution-manifest.json', 'support-manifest.json', 'run-suites.cjs', 'cypress.config.cjs']) {
    const absolute = path.join(packageRoot, file);
    inputs.set(absolute, hash(absolute));
  }
  inputs.set(sealFile, sealHash);
  writeJson(path.join(runRoot, 'input-hashes.json'), [...inputs].map(([file, sha256]) => ({ file, sha256 })));
  const save = () => writeJson(report, state);
  const groups = new Set();
  const pending = [...prepared];
  console.log(JSON.stringify({ report, jobs: state.selectedJobs, specs: state.selectedSpecs, workers: parsed.workers }));
  save();
  await new Promise(resolve => {
    function schedule() {
      while (state.active < parsed.workers) {
        const next = pending.findIndex(job => !groups.has(job.group));
        if (next === -1) break;
        launch(pending.splice(next, 1)[0]);
      }
      if (!pending.length && !state.active) resolve();
    }
    function launch(job) {
      const artifacts = path.join(runRoot, `job-${String(job.index).padStart(3, '0')}`);
      fs.mkdirSync(artifacts);
      fs.mkdirSync(path.join(artifacts, 'appdata'));
      const description = {
        ...job, repo, packageRoot, artifacts, supportManifest: supportFile, port: parsed.port + job.index,
        productionSeal: sealFile, productionSealSha256: sealHash,
      };
      const jobFile = path.join(artifacts, 'job.json');
      writeJson(jobFile, description);
      const log = path.join(artifacts, 'command.log');
      const fd = fs.openSync(log, 'wx');
      const record = {
        id: job.id, package: job.package, originalConfig: job.config, originalWorkingDirectory: job.cwd,
        nxProject: job.nxProject, nxTarget: job.nxTarget,
        sourceSpecs: job.sourceSpecs, specs: job.specs, port: description.port, artifacts, log,
        startedAt: new Date().toISOString(), status: 'RUNNING',
      };
      state.jobs.push(record);
      state.active++;
      groups.add(job.group);
      state.peakWorkers = Math.max(state.peakWorkers, state.active);
      const child = spawn(parsed.node, [
        path.join(repo, 'node_modules', 'cypress', 'bin', 'cypress'), 'run', '--component', '--headless',
        '--browser', parsed.browser, '--project', job.cwd, '--config-file', path.join(packageRoot, 'cypress.config.cjs'),
      ], {
        cwd: job.cwd, stdio: ['ignore', fd, fd], windowsHide: true,
        env: {
          ...process.env, MIRROR_E2E_JOB: jobFile, WEBPACK_DEV_SERVER_PORT: String(description.port),
          PATH: `${path.dirname(parsed.node)}${path.delimiter}${process.env.PATH || ''}`,
          TS_NODE_COMPILER: path.join(repo, 'node_modules', 'typescript', 'lib', 'typescript.js'),
          NX_DAEMON: 'false', CYPRESS_RETRIES: '0', TAB_PROBES: '',
          FLUENT_RESULTS: path.join(artifacts, 'original-results.json'),
          TAB_EVIDENCE_FILE: path.join(artifacts, 'tab-evidence.json'),
          SECONDARY_RUN_JSON: path.join(artifacts, 'secondary-results.json'),
          APPDATA: path.join(artifacts, 'appdata'),
          XDG_CACHE_HOME: path.join(artifacts, 'xdg-cache'),
          NX_CACHE_DIRECTORY: path.join(artifacts, 'nx-cache'),
          NX_WORKSPACE_DATA_DIRECTORY: path.join(artifacts, 'nx-data'),
          NX_NATIVE_FILE_CACHE_DIRECTORY: path.join(artifacts, 'nx-native'),
        },
      });
      record.pid = child.pid;
      const watchdog = setTimeout(() => {
        record.timedOut = true;
        record.timeoutSeconds = parsed.timeout;
        terminate(child, fd, record);
        save();
      }, parsed.timeout * 1000);
      child.on('error', error => { record.spawnError = error.message; });
      child.on('close', (code, signal) => {
        clearTimeout(watchdog);
        fs.closeSync(fd);
        record.exitCode = code;
        record.signal = signal;
        record.finishedAt = new Date().toISOString();
        record.wallSeconds = (Date.parse(record.finishedAt) - Date.parse(record.startedAt)) / 1000;
        try {
          const result = readJson(path.join(artifacts, 'cypress-results.json'));
          record.resultAvailable = true;
          record.executionAudit = validateResults(job, result);
          writeJson(path.join(artifacts, 'spec-execution.json'), record.executionAudit);
          record.counts = Object.fromEntries(
            ['totalTests', 'totalPassed', 'totalFailed', 'totalPending', 'totalSkipped'].map(name => [name, result[name]]),
          );
          record.audit = readJson(path.join(artifacts, 'webpack-resources.json')).assertions;
          record.runtimeAudit = readJson(path.join(artifacts, 'runtime-inputs.json'));
          record.runtimeInputReads = record.runtimeAudit.runtimeInputReads;
          record.junitReceipts = fs.readdirSync(artifacts).filter(file => /^results-.*\.xml$/.test(file));
        } catch (error) {
          record.receiptError = error.message;
        }
        const accepted = code === 0 && !record.timedOut && record.resultAvailable && record.executionAudit?.passed &&
          record.audit?.passed && record.runtimeAudit?.passed && record.junitReceipts?.length && record.counts.totalFailed === 0;
        record.status = accepted ? record.executionAudit.expectedState : 'FAILED';
        if (record.status === 'SUPPORT_ONLY') record.status = 'SUPPORT_ONLY_AWAITING_CONSUMER';
        state.active--;
        state.completed++;
        groups.delete(job.group);
        save();
        console.log(JSON.stringify({ job: job.id, status: record.status, counts: record.counts, completed: state.completed }));
        schedule();
      });
      save();
    }
    schedule();
  });
  state.changedInputs = [...inputs].filter(([file, sha256]) => !fs.existsSync(file) || hash(file) !== sha256)
    .map(([file]) => file);
  state.productionAudit = verifyProduction(repo, productionSeal);
  writeJson(path.join(runRoot, 'production-audit.json'), state.productionAudit);
  for (const job of prepared) {
    if (job.verifiedBaselineExpectation?.kind !== 'support-only-primary') continue;
    const record = state.jobs.find(entry => entry.id === job.id);
    if (record.status !== 'SUPPORT_ONLY_AWAITING_CONSUMER') continue;
    try {
      const consumers = job.verifiedBaselineExpectation.consumers.map(consumer => {
        const owner = allJobs.find(entry => entry.id === consumer.ownerJob);
        if (!owner?.sourceSpecs.some(spec => key(spec) === key(confined(repo, consumer.specSource)))) {
          throw new Error(`Declared authored owner job is absent: ${consumer.ownerJob}`);
        }
        const current = state.jobs.find(entry => entry.id === owner.id);
        const reference = current || baselineReference?.jobs.find(entry => entry.id === owner.id);
        if (!reference || reference.status !== 'PASSED') throw new Error(`No strictly passing authored owner receipt: ${owner.id}`);
        const artifacts = reference.artifacts;
        return {
          ...validateHelperConsumer(job, owner, {
            job: readJson(path.join(artifacts, 'job.json')),
            results: readJson(path.join(artifacts, 'cypress-results.json')),
            webpack: readJson(path.join(artifacts, 'webpack-resources.json')),
            runtime: readJson(path.join(artifacts, 'runtime-inputs.json')),
          }),
          artifacts, origin: current ? 'current-run-authored-owner' : 'unchanged-baseline-authored-owner',
        };
      });
      record.consumerAudit = { passed: consumers.every(consumer => consumer.passed), consumers };
      record.status = record.consumerAudit.passed ? 'SUPPORT_ONLY' : 'FAILED';
    } catch (error) {
      record.consumerAudit = { passed: false, error: error.message };
      record.status = 'FAILED';
    }
    writeJson(path.join(record.artifacts, 'support-consumers.json'), {
      baselineExpectation: job.verifiedBaselineExpectation, ...record.consumerAudit,
    });
  }
  state.baselineExceptions = state.jobs.filter(job => job.executionAudit?.baselineExpectation).map(job => ({
    id: job.id, status: job.status, baselineExpectation: job.executionAudit.baselineExpectation,
    consumerAudit: job.consumerAudit,
  }));
  state.finishedAt = new Date().toISOString();
  state.executionWallSeconds = (Date.parse(state.finishedAt) - Date.parse(state.startedAt)) / 1000;
  const complete = state.jobs.length === selected.length &&
    state.jobs.every(job => ['PASSED', 'SUPPORT_ONLY', 'BASELINE_PENDING'].includes(job.status)) &&
    state.changedInputs.length === 0 && state.productionAudit.passed;
  state.status = complete ? (state.baselineExceptions.length ? 'PASSED_WITH_BASELINE_EXCEPTIONS' : 'PASSED') : 'FAILED_OR_INCOMPLETE';
  for (const [field, count] of [
    ['tests', 'totalTests'], ['passing', 'totalPassed'], ['failing', 'totalFailed'],
    ['skipped', 'totalSkipped'], ['pending', 'totalPending'],
  ]) state[field] = state.jobs.reduce((sum, job) => sum + (job.counts?.[count] || 0), 0);
  save();
  console.log(JSON.stringify({ ...state, jobs: undefined, report }, null, 2));
  return complete ? 0 : 2;
}

async function main(argv = process.argv.slice(2)) {
  const parsed = options(argv);
  if (parsed.help) {
    console.log('Nx: nx run react-components-e2e:e2e -- --workers=8 --spec=<full spec path> --package=<exact mirror package> --output-root=<outside repo> --node=<Node22> --browser=chrome --port=30000 --timeout=1200 --baseline-run=<unchanged authored-owner receipts, when needed> --list (alias: --artifacts)');
    return 0;
  }
  const repo = findRepo();
  const manifest = readJson(path.join(packageRoot, 'manifest.json'));
  const jobs = selectJobs(inventory(repo, manifest), parsed, repo);
  if (!jobs.length) throw new Error('No jobs selected');
  if (parsed.list) {
    const prepared = prepareJobs(jobs, repo, loadSupport(repo));
    console.log(JSON.stringify(prepared.map(({ id, package: owner, config, cwd, nxProject, nxTarget, sourceSpecs, specs, expectedProduction, targetProductionAnchors, verifiedBaselineExpectation }) => ({
      id, package: owner, config, cwd, nxProject, nxTarget, sourceSpecs, specs, expectedProduction, targetProductionAnchors,
      baselineExpectation: verifiedBaselineExpectation,
    })), null, 2));
    return 0;
  }
  return run(jobs, repo, manifest, parsed);
}

module.exports = {
  packageRoot, key, portable, readJson, hash, writeJson, inside, installedDependency, originalComponentSource, findRepo, confined, outsideRepo,
  loadSupport, baselineContracts, baselineContract, supportOnlyRuntimeReceipt, validateHelperConsumer, verifyBaselineRun,
  productionFiles, sealProduction, productionBaseline,
  verifyProduction, expectedProduction, targetProduction, prepareJobs, sealJobs, validateResults,
  createExecutionInventory, inventory, options, selectJobs, defaultArtifacts, assertNode22, main,
};

if (require.main === module) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}
