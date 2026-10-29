// Types for the morning digest (plan.md § 1). Section 2 codes against this file only.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing at the edge.
export type RunLine = {
  at: string; // original string from the log, offset kept
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job for the night.
export type DigestRow = {
  job: string;
  owner: string | null; // null is kept; the view renders `—`
  runs: number; // lines for this job
  retries: number; // lines with status `retry`
  lastStatus: RunStatus; // status of the job's last line
  lastError: string | null; // `error` of the job's last line that has one (may predate a later ok)
  firstAt: string; // `at` of the job's first line, verbatim (offset kept, never UTC)
  lastAt: string; // `at` of the job's last line, verbatim
};

export type StatusCounts = Record<RunStatus, number>;

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job (code-unit order); empty = "nothing ran"
  badLines: number; // lines that did not parse or lacked required fields
  counts: StatusCounts; // parsed lines per status; badLines are not in here
};

// null: no file for that night (or `night` is not YYYY-MM-DD) -> the route 404s.
export type ReadNight = (runsDir: string, night: string) => Promise<Night | null>;
