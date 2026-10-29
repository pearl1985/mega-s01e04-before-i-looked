import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/index.js';

describe('readNight on runs/', () => {
  it('2026-10-28: 5 jobs, 1 bad line', async () => {
    const n = await readNight('runs', '2026-10-28');
    expect(n).not.toBeNull();
    if (!n) return;
    expect(n.badLines).toBe(1);
    expect(n.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    const byJob = Object.fromEntries(n.rows.map((r) => [r.job, r]));
    expect(byJob['digest/render']).toMatchObject({ owner: null, runs: 1, lastStatus: 'ok', lastError: null });
    // lastError = the last error the job reported, even though its last run was ok.
    expect(byJob['fixtures/refresh']).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(byJob['lane/sync']).toMatchObject({
      runs: 8,
      retries: 1,
      lastError: 'lock held',
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
    expect(byJob['notes/backup']).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded', owner: 'lane-07' });
    expect(n.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });

  it('2026-10-27: 7 lines, all ok, no bad lines', async () => {
    const n = await readNight('runs', '2026-10-27');
    expect(n?.badLines).toBe(0);
    expect(n?.counts).toEqual({ ok: 7, retry: 0, fail: 0 });
    expect(n?.rows.reduce((s, r) => s + r.runs, 0)).toBe(7);
    expect(n?.rows.every((r) => r.lastStatus === 'ok' && r.retries === 0 && r.lastError === null)).toBe(true);
  });

  it('missing night or invalid night name -> null', async () => {
    expect(await readNight('runs', '2026-01-01')).toBeNull();
    expect(await readNight('runs', '../package')).toBeNull();
    expect(await readNight('runs', '2026-10-28.jsonl')).toBeNull();
  });
});

describe('readNight on a temp dir', () => {
  let dir = '';
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'rig-digest-'));
    await writeFile(join(dir, '2026-01-01.jsonl'), '');
    await writeFile(
      join(dir, '2026-01-02.jsonl'),
      [
        '{"at":"2026-01-02T01:00:00-05:00","job":"b","status":"fail","owner":null,"error":"boom"}',
        'not json',
        '{"at":"2026-01-02T02:00:00-05:00","job":"a","status":"maybe","owner":"x"}',
        '{"job":"a","status":"ok","owner":"x"}',
        '[1,2]',
        '',
        '{"at":"2026-01-02T03:00:00-05:00","job":"b","status":"retry","owner":null}',
        '{"at":"2026-01-02T04:00:00-05:00","job":"a","status":"ok","owner":"x"}',
      ].join('\n'),
    );
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('empty file -> zero rows, not null', async () => {
    expect(await readNight(dir, '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], badLines: 0, counts: { ok: 0, retry: 0, fail: 0 } });
  });

  it('counts bad lines (bad JSON, unknown status, missing fields), keeps null owner, offsets verbatim', async () => {
    const n = await readNight(dir, '2026-01-02');
    expect(n?.badLines).toBe(4);
    expect(n?.counts).toEqual({ ok: 1, retry: 1, fail: 1 });
    expect(n?.rows).toEqual([
      { job: 'a', owner: 'x', runs: 1, retries: 0, lastStatus: 'ok', lastError: null,
        firstAt: '2026-01-02T04:00:00-05:00', lastAt: '2026-01-02T04:00:00-05:00' },
      { job: 'b', owner: null, runs: 2, retries: 1, lastStatus: 'retry', lastError: 'boom',
        firstAt: '2026-01-02T01:00:00-05:00', lastAt: '2026-01-02T03:00:00-05:00' },
    ]);
  });
});
