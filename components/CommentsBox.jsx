'use client';

import { useEffect, useState } from 'react';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

function makeUserLabel(user) {
  if (!user) return 'مستخدم';
  const name = (user.displayName || '').trim();
  if (name) return name;

  const uid = String(user.uid || '');
  const tail = uid.slice(-4).toUpperCase();
  return `مستخدم ${tail || ''}`.trim();
}

export default function CommentsBox({ listingId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!listingId) return;

    const unsub = db
      .collection('listings')
      .doc(listingId)
      .collection('comments')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot((snap) => {
        const arr = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setComments(arr);
      });

    return () => unsub();
  }, [listingId]);

  const send = async () => {
    if (!user) {
      alert('سجّل دخولك للتعليق');
      return;
    }
    if (!text.trim()) return;

    setLoading(true);
    try {
      await db
        .collection('listings')
        .doc(listingId)
        .collection('comments')
        .add({
          text: text.trim(),
          ownerId: user.uid,                 // ✅ مطابق للـ Rules
          userLabel: makeUserLabel(user),    // ✅ بدون بريد
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      setText('');
    } catch (e) {
      console.error('COMMENT_ERROR', e);
      alert((e?.code || 'error') + ' - ' + (e?.message || 'فشل إضافة التعليق'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ fontWeight: 800, marginBottom: 10 }}>💬 التعليقات</div>

      {user ? (
        <div style={{ marginBottom: 12 }}>
          <textarea
            className="input"
            rows={3}
            placeholder="اكتب تعليقك..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="btn btnPrimary"
            style={{ marginTop: 6 }}
            onClick={send}
            disabled={loading}
          >
            {loading ? 'جاري الإرسال...' : 'إرسال'}
          </button>
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
          سجّل دخولك لإضافة تعليق
        </div>
      )}

      {comments.length === 0 && (
        <div className="muted" style={{ fontSize: 13 }}>
          لا توجد تعليقات بعد
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {comments.map((c) => (
          <div
            key={c.id}
            style={{
              background: '#f8fafc',
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {c.userLabel || 'مستخدم'}
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              {c.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
