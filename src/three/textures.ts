import * as THREE from 'three'

/**
 * Real material textures, drawn at runtime rather than downloaded.
 *
 * Each material paints two passes: a colour pass and a height pass. The height
 * pass is turned into a normal map, which is what actually makes brick read as
 * brick: the mortar sinks, the bricks catch light on their top edge. Painting
 * colour alone just looks like a photo stuck on a flat board.
 *
 * Nothing here is fetched, so there are no image requests and nothing extra in
 * the bundle. Everything is generated once, cached, and shared.
 */

const SIZE = 512

interface Built {
  map: THREE.Texture
  normalMap: THREE.Texture | null
  /** How many times the pattern should repeat per metre of surface. */
  perMetre: number
  roughness: number
  metalness: number
}

const cache = new Map<string, Built | null>()

function ctx2d(size = SIZE) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  return { c, g }
}

/** Deterministic pseudo random, so a texture looks the same every run. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function jitter(hex: string, dl: number, dh = 0, ds = 0) {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(
    (hsl.h + dh + 1) % 1,
    Math.min(1, Math.max(0, hsl.s + ds)),
    Math.min(1, Math.max(0, hsl.l + dl)),
  )
  return `#${c.getHexString()}`
}

/** Sobel over the height pass to produce a tangent space normal map. */
function heightToNormal(height: CanvasRenderingContext2D, strength: number) {
  const src = height.getImageData(0, 0, SIZE, SIZE).data
  const { c, g } = ctx2d()
  const out = g.createImageData(SIZE, SIZE)
  const at = (x: number, y: number) => {
    const xx = (x + SIZE) % SIZE
    const yy = (y + SIZE) % SIZE
    return src[(yy * SIZE + xx) * 4] / 255
  }

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1))
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1))

      let nx = dx * strength
      let ny = dy * strength
      const nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len

      const i = (y * SIZE + x) * 4
      out.data[i] = (nx * 0.5 + 0.5) * 255
      out.data[i + 1] = (ny * 0.5 + 0.5) * 255
      out.data[i + 2] = (nz / len) * 255
      out.data[i + 3] = 255
    }
  }
  g.putImageData(out, 0, 0)
  return c
}

/** Fills the whole canvas with fine grain, used under most materials. */
function grain(g: CanvasRenderingContext2D, base: string, amount: number, seed: number) {
  const r = rng(seed)
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = jitter(base, (r() - 0.5) * amount)
    g.fillRect(r() * SIZE, r() * SIZE, 1 + r() * 2, 1 + r() * 2)
  }
}

type Paint = (colour: CanvasRenderingContext2D, height: CanvasRenderingContext2D) => void

interface Recipe {
  paint: Paint
  perMetre: number
  roughness: number
  metalness: number
  /** How strongly the height pass bends the surface normal. */
  bump: number
}

/* ------------------------------------------------------------------ *
 * The materials
 * ------------------------------------------------------------------ */

/** Running bond brick, sized like the reference: ~215 x 65mm with 10mm joints. */
const brick: Paint = (g, h) => {
  const rows = 8
  const bh = SIZE / rows
  const bw = bh * 3.3
  const joint = Math.max(2, bh * 0.14)
  const r = rng(7)

  g.fillStyle = '#c3bcb0'
  g.fillRect(0, 0, SIZE, SIZE)
  h.fillStyle = '#3a3a3a'
  h.fillRect(0, 0, SIZE, SIZE)

  for (let row = 0; row < rows; row++) {
    const y = row * bh
    const offset = row % 2 ? -bw / 2 : 0
    for (let x = offset - bw; x < SIZE + bw; x += bw) {
      // every brick its own colour, which is what stops it looking like wallpaper
      const tone = jitter('#a04429', (r() - 0.5) * 0.085, (r() - 0.5) * 0.012, (r() - 0.5) * 0.07)
      const bx = x + joint / 2
      const by = y + joint / 2
      const w = bw - joint
      const hh = bh - joint

      g.fillStyle = tone
      g.fillRect(bx, by, w, hh)

      // a lit top edge and a shaded bottom edge give each brick some body
      g.fillStyle = jitter(tone, 0.04)
      g.fillRect(bx, by, w, Math.max(1, hh * 0.14))
      g.fillStyle = jitter(tone, -0.045)
      g.fillRect(bx, by + hh * 0.86, w, Math.max(1, hh * 0.14))

      // speckle within the brick face
      for (let i = 0; i < 26; i++) {
        g.fillStyle = jitter(tone, (r() - 0.5) * 0.075)
        g.fillRect(bx + r() * w, by + r() * hh, 1 + r() * 2.5, 1 + r() * 2)
      }

      // height: brick face proud, mortar recessed
      h.fillStyle = `rgb(${210 + Math.floor(r() * 30)},${210},${210})`
      h.fillRect(bx, by, w, hh)
    }
  }
}

