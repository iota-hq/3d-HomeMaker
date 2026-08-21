import { FT, IN } from './units'
import type { ComponentDef, ComponentType, Params } from './types'

const enumOpts = (...pairs: [string, string][]) =>
  pairs.map(([value, label]) => ({ value, label }))

export const CATALOG: Record<ComponentType, ComponentDef> = {
  ground: {
    type: 'ground', label: 'Ground', category: 'Site', icon: '🌱', grounded: true,
    blurb: 'The plot your house sits on. Grass, soil or paved.',
    params: {
      width: { kind: 'length', label: 'Width', def: 80 * FT, min: 10 * FT, max: 400 * FT },
      depth: { kind: 'length', label: 'Depth', def: 80 * FT, min: 10 * FT, max: 400 * FT },
      surface: { kind: 'enum', label: 'Surface', def: 'grass', options: enumOpts(
        ['grass', 'Green grass'], ['plain', 'Plain / levelled'], ['soil', 'Bare soil'],
        ['sand', 'Sand'], ['concrete', 'Concrete'],
      ) },
      grid: { kind: 'bool', label: 'Show grid', def: true },
    },
  },

  wall: {
    type: 'wall', label: 'Wall', category: 'Structure', icon: '🧱', grounded: true,
    blurb: 'Straight wall. Doors and windows punch real openings through it.',
    params: {
      length: { kind: 'length', label: 'Length', def: 12 * FT, min: 1 * FT, max: 120 * FT },
      height: { kind: 'length', label: 'Height', def: 10 * FT, min: 1 * FT, max: 30 * FT },
      thickness: { kind: 'length', label: 'Thickness', def: 9 * IN, min: 2 * IN, max: 3 * FT },
      finish: { kind: 'enum', label: 'Finish', def: 'plaster', options: enumOpts(
        ['plaster', 'Plaster'], ['brick', 'Exposed brick'], ['concrete', 'Concrete'],
        ['stone', 'Stone'], ['paint', 'Painted'],
      ) },
      skirting: { kind: 'bool', label: 'Skirting', def: false },
    },
  },

  door: {
    type: 'door', label: 'Door', category: 'Openings', icon: '🚪', grounded: true,
    blurb: 'Framed door with a swing arc. Cuts a hole in the wall it is placed on.',
    params: {
      width: { kind: 'length', label: 'Width', def: 3 * FT, min: 18 * IN, max: 12 * FT },
      height: { kind: 'length', label: 'Height', def: 7 * FT, min: 4 * FT, max: 14 * FT },
      frame: { kind: 'length', label: 'Frame width', def: 2.5 * IN, min: 0.5 * IN, max: 8 * IN },
      leaves: { kind: 'enum', label: 'Leaves', def: 'single', options: enumOpts(
        ['single', 'One'], ['double', 'Two'],
      ) },
      swing: { kind: 'angle', label: 'Swing', def: 75, min: 0, max: 110 },
      finish: { kind: 'enum', label: 'Finish', def: 'wood', options: enumOpts(
        ['wood', 'Wood'], ['teak', 'Dark teak'], ['steel', 'Steel'], ['glass', 'Glazed'],
      ) },
    },
  },

  window: {
    type: 'window', label: 'Window', category: 'Openings', icon: '🪟', grounded: true,
    blurb: 'Glazed window with mullions. Cuts a hole in the wall it is placed on.',
    params: {
      width: { kind: 'length', label: 'Width', def: 4 * FT, min: 1 * FT, max: 20 * FT },
      height: { kind: 'length', label: 'Height', def: 4 * FT, min: 1 * FT, max: 12 * FT },
      sill: { kind: 'length', label: 'Sill height', def: 3 * FT, min: 0, max: 10 * FT },
      frame: { kind: 'length', label: 'Frame width', def: 2 * IN, min: 0.5 * IN, max: 6 * IN },
      colsMull: { kind: 'count', label: 'Vertical bars', def: 1, min: 0, max: 8 },
      rowsMull: { kind: 'count', label: 'Horizontal bars', def: 0, min: 0, max: 8 },
      ledge: { kind: 'bool', label: 'Sill ledge', def: true },
      finish: { kind: 'enum', label: 'Frame', def: 'aluminium', options: enumOpts(
        ['aluminium', 'Aluminium'], ['wood', 'Wood'], ['steel', 'Steel'], ['upvc', 'uPVC white'],
      ) },
    },
  },

  slab: {
    type: 'slab', label: 'Ceiling / Slab', category: 'Structure', icon: '⬜', grounded: false,
    blurb: 'Flat RCC roof slab or ceiling. Raise it to wall height to cap a room.',
    params: {
      width: { kind: 'length', label: 'Width', def: 14 * FT, min: 2 * FT, max: 120 * FT },
      depth: { kind: 'length', label: 'Depth', def: 14 * FT, min: 2 * FT, max: 120 * FT },
      thickness: { kind: 'length', label: 'Thickness', def: 6 * IN, min: 2 * IN, max: 2 * FT },
      overhang: { kind: 'length', label: 'Overhang', def: 0, min: 0, max: 6 * FT },
      finish: { kind: 'enum', label: 'Finish', def: 'concrete', options: enumOpts(
        ['concrete', 'RCC concrete'], ['plaster', 'Plastered'], ['wood', 'Timber'],
      ) },
    },
  },

  column: {
    type: 'column', label: 'Column', category: 'Structure', icon: '🏛️', grounded: true,
    blurb: 'Structural pillar. Square or round, with an optional base and capital.',
    params: {
      height: { kind: 'length', label: 'Height', def: 10 * FT, min: 1 * FT, max: 40 * FT },
      width: { kind: 'length', label: 'Width', def: 12 * IN, min: 3 * IN, max: 6 * FT },
      depth: { kind: 'length', label: 'Depth', def: 12 * IN, min: 3 * IN, max: 6 * FT },
      shape: { kind: 'enum', label: 'Shape', def: 'square', options: enumOpts(
        ['square', 'Square'], ['round', 'Round'],
      ) },
      capital: { kind: 'bool', label: 'Base & capital', def: true },
      finish: { kind: 'enum', label: 'Finish', def: 'concrete', options: enumOpts(
        ['concrete', 'Concrete'], ['plaster', 'Plaster'], ['brick', 'Brick'], ['stone', 'Stone'],
      ) },
    },
  },

  path: {
    type: 'path', label: 'Path', category: 'Site', icon: '🛤️', grounded: true,
    blurb: 'Paved walkway. Individual pavers are instanced, so length is cheap.',
    params: {
      length: { kind: 'length', label: 'Length', def: 24 * FT, min: 2 * FT, max: 300 * FT },
      width: { kind: 'length', label: 'Width', def: 4 * FT, min: 1 * FT, max: 30 * FT },
      thickness: { kind: 'length', label: 'Thickness', def: 3 * IN, min: 1 * IN, max: 12 * IN },
      paver: { kind: 'enum', label: 'Paving', def: 'brick', options: enumOpts(
        ['brick', 'Brick pavers'], ['concrete', 'Concrete slabs'],
        ['stone', 'Stone flags'], ['gravel', 'Gravel'],
      ) },
      unit: { kind: 'length', label: 'Paver size', def: 12 * IN, min: 3 * IN, max: 4 * FT },
      curve: { kind: 'angle', label: 'Curve', def: 0, min: -150, max: 150 },
      edging: { kind: 'bool', label: 'Kerb edging', def: true },
    },
  },

  khaprail: {
    type: 'khaprail', label: 'Clay Tile Roof', category: 'Roof', icon: '🏚️', grounded: false,
    blurb: 'Pitched clay tile roof, the traditional khaprail. Tiles are instanced.',
    params: {
      span: { kind: 'length', label: 'Span', def: 16 * FT, min: 3 * FT, max: 80 * FT },
      length: { kind: 'length', label: 'Length', def: 20 * FT, min: 3 * FT, max: 120 * FT },
      pitch: { kind: 'angle', label: 'Pitch', def: 30, min: 5, max: 60 },
      overhang: { kind: 'length', label: 'Overhang', def: 18 * IN, min: 0, max: 6 * FT },
      tile: { kind: 'length', label: 'Tile size', def: 10 * IN, min: 4 * IN, max: 24 * IN },
      style: { kind: 'enum', label: 'Sides', def: 'gable', options: enumOpts(
        ['gable', 'Two'], ['mono', 'One'],
      ) },
      ridge: { kind: 'bool', label: 'Ridge capping', def: true },
      rafters: { kind: 'bool', label: 'Exposed rafters', def: true },
      finish: { kind: 'enum', label: 'Tile colour', def: 'terracotta', options: enumOpts(
        ['terracotta', 'Terracotta'], ['redclay', 'Deep red clay'],
        ['weathered', 'Weathered brown'], ['charcoal', 'Charcoal'],
      ) },
    },
  },

  bluescope: {
    type: 'bluescope', label: 'Durashine Roof', category: 'Roof', icon: '🏭', grounded: false,
    blurb: 'Tata BlueScope DURASHINE colour coated steel roof, on columns.',
    params: {
      span: { kind: 'length', label: 'Span', def: 16 * FT, min: 3 * FT, max: 100 * FT },
      length: { kind: 'length', label: 'Length', def: 24 * FT, min: 3 * FT, max: 200 * FT },
      pitch: { kind: 'angle', label: 'Pitch', def: 12, min: 2, max: 45 },
      overhang: { kind: 'length', label: 'Overhang', def: 12 * IN, min: 0, max: 6 * FT },
      profile: { kind: 'enum', label: 'Profile', def: 'durashine', options: enumOpts(
        ['durashine', 'Durashine Roof 1015'], ['tileprofile', 'Durashine Tile'],
        ['corrugated', 'Corrugated'], ['kliplok', 'Standing seam'],
      ) },
      style: { kind: 'enum', label: 'Sides', def: 'mono', options: enumOpts(
        ['mono', 'One'], ['gable', 'Two'],
      ) },
      purlins: { kind: 'bool', label: 'Purlins', def: true },
      legs: { kind: 'bool', label: 'Support columns', def: true },
      legHeight: { kind: 'length', label: 'Column height', def: 10 * FT, min: 2 * FT, max: 30 * FT },
      finish: { kind: 'enum', label: 'Colour', def: 'nuvoblue', options: enumOpts(
        ['nuvoblue', 'Nuvo Blue'], ['silver', 'Satin Silver'], ['brightgreen', 'Bright Green'],
        ['asianwhite', 'Asian White'], ['castlered', 'Castle Red'], ['coffeebrown', 'Coffee Brown'],
      ) },
    },
  },

  stairs: {
    type: 'stairs', label: 'Stairs', category: 'Access', icon: '🪜', grounded: true,
    blurb: 'Straight or curved staircase. Set rise and run per step; height follows.',
    params: {
      form: { kind: 'enum', label: 'Shape', def: 'straight', options: enumOpts(
        ['straight', 'Straight'], ['curved', 'Curved'],
      ) },
      sweep: { kind: 'angle', label: 'Curve sweep', def: 90, min: 15, max: 270 },
      radius: { kind: 'length', label: 'Inner radius', def: 3 * FT, min: 0, max: 20 * FT },
      width: { kind: 'length', label: 'Width', def: 3.5 * FT, min: 1.5 * FT, max: 20 * FT },
      steps: { kind: 'count', label: 'Steps', def: 12, min: 1, max: 60 },
      rise: { kind: 'length', label: 'Rise / step', def: 6.5 * IN, min: 3 * IN, max: 12 * IN },
      run: { kind: 'length', label: 'Run / step', def: 11 * IN, min: 6 * IN, max: 24 * IN },
      landing: { kind: 'length', label: 'Top landing', def: 0, min: 0, max: 20 * FT },
      railing: { kind: 'enum', label: 'Railing', def: 'both', options: enumOpts(
        ['none', 'None'], ['left', 'Left'], ['right', 'Right'], ['both', 'Both sides'],
      ) },
      solid: { kind: 'bool', label: 'Solid stringer', def: true },
      finish: { kind: 'enum', label: 'Finish', def: 'concrete', options: enumOpts(
        ['concrete', 'Bare concrete'], ['plaster', 'Plastered'],
        ['stone', 'Stone clad'], ['tile', 'Tiled'], ['wood', 'Timber treads'],
      ) },
    },
  },

  ladder: {
    type: 'ladder', label: 'Ladder', category: 'Access', icon: '🧗', grounded: true,
    blurb: 'Leaning ladder with rails and rungs. Wood or aluminium.',
    params: {
      height: { kind: 'length', label: 'Height', def: 12 * FT, min: 3 * FT, max: 40 * FT },
      width: { kind: 'length', label: 'Width', def: 18 * IN, min: 10 * IN, max: 4 * FT },
      rungs: { kind: 'count', label: 'Rungs', def: 11, min: 2, max: 40 },
      lean: { kind: 'angle', label: 'Lean', def: 15, min: 0, max: 45 },
      rail: { kind: 'length', label: 'Rail thickness', def: 2 * IN, min: 0.75 * IN, max: 5 * IN },
      form: { kind: 'enum', label: 'Rails', def: 'straight', options: enumOpts(
        ['straight', 'Straight'], ['rounded', 'Rounded'],
      ) },
      bow: { kind: 'angle', label: 'Curve', def: 0, min: 0, max: 60 },
      finish: { kind: 'enum', label: 'Material', def: 'wood', options: enumOpts(
        ['wood', 'Wood'], ['aluminium', 'Aluminium'], ['steel', 'Steel'], ['bamboo', 'Bamboo'],
      ) },
    },
  },

  room: {
    type: 'room', label: 'Room', category: 'Structure', icon: '🏠', grounded: true,
    blurb: 'A complete room: four walls, a door and two windows, all adjustable.',
    params: {
      shape: { kind: 'enum', label: 'Shape', def: 'rect', options: enumOpts(
        ['square', 'Square'], ['rect', 'Rectangular'],
      ) },
      width: { kind: 'length', label: 'Width', def: 16 * FT, min: 5 * FT, max: 80 * FT },
      depth: { kind: 'length', label: 'Depth', def: 12 * FT, min: 5 * FT, max: 80 * FT },
      height: { kind: 'length', label: 'Wall height', def: 10 * FT, min: 6 * FT, max: 24 * FT },
      thickness: { kind: 'length', label: 'Wall thickness', def: 9 * IN, min: 3 * IN, max: 2 * FT },
      doorWidth: { kind: 'length', label: 'Door width', def: 3.5 * FT, min: 2 * FT, max: 10 * FT },
      doorHeight: { kind: 'length', label: 'Door height', def: 7 * FT, min: 5 * FT, max: 12 * FT },
      doorOffset: { kind: 'factor', label: 'Door along wall', def: -0.3, min: -0.8, max: 0.8, step: 0.01 },
      winWidth: { kind: 'length', label: 'Window width', def: 4.5 * FT, min: 1 * FT, max: 15 * FT },
      winHeight: { kind: 'length', label: 'Window height', def: 4 * FT, min: 1 * FT, max: 10 * FT },
      winSill: { kind: 'length', label: 'Window sill', def: 3 * FT, min: 0, max: 8 * FT },
      floor: { kind: 'bool', label: 'Floor slab', def: true },
      ceiling: { kind: 'bool', label: 'Ceiling slab', def: false },
      finish: { kind: 'enum', label: 'Wall finish', def: 'plaster', options: enumOpts(
        ['plaster', 'Plaster'], ['brick', 'Exposed brick'], ['concrete', 'Concrete'],
        ['stone', 'Stone'], ['paint', 'Painted'],
      ) },
    },
  },

  railing: {
    type: 'railing', label: 'Railing', category: 'Access', icon: '🚧', grounded: true,
    blurb: 'Free standing railing or balustrade. Straight, or bent around a curve.',
    params: {
      form: { kind: 'enum', label: 'Shape', def: 'straight', options: enumOpts(
        ['straight', 'Straight'], ['curved', 'Curved'],
      ) },
      length: { kind: 'length', label: 'Length', def: 10 * FT, min: 1 * FT, max: 100 * FT },
      sweep: { kind: 'angle', label: 'Curve sweep', def: 90, min: 10, max: 350 },
      radius: { kind: 'length', label: 'Curve radius', def: 6 * FT, min: 1 * FT, max: 60 * FT },
      height: { kind: 'length', label: 'Height', def: 3 * FT, min: 1 * FT, max: 8 * FT },
      style: { kind: 'enum', label: 'Infill', def: 'turned', options: enumOpts(
        ['turned', 'Turned spindles'], ['ornate', 'Scrollwork'],
        ['glass', 'Glass panels'], ['bars', 'Plain bars'],
      ) },
      posts: { kind: 'count', label: 'Posts', def: 4, min: 2, max: 40 },
      density: { kind: 'length', label: 'Spindle spacing', def: 5 * IN, min: 2 * IN, max: 24 * IN },
      bars: { kind: 'count', label: 'Horizontal bars', def: 1, min: 0, max: 8 },
      topRail: { kind: 'length', label: 'Rail thickness', def: 2.5 * IN, min: 0.5 * IN, max: 6 * IN },
      finish: { kind: 'enum', label: 'Finish', def: 'wood', options: enumOpts(
        ['wood', 'Wood'], ['teak', 'Dark teak'], ['steel', 'Wrought iron'],
        ['aluminium', 'Aluminium'], ['paint', 'Painted white'],
      ) },
    },
  },

  mirror: {
    type: 'mirror', label: 'Mirror', category: 'Furniture', icon: '🪞', grounded: false,
    blurb: 'Wall mirror with a frame. Reflects the scene around it.',
    params: {
      width: { kind: 'length', label: 'Width', def: 2.5 * FT, min: 6 * IN, max: 12 * FT },
      height: { kind: 'length', label: 'Height', def: 4 * FT, min: 6 * IN, max: 12 * FT },
      sill: { kind: 'length', label: 'Height off floor', def: 3 * FT, min: 0, max: 10 * FT },
      frame: { kind: 'length', label: 'Frame width', def: 2 * IN, min: 0, max: 8 * IN },
      shape: { kind: 'enum', label: 'Shape', def: 'rect', options: enumOpts(
        ['rect', 'Rectangular'], ['round', 'Round'], ['arch', 'Arched'],
      ) },
      stand: { kind: 'bool', label: 'Floor stand', def: false },
      finish: { kind: 'enum', label: 'Frame finish', def: 'wood', options: enumOpts(
        ['wood', 'Wood'], ['teak', 'Dark teak'], ['steel', 'Steel'],
        ['aluminium', 'Aluminium'], ['paint', 'Painted'],
      ) },
    },
  },

  cupboard: {
    type: 'cupboard', label: 'Cupboard', category: 'Furniture', icon: '🗄️', grounded: true,
    blurb: 'Wardrobe or cupboard with shelves and hinged doors.',
    params: {
      width: { kind: 'length', label: 'Width', def: 4 * FT, min: 1.5 * FT, max: 16 * FT },
      height: { kind: 'length', label: 'Height', def: 7 * FT, min: 2 * FT, max: 12 * FT },
      depth: { kind: 'length', label: 'Depth', def: 22 * IN, min: 10 * IN, max: 4 * FT },
      doors: { kind: 'count', label: 'Doors', def: 2, min: 1, max: 6 },
      shelves: { kind: 'count', label: 'Shelves', def: 4, min: 0, max: 10 },
      open: { kind: 'angle', label: 'Doors open', def: 0, min: 0, max: 110 },
      legs: { kind: 'bool', label: 'Raised on legs', def: true },
      handles: { kind: 'bool', label: 'Handles', def: true },
      finish: { kind: 'enum', label: 'Finish', def: 'wood', options: enumOpts(
        ['wood', 'Wood'], ['teak', 'Dark teak'], ['paint', 'Painted white'],
        ['steel', 'Steel'], ['bamboo', 'Light oak'],
      ) },
    },
  },

  table: {
    type: 'table', label: 'Dining Table', category: 'Furniture', icon: '🍽️', grounded: true,
    blurb: 'Dining table with chairs around it. Rectangular or round.',
    params: {
      shape: { kind: 'enum', label: 'Top', def: 'rect', options: enumOpts(
        ['rect', 'Rectangular'], ['round', 'Round'],
      ) },
      length: { kind: 'length', label: 'Length', def: 6 * FT, min: 2 * FT, max: 16 * FT },
      width: { kind: 'length', label: 'Width', def: 3 * FT, min: 2 * FT, max: 8 * FT },
      height: { kind: 'length', label: 'Height', def: 30 * IN, min: 18 * IN, max: 4 * FT },
      thickness: { kind: 'length', label: 'Top thickness', def: 1.5 * IN, min: 0.5 * IN, max: 6 * IN },
      chairs: { kind: 'count', label: 'Chairs', def: 6, min: 0, max: 16 },
      finish: { kind: 'enum', label: 'Finish', def: 'wood', options: enumOpts(
        ['wood', 'Wood'], ['teak', 'Dark teak'], ['glass', 'Glass top'],
        ['stone', 'Stone top'], ['paint', 'Painted'],
      ) },
    },
  },

  bed: {
    type: 'bed', label: 'Bed', category: 'Furniture', icon: '🛏️', grounded: true,
    blurb: 'Bed with mattress, headboard, pillows and optional side tables.',
    params: {
      size: { kind: 'enum', label: 'Size', def: 'queen', options: enumOpts(
        ['single', 'Single'], ['double', 'Double'], ['queen', 'Queen'], ['king', 'King'],
      ) },
      width: { kind: 'length', label: 'Width', def: 5 * FT, min: 2.5 * FT, max: 10 * FT },
      length: { kind: 'length', label: 'Length', def: 6.5 * FT, min: 4 * FT, max: 9 * FT },
      height: { kind: 'length', label: 'Frame height', def: 16 * IN, min: 6 * IN, max: 3 * FT },
      headboard: { kind: 'length', label: 'Headboard', def: 3 * FT, min: 0, max: 6 * FT },
      pillows: { kind: 'count', label: 'Pillows', def: 2, min: 0, max: 6 },
      sideTables: { kind: 'bool', label: 'Side tables', def: true },
      finish: { kind: 'enum', label: 'Frame', def: 'wood', options: enumOpts(
        ['wood', 'Wood'], ['teak', 'Dark teak'], ['paint', 'Painted'], ['steel', 'Steel'],
      ) },
      sheets: { kind: 'enum', label: 'Bedding', def: 'linen', options: enumOpts(
        ['linen', 'Linen white'], ['fabric', 'Grey fabric'], ['paint', 'Cream'],
      ) },
    },
  },
}
export const CATEGORY_ORDER = ['Site', 'Structure', 'Openings', 'Roof', 'Access', 'Furniture'] as const

export function defaultParams(type: ComponentType): Params {
  const out: Params = {}
  for (const [key, spec] of Object.entries(CATALOG[type].params)) out[key] = spec.def
  return out
}

/** Everything the catalog panel shows, grouped by category. */
export const BY_CATEGORY = CATEGORY_ORDER.map((category) => ({
  category,
  items: Object.values(CATALOG).filter((d) => d.category === category),
}))
