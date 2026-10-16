'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');

const packageRoot = __dirname;
const repo = path.resolve(packageRoot, '..', '..');
const sourceRoot = path.join(repo, 'packages', 'react-components');
const requireRepo = createRequire(path.join(repo, 'package.json'));
const ts = requireRepo('typescript');
const input = JSON.parse(fs.readFileSync(path.join(packageRoot, 'manifest.json'), 'utf8'));
const options = ts.convertCompilerOptionsFromJson(
  JSON.parse(fs.readFileSync(path.join(repo, 'tsconfig.base.json'), 'utf8')).compilerOptions,
  repo,
).options;
options.allowJs = true;
options.resolveJsonModule = true;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative = file => path.relative(repo, file);
const within = (root, file) => {
  const rest = path.relative(root, file);
  return rest === '' || (!rest.startsWith('..' + path.sep) && !path.isAbsolute(rest));
};
const files = new Map();
const edges = [];
const production = new Set();
const external = new Set();
const unresolved = [];
const dynamic = [];
const resourceReads = [];
const queue = [];

function destination(file) {
  const parts = path.relative(sourceRoot, file).split(path.sep);
  const index = parts[0] === 'deprecated' ? 1 : 0;
  parts[index] = parts[index].replace(/^react-/, '');
  return path.join(...parts);
}

function add(file, kind) {
  if (!within(sourceRoot, file)) {
    external.add(relative(file));
    return;
  }
  if (!files.has(file)) {
    files.set(file, { source: relative(file), destination: destination(file), sha256: hash(file), kind });
    queue.push(file);
  }
}

function isSupport(file) {
  const parts = path.relative(sourceRoot, file).split(path.sep);
  return parts.includes('testing') || parts.includes('stories') || parts.includes('fixtures') ||
    /TestStyles\.styles\.tsx?$/.test(path.basename(file)) ||
    /(?:\.cy(?:[.-]|$)|\.stories\.[cm]?[jt]sx?$|cypress\.config|\.cypress\.config|^tsconfig|\.tsconfig\.json$)/i
      .test(path.basename(file));
}

function resolveImport(request, importer) {
  if (request.startsWith('node:')) return null;
  if (request.startsWith('.') || path.isAbsolute(request)) {
    const base = path.resolve(path.dirname(importer), request);
    const candidates = [
      base, ...['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.json'].map(extension => base + extension),
      ...['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.json'].map(extension => path.join(base, 'index' + extension)),
    ];
    const exact = candidates.find(file => fs.existsSync(file) && fs.statSync(file).isFile());
    if (exact) return exact;
  }
  return ts.resolveModuleName(request, importer, options, ts.sys).resolvedModule?.resolvedFileName || null;
}

function dependency(importer, request, typeOnly = false) {
  const resolved = resolveImport(request, importer);
  const edge = { importer: relative(importer), request, typeOnly, resolved: resolved ? relative(resolved) : null };
  edges.push(edge);
  if (!resolved) {
    if (request.startsWith('.') || path.isAbsolute(request)) unresolved.push(edge);
    else external.add(request);
    return;
  }
  if (!within(sourceRoot, resolved)) {
    external.add(relative(resolved));
  } else if (isSupport(resolved) || files.get(resolved)?.kind === 'spec') {
    add(resolved, 'support');
    if (path.relative(sourceRoot, resolved).split(path.sep).includes('fake_node_modules')) {
      const metadata = path.join(path.dirname(resolved), 'package.json');
      if (!fs.existsSync(metadata)) throw new Error(`Missing fake-package metadata for ${resolved}`);
      add(metadata, 'support');
    }
  } else {
    production.add(relative(resolved));
  }
}

for (const spec of input.specs) {
  const source = path.join(repo, spec.source);
  if (hash(source) !== spec.sha256 || hash(path.join(packageRoot, spec.destination)) !== spec.sha256) {
    throw new Error(`Spec changed since copy: ${spec.source}`);
  }
  add(source, 'spec');
  add(path.join(repo, spec.originalConfig), 'config');
}

