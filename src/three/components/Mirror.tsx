import { useMemo } from 'react'
import * as THREE from 'three'
import { bool, num, str, type SceneObject } from '../../core/types'
import { IN } from '../../core/units'
import { Mat } from '../Mat'

const GLASS = 0.4 * IN

/**
 * Wall mirror. Origin at floor level; `sill` lifts it up the wall, and the
 * glass faces local +Z.
 *
 * The reflection is a low roughness, high metalness surface rather than a real
 * render target. A true mirror needs a second render pass of the whole scene
 * every frame, which is exactly the kind of cost this planner avoids.
 */
export function Mirror({ obj }: { obj: SceneObject }) {
  const width = num(obj.params, 'width')
  const height = num(obj.params, 'height')
  const sill = num(obj.params, 'sill')
  const frame = num(obj.params, 'frame')
  const shape = str(obj.params, 'shape', 'rect')
  const stand = bool(obj.params, 'stand', false)
  const finish = str(obj.params, 'finish', 'wood')

  const cy = sill + height / 2
  const glassW = Math.max(width - frame * 2, 0.02)
  const glassH = Math.max(height - frame * 2, 0.02)

  /** Arched mirrors get a rounded top, so the outline is drawn as a shape. */
  const arch = useMemo(() => {
    if (shape !== 'arch') return null
    const w = width / 2
    const straight = Math.max(height - w, 0.01)
    const s = new THREE.Shape()
    s.moveTo(-w, -height / 2)
    s.lineTo(w, -height / 2)
    s.lineTo(w, -height / 2 + straight)
    s.absarc(0, -height / 2 + straight, w, 0, Math.PI, false)
    s.lineTo(-w, -height / 2)
    s.closePath()
    return s
  }, [shape, width, height])

  const archGlass = useMemo(() => {
    if (!arch) return null
    const g = new THREE.ExtrudeGeometry(arch, { depth: GLASS, bevelEnabled: false, curveSegments: 24 })
    g.center()
    return g
  }, [arch])

  const Glass = () => (
    <mesh position={[0, cy, GLASS]} castShadow={false} receiveShadow>
      {shape === 'round' ? (
        <cylinderGeometry args={[glassW / 2, glassW / 2, GLASS, 48]} />
      ) : shape === 'arch' && archGlass ? (
        <primitive object={archGlass} attach="geometry" />
      ) : (
        <boxGeometry args={[glassW, glassH, GLASS]} />
      )}
      <meshStandardMaterial color="#dfeaf1" roughness={0.02} metalness={1} envMapIntensity={1.4} />
    </mesh>
  )

  return (
    <group>
      {/* frame sits just behind the glass */}
      {frame > 0 && (
        <mesh position={[0, cy, 0]} castShadow receiveShadow>
          {shape === 'round' ? (
            <cylinderGeometry args={[width / 2, width / 2, 1.4 * IN, 48]} />
          ) : (
            <boxGeometry args={[width, height, 1.4 * IN]} />
          )}
          <Mat finish={finish} scale={Math.max(width, height)} />
        </mesh>
      )}

      {shape === 'round' ? (
        <mesh position={[0, cy, GLASS]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <cylinderGeometry args={[glassW / 2, glassW / 2, GLASS, 48]} />
          <meshStandardMaterial color="#dfeaf1" roughness={0.02} metalness={1} />
        </mesh>
      ) : (
        <Glass />
      )}

      {stand && (
        <>
          <mesh position={[0, sill / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[2 * IN, sill, 2 * IN]} />
            <Mat finish={finish} />
          </mesh>
          <mesh position={[0, 0.6 * IN, 2 * IN]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.6, 1.2 * IN, 10 * IN]} />
            <Mat finish={finish} />
          </mesh>
        </>
      )}
    </group>
  )
}