/** Blades standing at slightly different heights, in several greens. */
const grass: Paint = (g, h) => {
  const r = rng(11)
  g.fillStyle = '#3f6b2c'
  g.fillRect(0, 0, SIZE, SIZE)
  h.fillStyle = '#4a4a4a'
  h.fillRect(0, 0, SIZE, SIZE)

  // clumps of lighter and darker turf underneath
  for (let i = 0; i < 220; i++) {
    g.fillStyle = jitter('#4b7d33', (r() - 0.5) * 0.16, (r() - 0.5) * 0.03)
    g.beginPath()
    g.ellipse(r() * SIZE, r() * SIZE, 12 + r() * 34, 10 + r() * 26, r() * 3, 0, 7)
    g.fill()
  }

  for (let i = 0; i < 14000; i++) {
    const x = r() * SIZE
    const y = r() * SIZE
    const len = 5 + r() * 11
    const lean = (r() - 0.5) * 6
    const shade = (r() - 0.4) * 0.26
    g.strokeStyle = jitter('#5a9440', shade, (r() - 0.5) * 0.02, (r() - 0.5) * 0.1)
    g.lineWidth = 0.8 + r() * 1.5
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + lean * 0.5, y - len * 0.6, x + lean, y - len)
    g.stroke()

    const v = 150 + Math.floor(r() * 105)
    h.strokeStyle = `rgb(${v},${v},${v})`
    h.lineWidth = 1.4
    h.beginPath()
    h.moveTo(x, y)
    h.quadraticCurveTo(x + lean * 0.5, y - len * 0.6, x + lean, y - len)
    h.stroke()
  }
}

/** Loose stones of mixed size sitting in dust. */
const gravel: Paint = (g, h) => {
  const r = rng(23)
  g.fillStyle = '#6f6a61'
  g.fillRect(0, 0, SIZE, SIZE)
  h.fillStyle = '#2e2e2e'
  h.fillRect(0, 0, SIZE, SIZE)

  for (let pass = 0; pass < 3; pass++) {
    const count = [900, 600, 300][pass]
    const min = [2.5, 4.5, 7][pass]
    const max = [5, 9, 14][pass]
    for (let i = 0; i < count; i++) {
      const x = r() * SIZE
      const y = r() * SIZE
      const rx = min + r() * (max - min)
      const ry = rx * (0.6 + r() * 0.5)
      const rot = r() * Math.PI
      const tone = jitter('#9a948a', (r() - 0.45) * 0.34, (r() - 0.5) * 0.04, (r() - 0.5) * 0.08)

      g.fillStyle = tone
      g.beginPath()
      g.ellipse(x, y, rx, ry, rot, 0, 7)
      g.fill()
      // highlight on the upper left of each stone
      g.fillStyle = jitter(tone, 0.1)
      g.beginPath()
      g.ellipse(x - rx * 0.22, y - ry * 0.24, rx * 0.55, ry * 0.5, rot, 0, 7)
      g.fill()

      const v = 120 + Math.floor(rx * 9)
      h.fillStyle = `rgb(${v},${v},${v})`
      h.beginPath()
      h.ellipse(x, y, rx, ry, rot, 0, 7)
      h.fill()
    }
  }
}

