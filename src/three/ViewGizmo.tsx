import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { axisToCamera, setGizmoSink, setView, type ViewName } from './camera'

const R = 30 // handle orbit radius, px
const C = 46 // gizmo centre, px

interface Handle {
  view: ViewName
  axis: THREE.Vector3
  label: string
  color: string
  positive: boolean
}

const HANDLES: Handle[] = [
  { view: 'right', axis: new THREE.Vector3(1, 0, 0), label: 'X', color: '#e0605e', positive: true },
  { view: 'left', axis: new THREE.Vector3(-1, 0, 0), label: '', color: '#e0605e', positive: false },
  { view: 'top', axis: new THREE.Vector3(0, 1, 0), label: 'Y', color: '#7bb661', positive: true },
  { view: 'bottom', axis: new THREE.Vector3(0, -1, 0), label: '', color: '#7bb661', positive: false },
  { view: 'front', axis: new THREE.Vector3(0, 0, 1), label: 'Z', color: '#5b8dd6', positive: true },
  { view: 'back', axis: new THREE.Vector3(0, 0, -1), label: '', color: '#5b8dd6', positive: false },
]

/**
 * Blender style axis gizmo, built out of DOM rather than a second WebGL canvas.
 *
 * It costs no draw calls. Positions are written straight to element styles from
 * the render loop, so it never triggers a React render either.
 */
export function ViewGizmo() {
  const dots = useRef<(HTMLButtonElement | null)[]>([])
  const stems = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    const v = new THREE.Vector3()

    setGizmoSink((camera) => {
      for (let i = 0; i < HANDLES.length; i++) {
        const dot = dots.current[i]
        const stem = stems.current[i]
        if (!dot) continue

        axisToCamera(camera, HANDLES[i].axis, v)
        const x = C + v.x * R
        const y = C - v.y * R
        // v.z runs from -1 (far) to 1 (near) once normalised
        const near = (v.z + 1) / 2

        dot.style.transform = `translate(${x}px, ${y}px)`
        dot.style.opacity = String(0.4 + near * 0.6)
        dot.style.zIndex = String(10 + Math.round(near * 10))

        if (stem) {
          const len = Math.hypot(v.x * R, v.y * R)
          stem.style.transform = `translate(${C}px, ${C}px) rotate(${Math.atan2(-v.y, v.x)}rad)`
          stem.style.width = `${len}px`
          stem.style.opacity = String(0.18 + near * 0.3)
        }
      }
    })

    return () => setGizmoSink(null)
  }, [])

  return (
    <div className="gizmo" title="Click an axis to look down it">
      {HANDLES.map((h, i) => (
        <span
          key={`s${h.view}`}
          ref={(el) => {
            stems.current[i] = el
          }}
          className="gizmo-stem"
          style={{ background: h.color, left: 0, top: 0 }}
        />
      ))}

      {HANDLES.map((h, i) => (
        <button
          key={h.view}
          ref={(el) => {
            dots.current[i] = el
          }}
          className="gizmo-axis"
          onClick={() => setView(h.view)}
          title={h.view}
          style={{
            left: 0,
            top: 0,
            background: h.positive ? h.color : 'transparent',
            border: `1.5px solid ${h.color}`,
            color: h.positive ? '#0b0b0c' : h.color,
          }}
        >
          {h.label}
        </button>
      ))}

      <button className="gizmo-home" title="Isometric view" onClick={() => setView('iso')} />
    </div>
  )
}
