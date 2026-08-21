import { useEffect, useRef } from 'react'

/**
 * Shows the scrollbar only while the panel is actually being scrolled, then
 * fades it back out. The fade itself is CSS; this just toggles the class.
 */
export function useAutoHideScroll<T extends HTMLElement>(delay = 1200) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout> | undefined

    const onScroll = () => {
      el.classList.add('scrolling')
      clearTimeout(timer)
      timer = setTimeout(() => el.classList.remove('scrolling'), delay)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      clearTimeout(timer)
    }
  }, [delay])

  return ref
}
