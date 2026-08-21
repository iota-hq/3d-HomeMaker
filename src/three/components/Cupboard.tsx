import { bool, deg2rad, num, str, type SceneObject } from '../../core/types'
import { IN } from '../../core/units'
import { Mat } from '../Mat'

const PANEL = 0.75 * IN

/** Wardrobe. Origin at the floor, centred on width, back against local -Z. */
export function Cupboard({ obj }: { obj: SceneObject }) {
  const width = num(obj.params, 'width')
  const height = num(obj.params, 'height')
  const depth = num(obj.params, 'depth')
  const doors = Math.max(1, Math.round(num(obj.params, 'doors')))
  const shelves = Math.round(num(obj.params, 'shelves'))
  const open = deg2rad(num(obj.params, 'open'))
  const legs = bool(obj.params, 'legs', true)
  const handles = bool(obj.params, 'handles', true)
  const finish = str(obj.params, 'finish', 'wood')

  const legH = legs ? 3 * IN : 0
  const boxH = Math.max(height - legH, 0.1)
  const doorW = width / doors
  const inner = depth - PANEL

  return (
    <group>
      {/* carcass: back, two sides, top and bottom */}
      <mesh position={[0, legH + boxH / 2, -depth / 2 + PANEL / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, boxH, PANEL]} />
        <Mat finish={finish} scale={width} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (width - PANEL)) / 2, legH + boxH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[PANEL, boxH, depth]} />
          <Mat finish={finish} scale={depth} />
        </mesh>
      ))}
      <mesh position={[0, legH + PANEL / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, PANEL, depth]} />
        <Mat finish={finish} scale={width} />
      </mesh>
      <mesh position={[0, legH + boxH - PANEL / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, PANEL, depth]} />
        <Mat finish={finish} scale={width} />
      </mesh>

      {/* shelves */}
      {Array.from({ length: shelves }, (_, i) => {
        const y = legH + ((i + 1) / (shelves + 1)) * boxH
        return (
          <mesh key={i} position={[0, y, PANEL / 2]} castShadow receiveShadow>
            <boxGeometry args={[width - PANEL * 2, PANEL * 0.8, inner]} />
            <Mat finish={finish} scale={width} />
          </mesh>
        )
      })}

      {/* doors, hinged alternately so a pair opens outwards */}
      {Array.from({ length: doors }, (_, i) => {
        const dir = i % 2 === 0 ? 1 : -1
        const leftEdge = -width / 2 + i * doorW
        const hinge = dir > 0 ? leftEdge : leftEdge + doorW
        return (
          <group
            key={i}
            position={[hinge, legH + boxH / 2, depth / 2]}
            rotation={[0, dir * open, 0]}
          >
            <mesh position={[(dir * doorW) / 2, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[doorW - 0.3 * IN, boxH - PANEL * 2, PANEL]} />
              <Mat finish={finish} scale={doorW} />
            </mesh>
            {handles && (
              <mesh
                position={[dir * (doorW - 2 * IN), 0, PANEL]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.4 * IN, 0.4 * IN, 5 * IN, 8]} />
                <Mat finish="steel" />
              </mesh>
            )}
          </group>
        )
      })}

      {legs &&
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <mesh
            key={i}
            position={[(sx * (width - 3 * IN)) / 2, legH / 2, (sz * (depth - 3 * IN)) / 2]}
            castShadow
          >
            <boxGeometry args={[2 * IN, legH, 2 * IN]} />
            <Mat finish={finish} />
          </mesh>
        ))}
    </group>
  )
}
