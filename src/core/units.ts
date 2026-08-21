/**
 * Internal unit of length is ALWAYS the metre (three.js world unit).
 * The UI speaks feet & inches. Conversion lives here and nowhere else.
 */
export const FT = 0.3048
export const IN = 0.0254

export type UnitSystem = 'ftin' | 'metric'

/** 2.4 -> { ft: 7, inches: 10.5 } */
export function toFtIn(metres: number) {
  const totalInches = metres / IN
  const sign = totalInches < 0 ? -1 : 1
  const abs = Math.abs(totalInches)
  let ft = Math.floor(abs / 12)
  let inches = abs - ft * 12
  // round to 1/8" and carry
  inches = Math.round(inches * 8) / 8
  if (inches >= 12) { ft += 1; inches -= 12 }
  return { ft: ft * sign, inches, sign }
}

const EIGHTHS = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞']

/** 2.4 -> `7' 10½"` */
export function formatFtIn(metres: number): string {
  const { ft, inches, sign } = toFtIn(metres)
  const whole = Math.floor(inches)
  const frac = EIGHTHS[Math.round((inches - whole) * 8)] ?? ''
  const neg = sign < 0 && ft === 0 ? '-' : ''
  const inches_ = whole === 0 && frac !== '' ? `${frac}"` : `${whole}${frac}"`
  if (ft === 0) return `${neg}${whole === 0 && frac === '' ? `0"` : inches_}`
  if (whole === 0 && frac === '') return `${neg}${ft}'`
  return `${neg}${ft}' ${inches_}`
}

export function formatMetric(metres: number): string {
  return metres >= 1 ? `${metres.toFixed(2)} m` : `${(metres * 100).toFixed(0)} cm`
}

export function formatLength(metres: number, sys: UnitSystem): string {
  return sys === 'ftin' ? formatFtIn(metres) : formatMetric(metres)
}

/**
 * Parses loose human input into metres.
 * Accepts:  12' 6"   12'6   12.5'   150"   12-6   3.5m   120cm   12 (bare = feet in ftin mode)
 * Returns null when nothing sensible could be read.
 */
export function parseLength(raw: string, sys: UnitSystem): number | null {
  const s = raw.trim().toLowerCase().replace(/’/g, "'").replace(/”/g, '"')
  if (!s) return null

  let m: RegExpMatchArray | null

  if ((m = s.match(/^(-?[\d.]+)\s*(m|metre|meter)s?$/))) return parseFloat(m[1])
  if ((m = s.match(/^(-?[\d.]+)\s*cm$/))) return parseFloat(m[1]) / 100
  if ((m = s.match(/^(-?[\d.]+)\s*mm$/))) return parseFloat(m[1]) / 1000

  // feet + inches: 12' 6" | 12'6 | 12-6 | 12 ft 6 in
  if ((m = s.match(/^(-?[\d.]+)\s*(?:'|ft|feet|foot)\s*(?:([\d.]+)\s*(?:"|in|inch(?:es)?)?)?$/))) {
    const ft = parseFloat(m[1])
    const inch = m[2] ? parseFloat(m[2]) : 0
    return (Math.abs(ft) * FT + inch * IN) * (ft < 0 ? -1 : 1)
  }
  if ((m = s.match(/^(-?[\d.]+)\s*-\s*([\d.]+)$/))) {
    const ft = parseFloat(m[1])
    return (Math.abs(ft) * FT + parseFloat(m[2]) * IN) * (ft < 0 ? -1 : 1)
  }
  if ((m = s.match(/^(-?[\d.]+)\s*(?:"|in|inch(?:es)?)$/))) return parseFloat(m[1]) * IN

  // bare number -> the ambient unit
  if ((m = s.match(/^-?[\d.]+$/))) {
    const n = parseFloat(s)
    return sys === 'ftin' ? n * FT : n
  }
  return null
}

/** Nearest multiple, used for grid + dimension snapping. */
export function snap(value: number, step: number): number {
  return step > 0 ? Math.round(value / step) * step : value
}
