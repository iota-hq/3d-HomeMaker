import type CameraControls from 'camera-controls'
import * as THREE from 'three'

/**
 * Camera commands, callable from anywhere in the UI.
 *
 * The important part is `pump`. With `frameloop="demand"` nothing renders
 * unless something asks for a frame, so a smooth `setLookAt` transition would
 * start and then never advance: the camera appeared not to move at all. Every
 * command here drives frames for the length of its transition.
 */

let controls: CameraControls | null = null
let invalidate: (() => void) | null = null

export function bindCamera(c: CameraControls, inv: () => void) {
  controls = c
  invalidate = inv
}

export function unbindCamera() {
  controls = null
  invalidate = null
}

export const cameraReady = () => controls !== null

/** The live controls, for callers that need something the helpers do not cover. */
export const getControls = () => controls

function pump(ms: number) {
  if (!invalidate) return
  const end = performance.now() + ms
  const tick = () => {
    invalidate?.()
    if (performance.now() < end) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

export type ViewName = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'iso'

const DIRECTIONS: Record<ViewName, [number, number, number]> = {
  //          x   y   z
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  front: [0, 0, 1],
  back: [0, 0, -1],
  iso: [0.75, 0.62, 0.85],
}

/** Distance that keeps the whole plot in frame, from the current distance. */
function currentRadius(fallback = 34) {
  if (!controls) return fallback
  const d = controls.distance
  return Number.isFinite(d) && d > 1 ? d : fallback
}

/** When a view is locked the camera may only dolly, never orbit. */
let locked = false
let lockedView: ViewName | null = null
const lockWatchers = new Set<() => void>()

export const isLocked = () => locked
export const currentLockedView = () => lockedView

export function onLockChange(fn: () => void) {
  lockWatchers.add(fn)
  return () => lockWatchers.delete(fn)
}

export function setLock(view: ViewName | null) {
  locked = view !== null
  lockedView = view

  if (controls) {
    // camera-controls maps buttons to actions. Zeroing the rotate speeds alone
    // is not enough, so the rotate action itself is unbound while pinned and
    // the dolly actions are left alone so zooming keeps working.
    const c = controls as unknown as {
      mouseButtons: { left: number; middle: number; right: number; wheel: number }
      touches: { one: number; two: number; three: number }
      azimuthRotateSpeed: number
      polarRotateSpeed: number
      constructor: { ACTION: Record<string, number> }
    }
    const A = c.constructor.ACTION

    if (locked) {
      c.mouseButtons.left = A.NONE
      c.mouseButtons.right = A.TRUCK
      c.mouseButtons.middle = A.DOLLY
      c.mouseButtons.wheel = A.DOLLY
      c.touches.one = A.NONE
      c.touches.two = A.TOUCH_DOLLY_TRUCK
      c.azimuthRotateSpeed = 0
      c.polarRotateSpeed = 0
    } else {
      c.mouseButtons.left = A.ROTATE
      c.mouseButtons.right = A.TRUCK
      c.mouseButtons.middle = A.DOLLY
      c.mouseButtons.wheel = A.DOLLY
      c.touches.one = A.TOUCH_ROTATE
      c.touches.two = A.TOUCH_DOLLY_TRUCK
      c.azimuthRotateSpeed = 1
      c.polarRotateSpeed = 1
    }
  }
  lockWatchers.forEach((fn) => fn())
}

export function setView(name: ViewName) {
  if (!controls) return
  const [dx, dy, dz] = DIRECTIONS[name]
  const r = currentRadius()
  const len = Math.hypot(dx, dy, dz) || 1
  // nudge the pole slightly off vertical so the camera keeps a stable up vector
  const eps = name === 'top' || name === 'bottom' ? 0.0001 : 0
  // moving to a view while locked re-locks onto the new one
  if (locked) lockedView = name
  controls.setLookAt(
    (dx / len) * r + eps,
    (dy / len) * r,
    (dz / len) * r + eps,
    0,
    2,
    0,
    true,
  )
  pump(900)
}

export function zoomBy(delta: number) {
  if (!controls) return
  controls.dolly(delta, true)
  pump(500)
}

export function frameAll(radius = 34) {
  if (!controls) return
  controls.setLookAt(radius * 0.75, radius * 0.62, radius * 0.85, 0, 2, 0, true)
  pump(900)
}

/** Draws a fresh frame and resolves once it is on the canvas, for image export. */
export function requestRender(): Promise<void> {
  return new Promise((resolve) => {
    invalidate?.()
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

/* ---------- gizmo feed ---------- */

type GizmoSink = (camera: THREE.Camera) => void
let sink: GizmoSink | null = null

/** The DOM gizmo registers here; the driver inside the canvas feeds it. */
export function setGizmoSink(fn: GizmoSink | null) {
  sink = fn
}

export function feedGizmo(camera: THREE.Camera) {
  sink?.(camera)
}

/** Camera space direction of a world axis, for placing the gizmo handles. */
const rot = new THREE.Matrix4()
export function axisToCamera(camera: THREE.Camera, axis: THREE.Vector3, out: THREE.Vector3) {
  rot.extractRotation(camera.matrixWorldInverse)
  return out.copy(axis).applyMatrix4(rot)
}

if (import.meta.env.DEV) {
  // the instance the app actually uses, for poking from the console
  ;(window as unknown as Record<string, unknown>).cameraApi = {
    setView,
    zoomBy,
    frameAll,
    getControls,
    requestRender,
    setLock,
    isLocked,
  }
}
