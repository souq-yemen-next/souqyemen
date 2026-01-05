'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebaseClient';
import { collection, limit, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore';

const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

export default function AdminUsersPage() {
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
    // إن لم يكن عندك createdAt في users، احذف orderBy وخليها query(collection...)
    const qy = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(rows);
      },
      (e) => {
        console.error(e);
        setErr('تعذر تحميل المستخدمين. إذا users ما فيها createdAt احذف orderBy.');
      }
    );

    return () => unsub();
  }, [loading, user, isAdmin]);

  if (loading || (!loading && !user)) return <div style={{ padding: 24 }}>جاري التحميل…</div>;
  if (!isAdmin) return <div style={{ padding: 24 }}><h2>غير مصرح</h2></div>;

  const toggleBlock = async (id, blocked) => {
    await updateDoc(doc(db, 'users', id), { blocked: !blocked });
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>إدارة المستخدمين</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/admin" style={btnGhost}>⬅️ لوحة الإدارة</Link>
        </div>
      </div>

      {err ? <div style={alert}>{err}</div> : null}

      <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
        {items.map((it) => {
          const email = it.email || '—';
          const name = it.name || it.displayName || 'مستخدم';
          const blocked = it.blocked === true;

          return (
            <div key={it.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{name}</div>
                  <div style={{ color: '#64748b', marginTop: 4, fontSize: 13 }}>
                    {email} • uid: {it.id} • {blocked ? '🚫 محظور' : '✅ نشط'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button style={blocked ? btn : btnDanger} onClick={() => toggleBlock(it.id, blocked)}>
                    {blocked ? 'فك الحظر' : 'حظر'}
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
