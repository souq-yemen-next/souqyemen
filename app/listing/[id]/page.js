// app/listing/[id]/page.js - النسخة المحسنة مع زر جوجل مابس
'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Price from '@/components/Price';
import AuctionBox from '@/components/AuctionBox';
import CommentsBox from '@/components/CommentsBox';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { logListingView } from '@/lib/analytics';
import Link from 'next/link';
import './listing.css'; // استيراد CSS

const ListingMap = dynamic(() => import('@/components/Map/ListingMap'), { 
  ssr: false,
  loading: () => (
    <div className="map-placeholder">
      <div className="map-icon">🗺️</div>
      <p>جاري تحميل الخريطة...</p>
    </div>
  )
});

// نفس بريد الأدمن المستخدم في لوحة التحكم
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mansouralbarout@gmail.com').toLowerCase();

// ✅ LocalStorage key لمنع تكرار العداد لنفس الجهاز
const VIEW_KEY = 'sooq_viewed_listing_v1';
const VIEW_TTL_MS = 12 * 60 * 60 * 1000; // 12 ساعة

function makeChatId(uid1, uid2, listingId) {
  const a = String(uid1 || '');
  const b = String(uid2 || '');
  const sorted = [a, b].sort().join('_');
  return `${sorted}__${listingId}`;
}

function readViewCache() {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeViewCache(obj) {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(obj));
  } catch {}
}

