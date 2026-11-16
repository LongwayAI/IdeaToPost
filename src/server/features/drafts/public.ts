import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { DraftRevision } from '../../../shared/drafts.ts';
import { EngineError, readText } from '../../runtime.ts';

export function createDrafts(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES sources(id),
    body TEXT NOT NULL,
    approved_at TEXT
  ) STRICT`);

  function show(id: string): DraftRevision {
    const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id);
    if (!row) throw new EngineError('draftNotFound');
    return { id, sourceId: readText(row.source_id), platform: 'x', text: readText(row.body), approved: row.approved_at !== null };
  }

  return {
    produce(sourceId: string, digest: string) {
      const id = `rev_${randomUUID()}`;
      const text = Array.from(digest).slice(0, 120).join('');
      db.prepare('INSERT INTO drafts (id, source_id, body) VALUES (?, ?, ?)').run(id, sourceId, text);
      return show(id);
    },
    show,
    approve(id: string) {
      db.prepare('UPDATE drafts SET approved_at = COALESCE(approved_at, ?) WHERE id = ?').run(new Date().toISOString(), id);
      return show(id);
    },
    requireApproval(id: string) {
      if (!show(id).approved) throw new EngineError('approvalRequired');
    },
  };
}
