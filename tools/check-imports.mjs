import { extname, join } from 'node:path';
import ts from 'typescript';
import { createResolver, crossesBoundary, moduleReferences, projectPath, readProject, runtimeOf, sourceExtensions } from './import-boundaries.mjs';

const root = process.cwd();
const { options } = readProject(root);
const fileNames = ts.sys.readDirectory(join(root, 'src'), sourceExtensions, ['**/node_modules/**']);
const resolveImport = createResolver(root, options);
const referencesByFile = new Map();

function referencesFor(filename) {
  if (!referencesByFile.has(filename)) {
    const source = sourceExtensions.includes(extname(filename)) ? ts.sys.readFile(filename) : undefined;
    referencesByFile.set(filename, source === undefined ? [] : moduleReferences(filename, source));
  }
  return referencesByFile.get(filename);
}

function boundaryErrors(runtime) {
  const roots = fileNames.filter(filename => runtimeOf(root, filename) === runtime);
  const queue = roots.map(filename => [filename]);
  const visited = new Set(roots);
  const errors = new Set();

  for (const chain of queue) {
    const filename = chain.at(-1);
    const label = chain.map(file => projectPath(root, file)).join(' -> ');
    for (const reference of referencesFor(filename)) {
      if (!reference.target && reference.specifier === undefined) {
        errors.add(`${label}: use a literal module specifier so the import graph can be checked.`);
        continue;
      }

      const target = reference.target ?? resolveImport(reference.specifier, filename);
      if (!target) continue;

      if (crossesBoundary(runtime, runtimeOf(root, target))) {
        errors.add(`${label} -> ${projectPath(root, target)}: use a contract from src/shared/ across runtimes.`);
      } else if (!visited.has(target)) {
        visited.add(target);
        queue.push([...chain, target]);
      }
    }
  }
  return errors;
}

const errors = ['web', 'server', 'shared'].flatMap(runtime => [...boundaryErrors(runtime)]);
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Import boundaries passed.');
}
