import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { deg2rad, num, str, type SceneObject } from '../../core/types'
import { IN } from '../../core/units'
import { Mat } from '../Mat'

/**
 * Profile of a classic turned baluster, as radius against height from 0 to 1.
 * Lathing this is what separates a banister from a row of prison bars: the
 * bulges catch light along their length instead of reading as flat sticks.
 */
const TURNED: [number, number][] = [
  [0.0, 1.0],
  [0.05, 1.0],
  [0.07, 0.72],
  [0.13, 0.68],
  [0.16, 0.95],
  [0.21, 0.88],
  [0.26, 0.48],
  [0.34, 0.44],
  [0.42, 0.88],
  [0.5, 1.0],
  [0.58, 0.9],
  [0.66, 0.52],
  [0.76, 0.4],
  [0.83, 0.5],
  [0.87, 0.78],
  [0.91, 0.74],
  [0.95, 0.5],
  [1.0, 0.52],
]

/**
 * Free standing railing, separate from the one a staircase carries.
 *
 * Straight runs along local X from the origin. Curved bends around a centre so
 * it can follow a balcony or a landing. Either way it stays horizontal.
 */
export function Railing({ obj }: { obj: SceneObject }) {
  const curved = str(obj.params, 'form', 'straight') === 'curved'
  const style = str(obj.params, 'style', 'turned')
  const length = num(obj.params, 'length')
  const sweep = deg2rad(num(obj.params, 'sweep', 90))
  const radius = Math.max(num(obj.params, 'radius', 2), 0.2)
  const height = num(obj.params, 'height')
  const posts = Math.max(2, Math.round(num(obj.params, 'posts')))
  const spacing = Math.max(num(obj.params, 'density', 5 * IN), 2 * IN)
  const bars = Math.round(num(obj.params, 'bars'))
  const thick = num(obj.params, 'topRail')
  const finish = str(obj.params, 'finish', 'wood')

  /** Centreline of the run, at y = 0. */
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

  const runLength = curved ? sweep * radius : length

  /** Handrail and any lower bars are swept along the run. */
  const railGeom = useMemo(
    () => new THREE.TubeGeometry(curve, curved ? 60 : 1, thick / 2, 10, false),
    [curve, curved, thick],
  )

  /** One turned baluster, lathed from the profile above. */
  const spindleGeom = useMemo(() => {
    if (style !== 'turned') return null
    const baseR = spacing * 0.3
    const shaft = height - thick * 2
    const pts = TURNED.map(([t, r]) => new THREE.Vector2(Math.max(r * baseR, 0.002), t * shaft))
    return new THREE.LatheGeometry(pts, 14)
  }, [style, spacing, height, thick])

  /** A plain round bar, used by the scrollwork style. */
  const barGeom = useMemo(() => {
    if (style !== 'ornate' && style !== 'bars') return null
    const shaft = height - thick * 2
    return style === 'bars'
      ? new THREE.BoxGeometry(thick * 0.5, shaft, thick * 0.5)
      : new THREE.CylinderGeometry(thick * 0.22, thick * 0.22, shaft, 10)
  }, [style, height, thick])

  /** A half circle of iron, mirrored into an S when paired. */
  const scrollGeom = useMemo(() => {
    if (style !== 'ornate') return null
    const r = Math.min(spacing * 0.5, height * 0.14)
    return new THREE.TorusGeometry(r, thick * 0.18, 6, 18, Math.PI * 1.4)
  }, [style, spacing, height, thick])

  /** A small rosette that sits at mid height between the scrolls. */
  const petalGeom = useMemo(() => {
    if (style !== 'ornate') return null
    return new THREE.SphereGeometry(thick * 0.3, 8, 6)
  }, [style, thick])

  useEffect(
    () => () => {
      railGeom.dispose()
      spindleGeom?.dispose()
      barGeom?.dispose()
      scrollGeom?.dispose()
      petalGeom?.dispose()
    },
    [railGeom, spindleGeom, barGeom, scrollGeom, petalGeom],
  )

  const at = (t: number) => curve.getPointAt(Math.min(1, Math.max(0, t)))
  /** Which way the run is heading at t, so infill can face along it. */
  const yawAt = (t: number) => {
    const a = at(Math.max(0, t - 0.01))
    const b = at(Math.min(1, t + 0.01))
    return Math.atan2(b.z - a.z, b.x - a.x)
  }

  const railHeights = [height, ...Array.from({ length: bars }, (_, i) => ((i + 1) / (bars + 1)) * height)]
  const infillCount = style === 'glass' ? 0 : Math.max(2, Math.round(runLength / spacing))

  return (
    <group>
      {/* newel posts */}
      {Array.from({ length: posts }, (_, i) => {
        const t = i / (posts - 1)
        const p = at(t)
        const cap = thick * 1.6
        return (
          <group key={`p${i}`} position={[p.x, 0, p.z]} rotation={[0, -yawAt(t), 0]}>
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[thick * 1.5, height, thick * 1.5]} />
              <Mat finish={finish} />
            </mesh>
            {/* a turned cap finishes the post rather than leaving a cut stick */}
            <mesh position={[0, height + cap * 0.35, 0]} castShadow>
              <sphereGeometry args={[cap * 0.55, 12, 10]} />
              <Mat finish={finish} />
            </mesh>
          </group>
        )
      })}

      {/* handrail, and any lower bars */}
      {railHeights.map((y, i) => (
        <mesh key={`r${i}`} geometry={railGeom} position={[0, y, 0]} castShadow>
          <Mat finish={finish} />
        </mesh>
      ))}

      {/* infill */}
      {Array.from({ length: infillCount }, (_, i) => {
        const t = (i + 0.5) / infillCount
        const p = at(t)
        const yaw = yawAt(t)
        const base = thick

        if (style === 'turned' && spindleGeom) {
          return (
            <mesh key={`s${i}`} geometry={spindleGeom} position={[p.x, base, p.z]} castShadow>
              <Mat finish={finish} />
            </mesh>
          )
        }

        if (style === 'ornate' && barGeom && scrollGeom && petalGeom) {
          const shaft = height - thick * 2
          const r = Math.min(spacing * 0.5, height * 0.14)
          return (
            <group key={`s${i}`} position={[p.x, 0, p.z]} rotation={[0, -yaw, 0]}>
              <mesh geometry={barGeom} position={[0, base + shaft / 2, 0]} castShadow>
                <Mat finish={finish} />
              </mesh>
              {/* mirrored scrolls make an S curve either side of the bar */}
              <mesh geometry={scrollGeom} position={[0, base + shaft * 0.32, 0]} castShadow>
                <Mat finish={finish} />
              </mesh>
              <mesh
                geometry={scrollGeom}
                position={[0, base + shaft * 0.68, 0]}
                rotation={[0, 0, Math.PI]}
                castShadow
              >
                <Mat finish={finish} />
              </mesh>
              {/* rosette: a ring of petals around the middle */}
              {Array.from({ length: 5 }, (_, k) => {
                const a = (k / 5) * Math.PI * 2
                return (
                  <mesh
                    key={k}
                    geometry={petalGeom}
                    position={[Math.cos(a) * r * 0.32, base + shaft * 0.5 + Math.sin(a) * r * 0.32, 0]}
                    castShadow
                  >
                    <Mat finish={finish} />
                  </mesh>
                )
              })}
            </group>
          )
        }

        if (barGeom) {
          return (
            <mesh
              key={`s${i}`}
              geometry={barGeom}
              position={[p.x, base + (height - thick * 2) / 2, p.z]}
              rotation={[0, -yaw, 0]}
              castShadow
            >
              <Mat finish={finish} />
            </mesh>
          )
        }
        return null
      })}

      {/* glass sits between the posts as flat panels */}
      {style === 'glass' &&
        Array.from({ length: posts - 1 }, (_, i) => {
          const a = at(i / (posts - 1))
          const b = at((i + 1) / (posts - 1))
          const mid = a.clone().add(b).multiplyScalar(0.5)
          const span = a.distanceTo(b)
          const yaw = Math.atan2(b.z - a.z, b.x - a.x)
          return (
            <mesh key={`g${i}`} position={[mid.x, height * 0.5, mid.z]} rotation={[0, -yaw, 0]}>
              <boxGeometry args={[span - thick * 1.8, height - thick * 2.4, 0.35 * IN]} />
              <Mat finish="glass" />
            </mesh>
          )
        })}
    </group>
  )
}
