import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunLine, RunStatus, StatusCounts } from './types.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

export function isNight(night: string): boolean {
  return NIGHT.test(night);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStatus(v: unknown): v is RunStatus {
  return typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
}

// Parse one log line at the edge. null = bad line (counted by the caller, never thrown).
export function parseLine(line: string): RunLine | null {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRecord(v)) return null;
  const { at, job, status, owner, error } = v;
  if (typeof at !== 'string' || typeof job !== 'string' || job === '') return null;
  if (!isStatus(status)) return null;
  if (owner !== null && typeof owner !== 'string') return null;
  if (error !== undefined && typeof error !== 'string') return null;
  return error === undefined ? { at, job, status, owner } : { at, job, status, owner, error };
}

// Pure: lines in log order -> one row per job, sorted by job (code-unit order, stable).
// owner: the job's last line's owner (null kept as null).
// lastError: the `error` of the job's last line that has one, even if a later run was ok,
// so the digest still says why a job retried. null when no line for the job had an error.
export function toRows(lines: RunLine[]): DigestRow[] {
  const rows = new Map<string, DigestRow>();
  for (const l of lines) {
    const row = rows.get(l.job);
    if (!row) {
      rows.set(l.job, {
        job: l.job,
        owner: l.owner,
        runs: 1,
        retries: l.status === 'retry' ? 1 : 0,
        lastStatus: l.status,
        lastError: l.error ?? null,
        firstAt: l.at,
        lastAt: l.at,
      });
      continue;
    }
    row.owner = l.owner;
    row.runs += 1;
    if (l.status === 'retry') row.retries += 1;
    row.lastStatus = l.status;
    if (l.error !== undefined) row.lastError = l.error;
    row.lastAt = l.at;
  }
  return [...rows.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
}

// Jobs per last status (for the board's ok / retry / fail counts).
export function countByLastStatus(rows: DigestRow[]): StatusCounts {
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  for (const r of rows) counts[r.lastStatus] += 1;
  return counts;
}

// null when `night` is not YYYY-MM-DD (checked before touching the filesystem) or no file exists.
// Blank lines are skipped, not counted as bad.
export const readNight: ReadNight = async (runsDir, night) => {
  if (!isNight(night)) return null;
  let text: string;
  try {
    text = await readFile(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (e) {
    if (isRecord(e) && e.code === 'ENOENT') return null;
    throw e;
  }
  const lines: RunLine[] = [];
  let badLines = 0;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line) lines.push(line);
    else badLines += 1;
  }
  const result: Night = { night, rows: toRows(lines), badLines };
  return result;
};
