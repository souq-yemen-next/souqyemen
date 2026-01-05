'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

function fmtTime(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d) return '';
    return d.toLocaleString('ar', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatList() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const uid = user?.uid || null;

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setRows([]);
      setErr('');
      return;
    }

    setLoading(true);
    setErr('');

    // ✅ بدون orderBy لتجنب الحاجة لـ index
    const unsub = db
      .collection('chats')
      .where('participants', 'array-contains', uid)
      .limit(50)
      .onSnapshot(
        (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setRows(arr);
          setLoading(false);
        },
        (e) => {
          console.error('ChatList error:', e);
          setErr(e?.message || 'تعذر تحميل المحادثات');
          setLoading(false);
        }
      );

    return () => unsub();
  }, [uid]);

  // ترتيب محلي (اختياري) حسب الوقت لو موجود
  const list = useMemo(() => {
    const arr = Array.isArray(rows) ? [...rows] : [];
    arr.sort((a, b) => {
      const ta = (a.lastMessageAt?.toMillis?.() ?? a.updatedAt?.toMillis?.() ?? 0);
      const tb = (b.lastMessageAt?.toMillis?.() ?? b.updatedAt?.toMillis?.() ?? 0);
      return tb - ta;
    });
    return arr;
  }, [rows]);

  if (!user) {
    return <div className="card">سجل دخول أولاً لعرض محادثاتك.</div>;
  }

  if (loading) {
    return <div className="card muted">جاري تحميل المحادثات…</div>;
  }

  if (err) {
    return (
      <div className="card" style={{ color: '#b91c1c' }}>
        تعذر تحميل المحادثات
        <div className="muted" style={{ marginTop: 6, direction: 'ltr' }}>
          {err}
        </div>
      </div>
    );
  }

  if (!list.length) {
    return <div className="card muted">لا توجد محادثات بعد.</div>;
  }

  return (
    <div className="grid" style={{ gap: 10 }}>
      {list.map((c) => {
        const title = c.listingTitle || 'محادثة';
        const last = c.lastMessageText || '—';
        const t = fmtTime(c.lastMessageAt || c.updatedAt);

        const otherUid =
          Array.isArray(c.participants) ? (c.participants.find((x) => x !== uid) || '') : '';

        const href = `/chat/${encodeURIComponent(c.id)}?listingId=${encodeURIComponent(
          c.listingId || ''
        )}&otherUid=${encodeURIComponent(otherUid)}`;

        return (
          <Link
            key={c.id}
            href={href}
            className="card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ fontWeight: 900 }}>{title}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              {last}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              {t}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