for (let index = 0; index < queue.length; index++) {
  const file = queue[index];
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) {
    const parsed = ts.parseConfigFileTextToJson(file, text);
    if (parsed.error) throw new Error(ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n'));
    const config = parsed.config;
    for (const request of [config.extends].flat().filter(Boolean)) {
      const resolved = resolveImport(request, file);
      if (!resolved) throw new Error(`Missing config dependency ${request} from ${file}`);
      add(resolved, 'config');
    }
    continue;
  }
  if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const constants = new Map();
  function collectConstants(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
        ts.isVariableDeclarationList(node.parent) && (node.parent.flags & ts.NodeFlags.Const)) {
      constants.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, collectConstants);
  }
  collectConstants(ast);
  const finiteDomains = new Map();
  function staticString(node, seen = new Set()) {
    if (!node) return null;
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isIdentifier(node)) {
      if (node.text === '__dirname') return path.dirname(file);
      if (seen.has(node.text) || !constants.has(node.text)) return null;
      return staticString(constants.get(node.text), new Set([...seen, node.text]));
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'path' &&
        ['join', 'resolve'].includes(node.expression.name.text)) {
      const values = node.arguments.map(argument => staticString(argument, seen));
      if (values.some(value => value === null)) return null;
      return path[node.expression.name.text](...values);
    }
    return null;
  }
  function staticValues(node, seen = new Set()) {
    if (!node) return [];
    if (ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node)) {
      return staticValues(node.expression, seen);
    }
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(element => staticValues(element, seen));
    if (ts.isIdentifier(node)) {
      if (finiteDomains.has(node.text)) return [...finiteDomains.get(node.text)];
      if (seen.has(node.text) || !constants.has(node.text)) return [];
      return staticValues(constants.get(node.text), new Set([...seen, node.text]));
    }
    if (ts.isTemplateExpression(node)) {
      let values = [node.head.text];
      for (const span of node.templateSpans) {
        const substitutions = staticValues(span.expression, seen);
        if (!substitutions.length) return [];
        values = values.flatMap(prefix => substitutions.map(value => prefix + value + span.literal.text));
      }
      return values;
    }
    const value = staticString(node);
    return value === null ? [] : [value];
  }
  function collectDomains(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      let valueExpression;
      let variable;
      if (node.expression.name.text === 'forEach' && node.arguments[0] &&
          (ts.isArrowFunction(node.arguments[0]) || ts.isFunctionExpression(node.arguments[0]))) {
        valueExpression = node.expression.expression;
        variable = node.arguments[0].parameters[0]?.name;
      } else if (['includes', 'include'].includes(node.expression.name.text)) {
        valueExpression = node.expression.expression;
        if (ts.isPropertyAccessExpression(valueExpression) && valueExpression.name.text === 'to' &&
            ts.isCallExpression(valueExpression.expression)) {
          valueExpression = valueExpression.expression.arguments[0];
        }
        variable = node.arguments[0];
      }
      if (variable && ts.isIdentifier(variable) && valueExpression) {
        const values = staticValues(valueExpression);
        if (values.length) {
          const domain = finiteDomains.get(variable.text) || new Set();
          for (const value of values) domain.add(value);
          finiteDomains.set(variable.text, domain);
        }
      }
    }
    ts.forEachChild(node, collectDomains);
  }
  collectDomains(ast);
  const producedFiles = new Set();
  function collectProducedFiles(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'cy' &&
        node.expression.name.text === 'writeFile' && node.arguments[0]) {
      for (const value of staticValues(node.arguments[0])) producedFiles.add(value);
    }
    ts.forEachChild(node, collectProducedFiles);
  }
  collectProducedFiles(ast);
  function inputResource(node, kind) {
    const values = staticValues(node);
    if (!values.length) {
      resourceReads.push({ importer: relative(file), kind, expression: node.getText(ast), runtimeOnly: true });
      if (kind !== 'readFile') dynamic.push({ importer: relative(file), expression: node.getText(ast), kind });
      return;
    }
    const parts = file.split(path.sep);
    const libraryIndex = parts.lastIndexOf('library');
    const cwd = libraryIndex >= 0 ? parts.slice(0, libraryIndex + 1).join(path.sep) :
      path.join(repo, input.specs.find(spec => within(path.join(repo, spec.originalWorkingDirectory), file))
        ?.originalWorkingDirectory || path.relative(repo, path.dirname(file)));
    const root = kind === 'readFile' ? cwd : path.join(repo, 'scripts', 'cypress', 'fixtures');
    for (const request of values) {
      const resourcePath = path.resolve(root, kind === 'fixture' ? request.split(',')[0] : request);
      const exists = fs.existsSync(resourcePath) && fs.statSync(resourcePath).isFile();
      resourceReads.push({
        importer: relative(file), kind, request, resolved: relative(resourcePath), generated: !exists,
      });
      if (exists) {
        add(resourcePath, 'support');
      } else if (kind !== 'readFile' || !producedFiles.has(request)) {
        unresolved.push({ importer: relative(file), request, kind });
      }
    }
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)) {
      dependency(file, node.moduleSpecifier.text, Boolean(node.isTypeOnly || node.importClause?.isTypeOnly));
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) &&
               node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
      dependency(file, node.moduleReference.expression.text, Boolean(node.isTypeOnly));
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) &&
               ts.isStringLiteralLike(node.argument.literal)) {
      dependency(file, node.argument.literal.text, true);
    } else if (ts.isCallExpression(node)) {
      const isRequire = (ts.isIdentifier(node.expression) && node.expression.text === 'require') ||
        (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) &&
         node.expression.expression.text === 'require' && node.expression.name.text === 'resolve');
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      if (isRequire || isDynamicImport) {
        const argument = node.arguments[0];
        const request = staticString(argument);
        if (request !== null) dependency(file, request);
        else dynamic.push({ importer: relative(file), expression: node.getText(ast) });
      }
      if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.text === 'cy' && ['fixture', 'readFile'].includes(node.expression.name.text) &&
          node.arguments[0]) {
        inputResource(node.arguments[0], node.expression.name.text);
      }
    } else if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'fixture') {
      inputResource(node.initializer, 'fixture');
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (files.get(file).kind === 'config') {
    // Configurations often construct their esbuild tsconfig path using path.join.
    function configLiterals(node) {
      if (ts.isStringLiteralLike(node) && /(?:^tsconfig.*|\.tsconfig)\.json$/.test(node.text)) {
        const config = path.resolve(path.dirname(file), node.text);
        if (fs.existsSync(config)) add(config, 'config');
      }
      ts.forEachChild(node, configLiterals);
    }
    configLiterals(ast);
  }
}

