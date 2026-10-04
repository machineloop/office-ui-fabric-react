'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');

const repo = path.resolve(__dirname, '../../../../../../..');
const library = path.join(repo, 'packages/react-components/react-table/library');
const scope = path.relative(repo, __dirname);
const artifacts = path.resolve(process.env.DGH_CELL_ARTIFACT_DIR || path.join(__dirname, 'reports/current-validation'));
const node22 = process.env.DGH_CELL_NODE22;
const authored = [
  '.gitignore',
  'DataGridHeaderCell.cy.tsx',
  'DataGridHeaderCell.cy.stories.tsx',
  'DataGridHeaderCell.cy-jsx.stories.ts',
  'DataGridHeaderCell.cy-aliases.stories.ts',
  'DataGridHeaderCell.cy.tsconfig.json',
  'DataGridHeaderCell.cy-baseline.tsconfig.json',
  'DataGridHeaderCell.cy-webpack.tsconfig.json',
  'DataGridHeaderCell.cypress.config.cjs',
  'DataGridHeaderCell.eslint.config.cjs',
  'DataGridHeaderCell.run.cjs',
  'DataGridHeaderCell.cy.md',
];
const production = [
  'DataGridHeaderCell.tsx',
  'DataGridHeaderCell.types.ts',
  'useDataGridHeaderCell.ts',
  'renderDataGridHeaderCell.tsx',
  'useDataGridHeaderCellStyles.styles.ts',
  'index.ts',
];
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before = [...authored, ...production].map(name => ({ name, sha256: sha(path.join(__dirname, name)) }));
const inputs = [];
for (const root of ['src', '../stories/src/DataGrid']) {
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'reports') {
        visit(file);
      } else if (entry.isFile() && /\.(tsx?|md)$/.test(entry.name) && !entry.name.includes('.cy')) {
        inputs.push({ path: path.relative(repo, file), sha256: sha(file) });
      }
    }
  };
  visit(path.join(library, root));
}
function git(args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  }
  return result.stdout.trim();
}
fs.mkdirSync(artifacts, { recursive: true });
const manifest = {
  started: new Date().toISOString(),
  branchBefore: git(['branch', '--show-current']),
  headBefore: git(['rev-parse', 'HEAD']),
  authored,
  production,
  before,
  inputs,
  checks: [],
  runs: [],
};
const persist = () =>
  fs.writeFileSync(path.join(artifacts, 'current-manifest.json'), JSON.stringify(manifest, null, 2));
persist();

function run(label, entry, args, runtime = process.execPath, cwd = repo) {
  const log = path.join(artifacts, `${label}.log`);
  const fd = fs.openSync(log, 'w');
  let result;
  try {
    result = spawnSync(runtime, [path.join(repo, entry), ...args], {
      cwd,
      stdio: ['ignore', fd, fd],
      windowsHide: true,
      env: {
        ...process.env,
        WEBPACK_DEV_SERVER_PORT: '46124',
        TS_NODE_COMPILER: path.join(repo, 'node_modules/typescript/lib/typescript.js'),
      },
    });
  } finally {
    fs.closeSync(fd);
  }
  manifest.checks.push({ label, command: [runtime, path.join(repo, entry), ...args], cwd, log, exit: result.status });
  persist();
  if (result.error || result.status !== 0) {
    throw new Error(`${label}: ${result.error?.message ?? `exit ${result.status}`}; see ${log}`);
  }
  process.stdout.write(`${label}: exit 0\n`);
}

