# Contributing

Thanks for taking a look. This is a small, focused codebase and the bar for a
change is simple: it should read like the code already there.

## Getting set up

```bash
npm install
npm run dev      # http://localhost:5173
```

Append `?reset` to the URL to start from an empty plot.

Before opening a pull request:

```bash
npx tsc --noEmit   # must be clean
npm run build      # must succeed
```

## House style

A few conventions the project sticks to. They are not negotiable in the sense
that a reviewer will ask you to match them, but none of them are precious.

- **No em dashes** anywhere in source, comments or docs.
- **No CSS gradients.** If something needs a sheen or a highlight, build it
  another way. The logo shimmer uses an animated `clip-path` window for exactly
  this reason.
- **12px border radius** on buttons and cards, 16px on larger surfaces.
- Body text is Geist, section headings are Google Sans Code, and headings are
  sentence case rather than uppercase.
- Icons come from **hugeicons** and are funnelled through `src/ui/icons.tsx`.
  Add a name there rather than importing an icon directly.
- Comments explain **why**, not what. If a line needs a comment to say what it
  does, the line probably wants rewriting instead.

## Adding a component

`src/core/catalog.ts` is the single place a component is declared. Its parameter
schema drives both the geometry and the inspector controls, so adding a
parameter adds its UI for free.

1. Add an entry to `CATALOG` with its params, category and icon.
2. Add the type to `ComponentType` in `src/core/types.ts`.
3. Write the geometry in `src/three/components/YourThing.tsx`.
4. Wire it into the switch in `src/three/ObjectView.tsx`.

Geometry rules that keep the app fast:

- **Generate from parameters, never load a model.** Everything must resize by
  real dimensions without distorting.
- **Memoise geometry** on the parameters it actually depends on, and dispose it
  in a `useEffect` cleanup when it is replaced.
- **Instance anything repeated** (tiles, pavers, rungs) and fall back to a
  single mesh past a sane instance count.
- **Never declare a component inside another component.** It remounts on every
  render, which is brutal for an `InstancedMesh`.
- Use `<Mat>` for materials rather than `meshStandardMaterial` directly, so the
  surface picks up the Low poly setting. Pass `scale={[across, down]}` for
  anything that is not square, or the texture comes out stretched.

## Performance

The interaction budget is the thing most likely to regress, and it regresses
quietly. Panels subscribe to **primitives**, not to objects: dragging a selected
component should re-render its position fields and nothing else. If you find
yourself passing a whole `SceneObject` into a panel, that is usually the bug.

To measure a change, `window.flushSync` and `window.scene` are exposed in dev.
Time a synchronous commit rather than trusting a stopwatch:

```js
const st = () => window.scene.getState()
const t0 = performance.now()
window.flushSync(() => st().setPosition(id, [x, 0, z]))
console.log(performance.now() - t0)
```

Interleave the two cases you are comparing in a single run. Absolute numbers
drift a lot between runs; ratios do not.

## Reporting something

An issue is most useful with the plan attached. Export is an image, so for a bug
report the quickest repro is usually the steps plus what you expected. Say which
browser, and whether Low poly was on or off.

## Licence

By contributing you agree that your work is released under the MIT licence in
[LICENSE](LICENSE).
