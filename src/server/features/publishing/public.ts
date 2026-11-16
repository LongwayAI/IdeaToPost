import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { FixturePublicationReceipt } from '../../../shared/publications.ts';
import { EngineError, readText } from '../../runtime.ts';
import { requireFixtureAccount } from '../accounts/public.ts';
import type { createDrafts } from '../drafts/public.ts';

export function createPublishing(db: DatabaseSync, drafts: Pick<ReturnType<typeof createDrafts>, 'requireApproval'>) {
  db.exec(`CREATE TABLE IF NOT EXISTS publications (
    id TEXT PRIMARY KEY,
    revision_id TEXT NOT NULL REFERENCES drafts(id),
    account_id TEXT NOT NULL,
    UNIQUE (revision_id, account_id)
  ) STRICT`);

  function status(id: string): FixturePublicationReceipt {
    const row = db.prepare('SELECT * FROM publications WHERE id = ?').get(id);
    if (!row) throw new EngineError('publicationNotFound');
    return { id, revisionId: readText(row.revision_id), accountId: readText(row.account_id), state: 'published', fixture: true, url: `https://example.invalid/x/${id}` };
  }

  return {
    publish(revisionId: string, accountId: string) {
      requireFixtureAccount(accountId);
      drafts.requireApproval(revisionId);
      db.prepare(`INSERT INTO publications VALUES (?, ?, ?)
        ON CONFLICT (revision_id, account_id) DO NOTHING`).run(`pub_${randomUUID()}`, revisionId, accountId);
      const row = db.prepare('SELECT id FROM publications WHERE revision_id = ? AND account_id = ?').get(revisionId, accountId);
      return status(readText(row?.id));
    },
    status,
  };
}
