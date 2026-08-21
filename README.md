# 3dspace

A browser based 3D house and site planner. Lay out a plot, raise walls, punch in
doors and windows, put a roof over the top, then walk the camera around the
result. Everything resizes by real dimensions or by ratio.

Inspired by the IKEA room planner, but aimed at the *outside* of a house as much
as the inside: grass and paved ground, khaprail clay tile roofs, Tata BlueScope
Durashine steel roofs, curved staircases and leaning ladders.

Built by [iota](https://github.com/iota-hq). MIT licensed.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle
npm run preview  # serve the build
```

Append `?reset` to the URL to start from an empty plot.

Desktop only. On a phone the app shows a short notice instead, and never mounts
the 3D canvas.

There is no backend and no account. Plans autosave to `localStorage`, fonts are
self hosted, and textures are generated in the browser, so the app makes no
network requests once it has loaded.

## The core idea: parametric, not a model catalogue

Most planners drop fixed 3D models into a scene. Because every component here
has to be resizable by ratio, nothing is a downloaded mesh. Every component is
**generated from its parameters** each time they change:

- a wall is `{length, height, thickness, openings[]}`
- a khaprail roof is `{span, length, pitch, overhang, tileSize, ...}`

That means resizing never stretches or distorts anything, the bundle carries no
model assets, and there is nothing to wait for on load.

## Components

| Group | Components |
| --- | --- |
| Site | Ground (grass, plain, soil, sand, concrete), Path |
| Structure | Wall, Room, Ceiling / RCC slab, Column |
| Openings | Door, Window |
| Roof | Clay tile (khaprail), Durashine (steel sheet) |
| Access | Stairs (straight or curved), Ladder, Railing |
| Furniture | Cupboard, Dining table, Bed, Mirror |

You can place as many grounds as you like, so a plan can span more than one
plot. A new ground lays itself down beside the rightmost existing one rather
than on top of it, so plots never overlap or fight over a click.

**Room** is a whole room in one component: four walls, a door in the front wall
and a window in each side wall, plus an optional floor and ceiling slab. Square
or rectangular, and every part of it stays adjustable from its own controls.

**Clay tile** roofs, the traditional khaprail, lay real interlocking pan tiles
in courses.

**Durashine** is the Tata BlueScope line, which is what is actually sold across
South Asia, rather than BlueScope Australia's. The physical profiles overlap but
the naming and colours do not, so it carries DURASHINE Roof 1015, DURASHINE Tile
(whose steps run down the slope rather than across it), corrugated and standing
seam, in the real colours: Nuvo Blue, Satin Silver, Bright Green, Asian White,
Castle Red and Coffee Brown.

**Stairs** come straight or curved. The curved flight carries a sweeping
handrail up the helix, and every tread is the same box, equal width and equal
going, rather than a wedge that widens towards the outside.

**Paths** can be bent around an arc with the Curve control.

**Rooms** can be split into their separate walls, door, windows and floor with
"Split into parts", which leaves them grouped so they still move together.

**Mirrors** use a low roughness metallic surface rather than a true reflection.
A real mirror means rendering the whole scene a second time every frame, which
is the sort of cost this planner is built to avoid.

## Units

Everything is stored internally in metres, because that is the three.js world
unit and it keeps the geometry maths honest. The UI speaks **feet and inches**,
and the ft/in toggle in the toolbar switches to metric. Dimension fields accept
loose input and parse it: `12' 6"`, `12'6`, `12-6`, `150"`, `3.5m`, `120cm`, or a
bare number in the current unit.

## How openings work

Doors and windows are not children of a wall. A wall looks for any door or
window standing in its plane and cuts those rectangles out of its own extruded
outline. Drag a door onto a wall and the hole appears; drag it off and the wall
closes up. Nothing has to be re-parented, and there is no link to keep in sync.

While dragging, a door or window snaps flush into whichever wall it is over.

## Controls

| Action | Input |
| --- | --- |
| Move a component | drag it (the cursor turns into a grab hand) |
| Orbit | right drag |
| Pan | middle drag |
| Zoom | scroll, or the +/- buttons |
| Add to the selection | shift-click, or ctrl-click |
| Group / ungroup | ctrl+G / ctrl+shift+G |
| Nudge selection | arrow keys |
| Rotate selection | shift + left/right arrow |
| Delete | del or backspace |
| Duplicate | ctrl+D |
| Undo / redo | ctrl+Z / ctrl+shift+Z |
| Deselect | escape |

There is no separate move or rotate mode: dragging always moves, and rotation
comes from the Rotation control, shift+arrows, or the X/Y/Z fields.

The axis gizmo in the top right is built out of DOM rather than a second WebGL
canvas, so it costs no draw calls. Click a coloured handle to look straight down
that axis, or the dot in the middle for an isometric view. Snap sets the grid
that dragging rounds to.

With nothing selected the right panel lists the fixed views. Each has a pin
beside it: pinning holds the camera in that view so you can still zoom but not
orbit, which is what you want while reading a plan or an elevation.

The X / Y / Z fields are drag scrubbers. Drag one sideways to slide the
component along that axis, hold shift for finer steps, or click to type an exact
value.

## Grouping

Shift-click two or more components and press Group. From then on, dragging any
one of them moves the whole group, which is the easy way to keep a window with
its wall. Ungroup breaks it apart again. Grouped items are marked `grp` in the
scene list.

## Keeping it fast

The scene is small but the interaction budget is tight, so:

- `frameloop="demand"`: frames are drawn when something changes, not 60 times a
  second while you sit still.
- Every placed object is memoised, and the store preserves the identity of
  objects it did not touch. Dragging one component re-renders that component
  alone. This took a drag update from ~15ms down to ~3.5ms.
- A wall subscribes to its own openings as a *string* key, so it only rebuilds
  its geometry when its own openings move, not when anything else in the scene
  does.
- Repeated elements are instanced: roof tiles, path pavers. Both fall back to a
  single slab past a sane instance count.
- Geometry is rebuilt only when the parameters it depends on change, and is
  disposed when it is replaced.
- The panels subscribe to primitives, not to objects. Dragging a selected
  component re-renders its three position fields and nothing else: not the
  toolbar, not the dimension controls, not the scene list. Skipping this cost
  roughly 30ms per frame, because it meant rebuilding every icon SVG on screen.
- The scene list only mounts while it is open.

Rendering settles rather than shimmering, which took four things: the ground
receives shadows but no longer casts them (a flat slab casting onto itself is
what banded the grass), the grid is drawn against a polygon offset so it cannot
z-fight the surface beneath it, the camera runs 0.5 to 400 rather than 0.1 to
800 so depth precision is not spent entirely near the lens, and the shadow
camera is sized to the scene instead of a fixed box.

## Layout

```
src/
  core/        units, the component catalogue and its parameter schemas, materials
  store/       zustand document store, undo/redo, autosave, image export
  three/       viewport, camera rig, axis gizmo, selection, openings, textures
    components/  one parametric geometry generator per component
  ui/          toolbar, catalogue panel, inspector, control primitives
```

`core/catalog.ts` is the place to add a component. Its parameter schema drives
both the geometry and the inspector controls, so adding a parameter adds its UI.

## Saving and export

The plan autosaves to `localStorage` as you work, so closing the tab loses
nothing. **Export** saves a PNG or JPG of exactly the current camera view, at
the canvas resolution. Pick the format with the PNG / JPG toggle beside it.

## Theme

Light and dark, toggled from the navbar and remembered. It follows the system
preference on a first visit. The palette and the 12/16px radii come from
gradii.kshv.me. Icons are hugeicons, body text is Geist, section headings are
Google Sans Code, and there are no gradients anywhere.

A note on the headings: the proportional Google Sans is proprietary and cannot
be redistributed. Google Sans Code is the only publicly released member of the
family, so that is what the headings use. If you would rather have a
proportional face, DM Sans is already installed and is the closest match; swap
the `--heading` line in `styles.css` and nothing else changes.

## Low poly, and real materials

Every component has a **Low poly** toggle, on by default. On is the flat
coloured look: it reads clearly while editing and it is cheap. The navbar button
flips every component at once.

Turn it off and that component gets a real material: brick lays in courses with
mortar joints and its own colour per brick, grass grows blades, gravel is actual
stones, wood has grain and knots, metal is brushed. Nothing is downloaded.
Each material paints two passes onto a 512px canvas, a colour pass and a height
pass, and the height pass becomes a normal map. That normal map is what does the
work: the mortar sinks, the brick faces catch light. Colour alone just looks
like a photograph glued to a flat board.

Tiling is worked out per axis from the real size of the surface, so bricks stay
brick shaped on a wall that is twice as long as it is tall.

While Low poly is off, the Finish and Surface choices grey out, because the
material is deciding the look. Turn Low poly back on to change them.

Textures roughly double the cost of drawing a frame, which is why the default is
off. Surfaces sharing a finish share one canvas, so a whole scene costs about a
dozen GPU textures rather than one per surface.

## Stack

Vite 8, React 19, TypeScript, three.js 0.185, @react-three/fiber 9,
@react-three/drei 10, zustand 5, hugeicons. Geist and Google Sans Code are self
hosted via fontsource.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: match the surrounding
style, keep `npx tsc --noEmit` clean, and measure before claiming something is
faster.

## Licence

[MIT](LICENSE)
