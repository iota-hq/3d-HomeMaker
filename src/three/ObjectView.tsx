import { CATALOG } from '../core/catalog'
import { useSceneStore } from '../store/useSceneStore'
import { LowPolyContext } from './Mat'
import type { SceneObject } from '../core/types'
import { Bed } from './components/Bed'
import { Bluescope } from './components/Bluescope'
import { Cupboard } from './components/Cupboard'
import { Column } from './components/Column'
import { Door } from './components/Door'
import { Ground } from './components/Ground'
import { Khaprail } from './components/Khaprail'
import { Ladder } from './components/Ladder'
import { Mirror } from './components/Mirror'
import { Path } from './components/Path'
import { Railing } from './components/Railing'
import { Room } from './components/Room'
import { Slab } from './components/Slab'
import { Table } from './components/Table'
import { Stairs } from './components/Stairs'
import { Wall } from './components/Wall'
import { Win } from './components/Win'

/** Renders one object's geometry. Placement (position/yaw) is applied by the caller. */
export function ObjectBody({ obj }: { obj: SceneObject }) {
  const master = useSceneStore((s) => s.lowPoly)
  // a component uses its own setting if it has one, otherwise the master
  const lowPoly = obj.lowPoly ?? master
  return (
    <LowPolyContext.Provider value={lowPoly}>
      <Body obj={obj} />
    </LowPolyContext.Provider>
  )
}

function Body({ obj }: { obj: SceneObject }) {
  switch (obj.type) {
    case 'ground':
      return <Ground obj={obj} />
    case 'wall':
      return <Wall obj={obj} />
    case 'door':
      return <Door obj={obj} />
    case 'window':
      return <Win obj={obj} />
    case 'slab':
      return <Slab obj={obj} />
    case 'column':
      return <Column obj={obj} />
    case 'path':
      return <Path obj={obj} />
    case 'khaprail':
      return <Khaprail obj={obj} />
    case 'bluescope':
      return <Bluescope obj={obj} />
    case 'stairs':
      return <Stairs obj={obj} />
    case 'ladder':
      return <Ladder obj={obj} />
    case 'room':
      return <Room obj={obj} />
    case 'cupboard':
      return <Cupboard obj={obj} />
    case 'table':
      return <Table obj={obj} />
    case 'bed':
      return <Bed obj={obj} />
    case 'mirror':
      return <Mirror obj={obj} />
    case 'railing':
      return <Railing obj={obj} />
    default:
      return null
  }
}

export const isGrounded = (obj: SceneObject) => CATALOG[obj.type].grounded
