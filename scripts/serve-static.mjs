#!/usr/bin/env node
//
// Minimal static server that resolves URLs the way Vercel does, for verifying
// the prerendered build locally.
//
// `npm run preview` cannot do this job: vite preview applies SPA fallback, so
// it serves dist/index.html for every unmatched path and you end up testing the
// home page under every URL — which looks exactly like a hydration bug.
//
// Resolution order, matching Vercel's static hosting:
//   1. dist/<path>            (exact file)
//   2. dist/<path>/index.html (directory index)
//   3. dist/404.html          with a real 404 status
//
// Also mirrors `"trailingSlash": false` by 308-redirecting /foo/ -> /foo.

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4180)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
}

const send = (res, status, body, type) => {
  res.writeHead(status, { 'Content-Type': type })
  res.end(body)
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    let pathname = decodeURIComponent(url.pathname)

    // trailingSlash: false
    if (pathname.length > 1 && pathname.endsWith('/')) {
      const target = pathname.replace(/\/+$/, '') + url.search
      res.writeHead(308, { Location: target })
      return res.end()
    }

    // Refuse traversal outside dist/
    const candidate = path.join(DIST, pathname)
    if (!candidate.startsWith(DIST)) return send(res, 403, 'Forbidden', TYPES['.txt'])

    for (const file of [candidate, path.join(candidate, 'index.html')]) {
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        const type = TYPES[path.extname(file)] ?? 'application/octet-stream'
        return send(res, 200, fs.readFileSync(file), type)
      }
    }

    const notFound = path.join(DIST, '404.html')
    if (fs.existsSync(notFound)) {
      return send(res, 404, fs.readFileSync(notFound), TYPES['.html'])
    }
    return send(res, 404, 'Not Found', TYPES['.txt'])
  })
  .listen(PORT, () => {
    console.log(`serving dist/ at http://localhost:${PORT} (Vercel-style resolution)`)
  })
