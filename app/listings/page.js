// /app/listings/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebaseClient';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import Header from '@/components/Header';
import Price from '@/components/Price';

function safeText(v) {
  return typeof v === 'string' ? v : '';
}

function formatRelative(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d || Number.isNaN(d.getTime())) return 'قبل قليل';
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins <= 1) return 'الآن';
    if (mins < 60) return `قبل ${mins} دقيقة`;
    if (hrs < 24) return `قبل ${hrs} ساعة`;
    if (days < 7) return `قبل ${days} يوم`;
    if (days < 30) return `قبل ${Math.floor(days / 7)} أسبوع`;
    return d.toLocaleDateString('ar-YE');
  } catch {
    return 'قبل قليل';
  }
}

function ListingRow({ listing }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || null;
  const desc = safeText(listing.description).trim();
  const shortDesc = desc.length > 120 ? `${desc.slice(0, 120)}...` : desc || '—';

  return (
    <Link href={`/listing/${listing.id}`} className="rowLink">
      <div className="rowCard">
        <div className="thumb">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={listing.title || 'صورة الإعلان'} />
          ) : (
            <div className="thumbFallback">🖼️</div>
          )}
        </div>

        <div className="body">
          <div className="top">
            <div className="title">{listing.title || 'بدون عنوان'}</div>
            <div className="price">
              <Price
                priceYER={listing.currentBidYER || listing.priceYER || 0}
                originalPrice={listing.originalPrice}
                originalCurrency={listing.originalCurrency}
                showCurrency={true}
              />
            </div>
          </div>

          <div className="meta">
            <span>📍 {listing.city || listing.locationLabel || 'غير محدد'}</span>
            <span>⏱️ {formatRelative(listing.createdAt)}</span>
            <span>👁️ {Number(listing.views || 0).toLocaleString('ar-YE')}</span>
            {listing.auctionEnabled ? <span className="badge">⚡ مزاد</span> : null}
          </div>

          <div className="desc">{shortDesc}</div>
        </div>
      </div>

      <style jsx>{`
        .rowLink { text-decoration: none; color: inherit; display: block; }
        .rowCard{
          display:flex; gap:12px;
          background:#fff;
          border:1px solid rgba(0,0,0,.08);
          border-radius:14px;
          padding:12px;
          transition:transform .15s ease, box-shadow .15s ease;
        }
        .rowCard:hover{ transform: translateY(-1px); box-shadow: 0 10px 22px rgba(0,0,0,.06); }
        .thumb{ width:120px; height:120px; border-radius:12px; overflow:hidden; background:#f1f5f9; flex-shrink:0; }
        .thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
        .thumbFallback{ width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.8rem; opacity:.6; }
        .body{ flex:1; min-width:0; display:flex; flex-direction:column; gap:8px; }
        .top{ display:flex; gap:12px; justify-content:space-between; align-items:flex-start; }
        .title{ font-weight:900; color:#0f172a; line-height:1.35; }
        .price{ flex-shrink:0; }
        .meta{ display:flex; gap:12px; flex-wrap:wrap; color:#64748b; font-size:.9rem; }
        .badge{
          background: rgba(59,130,246,.12);
          border:1px solid rgba(59,130,246,.18);
          color:#1d4ed8;
          padding:2px 10px;
          border-radius:999px;
          font-weight:800;
        }
        .desc{ color:#475569; font-size:.92rem; line-height:1.6; }
        @media (max-width: 640px){
          .rowCard{ flex-direction:column; }
          .thumb{ width:100%; height:180px; }
          .top{ flex-direction:column; align-items:flex-start; }
        }
      `}</style>
    </Link>
  );
}

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setErr('');

    const qRef = query(
      collection(db, 'listings'),
      orderBy('createdAt', 'desc'),
      limit(300)
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((x) => x.isActive !== false && x.hidden !== true);
        setListings(data);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr('تعذّر تحميل الإعلانات');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((l) => {
      const title = safeText(l.title).toLowerCase();
      const city = safeText(l.city).toLowerCase();
      const desc = safeText(l.description).toLowerCase();
      const loc = safeText(l.locationLabel).toLowerCase();
      return title.includes(q) || city.includes(q) || desc.includes(q) || loc.includes(q);
    });
  }, [listings, search]);

  return (
    <div dir="rtl">
      <Header />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px' }}>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>جميع الإعلانات</h1>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في الإعلانات…"
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,.12)',
                minWidth: 260
              }}
            />
            <Link
              href="/add"
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 800,
                textDecoration: 'none'
              }}
            >
              ➕ أضف إعلان
            </Link>
          </div>
        </div>

        <p style={{ color: '#64748b', marginTop: 8 }}>
          النتائج: <b>{filtered.length}</b>
        </p>

        {loading ? (
          <div style={{ padding: 18, background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.08)' }}>
            جاري التحميل…
          </div>
        ) : err ? (
          <div style={{ padding: 18, background: '#fff', borderRadius: 14, border: '1px solid rgba(220,38,38,.25)', color: '#991b1b' }}>
            {err}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 18, background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.08)' }}>
            لا توجد إعلانات مطابقة.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            {filtered.map((l) => <ListingRow key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
