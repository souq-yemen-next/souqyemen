'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import { db } from '@/lib/firebaseClient';

const FALLBACK_CATEGORIES = [
  { slug: 'cars', name: 'سيارات' },
  { slug: 'real_estate', name: 'عقارات' },
  { slug: 'realestate', name: 'عقارات' }, // دعم قديم لو موجود عندك
  { slug: 'mobiles', name: 'جوالات' },
  { slug: 'jobs', name: 'وظائف' },
  { slug: 'solar', name: 'طاقة شمسية' },
  { slug: 'furniture', name: 'أثاث' },
  { slug: 'animals', name: 'حيوانات وطيور' },
  { slug: 'networks', name: 'نت وشبكات' },
  { slug: 'electronics', name: 'إلكترونيات' },
  { slug: 'services', name: 'خدمات' },
  { slug: 'maintenance', name: 'صيانة' },
  { slug: 'clothes', name: 'ملابس' },
  { slug: 'motorcycles', name: 'دراجات نارية' },
  { slug: 'other', name: 'أخرى / غير مصنف' },
];

function safeText(v) {
  return String(v || '').trim();
}

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = safeText(params?.category);

  const [cats, setCats] = useState(FALLBACK_CATEGORIES);
  const [catsSource, setCatsSource] = useState('fallback'); // fallback | firestore
  const [loadingCats, setLoadingCats] = useState(true);

  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  // تحميل الأقسام من Firestore (إن وُجدت ومسموح قراءتها)
  useEffect(() => {
    let unsub = null;

    try {
      unsub = db.collection('categories').onSnapshot(
        (snap) => {
          const arr = snap.docs
            .map((d) => {
              const data = d.data() || {};
              return {
                slug: d.id,
                name: safeText(data.name),
                active: data.active,
              };
            })
            .filter((c) => c.slug && c.name && c.active !== false);

          if (arr.length) {
            arr.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            setCats(arr);
            setCatsSource('firestore');
          } else {
            setCats(FALLBACK_CATEGORIES);
            setCatsSource('fallback');
          }
          setLoadingCats(false);
        },
        () => {
          setCats(FALLBACK_CATEGORIES);
          setCatsSource('fallback');
          setLoadingCats(false);
        }
      );
    } catch {
      setCats(FALLBACK_CATEGORIES);
      setCatsSource('fallback');
      setLoadingCats(false);
    }

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // اسم القسم للعرض
  const categoryName = useMemo(() => {
    const found = cats.find((c) => c.slug === categorySlug);
    return found?.name || categorySlug || 'قسم';
  }, [cats, categorySlug]);

  // تحميل إعلانات القسم
  useEffect(() => {
    if (!categorySlug) return;

    setFetching(true);
    setError('');

    const unsub = db
      .collection('listings')
      .where('category', '==', categorySlug)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        (snap) => {
          const data = [];
          snap.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

          // فلترة آمنة بدون شروط Firestore معقدة
          const filtered = data.filter((x) => {
            if (x.hidden) return false;
            if (x.isActive === false) return false;
            return true;
          });

          setItems(filtered);
          setFetching(false);
        },
        (err) => {
          console.error('category listings error:', err);
          setError('حدث خطأ أثناء تحميل إعلانات هذا القسم.');
          setFetching(false);
        }
      );

    return () => unsub();
  }, [categorySlug]);

  return (
    <>
      <Header />

      <div className="container" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: 0 }}>قسم: {categoryName}</h1>
              <p className="muted" style={{ margin: '6px 0 0' }}>
                {categorySlug ? `/${categorySlug}` : ''}
              </p>
            </div>

            <Link href="/add" className="btn btnPrimary">
              + أضف إعلاناً
            </Link>
          </div>

          {/* ملاحظة فقط إذا الأقسام fallback (اختياري) */}
          {!loadingCats && catsSource === 'fallback' && (
            <div style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #fde68a',
              background: '#fffbeb',
              color: '#92400e',
              fontSize: 13
            }}>
              ⚠️ الأقسام المعروضة حالياً افتراضية (لم يتم قراءة collection: <b>categories</b> من Firestore).
            </div>
          )}
        </div>

        {(fetching) && (
          <div className="card">
            <p style={{ margin: 0 }}>جاري تحميل الإعلانات...</p>
          </div>
        )}

        {error && (
          <div className="card" style={{ border: '1px solid #fecaca', background: '#fef2f2' }}>
            <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {!fetching && !error && items.length === 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>لا توجد إعلانات في هذا القسم حالياً</h3>
            <p className="muted">جرّب لاحقاً أو أضف أول إعلان في هذا القسم.</p>
            <Link href="/add" className="btn btnPrimary">+ أضف إعلاناً</Link>
          </div>
        )}

        {!fetching && !error && items.length > 0 && (
          <div className="card">
            <div style={{ display: 'grid', gap: 10 }}>
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/listing/${item.id}`}
                  className="card"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>
                        {item.title || 'إعلان بدون عنوان'}
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        📌 {item.city || 'بدون مدينة'} • 👁️ {item.views || 0} مشاهدة
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {item.priceYER ? `${Number(item.priceYER).toLocaleString()} ريال` : 'بدون سعر'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}