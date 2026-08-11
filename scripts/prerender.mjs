#!/usr/bin/env node
//
// Build-time static prerendering.
//
// Runs the normal client build, then builds an SSR bundle from
// src/entry-server.tsx, renders every route in src/routes.ts through
// renderToString, and writes real HTML to dist/<route>/index.html.
//
// The output is exactly React's initial render, which is what hydrateRoot
// expects. That is the reason for renderToString over a headless-browser
// snapshotter: a crawler would capture the DOM *after* effects have run
// (carousels already carrying `is-playing`, the globe canvas already sized by
// cobe) and every one of those would be a hydration mismatch.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import { writeSitemap } from './generate-sitemap.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const SSR_DIR = path.join(ROOT, '.ssr')

// --dev builds with React's development bundles so hydration mismatches print
// full messages in the browser console instead of minified error codes.
//
// `mode` alone is not enough: for `vite build` it only drives .env loading and
// import.meta.env.MODE, while NODE_ENV stays "production" — which is what picks
// React's minified bundle. Define it explicitly.
const DEV = process.argv.includes('--dev')
const MODE = DEV ? 'development' : 'production'
const DEV_DEFINE = DEV
  ? { 'process.env.NODE_ENV': JSON.stringify('development') }
  : {}

const t0 = Date.now()
const log = (...a) => console.log('\x1b[36m[prerender]\x1b[0m', ...a)

/* ---------------------------------------------------------------- 1. client */
log(`client build (mode=${MODE})`)
await build({
  root: ROOT,
  mode: MODE,
  define: DEV_DEFINE,
  build: { outDir: 'dist', emptyOutDir: true },
})

/* ---------------------------------------------------------------- 2. server */
// Output goes to .ssr/ at the repo root, not dist/: the client build runs first
// with emptyOutDir, and anything under dist/ would also be publicly served.
log('ssr build')
await build({
  root: ROOT,
  mode: MODE,
  // Bundle every dependency so Node never resolves a bare specifier at runtime.
  // react-router-dom has no "exports" map, so plain ESM cannot resolve
  // react-router-dom/server; cobe and phenomenon are ESM-only.
  define: DEV_DEFINE,
  ssr: { noExternal: true },
  build: {
    ssr: 'src/entry-server.tsx',
    outDir: '.ssr',
    emptyOutDir: true,
    minify: false,
    copyPublicDir: false,
    rollupOptions: { output: { format: 'es', entryFileNames: 'entry-server.js' } },
  },
})

/* ---------------------------------------------------------------- 3. render */
const { render, ROUTES } = await import(
  pathToFileURL(path.join(SSR_DIR, 'entry-server.js')).href
)

// Read the template BEFORE the '/' route overwrites dist/index.html.
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
for (const marker of ['<!--app-head-->', '<!--app-html-->']) {
  if (!template.includes(marker)) {
    throw new Error(`dist/index.html is missing ${marker} — check index.html`)
  }
}

let totalBytes = 0

for (const route of ROUTES) {
  let out
  try {
    out = render(route.path)
  } catch (err) {
    throw new Error(`render failed for ${route.path}\n${err.stack || err}`)
  }
  const { html, head } = out

  // Guard 1: every route must mount <SEO/>.
  if (!head.includes('<title')) {
    throw new Error(
      `${route.path} produced no <title> — is <SEO/> rendered on that page?`
    )
  }
  // Guard 2: catch route-list drift against src/App.tsx.
  if (route.path !== '/404' && html.includes('notfound-code')) {
    throw new Error(
      `${route.path} fell through to <NotFound/> — add it to src/App.tsx`
    )
  }

  const page = template
    .replace('<!--app-head-->', head)
    .replace('<!--app-html-->', html)

  const rel =
    route.out ??
    (route.path === '/' ? 'index.html' : `${route.path.replace(/^\//, '')}/index.html`)
  const file = path.join(DIST, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, page, 'utf8')

  totalBytes += Buffer.byteLength(page)
  log(`  ${route.path.padEnd(46)} -> dist/${rel}`)
}

/* --------------------------------------------------------------- 4. sitemap */
writeSitemap(ROUTES, DIST)
const indexed = ROUTES.filter((r) => r.sitemap !== false).length
log(`  sitemap -> dist/sitemap.xml (${indexed} urls)`)

log(
  `${ROUTES.length} pages, ${(totalBytes / 1024).toFixed(0)} kB HTML, ` +
    `${((Date.now() - t0) / 1000).toFixed(1)}s`
)
