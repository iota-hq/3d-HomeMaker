import { memo, useEffect, useRef } from 'react'
import { CATALOG } from '../core/catalog'
import type { ParamSpec, Params, SceneObject } from '../core/types'
import { FT, formatLength, parseLength, type UnitSystem } from '../core/units'
import { useSceneStore } from '../store/useSceneStore'
import { Dropdown, SegRow, SliderRow, ToggleRow } from './controls'
import { Icon, I } from './icons'

/** Enums with few options read better as a segmented toggle than a dropdown. */
const SEG_LIMIT = 3

/** Choices that pick the material, and so the texture, for a component. */
const FINISH_KEYS = new Set(['finish', 'surface', 'paver', 'sheets'])

/* ------------------------------------------------------------------ *
 * Position fields
 *
 * The inputs are uncontrolled and updated through a ref. Giving them a
 * value-derived `key` instead would tear down and rebuild three DOM nodes on
 * every frame of a drag, which cost ~40ms per update.
 * ------------------------------------------------------------------ */

function AxisField({
  axis,
  value,
  units,
  disabled,
  onChange,
  onCommit,
}: {
  axis: 'X' | 'Y' | 'Z'
  value: number
  units: UnitSystem
  disabled: boolean
  onChange: (v: number) => void
  onCommit: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const drag = useRef<{ x: number; from: number; moved: boolean } | null>(null)

  useEffect(() => {
    const el = ref.current
    // never fight the user while they are typing in it
    if (el && document.activeElement !== el) el.value = formatLength(value, units)
  }, [value, units])

  /** Sideways drag scrubs the value. About 60px of travel per foot. */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return
    drag.current = { x: e.clientX, from: value, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.moved) {
      if (Math.abs(dx) < 3) return
      d.moved = true
      onCommit()
    }
    e.preventDefault()
    const perPixel = (e.shiftKey ? 0.02 : 0.1) * FT
    onChange(d.from + dx * perPixel)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    // a click that never moved means the user wants to type instead
    if (!d.moved) ref.current?.focus()
  }

  return (
    <div
      className={`xyz-cell ${disabled ? 'off' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      title={disabled ? 'This component sits on the ground' : `Drag to move along ${axis}, click to type`}
    >
      <span>{axis}</span>
      <input
        ref={ref}
        defaultValue={formatLength(value, units)}
        disabled={disabled}
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={(e) => {
          const parsed = parseLength(e.target.value, units)
          if (parsed === null) e.target.value = formatLength(value, units)
          else {
            onCommit()
            onChange(parsed)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
    </div>
  )
}

function Placement({ id, grounded }: { id: string; grounded: boolean }) {
  const units = useSceneStore((s) => s.units)
  const setPosition = useSceneStore((s) => s.setPosition)
  const setRotationY = useSceneStore((s) => s.setRotationY)
  const pushHistory = useSceneStore((s) => s.pushHistory)

  const at = (i: 0 | 1 | 2) => (s: { objects: SceneObject[] }) =>
    s.objects.find((o) => o.id === id)?.position[i] ?? 0
  const px = useSceneStore(at(0))
  const py = useSceneStore(at(1))
  const pz = useSceneStore(at(2))
  const deg = useSceneStore(
    (s) => Math.round(((s.objects.find((o) => o.id === id)?.rotationY ?? 0) * 180) / Math.PI),
  )

  const setAxis = (index: 0 | 1 | 2) => (v: number) => {
    const next: [number, number, number] = [px, py, pz]
    next[index] = v
    setPosition(id, next)
  }

  return (
    <>
      <div className="xyz">
        <AxisField axis="X" value={px} units={units} disabled={false} onChange={setAxis(0)} onCommit={pushHistory} />
        <AxisField axis="Y" value={py} units={units} disabled={grounded} onChange={setAxis(1)} onCommit={pushHistory} />
        <AxisField axis="Z" value={pz} units={units} disabled={false} onChange={setAxis(2)} onCommit={pushHistory} />
      </div>
      <SliderRow
        label="Rotation"
        value={deg}
        min={-180}
        max={180}
        format={(v) => `${Math.round(v)}°`}
        parse={(s) => {
          const n = parseFloat(s.replace('°', ''))
          return Number.isNaN(n) ? null : n
        }}
        onChange={(v) => setRotationY(id, (Math.round(v) * Math.PI) / 180)}
        onCommit={pushHistory}
      />
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Dimensions
 *
 * Memoised on `params`. The store rebuilds an object when it moves but keeps
 * the same `params` object, so this whole block is skipped during a drag.
 * ------------------------------------------------------------------ */

const ParamList = memo(function ParamList({
  id,
  type,
  params,
  units,
  lowPoly,
}: {
  id: string
  type: SceneObject['type']
  params: Params
  units: UnitSystem
  lowPoly: boolean
}) {
  const setParam = useSceneStore((s) => s.setParam)
  const pushHistory = useSceneStore((s) => s.pushHistory)
  const entries = Object.entries(CATALOG[type].params) as [string, ParamSpec][]

  return (
    <>
      {entries.map(([key, spec]) => {
        const raw = params[key]
        switch (spec.kind) {
          case 'length': {
            const value = typeof raw === 'number' ? raw : spec.def
            return (
              <SliderRow
                key={key}
                label={spec.label}
                value={value}
                min={spec.min}
                max={spec.max}
                ratio={spec.def > 0 ? value / spec.def : undefined}
                format={(v) => formatLength(v, units)}
                parse={(s) => parseLength(s, units)}
                onChange={(v) => setParam(id, key, v)}
                onCommit={pushHistory}
              />
            )
          }
          case 'angle':
            return (
              <SliderRow
                key={key}
                label={spec.label}
                value={typeof raw === 'number' ? raw : spec.def}
                min={spec.min}
                max={spec.max}
                format={(v) => `${Math.round(v)}°`}
                parse={(s) => {
                  const n = parseFloat(s.replace('°', ''))
                  return Number.isNaN(n) ? null : n
                }}
                onChange={(v) => setParam(id, key, Math.round(v))}
                onCommit={pushHistory}
              />
            )
          case 'count':
            return (
              <SliderRow
                key={key}
                label={spec.label}
                value={typeof raw === 'number' ? raw : spec.def}
                min={spec.min}
                max={spec.max}
                format={(v) => String(Math.round(v))}
                parse={(s) => {
                  const n = parseInt(s, 10)
                  return Number.isNaN(n) ? null : n
                }}
                onChange={(v) => setParam(id, key, Math.round(v))}
                onCommit={pushHistory}
              />
            )
          case 'factor':
            return (
              <SliderRow
                key={key}
                label={spec.label}
                value={typeof raw === 'number' ? raw : spec.def}
                min={spec.min}
                max={spec.max}
                format={(v) => `${v.toFixed(2)}x`}
                onChange={(v) => setParam(id, key, v)}
                onCommit={pushHistory}
              />
            )
          case 'enum': {
            const value = typeof raw === 'string' ? raw : spec.def
            const apply = (v: string) => {
              pushHistory()
              setParam(id, key, v)
            }
            // low poly uses the plain default look, so there is nothing to pick
            if (lowPoly && FINISH_KEYS.has(key)) return null
            return spec.options.length <= SEG_LIMIT ? (
              <SegRow
                key={key}
                label={spec.label}
                value={value}
                options={spec.options}
                onChange={apply}
              />
            ) : (
              <Dropdown
                key={key}
                label={spec.label}
                value={value}
                options={spec.options}
                onChange={apply}
              />
            )
          }
          case 'bool':
            return (
              <ToggleRow
                key={key}
                label={spec.label}
                checked={typeof raw === 'boolean' ? raw : spec.def}
                onChange={(v) => {
                  pushHistory()
                  setParam(id, key, v)
                }}
              />
            )
        }
      })}
    </>
  )
})

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Inspector
 *
 * Subscribes to primitives (id, type, name, locked, groupId) rather than to the
 * object, so a drag re-renders only <Placement/>. Re-rendering this whole block
 * every frame meant rebuilding all of its icon SVGs, which was the bulk of the
 * cost when something was selected.
 * ------------------------------------------------------------------ */

export function Inspector() {
  const id = useSceneStore((s) => s.selectedIds[s.selectedIds.length - 1] ?? null)
  if (!id) {
    return (
      <div className="empty">
        Nothing selected.
        <br />
        Click a component in the scene, or add one from the left.
        <br />
        <br />
        Shift-click to select more than one.
      </div>
    )
  }
  return <InspectorBody id={id} />
}

function InspectorBody({ id }: { id: string }) {
  const find = (s: { objects: SceneObject[] }) => s.objects.find((o) => o.id === id)

  const type = useSceneStore((s) => find(s)?.type ?? null)
  const name = useSceneStore((s) => find(s)?.name ?? '')
  const locked = useSceneStore((s) => find(s)?.locked ?? false)
  const grouped = useSceneStore((s) => Boolean(find(s)?.groupId))
  // params keep their identity when an object only moves, so this stays stable
  const params = useSceneStore((s) => find(s)?.params)
  const master = useSceneStore((s) => s.lowPoly)
  const own = useSceneStore((s) => find(s)?.lowPoly)
  const lowPoly = own ?? master
  const units = useSceneStore((s) => s.units)
  const selectionCount = useSceneStore((s) => s.selectedIds.length)

  const rename = useSceneStore((s) => s.rename)
  const duplicate = useSceneStore((s) => s.duplicate)
  const remove = useSceneStore((s) => s.remove)
  const toggleLock = useSceneStore((s) => s.toggleLock)
  const setLowPoly = useSceneStore((s) => s.setLowPoly)
  const groupSelected = useSceneStore((s) => s.groupSelected)
  const ungroupSelected = useSceneStore((s) => s.ungroupSelected)

  if (!type || !params) return null
  const def = CATALOG[type]
  const canGroup = selectionCount > 1

  return (
    <>
      <div className="section">
        <p className="section-title">
          <span>{def.icon}</span> {def.label}
        </p>
        <input
          className="name-input"
          type="text"
          value={name}
          onChange={(e) => rename(id, e.target.value)}
        />
      </div>

      <div className="section">
        <p className="section-title">Material</p>
        <ToggleRow label="Low poly" checked={lowPoly} onChange={(v) => setLowPoly(id, v)} />
        <p className="hint-note">
          {lowPoly
            ? 'Flat default colours. Turn this off to choose a real material.'
            : 'Real material. Pick which one below.'}
          {own !== undefined && (
            <>
              {' '}
              Set just for this component.{' '}
              <button className="linky" onClick={() => setLowPoly(id, null)}>
                Follow the toolbar instead
              </button>
            </>
          )}
        </p>
      </div>

      <div className="section">
        <p className="section-title">Dimensions</p>
        <ParamList id={id} type={type} params={params} units={units} lowPoly={lowPoly} />
      </div>

      <div className="section">
        <p className="section-title">Position</p>
        <Placement id={id} grounded={def.grounded} />
      </div>

      <div className="section">
        <p className="section-title">
          <Icon icon={I.group} size={12} /> Grouping
        </p>
        {canGroup || grouped ? (
          <div className="row">
            {canGroup && (
              <button className="btn" onClick={groupSelected} title="Move these together from now on">
                <Icon icon={I.group} /> Group {selectionCount}
              </button>
            )}
            {grouped && (
              <button className="btn" onClick={ungroupSelected} title="Break this group apart">
                <Icon icon={I.ungroup} /> Ungroup
              </button>
            )}
          </div>
        ) : (
          <p className="empty" style={{ padding: '2px 0', textAlign: 'left' }}>
            Shift-click a second component to group them, then they move together.
          </p>
        )}
      </div>

      <div className="section">
        <div className="row">
          <button className="btn" onClick={() => duplicate(id)}>
            <Icon icon={I.duplicate} /> Duplicate
          </button>
          <button
            className={`btn ${locked ? 'on' : ''}`}
            onClick={() => toggleLock(id)}
            title={locked ? 'Unlock so it can be dragged' : 'Lock so it cannot be dragged'}
          >
            <Icon icon={locked ? I.lock : I.unlock} />
            {locked ? 'Locked' : 'Lock'}
          </button>
        </div>
        {def.singleton !== true && (
          <button className="btn wide" style={{ marginTop: 6 }} onClick={() => remove(id)}>
            <Icon icon={I.remove} /> Delete component
          </button>
        )}
      </div>
    </>
  )
}
