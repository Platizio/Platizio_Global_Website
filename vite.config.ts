import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage } from 'node:http'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

/** Collects a request body, so POST endpoints behave in dev as on Vercel. */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => resolve(data))
  })
}

/**
 * Serves the api/ folder during `npm run dev`.
 *
 * In production Vercel routes /api itself; Vite knows nothing about it, so
 * without this the local site has no data source — the market sections
 * silently unmount and newsletter signup fails, which looks deliberate and is
 * therefore easy to miss.
 *
 * Routing is generic: /api/<name> resolves to api/<name>.ts if that file
 * exists. A new endpoint works locally the moment it is written, with no edit
 * here — the previous version hardcoded /api/quotes and silently 404ed
 * everything else.
 *
 * ssrLoadModule keeps handlers hot-reloading like the rest of the app.
 */
function devApi(mode: string): Plugin {
  return {
    name: 'platizio-dev-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      // Handlers read process.env, but Vite only exposes VITE_-prefixed vars to
      // the client. Load .env.local into the process for parity with how Vercel
      // populates a function's environment.
      const env = loadEnv(mode, process.cwd(), '')
      for (const [key, value] of Object.entries(env)) {
        const isServerVar = key.startsWith('VIEWTRADE_') || key.startsWith('NEWSLETTER_')
        if (isServerVar && !process.env[key]) process.env[key] = value
      }

      server.middlewares.use('/api', async (req, res, next) => {
        // req.url is relative to the mount point, so "/quotes" here.
        const name = (req.url ?? '').split('?')[0].replace(/^\/+/, '').replace(/\/+$/, '')

        // Anchored allowlist: no dots, no slashes, so the name cannot escape
        // the api/ directory.
        if (!/^[a-z0-9-]+$/.test(name)) return next()

        const file = path.join(process.cwd(), 'api', `${name}.ts`)
        if (!fs.existsSync(file)) return next()

        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const method = req.method ?? 'GET'
          const hasBody = method !== 'GET' && method !== 'HEAD'

          const response: Response = await mod.default(
            new Request(`http://localhost/api/${name}`, {
              method,
              headers: { 'Content-Type': String(req.headers['content-type'] ?? 'application/json') },
              body: hasBody ? await readBody(req) : undefined,
            }),
          )

          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(await response.text())
        } catch (err) {
          // Mirror the handlers' own failure contract, so local behaviour
          // matches production rather than returning an HTML error page.
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Handler failed' }))
          server.config.logger.error(`[dev-api] ${name}: ${(err as Error).message}`)
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