// ✅ يزيد المشاهدة مرة واحدة لكل جهاز خلال 12 ساعة
async function bumpViewOnce(listingId) {
  if (!listingId) return;

  const now = Date.now();
  const cache = readViewCache();
  const last = Number(cache[listingId] || 0);

  if (last && now - last < VIEW_TTL_MS) {
    return; // تم احتسابها مؤخرًا
  }

  // خزّن قبل الطلب لتقليل التكرار لو المستخدم عمل Refresh سريع
  cache[listingId] = now;
  writeViewCache(cache);

  // زد views في Firestore
  await db.collection('listings').doc(listingId).update({
    views: firebase.firestore.FieldValue.increment(1),
    lastViewedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function formatDate(date) {
  if (!date) return 'غير معروف';
  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return 'غير معروف';
  }
}

function getInitials(email) {
  if (!email) return '؟';
  const parts = email.split('@')[0];
  return parts.charAt(0).toUpperCase();
}

export default function ListingDetails({ params }) {
  const { id } = params;
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    const unsub = db
      .collection('listings')
      .doc(id)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setListing({ id: doc.id, ...doc.data() });
            setError(null);
          } else {
            setListing(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error('خطأ في جلب الإعلان:', err);
          setError('حدث خطأ في تحميل الإعلان');
          setLoading(false);
        }
      );
    return () => unsub();
  }, [id]);

  // ✅ زيادة المشاهدات
  useEffect(() => {
    if (!id) return;
    bumpViewOnce(id).catch((e) => {
      console.warn('bumpViewOnce failed:', e?.code || e?.message || e);
    });
  }, [id]);

  // تسجيلات تحليلية
  useEffect(() => {
    if (!id) return;
    logListingView(id, user).catch(() => {});
  }, [id, user?.uid]);

  const coords = useMemo(() => {
    if (!listing) return null;
    if (Array.isArray(listing.coords) && listing.coords.length === 2) return listing.coords;
    if (listing?.coords?.lat && listing?.coords?.lng) return [listing.coords.lat, listing.coords.lng];
    return null;
  }, [listing]);

  const categoryIcon = (category) => {
    const icons = {
      'cars': '🚗',
      'real_estate': '🏡',
      'mobiles': '📱',
      'electronics': '💻',
      'motorcycles': '🏍️',
      'heavy_equipment': '🚜',
      'solar': '☀️',
      'networks': '📡',
      'maintenance': '🛠️',
      'furniture': '🛋️',
      'animals': '🐑',
      'jobs': '💼',
      'services': '🧰',
    };
    return icons[category] || '📋';
  };

  if (loading) {
    return (
      <div className="listing-details-page">
        <div className="container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p className="state-message">جاري تحميل تفاصيل الإعلان...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="listing-details-page">
        <div className="container">
          <div className="error-state">
            <div className="state-icon">⚠️</div>
            <h2 className="state-title">حدث خطأ</h2>
            <p className="state-message">{error}</p>
            <button 
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="listing-details-page">
        <div className="container">
          <div className="not-found-state">
            <div className="state-icon">📭</div>
            <h2 className="state-title">الإعلان غير موجود</h2>
            <p className="state-message">قد يكون الإعلان قد تم حذفه أو أنه غير متاح.</p>
            <Link href="/" className="retry-button">
              ← العودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const img = (Array.isArray(listing.images) && listing.images[0]) || listing.image || null;
  const sellerUid = listing.userId;

  const isAdmin = !!user?.email && String(user.email).toLowerCase() === ADMIN_EMAIL;
  const isOwner = !!user?.uid && !!sellerUid && user.uid === sellerUid;

  const chatId = user && sellerUid ? makeChatId(user.uid, sellerUid, listing.id) : null;

  // 🚫 إخفاء الإعلان عن الزوار إذا كان مخفي ولم يكن المشاهد أدمن أو صاحب الإعلان
  if (listing.hidden && !isAdmin && !isOwner) {
    return (
      <div className="listing-details-page">
        <div className="container">
          <div className="hidden-state">
            <div className="state-icon">🔒</div>
            <h2 className="state-title">الإعلان غير متاح</h2>
            <p className="state-message">هذا الإعلان مخفي حالياً ولا يمكن الوصول إليه.</p>
            <Link href="/" className="retry-button">
              ← العودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="listing-details-page">
      <div className="container">
        {/* Header Bar */}
        <div className="header-bar">
          <Link href="/" className="back-button">
            <span>←</span>
            <span>العودة للرئيسية</span>
          </Link>
          <div className="views-badge">
            <span>👁️</span>
            <span>{Number(listing.views || 0).toLocaleString('ar')} مشاهدة</span>
          </div>
        </div>

        {/* Hidden Alert for Admin/Owner */}
        {listing.hidden && (isAdmin || isOwner) && (
          <div className="hidden-alert">
            ⚠️ هذا الإعلان <strong>مخفي</strong> حالياً عن الزوار، ولا يظهر في القوائم العامة.
          </div>
        )}

        <div className="listing-layout">
          {/* Main Content */}
          <div className="main-card">
            {/* Listing Image */}
            {img ? (
              <img
                src={img}
                alt={listing.title || 'صورة الإعلان'}
                className="listing-image"
              />
            ) : (
              <div className="image-placeholder">🖼️</div>
            )}

            <div className="listing-content">
              {/* Listing Header */}
              <div className="listing-header">
                <div className="listing-title-row">
                  <h1 className="listing-title">{listing.title || 'بدون عنوان'}</h1>
                  {listing.auctionEnabled && (
                    <span className="listing-badge">
                      ⚡ مزاد
                    </span>
                  )}
                </div>

                <div className="listing-location">
                  <span>📍</span>
                  <span>{listing.city || listing.locationLabel || 'غير محدد'}</span>
                </div>

                <div className="listing-meta">
                  <span className="meta-item">
                    📅 {formatDate(listing.createdAt)}
                  </span>
                  {listing.category && (
                    <span className="meta-item">
                      {categoryIcon(listing.category)} {listing.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Price Section */}
              <div className="price-section">
                <div className="price-title">السعر:</div>
                <div className="price-amount">
                  <Price priceYER={listing.currentBidYER || listing.priceYER || 0} />
                </div>
              </div>

              {/* Description */}
              <div className="description-section">
                <h2 className="section-title">وصف الإعلان</h2>
                <div className="listing-description">
                  {listing.description || 'لا يوجد وصف للإعلان.'}
                </div>
              </div>

              {/* Contact Section - بأيقونات احترافية */}
              <div className="contact-section">
                <h2 className="section-title">التواصل مع البائع</h2>
                <div className="contact-buttons">
                  {/* زر الاتصال */}
                  {listing.phone && (
                    <a className="contact-button call" href={`tel:${listing.phone}`}>
                      <div className="button-content">
                        <div className="button-icon">📞</div>
                        <div className="button-text">
                          <div className="button-label">اتصال مباشر</div>
                          <div className="button-subtext">اتصل بالبائع الآن</div>
                        </div>
                      </div>
                    </a>
                  )}

                  {/* زر الواتساب */}
                  {listing.phone && listing.isWhatsapp && (
                    <a
                      className="contact-button whatsapp"
                      href={`https://wa.me/${String(listing.phone).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="button-content">
                        <div className="button-icon">💬</div>
                        <div className="button-text">
                          <div className="button-label">مراسلة على واتساب</div>
                          <div className="button-subtext">تواصل فوري</div>
                        </div>
                      </div>
                    </a>
                  )}

                  {/* زر المحادثة */}
                  {chatId ? (
                    <Link
                      className="contact-button chat"
                      href={`/chat/${encodeURIComponent(chatId)}?listingId=${encodeURIComponent(
                        listing.id
                      )}&otherUid=${encodeURIComponent(sellerUid || '')}`}
                    >
                      <div className="button-content">
                        <div className="button-icon">💭</div>
                        <div className="button-text">
                          <div className="button-label">بدء محادثة</div>
                          <div className="button-subtext">مراسلة خاصة داخل الموقع</div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="contact-button login">
                      <div className="button-content">
                        <div className="button-icon">🔒</div>
                        <div className="button-text">
                          <div className="button-label">تسجيل الدخول مطلوب</div>
                          <div className="button-subtext">سجل دخول لبدء المحادثة</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="comments-section">
                <CommentsBox listingId={listing.id} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            {/* Seller Info */}
            <div className="sidebar-card">
              <div className="seller-info">
                <div className="seller-header">
                  <div className="seller-avatar">
                    {getInitials(listing.userEmail)}
                  </div>
                  <div className="seller-details">
                    <h3 className="seller-name">
                      {listing.userEmail?.split('@')[0] || 'مستخدم'}
                    </h3>
                    <p className="seller-email">
                      {listing.userEmail || 'بريد غير معروف'}
                    </p>
                  </div>
                </div>

                <div className="user-badges">
                  {isOwner && (
                    <div className="user-badge owner">
                      <span>👤</span>
                      <span>أنت صاحب هذا الإعلان</span>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="user-badge admin">
                      <span>⚡</span>
                      <span>أنت مسؤول النظام</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Auction Box */}
            <div className="sidebar-card">
              <h3 className="section-title">المزاد</h3>
              <AuctionBox listingId={listing.id} listing={listing} />
            </div>

            {/* Map */}
            <div className="sidebar-card">
              <div className="map-section">
                <h3 className="section-title">الموقع</h3>
                {coords ? (
                  <>
                    <div className="map-container">
                      <ListingMap coords={coords} label={listing.locationLabel || listing.city || ''} />
                    </div>
                    
                    {/* أزرار خرائط جوجل */}
                    <div className="google-maps-buttons">
                      <a 
                        href={`https://www.google.com/maps?q=${coords[0]},${coords[1]}&z=15&hl=ar`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="google-maps-button"
                      >
                        <span className="google-maps-icon">🗺️</span>
                        <span className="google-maps-text">فتح في خرائط جوجل</span>
                      </a>
                      
                      <a 
                        href={`https://www.google.com/maps/@${coords[0]},${coords[1]},15z?hl=ar&entry=ttu`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="google-maps-button satellite"
                      >
                        <span className="google-maps-icon">🛰️</span>
                        <span className="google-maps-text">قمر صناعي</span>
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="map-placeholder">
                    <div className="map-icon">📍</div>
                    <p>لا يوجد موقع متاح</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* أضف هذه الأنماط إذا لم يكن لديك ملف listing.css */}
      <style jsx>{`
        .google-maps-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        
        .google-maps-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          background: #4285f4;
          color: white;
          padding: 0.875rem 1rem;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.3s ease;
          text-align: center;
          border: 2px solid transparent;
        }
        
        .google-maps-button:hover {
          background: #3367d6;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(66, 133, 244, 0.3);
          text-decoration: none;
          color: white;
        }
        
        .google-maps-button.satellite {
          background: #10b981;
        }
        
        .google-maps-button.satellite:hover {
          background: #059669;
          box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3);
        }
        
        .google-maps-icon {
          font-size: 1.25rem;
        }
        
        @media (max-width: 768px) {
          .google-maps-buttons {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
