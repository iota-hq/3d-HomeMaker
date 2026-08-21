import { useEffect } from 'react'
import { Icon, I } from './icons'

export const ORG_URL = 'https://github.com/iota-hq'
export const REPO_URL = 'https://github.com/iota-hq/3d-HomeMaker'

/** Shown on a first visit, and any time the logo is clicked. */
export function About({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal about" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close" aria-label="Close">
          <Icon icon={I.close} size={16} />
        </button>

        <div className="about-head">
          <span className="about-mark">
            <Icon icon={I.brand} size={26} strokeWidth={1.5} />
          </span>
          <div>
            <h2>3dspace</h2>
            <p className="about-by">Built by iota</p>
          </div>
        </div>

        <p>
          A 3D house and site planner that runs in the browser. Lay out a plot,
          raise walls, punch in doors and windows, put a khaprail or Durashine
          roof over the top, then walk the camera around the result.
        </p>
        <p>
          Every component is generated from its own measurements rather than
          loaded as a fixed model, so anything can be resized by real dimensions
          or by ratio without distorting. It speaks feet and inches, keeps a
          plan between visits, and exports the view as an image.
        </p>

        <div className="about-links">
          <a className="btn" href={ORG_URL} target="_blank" rel="noreferrer noopener">
            <Icon icon={I.github} /> iota
          </a>
          <a className="btn solid" href={REPO_URL} target="_blank" rel="noreferrer noopener">
            <Icon icon={I.github} /> View the repo
          </a>
        </div>
      </div>
    </div>
  )
}
