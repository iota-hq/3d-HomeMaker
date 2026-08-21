import { num, str, type SceneObject } from '../../core/types'
import { Mat } from '../Mat'

/** Origin at the underside, so raising it to wall height caps a room exactly. */
export function Slab({ obj }: { obj: SceneObject }) {
  const width = num(obj.params, 'width')
  const depth = num(obj.params, 'depth')
  const thickness = num(obj.params, 'thickness')
  const overhang = num(obj.params, 'overhang')
  const finish = str(obj.params, 'finish', 'concrete')

  return (
    <mesh position={[0, thickness / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width + overhang * 2, thickness, depth + overhang * 2]} />
      <Mat finish={finish} />
    </mesh>
  )
}
