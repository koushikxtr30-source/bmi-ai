/**
 * mybmi.ai — PWA Icon Generator
 * Run once: node scripts/generate-icons.mjs
 * Generates all required PNG icons in /public
 */
import { createCanvas } from 'canvas'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dir, '..', 'public')
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true })

function drawIcon(size, isMaskable = false) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const s = size
  const pad = isMaskable ? Math.round(s * 0.1) : 0

  // Background
  ctx.fillStyle = '#0c0c0e'
  const r = Math.round(s * 0.2)
  roundRect(ctx, pad, pad, s - pad * 2, s - pad * 2, r)
  ctx.fill()

  // Green top accent bar
  ctx.fillStyle = '#22c55e'
  const barH = Math.max(4, Math.round(s * 0.018))
  ctx.fillRect(pad, pad, s - pad * 2, barH)

  const cx = s / 2

  // Pivot circle
  const pcY = s * 0.34
  ctx.beginPath()
  ctx.arc(cx, pcY, s * 0.034, 0, Math.PI * 2)
  ctx.fillStyle = '#22c55e'
  ctx.fill()

  // Vertical pole
  const poleW = Math.max(4, Math.round(s * 0.04))
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.fillRect(cx - poleW / 2, pcY, poleW, s * 0.33)

  // Horizontal beam
  const beamH = Math.max(3, Math.round(s * 0.038))
  const beamY = s * 0.345
  ctx.fillRect(s * 0.25, beamY - beamH / 2, s * 0.5, beamH)

  // Left & right chains
  ctx.fillStyle = '#22c55e'
  const lx = s * 0.29, rx = s * 0.71
  const chainW = Math.max(2, Math.round(s * 0.013))
  const chainBot = s * 0.515
  ctx.fillRect(lx - chainW / 2, beamY + beamH / 2, chainW, chainBot - (beamY + beamH / 2))
  ctx.fillRect(rx - chainW / 2, beamY + beamH / 2, chainW, chainBot - (beamY + beamH / 2))

  // Pans
  const panW = s * 0.16, panH = Math.max(3, Math.round(s * 0.028))
  ctx.fillRect(lx - panW / 2, chainBot, panW, panH)
  ctx.fillRect(rx - panW / 2, chainBot, panW, panH)

  // Base bar
  const baseY = s * 0.668
  ctx.fillRect(s * 0.22, baseY, s * 0.56, Math.max(3, Math.round(s * 0.042)))

  // "bmi.ai" label
  const fontSize = Math.round(s * 0.13)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('bmi', cx - s * 0.04, s * 0.84)
  ctx.fillStyle = '#22c55e'
  ctx.font = `400 ${Math.round(fontSize * 0.5)}px system-ui, -apple-system, sans-serif`
  ctx.fillText('.ai', cx + s * 0.09, s * 0.84)

  return canvas.toBuffer('image/png')
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

const icons = [
  { size: 192,  name: 'icon-192.png',          maskable: false },
  { size: 512,  name: 'icon-512.png',          maskable: false },
  { size: 180,  name: 'apple-touch-icon.png',  maskable: false },
  { size: 192,  name: 'icon-maskable-192.png', maskable: true  },
  { size: 512,  name: 'icon-maskable-512.png', maskable: true  },
]

let hasCanvas = true
try {
  await import('canvas')
} catch {
  hasCanvas = false
}

if (!hasCanvas) {
  console.log('\n⚠️  canvas package not found. Run: npm install canvas\n')
  process.exit(1)
}

for (const { size, name, maskable } of icons) {
  const buf = drawIcon(size, maskable)
  writeFileSync(join(publicDir, name), buf)
  console.log(`✓  ${name}  (${size}×${size}${maskable ? ', maskable' : ''})`)
}

console.log('\n✅  All PWA icons generated in /public\n')
