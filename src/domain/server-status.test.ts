import { describe, expect, it } from 'vitest';
import { describeServerStatus, isFinal, type ServerStatus } from './server-status';

const all: ServerStatus[] = [
  { kind: 'checking' },
  { kind: 'waking' },
  { kind: 'ok' },
  { kind: 'degraded' },
  { kind: 'unreachable' },
];

describe('server-status', () => {
  it('cada estado tiene un texto distinto y no vacío', () => {
    const texts = all.map(describeServerStatus);
    expect(new Set(texts).size).toBe(all.length);
    texts.forEach((t) => {
      expect(t.length).toBeGreaterThan(0);
    });
  });

  it('el estado «despertando» avisa que puede tardar', () => {
    expect(describeServerStatus({ kind: 'waking' })).toContain('1 minuto');
  });

  it('solo checking y waking son transitorios', () => {
    expect(all.filter((s) => !isFinal(s)).map((s) => s.kind)).toEqual(['checking', 'waking']);
  });
});
