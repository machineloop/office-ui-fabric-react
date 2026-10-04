'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../../../../../..');
const reports = process.env.FOOTER_ARTIFACT_ROOT || path.join(__dirname, 'reports');
const library = path.resolve(__dirname, '../../..');
const scope = path.relative(repo, __dirname);
const results = [];
const sourceHashes = () =>
  fs
    .readdirSync(__dirname, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => ({
      path: path.join(__dirname, entry.name),
      sha256: crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(__dirname, entry.name)))
        .digest('hex'),
    }));
fs.mkdirSync(reports, { recursive: true });
function git(args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error(result.stderr);
  }
  return result.stdout.trim();
}
const hash = file =>
  crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(repo, file)))
    .digest('hex');
function run(entry, args, name, allowFailure = false, cwd = repo, runtime = process.execPath, env = {}) {
  const before = sourceHashes();
  const startedAt = new Date().toISOString();
  const fd = fs.openSync(path.join(reports, name), 'wx');
  let result;
  try {
    result = spawnSync(runtime, [path.join(repo, entry), ...args], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', fd, fd],
      windowsHide: true,
    });
  } finally {
    fs.closeSync(fd);
  }
  const after = sourceHashes();
  const record = {
    command: [runtime, path.join(repo, entry), ...args],
    cwd,
    env,
    log: name,
    exitCode: result.status,
    startedAt,
    completedAt: new Date().toISOString(),
    sourceHashesBefore: before,
    sourceHashesAfter: after,
    sourceUnchanged: JSON.stringify(before) === JSON.stringify(after),
  };
  results.push(record);
  fs.appendFileSync(path.join(reports, 'commands.jsonl'), `${JSON.stringify(record)}\n`);
  process.stdout.write(`${name}: exit ${result.status}\n`);
  if (!record.sourceUnchanged) {
    throw new Error('Owned source changed during verification; stop without reverting concurrent work');
  }
  if (result.error || (result.status !== 0 && !allowFailure)) {
    throw new Error(fs.readFileSync(path.join(reports, name), 'utf8').split('\n').slice(-70).join('\n'));
  }
  return record;
}
const mode = process.argv[2];
if (mode === 'snapshot') {
  const files = new Set(git(['ls-files', '-m', '-o', '--exclude-standard']).split('\n').filter(Boolean));
  for (const dir of [
    'packages/react-components/react-drawer/library/src',
    'packages/react-components/react-drawer/stories/src',
  ]) {
    const visit = absolute => {
      for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
        const file = path.join(absolute, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'reports') {
          visit(file);
        } else if (entry.isFile()) {
          files.add(path.relative(repo, file).replaceAll('\\', '/'));
        }
      }
    };
    visit(path.join(repo, dir));
  }
  for (const file of ['tsconfig.base.json', 'eslint.config.js', 'package.json', 'yarn.lock']) {
    files.add(file);
  }
  const originals = [
    'DrawerFooter.cy.tsx',
    'DrawerFooter.test.tsx',
    'DrawerFooter.tsx',
    'DrawerFooter.types.ts',
    'index.ts',
    'renderDrawerFooter.tsx',
    'useDrawerFooter.ts',
    'useDrawerFooterStyles.styles.ts',
  ];
  const snapshot = {
    branch: git(['branch', '--show-current']),
    head: git(['rev-parse', 'HEAD']),
    files: [...files]
      .filter(file => !file.replaceAll('/', '\\').startsWith(`${scope}\\`) || originals.includes(path.basename(file)))
      .map(file => ({ path: file, sha256: hash(file) })),
  };
  fs.writeFileSync(path.join(reports, 'preservation-before.json'), JSON.stringify(snapshot, null, 2), { flag: 'wx' });
  process.stdout.write(`Captured ${snapshot.files.length} preservation sentinels\n`);
} else if (mode === 'cypress' || mode === 'standard') {
  const round = Number(process.argv[3]);
  const attempt = process.argv[4] || '1';
  const runDir = path.join(reports, `${mode}-round-${round}-${attempt}`);
  fs.mkdirSync(runDir);
  const auditFile = path.join(runDir, 'audits.json');
  const log = `${mode}-round-${round}-${attempt}.log`;
  const runtime = mode === 'standard' ? process.env.FOOTER_NODE22 : process.execPath;
  if (!runtime) {
    throw new Error('Standard ESM configuration requires FOOTER_NODE22');
  }
  const result = run(
    'node_modules/cypress/bin/cypress',
    [
      'run',
      '--component',
      '--browser',
      'chrome',
      '--headless',
      '--spec',
      path.join(__dirname, 'DrawerFooter.cy.tsx'),
      '--config-file',
      mode === 'standard' ? 'cypress.config.ts' : path.join(__dirname, 'DrawerFooter.cypress.config.cjs'),
      '--config',
      `retries=0,trashAssetsBeforeRuns=false,viewportWidth=1200,viewportHeight=800,downloadsFolder=${path.join(
        __dirname,
        '.cypress-downloads',
        `${mode}-round-${round}-${attempt}`,
      )},screenshotsFolder=${path.join(__dirname, '.cypress-screenshots', `${mode}-round-${round}-${attempt}`)}`,
      '--reporter',
      'junit',
      '--reporter-options',
      `mochaFile=${path.join(runDir, 'results-[hash].xml')}`,
      '--env',
      `coverageRound=${round},footerAuditFile=${auditFile}`,
    ],
    log,
    true,
    library,
    runtime,
    {
      TS_NODE_COMPILER: path.join(repo, 'node_modules/typescript/lib/typescript.js'),
      WEBPACK_DEV_SERVER_PORT: '46125',
      FOOTER_REPORT_DIR: runDir,
    },
  );
  const junit = fs.readdirSync(runDir).filter(name => /^results-.*\.xml$/.test(name));
  const cases = [];
  let failures = 0;
  let skipped = 0;
  let errors = 0;
  for (const [index, name] of junit.entries()) {
    const xml = fs.readFileSync(path.join(runDir, name), 'utf8');
    fs.writeFileSync(path.join(runDir, `spec-${index + 1}.xml`), xml);
    cases.push(...[...xml.matchAll(/<testcase\b[^>]*name="([^"]+)"/g)].map(match => match[1]));
    failures += (xml.match(/<failure\b/g) || []).length;
    skipped += (xml.match(/<skipped\b/g) || []).length;
    errors += (xml.match(/<error\b/g) || []).length;
  }
  const audits = fs.existsSync(auditFile) ? JSON.parse(fs.readFileSync(auditFile, 'utf8')) : [];
  const auditKeys = audits.map(audit => JSON.stringify([audit.scenario, audit.phase, audit.scope]));
  const countRules = findings =>
    findings.reduce((counts, finding) => {
      counts[finding.id] = (counts[finding.id] || 0) + 1;
      return counts;
    }, {});
  const summary = {
    round,
    attempt,
    tests: cases.length,
    failures,
    skipped,
    errors,
    uniqueTests: new Set(cases).size,
    auditCount: audits.length,
    uniqueAudits: new Set(auditKeys).size,
    violationRules: countRules(audits.flatMap(audit => audit.violations)),
    incompleteRules: countRules(audits.flatMap(audit => audit.incomplete)),
    incompleteNodes: audits
      .flatMap(audit => audit.incomplete)
      .reduce((count, finding) => count + finding.nodes.length, 0),
    junitFiles: junit.map(name => path.join(runDir, name)),
    auditFile,
    cases,
    audits,
    result,
  };
  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));
  process.stdout.write(
    `${cases.length} cases; ${failures} failures; ${skipped} skipped; ${audits.length} axe audits\n`,
  );
  if (
    result.exitCode !== 0 ||
    junit.length !== 1 ||
    failures ||
    skipped ||
    errors ||
    summary.uniqueAudits !== audits.length ||
    summary.uniqueTests !== cases.length ||
    cases.length !== [18, 30, 80, 100, 103, 108, 111][round - 1] ||
    audits.length !== [8, 18, 55, 75, 76, 80, 82][round - 1]
  ) {
    throw new Error(`Round ${round} failed exact count/exit checks; see ${log} and round summary`);
  }
} else if (mode === 'checks') {
  const local = name => path.join(scope, name);
  const authored = fs
    .readdirSync(__dirname)
    .filter(
      name =>
        name.startsWith('DrawerFooter.') &&
        !['DrawerFooter.tsx', 'DrawerFooter.types.ts', 'DrawerFooter.test.tsx'].includes(name),
    );
  run('node_modules/prettier/bin-prettier.js', ['--check', ...authored.map(local)], 'format-final.log', true);
  run(
    'node_modules/typescript/bin/tsc',
    ['-p', local('DrawerFooter.cy.tsconfig.json'), '--pretty', 'false'],
    'typecheck-final.log',
    true,
  );
  run(
    'node_modules/typescript/bin/tsc',
    [
      '-p',
      path.join(library, 'tsconfig.cy.json'),
      '--noEmit',
      '--incremental',
      'false',
      '--composite',
      'false',
      '--pretty',
      'false',
    ],
    'typecheck-package.log',
    true,
  );
  run(
    'node_modules/typescript/bin/tsc',
    ['-p', local('DrawerFooter.cy-baseline.tsconfig.json'), '--pretty', 'false'],
    'typecheck-baseline.log',
    true,
  );
  run(
    'node_modules/eslint/bin/eslint.js',
    [
      '--config',
      local('DrawerFooter.eslint.config.cjs'),
      ...authored.filter(name => /\.(ts|tsx|cjs)$/.test(name)).map(local),
      '--no-cache',
    ],
    'lint-final.log',
    true,
  );
  run(
    'node_modules/eslint/bin/eslint.js',
    [
      '--config',
      local('DrawerFooter.eslint.config.cjs'),
      ...[
        'DrawerFooter.tsx',
        'DrawerFooter.types.ts',
        'useDrawerFooter.ts',
        'useDrawerFooterStyles.styles.ts',
        'renderDrawerFooter.tsx',
        'index.ts',
      ].map(local),
      '--no-cache',
    ],
    'lint-baseline.log',
    true,
  );
  if (results.some(result => result.exitCode !== 0)) {
    throw new Error('Scoped checks failed; inspect reports and baseline logs');
  }
} else if (mode === 'preserve') {
  const before = JSON.parse(fs.readFileSync(path.join(reports, 'preservation-before.json'), 'utf8'));
  const after = {
    branch: git(['branch', '--show-current']),
    head: git(['rev-parse', 'HEAD']),
    files: before.files.map(file => ({
      ...file,
      unchanged: fs.existsSync(path.join(repo, file.path)) && hash(file.path) === file.sha256,
    })),
  };
  fs.writeFileSync(path.join(reports, 'preservation-after.json'), JSON.stringify(after, null, 2), { flag: 'wx' });
  process.stdout.write(
    `Preservation ${after.files.filter(file => file.unchanged).length}/${after.files.length}; branch ${
      after.branch
    }; HEAD ${after.head}\n`,
  );
  if (after.branch !== before.branch || after.head !== before.head || after.files.some(file => !file.unchanged)) {
    throw new Error('Preservation mismatch: inspect preservation-after.json; never revert concurrent work');
  }
} else {
  throw new Error('Expected snapshot, cypress|standard <round> [attempt], checks, or preserve');
}
