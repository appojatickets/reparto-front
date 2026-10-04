import { describe, expect, it } from 'vitest';
import { err, ok, type Result } from '../../domain/result';
import type { ServerStatus } from '../../domain/server-status';
import type { ApiError, HealthReport, SaludApi } from '../ports/api-client';
import type { Timer } from '../ports/timer';
import { checkServer } from './check-server';

const report = (status: HealthReport['status']): HealthReport => ({
  status,
  database: status === 'ok' ? 'ok' : 'error',
  timestamp: '2026-10-05T12:00:00.000Z',
});

const fakeTimer = () => {
  const pending: { fn: () => void; cancelled: boolean }[] = [];
  const timer: Timer = {
    after: (_ms, fn) => {
      const entry = { fn, cancelled: false };
      pending.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
  };
  const fireAll = () => {
    pending.filter((p) => !p.cancelled).forEach((p) => {
      p.fn();
    });
  };
  return { timer, fireAll, pending };
};

const deferred = () => {
  let resolve!: (r: Result<HealthReport, ApiError>) => void;
  const promise = new Promise<Result<HealthReport, ApiError>>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const run = (api: SaludApi, timer: Timer) => {
  const seen: ServerStatus['kind'][] = [];
  const done = checkServer({ api, timer, wakingAfterMs: 3000 }, new AbortController().signal, (s) => {
    seen.push(s.kind);
  });
  return { seen, done };
};

describe('checkServer', () => {
  it('respuesta rápida: checking → ok, sin pasar por «despertando»', async () => {
    const { timer, fireAll, pending } = fakeTimer();
    const { seen, done } = run({ getHealth: () => Promise.resolve(ok(report('ok'))) }, timer);
    expect(await done).toEqual({ kind: 'ok' });
    fireAll();
    expect(seen).toEqual(['checking', 'ok']);
    expect(pending.every((p) => p.cancelled)).toBe(true);
  });

  it('respuesta lenta: checking → waking → ok', async () => {
    const { timer, fireAll } = fakeTimer();
    const d = deferred();
    const { seen, done } = run({ getHealth: () => d.promise }, timer);
    fireAll();
    d.resolve(ok(report('ok')));
    expect(await done).toEqual({ kind: 'ok' });
    expect(seen).toEqual(['checking', 'waking', 'ok']);
  });

  it('base degradada se informa como degraded', async () => {
    const { timer } = fakeTimer();
    const { done } = run({ getHealth: () => Promise.resolve(ok(report('degraded'))) }, timer);
    expect(await done).toEqual({ kind: 'degraded' });
  });

  it('error de red se informa como unreachable', async () => {
    const { timer } = fakeTimer();
    const { done } = run({ getHealth: () => Promise.resolve(err({ kind: 'NETWORK' })) }, timer);
    expect(await done).toEqual({ kind: 'unreachable' });
  });
});
