import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempDisposableSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const configPath = fileURLToPath(new URL('../eslint.config.mjs', import.meta.url));
const analyzerPath = fileURLToPath(new URL('./check-imports.mjs', import.meta.url));

function fixture(t, files) {
  const directory = mkdtempDisposableSync(join(tmpdir(), 'marketing-imports-'));
  t.after(directory.remove);
  const root = realpathSync(directory.path);
  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      allowJs: true,
      moduleResolution: 'Bundler',
      paths: { '@server/*': ['./src/server/*'], '@web/*': ['./src/web/*'] },
    },
    include: ['src'],
  }));
  for (const [path, contents] of Object.entries(files)) {
    const filename = join(root, path);
    mkdirSync(dirname(filename), { recursive: true });
    writeFileSync(filename, contents);
  }
  return root;
}

function runAnalyzer(root) {
  const result = spawnSync(process.execPath, [analyzerPath], { cwd: root, encoding: 'utf8' });
  assert.ifError(result.error);
  return result;
}

async function lintMessages(root) {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: configPath });
  const results = await eslint.lintFiles('src');
  return results.flatMap(result => result.messages);
}

test('both runtimes can use shared contracts and their own features', async t => {
  const root = fixture(t, {
    'src/shared/draft.ts': 'export type Draft = { id: string };',
    'src/web/features/drafts/view.tsx': 'import type { Draft } from "../../../shared/draft.js"; export type Model = Draft;',
    'src/web/page.ts': 'export type { Model } from "./features/drafts/view.js";',
    'src/server/features/drafts/public.ts': 'import type { Draft } from "../../../shared/draft.js"; export type Record = Draft;',
  });

  assert.deepEqual(await lintMessages(root), []);
  const result = runAnalyzer(root);
  assert.equal(result.status, 0, result.stderr);
});

test('lint and analysis reject cross-runtime type imports and re-exports in both directions', async t => {
  const root = fixture(t, {
    'src/web/view.ts': 'import type { Secret } from "@server/store"; export type View = Secret;',
    'src/web/status.ts': 'export type Status = string;',
    'src/server/store.ts': 'export type Secret = string;',
    'src/server/writer.ts': 'export type { Status } from "../web/status.js";',
  });

  const messages = await lintMessages(root);
  assert.equal(messages.length, 2);
  assert.ok(messages.every(message => message.ruleId === 'architecture/import-boundary'));
  assert.ok(messages.some(message => message.message.includes('src/server/store.ts from src/web/view.ts')));
  assert.ok(messages.some(message => message.message.includes('src/web/status.ts from src/server/writer.ts')));
  const result = runAnalyzer(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /src\/web\/view\.ts -> src\/server\/store\.ts/);
  assert.match(result.stderr, /src\/server\/writer\.ts -> src\/web\/status\.ts/);
});

test('the import graph rejects indirect paths and shared contracts that depend on a runtime', t => {
  const root = fixture(t, {
    'src/web/view.ts': 'export type Data = import("../i18n/server-data.js").ServerData;',
    'src/web/status.ts': 'export type Status = string;',
    'src/server/store.ts': 'export type Secret = string;',
    'src/server/writer.ts': 'export const load = () => import("../i18n/web-data.js");',
    'src/i18n/server-data.ts': 'export type { Secret as ServerData } from "@server/store";',
    'src/i18n/web-data.ts': 'export type { Status } from "@web/status";',
    'src/shared/contract.ts': 'export type { Status } from "../i18n/web-data.js";',
  });

  const result = runAnalyzer(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /src\/web\/view\.ts -> src\/i18n\/server-data\.ts -> src\/server\/store\.ts/);
  assert.match(result.stderr, /src\/server\/writer\.ts -> src\/i18n\/web-data\.ts -> src\/web\/status\.ts/);
  assert.match(result.stderr, /src\/shared\/contract\.ts -> src\/i18n\/web-data\.ts -> src\/web\/status\.ts/);
});

test('computed imports fail because their target is unknown to static analysis', async t => {
  const root = fixture(t, {
    'src/web/view.ts': 'export const load = (path: string) => import(path);',
  });

  const messages = await lintMessages(root);
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /use a literal module specifier/i);
  const result = runAnalyzer(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /src\/web\/view\.ts: use a literal module specifier/);
});

test('JavaScript JSDoc type imports obey the same boundary', async t => {
  const root = fixture(t, {
    'src/server/store.ts': 'export type Secret = string;',
    'src/web/view.js': '/** @type {import("../server/store.js").Secret} */\nexport const view = "draft";',
  });

  const messages = await lintMessages(root);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].ruleId, 'architecture/import-boundary');
  const result = runAnalyzer(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /src\/web\/view\.js -> src\/server\/store\.ts/);
});
