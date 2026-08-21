import { useEffect, useState } from 'react'
import { CATALOG } from './core/catalog'
import { FT, IN } from './core/units'
import { exportView, type ImageFormat } from './store/io'
import { useSceneStore } from './store/useSceneStore'
import { requestRender, zoomBy } from './three/camera'
import { Viewport } from './three/Viewport'
import { ViewGizmo } from './three/ViewGizmo'
import { CatalogPanel } from './ui/Catalog'
import { Dropdown } from './ui/controls'
import { Icon, I } from './ui/icons'
import { Inspector } from './ui/Inspector'
import { About } from './ui/About'
import { Confirm } from './ui/Confirm'
import { ScenePicker } from './ui/ScenePicker'
import { ViewPanel } from './ui/ViewPanel'
import { useAutoHideScroll } from './ui/useAutoHideScroll'

/** Own subscription, so a drag re-renders this line and nothing else. */
function Readout() {
  const name = useSceneStore((s) => {
    const id = s.selectedIds[s.selectedIds.length - 1]
    return s.objects.find((o) => o.id === id)?.name ?? null
  })
  const type = useSceneStore((s) => {
    const id = s.selectedIds[s.selectedIds.length - 1]
    return s.objects.find((o) => o.id === id)?.type ?? null
  })
  if (!name || !type) return null
  return (
    <div className="readout">
      {name} · {CATALOG[type].label}
    </div>
  )
}

/** Both children subscribe to what they need, so this never re-renders. */
function RightPanel() {
  const ref = useAutoHideScroll<HTMLElement>()
  const hasSelection = useSceneStore((s) => s.selectedIds.length > 0)
  return (
    <aside className="sidebar right" ref={ref}>
      <ScenePicker />
      {hasSelection ? <Inspector /> : <ViewPanel />}
    </aside>
  )
}

function LeftPanel() {
  const ref = useAutoHideScroll<HTMLElement>()
  return (
    <aside className="sidebar left" ref={ref}>
      <CatalogPanel />
    </aside>
  )
}

const SEEN_KEY = '3dspace.seen-about'
const INTRO_MS = 5000

const SNAPS = [
  { label: 'Off', value: 0 },
  { label: '3"', value: 3 * IN },
  { label: '6"', value: 6 * IN },
  { label: '1′', value: 1 * FT },
]

