import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pub = resolve(__dirname, '../public')

const jobs = [
  // favicon
  { src: 'Favicon 32x32.svg',          out: 'favicon-32.png',          w: 32,  h: 32  },
  // PWA home screen
  { src: 'PWA Homescreen icon.svg',     out: 'icon-192.png',            w: 192, h: 192 },
  // PWA splash / store
  { src: 'PWA Splash : Store icon.svg', out: 'icon-512.png',            w: 512, h: 512 },
  // iOS home screen
  { src: 'IOS Home screen.svg',         out: 'apple-touch-icon.png',    w: 180, h: 180 },
  // maskable (same source, just resized — green bg fills safe zone)
  { src: 'PWA Homescreen icon.svg',     out: 'icon-maskable-192.png',   w: 192, h: 192 },
  { src: 'PWA Splash : Store icon.svg', out: 'icon-maskable-512.png',   w: 512, h: 512 },
]

for (const job of jobs) {
  const svgPath = resolve(pub, job.src)
  const outPath = resolve(pub, job.out)
  const svg = readFileSync(svgPath)
  await sharp(svg).resize(job.w, job.h).png().toFile(outPath)
  console.log(`✓ ${job.out} (${job.w}×${job.h})`)
}

console.log('All icons generated.')
