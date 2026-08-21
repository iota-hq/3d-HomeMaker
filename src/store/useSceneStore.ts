import { create } from 'zustand'
import { CATALOG, defaultParams } from '../core/catalog'
import {
  bool,
  num,
  str,
  type ComponentType,
  type Params,
  type ParamValue,
  type SceneDoc,
  type SceneObject,
} from '../core/types'
import { FT, type UnitSystem } from '../core/units'

const STORAGE_KEY = '3dspace.scene.v1'
const THEME_KEY = '3dspace.theme'
const HISTORY_LIMIT = 100

export type Theme = 'light' | 'dark'

let seq = 0
const newId = () => `o${Date.now().toString(36)}${(seq++).toString(36)}`

/**
 * Wall, then Wall 2, Wall 3. Picks the next free number rather than counting,
 * so deleting Wall 2 and adding another does not produce a duplicate name.
 */
function nextName(type: ComponentType, objects: SceneObject[]): string {
  const label = CATALOG[type].label
  const taken = objects.filter((o) => o.type === type)
  if (!taken.length) return label

  // No regex here on purpose: labels contain spaces and slashes, and escaping
  // them into a pattern is a trap for no benefit.
  const prefix = `${label} `
  const used = new Set<number>()
  for (const o of taken) {
    if (o.name === label) {
      used.add(1)
      continue
    }
    if (o.name.startsWith(prefix)) {
      const n = Number(o.name.slice(prefix.length))
      if (Number.isInteger(n) && n > 0) used.add(n)
    }
  }

  let n = 1
  while (used.has(n)) n++
  return n === 1 ? label : `${label} ${n}`
}

function makeObject(
  type: ComponentType,
  position: [number, number, number],
  name = CATALOG[type].label,
): SceneObject {
  return {
    id: newId(),
    type,
    name,
    position,
    rotationY: 0,
    params: defaultParams(type),
    locked: false,
    visible: true,
  }
}

const initialObjects = (): SceneObject[] => [makeObject('ground', [0, 0, 0])]

/** Breathing room left between neighbouring plots. */
const PLOT_GAP = 2 * FT

/**
 * Where a newly added component should land when the caller does not say.
 *
 * Grounds are the case that matters: dropping a second plot on top of the first
 * would leave two overlapping slabs fighting over every click. Instead the new
 * plot is laid out beside the rightmost existing one, clear of it.
 */
function autoPlace(type: ComponentType, objects: SceneObject[]): [number, number, number] {
  const grounds = objects.filter((o) => o.type === 'ground')

  if (type === 'ground') {
    if (!grounds.length) return [0, 0, 0]
    const width = num(defaultParams('ground'), 'width')
    let rightEdge = -Infinity
    let z = 0
    for (const g of grounds) {
      const edge = g.position[0] + num(g.params, 'width') / 2
      if (edge > rightEdge) {
        rightEdge = edge
        z = g.position[2]
      }
    }
    return [rightEdge + PLOT_GAP + width / 2, 0, z]
  }

  if (!grounds.length) return [0, 0, 0]

  // Everything else lands in a staging row just off the near edge of the plot,
  // at ground level. Dropping it in the middle buried it inside whatever was
  // already built there.
  let rightEdge = -Infinity
  let frontEdge = -Infinity
  let leftEdge = Infinity
  for (const g of grounds) {
    rightEdge = Math.max(rightEdge, g.position[0] + num(g.params, 'width') / 2)
    leftEdge = Math.min(leftEdge, g.position[0] - num(g.params, 'width') / 2)
    frontEdge = Math.max(frontEdge, g.position[2] + num(g.params, 'depth') / 2)
  }

  const staged = objects.filter((o) => o.type !== 'ground' && o.position[2] > frontEdge)
  const step = 10 * FT
  const span = Math.max(rightEdge - leftEdge, step)
  const slot = staged.length
  const perRow = Math.max(1, Math.floor(span / step))

  return [
    leftEdge + step / 2 + (slot % perRow) * step,
    0,
    frontEdge + PLOT_GAP + step / 2 + Math.floor(slot / perRow) * step,
  ]
}

