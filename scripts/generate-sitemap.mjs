import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const BASE_URL = 'https://platizioglobal.com'

export function buildSitemap(routes) {
  const urls = routes
    .filter((r) => r.sitemap !== false)
    .map((r) =>
      [
        '  <url>',
        `    <loc>${r.path === '/' ? `${BASE_URL}/` : BASE_URL + r.path}</loc>`,
        `    <lastmod>${r.lastmod}</lastmod>`,
        `    <changefreq>${r.changefreq}</changefreq>`,
        `    <priority>${r.priority.toFixed(1)}</priority>`,
        '  </url>',
      ].join('\n')
    )

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls.join('\n\n')}

</urlset>
`
}

export function writeSitemap(routes, outDir) {
  const xml = buildSitemap(routes)
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf8')
  return xml
}

// Standalone: `npm run sitemap` (needs a prior build for the compiled route list)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const entry = path.join(root, '.ssr', 'entry-server.js')
  if (!fs.existsSync(entry)) {
    console.error(
      'No .ssr/entry-server.js — run `npm run build` first (it writes dist/sitemap.xml itself).'
    )
    process.exit(1)
  }
  const { ROUTES } = await import(pathToFileURL(entry).href)
  writeSitemap(ROUTES, path.join(root, 'dist'))
  console.log(
    `wrote dist/sitemap.xml (${ROUTES.filter((r) => r.sitemap !== false).length} urls)`
  )
}
