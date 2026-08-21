import { useMemo } from 'react'
import * as THREE from 'three'
import { bool, num, str, type SceneObject } from '../../core/types'
import { FT } from '../../core/units'
import { Mat } from '../Mat'

/** The plot. A flat slab with a slight lip so it reads as ground, not a floating plane. */
export function Ground({ obj }: { obj: SceneObject }) {
  const width = num(obj.params, 'width', 24)
  const depth = num(obj.params, 'depth', 24)
  const surface = str(obj.params, 'surface', 'grass')
  const showGrid = bool(obj.params, 'grid', true)

  const lip = 0.5 * FT

  const gridLines = useMemo(() => {
    if (!showGrid) return null
    const step = 5 * FT
    const pts: number[] = []
    const hx = width / 2
    const hz = depth / 2
    for (let x = -Math.floor(hx / step) * step; x <= hx; x += step) {
      pts.push(x, 0, -hz, x, 0, hz)
    }
    for (let z = -Math.floor(hz / step) * step; z <= hz; z += step) {
      pts.push(-hx, 0, z, hx, 0, z)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [showGrid, width, depth])

  return (
    <group>
      {/* The ground only receives shadows. Letting a big flat slab cast onto
          itself is what produced the moire banding across the grass. */}
      <mesh position={[0, -lip / 2, 0]} receiveShadow>
        <boxGeometry args={[width, lip, depth]} />
        <Mat finish={surface} scale={Math.max(width, depth) * 0.5} depthBias />
      </mesh>
      {gridLines && (
        <lineSegments geometry={gridLines} position={[0, 0.002, 0]} renderOrder={1}>
          <lineBasicMaterial color="#000000" transparent opacity={0.09} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  )
}
