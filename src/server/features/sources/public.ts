import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { EngineError, readText } from '../../runtime.ts';

export function createSources(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    digest TEXT NOT NULL
  ) STRICT`);

  return {
    add(file: string) {
      let body: string;
      try {
        body = readFileSync(file, 'utf8');
      } catch {
        throw new EngineError('unreadableSource');
      }
      if (!body.trim()) throw new EngineError('emptySource');

      const id = `src_${randomUUID()}`;
      const digest = body.trim().replace(/\s+/gu, ' ');
      db.prepare('INSERT INTO sources VALUES (?, ?, ?)').run(id, body, digest);
      return { id };
    },
    digest(id: string) {
      const row = db.prepare('SELECT digest FROM sources WHERE id = ?').get(id);
      if (!row) throw new EngineError('sourceNotFound');
      return readText(row.digest);
    },
  };
}
