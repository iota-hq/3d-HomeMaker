import { CameraControls } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { num, type SceneObject } from '../core/types'
import { snap as snapTo } from '../core/units'
import { useSceneStore } from '../store/useSceneStore'
import { bindCamera, feedGizmo, unbindCamera } from './camera'
import { ObjectBody } from './ObjectView'
import { hostWallFor } from './openings'

/* ------------------------------------------------------------------ */

/**
 * Sun, sky and fill.
 *
 * The shadow camera is sized to whatever the scene actually covers. A fixed
 * frustum either wasted most of its texels on empty space, which coarsens the
 * shadow until it bands, or cropped the shadow off entirely once a second plot
 * was added further out.
 */
function Lighting() {
  const extent = useSceneStore((s) => {
    let r = 14
    for (const o of s.objects) {
      const half =
        o.type === 'ground'
          ? Math.max(num(o.params, 'width', 24), num(o.params, 'depth', 24)) / 2
          : 4
      r = Math.max(r, Math.abs(o.position[0]) + half, Math.abs(o.position[2]) + half)
    }
    // quantise so a drag does not rebuild the shadow camera every frame
    return Math.ceil(Math.min(r, 200) / 10) * 10
  })

  const d = extent * 1.15
  const far = d * 4 + 60

  return (
    <>
      <hemisphereLight args={['#ffffff', '#b7b2a6', 1.05]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[d * 0.55, d * 1.1, d * 0.4]}
        intensity={1.55}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.05}
      >
        <orthographicCamera attach="shadow-camera" args={[-d, d, d, -d, 1, far]} />
      </directionalLight>
      <directionalLight position={[-20, 18, -14]} intensity={0.28} />
    </>
  )
}

/** Unit cube wireframe, shared by every selection box. */
const UNIT_EDGES = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))

/**
 * Outline around a selected object. Rendered as a SIBLING of the target group,
 * never a child, so measuring the target does not include the box itself.
 */
function SelectionBox({ target, accent }: { target: THREE.Object3D | null; accent: boolean }) {
  const ref = useRef<THREE.LineSegments>(null)
  const [box] = useState(() => new THREE.Box3())
  const [size] = useState(() => new THREE.Vector3())
  const [centre] = useState(() => new THREE.Vector3())

  useLayoutEffect(() => {
    const line = ref.current
    if (!line || !target) return
    box.setFromObject(target)
    if (box.isEmpty()) return
    box.getSize(size)
    box.getCenter(centre)
    line.scale.set(Math.max(size.x, 0.01), Math.max(size.y, 0.01), Math.max(size.z, 0.01))
    line.position.copy(centre)
  })

  if (!target) return null
  return (
    <lineSegments ref={ref} geometry={UNIT_EDGES} renderOrder={999} raycast={() => null}>
      <lineBasicMaterial
        color={accent ? '#2f7df6' : '#8b8b93'}
        depthTest={false}
        transparent
        opacity={accent ? 0.95 : 0.6}
      />
    </lineSegments>
  )
}

/* ------------------------------------------------------------------ */

interface NodeProps {
  obj: SceneObject
  selected: boolean
  primary: boolean
  onDragState: (dragging: boolean) => void
}

/**
 * One placed object.
 *
 * Memoised, and the store preserves the identity of objects it did not touch,
 * so dragging one thing re-renders that thing alone.
 */
