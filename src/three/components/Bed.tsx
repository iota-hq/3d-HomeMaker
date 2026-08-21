import { bool, num, str, type SceneObject } from '../../core/types'
import { FT, IN } from '../../core/units'
import { Mat } from '../Mat'

/** Standard mattress widths, used when a size other than custom is picked. */
const SIZES: Record<string, [number, number]> = {
  single: [3 * FT, 6.25 * FT],
  double: [4.5 * FT, 6.25 * FT],
  queen: [5 * FT, 6.5 * FT],
  king: [6 * FT, 6.5 * FT],
}

/** Bed with mattress, headboard and pillows. Origin at the floor, head at -Z. */
export function Bed({ obj }: { obj: SceneObject }) {
  const size = str(obj.params, 'size', 'queen')
  const preset = SIZES[size]
  const width = preset ? preset[0] : num(obj.params, 'width')
  const length = preset ? preset[1] : num(obj.params, 'length')
  const frameH = num(obj.params, 'height')
  const headH = num(obj.params, 'headboard')
  const pillows = Math.round(num(obj.params, 'pillows'))
  const sideTables = bool(obj.params, 'sideTables', true)
  const finish = str(obj.params, 'finish', 'wood')
  const sheets = str(obj.params, 'sheets', 'linen')

  const mattressH = 9 * IN
  const rail = 2 * IN

  return (
    <group>
      {/* frame base */}
      <mesh position={[0, frameH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frameH, length]} />
        <Mat finish={finish} scale={length} />
      </mesh>

      {/* mattress */}
      <mesh position={[0, frameH + mattressH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width - rail, mattressH, length - rail]} />
        <Mat finish={sheets} scale={length} />
      </mesh>

      {/* folded blanket over the foot end */}
      <mesh
        position={[0, frameH + mattressH + 0.6 * IN, length * 0.22]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width - rail, 1.6 * IN, length * 0.42]} />
        <Mat finish={sheets === 'linen' ? 'fabric' : 'linen'} scale={length} />
      </mesh>

      {/* headboard */}
      {headH > 0 && (
        <mesh position={[0, frameH + headH / 2, -length / 2 - 1.5 * IN]} castShadow receiveShadow>
          <boxGeometry args={[width + 3 * IN, headH, 3 * IN]} />
          <Mat finish={finish} scale={width} />
        </mesh>
      )}

      {/* pillows across the head end */}
      {Array.from({ length: pillows }, (_, i) => {
        const slot = pillows > 1 ? -width / 2 + ((i + 0.5) / pillows) * width : 0
        return (
          <mesh
            key={i}
            position={[slot, frameH + mattressH + 2.5 * IN, -length / 2 + 10 * IN]}
            rotation={[0, 0, 0]}
            castShadow
          >
            <boxGeometry args={[Math.min(22 * IN, (width / pillows) * 0.86), 4.5 * IN, 14 * IN]} />
            <Mat finish="linen" />
          </mesh>
        )
      })}

      {sideTables &&
        [-1, 1].map((s) => {
          const w = 16 * IN
          const h = frameH + mattressH
          return (
            <group key={s} position={[s * (width / 2 + w / 2 + 3 * IN), 0, -length / 2 + w / 2]}>
              <mesh position={[0, h - 1 * IN, 0]} castShadow receiveShadow>
                <boxGeometry args={[w, 1.5 * IN, w]} />
                <Mat finish={finish} scale={w} />
              </mesh>
              <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[w - 3 * IN, h - 3 * IN, w - 3 * IN]} />
                <Mat finish={finish} scale={w} />
              </mesh>
            </group>
          )
        })}
    </group>
  )
}
