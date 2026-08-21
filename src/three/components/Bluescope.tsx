import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { bool, deg2rad, num, str, type SceneObject } from '../../core/types'
import { FT, IN } from '../../core/units'
import { Mat } from '../Mat'

/**
 * Tata BlueScope DURASHINE profiles, in metres.
 *
 * DURASHINE Roof is the 1015mm cover trapezoidal sheet with square fluting.
 * DURASHINE Tile is the tile look sheet, whose steps run DOWN the slope rather
 * than across it, so it is drawn separately below.
 */
const PROFILES: Record<string, { pitch: number; height: number; kind: 'wave' | 'trap' | 'seam' }> = {
  durashine: { pitch: 0.2032, height: 0.028, kind: 'trap' },
  corrugated: { pitch: 0.076, height: 0.018, kind: 'wave' },
  kliplok: { pitch: 0.2, height: 0.041, kind: 'seam' },
  tileprofile: { pitch: 0.35, height: 0.03, kind: 'trap' },
}

const SHEET = 0.9 * IN

interface SlopeProps {
  dir: number
  tileLook: boolean
  tileRows: number
  p: { pitch: number; height: number; kind: 'wave' | 'trap' | 'seam' }
  ridgeX: number
  ridgeY: number
  pitch: number
  geometry: THREE.BufferGeometry
  finish: string
  purlins: boolean
  purlinCount: number
  slope: number
  lengthOut: number
}

/**
 * One sheet, anchored at the high edge and descending along +X.
 * `dir` mirrors it for the far side of a gable. Module level so it keeps its
 * identity across renders rather than remounting on every parameter change.
 */
function Slope({
  dir,
  tileLook,
  tileRows,
  p,
  ridgeX,
  ridgeY,
  pitch,
  geometry,
  finish,
  purlins,
  purlinCount,
  slope,
  lengthOut,
}: SlopeProps) {
  return (
    <group position={[ridgeX, ridgeY, 0]} rotation={[0, dir < 0 ? Math.PI : 0, 0]}>
      <group rotation={[0, 0, -pitch]}>
        <mesh geometry={geometry} castShadow receiveShadow>
          <Mat finish={finish} />
        </mesh>
        {tileLook &&
          Array.from({ length: tileRows }, (_, i) => {
            const d = ((i + 1) / (tileRows + 1)) * slope
            return (
              <mesh key={`t${i}`} position={[d, p.height * 0.55, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.2 * IN, p.height * 1.1, lengthOut]} />
                <Mat finish={finish} />
              </mesh>
            )
          })}
        {purlins &&
          Array.from({ length: purlinCount }, (_, i) => {
            const d = ((i + 0.5) / purlinCount) * slope
            return (
              <mesh key={i} position={[d, -SHEET - 2 * IN, 0]} castShadow>
                <boxGeometry args={[3 * IN, 4 * IN, lengthOut]} />
                <Mat finish="galvanised" />
              </mesh>
            )
          })}
      </group>
    </group>
  )
}

/**
 * Colour-coated steel sheet roof on columns.
 *
 * The corrugation is a real cross-section extruded along the slope, so the
 * profile stays crisp at any span and each slope costs one draw call.
 * Local frame: span across X, ridge along Z, footprint centred on the origin,
 * columns standing on the ground at y = 0.
 */
