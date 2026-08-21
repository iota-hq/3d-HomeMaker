import {
  ArrowDown01Icon,
  ArrowExpandIcon,
  Cancel01Icon,
  Copy01Icon,
  CubeIcon,
  Delete02Icon,
  EyeIcon,
  GithubIcon,
  GroupItemsIcon,
  Image02Icon,
  Layers01Icon,
  Magnet02Icon,
  MinusSignIcon,
  PaintBoardIcon,
  Moon02Icon,
  Move01Icon,
  PlusSignIcon,
  Refresh01Icon,
  Rotate01Icon,
  RulerIcon,
  SquareLock02Icon,
  SquareUnlock02Icon,
  Sun03Icon,
  UndoIcon,
  UngroupItemsIcon,
  ViewOffSlashIcon,
  RedoIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

/** Every icon in the app comes from hugeicons, funnelled through here. */
export function Icon({
  icon,
  size = 16,
  strokeWidth = 1.8,
}: {
  icon: IconSvgElement
  size?: number
  strokeWidth?: number
}) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} />
}

export const I = {
  brand: CubeIcon,
  undo: UndoIcon,
  redo: RedoIcon,
  reset: Refresh01Icon,
  light: Sun03Icon,
  dark: Moon02Icon,
  exportImage: Image02Icon,
  zoomIn: PlusSignIcon,
  zoomOut: MinusSignIcon,
  snap: Magnet02Icon,
  units: RulerIcon,
  move: Move01Icon,
  rotate: Rotate01Icon,
  duplicate: Copy01Icon,
  remove: Delete02Icon,
  lock: SquareLock02Icon,
  unlock: SquareUnlock02Icon,
  shown: EyeIcon,
  hidden: ViewOffSlashIcon,
  group: GroupItemsIcon,
  ungroup: UngroupItemsIcon,
  scene: Layers01Icon,
  texture: PaintBoardIcon,
  chevron: ArrowDown01Icon,
  close: Cancel01Icon,
  github: GithubIcon,
  expand: ArrowExpandIcon,
} as const