const ObjectNode = memo(function ObjectNode({ obj, selected, primary, onDragState }: NodeProps) {
  const [group, setGroup] = useState<THREE.Group | null>(null)
  const { gl } = useThree()
  const store = useSceneStore
  const drag = useRef<{
    plane: THREE.Plane
    offset: THREE.Vector3
    ids: string[]
    last: THREE.Vector3
  } | null>(null)

  const setCursor = useCallback(
    (c: string) => {
      gl.domElement.style.cursor = c
    },
    [gl],
  )

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.button !== 0) return
      e.stopPropagation()

      const s = store.getState()
      s.select(obj.id, e.nativeEvent.shiftKey || e.nativeEvent.ctrlKey || e.nativeEvent.metaKey)

      if (obj.locked || obj.type === 'ground') return

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -obj.position[1])
      const hit = new THREE.Vector3()
      if (!e.ray.intersectPlane(plane, hit)) return

      const origin = new THREE.Vector3(...obj.position)
      drag.current = {
        plane,
        offset: hit.clone().sub(origin),
        // a grouped object drags its whole group along with it
        ids: s.linkedIds(obj.id),
        last: origin,
      }
      s.pushHistory()
      onDragState(true)
      setCursor('grabbing')
      ;(e.target as Element)?.setPointerCapture?.(e.pointerId)
    },
    [obj.id, obj.locked, obj.position, obj.type, onDragState, store, setCursor],
  )

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const d = drag.current
      if (!d) return
      e.stopPropagation()
      const hit = new THREE.Vector3()
      if (!e.ray.intersectPlane(d.plane, hit)) return
      hit.sub(d.offset)

      const s = store.getState()
      const step = s.gridSnap
      let x = snapTo(hit.x, step)
      let z = snapTo(hit.z, step)

      // a lone door or window pulls itself flush into whichever wall it is over
      if ((obj.type === 'door' || obj.type === 'window') && d.ids.length === 1) {
        const probe = { ...obj, position: [x, obj.position[1], z] as [number, number, number] }
        const host = hostWallFor(probe, s.objects)
        if (host) {
          const c = Math.cos(host.wall.rotationY)
          const sn = Math.sin(host.wall.rotationY)
          x = host.wall.position[0] + host.alongX * c
          z = host.wall.position[2] - host.alongX * sn
        }
      }

      if (d.ids.length === 1) {
        s.setPosition(obj.id, [x, obj.position[1], z])
      } else {
        s.moveBy(d.ids, x - d.last.x, 0, z - d.last.z)
      }
      d.last.set(x, obj.position[1], z)
    },
    [obj, store],
  )

  const endDrag = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!drag.current) return
      drag.current = null
      onDragState(false)
      setCursor('grab')
      ;(e.target as Element)?.releasePointerCapture?.(e.pointerId)
    },
    [onDragState, setCursor],
  )

  const grabbable = !obj.locked && obj.type !== 'ground'

  useEffect(() => {
    const el = gl.domElement
    const cancel = () => {
      if (drag.current) {
        drag.current = null
        onDragState(false)
        el.style.cursor = 'default'
      }
    }
    el.addEventListener('pointerleave', cancel)
    return () => el.removeEventListener('pointerleave', cancel)
  }, [gl, onDragState])

  if (!obj.visible) return null

  return (
    <>
      <group
        ref={setGroup}
        position={obj.position}
        rotation={[0, obj.rotationY, 0]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerOver={grabbable ? () => setCursor(drag.current ? 'grabbing' : 'grab') : undefined}
        onPointerOut={() => {
          if (!drag.current) setCursor('default')
        }}
      >
        <ObjectBody obj={obj} />
      </group>
      {selected && obj.type !== 'ground' && <SelectionBox target={group} accent={primary} />}
    </>
  )
})

/* ------------------------------------------------------------------ */

function SceneDriver() {
  const state = useThree()
  useFrame(() => feedGizmo(state.camera))
  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).r3f = state
    }
  }, [state])
  return null
}

function Scene({ dragging, setDragging }: { dragging: boolean; setDragging: (v: boolean) => void }) {
  const objects = useSceneStore((s) => s.objects)
  const selectedIds = useSceneStore((s) => s.selectedIds)
  const select = useSceneStore((s) => s.select)

  const primaryId = selectedIds[selectedIds.length - 1]
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  // ground first so everything else sits above it in the picking order
  const ordered = useMemo(
    () => [...objects].sort((a, b) => (a.type === 'ground' ? 0 : 1) - (b.type === 'ground' ? 0 : 1)),
    [objects],
  )

  return (
    <>
      <SceneDriver />
      <Lighting />
      <CamRig enabled={!dragging} />
      <group onPointerMissed={() => select(null)}>
        {ordered.map((obj) => (
          <ObjectNode
            key={obj.id}
            obj={obj}
            selected={selectedSet.has(obj.id)}
            primary={obj.id === primaryId}
            onDragState={setDragging}
          />
        ))}
      </group>
    </>
  )
}

/* ------------------------------------------------------------------ */

function CamRig({ enabled }: { enabled: boolean }) {
  const ref = useRef<CameraControls>(null)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    bindCamera(c as unknown as Parameters<typeof bindCamera>[0], invalidate)
    c.setLookAt(22, 16, 26, 0, 2, 0, false)
    invalidate()
    return unbindCamera
  }, [invalidate])

  return (
    <CameraControls
      ref={ref}
      enabled={enabled}
      minDistance={1.5}
      maxDistance={260}
      maxPolarAngle={Math.PI / 2 - 0.02}
      smoothTime={0.16}
      dollyToCursor
    />
  )
}

/* ------------------------------------------------------------------ */

export function Viewport() {
  const [dragging, setDragging] = useState(false)
  const theme = useSceneStore((s) => s.theme)

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop="demand"
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        // demand frameloop draws rarely, and PNG export reads the buffer back,
        // so keep the last frame instead of letting the compositor drop it
        preserveDrawingBuffer: true,
      }}
      // a tight near plane is what buys depth precision; 0.1 to 800 was a
      // ratio of 8000 to 1 and the ground z-fought with itself at distance
      camera={{ fov: 45, near: 0.5, far: 400, position: [22, 16, 26] }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFShadowMap
      }}
    >
      <color attach="background" args={[theme === 'dark' ? '#121214' : '#f4f4f5']} />
      <Scene dragging={dragging} setDragging={setDragging} />
    </Canvas>
  )
}
