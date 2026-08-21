import { bool, num, str, type SceneObject } from '../../core/types'
import { IN } from '../../core/units'
import { Mat } from '../Mat'

export function Column({ obj }: { obj: SceneObject }) {
  const height = num(obj.params, 'height')
  const width = num(obj.params, 'width')
  const depth = num(obj.params, 'depth')
  const round = str(obj.params, 'shape', 'square') === 'round'
  const capital = bool(obj.params, 'capital', true)
  const finish = str(obj.params, 'finish', 'concrete')

  const capH = capital ? Math.min(4 * IN, height * 0.06) : 0
  const shaftH = Math.max(height - capH * 2, 0.05)
  const pad = 3 * IN

  return (
    <group>
      {capital && (
        <mesh position={[0, capH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width + pad, capH, depth + pad]} />
          <Mat finish={finish} />
        </mesh>
      )}

      <mesh position={[0, capH + shaftH / 2, 0]} castShadow receiveShadow>
        {round ? (
          <cylinderGeometry args={[width / 2, width / 2, shaftH, 24]} />
        ) : (
          <boxGeometry args={[width, shaftH, depth]} />
        )}
        <Mat finish={finish} />
      </mesh>

      {capital && (
        <mesh position={[0, height - capH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width + pad, capH, depth + pad]} />
          <Mat finish={finish} />
        </mesh>
      )}
    </group>
  )
}
