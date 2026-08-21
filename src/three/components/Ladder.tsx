import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { deg2rad, num, str, type SceneObject } from '../../core/types'
import { Mat } from '../Mat'

/**
 * Leaning ladder. Origin at the foot, centred on width, climbing local +Y.
 *
 * Straight rails are boxes. Rounded rails are tubes swept along a curve, so the
 * ladder can also be bowed with the Curve control.
 */
export function Ladder({ obj }: { obj: SceneObject }) {
  const height = num(obj.params, 'height')
  const width = num(obj.params, 'width')
  const rungs = Math.max(2, Math.round(num(obj.params, 'rungs')))
  const lean = deg2rad(num(obj.params, 'lean'))
  const rail = num(obj.params, 'rail')
  const bow = deg2rad(num(obj.params, 'bow'))
  const rounded = str(obj.params, 'form', 'straight') === 'rounded'
  const finish = str(obj.params, 'finish', 'wood')

  // `height` is the vertical reach; the rails are longer because they lean
  const railLen = height / Math.cos(lean)
  // how far the middle of a bowed rail pushes out sideways
  const bulge = Math.tan(bow) * railLen * 0.25

  /** Centreline of a rail, bowed out along local +X. */
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const steps = bow > 0.001 ? 14 : 1
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      // a simple parabola: zero at both ends, `bulge` at the middle
      pts.push(new THREE.Vector3(bulge * 4 * t * (1 - t), t * railLen, 0))
    }
    return new THREE.CatmullRomCurve3(pts)
  }, [bulge, railLen, bow])

  const railGeom = useMemo(() => {
    if (!rounded && bow <= 0.001) return null
    return new THREE.TubeGeometry(curve, bow > 0.001 ? 20 : 1, rail * 0.5, 10, false)
  }, [curve, rail, rounded, bow])

  useEffect(() => () => railGeom?.dispose(), [railGeom])

  /** Where a rung sits along the (possibly bowed) rail. */
  const rungAt = (t: number) => {
    const p = curve.getPointAt(Math.min(1, Math.max(0, t)))
    return [p.x, p.y] as const
  }

  return (
    <group rotation={[0, 0, -lean]}>
      {[-1, 1].map((side) => {
        const z = (side * (width - rail)) / 2
        return railGeom ? (
          <mesh key={side} geometry={railGeom} position={[0, 0, z]} castShadow receiveShadow>
            <Mat finish={finish} />
          </mesh>
        ) : (
          <mesh key={side} position={[0, railLen / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[rail, railLen, rail]} />
            <Mat finish={finish} />
          </mesh>
        )
      })}

      {Array.from({ length: rungs }, (_, i) => {
        const [x, y] = rungAt((i + 0.5) / rungs)
        return (
          <mesh
            key={i}
            position={[x, y, 0]}
            rotation={rounded ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
            castShadow
          >
            {rounded ? (
              <cylinderGeometry args={[rail * 0.45, rail * 0.45, width - rail, 10]} />
            ) : (
              <boxGeometry args={[rail * 0.9, rail * 0.7, width - rail]} />
            )}
            <Mat finish={finish} />
          </mesh>
        )
      })}
    </group>
  )
}
