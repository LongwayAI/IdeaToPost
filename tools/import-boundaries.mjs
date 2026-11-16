import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

export const sourceExtensions = ['.js', '.jsx', '.cjs', '.mjs', '.ts', '.tsx', '.cts', '.mts'];
const noTypeScriptInputs = 18003;

export function readProject(root) {
  const filename = join(root, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(filename, ts.sys.readFile);
  if (error) {
    throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  }

  const project = ts.parseJsonConfigFileContent(config, ts.sys, root, undefined, filename);
  const errors = project.errors.filter(diagnostic => diagnostic.code !== noTypeScriptInputs);
  if (errors.length > 0) {
    throw new Error(errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
  }
  return project;
}

export function projectPath(root, filename) {
  return relative(root, filename).split(sep).join('/');
}

export function runtimeOf(root, filename) {
  return /^src\/(web|server|shared)\//u.exec(projectPath(root, filename))?.[1];
}

export function crossesBoundary(source, target) {
  return Boolean(source && target && source !== target && target !== 'shared');
}

export function createResolver(root, options) {
  const canonicalName = ts.sys.useCaseSensitiveFileNames ? name => name : name => name.toLowerCase();
  const cache = ts.createModuleResolutionCache(root, canonicalName, options);
  return (specifier, filename) => {
    const module = ts.resolveModuleName(specifier, filename, options, ts.sys, cache).resolvedModule;
    if (!module) return undefined;

    const target = ts.sys.realpath?.(module.resolvedFileName) ?? module.resolvedFileName;
    const path = relative(root, target);
    if (path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) return undefined;
    if (path.split(sep).includes('node_modules')) return undefined;
    return target;
  };
}

export function moduleReferences(filename, source) {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const references = sourceFile.referencedFiles.map(reference => ({
    target: resolve(dirname(filename), reference.fileName),
    start: reference.pos,
    end: reference.end,
  }));

  function add(specifier, location) {
    references.push({
      specifier: specifier && ts.isStringLiteralLike(specifier) ? specifier.text : undefined,
      start: location.getStart(sourceFile),
      end: location.getEnd(),
    });
  }

  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isJSDocImportTag(node)) && node.moduleSpecifier) {
      add(node.moduleSpecifier, node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      add(node.moduleReference.expression, node.moduleReference);
    } else if (ts.isImportTypeNode(node)) {
      add(ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined, node.argument);
    } else if (ts.isCallExpression(node)) {
      const { expression } = node;
      const requireCall = ts.isIdentifier(expression) && expression.text === 'require';
      const moduleRequireCall = ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) && expression.expression.text === 'module' &&
        expression.name.text === 'require';
      if (expression.kind === ts.SyntaxKind.ImportKeyword || requireCall || moduleRequireCall) {
        add(node.arguments[0], node.arguments[0] ?? node);
      }
    }
    node.jsDoc?.forEach(visit);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return references;
}
