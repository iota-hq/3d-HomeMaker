import { useEffect, useState } from 'react'

/**
 * The planner needs room: two 268px panels either side of a viewport you drag
 * things around in, with a hover cursor. A phone has neither, so rather than
 * shipping a cramped version we tell people to come back on a desktop.
 *
 * Width alone would catch a small desktop window, which genuinely cannot fit
 * the layout either, so blocking that is the right call too. The coarse pointer
 * clause widens the net to tablets held in landscape.
 */
const QUERY = '(max-width: 900px), (pointer: coarse) and (max-width: 1180px)'

export function useIsSmallScreen() {
  const [small, setSmall] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setSmall(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return small
}
