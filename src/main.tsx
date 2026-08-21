import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import App from './App'
import {
  restoreFromStorage,
  restoreTheme,
  startAutosave,
  useSceneStore,
} from './store/useSceneStore'
import './styles.css'

// `?reset` gives a clean scene without digging into devtools
if (new URLSearchParams(location.search).has('reset')) {
  localStorage.removeItem('3dspace.scene.v1')
} else {
  restoreFromStorage()
}
restoreTheme()
startAutosave()

if (import.meta.env.DEV) {
  // handy for poking at the scene from the console
  const w = window as unknown as Record<string, unknown>
  w.scene = useSceneStore
  // lets a benchmark time a full render+commit synchronously, with no scheduler noise
  w.flushSync = flushSync
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
