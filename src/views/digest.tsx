import type { DigestRow, Night } from '../digest/index.js';

const dash = '—';

function marks(row: DigestRow): string[] {
  const m: string[] = [];
  if (row.lastStatus === 'fail') m.push('FAIL');
  if (row.retries >= 3) m.push(`${row.retries} RETRIES`);
  return m;
}

function Row({ row }: { row: DigestRow }) {
  const m = marks(row);
  const cls = [row.lastStatus === 'fail' ? 'fail' : '', row.retries >= 3 ? 'retried' : ''].filter(Boolean).join(' ');
  return (
    <tr class={cls || undefined}>
      <td>
        {m.length > 0 ? <span class="flag">! {m.join(' · ')} </span> : null}
        {row.job}
      </td>
      <td>{row.owner ?? dash}</td>
      <td>{row.runs}</td>
      <td>{row.retries}</td>
      <td>{row.lastStatus}</td>
      <td>{row.lastError ?? dash}</td>
      <td>{row.firstAt}</td>
      <td>{row.lastAt}</td>
    </tr>
  );
}

export function Digest({ night }: { night: Night }) {
  const { counts, badLines, rows } = night;
  return (
    <>
      <p><a href="/">← status</a></p>
      <h1>digest {night.night}</h1>
      <p class="mute">
        ok {counts.ok} · retry {counts.retry} · fail {counts.fail}
      </p>
      {badLines > 0 ? (
        <p class="warn">
          {badLines} {badLines === 1 ? 'line' : 'lines'} did not parse
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p>nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th><th>last status</th><th>last error</th><th>first</th><th>last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row row={row} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function NoNight({ night }: { night: string }) {
  return (
    <>
      <p><a href="/">← status</a></p>
      <h1>digest {night}</h1>
      <p class="warn">no run log for {night}</p>
    </>
  );
}
