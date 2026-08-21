import { useEffect, useState } from 'react'
import { currentLockedView, onLockChange, setLock, setView, type ViewName } from '../three/camera'
import { Icon, I } from './icons'

const VIEWS: { key: ViewName; label: string }[] = [
  { key: 'top', label: 'Top' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
  { key: 'iso', label: 'Isometric' },
]

/**
 * Shown when nothing is selected: jump to a fixed view, and optionally pin the
 * camera there. Pinned means zoom still works but orbiting does not, which is
 * what you want while reading a plan or an elevation.
 */
export function ViewPanel() {
  const [lockedView, setLockedView] = useState<ViewName | null>(currentLockedView())

  useEffect(() => {
    const off = onLockChange(() => setLockedView(currentLockedView()))
    return () => {
      off()
    }
  }, [])

  return (
    <div className="section">
      <p className="section-title">View</p>
      <div className="views">
        {VIEWS.map((v) => {
          const pinned = lockedView === v.key
          return (
            <div key={v.key} className={`view-row ${pinned ? 'on' : ''}`}>
              <button className="view-go" onClick={() => setView(v.key)}>
                {v.label}
              </button>
              <button
                className={`view-lock ${pinned ? 'on' : ''}`}
                title={
                  pinned
                    ? 'Unpin, so the camera can orbit again'
                    : 'Pin the camera here: zoom only, no orbiting'
                }
                onClick={() => {
                  if (pinned) {
                    setLock(null)
                  } else {
                    setView(v.key)
                    setLock(v.key)
                  }
                }}
              >
                <Icon icon={pinned ? I.lock : I.unlock} size={14} />
              </button>
            </div>
          )
        })}
      </div>
      {lockedView && (
        <p className="hint-note">
          Camera pinned. Zoom still works, orbiting is off until you unpin.
        </p>
      )}
    </div>
  )
}
