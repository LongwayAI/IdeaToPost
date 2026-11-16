import { parseArgs } from 'node:util';
import { cli } from '../i18n/en.ts';
import { createDrafts } from './features/drafts/public.ts';
import { createPublishing } from './features/publishing/public.ts';
import { createSources } from './features/sources/public.ts';
import { EngineError, openDatabase } from './runtime.ts';

function required(value: string | undefined): string {
  if (!value?.trim()) throw new EngineError('invalidArguments');
  return value;
}

function run(args: string[]) {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        help: { type: 'boolean' },
        json: { type: 'boolean' },
        wait: { type: 'boolean' },
        profile: { type: 'string' },
        db: { type: 'string' },
        file: { type: 'string' },
        source: { type: 'string' },
        platform: { type: 'string' },
        revision: { type: 'string' },
        account: { type: 'string' },
        id: { type: 'string' },
      },
    });
  } catch {
    throw new EngineError('invalidArguments');
  }

  const { values, positionals } = parsed;
  if (values.help || args.length === 0) return cli.help;
  if (values.profile !== 'fixture') throw new EngineError('unsupportedProfile');

  const format = (value: object, message: string) => values.json ? JSON.stringify(value) : message;
  const db = openDatabase(values.db ?? '.marketing-engine/fixture.sqlite');
  try {
    const sources = createSources(db);
    const drafts = createDrafts(db);
    const publishing = createPublishing(db, drafts);

    switch (positionals.join(' ')) {
      case 'source add': {
        const source = sources.add(required(values.file));
        return format(source, cli.sourceSaved(source.id));
      }
      case 'produce': {
        if (values.platform !== 'x') throw new EngineError('unsupportedPlatform');
        const sourceId = required(values.source);
        const draft = drafts.produce(sourceId, sources.digest(sourceId));
        return format(draft, cli.draftReady(draft.id, draft.text));
      }
      case 'draft show': {
        const draft = drafts.show(required(values.revision));
        return format(draft, cli.draftReady(draft.id, draft.text));
      }
      case 'draft approve': {
        const draft = drafts.approve(required(values.revision));
        return format(draft, cli.draftApproved(draft.id));
      }
      case 'publish': {
        const receipt = publishing.publish(required(values.revision), required(values.account));
        return format(receipt, cli.publication(receipt.id, receipt.url));
      }
      case 'publish status': {
        const receipt = publishing.status(required(values.id));
        return format(receipt, cli.publication(receipt.id, receipt.url));
      }
      default:
        throw new EngineError('invalidArguments');
    }
  } finally {
    db.close();
  }
}

const args = process.argv.slice(2);
try {
  process.stdout.write(`${run(args)}\n`);
} catch (error) {
  const code = error instanceof EngineError ? error.code : 'unexpected';
  const message = cli.errors[code];
  process.stderr.write(`${args.includes('--json') ? JSON.stringify({ code, message }) : message}\n`);
  process.exitCode = 1;
}