interface SceneState {
  objects: SceneObject[]
  /** Selection is a set; the last entry is the one the inspector edits. */
  selectedIds: string[]
  units: UnitSystem
  gridSnap: number
  theme: Theme
  /**
   * The master Low poly setting. Components follow it unless they carry their
   * own override, so flipping this changes everything the user has not pinned.
   */
  lowPoly: boolean
  past: SceneObject[][]
  future: SceneObject[][]

  /** Snapshot state so the next mutation can be undone. Call once per gesture. */
  pushHistory: () => void
  undo: () => void
  redo: () => void

  add: (type: ComponentType, position?: [number, number, number]) => string | null
  remove: (id: string) => void
  removeSelected: () => void
  duplicate: (id: string) => void

  select: (id: string | null, additive?: boolean) => void
  isSelected: (id: string) => boolean

  setParam: (id: string, key: string, value: ParamValue) => void
  setPosition: (id: string, position: [number, number, number]) => void
  /** Shifts a set of objects together, used for dragging a group. */
  moveBy: (ids: string[], dx: number, dy: number, dz: number) => void
  setRotationY: (id: string, rotationY: number) => void
  rename: (id: string, name: string) => void
  toggleLock: (id: string) => void
  toggleVisible: (id: string) => void
  /** Pins one component. Passing null hands it back to the master setting. */
  setLowPoly: (id: string, lowPoly: boolean | null) => void

  groupSelected: () => void
  ungroupSelected: () => void
  /** Replaces a room with its separate walls, door and windows, grouped. */
  explodeRoom: (id: string) => void
  /** Every object that moves when this one moves: itself, plus its group. */
  linkedIds: (id: string) => string[]

  setUnits: (units: UnitSystem) => void
  setGridSnap: (gridSnap: number) => void
  setTheme: (theme: Theme) => void
  setGlobalLowPoly: (lowPoly: boolean) => void

  clear: () => void
  loadDoc: (doc: SceneDoc) => void
  toDoc: () => SceneDoc
}

const patch = (objects: SceneObject[], id: string, fn: (o: SceneObject) => SceneObject) =>
  objects.map((o) => (o.id === id ? fn(o) : o))

