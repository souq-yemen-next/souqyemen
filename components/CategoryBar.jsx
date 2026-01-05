// components/CategoryBar.jsx
'use client';

const ICONS = {
  all: '📋',
  map: '🗺️',
  cars: '🚗',
  real_estate: '🏠',
  phones: '📱',
  jobs: '💼',
  solar: '🔋',
  furniture: '🛋️',
  yemeni_products: '🧺',
};

function getIcon(slug) {
  return ICONS[slug] || '📌';
}

export default function CategoryBar({
  categories = [],
  active,
  onChange,
  view = 'list',          // 'list' | 'map'
  onChangeView = () => {}, // setView
}) {
  const items = [{ slug: 'all', name: 'الكل' }, ...categories];

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* صف: الكل + عرض على الخريطة */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row" style={{ gap: 8 }}>
          {/* زر الكل */}
          <button
            type="button"
            onClick={() => onChange('all')}
            className={'btn ' + (active === 'all' ? 'btnPrimary' : '')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>{getIcon('all')}</span>
            <span>الكل</span>
          </button>

          {/* زر عرض على الخريطة */}
          <button
            type="button"
            onClick={() => onChangeView(view === 'map' ? 'list' : 'map')}
            className={'btn ' + (view === 'map' ? 'btnPrimary' : '')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>{getIcon('map')}</span>
            <span>{view === 'map' ? 'عرض كقائمة' : 'عرض على الخريطة'}</span>
          </button>
        </div>
      </div>

      {/* صف الأقسام (سلايدر أفقي) */}
      <div
        className="row"
        style={{
          overflowX: 'auto',
          paddingBottom: 6,
          flexWrap: 'nowrap',
        }}
      >
        {items
          .filter((c) => c.slug !== 'all') // لأن زر الكل صار فوق
          .map((cat) => {
            const isActive = active === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => onChange(cat.slug)}
                className={'btn ' + (isActive ? 'btnPrimary' : '')}
                style={{
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{getIcon(cat.slug)}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