/** Coursed stone blocks with deep joints. */
const stone: Paint = (g, h) => {
  const r = rng(31)
  g.fillStyle = '#6c675e'
  g.fillRect(0, 0, SIZE, SIZE)
  h.fillStyle = '#3a3a3a'
  h.fillRect(0, 0, SIZE, SIZE)

  const rows = 5
  const rh = SIZE / rows
  for (let row = 0; row < rows; row++) {
    let x = -r() * 60
    while (x < SIZE) {
      const w = 55 + r() * 90
      const tone = jitter('#8f8a80', (r() - 0.45) * 0.2, 0, (r() - 0.5) * 0.05)
      const pad = 4
      g.fillStyle = tone
      g.beginPath()
      g.roundRect(x + pad, row * rh + pad, w - pad * 2, rh - pad * 2, 5)
      g.fill()
      for (let i = 0; i < 60; i++) {
        g.fillStyle = jitter(tone, (r() - 0.5) * 0.16)
        g.fillRect(x + pad + r() * (w - pad * 2), row * rh + pad + r() * (rh - pad * 2), 2, 2)
      }
      h.fillStyle = `rgb(${200 + Math.floor(r() * 40)},220,220)`
      h.beginPath()
      h.roundRect(x + pad, row * rh + pad, w - pad * 2, rh - pad * 2, 5)
      h.fill()
      x += w
    }
  }
}

/** Planks with grain, knots and visible seams. */
const wood: Paint = (g, h) => {
  const r = rng(43)
  const planks = 5
  const pw = SIZE / planks
  g.fillStyle = '#8a5a2f'
  g.fillRect(0, 0, SIZE, SIZE)
  h.fillStyle = '#c8c8c8'
  h.fillRect(0, 0, SIZE, SIZE)

  for (let p = 0; p < planks; p++) {
    const x0 = p * pw
    const base = jitter('#9c6634', (r() - 0.5) * 0.14, (r() - 0.5) * 0.01, (r() - 0.5) * 0.1)
    g.fillStyle = base
    g.fillRect(x0, 0, pw, SIZE)

    // grain lines running along the plank
    for (let i = 0; i < 90; i++) {
      const x = x0 + r() * pw
      g.strokeStyle = jitter(base, (r() - 0.55) * 0.22)
      g.lineWidth = 0.6 + r() * 2
      g.beginPath()
      g.moveTo(x, 0)
      g.bezierCurveTo(x + (r() - 0.5) * 10, SIZE * 0.33, x + (r() - 0.5) * 10, SIZE * 0.66, x, SIZE)
      g.stroke()
    }
    // a knot or two
    for (let k = 0; k < 2; k++) {
      if (r() > 0.55) continue
      const kx = x0 + pw * (0.25 + r() * 0.5)
      const ky = r() * SIZE
      for (let ring = 6; ring > 0; ring--) {
        g.strokeStyle = jitter(base, -0.06 * ring * 0.4)
        g.lineWidth = 1.6
        g.beginPath()
        g.ellipse(kx, ky, ring * 2.2, ring * 3.4, 0, 0, 7)
        g.stroke()
      }
    }
    // plank seam, recessed
    g.fillStyle = jitter(base, -0.22)
    g.fillRect(x0, 0, 2.5, SIZE)
    h.fillStyle = '#3c3c3c'
    h.fillRect(x0, 0, 3, SIZE)
  }
}

/** Brushed metal: fine directional streaks. */
const metal: Paint = (g, h) => {
  const r = rng(53)
  g.fillStyle = '#9aa1a8'
  g.fillRect(0, 0, SIZE, SIZE)
  h.fillStyle = '#808080'
  h.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < 5200; i++) {
    const y = r() * SIZE
    g.strokeStyle = jitter('#9aa1a8', (r() - 0.5) * 0.16)
    g.lineWidth = 0.5 + r()
    g.beginPath()
    g.moveTo(r() * SIZE - 60, y)
    g.lineTo(r() * SIZE + 60, y)
    g.stroke()
  }
  grain(h, '#808080', 0.06, 54)
}

