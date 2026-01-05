'use client';

// app/my-listings/page.js
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { db, firebase } from '@/lib/firebaseClient';

const FILTERS = [
  { key: 'all', label: 'الكل', icon: '📦' },
  { key: 'active', label: 'نشطة', icon: '✅' },
  { key: 'sold', label: 'تم البيع', icon: '💰' },
  { key: 'hidden', label: 'مخفية', icon: '🙈' },
];

export default function MyListingsPage() {
  const { user, loading } = useAuth();

  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  // لتجميد أزرار إعلان واحد وقت التنفيذ
  const [busyMap, setBusyMap] = useState({}); // { [id]: true }
  const setBusy = (id, val) => setBusyMap((p) => ({ ...p, [id]: !!val }));

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setFetching(false);
      return;
    }

    const unsub = db
      .collection('listings')
      .where('userId', '==', user.uid)
      .onSnapshot(
        (snap) => {
          const data = [];
          snap.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

          // ترتيب: الأحدث أولاً (createdAt ثم updatedAt)
          data.sort((a, b) => {
            const ta =
              (a.updatedAt?.toMillis?.() ?? 0) || (a.createdAt?.toMillis?.() ?? 0);
            const tb =
              (b.updatedAt?.toMillis?.() ?? 0) || (b.createdAt?.toMillis?.() ?? 0);
            return tb - ta;
          });

          setItems(data);
          setFetching(false);
          setError('');
        },
        (err) => {
          console.error('my-listings error:', err);
          setError('حدث خطأ أثناء تحميل إعلاناتك، حاول لاحقاً.');
          setFetching(false);
        }
      );

    return () => unsub();
  }, [user, loading]);

  const computed = useMemo(() => {
    const normalize = (s) => String(s || '').toLowerCase();

    const withFlags = items.map((x) => {
      const status = normalize(x.status);
      const isSold = status === 'sold';
      const isHidden = x.hidden === true;
      const isInactive = x.isActive === false;
      const isActive = !isSold && !isHidden && !isInactive;
      return { ...x, _isSold: isSold, _isHidden: isHidden, _isInactive: isInactive, _isActive: isActive };
    });

    const stats = {
      total: withFlags.length,
      active: withFlags.filter((x) => x._isActive).length,
      sold: withFlags.filter((x) => x._isSold).length,
      hidden: withFlags.filter((x) => x._isInactive || x._isHidden).length,
      views: withFlags.reduce((acc, x) => acc + Number(x.views || 0), 0),
    };

    const text = q.trim().toLowerCase();

    let filtered = withFlags;

    if (filter === 'active') filtered = filtered.filter((x) => x._isActive);
    if (filter === 'sold') filtered = filtered.filter((x) => x._isSold);
    if (filter === 'hidden') filtered = filtered.filter((x) => x._isInactive || x._isHidden);

    if (text) {
      filtered = filtered.filter((x) => {
        const hay = [
          x.title,
          x.description,
          x.city,
          x.category,
          x.locationLabel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(text);
      });
    }

    return { stats, list: filtered };
  }, [items, filter, q]);

  const toggleActive = async (item) => {
    if (!user) return;
    setBusy(item.id, true);
    try {
      const next = item.isActive === false ? true : false;
      await db.collection('listings').doc(item.id).update({
        isActive: next,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert('تعذر تغيير حالة الإعلان.');
    } finally {
      setBusy(item.id, false);
    }
  };

  const toggleSold = async (item) => {
    if (!user) return;
    setBusy(item.id, true);
    try {
      const isSold = String(item.status || '').toLowerCase() === 'sold';

      if (isSold) {
        await db.collection('listings').doc(item.id).update({
          status: 'active',
          soldAt: firebase.firestore.FieldValue.delete(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await db.collection('listings').doc(item.id).update({
          status: 'sold',
          soldAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      console.error(e);
      alert('تعذر تحديث حالة البيع.');
    } finally {
      setBusy(item.id, false);
    }
  };

  // ✅ حذف حقيقي لتقليل المساحة في Firestore
  const deleteListing = async (item) => {
    if (!user) return;
    if (!confirm('هل تريد حذف هذا الإعلان نهائياً؟ لا يمكن التراجع.')) return;

    setBusy(item.id, true);
    try {
      await db.collection('listings').doc(item.id).delete();
    } catch (e) {
      console.error(e);
      alert('تعذر حذف الإعلان. تأكد من الصلاحيات أو حاول لاحقاً.');
    } finally {
      setBusy(item.id, false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="wrap">
        <div className="center">
          <div className="spinner" />
          <div className="muted">جاري تحميل إعلاناتك...</div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wrap">
        <div className="panel">
          <div className="iconBig">🔒</div>
          <h1>لا يمكنك عرض إعلاناتك</h1>
          <p>سجل الدخول لعرض إعلاناتك وتعديلها أو حذفها.</p>
          <div className="row">
            <Link className="btn primary" href="/login">تسجيل الدخول</Link>
            <Link className="btn" href="/register">إنشاء حساب</Link>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="wrap">
      {/* Hero */}
      <div className="hero">
        <div className="heroLeft">
          <h1>إعلاناتي</h1>
          <p>إدارة الإعلانات: تعديل، إخفاء، تم البيع، وحذف نهائي.</p>

          <div className="heroActions">
            <Link href="/add" className="btn primary">➕ أضف إعلاناً</Link>
            <Link href="/profile" className="btn">👤 الملف الشخصي</Link>
          </div>
        </div>

        <div className="heroRight">
          <div className="statsGrid">
            <Stat icon="📦" label="الكل" value={computed.stats.total} />
            <Stat icon="✅" label="نشطة" value={computed.stats.active} />
            <Stat icon="💰" label="تم البيع" value={computed.stats.sold} />
            <Stat icon="👁️" label="المشاهدات" value={computed.stats.views} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert">
          <span className="alertIcon">⚠️</span>
          <span>{error}</span>
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              <span className="chipIcon">{f.icon}</span>
              <span>{f.label}</span>
              {f.key === 'all' && <span className="count">{computed.stats.total}</span>}
              {f.key === 'active' && <span className="count">{computed.stats.active}</span>}
              {f.key === 'sold' && <span className="count">{computed.stats.sold}</span>}
              {f.key === 'hidden' && <span className="count">{computed.stats.hidden}</span>}
            </button>
          ))}
        </div>

        <div className="search">
          <span className="sIcon">🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في عناوين/وصف/مدينة/قسم…"
          />
          {q ? (
            <button type="button" className="clear" onClick={() => setQ('')} aria-label="مسح البحث">
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* Empty state */}
      {computed.list.length === 0 ? (
        <div className="empty">
          <div className="iconBig">📭</div>
          <h3>لا توجد نتائج</h3>
          <p>جرّب تغيير الفلتر أو تعديل كلمة البحث.</p>
          <Link href="/add" className="btn primary">➕ أضف إعلاناً الآن</Link>
        </div>
      ) : null}

      {/* Cards */}
      <div className="grid">
        {computed.list.map((item) => {
          const isBusy = !!busyMap[item.id];
          const isSold = String(item.status || '').toLowerCase() === 'sold';
          const isInactive = item.isActive === false;
          const isHidden = item.hidden === true;

          const badge = isSold
            ? { text: 'تم البيع', cls: 'sold' }
            : isHidden
            ? { text: 'محذوف', cls: 'hidden' }
            : isInactive
            ? { text: 'مخفي', cls: 'inactive' }
            : { text: 'نشط', cls: 'active' };

          return (
            <div key={item.id} className="card">
              <div className="cardTop">
                <div className="titleRow">
                  <div className="title">{item.title || 'إعلان بدون عنوان'}</div>
                  <span className={`badge ${badge.cls}`}>{badge.text}</span>
                </div>

                <div className="meta">
                  <span>📌 {item.city || 'بدون مدينة'}</span>
                  <span className="dot">•</span>
                  <span>🏷️ {item.category || 'قسم غير محدد'}</span>
                  <span className="dot">•</span>
                  <span>👁️ {item.views || 0}</span>
                </div>
              </div>

              {item.description ? (
                <div className="desc">
                  {String(item.description).length > 160
                    ? `${String(item.description).slice(0, 160)}...`
                    : String(item.description)}
                </div>
              ) : (
                <div className="desc muted">لا يوجد وصف</div>
              )}

              <div className="priceRow">
                <div className="price">
                  {item.priceYER
                    ? `${Number(item.priceYER).toLocaleString()} ريال يمني`
                    : 'بدون سعر'}
                </div>
                {item.locationLabel ? <div className="loc">📍 {item.locationLabel}</div> : null}
              </div>

              <div className="actions">
                <Link href={`/listing/${item.id}`} className="btnSm">
                  👁️ عرض
                </Link>

                <Link href={`/edit-listing/${item.id}`} className="btnSm ghost">
                  ✏️ تعديل
                </Link>

                <button
                  type="button"
                  className={`btnSm ${isSold ? 'warn' : 'ok'}`}
                  onClick={() => toggleSold(item)}
                  disabled={isBusy}
                >
                  {isBusy ? '...' : isSold ? '↩️ إلغاء البيع' : '✅ تم البيع'}
                </button>

                <button
                  type="button"
                  className="btnSm ghost"
                  onClick={() => toggleActive(item)}
                  disabled={isBusy}
                  title={isInactive ? 'إظهار الإعلان' : 'إخفاء الإعلان'}
                >
                  {isBusy ? '...' : isInactive ? '👁️ إظهار' : '🙈 إخفاء'}
                </button>

                <button
                  type="button"
                  className="btnSm danger"
                  onClick={() => deleteListing(item)}
                  disabled={isBusy}
                  title="حذف نهائي"
                >
                  {isBusy ? '...' : '🗑️ حذف'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat">
      <div className="sTop">
        <div className="sIcon">{icon}</div>
        <div className="sMeta">
          <div className="sLabel">{label}</div>
          <div className="sValue">{value ?? '—'}</div>
        </div>
      </div>
    </div>
  );
}

const styles = `
.wrap{
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 14px 60px;
}
.muted{color:#64748b}
.center{
  min-height: 55vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:12px;
}
.spinner{
  width:42px;height:42px;
  border:3px solid rgba(0,0,0,.10);
  border-top-color: rgba(59,130,246,1);
  border-radius:50%;
  animation: spin 1s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

.hero{
  display:flex;
  gap:16px;
  align-items:stretch;
  justify-content:space-between;
  border-radius:18px;
  border:1px solid rgba(0,0,0,.08);
  padding:18px;
  background: linear-gradient(135deg, rgba(15,52,96,.08), rgba(59,130,246,.08));
}
.heroLeft h1{
  margin:0 0 6px;
  font-size: 1.8rem;
  font-weight: 900;
  color:#0f172a;
}
.heroLeft p{
  margin:0 0 12px;
  color:#475569;
  line-height:1.6;
}
.heroActions{display:flex; gap:10px; flex-wrap:wrap;}
.btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:10px 14px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,.10);
  background:#fff;
  color:#0f172a;
  font-weight:800;
  text-decoration:none;
}
.btn.primary{
  background:#3b82f6;
  color:#fff;
}
.btn:hover{transform: translateY(-1px); box-shadow: 0 10px 22px rgba(0,0,0,.06);}
.btn.primary:hover{box-shadow:0 10px 22px rgba(59,130,246,.25);}

.heroRight{flex:1; display:flex; align-items:center; justify-content:flex-end;}
.statsGrid{
  width: 520px;
  max-width: 100%;
  display:grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap:10px;
}
.stat{
  background:#fff;
  border:1px solid rgba(0,0,0,.08);
  border-radius:16px;
  padding:12px;
  box-shadow: 0 8px 22px rgba(0,0,0,.04);
}
.sTop{display:flex; gap:10px; align-items:center;}
.sIcon{
  width:42px;height:42px;
  border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  background: rgba(59,130,246,.12);
  border:1px solid rgba(59,130,246,.18);
}
.sLabel{font-weight:800; color:#64748b; font-size:.82rem;}
.sValue{font-weight:950; color:#0f172a; font-size:1.25rem; line-height:1.2;}

.alert{
  margin-top:12px;
  padding:12px 14px;
  border-radius:12px;
  border:1px solid rgba(220,38,38,.25);
  background: rgba(220,38,38,.08);
  color:#991b1b;
  display:flex;
  gap:10px;
  align-items:flex-start;
}
.alertIcon{font-size:1.1rem; margin-top:2px;}

.toolbar{
  margin-top:14px;
  display:flex;
  gap:12px;
  align-items:center;
  justify-content:space-between;
  flex-wrap:wrap;
}
.filters{display:flex; gap:10px; flex-wrap:wrap;}
.chip{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:8px 12px;
  border-radius:999px;
  border:1px solid rgba(0,0,0,.10);
  background:#fff;
  color:#0f172a;
  font-weight:800;
  cursor:pointer;
}
.chipIcon{opacity:.9}
.chip .count{
  padding:2px 8px;
  border-radius:999px;
  background: rgba(15,52,96,.08);
  border:1px solid rgba(0,0,0,.06);
  font-size:.8rem;
  font-weight:900;
}
.chip.active{
  background:#3b82f6;
  color:#fff;
  border-color: transparent;
}
.chip.active .count{
  background: rgba(255,255,255,.18);
  border-color: rgba(255,255,255,.20);
}

.search{
  flex: 1;
  min-width: 260px;
  max-width: 520px;
  display:flex;
  align-items:center;
  gap:8px;
  padding:10px 12px;
  border-radius:14px;
  border:1px solid rgba(0,0,0,.10);
  background:#fff;
}
.search input{
  width:100%;
  border:none;
  outline:none;
  background:transparent;
  font-size:.95rem;
}
.search .clear{
  border:none;
  background: rgba(0,0,0,.06);
  width:28px;height:28px;
  border-radius:10px;
  cursor:pointer;
}

.empty{
  margin-top:14px;
  padding:22px;
  border-radius:18px;
  border:1px solid rgba(0,0,0,.08);
  background:#fff;
  text-align:center;
  box-shadow: 0 10px 26px rgba(0,0,0,.05);
}
.iconBig{font-size:2.4rem; margin-bottom:10px;}
.empty h3{margin:0 0 6px; font-weight:950; color:#0f172a;}
.empty p{margin:0 0 14px; color:#64748b;}

.grid{
  margin-top:14px;
  display:grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap:12px;
}
.card{
  background:#fff;
  border:1px solid rgba(0,0,0,.08);
  border-radius:18px;
  padding:14px;
  box-shadow: 0 10px 26px rgba(0,0,0,.05);
  transition: transform .15s ease, box-shadow .15s ease;
}
.card:hover{transform: translateY(-2px); box-shadow: 0 14px 34px rgba(0,0,0,.08);}

.titleRow{display:flex; gap:10px; align-items:flex-start; justify-content:space-between;}
.title{
  font-weight:950;
  color:#0f172a;
  font-size:1.05rem;
  line-height:1.4;
  max-width: 100%;
  word-break: break-word;
}
.badge{
  flex-shrink:0;
  padding:6px 10px;
  border-radius:999px;
  font-weight:900;
  font-size:.78rem;
  border:1px solid rgba(0,0,0,.08);
}
.badge.active{background:#dcfce7;color:#166534;border-color:#bbf7d0;}
.badge.inactive{background:#dbeafe;color:#1e40af;border-color:#bfdbfe;}
.badge.hidden{background:#e5e7eb;color:#374151;border-color:#d1d5db;}
.badge.sold{background:#fef3c7;color:#92400e;border-color:#fde68a;}

.meta{
  margin-top:8px;
  color:#64748b;
  font-weight:700;
  font-size:.85rem;
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center;
}
.dot{opacity:.5}

.desc{
  margin-top:10px;
  color:#334155;
  font-size:.92rem;
  line-height:1.6;
  background: rgba(15,52,96,.04);
  border:1px solid rgba(0,0,0,.06);
  border-radius:14px;
  padding:10px;
  min-height: 64px;
}
.priceRow{
  margin-top:10px;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
  flex-wrap:wrap;
}
.price{
  font-weight:950;
  color:#0f172a;
  font-size:1rem;
}
.loc{
  color:#64748b;
  font-weight:800;
  font-size:.85rem;
}

.actions{
  margin-top:12px;
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.btnSm{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:9px 10px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,.10);
  background:#3b82f6;
  color:#fff;
  font-weight:900;
  cursor:pointer;
  text-decoration:none;
  transition: transform .12s ease, box-shadow .12s ease;
}
.btnSm:hover{transform: translateY(-1px); box-shadow: 0 10px 18px rgba(0,0,0,.06);}
.btnSm.ghost{
  background:#fff;
  color:#0f172a;
}
.btnSm.ok{background:#10b981;border-color:#10b981;}
.btnSm.warn{background:#f59e0b;border-color:#f59e0b;}
.btnSm.danger{background:#dc2626;border-color:#dc2626;}

.panel{
  margin-top:60px;
  background:#fff;
  border:1px solid rgba(0,0,0,.08);
  border-radius:18px;
  padding:22px;
  text-align:center;
  box-shadow: 0 10px 26px rgba(0,0,0,.06);
}
.panel h1{margin:0 0 6px; font-weight:950; color:#0f172a;}
.panel p{margin:0 0 14px; color:#64748b;}
.row{display:flex; gap:10px; justify-content:center; flex-wrap:wrap;}

@media (max-width: 1100px){
  .grid{ grid-template-columns: repeat(2, minmax(0,1fr)); }
  .hero{ flex-direction:column; }
  .heroRight{justify-content:flex-start;}
  .statsGrid{ grid-template-columns: repeat(2, minmax(0,1fr)); width: 100%; }
}
@media (max-width: 560px){
  .grid{ grid-template-columns: 1fr; }
  .search{ min-width: 100%; }
}
`;
