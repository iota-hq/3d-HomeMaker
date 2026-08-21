import { num, str, type SceneObject } from '../../core/types'
import { IN } from '../../core/units'
import { Mat } from '../Mat'

const LEG = 2.5 * IN

/** A single chair, facing local +Z. Origin at the floor under its seat. */
function Chair({ finish, seatH }: { finish: string; seatH: number }) {
  const w = 17 * IN
  const d = 17 * IN
  const backH = 18 * IN
  return (
    <group>
      <mesh position={[0, seatH, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 1.4 * IN, d]} />
        <Mat finish={finish} scale={w} />
      </mesh>
      <mesh position={[0, seatH + backH / 2, -d / 2 + 1 * IN]} castShadow receiveShadow>
        <boxGeometry args={[w, backH, 1.2 * IN]} />
        <Mat finish={finish} scale={w} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[(sx * (w - LEG)) / 2, seatH / 2, (sz * (d - LEG)) / 2]}
          castShadow
        >
          <boxGeometry args={[LEG * 0.7, seatH, LEG * 0.7]} />
          <Mat finish={finish} />
        </mesh>
      ))}
    </group>
  )
}

/** Dining table with chairs placed around it. Origin at the floor, centred. */
export function Table({ obj }: { obj: SceneObject }) {
  const round = str(obj.params, 'shape', 'rect') === 'round'
  const length = num(obj.params, 'length')
  const width = round ? length : num(obj.params, 'width')
  const height = num(obj.params, 'height')
  const thickness = num(obj.params, 'thickness')
  const chairs = Math.round(num(obj.params, 'chairs'))
  const finish = str(obj.params, 'finish', 'wood')

  const legTop = height - thickness
  const seatH = Math.max(height - 12 * IN, 8 * IN)
  const frameFinish = finish === 'glass' || finish === 'stone' ? 'wood' : finish

  /** Chairs sit around the perimeter, facing the table. */
  const seats: { x: number; z: number; ry: number }[] = []
  if (round) {
    const r = length / 2 + 13 * IN
    for (let i = 0; i < chairs; i++) {
      const a = (i / Math.max(1, chairs)) * Math.PI * 2
      seats.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, ry: a + Math.PI })
    }
  } else {
    const perSide = Math.ceil(chairs / 2)
    const z = width / 2 + 13 * IN
    for (let i = 0; i < chairs; i++) {
      const side = i % 2 === 0 ? 1 : -1
      const k = Math.floor(i / 2)
      const x = perSide > 1 ? -length / 2 + ((k + 0.5) / perSide) * length : 0
      seats.push({ x, z: side * z, ry: side > 0 ? Math.PI : 0 })
    }
  }

  return (
    <group>
      {/* top */}
      <mesh position={[0, height - thickness / 2, 0]} castShadow receiveShadow>
        {round ? (
          <cylinderGeometry args={[length / 2, length / 2, thickness, 40]} />
        ) : (
          <boxGeometry args={[length, thickness, width]} />
        )}
        <Mat finish={finish} scale={length} />
      </mesh>

      {/* legs: a centre column for a round top, four corners otherwise */}
      {round ? (
        <>
          <mesh position={[0, legTop / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3 * IN, 3 * IN, legTop, 16]} />
            <Mat finish={frameFinish} />
          </mesh>
          <mesh position={[0, 0.6 * IN, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[length * 0.28, length * 0.28, 1.2 * IN, 24]} />
            <Mat finish={frameFinish} />
          </mesh>
        </>
      ) : (
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <mesh
            key={i}
            position={[
              (sx * (length - LEG * 2 - 2 * IN)) / 2,
              legTop / 2,
              (sz * (width - LEG * 2 - 2 * IN)) / 2,
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[LEG, legTop, LEG]} />
            <Mat finish={frameFinish} />
          </mesh>
        ))
      )}

      {seats.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.ry, 0]}>
          <Chair finish={frameFinish} seatH={seatH} />
        </group>
      ))}
    </group>
  )
}
