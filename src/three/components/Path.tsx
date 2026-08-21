import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { bool, deg2rad, num, str, type SceneObject } from '../../core/types'
import { IN } from '../../core/units'
import { Mat } from '../Mat'

/** Above this we stop instancing pavers and draw one slab instead. */
const MAX_PAVERS = 4000
const GAP = 0.4 * IN

/** Length runs along local X, width along local Z. Origin at ground level, centred. */
export function Path({ obj }: { obj: SceneObject }) {
  const length = num(obj.params, 'length')
  const width = num(obj.params, 'width')
  const thickness = num(obj.params, 'thickness')
  const unit = num(obj.params, 'unit')
  const paver = str(obj.params, 'paver', 'brick')
  const edging = bool(obj.params, 'edging', true)
  const curve = deg2rad(num(obj.params, 'curve'))

  const ref = useRef<THREE.InstancedMesh>(null)

  const layout = useMemo(() => {
    if (paver === 'gravel') return null
    const nx = Math.max(1, Math.floor(length / unit))
    const nz = Math.max(1, Math.floor(width / unit))
    if (nx * nz > MAX_PAVERS) return null
    return { nx, nz, sx: length / nx, sz: width / nz }
  }, [length, width, unit, paver])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh || !layout) return
    const { nx, nz, sx, sz } = layout
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const v = new THREE.Vector3()
    const one = new THREE.Vector3(1, 1, 1)
    // a curved path bends the run of pavers around an arc of `curve` radians
    const radius = Math.abs(curve) > 1e-4 ? length / curve : 0
    let i = 0
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        // running bond: shift alternate rows half a paver
        const stagger = paver === 'brick' && iz % 2 === 1 ? sx / 2 : 0
        let x = -length / 2 + sx / 2 + ix * sx + stagger
        if (x > length / 2 - sx / 2) x -= length
        const z = -width / 2 + sz / 2 + iz * sz

        if (radius !== 0) {
          // bend the straight strip: x runs along the arc, z offsets across it
          const a = x / radius
          const r = radius - z
          v.set(Math.sin(a) * r, thickness / 2, radius - Math.cos(a) * r)
          e.set(0, -a, 0)
          q.setFromEuler(e)
          m.compose(v, q, one)
        } else {
          m.makeTranslation(x, thickness / 2, z)
        }
        mesh.setMatrixAt(i++, m)
      }
    }
    mesh.count = i
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [layout, length, width, thickness, paver, curve])

  return (
    <group>
      {layout ? (
        <instancedMesh
          ref={ref}
          args={[undefined, undefined, layout.nx * layout.nz]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[layout.sx - GAP, thickness, layout.sz - GAP]} />
          <Mat finish={paver} />
        </instancedMesh>
      ) : (
        <mesh position={[0, thickness / 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[length, thickness, width]} />
          <Mat finish={paver} />
        </mesh>
      )}

      {edging && Math.abs(curve) < 1e-4 && (
        <>
          <mesh position={[0, thickness * 0.7, -(width / 2 + 2 * IN)]} castShadow receiveShadow>
            <boxGeometry args={[length, thickness * 1.4, 4 * IN]} />
            <Mat finish="concrete" />
          </mesh>
          <mesh position={[0, thickness * 0.7, width / 2 + 2 * IN]} castShadow receiveShadow>
            <boxGeometry args={[length, thickness * 1.4, 4 * IN]} />
            <Mat finish="concrete" />
          </mesh>
        </>
      )}
    </group>
  )
}
