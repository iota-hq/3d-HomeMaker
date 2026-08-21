import { useState } from 'react'
import { CATALOG } from '../core/catalog'
import { useSceneStore } from '../store/useSceneStore'
import { Icon, I } from './icons'

/**
 * The full list. Mounted only while the picker is open, so it is the one place
 * that subscribes to the whole object array. Closed, it costs nothing.
 */
function SceneList({ onPick }: { onPick: () => void }) {
  const objects = useSceneStore((s) => s.objects)
  const selectedIds = useSceneStore((s) => s.selectedIds)
  const select = useSceneStore((s) => s.select)
  const toggleVisible = useSceneStore((s) => s.toggleVisible)

  return (
    <div className="picker-list opening">
      {objects.map((o) => (
        <div
          key={o.id}
          className={`oitem ${selectedIds.includes(o.id) ? 'on' : ''}`}
          onClick={(e) => {
            const additive = e.shiftKey || e.ctrlKey || e.metaKey
            select(o.id, additive)
            if (!additive) onPick()
          }}
        >
          <span>{CATALOG[o.type].icon}</span>
          <span className="olabel">{o.name}</span>
          {o.groupId && <span className="ogroup">grp</span>}
          <span
            className="otog"
            title={o.visible ? 'Hide' : 'Show'}
            onClick={(e) => {
              e.stopPropagation()
              toggleVisible(o.id)
            }}
          >
            <Icon icon={o.visible ? I.shown : I.hidden} size={14} />
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * The scene list collapsed down to the current selection. Clicking it opens the
 * full list; picking something closes it and the controls below switch over.
 *
 * Everything here subscribes to primitives (a count, a name, a type) rather
 * than to the objects themselves, so dragging a component does not re-render
 * this panel or its icons.
 */
export function ScenePicker() {
  const [open, setOpen] = useState(false)

  const count = useSceneStore((s) => s.objects.length)
  const extra = useSceneStore((s) => Math.max(0, s.selectedIds.length - 1))
  const name = useSceneStore((s) => {
    const id = s.selectedIds[s.selectedIds.length - 1]
    return s.objects.find((o) => o.id === id)?.name ?? null
  })
  const type = useSceneStore((s) => {
    const id = s.selectedIds[s.selectedIds.length - 1]
    return s.objects.find((o) => o.id === id)?.type ?? null
  })

  return (
    <div className="section picker">
      <p className="section-title">
        <Icon icon={I.scene} size={12} /> Scene
        <span style={{ marginLeft: 'auto', fontWeight: 400 }}>{count}</span>
      </p>

      <button
        className={`picker-btn ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Close the list' : 'Pick a component'}
      >
        <span style={{ fontSize: 15, lineHeight: 1 }}>{type ? CATALOG[type].icon : '·'}</span>
        <span className="picker-name">
          {name ?? 'Nothing selected'}
          {extra > 0 && ` +${extra}`}
        </span>
        <span className={`twist ${open ? "open" : ""}`}>
          <Icon icon={I.chevron} size={15} />
        </span>
      </button>

      {open && <SceneList onPick={() => setOpen(false)} />}
    </div>
  )
}
