'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire, Module } = require('node:module');
const {
  key, hash, readJson, writeJson, inside, installedDependency, originalComponentSource,
  loadSupport, outsideRepo, productionBaseline, expectedProduction, targetProduction,
  baselineContract, supportOnlyRuntimeReceipt,
} = require('./run-suites.cjs');

const resourceFile = resource => typeof resource === 'string' ? resource.split(/[?#]/, 1)[0] : '';
const resourceSuffix = resource => resource.slice(resourceFile(resource).length);

class MirrorModulesPlugin {
  constructor(job, mapping, seal) {
    this.job = job;
    this.mapping = mapping;
    this.resources = new Map();
    this.required = new Map();
    this.routes = new Map();
    this.errors = [];
    this.compilations = 0;
    this.rawReads = new Map();
    this.rawMismatches = new Map();
    this.baseline = productionBaseline(job.repo, seal);
    this.baselineExpectation = baselineContract(job);
    this.expectedProduction = expectedProduction(job, mapping);
    this.targetProduction = targetProduction(job, mapping);
    for (const anchor of this.targetProduction) {
      if (!this.baseline.get(key(anchor.resource))?.sha256) {
        throw new Error(`Target production anchor was not sealed before config loading: ${anchor.resource}`);
      }
    }
  }

  route(original, reason) {
    const file = resourceFile(original);
    const entry = this.mapping.originals.get(key(file));
    if (!entry) return original;
    this.required.set(key(entry.mirror), entry);
    this.routes.set(`${key(entry.original)}|${reason}`, { source: entry.original, destination: entry.mirror, reason });
    return entry.mirror + resourceSuffix(original);
  }

  observeResource(loaderContext, bytes) {
    if (typeof bytes !== 'string' && !Buffer.isBuffer(bytes)) return;
    const resource = resourceFile(loaderContext.resourcePath || loaderContext.resource);
    if (!resource || (!inside(this.job.repo, resource) && !inside(this.job.packageRoot, resource))) return;
    const file = key(resource);
    const observed = crypto.createHash('sha256').update(bytes).digest('hex');
    let read = this.rawReads.get(file);
    if (!read) {
      const mapped = this.mapping.mirrors.get(file);
      const sealed = this.baseline.get(file);
      const expected = mapped?.sha256 || (sealed ? sealed.sha256 : observed);
      read = { resource, expected, observed, hashes: new Set(), count: 0 };
      this.rawReads.set(file, read);
    }
    read.count++;
    read.hashes.add(observed);
    if (observed !== read.expected) {
      if (!this.rawMismatches.has(file)) {
        this.rawMismatches.set(file, { resource, expectedSha256: read.expected, observedSha256: observed });
      }
    }
  }

  instrumentReaders(readResource) {
    const instrumented = new WeakSet();
    const plugin = this;
    const instrument = hook => {
      if (instrumented.has(hook)) return hook;
      instrumented.add(hook);
      hook.intercept({
        register(tap) {
          const original = tap.fn;
          const contextIndex = tap.context ? 1 : 0;
          let fn;
          if (tap.type === 'async') {
            fn = function (...args) {
              const loaderContext = args[contextIndex];
              const callback = args.pop();
              args.push(function (error, bytes, ...rest) {
                if (!error) plugin.observeResource(loaderContext, bytes);
                return callback.call(this, error, bytes, ...rest);
              });
              return original.apply(this, args);
            };
          } else if (tap.type === 'promise') {
            fn = function (...args) {
              const loaderContext = args[contextIndex];
              return original.apply(this, args).then(bytes => {
                plugin.observeResource(loaderContext, bytes);
                return bytes;
              });
            };
          } else {
            fn = function (...args) {
              const bytes = original.apply(this, args);
              plugin.observeResource(args[contextIndex], bytes);
              return bytes;
            };
          }
          return { ...tap, fn };
        },
      });
      return hook;
    };
    readResource.intercept({ factory: (_scheme, hook) => instrument(hook) });
    instrument(readResource.for(undefined));
    instrument(readResource.for('file'));
  }

  apply(compiler) {
    const name = 'MirroredComponentModules';
    compiler.hooks.normalModuleFactory.tap(name, factory => {
      factory.hooks.beforeResolve.tapAsync(name, (data, callback) => {
        if (!data) return callback();
        const issuer = this.mapping.mirrors.get(key(resourceFile(data.contextInfo?.issuer || '')));
        if (!issuer) return callback();
        const separator = data.request.lastIndexOf('!');
        const prefix = data.request.slice(0, separator + 1);
        const request = data.request.slice(separator + 1);
        // Resolve against the original issuer, not the incomplete mirror directory. The normal
        // resolver preserves aliases, extensionAlias, package/browser fields and directory indexes.
        data.context = path.dirname(issuer.original);
        if (!/^\.{1,2}(?:[\\/]|$)/.test(request)) return callback();
        const resolver = compiler.resolverFactory.get('normal', {
          ...data.resolveOptions, dependencyType: data.dependencyType,
        });
        const typedExtensions = { '.js': ['.ts', '.tsx'], '.jsx': ['.tsx'], '.mjs': ['.mts'], '.cjs': ['.cts'] };
        const file = resourceFile(request);
        const extension = path.extname(file);
        const alternatives = [request, ...(typedExtensions[extension] || [])
          .map(replacement => file.slice(0, -extension.length) + replacement + resourceSuffix(request))];
        let firstError;
        const resolve = () => {
          const candidate = alternatives.shift();
          resolver.resolve(data.contextInfo || {}, data.context, candidate, {}, (error, resolved) => {
            if (error || !resolved) {
              firstError ||= error;
              if (alternatives.length) return resolve();
              return callback(new Error(
                `Missing mirrored dependency ${JSON.stringify(request)} from ${issuer.mirror}; original issuer ${issuer.original}: ${firstError?.message || 'resolved to false'}`,
              ));
            }
            data.request = prefix + this.route(resolved, 'relative-from-mirror');
            callback();
          });
        };
        resolve();
      });
      factory.hooks.afterResolve.tap(name, data => {
        const created = data?.createData;
        if (!created?.resource) return;
        const before = created.resource;
        const after = this.route(before, 'resolved-original-support');
        if (before === after) return;
        created.resource = after;
        created.context = path.dirname(resourceFile(after));
        for (const field of ['request', 'userRequest']) {
          if (typeof created[field] === 'string' && created[field].endsWith(before)) {
            created[field] = created[field].slice(0, -before.length) + after;
          }
        }
        if (created.resourceResolveData) {
          created.resourceResolveData = { ...created.resourceResolveData, path: resourceFile(after) };
        }
      });
    });
    compiler.hooks.compilation.tap(name, compilation => {
      this.instrumentReaders(compiler.webpack.NormalModule.getCompilationHooks(compilation).readResource);
      compilation.hooks.finishModules.tap(name, modules => {
        const visit = module => {
          const resource = resourceFile(module.resource);
          if (resource && fs.existsSync(resource) && (inside(this.job.repo, resource) || inside(this.job.packageRoot, resource))) {
            const mapped = this.mapping.mirrors.get(key(resource));
            const originalSupport = this.mapping.originals.has(key(resource));
            if (!this.resources.has(key(resource))) {
              const sealed = this.baseline.get(key(resource));
              const read = this.rawReads.get(key(resource));
              this.resources.set(key(resource), {
                resource, sha256: read?.expected, observedSha256: read?.observed,
                sealedBeforeConfig: !!sealed,
                classification: mapped ? 'mirrored-test-support' : originalSupport ? 'unmapped-original-support' :
                  inside(this.job.packageRoot, resource) ? 'unexpected-mirror' : installedDependency(resource)
                    ? 'installed-dependency' : 'original-production-or-infrastructure',
              });
            }
          }
          if (module.modules) for (const nested of module.modules) visit(nested);
        };
        for (const module of modules) visit(module);
      });
    });
    compiler.hooks.done.tap(name, stats => {
      this.compilations++;
      this.errors.push(...stats.compilation.errors.map(error => error.message || String(error)));
      this.persist(false);
    });
  }

  persist(final) {
    const resources = [...this.resources.values()].map(entry => {
      const read = this.rawReads.get(key(entry.resource));
      return { ...entry, rawReadCount: read?.count || 0, observedRawSha256: read ? [...read.hashes] : [] };
    }).sort((a, b) => a.resource.localeCompare(b.resource));
    const missingSpecs = this.job.specs.filter(spec => !this.resources.has(key(spec)));
    const missingSupport = [...this.required.values()].filter(entry => !this.resources.has(key(entry.mirror)))
      .map(entry => entry.mirror);
    const originalSupport = resources.filter(entry => entry.classification === 'unmapped-original-support');
    const unexpectedMirror = resources.filter(entry => entry.classification === 'unexpected-mirror');
    const missingRawResourceReads = resources.filter(entry => !this.rawReads.has(key(entry.resource))).map(entry => entry.resource);
    const rawResourceMismatches = [...this.rawMismatches.values()];
    const changedResources = resources.filter(entry => entry.observedSha256 !== entry.sha256 ||
      this.rawMismatches.has(key(entry.resource)) ||
      !fs.existsSync(entry.resource) || hash(entry.resource) !== entry.sha256)
      .map(entry => entry.resource);
    const originalProduction = resources.filter(entry =>
      entry.classification === 'original-production-or-infrastructure' &&
      originalComponentSource(this.job.repo, entry.resource),
    );
    const declaredProduction = new Set((this.mapping.manifest?.productionDependencies || [])
      .map(file => key(path.resolve(this.job.repo, file.replace(/[\\/]/g, path.sep)))));
    const expectedProduction = this.expectedProduction.map(entry => entry.resource);
    const observedExpectedProduction = expectedProduction.filter(file => {
      const compiled = this.resources.get(key(file));
      return compiled?.classification === 'original-production-or-infrastructure' &&
        compiled.sealedBeforeConfig && this.rawReads.has(key(file)) && !this.rawMismatches.has(key(file)) &&
        compiled.observedSha256 === compiled.sha256;
    });
    const missingTargetProduction = this.targetProduction.filter(anchor => {
      const compiled = this.resources.get(key(anchor.resource));
      return !['original-production-or-infrastructure', 'installed-dependency'].includes(compiled?.classification) ||
        !compiled.sealedBeforeConfig || !this.rawReads.has(key(anchor.resource)) ||
        this.rawMismatches.has(key(anchor.resource)) || compiled.observedSha256 !== compiled.sha256;
    }).map(anchor => anchor.resource);
    const targetProductionObserved = this.targetProduction.length > 0 && missingTargetProduction.length === 0;
    const supportOnly = this.baselineExpectation?.kind === 'support-only-primary';
    const supportOnlyPrimaryObserved = supportOnly && this.job.specs.every(file => {
      const entry = this.resources.get(key(file));
      return entry?.classification === 'mirrored-test-support' &&
        entry.sha256 === this.baselineExpectation.sourceSha256 && this.rawReads.has(key(file)) &&
        !this.rawMismatches.has(key(file));
    });
    const unsealedProductionResources = originalProduction.filter(entry => !entry.sealedBeforeConfig)
      .map(entry => entry.resource);
    const assertions = {
      final, passed: final && this.compilations > 0 && !this.errors.length && !missingSpecs.length &&
        !missingSupport.length && !originalSupport.length && !unexpectedMirror.length &&
        !changedResources.length && !missingRawResourceReads.length && !rawResourceMismatches.length &&
        !unsealedProductionResources.length &&
        observedExpectedProduction.length > 0 && (targetProductionObserved || supportOnlyPrimaryObserved),
      selectedSpecsFromMirror: missingSpecs.length === 0,
      requiredImportedSupportFromMirror: missingSupport.length === 0 && originalSupport.length === 0,
      originalComponentProductionObserved: targetProductionObserved,
      expectedProductionObserved: observedExpectedProduction.length > 0,
      targetProductionObserved,
      componentTargetNotApplicable: supportOnly,
      supportOnlyPrimaryObserved,
      allCompiledOriginalProductionPresealed: unsealedProductionResources.length === 0,
      noUnknownMirrorResources: unexpectedMirror.length === 0,
      actualRawResourceBytesObserved: missingRawResourceReads.length === 0,
      rawResourceBytesMatchSeal: rawResourceMismatches.length === 0,
      noCompiledSourceWrites: changedResources.length === 0 && missingRawResourceReads.length === 0 && rawResourceMismatches.length === 0,
      missingSpecs, missingSupport, originalSupport: originalSupport.map(entry => entry.resource),
      unexpectedMirror: unexpectedMirror.map(entry => entry.resource), changedResources, unsealedProductionResources, missingTargetProduction,
      missingRawResourceReads, rawResourceMismatches,
    };
    writeJson(path.join(this.job.artifacts, 'webpack-resources.json'), {
      assertions, compilations: this.compilations, errors: this.errors,
      productionSeal: this.job.productionSeal, expectedProduction: this.expectedProduction, observedExpectedProduction,
      targetProductionAnchors: this.targetProduction,
      baselineExpectation: this.baselineExpectation,
      requiredSupport: [...this.required.values()].map(({ original, mirror, kind }) => ({ original, mirror, kind })),
      declaredProductionResources: resources.filter(entry => declaredProduction.has(key(entry.resource)))
        .map(entry => entry.resource),
      routes: [...this.routes.values()], resources,
    });
    if (final && !assertions.passed) {
      throw new Error(`Mirrored webpack resource audit failed: ${JSON.stringify(assertions)}`);
    }
    return assertions;
  }
}

function createAdapter(job) {
  outsideRepo(job.repo, job.artifacts);
  if (!job.productionSeal || !job.productionSealSha256 || hash(job.productionSeal) !== job.productionSealSha256) {
    throw new Error('Missing or changed pre-config production seal');
  }
  const seal = readJson(job.productionSeal);
  productionBaseline(job.repo, seal);
  const mapping = loadSupport(job.repo, job.supportManifest, true, job.packageRoot);
  const plugin = new MirrorModulesPlugin(job, mapping, seal);
  process.chdir(job.cwd);
  const requireRepo = createRequire(path.join(job.repo, 'package.json'));
  const transpiler = requireRepo('ts-node').register({
    transpileOnly: true, skipProject: true,
    compilerOptions: { module: 'commonjs', moduleResolution: 'node' },
    moduleTypes: { '**': 'cjs' },
  });
  process.env.WEBPACK_DEV_SERVER_PORT = String(job.port);
  let imported;
  if (job.config.endsWith('.ts')) {
    const loaded = new Module(job.config, module);
    loaded.filename = job.config;
    loaded.paths = Module._nodeModulePaths(path.dirname(job.config));
    loaded._compile(transpiler.compile(fs.readFileSync(job.config, 'utf8'), job.config), job.config);
    imported = loaded.exports;
  } else {
    imported = require(job.config);
  }
  const config = imported.default || imported;
  if (!config.component) throw new Error(`Not a component Cypress config: ${job.config}`);
  const originalSetup = config.component.setupNodeEvents;
  const absolute = value => typeof value === 'string' && !path.isAbsolute(value) ? path.resolve(job.cwd, value) : value;
  const index = path.join(job.artifacts, 'component-index.html');
  const originalIndex = absolute(config.component.indexHtmlFile);
  if (typeof originalIndex !== 'string' || !fs.existsSync(originalIndex)) {
    throw new Error(`Missing component template ${originalIndex}`);
  }
  fs.copyFileSync(originalIndex, index);
  const originalSupport = absolute(config.component.supportFile);
  if (config.component.supportFile !== false && (typeof originalSupport !== 'string' || !fs.existsSync(originalSupport))) {
    throw new Error(`Missing component support ${originalSupport}`);
  }
  const support = path.join(job.artifacts, 'isolated-support.js');
  const runtimeMappings = [...mapping.originals.values()].map(entry => [
    key(entry.original), { original: entry.original, mirror: entry.mirror, kind: entry.kind },
  ]);
  fs.writeFileSync(support, `
${originalSupport === false ? '' : `import ${JSON.stringify(originalSupport.replace(/\\/g, '/'))};`}
const artifacts = ${JSON.stringify(job.artifacts.replace(/\\/g, '/'))};
const originalCwd = ${JSON.stringify(job.cwd.replace(/\\/g, '/'))};
const redirected = new Map();
const mirrorFiles = new Map(${JSON.stringify(runtimeMappings)});
const runtimeInputs = new Map();
const key = value => value.replace(/\\\\/g, '/').toLowerCase();
const canonical = (value, root = originalCwd) => {
  let file = value.replace(/\\\\/g, '/');
  if (!/^(?:[a-z]:\\/|\\/)/i.test(file)) file = root.replace(/\\\\/g, '/') + '/' + file;
  const parts = [];
  for (const part of file.split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return (file.startsWith('/') ? '/' : '') + parts.join('/');
};
const mirrorFor = file => {
  const entry = mirrorFiles.get(key(file));
  if (!entry) return undefined;
  runtimeInputs.set(key(entry.mirror), { source: entry.original, resource: entry.mirror, kind: entry.kind });
  return entry.mirror;
};
const relativeTo = (root, file) => {
  const from = canonical(root).split('/');
  const to = canonical(file).split('/');
  if (key(from[0]) !== key(to[0])) throw new Error('Mapped fixture crosses filesystem roots');
  let common = 0;
  while (common < from.length && common < to.length && key(from[common]) === key(to[common])) common++;
  return [...from.slice(common).map(() => '..'), ...to.slice(common)].join('/');
};
const fixturePath = file => {
  if (typeof file !== 'string') return file;
  const root = Cypress.config('fixturesFolder');
  if (typeof root !== 'string') return file;
  const mapped = mirrorFor(canonical(file, root));
  return mapped ? relativeTo(root, mapped) : file;
};
const fixtureResponse = response => {
  if (!response || typeof response !== 'object' || typeof response.fixture !== 'string') return response;
  const separator = response.fixture.lastIndexOf(',');
  const file = separator < 0 ? response.fixture : response.fixture.slice(0, separator);
  const encoding = separator < 0 ? '' : response.fixture.slice(separator);
  return { ...response, fixture: fixturePath(file) + encoding };
};
Cypress.Commands.overwrite('writeFile', (original, file, ...args) => {
  if (typeof file !== 'string') throw new Error('Unexpected nonstring artifact path');
  const requested = canonical(file);
  let destination = requested;
  if (!key(requested).startsWith(key(canonical(artifacts)) + '/')) {
    const safe = [];
    for (const part of file.replace(/\\\\/g, '/').split('/').filter(part => part && part !== '.')) {
      if (part === '..') safe.pop();
      else safe.push(part.replace(/:/g, '_'));
    }
    destination = artifacts + '/test-writes/' + safe.join('/');
  }
  redirected.set(key(requested), destination);
  return original(destination, ...args);
});
Cypress.Commands.overwriteQuery('readFile', function (original, file, ...args) {
  return original.call(this, typeof file === 'string'
    ? redirected.get(key(canonical(file))) || mirrorFor(canonical(file)) || file : file, ...args);
});
Cypress.Commands.overwrite('fixture', function (original, file, ...args) {
  return original.call(this, fixturePath(file), ...args);
});
Cypress.Commands.overwrite('intercept', function (original, ...args) {
  return original.call(this, ...args.map(argument => {
    if (typeof argument !== 'function') return fixtureResponse(argument);
    return function (request, ...rest) {
      const reply = request.reply;
      request.reply = function (...response) {
        return reply.call(this, ...response.map(fixtureResponse));
      };
      return argument.call(this, request, ...rest);
    };
  }));
});
after(() => {
  cy.task('__mirrorE2eRuntimeInputs', [...runtimeInputs.values()], { log: false });
});
`);
  const runtimeReceipts = new Map();
  function isolate(current) {
    const component = current.component || current;
    const devServer = component.devServer;
    if (!devServer || typeof devServer !== 'object' || !devServer.webpackConfig || typeof devServer.webpackConfig !== 'object') {
      throw new Error(`Unsupported dev-server shape in ${job.config}`);
    }
    const webpack = devServer.webpackConfig;
    webpack.devServer = {
      ...webpack.devServer, port: job.port, host: '127.0.0.1',
      devMiddleware: { ...webpack.devServer?.devMiddleware, writeToDisk: false },
    };
    webpack.output = { ...webpack.output, path: path.join(job.artifacts, 'webpack-output'), chunkLoadTimeout: 600000 };
    webpack.cache = false;
    webpack.plugins = [...(webpack.plugins || []).filter(entry => entry !== plugin), plugin];
    component.specPattern = job.specs;
    component.supportFile = path.relative(job.cwd, support);
    component.indexHtmlFile = path.relative(job.cwd, index);
    current.screenshotsFolder = path.join(job.artifacts, 'screenshots');
    current.downloadsFolder = path.join(job.artifacts, 'downloads');
    current.videosFolder = path.join(job.artifacts, 'videos');
    current.fixturesFolder = absolute(current.fixturesFolder);
    current.env = { ...current.env, ...job.configEnv, portalEvidencePath: path.join(job.artifacts, 'portal-evidence') };
    current.trashAssetsBeforeRuns = false;
    current.video = false;
    current.retries = 0;
    current.reporter = 'junit';
    current.reporterOptions = { mochaFile: path.join(job.artifacts, 'results-[hash].xml') };
    return current;
  }
  config.component.setupNodeEvents = async (on, current) => {
    const launchHandlers = [];
    const afterRunHandlers = [];
    const preservingOn = (event, handler) => {
      if (event === 'before:browser:launch') launchHandlers.push(handler);
      else if (event === 'after:run') afterRunHandlers.push(handler);
      else on(event, handler);
    };
    const result = originalSetup ? await originalSetup(preservingOn, current) : current;
    const isolated = isolate(result || current);
    on('task', {
      __mirrorE2eRuntimeInputs(inputs) {
        if (!Array.isArray(inputs)) throw new Error('Invalid mirrored runtime-input receipt');
        const verified = inputs.map(input => {
          const entry = mapping.originals.get(key(input.source));
          if (!entry || key(entry.mirror) !== key(input.resource) || input.kind !== entry.kind ||
            hash(entry.original) !== entry.sha256 || hash(entry.mirror) !== entry.sha256) {
            throw new Error(`Invalid or changed mirrored runtime input: ${JSON.stringify(input)}`);
          }
          return { ...input, sha256: entry.sha256 };
        });
        for (const input of verified) runtimeReceipts.set(key(input.resource), input);
        const runtimeInputReads = [...runtimeReceipts.values()];
        writeJson(path.join(job.artifacts, 'runtime-inputs.json'), { passed: true, inputs: runtimeInputReads, runtimeInputReads });
        return null;
      },
    });
    on('before:browser:launch', async (browser, launchOptions) => {
      for (const handler of launchHandlers) launchOptions = (await handler(browser, launchOptions)) || launchOptions;
      launchOptions.args = (launchOptions.args || []).filter(argument => !argument.startsWith('--user-data-dir='));
      launchOptions.args.push(`--user-data-dir=${path.join(job.artifacts, 'browser-profile')}`);
      writeJson(path.join(job.artifacts, 'browser-launch.json'), { browser, args: launchOptions.args });
      return launchOptions;
    });
    on('after:run', async results => {
      writeJson(path.join(job.artifacts, 'cypress-results.json'), results);
      try {
        for (const handler of afterRunHandlers) await handler(results);
      } finally {
        if (!fs.existsSync(path.join(job.artifacts, 'runtime-inputs.json')) &&
          plugin.baselineExpectation?.kind === 'support-only-primary') {
          writeJson(path.join(job.artifacts, 'runtime-inputs.json'), supportOnlyRuntimeReceipt(job, results));
        }
        plugin.persist(true);
      }
    });
    return isolated;
  };
  return isolate(config);
}

module.exports = process.env.MIRROR_E2E_JOB
  ? createAdapter(readJson(process.env.MIRROR_E2E_JOB))
  : { MirrorModulesPlugin, createAdapter, resourceFile };
