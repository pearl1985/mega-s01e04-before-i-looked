import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/index.js';
import { lane } from './lane.js';
import { nightsWithCounts, readStatus } from './status.js';
import { Digest, NoNight } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', async (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} nights={await nightsWithCounts(config.runsDir)} />
      </Layout>,
    ),
  );

  app.get('/api/digest/:night', async (c) => {
    const night = c.req.param('night');
    const digest = await readNight(config.runsDir, night);
    if (!digest) return c.json({ error: `no run log for ${night}` }, 404);
    return c.json(digest);
  });

  app.get('/digest/:night', async (c) => {
    const night = c.req.param('night');
    const data = await readNight(config.runsDir, night);
    if (!data) {
      return c.html(
        <Layout title={`digest ${night}`} lane={lane()}>
          <NoNight night={night} />
        </Layout>,
        404,
      );
    }
    return c.html(
      <Layout title={`digest ${night}`} lane={lane()}>
        <Digest night={data} />
      </Layout>,
    );
  });

  return app;
}