/** Float glass: mostly clean with faint sheen bands. */
const glass: Paint = (g, h) => {
  const r = rng(61)
  g.fillStyle = '#cfe3ec'
  g.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < 16; i++) {
    g.globalAlpha = 0.05 + r() * 0.06
    g.fillStyle = '#ffffff'
    g.save()
    g.translate(r() * SIZE, r() * SIZE)
    g.rotate(-0.6)
    g.fillRect(-SIZE, 0, SIZE * 2, 8 + r() * 26)
    g.restore()
  }
  g.globalAlpha = 1
  h.fillStyle = '#808080'
  h.fillRect(0, 0, SIZE, SIZE)
}

/** Poured concrete: blotchy, with pinholes. */
const concrete: Paint = (g, h) => {
  const r = rng(71)
  g.fillStyle = '#a8a49e'
  g.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < 260; i++) {
    g.fillStyle = jitter('#a8a49e', (r() - 0.5) * 0.1)
    g.beginPath()
    g.ellipse(r() * SIZE, r() * SIZE, 20 + r() * 70, 18 + r() * 60, r() * 3, 0, 7)
    g.fill()
  }
  grain(g, '#a8a49e', 0.1, 72)
  h.fillStyle = '#b4b4b4'
  h.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < 900; i++) {
    const s = 1 + r() * 3
    h.fillStyle = '#5a5a5a'
    h.beginPath()
    h.ellipse(r() * SIZE, r() * SIZE, s, s, 0, 0, 7)
    h.fill()
  }
}

/** Skimmed plaster: almost flat, faint trowel sweep. */
const plaster: Paint = (g, h) => {
  const r = rng(83)
  g.fillStyle = '#e6e1d8'
  g.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < 120; i++) {
    g.globalAlpha = 0.05
    g.strokeStyle = jitter('#e6e1d8', (r() - 0.5) * 0.2)
    g.lineWidth = 8 + r() * 26
    g.beginPath()
    const x = r() * SIZE
    const y = r() * SIZE
    g.moveTo(x, y)
    g.quadraticCurveTo(x + 60, y + (r() - 0.5) * 50, x + 140, y + (r() - 0.5) * 30)
    g.stroke()
  }
  g.globalAlpha = 1
  grain(g, '#e6e1d8', 0.03, 84)
  h.fillStyle = '#9a9a9a'
  h.fillRect(0, 0, SIZE, SIZE)
  grain(h, '#9a9a9a', 0.05, 85)
}

/** Glazed floor tiles with grout lines. */
const tile: Paint = (g, h) => {
  const r = rng(97)
  const n = 4
  const s = SIZE / n
  g.fillStyle = '#9d968b'
  g.fillRect(0, 0, SIZE, SIZE)
  h.fillStyle = '#404040'
  h.fillRect(0, 0, SIZE, SIZE)
  const grout = 5
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const tone = jitter('#ded6c8', (r() - 0.5) * 0.06)
      g.fillStyle = tone
      g.fillRect(x * s + grout, y * s + grout, s - grout * 2, s - grout * 2)
      for (let i = 0; i < 90; i++) {
        g.fillStyle = jitter(tone, (r() - 0.5) * 0.07)
        g.fillRect(x * s + grout + r() * (s - grout * 2), y * s + grout + r() * (s - grout * 2), 2, 2)
      }
      h.fillStyle = '#e0e0e0'
      h.fillRect(x * s + grout, y * s + grout, s - grout * 2, s - grout * 2)
    }
  }
}

