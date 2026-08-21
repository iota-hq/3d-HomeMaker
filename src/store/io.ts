export type ImageFormat = 'png' | 'jpeg'

/**
 * Saves exactly what the user is looking at.
 *
 * The canvas is drawn with `preserveDrawingBuffer: true`, so the last rendered
 * frame is still readable here. JPEG has no alpha, so it gets the stage colour
 * painted behind it first.
 */
export async function exportView(format: ImageFormat = 'png'): Promise<boolean> {
  const canvas = document.querySelector<HTMLCanvasElement>('.stage canvas')
  if (!canvas) return false

  let source: HTMLCanvasElement = canvas

  if (format === 'jpeg') {
    const flat = document.createElement('canvas')
    flat.width = canvas.width
    flat.height = canvas.height
    const ctx = flat.getContext('2d')
    if (!ctx) return false
    const dark = document.documentElement.dataset.theme === 'dark'
    ctx.fillStyle = dark ? '#121214' : '#f4f4f5'
    ctx.fillRect(0, 0, flat.width, flat.height)
    ctx.drawImage(canvas, 0, 0)
    source = flat
  }

  const blob = await new Promise<Blob | null>((res) =>
    source.toBlob(res, format === 'png' ? 'image/png' : 'image/jpeg', 0.92),
  )
  if (!blob) return false

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `3dspace-${new Date().toISOString().slice(0, 10)}.${format === 'png' ? 'png' : 'jpg'}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
