'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const owned = path.resolve(__dirname, '..');
const repo = path.resolve(owned, '../../../../../../..');
const library = path.resolve(owned, '../../..');
const scope = path.relative(repo, owned).replaceAll('\\', '/');
const mode = process.argv[2];
assert(
  ['isolation', 'discovery', 'registered', 'invalid', 'sync'].includes(mode),
  'expected isolation, discovery, registered, invalid, or sync',
);
const receipt = path.join(owned, '.temp', `${mode}-${Date.now()}-${process.pid}`);
fs.mkdirSync(receipt, { recursive: true });
const env = {
  ...process.env,
  NX_DAEMON: 'false',
  NX_ISOLATE_PLUGINS: 'false',
  NX_NO_CLOUD: 'true',
  NX_CACHE_DIRECTORY: path.join(receipt, 'nx-cache'),
  NX_WORKSPACE_DATA_DIRECTORY: path.join(receipt, 'nx-data'),
  NX_NATIVE_FILE_CACHE_DIRECTORY: path.join(receipt, 'nx-native'),
  V8_COMPILE_CACHE_CACHE_DIR: path.join(receipt, 'v8-cache'),
  TS_NODE_COMPILER: path.join(repo, 'node_modules/typescript/lib/typescript.js'),
  TMP: path.join(owned, '.temp'),
  TEMP: path.join(owned, '.temp'),
};
const save = (name, value) =>
  fs.writeFileSync(path.join(receipt, `${name}.json`), JSON.stringify(value, null, 2), { flag: 'wx' });
const walk = directory =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? entry.name === 'testing' || directory.includes(`${path.sep}testing`)
        ? walk(file)
        : []
      : [file];
  });
