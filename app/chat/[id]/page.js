// 📁 /app/chat/[id]/page.jsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import ChatBox from '@/components/Chat/ChatBox';

// مكون للحماية من التسرب السريع (Quick Navigation)
function ChatPageContent({ chatId, listingId, otherUid }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [chatData, setChatData] = useState(null);
  const [listing, setListing] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);

  // ✅ جلب بيانات المحادثة والإعلان
  useEffect(() => {
    if (!chatId || authLoading) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);

        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (!chatDoc.exists()) {
          setError('المحادثة غير موجودة أو تم حذفها');
          setLoading(false);
          return;
        }

        const chatDataLocal = { id: chatDoc.id, ...chatDoc.data() };
        setChatData(chatDataLocal);

        if (!chatDataLocal.participants?.includes(user?.uid)) {
          setError('ليس لديك صلاحية الوصول إلى هذه المحادثة');
          setLoading(false);
          return;
        }

        // ✅ جلب الإعلان
        if (listingId) {
          const listingRef = doc(db, 'listings', listingId);
          const listingDoc = await getDoc(listingRef);
          if (listingDoc.exists()) setListing({ id: listingDoc.id, ...listingDoc.data() });
        }

        // ✅ الطرف الآخر
        const otherUserId =
          otherUid || chatDataLocal.participants?.find((id) => id !== user?.uid);

        if (otherUserId) {
          const userRef = doc(db, 'users', otherUserId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) setOtherUser({ id: userDoc.id, ...userDoc.data() });
        }
      } catch (err) {
        console.error('خطأ في جلب بيانات المحادثة:', err);
        setError('حدث خطأ في تحميل المحادثة');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [chatId, listingId, otherUid, user?.uid, authLoading]);

  // ✅ الاستماع للتحديثات
  useEffect(() => {
    if (!chatId || !user?.uid) return;

    const chatRef = doc(db, 'chats', chatId);

    const unsubscribe = onSnapshot(
      chatRef,
      (docSnap) => {
        if (!docSnap.exists()) return;
        const updatedChat = { id: docSnap.id, ...docSnap.data() };
        setChatData(updatedChat);

        if (updatedChat.blockedBy) {
          setIsBlocked(updatedChat.blockedBy.includes(user.uid));
        } else {
          setIsBlocked(false);
        }
      },
      (err) => console.error('خطأ في تحديث المحادثة:', err)
    );

    return () => unsubscribe();
  }, [chatId, user?.uid]);

  // ✅ تعليم كمقروء
  useEffect(() => {
    if (!chatId || !user?.uid || !chatData) return;

    const markAsRead = async () => {
      try {
        if (chatData.lastMessageBy && chatData.lastMessageBy !== user.uid) {
          const chatRef = doc(db, 'chats', chatId);
          await updateDoc(chatRef, { [`unread.${user.uid}`]: 0 });
        }
      } catch (err) {
        console.error('خطأ في تحديث حالة القراءة:', err);
      }
    };

    markAsRead();
  }, [chatId, user?.uid, chatData?.lastMessageBy]);

  const handleToggleBlock = async () => {
    if (!chatId || !user?.uid || !chatData) return;

    try {
      const chatRef = doc(db, 'chats', chatId);
      const currentlyBlocked = chatData.blockedBy?.includes(user.uid);

      if (currentlyBlocked) {
        await updateDoc(chatRef, { blockedBy: arrayRemove(user.uid) });
        setIsBlocked(false);
      } else {
        await updateDoc(chatRef, { blockedBy: arrayUnion(user.uid) });
        setIsBlocked(true);
      }
    } catch (err) {
      console.error('خطأ في تعديل حالة الحجب:', err);
      alert('حدث خطأ في تعديل حالة الحجب');
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المحادثة؟')) return;
    router.push('/my-chats');
  };

  if (authLoading || loading) {
    return (
      <div className="chat-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">جاري تحميل المحادثة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2 className="error-title">حدث خطأ</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={() => router.push('/my-chats')}>
              العودة للمحادثات
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="chat-page">
        <div className="blocked-container">
          <div className="blocked-icon">🚫</div>
          <h2 className="blocked-title">المحادثة محجوبة</h2>
          <p className="blocked-message">لقد حجبت هذه المحادثة.</p>
          <button className="btn btn-primary" onClick={handleToggleBlock}>
            إلغاء الحجب
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <header className="chat-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => router.push('/my-chats')} aria-label="العودة">
              ←
            </button>

            {otherUser && (
              <div className="user-info">
                <div className="user-avatar">
                  {otherUser.photoURL ? (
                    <img src={otherUser.photoURL} alt={otherUser.displayName || 'مستخدم'} />
                  ) : (
                    <span className="avatar-placeholder">
                      {otherUser.displayName?.charAt(0) || otherUser.email?.charAt(0) || '?'}
                    </span>
                  )}
                </div>

                <div className="user-details">
                  <h1 className="user-name">
                    {otherUser.displayName || otherUser.email || 'مستخدم'}
                  </h1>
                  <span className="user-status">{chatData?.lastSeen ? 'نشط الآن' : 'غير متصل'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="header-right">
            {listing && (
              <a
                href={`/listing/${listing.id}`}
                className="listing-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="link-icon">📄</span>
                <span className="link-text">عرض الإعلان</span>
              </a>
            )}

            <div className="chat-actions">
              <button className="action-btn" onClick={handleToggleBlock} title="حجب/إلغاء الحجب">
                {isBlocked ? '🔓' : '🚫'}
              </button>
              <button className="action-btn" onClick={handleDeleteChat} title="حذف">
                🗑️
              </button>
              <button className="action-btn" onClick={() => window.print()} title="طباعة">
                🖨️
              </button>
            </div>
          </div>
        </header>

        {listing && (
          <div className="listing-preview">
            <div className="listing-image">
              {listing.images?.[0] ? (
                <img src={listing.images[0]} alt={listing.title} />
              ) : (
                <div className="image-placeholder">🖼️</div>
              )}
            </div>

            <div className="listing-info">
              <h3 className="listing-title">{listing.title}</h3>
              <p className="listing-price">
                {new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER' }).format(
                  listing.priceYER || 0
                )}
              </p>
              <p className="listing-location">📍 {listing.city || 'غير محدد'}</p>
            </div>
          </div>
        )}

        <div className="chat-area">
          <Suspense fallback={<div className="loading-messages">جاري تحميل الرسائل...</div>}>
            <ChatBox chatId={chatId} listingId={listingId} otherUid={otherUser?.id} isBlocked={isBlocked} />
          </Suspense>
        </div>

        <footer className="chat-footer">
          <div className="footer-info">
            <span className="info-item">
              <span className="info-icon">🔒</span>
              <span className="info-text">المحادثة مشفرة</span>
            </span>
            <span className="info-item">
              <span className="info-icon">💾</span>
              <span className="info-text">يتم حفظ الرسائل تلقائياً</span>
            </span>
          </div>

          <button className="report-btn" onClick={() => alert('سيتم فتح نموذج الإبلاغ قريباً')}>
            ⚠️ الإبلاغ عن محتوى غير لائق
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function ChatPage({ params, searchParams }) {
  const chatId = decodeURIComponent(params?.id || '');
  const listingId = searchParams?.listingId ? String(searchParams.listingId) : null;
  const otherUid = searchParams?.otherUid ? String(searchParams.otherUid) : null;

  return (
    <Suspense
      fallback={
        <div className="chat-page">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>جاري تحميل المحادثة...</p>
          </div>
        </div>
      }
    >
      <ChatPageContent chatId={chatId} listingId={listingId} otherUid={otherUid} />
    </Suspense>
  );
}
