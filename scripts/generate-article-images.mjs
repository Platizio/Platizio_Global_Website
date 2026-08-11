#!/usr/bin/env node
//
// Generates on-brand hero / OG cards for articles that don't have artwork yet.
//
// The nine original articles use photography with a navy overlay. New articles
// ship generated cards in the same palette and typographic hierarchy so the
// grid reads consistently. These are placeholders by design — drop a real
// image at public/articles/<slug>.jpg and this script will skip that slug.
//
//   node scripts/generate-article-images.mjs          # only missing cards
//   node scripts/generate-article-images.mjs --force  # redraw all generated

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public', 'articles')
const FORCE = process.argv.includes('--force')

const W = 1200
const H = 630

const NAVY_DEEP = '#061a30'
const NAVY = '#0A2540'
const NAVY_SOFT = '#14365E'
const GOLD_LIGHT = '#E2682A'
const GOLD = '#B94B12'

const FONT = 'Liberation Sans, DejaVu Sans, sans-serif'

const esc = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * Greedy word wrap. Width is estimated from per-character advances rather than
 * measured, which is fine here: the caller drops a font size until the block
 * fits, so a slightly conservative estimate just means marginally smaller text.
 */
const WIDE = new Set('MW@%'.split(''))
const NARROW = new Set('ilIjft.,:;\'"|!()[]-'.split(''))
const textWidth = (text, size) => {
  let units = 0
  for (const ch of text) {
    if (WIDE.has(ch)) units += 0.92
    else if (NARROW.has(ch)) units += 0.31
    else if (ch === ' ') units += 0.28
    else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) units += 0.68
    else units += 0.55
  }
  return units * size
}

const wrap = (text, size, maxWidth) => {
  const lines = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (textWidth(candidate, size) <= maxWidth || !line) line = candidate
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Shrink the title until it fits the available box. */
const fitTitle = (title, maxWidth, maxLines) => {
  for (let size = 64; size >= 34; size -= 2) {
    const lines = wrap(title, size, maxWidth)
    if (lines.length <= maxLines) return { size, lines }
  }
  const size = 34
  return { size, lines: wrap(title, size, maxWidth).slice(0, maxLines) }
}

export const card = ({ title, category }) => {
  const PAD = 84
  const maxWidth = W - PAD * 2
  const { size, lines } = fitTitle(title, maxWidth, 4)
  const lineHeight = Math.round(size * 1.22)

  // Vertically centre the title block, leaving room for eyebrow and wordmark.
  const blockHeight = lines.length * lineHeight
  const startY = Math.round((H - blockHeight) / 2 + size * 0.34)

  const titleTspans = lines
    .map(
      (l, i) =>
        `<tspan x="${PAD}" y="${startY + i * lineHeight}">${esc(l)}</tspan>`
    )
    .join('')

  // Sparse dot grid in the lower right, echoing the globe motif.
  let dots = ''
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 11; c++) {
      const cx = W - PAD - c * 26
      const cy = H - 70 - r * 26
      const o = (0.16 * (7 - r)) / 7
      dots += `<circle cx="${cx}" cy="${cy}" r="2.1" fill="${GOLD_LIGHT}" opacity="${o.toFixed(3)}"/>`
    }
  }

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NAVY_SOFT}"/>
      <stop offset="55%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="${NAVY_DEEP}"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${GOLD_LIGHT}"/>
      <stop offset="100%" stop-color="${GOLD}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g>${dots}</g>
  <path d="M0 ${H} L0 ${H - 190} L360 ${H} Z" fill="${GOLD}" opacity="0.10"/>
  <rect x="0" y="0" width="10" height="${H}" fill="url(#rule)"/>

  <text x="${PAD}" y="${startY - Math.round(size * 0.9) - 34}"
        font-family="${FONT}" font-size="21" font-weight="bold"
        letter-spacing="3.4" fill="${GOLD_LIGHT}">${esc(category.toUpperCase())}</text>

  <text font-family="${FONT}" font-size="${size}" font-weight="bold"
        fill="#FFFFFF">${titleTspans}</text>

  <rect x="${PAD}" y="${H - 118}" width="64" height="4" rx="2" fill="url(#rule)"/>
  <text x="${PAD}" y="${H - 76}" font-family="${FONT}" font-size="23"
        font-weight="bold" letter-spacing="1.6" fill="#FFFFFF"
        opacity="0.92">PLATIZIO GLOBAL</text>
</svg>`)
}

export async function generateArticleImages(articles) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  let made = 0
  let skipped = 0

  for (const a of articles) {
    const slug = a.slug
    // Respect real artwork: only ever write to our own generated filename, and
    // never overwrite an article already pointing somewhere else.
    const target = path.join(OUT_DIR, `${slug}.jpg`)
    const usesGenerated = a.logo === `/articles/${slug}.jpg`

    if (!usesGenerated) {
      skipped++
      continue
    }
    if (fs.existsSync(target) && !FORCE) {
      skipped++
      continue
    }

    await sharp(card({ title: a.title, category: a.category }))
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(target)
    made++
    console.log(`  generated public/articles/${slug}.jpg`)
  }

  console.log(`article images: ${made} generated, ${skipped} left alone`)
}

// Standalone: read the registry through the compiled SSR bundle if present,
// otherwise ask the caller to build first.
if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const { pathToFileURL } = await import('node:url')
  const entry = path.join(ROOT, '.ssr', 'entry-server.js')
  if (!fs.existsSync(entry)) {
    console.error('No .ssr/entry-server.js — run `npm run build` once first.')
    process.exit(1)
  }
  // The SSR bundle re-exports the route list; pull ARTICLES via a tiny shim.
  const mod = await import(pathToFileURL(entry).href)
  const articles = mod.ARTICLES_FOR_TOOLING
  if (!articles) {
    console.error('entry-server.js does not export ARTICLES_FOR_TOOLING.')
    process.exit(1)
  }
  await generateArticleImages(articles)
}
