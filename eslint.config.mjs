import parser from '@typescript-eslint/parser';
import { createResolver, crossesBoundary, moduleReferences, projectPath, readProject, runtimeOf } from './tools/import-boundaries.mjs';

const resolvers = new Map();
const importBoundary = {
  meta: {
    schema: [],
    messages: {
      boundary: 'Cannot import {{target}} from {{source}}. Use a contract from src/shared/ across runtimes.',
      computed: 'Use a literal module specifier so the import graph can be checked.',
    },
  },
  create(context) {
    const { cwd, physicalFilename, sourceCode } = context;
    const runtime = runtimeOf(cwd, physicalFilename);
    if (!runtime) return {};

    if (!resolvers.has(cwd)) {
      resolvers.set(cwd, createResolver(cwd, readProject(cwd).options));
    }
    const resolveImport = resolvers.get(cwd);

    return {
      Program() {
        for (const reference of moduleReferences(physicalFilename, sourceCode.text)) {
          const loc = {
            start: sourceCode.getLocFromIndex(reference.start),
            end: sourceCode.getLocFromIndex(reference.end),
          };
          if (!reference.target && reference.specifier === undefined) {
            context.report({ loc, messageId: 'computed' });
            continue;
          }

          const target = reference.target ?? resolveImport(reference.specifier, physicalFilename);
          if (target && crossesBoundary(runtime, runtimeOf(cwd, target))) {
            context.report({
              loc,
              messageId: 'boundary',
              data: { source: projectPath(cwd, physicalFilename), target: projectPath(cwd, target) },
            });
          }
        }
      },
    };
  },
};

export default [{
  files: ['src/**/*.{js,jsx,cjs,mjs,ts,tsx,mts,cts}'],
  languageOptions: { parser },
  linterOptions: { noInlineConfig: true },
  plugins: { architecture: { rules: { 'import-boundary': importBoundary } } },
  rules: { 'architecture/import-boundary': 'error' },
}];