/** Woven cloth. */
const fabric: Paint = (g, h) => {
  const r = rng(101)
  g.fillStyle = '#d9d5cc'
  g.fillRect(0, 0, SIZE, SIZE)
  h.fillStyle = '#808080'
  h.fillRect(0, 0, SIZE, SIZE)
  const step = 6
  for (let y = 0; y < SIZE; y += step) {
    for (let x = 0; x < SIZE; x += step) {
      const up = ((x / step + y / step) | 0) % 2 === 0
      g.fillStyle = jitter('#e7e3da', up ? 0.03 : -0.05, 0, (r() - 0.5) * 0.02)
      g.fillRect(x, y, step - 1, step - 1)
      h.fillStyle = up ? '#c0c0c0' : '#606060'
      h.fillRect(x, y, step - 1, step - 1)
    }
  }
}

/** Bare earth. */
const soil: Paint = (g, h) => {
  const r = rng(113)
  g.fillStyle = '#7a5c40'
  g.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < 400; i++) {
    g.fillStyle = jitter('#7a5c40', (r() - 0.5) * 0.2, 0, (r() - 0.5) * 0.06)
    g.beginPath()
    g.ellipse(r() * SIZE, r() * SIZE, 8 + r() * 30, 7 + r() * 22, r() * 3, 0, 7)
    g.fill()
  }
  grain(g, '#7a5c40', 0.16, 114)
  h.fillStyle = '#808080'
  h.fillRect(0, 0, SIZE, SIZE)
  grain(h, '#808080', 0.5, 115)
}

/** Fine sand. */
const sand: Paint = (g, h) => {
  const r = rng(127)
  g.fillStyle = '#d8c79b'
  g.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < 60; i++) {
    g.globalAlpha = 0.08
    g.strokeStyle = jitter('#d8c79b', (r() - 0.5) * 0.12)
    g.lineWidth = 6 + r() * 16
    g.beginPath()
    const y = r() * SIZE
    g.moveTo(0, y)
    g.bezierCurveTo(SIZE * 0.3, y + (r() - 0.5) * 40, SIZE * 0.7, y + (r() - 0.5) * 40, SIZE, y)
    g.stroke()
  }
  g.globalAlpha = 1
  grain(g, '#d8c79b', 0.1, 128)
  h.fillStyle = '#808080'
  h.fillRect(0, 0, SIZE, SIZE)
  grain(h, '#808080', 0.35, 129)
}

/** Kiln fired clay roof tile. */
const clay: Paint = (g, h) => {
  const r = rng(137)
  g.fillStyle = '#b0563a'
  g.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < 300; i++) {
    g.fillStyle = jitter('#b0563a', (r() - 0.5) * 0.16, (r() - 0.5) * 0.02, (r() - 0.5) * 0.1)
    g.beginPath()
    g.ellipse(r() * SIZE, r() * SIZE, 10 + r() * 36, 9 + r() * 28, r() * 3, 0, 7)
    g.fill()
  }
  grain(g, '#b0563a', 0.14, 138)
  h.fillStyle = '#909090'
  h.fillRect(0, 0, SIZE, SIZE)
  grain(h, '#909090', 0.3, 139)
}

/* ------------------------------------------------------------------ */

