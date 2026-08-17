import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Serves api/quotes.ts during `npm run dev`.
 *
 * In production Vercel routes /api itself; Vite knows nothing about it, so
 * without this the homepage would have no data source locally and the market
 * sections would silently unmount — the one failure mode we'd never notice
 * because it looks deliberate.
 *
 * ssrLoadModule keeps the handler hot-reloading like the rest of the app.
 */
function devApi(mode: string): Plugin {
  return {
    name: 'platizio-dev-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      // The handler reads process.env, but Vite only exposes VITE_-prefixed
      // vars to the client. Load .env.local into the process for parity with
      // how Vercel populates the function's environment.
      const env = loadEnv(mode, process.cwd(), '')
      for (const [k, v] of Object.entries(env)) {
        if (k.startsWith('VIEWTRADE_') && !process.env[k]) process.env[k] = v
      }

      server.middlewares.use('/api/quotes', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/quotes.ts')
          const response: Response = await mod.default(
            new Request(`http://localhost/api/quotes`, { method: req.method ?? 'GET' }),
          )
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(await response.text())
        } catch (err) {
          // Mirror the function's own failure contract so local behaviour
          // matches production instead of throwing an HTML error page.
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Market data unavailable' }))
          server.config.logger.error(`[dev-api] ${(err as Error).message}`)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi(mode)],
  publicDir: 'public',
  define: {
    // Baked in at build time so the prerendered HTML and the hydrating client
    // agree on the copyright year. Reading `new Date()` during render would
    // mismatch across a New Year boundary and log a hydration error.
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
  },
}))
