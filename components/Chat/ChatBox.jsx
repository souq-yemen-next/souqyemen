// components/Chat/ChatBox.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

function safeName(user) {
  // بدون إظهار الإيميل (خصوصية)
  if (user?.displayName) return user.displayName;
  if (user?.email) return user.email.split('@')[0]; // اسم قبل @
  return 'مستخدم';
}

export default function ChatBox({ chatId, listingId, otherUid }) {
  const { user } = useAuth();
  const uid = user?.uid || null;

  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const chatRef = useMemo(() => {
    if (!chatId) return null;
    return db.collection('chats').doc(String(chatId));
  }, [chatId]);

  const messagesRef = useMemo(() => {
    if (!chatRef) return null;
    return chatRef.collection('messages');
  }, [chatRef]);

  // ✅ 1) إنشاء/تحديث وثيقة المحادثة (ضروري لصفحة محادثاتي + معرفة مين أرسل)
  useEffect(() => {
    if (!uid || !chatRef) return;

    (async () => {
      try {
        const snap = await chatRef.get();

        const participants = [uid, otherUid].filter(Boolean);

        if (!snap.exists) {
          await chatRef.set(
            {
              participants,
              listingId: listingId || null,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              lastMessageText: '',
              lastMessageBy: null,

              // أسماء للعرض بدون بريد
              participantNames: {
                [uid]: safeName(user),
              },

              // عداد غير المقروء
              unread: {
                [uid]: 0,
              },
            },
            { merge: true }
          );
        } else {
          // فتح المحادثة = تصفير غير المقروء لك
          await chatRef.set(
            {
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              participantNames: { [uid]: safeName(user) },
              unread: { [uid]: 0 },
            },
            { merge: true }
          );
        }
      } catch (e) {
        console.error('ensure chat failed', e);
      }
    })();
  }, [uid, chatRef, otherUid, listingId, user]);

  // ✅ 2) الاستماع للرسائل
  useEffect(() => {
    if (!messagesRef) return;

    const unsub = messagesRef
      .orderBy('createdAt', 'asc')
      .limit(200)
      .onSnapshot(
        (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setMsgs(arr);
          setLoading(false);
        },
        (e) => {
          console.error('listen messages failed', e);
          setLoading(false);
        }
      );

    return () => unsub();
  }, [messagesRef]);

  const send = async () => {
    if (!uid) {
      alert('سجّل دخولك لإرسال رسالة');
      return;
    }
    const t = text.trim();
    if (!t) return;

    setText('');

    try {
      // 1) إضافة الرسالة
      await messagesRef.add({
        text: t,
        from: uid,
        fromName: safeName(user),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // 2) تحديث الشات: آخر رسالة + غير المقروء للطرف الآخر
      const other = otherUid || null;

      await chatRef.set(
        {
          listingId: listingId || null,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessageText: t,
          lastMessageBy: uid,

          participantNames: {
            [uid]: safeName(user),
          },

          // unread للطرف الآخر + تصفير لنفسي
          unread: {
            ...(other
              ? { [other]: firebase.firestore.FieldValue.increment(1) }
              : {}),
            [uid]: 0,
          },
        },
        { merge: true }
      );
    } catch (e) {
      console.error('send failed', e);
      alert('فشل إرسال الرسالة');
    }
  };

  if (!user) {
    return <div className="card">سجّل دخولك لبدء المحادثة.</div>;
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 900, marginBottom: 10 }}>💬 المحادثة</div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 10,
          height: 420,
          overflowY: 'auto',
          background: '#fff',
        }}
      >
        {loading ? (
          <div className="muted">جاري تحميل الرسائل...</div>
        ) : msgs.length === 0 ? (
          <div className="muted">ابدأ أول رسالة 👇</div>
        ) : (
          msgs.map((m) => {
            const mine = String(m.from) === String(uid);
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: mine ? 'flex-start' : 'flex-end',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '8px 10px',
                    borderRadius: 12,
                    background: mine ? '#eef2ff' : '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 2,
                      opacity: 0.8,
                    }}
                  >
                    {mine ? 'أنت' : m.fromName || 'مستخدم'}
                  </div>
                  <div style={{ fontSize: 14 }}>{m.text}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب رسالة..."
        />
        <button className="btn btnPrimary" onClick={send}>
          إرسال
        </button>
      </div>
    </div>
  );
}