function browser(label, round, canonical = false) {
  const ledger = `src/components/DataGridHeaderCell/reports/${label}-ledger.json`;
  const junit = path.join(__dirname, `reports/${label}.xml`);
  const entry = 'src/components/DataGridHeaderCell/DataGridHeaderCell.cy.tsx';
  const args = [
    'run',
    '--component',
    '--browser',
    'chrome',
    '--headless',
    '--project',
    canonical ? library : path.relative(repo, library),
    '--config-file',
    canonical ? 'cypress.config.ts' : 'src/components/DataGridHeaderCell/DataGridHeaderCell.cypress.config.cjs',
    '--spec',
    canonical ? entry : path.join(scope, 'DataGridHeaderCell.cy.tsx'),
    '--config',
    'retries=0,viewportWidth=1200,viewportHeight=800,video=false,screenshotOnRunFailure=false',
    '--reporter',
    'junit',
    '--reporter-options',
    `mochaFile=${junit},toConsole=false`,
    '--env',
    `coverageRound=${round},auditLedger=${ledger}`,
  ];
  if (canonical && !node22) {
    throw new Error('Set DGH_CELL_NODE22 to the existing Node 22 executable for the actual standard ESM config.');
  }
  run(
    label,
    'node_modules/cypress/bin/cypress',
    args,
    canonical ? node22 : process.execPath,
    canonical ? library : repo,
  );
  const raw = fs.readFileSync(junit, 'utf8');
  fs.copyFileSync(junit, path.join(artifacts, `${label}.xml`));
  fs.copyFileSync(path.join(library, ledger), path.join(artifacts, `${label}-ledger.json`));
  const names = [...raw.matchAll(/<testcase\b[^>]*name="([^"]+)"/g)].map(match => match[1]);
  const failures = (raw.match(/<failure\b/g) || []).length;
  const errors = (raw.match(/<error\b/g) || []).length;
  const skipped = (raw.match(/<skipped\b/g) || []).length;
  const expected = [18, 36, 69, 81, 85, 88, 91][round - 1];
  const audits = JSON.parse(fs.readFileSync(path.join(library, ledger), 'utf8'));
  const uncontrolledMetrics = audits.flatMap(report => (report.uncontrolledSort ? [report.uncontrolledSort] : []));
  const expectedUncontrolledMetrics =
    round >= 4
      ? [
          {
            mode: 'uncontrolled',
            strictMode: true,
            requests: Array(2).fill({ sortColumn: 'name', sortDirection: 'descending' }),
            callbackCount: 2,
            domDirection: 'descending',
            rowOrder: ['Charlie', 'Bravo', 'Alpha'],
          },
        ]
      : [];
  const output = fs.readFileSync(path.join(artifacts, `${label}.log`), 'utf8');
  const zeroResultCounts = ['Failing', 'Pending', 'Skipped'].every(name => new RegExp(`${name}:\\s+0\\s`).test(output));
  manifest.runs.push({
    label,
    round,
    canonical,
    tests: names.length,
    unique: new Set(names).size,
    failures,
    errors,
    skipped,
    pending: 0,
    zeroResultCounts,
    expected,
    names,
    auditPairs: audits.length,
    uncontrolledMetrics,
  });
  persist();
  if (
    names.length !== expected ||
    new Set(names).size !== expected ||
    failures ||
    errors ||
    skipped ||
    !zeroResultCounts ||
    !audits.length ||
    !isDeepStrictEqual(uncontrolledMetrics, expectedUncontrolledMetrics)
  ) {
    throw new Error(`${label}: unexpected test or audit counts`);
  }
  process.stdout.write(`${label}: ${names.length} unique passing tests, ${audits.length} audit pairs\n`);
}

try {
  const paths = authored.filter(name => name !== '.gitignore').map(name => path.join(scope, name));
  run('current-format', 'node_modules/prettier/bin-prettier.js', ['--check', ...paths]);
  for (const [label, config] of [
    ['scoped', path.join(scope, 'DataGridHeaderCell.cy.tsconfig.json')],
    ['baseline', path.join(scope, 'DataGridHeaderCell.cy-baseline.tsconfig.json')],
    ['package-cy', path.relative(repo, path.join(library, 'tsconfig.cy.json'))],
  ]) {
    run(`current-tsc-${label}`, 'node_modules/typescript/bin/tsc', [
      '-p',
      config,
      '--noEmit',
      '--incremental',
      'false',
      '--composite',
      'false',
      '--pretty',
      'false',
    ]);
  }
  run('current-lint', 'node_modules/eslint/bin/eslint.js', [
    '--config',
    path.join(scope, 'DataGridHeaderCell.eslint.config.cjs'),
    ...paths.filter(file => /\.(tsx?|cjs)$/.test(file)),
    '--no-cache',
  ]);
  const round = Number(process.env.DGH_CELL_ROUND || 7);
  browser('current-direct', round);
  browser('current-canonical', round, true);
} finally {
  manifest.after = before.map(file => ({
    ...file,
    afterSha256: sha(path.join(__dirname, file.name)),
    unchanged: sha(path.join(__dirname, file.name)) === file.sha256,
  }));
  manifest.completed = new Date().toISOString();
  manifest.branchAfter = git(['branch', '--show-current']);
  manifest.headAfter = git(['rev-parse', 'HEAD']);
  manifest.inputsAfter = inputs.map(file => ({
    ...file,
    unchanged: sha(path.join(repo, file.path)) === file.sha256,
  }));
  manifest.guardPassed =
    manifest.after.every(file => file.unchanged) &&
    manifest.inputsAfter.every(file => file.unchanged) &&
    manifest.branchBefore === manifest.branchAfter;
  persist();
}
if (!manifest.guardPassed) {
  throw new Error('Tested code or branch changed during verification; do not revert concurrent changes.');
}
