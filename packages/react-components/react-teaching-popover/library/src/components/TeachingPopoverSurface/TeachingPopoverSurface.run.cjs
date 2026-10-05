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
const save = (name, value) =>
  fs.writeFileSync(path.join(receipt, `${name}.json`), JSON.stringify(value, null, 2), { flag: 'wx' });
function git(args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trimEnd();
}
const originals = [
  'index.ts',
  'TeachingPopoverSurface.tsx',
  'TeachingPopoverSurface.types.ts',
  'useTeachingPopoverSurface.ts',
  'useTeachingPopoverSurfaceStyles.styles.ts',
  'renderTeachingPopoverSurface.tsx',
  'TeachingPopoverSurface.test.tsx',
  '__snapshots__/TeachingPopoverSurface.test.tsx.snap',
];
const baselinePath = path.join(evidenceRoot, 'entry.json');
const entryMissing = !fs.existsSync(baselinePath);
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
        originalFiles: originals.map(file => ({ path: file, hash: hash(path.join(owned, file)) })),
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
function outside() {
  const dependencies = git([
    'ls-files',
    '--',
    'packages/react-components/react-teaching-popover',
    'packages/react-components/react-popover',
    'packages/react-components/react-portal',
    'packages/react-components/react-motion',
    'packages/react-components/react-tabster',
    'packages/react-components/react-utilities',
    'packages/react-components/react-components/src/index.ts',
    'packages/tokens',
  ]).split('\n');
  const files = new Set([
    ...dependencies,
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
        hash: fs.existsSync(path.join(repo, file)) ? hash(path.join(repo, file)) : null,
      })),
  };
}
const nxRoot = path.join(evidenceRoot, `n-${Date.now().toString(36)}-${process.pid}`);
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
  WEBPACK_DEV_SERVER_PORT: '46140',
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
save('bootstrap', {
  entryMissing,
  originalFiles: baseline.originalFiles,
  fixturePaths: before.filter(file => file.path.startsWith('testing\\')).map(file => file.path),
  scansActualFilesystemNotOnlyTrackedFiles: true,
});
process.stdout.write(`Evidence: ${receipt}\n`);
try {
  assert.deepEqual(
    baseline.originalFiles.map(file => ({ path: file.path, hash: hash(path.join(owned, file.path)) })),
    baseline.originalFiles,
    'all original production/unit/snapshot bytes preserved',
  );
  assert.equal(
    fs.readFileSync(path.join(owned, 'TeachingPopoverSurface.cy.tsx'), 'utf8').trim(),
    "import './testing/suite.stories';",
  );
  if (mode === 'cypress' || mode === 'standard') {
    const port = spawnSync(
      process.execPath,
      [
        '-e',
        "const s=require('node:net').createServer();s.on('error',e=>{console.error(e.message);process.exit(1)});s.listen(46140,'127.0.0.1',()=>s.close());",
      ],
      { encoding: 'utf8' },
    );
    assert.equal(port.status, 0, `port 46140 occupied: ${port.stderr}; never terminate another owner`);
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
        : 'src/components/TeachingPopoverSurface/TeachingPopoverSurface.cypress.config.cjs',
      '--spec',
      'src/components/TeachingPopoverSurface/TeachingPopoverSurface.cy.tsx',
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
    assert.equal(command.exitCode, 0, fs.readFileSync(path.join(receipt, 'chrome.log'), 'utf8').slice(-32000));
    const xmlFiles = fs.readdirSync(receipt).filter(file => /^results-.*\.xml$/.test(file));
    assert.equal(xmlFiles.length, 1);
    const xml = fs.readFileSync(path.join(receipt, xmlFiles[0]), 'utf8');
    assert(!/<(?:failure|error|skipped)\b/.test(xml), 'zero failed/errors/skipped');
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
    assert.equal(manifest.expectedCount, [23, 62, 90][round - 1]);
    assert.equal(cases.length, manifest.expectedCount);
    assert.equal(new Set(cases.map(item => item.name)).size, cases.length);
    assert.equal(Number(counters.tests), cases.length);
    assert.equal(
      suites.reduce((sum, suite) => sum + Number(suite.tests), 0),
      cases.length,
    );
    assert.deepEqual(
      cases.map(item => item.name).sort(),
      manifest.titles.map(title => `row140 TeachingPopoverSurface ${title}`).sort(),
    );
    assert.deepEqual(cases.map(item => item.classname).sort(), [...manifest.titles].sort());
    const audits = fs
      .readdirSync(auditRoot)
      .filter(file => /^audit-\d+\.json$/.test(file))
      .map(file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8')));
    const finals = audits.filter(audit => audit.phase === 'final');
    assert.equal(finals.length, cases.length);
    assert.equal(audits.length, [24, 64, 100][round - 1]);
    assert.equal(audits.filter(audit => audit.fullResults.violations.length > 0).length, [1, 1, 9][round - 1]);
    assert.equal(audits.filter(audit => audit.fullResults.incomplete.length > 0).length, [0, 1, 7][round - 1]);
    assert.deepEqual(finals.map(audit => audit.scenario).sort(), [...manifest.titles].sort());
    for (const audit of audits) {
      assert.equal(audit.round, round);
      assert.equal(audit.retries, 0);
      assert.equal(audit.fullResults.testEngine.name, 'axe-core');
      assert(audit.fullResults.passes.length > 0);
      assert(audit.auditedRoots.length > 0);
      assert.equal(audit.classified, true);
      const shape = rules =>
        rules.map(rule => ({
          id: rule.id,
          impact: rule.impact,
          nodes: rule.nodes.map(node => ({
            target: node.target,
            impact: node.impact,
            anyChecks: node.any.map(check => ({ id: check.id, data: check.data, impact: check.impact })),
            all: node.all.map(check => ({ id: check.id, data: check.data, impact: check.impact })),
            none: node.none.map(check => ({ id: check.id, data: check.data, impact: check.impact })),
          })),
        }));
      const rawShape = {
        violations: shape(audit.fullResults.violations),
        incomplete: shape(audit.fullResults.incomplete),
      };
      assert.deepEqual(rawShape, audit.actualShape, 'independently reconstruct unfiltered raw finding shapes');
      const semanticShape = structuredClone(rawShape);
      if (audit.profile === 'modal') {
        const staticTargets = ['#surface > i:nth-child(1)', '#surface > i:nth-child(4)'];
        assert.deepEqual(audit.expectedShape, {
          violations: [],
          incomplete: [
            {
              id: 'aria-hidden-focus',
              impact: 'serious',
              nodes: staticTargets.map(target => ({
                target: [target],
                impact: 'serious',
                anyChecks: [],
                all: [{ id: 'focusable-modal-open', data: null, impact: 'serious' }],
                none: [],
              })),
            },
          ],
        });
        assert(
          [
            [
              'default modal exposes the actual open sentinel checkpoint and restores observed focus after close',
              'open-modal',
            ],
            [
              'controlled modal refusal retains actual open dialog checkpoint before external closure',
              'controlled-refused-modal',
            ],
          ].some(([scenario, phase]) => scenario === audit.scenario && phase === audit.phase),
        );
        assert.equal(typeof audit.modalSelectorDocument, 'string');
        const { JSDOM } = require(path.join(repo, 'node_modules/jsdom'));
        const dom = new JSDOM(audit.modalSelectorDocument);
        try {
          const document = dom.window.document;
          const roots = document.querySelectorAll('#surface');
          assert.equal(roots.length, 1);
          assert(roots[0].classList.contains('fui-TeachingPopoverSurface'));
          assert.equal(roots[0].getAttribute('role'), 'dialog');
          assert.equal(roots[0].getAttribute('aria-modal'), 'true');
          assert.deepEqual(rawShape.violations, []);
          assert.equal(rawShape.incomplete.length, 1);
          assert.equal(rawShape.incomplete[0].id, 'aria-hidden-focus');
          assert.equal(rawShape.incomplete[0].nodes.length, 2);
          assert.equal(audit.selectorProofs.length, 2);
          staticTargets.forEach((staticSelector, index) => {
            const node = rawShape.incomplete[0].nodes[index];
            assert.equal(node.target.length, 1);
            assert([staticSelector, `i:nth-child(${index === 0 ? 1 : 4})`].includes(node.target[0]));
            const rawNodes = document.querySelectorAll(node.target[0]);
            const staticNodes = document.querySelectorAll(staticSelector);
            assert.equal(rawNodes.length, 1);
            assert.equal(staticNodes.length, 1);
            assert.equal(rawNodes[0], staticNodes[0]);
            const sentinel = staticNodes[0];
            assert.equal(sentinel.parentElement, roots[0]);
            assert.equal(sentinel.tagName, 'I');
            assert.equal(
              sentinel.getAttribute('data-tabster-dummy'),
              `isFirst=${index === 0}, isOutside=false, (Modalizer, tabbable=true)`,
            );
            assert.equal(sentinel.getAttribute('aria-hidden'), 'true');
            assert.equal(sentinel.getAttribute('tabindex'), '0');
            assert.equal(sentinel.getAttribute('role'), 'none');
            assert.equal(sentinel.childNodes.length, 0);
            assert.deepEqual(audit.selectorProofs[index], {
              rawTarget: node.target,
              staticTarget: [staticSelector],
              rawCount: 1,
              staticCount: 1,
              sameElement: true,
              html: sentinel.outerHTML,
            });
            assert.equal(sentinel.outerHTML, audit.fullResults.incomplete[0].nodes[index].html);
            semanticShape.incomplete[0].nodes[index].target = [staticSelector];
          });
        } finally {
          dom.window.close();
        }
      } else {
        assert.equal(audit.modalSelectorDocument, null);
        assert.deepEqual(audit.selectorProofs, []);
      }
      assert.deepEqual(semanticShape, audit.semanticShape, 'independently reconstruct only finite modal aliases');
      assert.deepEqual(semanticShape, audit.expectedShape, 'all non-target raw fields remain exact');
      const stable = audit.profile.startsWith('stable-');
      const negative = audit.profile === 'unnamed' || audit.profile === 'image';
      const modal = audit.profile === 'modal' || stable;
      assert(
        ['clean', 'unnamed', 'image', 'frame', 'modal', 'stable-basic', 'stable-carousel', 'stable-text'].includes(
          audit.profile,
        ),
      );
      assert.equal(audit.fullResults.violations.length, negative || stable || audit.profile === 'frame' ? 1 : 0);
      assert.equal(audit.fullResults.incomplete.length, modal ? 1 : 0);
      if (negative || stable) {
        const rule = audit.fullResults.violations[0];
        const image = audit.profile === 'image';
        assert.equal(rule.id, image ? 'image-alt' : 'aria-dialog-name');
        assert.equal(rule.impact, image ? 'critical' : 'serious');
        assert.equal(rule.nodes.length, 1);
        const node = rule.nodes[0];
        assert.deepEqual(node.target, [image ? '#unnamed-image' : stable ? '.fui-PopoverSurface' : '#surface']);
        assert.equal(node.impact, rule.impact);
        assert.deepEqual(
          node.any.map(check => check.id),
          image
            ? ['has-alt', 'aria-label', 'aria-labelledby', 'non-empty-title', 'presentational-role']
            : ['aria-label', 'aria-labelledby', 'non-empty-title'],
        );
        for (const check of node.any) {
          assert.equal(check.impact, rule.impact);
          assert.deepEqual(check.data, check.id === 'non-empty-title' ? { messageKey: 'noAttr' } : null);
        }
        assert.deepEqual(node.all, []);
        assert.deepEqual(node.none, []);
        if (stable) {
          assert.match(audit.scenario, /^stable (Default|AppearanceBrand|Carousel|CarouselBrand|CarouselText) /);
          assert.equal(audit.phase, 'stable-open');
        } else {
          assert.equal(audit.phase, 'final');
          assert.equal(
            audit.scenario,
            image
              ? 'unnamed native image retains its exact critical alternative-text finding and classifier guards'
              : 'explicit unnamed standalone dialog retains the exact known serious naming violation',
          );
        }
      }
      if (modal) {
        const rule = audit.fullResults.incomplete[0];
        assert.equal(rule.id, 'aria-hidden-focus');
        assert.equal(rule.impact, 'serious');
        const targets =
          audit.profile === 'modal'
            ? [['#surface > i:nth-child(1)'], ['#surface > i:nth-child(4)']]
            : audit.profile === 'stable-carousel'
            ? [
                ['.fui-PopoverSurface > i:nth-child(1)'],
                ['.fui-TeachingPopoverCarouselNav > i:nth-child(1)'],
                ['.fui-TeachingPopoverCarouselNav > i:nth-child(5)'],
                ['.fui-PopoverSurface > i:nth-child(5)'],
              ]
            : [
                ['.fui-PopoverSurface > i:nth-child(1)'],
                [audit.profile === 'stable-basic' ? 'i:nth-child(6)' : 'i:nth-child(5)'],
              ];
        assert.deepEqual(
          semanticShape.incomplete[0].nodes.map(node => node.target),
          targets,
        );
        for (const node of rule.nodes) {
          assert.equal(node.impact, 'serious');
          assert.deepEqual(node.any, []);
          assert.deepEqual(node.none, []);
          assert.equal(node.all.length, 1);
          assert.equal(node.all[0].id, 'focusable-modal-open');
          assert.equal(node.all[0].impact, 'serious');
          assert.equal(node.all[0].data, null);
          assert.equal(node.all[0].relatedNodes.length, 1);
          assert.deepEqual(node.all[0].relatedNodes[0].target, node.target);
          assert.equal(node.all[0].relatedNodes[0].html, node.html);
          assert.match(node.html, /^<i /);
          assert.match(node.html, /data-tabster-dummy=/);
          assert.match(node.html, /aria-hidden="true"/);
          assert.match(node.html, /tabindex="0"/);
          assert.match(node.html, /role="none"/);
        }
        if (audit.profile === 'modal') {
          assert.equal(
            audit.scenario,
            audit.phase === 'open-modal'
              ? 'default modal exposes the actual open sentinel checkpoint and restores observed focus after close'
              : 'controlled modal refusal retains actual open dialog checkpoint before external closure',
          );
          assert(['open-modal', 'controlled-refused-modal'].includes(audit.phase));
        }
      }
      if (audit.profile === 'frame') {
        assert.equal(
          audit.scenario,
          'supported iframe document portal uses native root refs real CDP child input and raw full frame audits',
        );
        assert(['iframe-surface-open', 'final'].includes(audit.phase));
        const rule = audit.fullResults.violations[0];
        assert.equal(rule.id, 'aria-hidden-focus');
        assert.equal(rule.impact, 'serious');
        assert.deepEqual(
          rule.nodes.map(node => node.target),
          [
            ['#inside-frame', 'i:nth-child(1)'],
            ['#inside-frame', 'i:nth-child(3)'],
          ],
        );
        for (const node of rule.nodes) {
          assert.equal(node.impact, 'serious');
          assert.deepEqual(node.any, []);
          assert.deepEqual(node.none, []);
          assert.equal(node.all.length, 1);
          assert.equal(node.all[0].id, 'focusable-not-tabbable');
          assert.equal(node.all[0].impact, 'serious');
          assert.equal(node.all[0].data, null);
          assert.equal(node.all[0].relatedNodes.length, 1);
          assert.deepEqual(node.all[0].relatedNodes[0].target, node.target);
          assert.equal(node.all[0].relatedNodes[0].html, node.html);
          assert.match(node.html, /^<i /);
          assert.match(node.html, /Root, tabbable=true/);
          assert.match(node.html, /aria-hidden="true"/);
          assert.match(node.html, /tabindex="0"/);
          assert.match(node.html, /role="none"/);
        }
      }
      assert(
        audit.events.every(event => event.trusted),
        'recorded owner requests use actual native input',
      );
    }
    const guards = fs
      .readdirSync(auditRoot)
      .filter(file => /^classifier-guards-\d+\.json$/.test(file))
      .map(file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8')));
    assert.equal(guards.length, audits.filter(audit => audit.profile !== 'clean').length);
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
    for (const guard of guards) {
      const audit = audits.find(item => item.scenario === guard.scenario && item.profile !== 'clean');
      assert(audit);
      assert.deepEqual(
        guard.selectorRejected,
        audit.profile === 'modal'
          ? [
              'unknown-selector',
              'wrong-element',
              'duplicate-selector',
              'absent-selector',
              'wrong-context',
              'wrong-marker',
            ]
          : [],
      );
    }
    const captures = fs.existsSync(path.join(receipt, 'screenshots'))
      ? walk(path.join(receipt, 'screenshots')).filter(file => file.endsWith('.png'))
      : [];
    assert.equal(captures.length, round === 3 ? 5 : 0);
    save('summary', {
      command,
      round,
      passed: cases.length,
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
    const files = before
      .map(item => `${scope}/${item.path.replaceAll('\\', '/')}`)
      .filter(file => !originals.some(original => file === `${scope}/${original}`))
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
          'src/components/TeachingPopoverSurface/TeachingPopoverSurface.test.tsx',
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
    assert.equal(results.numPassedTests, 17);
    assert(
      results.success &&
        results.numPassedTestSuites === 1 &&
        !results.numFailedTests &&
        !results.numPendingTests &&
        !results.numTodoTests,
    );
    assert(!results.snapshot.failure && !results.snapshot.unmatched && !results.snapshot.updated);
    assert.equal(results.snapshot.matched, 1);
    assert.equal(results.snapshot.total, 1);
    save('unit-summary', { passed: results.numPassedTests, snapshot: results.snapshot });
  } else if (mode === 'isolation') {
    const ts = require(path.join(repo, 'node_modules/typescript'));
    const config = ts.readConfigFile(path.join(pkg, 'tsconfig.lib.json'), ts.sys.readFile);
    assert(!config.error);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, pkg);
    assert.deepEqual(parsed.errors, []);
    const inScope = file => file.replaceAll('\\', '/').startsWith(`${owned.replaceAll('\\', '/')}/`);
    const production = originals.filter(file => !file.includes('.test.') && !file.includes('__snapshots__'));
    const roots = parsed.fileNames.filter(inScope);
    const inputs = ts
      .createProgram(parsed.fileNames, parsed.options)
      .getSourceFiles()
      .map(file => file.fileName)
      .filter(inScope);
    assert.equal(roots.length, production.length);
    assert(
      inputs.every(file => production.includes(path.basename(file))),
      'zero owned fixture inputs in actual producer TS program',
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
    const entryBefore = hash(baselinePath);
    const entriesBefore = fs.readdirSync(evidenceRoot).sort();
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
    assert.equal(hash(baselinePath), entryBefore);
    assert.deepEqual(fs.readdirSync(evidenceRoot).sort(), entriesBefore, 'bad CLI creates no metadata or receipts');
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
        : ['e2e', 'type-check'].flatMap(target => [
            [
              `${target}-normal`,
              ['run', `teachingpopoversurface-functional-tests:${target}`, '--skipNxCache', '--outputStyle=static'],
            ],
            [
              `${target}-skip-sync-failure-probe`,
              [
                'run',
                `teachingpopoversurface-functional-tests:${target}`,
                '--skipSync',
                '--skipNxCache',
                '--outputStyle=static',
              ],
            ],
          ]);
    const records = requests.map(([name, args]) => {
      const record = run('node_modules/nx/bin/nx.js', args, name);
      return {
        ...record,
        windowsTS5023: /TS5023: Unknown compiler option '-'\./.test(
          fs.readFileSync(path.join(receipt, `${name}.log`), 'utf8'),
        ),
        synchronizationBlocked: /workspace is (?:probably )?out of sync/.test(
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
    const project = nxJSON('project', ['show', 'project', 'teachingpopoversurface-functional-tests', '--json']);
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
      ['production', `${scope}/useTeachingPopoverSurface.ts`],
      ['fixture', `${scope}/testing/fixtures.stories.tsx`],
      ['canonical', `${scope}/TeachingPopoverSurface.cy.tsx`],
      ['consumer', 'packages/react-components/react-components/src/index.ts'],
      [
        'story',
        'packages/react-components/react-teaching-popover/stories/src/TeachingPopover/TeachingPopoverDefault.stories.tsx',
      ],
    ]) {
      assert(fs.existsSync(path.join(repo, file)), 'affected probes must reference real files');
      const affected = nxJSON(`affected-${name}`, ['show', 'projects', '--affected', '--files', file, '--json']);
      assert(affected.includes('teachingpopoversurface-functional-tests'));
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
      assert.notEqual(name, 'teachingpopoversurface-functional-tests', 'no application cycle');
      if (visited.has(name)) {
        return;
      }
      visited.add(name);
      for (const edge of graph.dependencies[name] ?? []) {
        visit(edge.target);
      }
    }
    for (const edge of graph.dependencies['teachingpopoversurface-functional-tests']) {
      visit(edge.target);
    }
    save('ownership', {
      fixtureOwner: 'react-teaching-popover',
      projectOwner: 'teachingpopoversurface-functional-tests',
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
        )
        .filter(
          name =>
            fs.existsSync(path.join(evidenceRoot, name, 'outcome.json')) ||
            fs.existsSync(path.join(evidenceRoot, name, 'prerequisite.json')),
        );
      assert.equal(matches.length, 1, `one current-source receipt for ${prefix}`);
      const directory = path.join(evidenceRoot, matches[0]);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'source-after.json'), 'utf8')), before);
      const blocked = ['registered-r3', 'sync-r3'].includes(prefix);
      if (!blocked) {
        assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'outcome.json'), 'utf8')).status, 'passed');
      }
      if (blocked) {
        const prerequisite = JSON.parse(fs.readFileSync(path.join(directory, 'prerequisite.json'), 'utf8'));
        assert.equal(prerequisite.synchronizationApplied, false);
        assert.equal(prerequisite.coldGreen, false, 'no shared prerequisite bypass or fake cold green');
        if (prefix === 'registered-r3') {
          assert.equal(prerequisite.records.length, 4);
          const normal = prerequisite.records.filter(record => record.log.includes('-normal.'));
          const probes = prerequisite.records.filter(record => record.log.includes('-skip-sync-failure-probe.'));
          assert.equal(normal.length, 2);
          assert.equal(probes.length, 2);
          assert(
            normal.every(record => record.exitCode !== 0 && (record.synchronizationBlocked || record.windowsTS5023)),
          );
          assert(probes.every(record => record.exitCode !== 0 && record.windowsTS5023));
        } else {
          assert.equal(prerequisite.records[0].exitCode, 1);
          assert.equal(prerequisite.records[1].exitCode, 0);
        }
      }
      const summary = fs.existsSync(path.join(directory, 'summary.json'))
        ? JSON.parse(fs.readFileSync(path.join(directory, 'summary.json'), 'utf8'))
        : null;
      return {
        prefix,
        directory,
        blocked,
        summary,
        hashes: walk(directory).map(file => ({ path: path.relative(directory, file), hash: hash(file) })),
        auditHashes: summary ? walk(summary.auditRoot).map(file => ({ path: file, hash: hash(file) })) : [],
      };
    });
    save('seal', {
      row: 140,
      implementationVerified: true,
      parentInitialReviewPerformed: false,
      parentFreshRepeatReviewPerformed: false,
      committed: false,
      cleanAccessibility: false,
      coldNxGreen: false,
      sourceManifest: before,
      sourceManifestSHA256: crypto.createHash('sha256').update(JSON.stringify(before)).digest('hex'),
      implementationSourceManifest: protectedBefore.files.filter(
        file =>
          file.path.startsWith('packages/react-components/react-teaching-popover/') ||
          file.path.startsWith('packages/react-components/react-popover/') ||
          file.path.startsWith('packages/react-components/react-portal/') ||
          file.path.startsWith('packages/react-components/react-motion/') ||
          file.path.startsWith('packages/react-components/react-tabster/') ||
          file.path.startsWith('packages/react-components/react-utilities/') ||
          file.path === 'packages/react-components/react-components/src/index.ts',
      ),
      receipts,
    });
  } else {
    const archivedEntry = path.join(evidenceRoot, 'entry-first-capture.json');
    const initial = fs.existsSync(archivedEntry) ? JSON.parse(fs.readFileSync(archivedEntry, 'utf8')) : baseline;
    save('preservation', {
      originalChanges: [],
      outsideChanges: baseline.files.filter(
        file => !fs.existsSync(path.join(repo, file.path)) || hash(path.join(repo, file.path)) !== file.hash,
      ),
      baselineHead: baseline.head,
      initialHead: initial.head,
      initialOutsideChanges: initial.files.filter(
        file => !fs.existsSync(path.join(repo, file.path)) || hash(path.join(repo, file.path)) !== file.hash,
      ),
      currentHead: protectedBefore.head,
    });
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
