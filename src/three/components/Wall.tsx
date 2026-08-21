import { useCallback, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { bool, num, str, type SceneObject } from '../../core/types'
import { IN } from '../../core/units'
import { useSceneStore } from '../../store/useSceneStore'
import { Mat } from '../Mat'
import { openingKeyForWall, openingsFromKey } from '../openings'

/** Keeps a floor-level opening from touching the outline, which would break the shape. */
const THRESHOLD = 0.002

export function Wall({ obj }: { obj: SceneObject }) {
  const length = num(obj.params, 'length')
  const height = num(obj.params, 'height')
  const thickness = num(obj.params, 'thickness')
  const finish = str(obj.params, 'finish', 'plaster')
  const skirting = bool(obj.params, 'skirting')

  // a string, so this wall re-renders only when its own openings change
  const openingKey = useSceneStore(
    useCallback((s) => openingKeyForWall(obj, s.objects), [obj]),
  )

  const geometry = useMemo(() => {
    const hl = length / 2
    const shape = new THREE.Shape()
    shape.moveTo(-hl, 0)
    shape.lineTo(hl, 0)
    shape.lineTo(hl, height)
    shape.lineTo(-hl, height)
    shape.closePath()

    for (const o of openingsFromKey(openingKey)) {
      const y0 = Math.max(o.y0, THRESHOLD)
      const y1 = Math.min(o.y1, height - THRESHOLD)
      if (y1 <= y0) continue
      const x0 = Math.max(o.x - o.width / 2, -hl + THRESHOLD)
      const x1 = Math.min(o.x + o.width / 2, hl - THRESHOLD)
      if (x1 <= x0) continue
      const hole = new THREE.Path()
      hole.moveTo(x0, y0)
      hole.lineTo(x1, y0)
      hole.lineTo(x1, y1)
      hole.lineTo(x0, y1)
      hole.closePath()
      shape.holes.push(hole)
    }

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 1,
    })
    g.translate(0, 0, -thickness / 2)
    g.computeVertexNormals()
    return g
  }, [length, height, thickness, openingKey])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <Mat finish={finish} scale={[length, height]} />
      </mesh>
      {skirting && (
        <mesh position={[0, 4 * IN * 0.5, 0]} castShadow>
          <boxGeometry args={[length, 4 * IN, thickness + 1 * IN]} />
          <Mat finish="paint" />
        </mesh>
      )}
    </group>
  )
}
