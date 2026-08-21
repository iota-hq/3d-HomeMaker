import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { bool, deg2rad, num, str, type SceneObject } from '../../core/types'
import { FT, IN } from '../../core/units'
import { Mat } from '../Mat'

/** Past this the courses stop being individual tiles and become a capping slab. */
const MAX_TILES = 9000

interface SlopeProps {
  dir: number
  runOut: number
  slope: number
  pitch: number
  overhang: number
  lengthOut: number
  courses: number
  perCourse: number
  tile: number
  finish: string
  rafters: boolean
  geom: THREE.BufferGeometry
  tooMany: boolean
}

/**
 * One roof plane: deck, rafters and a field of instanced pan tiles.
 * Declared at module level so it keeps its identity across renders; an inline
 * component would remount the InstancedMesh on every parameter change.
 */
function Slope({
  dir,
  runOut,
  slope,
  pitch,
  overhang,
  lengthOut,
  courses,
  perCourse,
  tile,
  finish,
  rafters,
  geom,
  tooMany,
}: SlopeProps) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const total = courses * perCourse

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh || tooMany) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, dir * -pitch))
    const s = new THREE.Vector3(1, 1, 1)
    const v = new THREE.Vector3()
    let i = 0
    for (let c = 0; c < courses; c++) {
      const along = ((c + 0.5) / courses) * slope
      const x = dir * (runOut - along * Math.cos(pitch))
      const y = along * Math.sin(pitch) - overhang * Math.tan(pitch)
      for (let k = 0; k < perCourse; k++) {
        const z = -lengthOut / 2 + ((k + 0.5) / perCourse) * lengthOut
        v.set(x, y, z)
        m.compose(v, q, s)
        mesh.setMatrixAt(i++, m)
      }
    }
    mesh.count = i
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [dir, runOut, slope, pitch, overhang, lengthOut, courses, perCourse, tooMany, total, geom])

  const midX = dir * (runOut - (slope / 2) * Math.cos(pitch))
  const midY = (slope / 2) * Math.sin(pitch) - overhang * Math.tan(pitch)
  const rafterCount = Math.max(2, Math.round(lengthOut / (2 * FT)))

  return (
    <group>
      {/* deck under the tiles, so no daylight shows between courses */}
      <mesh
        position={[midX, midY - 1.5 * IN, 0]}
        rotation={[0, 0, dir * -pitch]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[slope, 2 * IN, lengthOut]} />
        <Mat finish="wood" />
      </mesh>

      {rafters &&
        Array.from({ length: rafterCount }, (_, i) => {
          const z = -lengthOut / 2 + ((i + 0.5) / rafterCount) * lengthOut
          return (
            <mesh
              key={i}
              position={[midX, midY - 4 * IN, z]}
              rotation={[0, 0, dir * -pitch]}
              castShadow
            >
              <boxGeometry args={[slope, 3.5 * IN, 3 * IN]} />
              <Mat finish="wood" />
            </mesh>
          )
        })}

      {tooMany ? (
        <mesh
          position={[midX, midY + tile * 0.25, 0]}
          rotation={[0, 0, dir * -pitch]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[slope, tile * 0.4, lengthOut]} />
          <Mat finish={finish} />
        </mesh>
      ) : (
        <instancedMesh
          ref={ref}
          key={total}
          args={[geom, undefined, total]}
          castShadow
          receiveShadow
        >
          <Mat finish={finish} />
        </instancedMesh>
      )}
    </group>
  )
}

/**
 * Traditional pitched clay-tile roof.
 * Span runs along local X, ridge along local Z. Origin sits at eaves level,
 * centred on the footprint, so raising it to wall height caps a room.
 */
export function Khaprail({ obj }: { obj: SceneObject }) {
  const span = num(obj.params, 'span')
  const length = num(obj.params, 'length')
  const pitch = deg2rad(num(obj.params, 'pitch'))
  const overhang = num(obj.params, 'overhang')
  const tile = num(obj.params, 'tile')
  const gable = str(obj.params, 'style', 'gable') === 'gable'
  const ridgeCap = bool(obj.params, 'ridge', true)
  const rafters = bool(obj.params, 'rafters', true)
  const finish = str(obj.params, 'finish', 'terracotta')

  const run = gable ? span / 2 : span
  const runOut = run + overhang
  const slope = runOut / Math.cos(pitch)
  const rise = run * Math.tan(pitch)
  const lengthOut = length + overhang * 2

  const courses = Math.max(1, Math.round(slope / (tile * 0.78)))
  const perCourse = Math.max(1, Math.round(lengthOut / (tile * 0.85)))
  const tooMany = courses * perCourse > MAX_TILES

  /** A half-round pan tile, lying with its channel running down the slope. */
  const geom = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      tile * 0.5,
      tile * 0.44,
      tile * 0.98,
      8,
      1,
      true,
      0,
      Math.PI,
    )
    g.rotateZ(Math.PI / 2)
    g.rotateY(Math.PI / 2)
    return g
  }, [tile])

  useEffect(() => () => geom.dispose(), [geom])

  const shared = {
    runOut,
    slope,
    pitch,
    overhang,
    lengthOut,
    courses,
    perCourse,
    tile,
    finish,
    rafters,
    geom,
    tooMany,
  }

  return (
    <group>
      <Slope dir={1} {...shared} />
      {gable && <Slope dir={-1} {...shared} />}

      {ridgeCap && (
        <mesh position={[0, rise + tile * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[tile * 0.55, tile * 0.55, lengthOut, 8, 1, false, 0, Math.PI]} />
          <Mat finish={finish} />
        </mesh>
      )}

      {/* tie beam across the eaves, the visible timber of a khaprail roof */}
      {rafters && (
        <mesh position={[0, -5 * IN, 0]} castShadow>
          <boxGeometry args={[span, 4 * IN, 4 * IN]} />
          <Mat finish="wood" />
        </mesh>
      )}
    </group>
  )
}
