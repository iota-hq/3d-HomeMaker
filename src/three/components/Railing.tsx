import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { bool, deg2rad, num, str, type SceneObject } from '../../core/types'
import { IN } from '../../core/units'
import { Mat } from '../Mat'

/**
 * A free standing railing, separate from the one a staircase carries.
 *
 * Straight runs along local X from the origin. Curved bends around a centre so
 * it can follow a balcony or a landing. Either way it stays horizontal.
 */
export function Railing({ obj }: { obj: SceneObject }) {
  const curved = str(obj.params, 'form', 'straight') === 'curved'
  const length = num(obj.params, 'length')
  const sweep = deg2rad(num(obj.params, 'sweep', 90))
  const radius = Math.max(num(obj.params, 'radius', 2), 0.2)
  const height = num(obj.params, 'height')
  const posts = Math.max(2, Math.round(num(obj.params, 'posts')))
  const bars = Math.round(num(obj.params, 'bars'))
  const balusters = bool(obj.params, 'balusters')
  const thick = num(obj.params, 'topRail')
  const finish = str(obj.params, 'finish', 'steel')

  const glass = finish === 'glass'
  const frame = glass ? 'aluminium' : finish

  /** Centreline of the run at a given height. */
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const n = curved ? Math.max(12, Math.round((sweep * 180) / Math.PI / 6)) : 1
    for (let i = 0; i <= n; i++) {
      const t = i / n
      if (curved) {
        const a = t * sweep
        pts.push(new THREE.Vector3(Math.sin(a) * radius, 0, radius - Math.cos(a) * radius))
      } else {
        pts.push(new THREE.Vector3(t * length, 0, 0))
      }
    }
    return new THREE.CatmullRomCurve3(pts)
  }, [curved, sweep, radius, length])

  /** One horizontal rail, swept along the run at height y. */
  const railGeom = useMemo(() => {
    const g = new THREE.TubeGeometry(curve, curved ? 48 : 1, thick / 2, 8, false)
    return g
  }, [curve, curved, thick])

  useEffect(() => () => railGeom.dispose(), [railGeom])

  const at = (t: number) => curve.getPointAt(Math.min(1, Math.max(0, t)))
  const heights = [height, ...Array.from({ length: bars }, (_, i) => ((i + 1) / (bars + 1)) * height)]

  const balusterCount = balusters ? Math.max(posts, Math.round((curved ? sweep * radius : length) / (5 * IN))) : 0

  return (
    <group>
      {/* posts */}
      {Array.from({ length: posts }, (_, i) => {
        const p = at(i / (posts - 1))
        return (
          <mesh key={i} position={[p.x, height / 2, p.z]} castShadow receiveShadow>
            <boxGeometry args={[thick * 1.3, height, thick * 1.3]} />
            <Mat finish={frame} />
          </mesh>
        )
      })}

      {/* top rail, plus any horizontal bars below it */}
      {heights.map((y, i) => (
        <mesh key={i} geometry={railGeom} position={[0, y, 0]} castShadow>
          <Mat finish={frame} />
        </mesh>
      ))}

      {/* vertical spindles between the posts */}
      {Array.from({ length: balusterCount }, (_, i) => {
        const p = at((i + 0.5) / balusterCount)
        return (
          <mesh key={`b${i}`} position={[p.x, height / 2, p.z]} castShadow>
            <boxGeometry args={[thick * 0.55, height, thick * 0.55]} />
            <Mat finish={frame} />
          </mesh>
        )
      })}

      {/* glass infill sits between the posts as flat panels */}
      {glass &&
        Array.from({ length: posts - 1 }, (_, i) => {
          const a = at(i / (posts - 1))
          const b = at((i + 1) / (posts - 1))
          const mid = a.clone().add(b).multiplyScalar(0.5)
          const span = a.distanceTo(b)
          const yaw = Math.atan2(b.z - a.z, b.x - a.x)
          return (
            <mesh key={`g${i}`} position={[mid.x, height * 0.5, mid.z]} rotation={[0, -yaw, 0]}>
              <boxGeometry args={[span - thick * 1.4, height - thick * 2, 0.35 * IN]} />
              <Mat finish="glass" />
            </mesh>
          )
        })}
    </group>
  )
}