export default function App() {
  const units = useSceneStore((s) => s.units)
  const setUnits = useSceneStore((s) => s.setUnits)
  const gridSnap = useSceneStore((s) => s.gridSnap)
  const setGridSnap = useSceneStore((s) => s.setGridSnap)
  const theme = useSceneStore((s) => s.theme)
  const setTheme = useSceneStore((s) => s.setTheme)
  const undo = useSceneStore((s) => s.undo)
  const redo = useSceneStore((s) => s.redo)
  const canUndo = useSceneStore((s) => s.past.length > 0)
  const canRedo = useSceneStore((s) => s.future.length > 0)
  const clear = useSceneStore((s) => s.clear)
  const lowPoly = useSceneStore((s) => s.lowPoly)
  const setGlobalLowPoly = useSceneStore((s) => s.setGlobalLowPoly)
  const [confirmReset, setConfirmReset] = useState(false)
  const [showAbout, setShowAbout] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) !== '1'
    } catch {
      return true
    }
  })
  // the logo shimmers and the cube turns for the first few seconds
  const [intro, setIntro] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), INTRO_MS)
    return () => clearTimeout(t)
  }, [])

  const closeAbout = () => {
    setShowAbout(false)
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* private mode, it will just show again */
    }
  }

  const [format, setFormat] = useState<ImageFormat>('png')
  const [saving, setSaving] = useState(false)

  const saveImage = async () => {
    setSaving(true)
    await requestRender()
    await exportView(format)
    setSaving(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.isContentEditable)) return
      const s = useSceneStore.getState()
      const mod = e.ctrlKey || e.metaKey

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        e.shiftKey ? s.ungroupSelected() : s.groupSelected()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        s.removeSelected()
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const id = s.selectedIds[s.selectedIds.length - 1]
        if (id) s.duplicate(id)
        return
      }
      if (e.key === 'Escape') s.select(null)

      const id = s.selectedIds[s.selectedIds.length - 1]
      if (!id) return
      const o = s.objects.find((x) => x.id === id)
      if (!o || o.locked) return
      const step = s.gridSnap || 0.5 * FT

      const nudge = (dx: number, dz: number) => {
        e.preventDefault()
        s.pushHistory()
        s.moveBy(s.linkedIds(o.id), dx, 0, dz)
      }
      const spin = (deg: number) => {
        e.preventDefault()
        s.pushHistory()
        s.setRotationY(o.id, o.rotationY + (deg * Math.PI) / 180)
      }

      if (e.key === 'ArrowLeft') e.shiftKey ? spin(-15) : nudge(-step, 0)
      if (e.key === 'ArrowRight') e.shiftKey ? spin(15) : nudge(step, 0)
      if (e.key === 'ArrowUp') nudge(0, -step)
      if (e.key === 'ArrowDown') nudge(0, step)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return (
    <div className="app">
      <header className="topbar">
        <button
          className={`brand ${intro ? 'intro' : ''}`}
          onClick={() => setShowAbout(true)}
          title="About 3dspace"
        >
          <span className="brand-cube">
            <Icon icon={I.brand} size={19} strokeWidth={1.6} />
          </span>
          <span className="brand-name">
            3dspace
            <span className="brand-sheen" aria-hidden="true" />
          </span>
        </button>

        <div className="sep" />

        <div className="seg" title="Grid that dragging rounds to">
          <span className="seg-label">
            <Icon icon={I.snap} size={14} />
          </span>
          {SNAPS.map((s) => (
            <button
              key={s.label}
              className={Math.abs(gridSnap - s.value) < 1e-6 ? 'on' : ''}
              onClick={() => setGridSnap(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="seg" title="Unit shown in the controls">
          <span className="seg-label">
            <Icon icon={I.units} size={14} />
          </span>
          <button className={units === 'ftin' ? 'on' : ''} onClick={() => setUnits('ftin')}>
            ft / in
          </button>
          <button className={units === 'metric' ? 'on' : ''} onClick={() => setUnits('metric')}>
            metric
          </button>
        </div>

        <div className="spacer" />

        <button className="btn icon" title="Zoom in" onClick={() => zoomBy(4)}>
          <Icon icon={I.zoomIn} />
        </button>
        <button className="btn icon" title="Zoom out" onClick={() => zoomBy(-4)}>
          <Icon icon={I.zoomOut} />
        </button>

        <div className="sep" />

        <button className="btn icon" title="Undo" disabled={!canUndo} onClick={undo}>
          <Icon icon={I.undo} />
        </button>
        <button className="btn icon" title="Redo" disabled={!canRedo} onClick={redo}>
          <Icon icon={I.redo} />
        </button>
        <button className="btn icon" title="Clear the plot" onClick={() => setConfirmReset(true)}>
          <Icon icon={I.reset} />
        </button>

        <div className="sep" />

        <div className="seg" title="Save the current view as an image">
          <button onClick={() => setFormat('png')} className={format === 'png' ? 'on' : ''}>
            PNG
          </button>
          <button onClick={() => setFormat('jpeg')} className={format === 'jpeg' ? 'on' : ''}>
            JPG
          </button>
        </div>
        <button className="btn" onClick={saveImage} disabled={saving} title="Save this view">
          <Icon icon={I.exportImage} />
          {saving ? 'Saving' : 'Export'}
        </button>

        <div className="sep" />

        <button
          className={`btn icon ${!lowPoly ? 'on' : ''}`}
          title={
            lowPoly
              ? 'Low poly. Click for real materials, except where a component overrides it'
              : 'Real materials. Click for the flat low poly look'
          }
          onClick={() => setGlobalLowPoly(!lowPoly)}
        >
          <Icon icon={I.texture} />
        </button>

        <button
          className="btn icon"
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Icon icon={theme === 'dark' ? I.light : I.dark} />
        </button>
      </header>

      <LeftPanel />

      <main className="stage">
        <Viewport />
        <ViewGizmo />

        <div className="hint">
          <span>
            <kbd>drag</kbd> move
          </span>
          <span>
            <kbd>right drag</kbd> orbit
          </span>
          <span>
            <kbd>scroll</kbd> zoom
          </span>
          <span>
            <kbd>shift</kbd> click to multi-select
          </span>
          <span>
            <kbd>shift</kbd>+<kbd>arrows</kbd> rotate
          </span>
        </div>

        <Readout />
      </main>

      <RightPanel />

      {showAbout && <About onClose={closeAbout} />}

      {confirmReset && (
        <Confirm
          title="Clear the plan?"
          body="Every component except a single ground plot will be removed. You can still undo this afterwards."
          confirmLabel="Clear it"
          onConfirm={() => {
            clear()
            setConfirmReset(false)
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  )
}
