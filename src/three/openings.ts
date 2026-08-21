import { num, type SceneObject } from '../core/types'

export interface Opening {
  /** Centre of the opening in wall-local X (metres, 0 = wall centre). */
  x: number
  width: number
  /** Bottom and top of the opening above the wall base. */
  y0: number
  y1: number
}

/** How far from the wall centre plane a door/window still counts as "in" this wall. */
const SNAP_DEPTH = 0.45

/**
 * The openings of a wall, encoded as a string.
 *
 * Walls read this through a store selector. Because it is a string it compares
 * by value, so a wall only re-renders when its OWN openings actually move.
 * Dragging a door past an unrelated wall costs that wall nothing.
 */
export function openingKeyForWall(wall: SceneObject, all: SceneObject[]): string {
  const out: string[] = []
  for (const o of openingsForWall(wall, all)) {
    out.push(`${o.x.toFixed(4)},${o.width.toFixed(4)},${o.y0.toFixed(4)},${o.y1.toFixed(4)}`)
  }
  return out.join('|')
}

/** Turns an opening key back into the rectangles the wall shape needs. */
export function openingsFromKey(key: string): Opening[] {
  if (!key) return []
  return key.split('|').map((part) => {
    const [x, width, y0, y1] = part.split(',').map(Number)
    return { x, width, y0, y1 }
  })
}

/**
 * Finds every door and window that sits in the given wall.
 * Association is purely spatial, so dragging an opening onto a wall just works
 * and dragging it off restores the wall. No parent links to keep in sync.
 */
export function openingsForWall(wall: SceneObject, all: SceneObject[]): Opening[] {
  const length = num(wall.params, 'length')
  const height = num(wall.params, 'height')
  const cos = Math.cos(-wall.rotationY)
  const sin = Math.sin(-wall.rotationY)
  const out: Opening[] = []

  for (const o of all) {
    if (o.type !== 'door' && o.type !== 'window') continue
    if (!o.visible) continue

    // world -> wall local (yaw only)
    const dx = o.position[0] - wall.position[0]
    const dz = o.position[2] - wall.position[2]
    const lx = dx * cos - dz * sin
    const lz = dx * sin + dz * cos
    if (Math.abs(lz) > SNAP_DEPTH) continue

    const w = num(o.params, 'width')
    const h = num(o.params, 'height')
    const y0 = o.type === 'window' ? num(o.params, 'sill') : 0
    const y1 = y0 + h

    // must sit within the wall face, with a margin so the hole stays enclosed
    if (lx - w / 2 < -length / 2 + 0.02) continue
    if (lx + w / 2 > length / 2 - 0.02) continue
    if (y1 > height - 0.02) continue

    out.push({ x: lx, width: w, y0, y1 })
  }
  return out
}

/**
 * The wall a loose opening should align itself to, if any.
 * Returns the wall plus the opening's offset along it, so the opening can be
 * snapped flush into the wall centre plane.
 */
export function hostWallFor(
  opening: SceneObject,
  all: SceneObject[],
): { wall: SceneObject; alongX: number } | null {
  let best: { wall: SceneObject; alongX: number; dist: number } | null = null

  for (const wall of all) {
    if (wall.type !== 'wall' || !wall.visible) continue
    const length = num(wall.params, 'length')
    const cos = Math.cos(-wall.rotationY)
    const sin = Math.sin(-wall.rotationY)
    const dx = opening.position[0] - wall.position[0]
    const dz = opening.position[2] - wall.position[2]
    const lx = dx * cos - dz * sin
    const lz = dx * sin + dz * cos
    if (Math.abs(lz) > SNAP_DEPTH) continue
    if (Math.abs(lx) > length / 2) continue
    const dist = Math.abs(lz)
    if (!best || dist < best.dist) best = { wall, alongX: lx, dist }
  }
  return best ? { wall: best.wall, alongX: best.alongX } : null
}
