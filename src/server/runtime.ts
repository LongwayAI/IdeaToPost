import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { cli } from '../i18n/en.ts';

export type ErrorCode = keyof typeof cli.errors;

export class EngineError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(code);
    this.code = code;
  }
}

export function openDatabase(path: string) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON');
  return db;
}

export function readText(value: unknown): string {
  if (typeof value === 'string') return value;
  throw new EngineError('unexpected');
}
