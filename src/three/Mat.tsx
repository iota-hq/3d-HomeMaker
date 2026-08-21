import { createContext, useContext, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mat } from '../core/materials'
import { textureFor, tintFor } from './textures'

/**
 * Whether the surrounding component is in low poly mode.
 *
 * Low poly is the flat coloured look, and it is the default. Turning it off for
 * a component swaps in the real generated material for every surface inside it,
 * without each of those surfaces having to know about the setting.
 */
export const LowPolyContext = createContext(true)

export function Mat({
  finish,
  tint,
  /**
   * Roughly how many metres the surface spans. Pass [across, down] for
   * anything that is not square, otherwise brick and tile come out stretched.
   */
  scale = 2,
  /** Pushes the surface a hair away from the camera in the depth buffer, so a
   *  decal drawn on top of it (the ground grid) cannot z-fight with it. */
  depthBias = false,
}: {
  finish: string
  tint?: string
  scale?: number | [number, number]
  depthBias?: boolean
}) {
  const lowPoly = useContext(LowPolyContext)
  const m = mat(finish)
  const transparent = m.opacity !== undefined && m.opacity < 1

  const built = useMemo(() => (lowPoly ? null : textureFor(finish)), [lowPoly, finish])

  const [su, sv] = Array.isArray(scale) ? scale : [scale, scale]

  const maps = useMemo(() => {
    if (!built) return null
    const ru = Math.max(0.4, built.perMetre * Math.max(0.4, su))
    const rv = Math.max(0.4, built.perMetre * Math.max(0.4, sv))
    // clone so each surface tiles independently while sharing one image
    const map = built.map.clone()
    map.needsUpdate = true
    map.repeat.set(ru, rv)
    let normalMap: THREE.Texture | null = null
    if (built.normalMap) {
      normalMap = built.normalMap.clone()
      normalMap.needsUpdate = true
      normalMap.repeat.set(ru, rv)
    }
    return { map, normalMap }
  }, [built, su, sv])

  useEffect(
    () => () => {
      maps?.map.dispose()
      maps?.normalMap?.dispose()
    },
    [maps],
  )

  const colour = tint ?? (maps ? (tintFor(finish) ?? '#ffffff') : m.color)

  return (
    <meshStandardMaterial
      // Going from no map to a map changes the shader three has to compile, and
      // setting the prop alone does not ask it to recompile: the surface would
      // render untextured. The key forces a fresh material instead.
      key={maps ? 'textured' : 'flat'}
      color={colour}
      map={maps?.map ?? null}
      normalMap={maps?.normalMap ?? null}
      normalScale={maps?.normalMap ? new THREE.Vector2(1, 1) : undefined}
      roughness={built ? built.roughness : m.roughness}
      metalness={built ? built.metalness : m.metalness}
      flatShading={!maps && (m.flat ?? false)}
      transparent={transparent}
      opacity={m.opacity ?? 1}
      polygonOffset={depthBias}
      polygonOffsetFactor={depthBias ? 1 : 0}
      polygonOffsetUnits={depthBias ? 1 : 0}
    />
  )
}
