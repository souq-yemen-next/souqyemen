'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebaseClient';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';

const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

export default function AdminListingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return !!email && ADMIN_EMAILS.includes(email);
  }, [user]);

  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) return;

    setErr('');
    const qy = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(rows);
      },
      (e) => {
        console.error(e);
        setErr('تعذر تحميل الإعلانات. تأكد من قواعد Firestore.');
      }
    );

    return () => unsub();
  }, [loading, user, isAdmin]);

  if (loading || (!loading && !user)) {
    return <div style={{ padding: 24 }}>جاري التحميل…</div>;
  }
  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h2>غير مصرح</h2>
        <Link href="/">العودة</Link>
      </div>
    );
  }

  const toggleHidden = async (id, hidden) => {
    await updateDoc(doc(db, 'listings', id), { hidden: !hidden });
  };

  const toggleActive = async (id, isActive) => {
    await updateDoc(doc(db, 'listings', id), { isActive: !(isActive === true) });
  };

  const remove = async (id) => {
    if (!confirm('هل أنت متأكد من حذف الإعلان؟')) return;
    await deleteDoc(doc(db, 'listings', id));
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>إدارة الإعلانات</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/admin" style={btnGhost}>⬅️ لوحة الإدارة</Link>
          <Link href="/" style={btnGhost}>👀 الرئيسية</Link>
        </div>
      </div>

      {err ? <div style={alert}>{err}</div> : null}

      <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
        {items.map((it) => {
          const title = it.title || 'بدون عنوان';
          const hidden = it.hidden === true;
          const active = it.isActive !== false;

          return (
            <div key={it.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title}
                  </div>
                  <div style={{ color: '#64748b', marginTop: 4, fontSize: 13 }}>
                    id: {it.id} • {it.city || '—'} • {active ? '✅ نشط' : '⛔ غير نشط'} • {hidden ? '🙈 مخفي' : '👁️ ظاهر'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/listing/${it.id}`} style={btnGhost} target="_blank">فتح</Link>
                  <button style={btn} onClick={() => toggleHidden(it.id, hidden)}>
                    {hidden ? 'إظهار' : 'إخفاء'}
                  </button>
                  <button style={btn} onClick={() => toggleActive(it.id, active)}>
                    {active ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button style={btnDanger} onClick={() => remove(it.id)}>
                    حذف
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const card = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,.08)',
  borderRadius: 14,
  padding: 14,
  boxShadow: '0 8px 22px rgba(0,0,0,.04)',
};

const btnGhost = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,.12)',
  background: '#fff',
  color: '#0f172a',
  fontWeight: 800,
  textDecoration: 'none',
};

const btn = {
  ...btnGhost,
  background: '#3b82f6',
  color: '#fff',
  border: '1px solid rgba(0,0,0,.08)',
};

const btnDanger = {
  ...btnGhost,
  background: '#dc2626',
  color: '#fff',
  border: '1px solid rgba(0,0,0,.08)',
};

const alert = {
  marginTop: 12,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(220,38,38,.25)',
  background: 'rgba(220,38,38,.08)',
  color: '#991b1b',
};
