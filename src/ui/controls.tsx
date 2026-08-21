import { useEffect, useRef, useState } from 'react'
import { Icon, I } from './icons'

/* ------------------------------------------------------------------ *
 * SliderRow
 * One compact row that is itself the slider: label left, value right,
 * a pill marking the position. Drag anywhere on the row to change it,
 * double click to type an exact value.
 * ------------------------------------------------------------------ */

export function SliderRow({
  label,
  value,
  min,
  max,
  format,
  parse,
  ratio,
  onChange,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  /** Value to display text. */
  format: (v: number) => string
  /** Typed text back to a value, or null when it makes no sense. */
  parse?: (s: string) => number | null
  /** Optional "1.17x" readout next to the value. */
  ratio?: number
  onChange: (v: number) => void
  onCommit: () => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')

  const span = max - min
  const pct = span > 0 ? Math.min(1, Math.max(0, (value - min) / span)) : 0

  const valueFromClientX = (clientX: number) => {
    const el = rowRef.current
    if (!el) return value
    const r = el.getBoundingClientRect()
    const pad = 10
    const t = Math.min(1, Math.max(0, (clientX - r.left - pad) / (r.width - pad * 2)))
    return min + t * span
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (editing || e.button !== 0) return
    e.preventDefault()
    dragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    onCommit()
    onChange(valueFromClientX(e.clientX))
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    onChange(valueFromClientX(e.clientX))
  }

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  const beginEdit = () => {
    if (!parse) return
    setText(format(value))
    setEditing(true)
  }

  const commitEdit = () => {
    setEditing(false)
    const parsed = parse?.(text)
    if (parsed === null || parsed === undefined || Number.isNaN(parsed)) return
    onCommit()
    onChange(Math.min(max, Math.max(min, parsed)))
  }

  return (
    <div
      ref={rowRef}
      className="srow"
      style={{ ['--pct' as string]: pct }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={beginEdit}
      title={parse ? 'Drag to change, double click to type' : 'Drag to change'}
    >
      <span className="srow-pill" style={{ left: `calc(10px + ${pct} * (100% - 25px))` }} />
      <span className="srow-label">{label}</span>
      <span className="srow-value">
        {format(value)}
        {ratio !== undefined && <span className="srow-ratio">{ratio.toFixed(2)}x</span>}
      </span>

      {editing && (
        <input
          className="srow-input"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitEdit}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * ToggleRow
 * ------------------------------------------------------------------ */

export function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button type="button" className="trow" onClick={() => onChange(!checked)}>
      {label}
      <span className={`switch ${checked ? 'on' : ''}`} />
    </button>
  )
}

/* ------------------------------------------------------------------ *
 * SegRow, for choices with only two or three options
 * ------------------------------------------------------------------ */

export function SegRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="segrow">
      <span className="segrow-label">{label}</span>
      <span className="segrow-opts">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={o.value === value ? 'on' : ''}
            onClick={() => onChange(o.value)}
            title={o.label}
          >
            {o.label}
          </button>
        ))}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Dropdown, for four or more options
 * ------------------------------------------------------------------ */

export function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="dd" ref={box}>
      <button type="button" className="dd-btn" onClick={() => setOpen((v) => !v)}>
        <span className="dd-label">{label}</span>
        <span className="dd-current">
          {current?.label ?? value}
          <Icon icon={I.chevron} size={14} />
        </span>
      </button>

      {open && (
        <div className="dd-menu" role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`dd-item ${o.value === value ? 'on' : ''}`}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
