import * as THREE from 'three'
import { bool, deg2rad, num, str, type SceneObject } from '../../core/types'
import { FT, IN } from '../../core/units'
import { Mat } from '../Mat'

const POST = 1.6 * IN
const RAIL_H = 3 * FT

/* ------------------------------------------------------------------ *
 * Straight flight
 * ------------------------------------------------------------------ */

function StraightFlight({
  width,
  steps,
  rise,
  run,
  landing,
  solid,
  finish,
  railSides,
}: {
  width: number
  steps: number
  rise: number
  run: number
  landing: number
  solid: boolean
  finish: string
  railSides: number[]
}) {
  const totalRise = steps * rise
  const totalRun = steps * run

  return (
    <group>
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={i} position={[i * run + run / 2, i * rise + rise / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[run, rise, width]} />
          <Mat finish={finish} scale={width} />
        </mesh>
      ))}

      {solid &&
        Array.from({ length: steps }, (_, i) => {
          const h = i * rise
          if (h <= 0) return null
          return (
            <mesh key={`u${i}`} position={[i * run + run / 2, h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[run, h, width]} />
              <Mat finish={finish} scale={width} />
            </mesh>
          )
        })}

      {landing > 0 && (
        <mesh position={[totalRun + landing / 2, totalRise - rise / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[landing, rise, width]} />
          <Mat finish={finish} scale={width} />
        </mesh>
      )}

      {railSides.map((side) => {
        const z = side * (width / 2 - POST / 2)
        const posts = Math.max(2, Math.round(steps / 3) + 1)
        const angle = Math.atan2(totalRise, totalRun)
        return (
          <group key={side}>
            {Array.from({ length: posts }, (_, i) => {
              const t = i / (posts - 1)
              return (
                <mesh key={i} position={[t * totalRun, t * totalRise + RAIL_H / 2, z]} castShadow>
                  <boxGeometry args={[POST, RAIL_H, POST]} />
                  <Mat finish="steel" />
                </mesh>
              )
            })}
            <mesh
              position={[totalRun / 2, totalRise / 2 + RAIL_H, z]}
              rotation={[0, 0, angle]}
              castShadow
            >
              <boxGeometry args={[Math.hypot(totalRun, totalRise), 2 * IN, 2.5 * IN]} />
              <Mat finish="wood" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Curved flight
 *
 * Treads fan around a centre at local (-radius - width/2, 0), so the inner
 * edge of the flight starts at the origin and the stair sweeps round as it
 * climbs, like the reference photo.
 * ------------------------------------------------------------------ */

function CurvedFlight({
  width,
  steps,
  rise,
  sweep,
  radius,
  solid,
  finish,
  railSides,
}: {
  width: number
  steps: number
  rise: number
  sweep: number
  radius: number
  solid: boolean
  finish: string
  railSides: number[]
}) {
  const rInner = Math.max(radius, 0.01)
  const rOuter = rInner + width
  const perStep = sweep / steps

  const rMid = rInner + width / 2
  // Every tread is the SAME box: equal width and equal going, no wedges. The
  // depth is the arc each step covers at mid width, with a hair of overlap so
  // neighbours meet cleanly as they rotate.
  const going = rMid * perStep * 1.02
  const treadT = Math.max(rise * 0.3, 1.2 * IN)

  /** Handrail centreline at a given radius, following the helix. */
  const railCurve = (r: number) => {
    const pts: THREE.Vector3[] = []
    const n = Math.max(8, steps * 2)
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const a = t * sweep
      pts.push(new THREE.Vector3(Math.cos(a) * r, t * steps * rise + RAIL_H, Math.sin(a) * r))
    }
    return new THREE.CatmullRomCurve3(pts)
  }

  return (
    // shift so the inner edge of the first tread sits at the local origin
    <group position={[-rInner, 0, 0]}>
      {Array.from({ length: steps }, (_, i) => {
        const a = i * perStep
        const y = (i + 1) * rise
        return (
          <group key={i} position={[Math.cos(a) * rMid, 0, Math.sin(a) * rMid]} rotation={[0, -a, 0]}>
            <mesh position={[0, y - treadT / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[width, treadT, going]} />
              <Mat finish={finish} scale={width} />
            </mesh>
            {solid && (
              <mesh position={[0, (y - treadT) / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width * 0.94, Math.max(y - treadT, 0.001), going * 0.96]} />
                <Mat finish={finish === 'wood' ? 'plaster' : finish} scale={width} />
              </mesh>
            )}
          </group>
        )
      })}

      {railSides.map((side) => {
        const r = side < 0 ? rInner + POST : rOuter - POST
        const curve = railCurve(r)
        const posts = Math.max(3, Math.round(steps / 2))
        return (
          <group key={side} rotation={[0, 0, 0]}>
            <mesh castShadow>
              <tubeGeometry args={[curve, Math.max(16, steps * 2), 1.1 * IN, 8, false]} />
              <Mat finish="wood" />
            </mesh>
            {Array.from({ length: posts }, (_, i) => {
              const t = i / (posts - 1)
              const a = t * sweep
              const y = t * steps * rise
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * r, y + RAIL_H / 2, Math.sin(a) * r]}
                  castShadow
                >
                  <cylinderGeometry args={[POST * 0.5, POST * 0.5, RAIL_H, 8]} />
                  <Mat finish="paint" />
                </mesh>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ */

/** Climbs along local +X when straight, or sweeps around when curved. */
export function Stairs({ obj }: { obj: SceneObject }) {
  const curved = str(obj.params, 'form', 'straight') === 'curved'
  const width = num(obj.params, 'width')
  const steps = Math.max(1, Math.round(num(obj.params, 'steps')))
  const rise = num(obj.params, 'rise')
  const run = num(obj.params, 'run')
  const landing = num(obj.params, 'landing')
  const railing = str(obj.params, 'railing', 'both')
  const solid = bool(obj.params, 'solid', true)
  const finish = str(obj.params, 'finish', 'concrete')
  const sweep = deg2rad(num(obj.params, 'sweep', 90))
  const radius = num(obj.params, 'radius', 3 * FT)

  const railSides: number[] = []
  if (railing === 'both' || railing === 'left') railSides.push(-1)
  if (railing === 'both' || railing === 'right') railSides.push(1)

  return curved ? (
    <CurvedFlight
      width={width}
      steps={steps}
      rise={rise}
      sweep={sweep}
      radius={radius}
      solid={solid}
      finish={finish}
      railSides={railSides}
    />
  ) : (
    <StraightFlight
      width={width}
      steps={steps}
      rise={rise}
      run={run}
      landing={landing}
      solid={solid}
      finish={finish}
      railSides={railSides}
    />
  )
}
