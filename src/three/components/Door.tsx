import { deg2rad, num, str, type SceneObject } from '../../core/types'
import { IN } from '../../core/units'
import { Mat } from '../Mat'

const JAMB_DEPTH = 6 * IN
const LEAF_DEPTH = 1.75 * IN

/** Origin sits at floor level, centred in the doorway, in the plane of the wall. */
export function Door({ obj }: { obj: SceneObject }) {
  const width = num(obj.params, 'width')
  const height = num(obj.params, 'height')
  const frame = num(obj.params, 'frame')
  const finish = str(obj.params, 'finish', 'wood')
  const double = str(obj.params, 'leaves', 'single') === 'double'
  const swing = deg2rad(num(obj.params, 'swing'))

  const clearW = Math.max(width - 2 * frame, 0.05)
  const clearH = Math.max(height - frame, 0.05)
  const leafW = double ? clearW / 2 : clearW
  const glazed = finish === 'glass'

  const Leaf = ({ hinge, dir }: { hinge: number; dir: number }) => (
    <group position={[hinge, 0, 0]} rotation={[0, dir * swing, 0]}>
      <mesh position={[(dir * leafW) / 2, clearH / 2, 0]} castShadow>
        <boxGeometry args={[leafW, clearH, LEAF_DEPTH]} />
        <Mat finish={glazed ? 'aluminium' : finish} />
      </mesh>
      {glazed && (
        <mesh position={[(dir * leafW) / 2, clearH / 2, 0]}>
          <boxGeometry args={[leafW - 4 * IN, clearH - 6 * IN, LEAF_DEPTH * 0.6]} />
          <Mat finish="glass" />
        </mesh>
      )}
      {/* handle */}
      <mesh
        position={[dir * (leafW - 2.5 * IN), clearH * 0.45, LEAF_DEPTH]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.7 * IN, 0.7 * IN, 3.5 * IN, 8]} />
        <Mat finish="steel" />
      </mesh>
    </group>
  )

  return (
    <group>
      {/* jambs */}
      <mesh position={[-(width - frame) / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[frame, height, JAMB_DEPTH]} />
        <Mat finish={finish === 'glass' ? 'aluminium' : finish} />
      </mesh>
      <mesh position={[(width - frame) / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[frame, height, JAMB_DEPTH]} />
        <Mat finish={finish === 'glass' ? 'aluminium' : finish} />
      </mesh>
      {/* head */}
      <mesh position={[0, height - frame / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frame, JAMB_DEPTH]} />
        <Mat finish={finish === 'glass' ? 'aluminium' : finish} />
      </mesh>
      {/* threshold */}
      <mesh position={[0, 0.5 * IN, 0]} receiveShadow>
        <boxGeometry args={[width, 1 * IN, JAMB_DEPTH]} />
        <Mat finish="stone" />
      </mesh>

      {double ? (
        <>
          <Leaf hinge={-clearW / 2} dir={1} />
          <Leaf hinge={clearW / 2} dir={-1} />
        </>
      ) : (
        <Leaf hinge={-clearW / 2} dir={1} />
      )}
    </group>
  )
}
