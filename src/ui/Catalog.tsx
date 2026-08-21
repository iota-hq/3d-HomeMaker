import { BY_CATEGORY } from '../core/catalog'
import { useSceneStore } from '../store/useSceneStore'
import { CATEGORY_ICON, Icon } from './icons'

export function CatalogPanel() {
  const add = useSceneStore((s) => s.add)
  const objects = useSceneStore((s) => s.objects)

  return (
    <>
      {BY_CATEGORY.map(({ category, items }) => (
        <div key={category}>
          <p className="cat-title">
            <Icon icon={CATEGORY_ICON[category]} size={13} /> {category}
          </p>
          <div className="cat-grid">
            {items.map((d) => {
              const taken = d.singleton === true && objects.some((o) => o.type === d.type)
              return (
                <button
                  key={d.type}
                  className="card"
                  title={d.blurb}
                  disabled={taken}
                  onClick={() => add(d.type)}
                >
                  <span className="glyph">{d.icon}</span>
                  <span className="name">{d.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div style={{ height: 12 }} />
    </>
  )
}
