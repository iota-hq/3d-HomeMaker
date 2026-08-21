import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { bool, num, str, type SceneObject } from '../../core/types'
import { IN } from '../../core/units'
import { Mat } from '../Mat'
import { Door } from './Door'
import { Win } from './Win'

/** Keeps a floor level opening from touching the outline, which breaks the shape. */
const THRESHOLD = 0.002

interface Hole {
  centre: number
  width: number
  y0: number
  y1: number
}

/** A wall panel with its own openings punched through it. */
function Panel({
  length,
  height,
  thickness,
  holes,
  finish,
}: {
  length: number
  height: number
  thickness: number
  holes: Hole[]
  finish: string
}) {
  const key = holes.map((h) => `${h.centre.toFixed(3)},${h.width},${h.y0},${h.y1}`).join('|')

  const geometry = useMemo(() => {
    const hl = length / 2
    const shape = new THREE.Shape()
    shape.moveTo(-hl, 0)
    shape.lineTo(hl, 0)
    shape.lineTo(hl, height)
    shape.lineTo(-hl, height)
    shape.closePath()

    for (const h of holes) {
      const y0 = Math.max(h.y0, THRESHOLD)
      const y1 = Math.min(h.y1, height - THRESHOLD)
      const x0 = Math.max(h.centre - h.width / 2, -hl + THRESHOLD)
      const x1 = Math.min(h.centre + h.width / 2, hl - THRESHOLD)
      if (y1 <= y0 || x1 <= x0) continue
      const path = new THREE.Path()
      path.moveTo(x0, y0)
      path.lineTo(x1, y0)
      path.lineTo(x1, y1)
      path.lineTo(x0, y1)
      path.closePath()
      shape.holes.push(path)
    }

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 1,
    })
    g.translate(0, 0, -thickness / 2)
    g.computeVertexNormals()
    return g
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, height, thickness, key])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <Mat finish={finish} scale={[length, height]} />
    </mesh>
  )
}

/**
 * A whole room in one component: four walls, a door in the front wall and a
 * window in each side wall, plus an optional floor and ceiling slab.
 *
 * Everything is driven by this component's own parameters, so the walls, the
 * door and the windows all stay adjustable after it is placed. Origin is the
 * centre of the floor.
 */
export function Room({ obj }: { obj: SceneObject }) {
  const square = str(obj.params, 'shape', 'rect') === 'square'
  const width = num(obj.params, 'width')
  const depth = square ? width : num(obj.params, 'depth')
  const height = num(obj.params, 'height')
  const t = num(obj.params, 'thickness')
  const finish = str(obj.params, 'finish', 'plaster')

  const doorW = num(obj.params, 'doorWidth')
  const doorH = num(obj.params, 'doorHeight')
  const doorOffset = num(obj.params, 'doorOffset')
  const winW = num(obj.params, 'winWidth')
  const winH = num(obj.params, 'winHeight')
  const winSill = num(obj.params, 'winSill')
  const hasFloor = bool(obj.params, 'floor', true)
  const hasCeiling = bool(obj.params, 'ceiling', false)

  // keep the door clear of the corners
  const maxOffset = Math.max(0, width / 2 - doorW / 2 - t)
  const doorX = Math.max(-maxOffset, Math.min(maxOffset, doorOffset * (width / 2)))
  const winMax = Math.max(0, depth / 2 - winW / 2 - t)
  const winZ = Math.max(-winMax, Math.min(winMax, 0))

  const doorHole: Hole[] = [{ centre: doorX, width: doorW, y0: 0, y1: doorH }]
  const winHole: Hole[] = [{ centre: winZ, width: winW, y0: winSill, y1: winSill + winH }]

  /** Openings reuse the real Door and Window components, so they match. */
  const doorObj: SceneObject = {
    ...obj,
    type: 'door',
    params: { width: doorW, height: doorH, frame: 2.5 * IN, leaves: 'single', swing: 80, finish: 'wood' },
  }
  const winObj = (): SceneObject => ({
    ...obj,
    type: 'window',
    params: {
      width: winW,
      height: winH,
      sill: winSill,
      frame: 2 * IN,
      colsMull: 1,
      rowsMull: 0,
      ledge: true,
      finish: 'aluminium',
    },
  })

  return (
    <group>
      {/* The floor sits ON the ground rather than flush into it. Spanning
          -3in to 0 put its top face exactly on the ground plane, which is a
          coplanar pair and z-fights from above. A real floor slab is proud of
          grade anyway. */}
      {hasFloor && (
        <mesh position={[0, 1.5 * IN, 0]} receiveShadow>
          <boxGeometry args={[width + t, 3 * IN, depth + t]} />
          <Mat finish="tile" scale={Math.max(width, depth)} />
        </mesh>
      )}

      {/* front wall, carries the door */}
      <group position={[0, 0, depth / 2]}>
        <Panel length={width + t} height={height} thickness={t} holes={doorHole} finish={finish} />
        <group position={[doorX, 0, 0]}>
          <Door obj={doorObj} />
        </group>
      </group>

      {/* back wall */}
      <group position={[0, 0, -depth / 2]}>
        <Panel length={width + t} height={height} thickness={t} holes={[]} finish={finish} />
      </group>

      {/* left and right walls, each with a window */}
      {[-1, 1].map((side) => (
        <group key={side} position={[(side * width) / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Panel length={depth - t} height={height} thickness={t} holes={winHole} finish={finish} />
          <group position={[winZ, 0, 0]}>
            <Win obj={winObj()} />
          </group>
        </group>
      ))}

      {hasCeiling && (
        <mesh position={[0, height + 3 * IN, 0]} castShadow receiveShadow>
          <boxGeometry args={[width + t, 6 * IN, depth + t]} />
          <Mat finish="concrete" scale={Math.max(width, depth)} />
        </mesh>
      )}
    </group>
  )
}
