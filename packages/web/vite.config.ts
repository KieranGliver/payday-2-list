import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';

/** Resolved lazily through Vite so its TypeScript is transformed for us. */
const API_ENTRY = fileURLToPath(new URL('../api/src/index.ts', import.meta.url));

type ApiModule = typeof import('@pd2/api');

/**
 * Serves /api/progress locally using the same pure handler the Lambda runs.
 *
 * Without this, the request falls through to Vite's SPA fallback and returns
 * index.html with a 200, so response.json() fails on "<!doctype html>".
 *
 * The module is loaded via server.ssrLoadModule rather than a top-level
 * import: vite.config.ts is evaluated by Node, which cannot resolve the
 * workspace package's extensionless TypeScript imports. Loading it through
 * Vite also means edits to the handler hot-reload.
 *
 * STEAM_API_KEY comes from loadEnv, so it stays in the Node process and never
 * reaches the browser bundle.
 */
function localApi(env: Record<string, string>): Plugin {
  const parsePlayers = (raw: string) =>
    raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [steamId, ...rest] = entry.split(':');
        return { steamId: (steamId ?? '').trim(), name: rest.join(':').trim() };
      });

  return {
    name: 'pd2-local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/progress', async (_req, res) => {
        res.setHeader('content-type', 'application/json');
        res.setHeader('cache-control', 'no-store');
        try {
          const apiKey = env['STEAM_API_KEY'];
          if (!apiKey) {
            throw new Error('STEAM_API_KEY missing - copy .env.example to .env.local');
          }
          const players = parsePlayers(env['PD2_PLAYERS'] ?? '');
          if (players.length === 0) throw new Error('PD2_PLAYERS missing in .env.local');

          const { getProgress, createSteamClient } = (await server.ssrLoadModule(
            API_ENTRY,
          )) as unknown as ApiModule;

          res.end(JSON.stringify(await getProgress(players, createSteamClient(apiKey))));
        } catch (cause) {
          res.statusCode = 500;
          server.config.logger.error(`[pd2-local-api] ${String(cause)}`);
          res.end(JSON.stringify({ error: String(cause) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // '' prefix loads every var, not just VITE_*.
  const env = loadEnv(mode, import.meta.dirname, '');
  return {
    plugins: [react(), tailwindcss(), localApi(env)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  };
});
