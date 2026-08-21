import { useState } from 'react'
import { About } from './About'
import { Icon, I } from './icons'

/**
 * What a phone gets instead of the planner. The 3D canvas is never mounted
 * here, so nothing is spent on a scene that cannot be used.
 */
export function MobileNotice() {
  const [showAbout, setShowAbout] = useState(true)

  return (
    <div className="gate">
      <button className="gate-mark" onClick={() => setShowAbout(true)} title="About 3dspace">
        <Icon icon={I.brand} size={34} strokeWidth={1.4} />
      </button>

      <h1>3dspace</h1>
      <p className="gate-lead">Please open this on a desktop.</p>
      <p className="gate-body">
        The planner puts a catalogue on one side and the controls on the other,
        with a viewport in the middle that you drag components around in. That
        needs a wider screen and a mouse than a phone can give it.
      </p>

      <button className="btn solid" onClick={() => setShowAbout(true)}>
        <Icon icon={I.brand} /> About 3dspace
      </button>

      {showAbout && <About onClose={() => setShowAbout(false)} />}
    </div>
  )
}
