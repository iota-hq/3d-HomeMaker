/**
 * Stylized material palette.
 * Deliberately flat-ish: mid-to-high roughness, no metal except real steel,
 * so shapes read clearly while editing and nothing costs a texture fetch.
 */
export interface MatDef {
  color: string
  roughness: number
  metalness: number
  /** Faceted look, good for tiles, gravel, stone. */
  flat?: boolean
  opacity?: number
}

export const MATERIALS: Record<string, MatDef> = {
  // walls & masonry
  plaster: { color: '#ece7dd', roughness: 0.95, metalness: 0 },
  paint: { color: '#f4f1ea', roughness: 0.85, metalness: 0 },
  brick: { color: '#a9583f', roughness: 0.95, metalness: 0 },
  concrete: { color: '#b9b6b0', roughness: 0.92, metalness: 0 },
  stone: { color: '#8d8a80', roughness: 0.98, metalness: 0, flat: true },
  tile: { color: '#d8cfc2', roughness: 0.55, metalness: 0 },

  // timber
  wood: { color: '#b07a46', roughness: 0.75, metalness: 0 },
  teak: { color: '#6b4322', roughness: 0.7, metalness: 0 },
  bamboo: { color: '#c9a961', roughness: 0.8, metalness: 0 },

  // metal
  steel: { color: '#8f97a0', roughness: 0.45, metalness: 0.8 },
  aluminium: { color: '#b8bec6', roughness: 0.4, metalness: 0.75 },
  galvanised: { color: '#c3c9cf', roughness: 0.35, metalness: 0.85 },
  upvc: { color: '#f2f4f5', roughness: 0.6, metalness: 0 },

  // glazing
  glass: { color: '#bcd7e3', roughness: 0.08, metalness: 0.1, opacity: 0.32 },

  // khaprail clay tiles
  terracotta: { color: '#c1653f', roughness: 0.88, metalness: 0, flat: true },
  redclay: { color: '#9e3b28', roughness: 0.9, metalness: 0, flat: true },
  weathered: { color: '#8a5a43', roughness: 0.95, metalness: 0, flat: true },
  charcoal: { color: '#44474b', roughness: 0.8, metalness: 0.1, flat: true },

  // Tata BlueScope DURASHINE colour coat
  nuvoblue: { color: '#2b5f9e', roughness: 0.42, metalness: 0.5 },
  silver: { color: '#c6cbd0', roughness: 0.34, metalness: 0.72 },
  brightgreen: { color: '#2f7d46', roughness: 0.42, metalness: 0.5 },
  asianwhite: { color: '#eef0ee', roughness: 0.46, metalness: 0.38 },
  castlered: { color: '#8f2f2c', roughness: 0.42, metalness: 0.5 },
  coffeebrown: { color: '#4b3a30', roughness: 0.44, metalness: 0.45 },

  // soft goods
  linen: { color: '#f0ece3', roughness: 0.92, metalness: 0 },
  fabric: { color: '#9aa0a6', roughness: 0.95, metalness: 0 },

  // legacy colour-coat
  blue: { color: '#2f5f8a', roughness: 0.42, metalness: 0.55 },
  red: { color: '#8e3b32', roughness: 0.42, metalness: 0.55 },
  green: { color: '#2f5b46', roughness: 0.42, metalness: 0.55 },
  ivory: { color: '#e9e3d5', roughness: 0.45, metalness: 0.45 },

  // ground surfaces
  grass: { color: '#6f9e4e', roughness: 1, metalness: 0 },
  plain: { color: '#a8b48c', roughness: 1, metalness: 0 },
  soil: { color: '#8a6b4d', roughness: 1, metalness: 0 },
  sand: { color: '#d8c79b', roughness: 1, metalness: 0 },
  gravel: { color: '#9a958c', roughness: 1, metalness: 0, flat: true },
}

export const FALLBACK: MatDef = { color: '#cccccc', roughness: 0.9, metalness: 0 }

export function mat(key: string): MatDef {
  return MATERIALS[key] ?? FALLBACK
}
