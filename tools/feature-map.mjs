import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const columns = ['action', 'command', 'route', 'control', 'proof', 'status'];
const lines = [
  '# Phase 1 feature map',
  '',
  'Generated from feature-local `verify.json` files. Run `npm run feature-map` after editing them.',
  '',
  'Run fixture commands as `npm run --silent engine -- --profile fixture <command>`. Use the ID printed by the preceding command. Browser routes are planned.',
  '',
  '| Owner | Action | CLI command | Planned route | Control | Observable proof | Status |',
  '| --- | --- | --- | --- | --- | --- | --- |',
];

for (const runtime of ['server', 'web']) {
  const folder = join('src', runtime, 'features');
  for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (!entry.isDirectory()) continue;
    const metadata = join(folder, entry.name, 'verify.json');
    if (!existsSync(metadata)) continue;

    const entries = JSON.parse(readFileSync(metadata, 'utf8'));
    if (!Array.isArray(entries)) throw new Error(`${metadata} must contain an array of feature map entries.`);
    for (const feature of entries) {
      if (!feature || columns.some(column => typeof feature[column] !== 'string' || !feature[column].trim())) {
        throw new Error(`${metadata} has an incomplete feature map entry.`);
      }
      const cells = columns.map(column => feature[column].replaceAll('|', '\\|').replace(/[\r\n]+/gu, ' '));
      lines.push(`| ${runtime}/${entry.name} | ${cells[0]} | \`${cells[1]}\` | \`${cells[2]}\` | ${cells.slice(3).join(' | ')} |`);
    }
  }
}

const path = 'FEATURE_MAP.md';
const output = `${lines.join('\n')}\n`;
if (process.argv.includes('--check')) {
  if (!existsSync(path) || readFileSync(path, 'utf8').replaceAll('\r\n', '\n') !== output) {
    console.error('FEATURE_MAP.md is out of date. Run npm run feature-map and include the result.');
    process.exitCode = 1;
  }
} else {
  writeFileSync(path, output);
}
