import sharp from 'sharp'
import { readdirSync, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = join(__dirname, '..', 'public')

const images = readdirSync(PUBLIC_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f))

for (const img of images) {
  const src  = join(PUBLIC_DIR, img)
  const dest = join(PUBLIC_DIR, basename(img, extname(img)) + '.webp')
  if (existsSync(dest)) { console.log(`skip  ${img} (webp exists)`); continue }
  await sharp(src).webp({ quality: 85 }).toFile(dest)
  console.log(`converted  ${img}  →  ${basename(dest)}`)
}