export const useSceneStore = create<SceneState>((set, get) => ({
  objects: initialObjects(),
  selectedIds: [],
  units: 'ftin',
  gridSnap: 0.5 * FT,
  theme: 'light',
  lowPoly: true,
  past: [],
  future: [],

  pushHistory: () =>
    set((s) => ({ past: [...s.past, s.objects].slice(-HISTORY_LIMIT), future: [] })),

  undo: () =>
    set((s) => {
      if (!s.past.length) return s
      const previous = s.past[s.past.length - 1]
      const alive = new Set(previous.map((o) => o.id))
      return {
        objects: previous,
        past: s.past.slice(0, -1),
        future: [s.objects, ...s.future].slice(0, HISTORY_LIMIT),
        selectedIds: s.selectedIds.filter((id) => alive.has(id)),
      }
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return s
      const next = s.future[0]
      const alive = new Set(next.map((o) => o.id))
      return {
        objects: next,
        past: [...s.past, s.objects].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        selectedIds: s.selectedIds.filter((id) => alive.has(id)),
      }
    }),

  add: (type, position) => {
    const state = get()
    if (CATALOG[type].singleton && state.objects.some((o) => o.type === type)) return null
    const obj = makeObject(
      type,
      position ?? autoPlace(type, state.objects),
      nextName(type, state.objects),
    )
    if (CATALOG[type].grounded) obj.position[1] = 0
    state.pushHistory()
    set((s) => ({ objects: [...s.objects, obj], selectedIds: [obj.id] }))
    return obj.id
  },

  remove: (id) => {
    get().pushHistory()
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedIds: s.selectedIds.filter((x) => x !== id),
    }))
  },

  removeSelected: () => {
    const s = get()
    const doomed = new Set(
      s.selectedIds.filter((id) => {
        const o = s.objects.find((x) => x.id === id)
        return o && CATALOG[o.type].singleton !== true
      }),
    )
    if (!doomed.size) return
    s.pushHistory()
    set((st) => ({
      objects: st.objects.filter((o) => !doomed.has(o.id)),
      selectedIds: [],
    }))
  },

  duplicate: (id) => {
    const src = get().objects.find((o) => o.id === id)
    if (!src) return
    const copy: SceneObject = {
      ...src,
      id: newId(),
      name: nextName(src.type, get().objects),
      params: { ...src.params },
      groupId: undefined,
      position: [src.position[0] + 3 * FT, src.position[1], src.position[2] + 3 * FT],
    }
    get().pushHistory()
    set((s) => ({ objects: [...s.objects, copy], selectedIds: [copy.id] }))
  },

  select: (id, additive = false) =>
    set((s) => {
      if (id === null) return { selectedIds: [] }
      if (!additive) return { selectedIds: [id] }
      return s.selectedIds.includes(id)
        ? { selectedIds: s.selectedIds.filter((x) => x !== id) }
        : { selectedIds: [...s.selectedIds, id] }
    }),

  isSelected: (id) => get().selectedIds.includes(id),

  setParam: (id, key, value) =>
    set((s) => ({
      objects: patch(s.objects, id, (o) => ({ ...o, params: { ...o.params, [key]: value } })),
    })),

  setPosition: (id, position) =>
    set((s) => ({ objects: patch(s.objects, id, (o) => ({ ...o, position })) })),

  moveBy: (ids, dx, dy, dz) => {
    const move = new Set(ids)
    set((s) => ({
      objects: s.objects.map((o) =>
        move.has(o.id)
          ? {
              ...o,
              position: [o.position[0] + dx, o.position[1] + dy, o.position[2] + dz] as [
                number,
                number,
                number,
              ],
            }
          : o,
      ),
    }))
  },

  setRotationY: (id, rotationY) =>
    set((s) => ({ objects: patch(s.objects, id, (o) => ({ ...o, rotationY })) })),

  rename: (id, name) => set((s) => ({ objects: patch(s.objects, id, (o) => ({ ...o, name })) })),

  toggleLock: (id) => {
    get().pushHistory()
    set((s) => ({ objects: patch(s.objects, id, (o) => ({ ...o, locked: !o.locked })) }))
  },

  toggleVisible: (id) => {
    get().pushHistory()
    set((s) => ({ objects: patch(s.objects, id, (o) => ({ ...o, visible: !o.visible })) }))
  },

  setLowPoly: (id, lowPoly) => {
    get().pushHistory()
    set((s) => ({
      objects: patch(s.objects, id, (o) => ({ ...o, lowPoly: lowPoly ?? undefined })),
    }))
  },

  explodeRoom: (id) => {
    const s = get()
    const room = s.objects.find((o) => o.id === id)
    if (!room || room.type !== 'room') return

    const p = room.params
    const square = str(p, 'shape', 'rect') === 'square'
    const width = num(p, 'width')
    const depth = square ? width : num(p, 'depth')
    const height = num(p, 'height')
    const t = num(p, 'thickness')
    const finish = str(p, 'finish', 'plaster')
    const doorW = num(p, 'doorWidth')
    const doorH = num(p, 'doorHeight')
    const winW = num(p, 'winWidth')
    const winH = num(p, 'winHeight')
    const winSill = num(p, 'winSill')

    const maxOffset = Math.max(0, width / 2 - doorW / 2 - t)
    const doorX = Math.max(-maxOffset, Math.min(maxOffset, num(p, 'doorOffset') * (width / 2)))

    const gid = `g${newId()}`
    const cos = Math.cos(room.rotationY)
    const sin = Math.sin(room.rotationY)
    /** Room local offset into world space, honouring the room's own yaw. */
    const place = (lx: number, lz: number): [number, number, number] => [
      room.position[0] + lx * cos + lz * sin,
      room.position[1],
      room.position[2] - lx * sin + lz * cos,
    ]

    const parts: SceneObject[] = []
    const push = (
      type: ComponentType,
      lx: number,
      lz: number,
      yaw: number,
      params: Params,
      name: string,
    ) => {
      parts.push({
        ...makeObject(type, place(lx, lz), name),
        rotationY: room.rotationY + yaw,
        params: { ...defaultParams(type), ...params },
        groupId: gid,
        lowPoly: room.lowPoly,
      })
    }

    push('wall', 0, depth / 2, 0, { length: width + t, height, thickness: t, finish }, 'Front wall')
    push('wall', 0, -depth / 2, 0, { length: width + t, height, thickness: t, finish }, 'Back wall')
    push('wall', -width / 2, 0, Math.PI / 2, { length: depth - t, height, thickness: t, finish }, 'Left wall')
    push('wall', width / 2, 0, Math.PI / 2, { length: depth - t, height, thickness: t, finish }, 'Right wall')
    push('door', doorX, depth / 2, 0, { width: doorW, height: doorH }, 'Door')
    push('window', -width / 2, 0, Math.PI / 2, { width: winW, height: winH, sill: winSill }, 'Left window')
    push('window', width / 2, 0, Math.PI / 2, { width: winW, height: winH, sill: winSill }, 'Right window')

    if (bool(p, 'floor', true)) {
      push('slab', 0, 0, 0, { width: width + t, depth: depth + t, thickness: 3 * 0.0254, finish: 'concrete' }, 'Floor')
    }
    if (bool(p, 'ceiling', false)) {
      const ceiling = { ...makeObject('slab', place(0, 0), 'Ceiling'), groupId: gid }
      ceiling.position[1] = room.position[1] + height
      ceiling.params = { ...defaultParams('slab'), width: width + t, depth: depth + t }
      ceiling.rotationY = room.rotationY
      parts.push(ceiling)
    }

    s.pushHistory()
    set((st) => ({
      objects: [...st.objects.filter((o) => o.id !== id), ...parts],
      selectedIds: parts.map((o) => o.id),
    }))
  },

  groupSelected: () => {
    const s = get()
    // the ground is scenery, never part of a group
    const ids = s.selectedIds.filter((id) => s.objects.find((o) => o.id === id)?.type !== 'ground')
    if (ids.length < 2) return
    const gid = `g${newId()}`
    const inGroup = new Set(ids)
    s.pushHistory()
    set((st) => ({
      objects: st.objects.map((o) => (inGroup.has(o.id) ? { ...o, groupId: gid } : o)),
    }))
  },

  ungroupSelected: () => {
    const s = get()
    const gids = new Set(
      s.selectedIds.map((id) => s.objects.find((o) => o.id === id)?.groupId).filter(Boolean),
    )
    if (!gids.size) return
    s.pushHistory()
    set((st) => ({
      objects: st.objects.map((o) =>
        o.groupId && gids.has(o.groupId) ? { ...o, groupId: undefined } : o,
      ),
    }))
  },

  linkedIds: (id) => {
    const { objects } = get()
    const self = objects.find((o) => o.id === id)
    if (!self) return []
    if (!self.groupId) return [id]
    return objects.filter((o) => o.groupId === self.groupId).map((o) => o.id)
  },

  setUnits: (units) => set({ units }),
  setGridSnap: (gridSnap) => set({ gridSnap }),
  setGlobalLowPoly: (lowPoly) => set({ lowPoly }),
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* private mode */
    }
    set({ theme })
  },

  clear: () => {
    get().pushHistory()
    set({ objects: initialObjects(), selectedIds: [] })
  },

  loadDoc: (doc) => {
    get().pushHistory()
    set({ objects: doc.objects, selectedIds: [] })
  },

  toDoc: () => ({ version: 1, objects: get().objects }),
}))

/** The object the inspector edits: the most recently selected one. */
export const useSelected = (): SceneObject | null =>
  useSceneStore((s) => {
    const id = s.selectedIds[s.selectedIds.length - 1]
    return s.objects.find((o) => o.id === id) ?? null
  })

/* ---------- persistence ---------- */

export function restoreFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const doc = JSON.parse(raw) as SceneDoc
      if (doc?.version === 1 && Array.isArray(doc.objects) && doc.objects.length) {
        useSceneStore.setState({ objects: doc.objects, selectedIds: [], past: [], future: [] })
      }
    }
  } catch {
    /* corrupt save, start fresh */
  }
}

export function restoreTheme() {
  let theme: Theme = 'light'
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light') theme = saved
    else if (matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark'
  } catch {
    /* ignore */
  }
  document.documentElement.dataset.theme = theme
  useSceneStore.setState({ theme })
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
export function startAutosave() {
  return useSceneStore.subscribe((s, prev) => {
    if (s.objects === prev.objects) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, objects: s.objects }))
      } catch {
        /* quota, ignore */
      }
    }, 400)
  })
}
