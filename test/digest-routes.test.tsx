import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/index.js';

process.env.LANE_MARKER = 'TEST-MARKER';

describe('digest routes on a temp runs dir', () => {
  let dir = '';
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'rig-'));
    writeFileSync(
      join(dir, '2026-10-28.jsonl'),
      [
        '{"at":"2026-10-28T22:00:00+01:00","job":"b/job","status":"ok","owner":"ana"}',
        '{"at":"2026-10-28T22:05:00+01:00","job":"a/job","status":"fail","owner":null,"error":"boom"}',
        '{"at":"2026-10-28T22:10:00+01:00","job":"c/jo',
      ].join('\n'),
    );
    writeFileSync(join(dir, '2026-10-27.jsonl'), '');
    app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('page 200: rows, lane marker, bad line count, null owner as —', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a/job');
    expect(html).toContain('b/job');
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('1 line did not parse');
    expect(html).toContain('—');
  });

  it('page 404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('page 200 for an empty night: nothing ran', async () => {
    const res = await app.request('/digest/2026-10-27');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('page 404 for a bad night name', async () => {
    const res = await app.request('/digest/not-a-night');
    expect(res.status).toBe(404);
  });

  it('JSON 200: rows sorted by job, null owner kept, lastError, badLines, counts, firstAt verbatim', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const night = (await res.json()) as Night;
    expect(night.rows).toHaveLength(2);
    expect(night.rows[0].job).toBe('a/job');
    expect(night.rows[1].job).toBe('b/job');
    expect(night.rows[0].owner).toBeNull();
    expect(night.rows[0].lastError).toBe('boom');
    expect(night.badLines).toBe(1);
    expect(night.counts).toEqual({ ok: 1, retry: 0, fail: 1 });
    expect(night.rows[0].firstAt).toBe('2026-10-28T22:05:00+01:00');
  });

  it('JSON 404 for a night with no file, with a string error field', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: unknown };
    expect(typeof body.error).toBe('string');
  });

  it('JSON 200 for an empty night: no rows, no bad lines', async () => {
    const res = await app.request('/api/digest/2026-10-27');
    expect(res.status).toBe(200);
    const night = (await res.json()) as Night;
    expect(night.rows).toEqual([]);
    expect(night.badLines).toBe(0);
  });

  it('page and JSON agree: job names appear in the HTML in the same order', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    const night = (await (await app.request('/api/digest/2026-10-28')).json()) as Night;
    let prev = -1;
    for (const row of night.rows) {
      const idx = html.indexOf(row.job);
      expect(idx).toBeGreaterThan(prev);
      prev = idx;
    }
  });
});
