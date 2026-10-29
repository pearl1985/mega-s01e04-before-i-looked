import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight, type StatusCounts } from './digest/index.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
};

// One night on the board: the night and its ok/retry/fail counts.
export type BoardNight = {
  night: string;
  counts: StatusCounts;
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// Nights on disk, newest first, each with its ok/retry/fail counts.
// A night readNight can't read (null) still shows, with zero counts.
export async function nightsWithCounts(runsDir: string): Promise<BoardNight[]> {
  const nights = nightsOnDisk(runsDir);
  return Promise.all(
    nights.map(async (night) => {
      const n = await readNight(runsDir, night);
      return { night, counts: n?.counts ?? { ok: 0, retry: 0, fail: 0 } };
    }),
  );
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
  };
}