const hashSources = () =>
  walk(owned)
    .map(file => ({
      path: path.relative(owned, file),
      hash: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
const before = hashSources();
save('source-before', before);
function run(entry, args, name, cwd = repo) {
  const command = [process.execPath, path.join(repo, entry), ...args];
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) {
    throw result.error;
  }
  fs.writeFileSync(path.join(receipt, `${name}.log`), `${result.stdout}\n${result.stderr}`, { flag: 'wx' });
  fs.appendFileSync(
    path.join(receipt, 'commands.jsonl'),
    `${JSON.stringify({ command, cwd, exitCode: result.status })}\n`,
  );
  process.stdout.write(`${name}: exit ${result.status}\n`);
  return result;
}
process.stdout.write(`Evidence: ${receipt}\n`);
try {
  if (mode === 'isolation') {
    const ts = require(path.join(repo, 'node_modules/typescript'));
    const config = ts.readConfigFile(path.join(library, 'tsconfig.lib.json'), ts.sys.readFile);
    assert(!config.error);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, library);
    assert.equal(parsed.errors.length, 0);
    const inScope = file => file.replaceAll('\\', '/').startsWith(`${owned.replaceAll('\\', '/')}/`);
    const expected = [
      'ColorPicker.tsx',
      'ColorPicker.types.ts',
      'index.ts',
      'renderColorPicker.tsx',
      'useColorPicker.ts',
      'useColorPickerContextValues.ts',
      'useColorPickerStyles.styles.ts',
    ].sort();
    const roots = parsed.fileNames
      .filter(inScope)
      .map(file => path.relative(owned, file))
      .sort();
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const sources = program
      .getSourceFiles()
      .map(file => file.fileName)
      .filter(inScope)
      .map(file => path.relative(owned, file))
      .sort();
    assert.deepEqual(roots, expected, 'exact production TS roots');
    assert.deepEqual(sources, expected, 'actual production program has no test/bridge/fixture');
    const candidates = walk(owned).filter(file => /\.tsx?$/.test(file));
    const emitted = path.join(receipt, 'emitted');
    const result = run(
      'node_modules/@swc/cli/bin/swc.js',
      [
        ...candidates.map(file => path.relative(library, file)),
        '--config-file',
        path.join(library, '.swcrc'),
        '--out-dir',
        emitted,
        '--strip-leading-paths',
        '--sync',
      ],
      'swc',
      library,
    );
    assert.equal(result.status, 0, result.stderr);
    const emittedFiles = directory =>
      fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? emittedFiles(file) : [path.relative(emitted, file)];
      });
    const actual = emittedFiles(emitted).sort();
    const expectedEmitted = expected
      .flatMap(file => {
        const js = path.join('components', 'ColorPicker', file.replace(/\.tsx?$/, '.js'));
        return [js, `${js}.map`];
      })
      .sort();
    assert.deepEqual(
      actual,
      expectedEmitted,
      'real SWC producer emits exactly seven production modules/maps and zero fixtures',
    );
    save('isolation', { roots, sources, candidates, emittedFiles: actual, fixtureEmission: 0 });
  } else if (mode === 'discovery') {
    const projectResult = run(
      'node_modules/nx/bin/nx.js',
      ['show', 'project', 'colorpicker-functional-tests', '--json'],
      'project',
    );
    assert.equal(projectResult.status, 0, projectResult.stderr);
    const project = JSON.parse(projectResult.stdout);
    assert.equal(project.root, `${scope}/testing/ci`);
    assert.equal(project.projectType, 'application');
    assert.deepEqual(project.tags, ['vNext', 'platform:web', 'test']);
    assert.deepEqual(project.implicitDependencies, ['react-color-picker']);
    for (const target of ['e2e', 'type-check']) {
      assert(
        project.targets[target].dependsOn.some(
          dependency => dependency.target === 'build' && dependency.projects === 'scripts-cypress',
        ),
        'actual helper-build prerequisite retained',
      );
    }
    save('project', project);
    for (const [name, file] of [
      ['production', `${scope}/ColorPicker.tsx`],
      ['fixture', `${scope}/testing/ColorPicker.cy.stories.tsx`],
    ]) {
      const result = run(
        'node_modules/nx/bin/nx.js',
        ['show', 'projects', '--affected', '--files', file, '--json'],
        `affected-${name}`,
      );
      assert.equal(result.status, 0, result.stderr);
      const affected = JSON.parse(result.stdout);
      assert(
        affected.includes('colorpicker-functional-tests'),
        'real affected selection includes component application',
      );
      save(`affected-${name}`, { file, affected });
    }
    const { fileMap } = JSON.parse(fs.readFileSync(path.join(receipt, 'nx-data/file-map.json'), 'utf8'));
    const fixture = `${scope}/testing/ColorPicker.cy.stories.tsx`;
    assert(
      fileMap.projectFileMap['react-color-picker'].some(file => file.file === fixture),
      'fixture belongs to actual parent library, not invented nested source root',
    );
    assert(
      fileMap.projectFileMap['colorpicker-functional-tests'].some(
        file => file.file === `${scope}/testing/ci/project.json`,
      ),
      'CI application owns actual nested configuration',
    );
    save('ownership', {
      fixtureOwner: 'react-color-picker',
      applicationOwner: 'colorpicker-functional-tests',
      fixture,
      applicationFiles: fileMap.projectFileMap['colorpicker-functional-tests'],
    });
  } else if (mode === 'registered') {
    const results = ['e2e', 'type-check'].map(target => {
      const result = run(
        'node_modules/nx/bin/nx.js',
        ['run', `colorpicker-functional-tests:${target}`, '--skipSync', '--skipNxCache', '--outputStyle=static'],
        target,
      );
      return {
        target,
        exitCode: result.status,
        windowsPathFailure: /TS5023: Unknown compiler option '-'\./.test(`${result.stdout}\n${result.stderr}`),
      };
    });
    save('registered', { results, coldGreen: results.every(result => result.exitCode === 0) });
    assert(
      results.every(result => result.exitCode === 0),
      'cold registered targets blocked; inspect retained helper prerequisite logs',
    );
  } else if (mode === 'sync') {
    const file = path.join(repo, 'tsconfig.base.json');
    const original = fs.readFileSync(file);
    const result = run(
      'node_modules/nx/bin/nx.js',
      ['generate', '@fluentui/workspace-plugin:export-maps-sync', '--dry-run', '--interactive=false'],
      'sync-dryrun',
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fs.readFileSync(file), original, 'dry-run never applies shared root formatting');
    const updates = [...result.stdout.matchAll(/(?:UPDATE|CREATE|DELETE) ([^\r\n]+)/g)].map(match => match[1]);
    assert.deepEqual(updates, ['tsconfig.base.json'], 'only shared root formatting proposed');
    save('sync', { updates, applied: false, rootHash: crypto.createHash('sha256').update(original).digest('hex') });
  } else {
    const results = ['0', '5', '-1', '1.5', '01', '', '1\n', ' 1', '4.0', 'false', 'banana'].map((value, index) => {
      const result = run(`${scope}/ColorPicker.run.cjs`, ['cypress', value], `invalid-${index}`);
      assert.notEqual(result.status, 0);
      assert(result.stderr.includes('round must be 1, 2, 3, or 4'));
      assert(!result.stdout.includes('Evidence:'), 'invalid round rejected before evidence/Chrome startup');
      return { value, exitCode: result.status };
    });
    save('invalid-rounds', results);
    const ts = require(path.join(repo, 'node_modules/typescript'));
    const vm = require('node:vm');
    const source = fs.readFileSync(path.join(__dirname, 'ColorPicker.cy.stories.tsx'), 'utf8');
    const guard = source.slice(source.indexOf('const requestedRound:'), source.indexOf('const evidenceRoot'));
    assert(guard.includes('coverageRound must be 1, 2, 3, or 4'));
    const javascript = ts.transpileModule(`${guard}\nround;`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const evaluate = value => vm.runInNewContext(javascript, { Cypress: { env: () => value } });
    for (const value of [0, 5, -1, 1.5, '01', '', '1\n', ' 1', false, true, 'banana', null, [1], {}]) {
      assert.throws(() => evaluate(value), /coverageRound must be 1, 2, 3, or 4/);
    }
    for (const value of [1, 2, 3, 4, '1', '2', '3', '4']) {
      assert.equal(evaluate(value), Number(value));
    }
    assert.equal(evaluate(undefined), 4, 'ordinary no-environment default is full round four');
    save('browser-round-guard', {
      invalidValues: [0, 5, -1, 1.5, '01', '', '1\n', ' 1', false, true, 'banana', null, [1], {}],
      validValues: [1, 2, 3, 4, '1', '2', '3', '4'],
      defaultRound: 4,
    });
  }
} finally {
  const after = hashSources();
  save('source-after', after);
  assert.deepEqual(after, before, 'all recursive owned source bytes preserved by integration verification');
}
