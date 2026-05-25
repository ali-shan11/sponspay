const { default: EmbeddedPostgres } = require('embedded-postgres');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs/promises');
const path = require('path');
const net = require('net');

async function getFreePort(preferred = 55432) {
  // Try preferred first
  const canUsePreferred = await new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.listen(preferred, '127.0.0.1', () => s.close(() => resolve(true)));
  });
  if (canUsePreferred) return preferred;

  // Otherwise ask OS for a free port
  return await new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function main() {
  // Per-run isolated data dir (avoids ownership/stale dir issues)
  const tempBase = path.join(os.tmpdir(), 'embedded-pg-');
  const dataDir = await fs.mkdtemp(tempBase);

  const port = await getFreePort(process.env.E2E_PG_PORT ? Number(process.env.E2E_PG_PORT) : 55432);
  const isRoot = typeof process.getuid === 'function' ? process.getuid() === 0 : false;

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user: 'filip',
    password: 'startervesna',
    persistent: false, // delete cluster on stop (best-effort)
    createPostgresUser: isRoot, // only when running as root
  });

  const shutdown = async () => {
    try {
      await pg.stop();
    } catch (e) {
      // no-op
    }
    process.exit();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`[e2e] Starting embedded Postgres in ${dataDir} on port ${port}...`);
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('dev');

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    DB_HOST: '127.0.0.1',
    DB_PORT: String(port),
    DB_USER: 'filip',
    DB_PASSWORD: 'startervesna',
    DB_NAME: 'dev',
    DB_SYNC: 'true',
    ZOHO_REFRESH_TOKEN: 'dummy',
  };

  console.log(`[e2e] Running tests against embedded Postgres (port ${port})`);
  const test = spawn('npm', ['run', 'test:e2e'], { stdio: 'inherit', env });

  test.on('close', async (code) => {
    try {
      await pg.stop();
    } catch (e) {
      console.warn('[e2e] Postgres stop warning:', e?.message || e);
    }
    process.exit(code ?? 0);
  });
}

main().catch(async (err) => {
  console.error('[e2e] Fatal error:', err);
  process.exitCode = 1;
});
