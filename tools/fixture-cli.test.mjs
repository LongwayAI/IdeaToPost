import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempDisposableSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('fixture CLI persists the source-to-receipt workflow across processes', t => {
  const directory = mkdtempDisposableSync(join(tmpdir(), 'marketing-cli-'));
  t.after(directory.remove);
  const prefix = ['src/server/cli.ts', '--profile', 'fixture', '--db', join(directory.path, 'fixture.sqlite'), '--json'];
  const run = (...args) => {
    const result = spawnSync(process.execPath, [...prefix, ...args], { cwd: root, encoding: 'utf8' });
    assert.ifError(result.error);
    return result;
  };
  const output = (...args) => {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const rejection = code => JSON.parse(code.stderr.split('\n').find(line => line.startsWith('{'))).code;

  const source = output('source', 'add', '--file', 'fixtures/launch.md');
  const draft = output('produce', '--source', source.id, '--platform', 'x', '--wait');
  assert.equal(draft.sourceId, source.id);
  assert.match(draft.text, /LongwayAI/);
  assert.equal(draft.approved, false);
  assert.deepEqual(output('draft', 'show', '--revision', draft.id), draft);

  const publish = ['publish', '--revision', draft.id, '--account', 'x_demo'];
  const pending = run(...publish);
  assert.equal(pending.status, 1);
  assert.equal(rejection(pending), 'approvalRequired');
  assert.equal(output('draft', 'approve', '--revision', draft.id).approved, true);
  const wrongAccount = run('publish', '--revision', draft.id, '--account', 'other');
  assert.equal(wrongAccount.status, 1);
  assert.equal(rejection(wrongAccount), 'accountNotFound');

  const receipt = output(...publish);
  assert.equal(receipt.revisionId, draft.id);
  assert.equal(receipt.fixture, true);
  assert.deepEqual(output(...publish), receipt);
  assert.deepEqual(output('publish', 'status', '--id', receipt.id), receipt);
});
