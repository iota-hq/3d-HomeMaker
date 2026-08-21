import {
  ArrowDown01Icon,
  ArrowExpandIcon,
  Building03Icon,
  ArrowRight01Icon,
  ArrowReloadHorizontalIcon,
  Cancel01Icon,
  Door01Icon,
  Edit02Icon,
  Home13Icon,
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
  Move02Icon,
  PaintBoardIcon,
  Moon02Icon,
  Move01Icon,
  PlusSignIcon,
  Refresh01Icon,
  Rotate01Icon,
  RulerIcon,
  Sofa01Icon,
  SlidersHorizontalIcon,
  Tree01Icon,
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
  reset: ArrowReloadHorizontalIcon,
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
  view: EyeIcon,
  texture: PaintBoardIcon,
  chevron: ArrowDown01Icon,
  chevronRight: ArrowRight01Icon,
  rename: Edit02Icon,
  dimensions: SlidersHorizontalIcon,
  position: Move02Icon,
  close: Cancel01Icon,
  github: GithubIcon,
  expand: ArrowExpandIcon,
} as const

/** One icon per catalogue category, for the left sidebar headings. */
export const CATEGORY_ICON = {
  Site: Tree01Icon,
  Structure: Building03Icon,
  Openings: Door01Icon,
  Roof: Home13Icon,
  Access: ArrowExpandIcon,
  Furniture: Sofa01Icon,
} as const
