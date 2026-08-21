import { bool, num, str, type SceneObject } from '../../core/types'
import { IN } from '../../core/units'
import { Mat } from '../Mat'

const FRAME_DEPTH = 5 * IN
const BAR = 1.25 * IN

/** Origin sits at floor level; `sill` lifts the opening. */
export function Win({ obj }: { obj: SceneObject }) {
  const width = num(obj.params, 'width')
  const height = num(obj.params, 'height')
  const sill = num(obj.params, 'sill')
  const frame = num(obj.params, 'frame')
  const cols = Math.round(num(obj.params, 'colsMull'))
  const rows = Math.round(num(obj.params, 'rowsMull'))
  const ledge = bool(obj.params, 'ledge', true)
  const finish = str(obj.params, 'finish', 'aluminium')

  const cy = sill + height / 2
  const clearW = Math.max(width - 2 * frame, 0.02)
  const clearH = Math.max(height - 2 * frame, 0.02)

  return (
    <group>
      {/* frame: four sides */}
      <mesh position={[0, sill + frame / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frame, FRAME_DEPTH]} />
        <Mat finish={finish} />
      </mesh>
      <mesh position={[0, sill + height - frame / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frame, FRAME_DEPTH]} />
        <Mat finish={finish} />
      </mesh>
      <mesh position={[-(width - frame) / 2, cy, 0]} castShadow receiveShadow>
        <boxGeometry args={[frame, height, FRAME_DEPTH]} />
        <Mat finish={finish} />
      </mesh>
      <mesh position={[(width - frame) / 2, cy, 0]} castShadow receiveShadow>
        <boxGeometry args={[frame, height, FRAME_DEPTH]} />
        <Mat finish={finish} />
      </mesh>

      {/* glazing */}
      <mesh position={[0, cy, 0]}>
        <boxGeometry args={[clearW, clearH, 0.4 * IN]} />
        <Mat finish="glass" />
      </mesh>

      {/* vertical bars */}
      {Array.from({ length: cols }, (_, i) => {
        const x = -clearW / 2 + (clearW * (i + 1)) / (cols + 1)
        return (
          <mesh key={`c${i}`} position={[x, cy, 0]} castShadow>
            <boxGeometry args={[BAR, clearH, FRAME_DEPTH * 0.75]} />
            <Mat finish={finish} />
          </mesh>
        )
      })}

      {/* horizontal bars */}
      {Array.from({ length: rows }, (_, i) => {
        const y = cy - clearH / 2 + (clearH * (i + 1)) / (rows + 1)
        return (
          <mesh key={`r${i}`} position={[0, y, 0]} castShadow>
            <boxGeometry args={[clearW, BAR, FRAME_DEPTH * 0.75]} />
            <Mat finish={finish} />
          </mesh>
        )
      })}

      {ledge && (
        <mesh position={[0, sill - 1 * IN, 0]} castShadow receiveShadow>
          <boxGeometry args={[width + 4 * IN, 2 * IN, FRAME_DEPTH + 5 * IN]} />
          <Mat finish="stone" />
        </mesh>
      )}
    </group>
  )
}