export function Bluescope({ obj }: { obj: SceneObject }) {
  const span = num(obj.params, 'span')
  const length = num(obj.params, 'length')
  const pitch = deg2rad(num(obj.params, 'pitch'))
  const overhang = num(obj.params, 'overhang')
  const profile = str(obj.params, 'profile', 'durashine')
  const gable = str(obj.params, 'style', 'mono') === 'gable'
  const purlins = bool(obj.params, 'purlins', true)
  const legs = bool(obj.params, 'legs', true)
  const legHeight = legs ? num(obj.params, 'legHeight') : 0
  const finish = str(obj.params, 'finish', 'nuvoblue')

  const run = gable ? span / 2 : span
  const rise = run * Math.tan(pitch)
  const slope = (run + overhang) / Math.cos(pitch)
  const lengthOut = length + overhang * 2
  const p = PROFILES[profile] ?? PROFILES.durashine
  const tileLook = profile === 'tileprofile'

  // the high edge: mid-span for a gable, the back edge for a mono-pitch
  const ridgeX = gable ? 0 : -span / 2
  const ridgeY = legHeight + rise

  /**
   * One sheet. Drawn as a cross-section across the roof length, extruded along
   * the slope, then turned so it runs +X down the slope with the length on Z.
   */
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const n = Math.max(2, Math.min(320, Math.round(lengthOut / p.pitch)))
    const step = lengthOut / n
    const x0 = -lengthOut / 2

    const rib = (i: number): [number, number][] => {
      const a = x0 + i * step
      const b = a + step
      if (p.kind === 'wave') {
        const pts: [number, number][] = []
        for (let s = 1; s <= 4; s++) {
          const u = s / 4
          pts.push([a + step * u, (Math.sin(u * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5) * p.height])
        }
        return pts
      }
      if (p.kind === 'trap') {
        return [
          [a + step * 0.34, 0],
          [a + step * 0.42, p.height],
          [a + step * 0.58, p.height],
          [a + step * 0.66, 0],
          [b, 0],
        ]
      }
      return [
        [a + step * 0.46, 0],
        [a + step * 0.48, p.height],
        [a + step * 0.52, p.height],
        [a + step * 0.54, 0],
        [b, 0],
      ]
    }

    shape.moveTo(x0, 0)
    for (let i = 0; i < n; i++) for (const [x, y] of rib(i)) shape.lineTo(x, y)
    shape.lineTo(x0 + lengthOut, -SHEET)
    shape.lineTo(x0, -SHEET)
    shape.closePath()

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: slope,
      bevelEnabled: false,
      curveSegments: 1,
    })
    // extrude depth becomes +X (down the slope), the section spans Z (the length)
    g.rotateY(Math.PI / 2)
    g.computeVertexNormals()
    return g
  }, [lengthOut, slope, p.kind, p.pitch, p.height])

  useEffect(() => () => geometry.dispose(), [geometry])

  const purlinCount = Math.max(2, Math.round(slope / (4 * FT)))

  // tile look sheets get a stepped ridge every ~14in down the slope
  const tileRows = tileLook ? Math.max(1, Math.round(slope / (14 * IN))) : 0
  const sheet = {
    ridgeX,
    ridgeY,
    pitch,
    geometry,
    finish,
    purlins,
    purlinCount,
    slope,
    lengthOut,
    tileLook,
    tileRows,
    p,
  }

  // a column at each footprint corner; the back pair carries the extra rise on a mono-pitch
  const columns: { x: number; z: number; h: number }[] = []
  if (legs) {
    for (const z of [-length / 2 + 2 * IN, length / 2 - 2 * IN]) {
      if (gable) {
        columns.push({ x: -span / 2 + 2 * IN, z, h: legHeight })
        columns.push({ x: span / 2 - 2 * IN, z, h: legHeight })
      } else {
        columns.push({ x: -span / 2 + 2 * IN, z, h: legHeight + rise })
        columns.push({ x: span / 2 - 2 * IN, z, h: legHeight })
      }
    }
  }

  return (
    <group>
      <Slope dir={1} {...sheet} />
      {gable && <Slope dir={-1} {...sheet} />}

      {columns.map((c, i) => (
        <mesh key={i} position={[c.x, c.h / 2, c.z]} castShadow receiveShadow>
          <boxGeometry args={[4 * IN, c.h, 4 * IN]} />
          <Mat finish="galvanised" />
        </mesh>
      ))}
    </group>
  )
}
