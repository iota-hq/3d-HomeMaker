export type ComponentType =
  | 'ground' | 'wall' | 'door' | 'window' | 'slab' | 'column'
  | 'path' | 'khaprail' | 'bluescope' | 'stairs' | 'ladder'
  | 'room' | 'cupboard' | 'table' | 'bed' | 'mirror'

export type Category = 'Site' | 'Structure' | 'Openings' | 'Roof' | 'Access' | 'Furniture'

/** A declarative description of one editable property of a component.
 *  Geometry generators read the value; the Inspector renders the control. */
export type ParamSpec =
  /** A real-world dimension, stored in metres, shown in ft-in, gets a ratio slider. */
  | { kind: 'length'; label: string; def: number; min: number; max: number; group?: string }
  /** Degrees. */
  | { kind: 'angle'; label: string; def: number; min: number; max: number; group?: string }
  /** Whole number of repeated elements (rungs, steps, mullions). */
  | { kind: 'count'; label: string; def: number; min: number; max: number; group?: string }
  /** Unitless multiplier. */
  | { kind: 'factor'; label: string; def: number; min: number; max: number; step: number; group?: string }
  | { kind: 'enum'; label: string; def: string; options: { value: string; label: string }[]; group?: string }
  | { kind: 'bool'; label: string; def: boolean; group?: string }

export type ParamValue = number | string | boolean
export type Params = Record<string, ParamValue>

export interface ComponentDef {
  type: ComponentType
  label: string
  category: Category
  icon: string
  blurb: string
  params: Record<string, ParamSpec>
  /** Sits flat on the ground (y clamped to 0) vs. free elevation. */
  grounded: boolean
  /** Only one may exist in the scene (the ground plane). */
  singleton?: boolean
}

export interface SceneObject {
  id: string
  type: ComponentType
  name: string
  /** metres, world space. y is the BASE of the object. */
  position: [number, number, number]
  /** yaw, radians. Architecture is yaw-only; tilt is a component param. */
  rotationY: number
  params: Params
  locked: boolean
  visible: boolean
  /** Objects sharing a groupId move together when any one of them is dragged. */
  groupId?: string
  /** Flat coloured look. On by default; off swaps in the real material. */
  lowPoly?: boolean
}

export interface SceneDoc {
  version: 1
  objects: SceneObject[]
}

/** Convenience accessors, params are a loose bag, these keep call sites tidy. */
export const num = (p: Params, k: string, fallback = 0): number =>
  typeof p[k] === 'number' ? (p[k] as number) : fallback
export const str = (p: Params, k: string, fallback = ''): string =>
  typeof p[k] === 'string' ? (p[k] as string) : fallback
export const bool = (p: Params, k: string, fallback = false): boolean =>
  typeof p[k] === 'boolean' ? (p[k] as boolean) : fallback
export const deg2rad = (d: number) => (d * Math.PI) / 180