const report = {
  version: 1,
  sourceSpecCount: input.sourceSpecCount,
  copiedSpecCount: [...files.values()].filter(file => file.kind === 'spec').length,
  policy: 'Copy statically reachable test/stories/testing/fixture dependencies and selected config files. Resolve production modules and shared repository infrastructure from original locations.',
  files: [...files.values()].sort((a, b) => a.destination.localeCompare(b.destination)),
  edges,
  productionDependencies: [...production].sort(),
  externalDependencies: [...external].sort(),
  unresolved,
  dynamic,
  resourceReads,
};
if (unresolved.length || dynamic.length) {
  console.error(JSON.stringify({ unresolved, dynamic }, null, 2));
  process.exitCode = 1;
}
if (process.argv.includes('--copy')) {
  if (process.exitCode) throw new Error('Resolve static-analysis findings before copying supporting files');
  for (const entry of report.files) {
    const target = path.join(packageRoot, entry.destination);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (fs.existsSync(target)) {
      if (hash(target) !== entry.sha256) throw new Error(`Existing mirror differs: ${entry.destination}`);
    } else {
      fs.copyFileSync(path.join(repo, entry.source), target, fs.constants.COPYFILE_EXCL);
    }
    if (hash(target) !== entry.sha256) throw new Error(`Copy hash mismatch: ${entry.destination}`);
  }
  fs.writeFileSync(path.join(packageRoot, 'support-manifest.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({
  counts: report.files.reduce((counts, file) => {
    counts[file.kind] = (counts[file.kind] || 0) + 1;
    return counts;
  }, {}),
  productionDependencies: production.size,
  externalDependencies: external.size,
  unresolved,
  dynamic,
}, null, 2));
