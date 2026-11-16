import { EngineError } from '../../runtime.ts';

export function requireFixtureAccount(id: string) {
  if (id !== 'x_demo') throw new EngineError('accountNotFound');
  return id;
}