const RECIPES: Record<string, Recipe> = {
  brick: { paint: brick, perMetre: 0.62, roughness: 0.95, metalness: 0, bump: 2.4 },
  grass: { paint: grass, perMetre: 0.9, roughness: 1, metalness: 0, bump: 1.4 },
  gravel: { paint: gravel, perMetre: 2.2, roughness: 1, metalness: 0, bump: 2.6 },
  stone: { paint: stone, perMetre: 0.9, roughness: 0.96, metalness: 0, bump: 2.2 },
  wood: { paint: wood, perMetre: 0.8, roughness: 0.72, metalness: 0, bump: 1 },
  metal: { paint: metal, perMetre: 1.2, roughness: 0.38, metalness: 0.85, bump: 0.5 },
  glass: { paint: glass, perMetre: 0.6, roughness: 0.06, metalness: 0.1, bump: 0.2 },
  concrete: { paint: concrete, perMetre: 0.7, roughness: 0.92, metalness: 0, bump: 0.9 },
  plaster: { paint: plaster, perMetre: 0.6, roughness: 0.94, metalness: 0, bump: 0.5 },
  tile: { paint: tile, perMetre: 1.6, roughness: 0.4, metalness: 0, bump: 1.8 },
  fabric: { paint: fabric, perMetre: 3, roughness: 0.95, metalness: 0, bump: 1 },
  soil: { paint: soil, perMetre: 1.2, roughness: 1, metalness: 0, bump: 1.4 },
  sand: { paint: sand, perMetre: 1.6, roughness: 1, metalness: 0, bump: 0.8 },
  clay: { paint: clay, perMetre: 1.4, roughness: 0.88, metalness: 0, bump: 1.1 },
}

/** Which recipe each finish key uses. Anything unlisted has no texture. */
const FOR_FINISH: Record<string, keyof typeof RECIPES> = {
  brick: 'brick',
  plaster: 'plaster',
  paint: 'plaster',
  upvc: 'plaster',
  concrete: 'concrete',
  stone: 'stone',
  tile: 'tile',
  wood: 'wood',
  teak: 'wood',
  bamboo: 'wood',
  steel: 'metal',
  aluminium: 'metal',
  galvanised: 'metal',
  silver: 'metal',
  nuvoblue: 'metal',
  brightgreen: 'metal',
  asianwhite: 'metal',
  castlered: 'metal',
  coffeebrown: 'metal',
  blue: 'metal',
  red: 'metal',
  green: 'metal',
  ivory: 'metal',
  charcoal: 'clay',
  glass: 'glass',
  mirror: 'glass',
  terracotta: 'clay',
  redclay: 'clay',
  weathered: 'clay',
  grass: 'grass',
  plain: 'grass',
  soil: 'soil',
  sand: 'sand',
  gravel: 'gravel',
  linen: 'fabric',
  fabric: 'fabric',
}

/**
 * Metal and clay share one brushed or fired base and get tinted per colour, so
 * six roof colours cost one texture rather than six.
 */
export function tintFor(finish: string): string | null {
  const TINTS: Record<string, string> = {
    nuvoblue: '#3f7fbe',
    silver: '#d7dce1',
    brightgreen: '#3f9c5c',
    asianwhite: '#f2f4f2',
    castlered: '#b1443f',
    coffeebrown: '#6b5346',
    blue: '#3f7fbe',
    red: '#b1443f',
    green: '#3f7f5f',
    ivory: '#efe9dc',
    galvanised: '#dfe4e8',
    steel: '#aeb6bd',
    aluminium: '#d2d8dd',
    teak: '#7b4a24',
    bamboo: '#d8b878',
    charcoal: '#5a5f63',
    redclay: '#a8412c',
    weathered: '#a07a5f',
    terracotta: '#ffffff',
    mirror: '#eef4f8',
  }
  return TINTS[finish] ?? null
}

/** The built texture set for a finish, or null when it has no texture. */
export function textureFor(finish: string): Built | null {
  if (cache.has(finish)) return cache.get(finish) ?? null

  const name = FOR_FINISH[finish]
  if (!name) {
    cache.set(finish, null)
    return null
  }

  const recipe = RECIPES[name]
  const colour = ctx2d()
  const height = ctx2d()
  recipe.paint(colour.g, height.g)

  const map = new THREE.CanvasTexture(colour.c)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8

  let normalMap: THREE.Texture | null = null
  if (recipe.bump > 0.01) {
    normalMap = new THREE.CanvasTexture(heightToNormal(height.g, recipe.bump))
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
    normalMap.anisotropy = 8
  }

  const built: Built = {
    map,
    normalMap,
    perMetre: recipe.perMetre,
    roughness: recipe.roughness,
    metalness: recipe.metalness,
  }
  cache.set(finish, built)
  return built
}
