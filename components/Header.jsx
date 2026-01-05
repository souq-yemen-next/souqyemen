'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

// إيميلات المدراء
const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

export default function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  // ملاحظة: نخلي mounted منفصلة عشان الأنيميشن
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const closeTimerRef = useRef(null);

  // التحقق إذا كان المستخدم مديراً
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  // (اختياري) إذا ما عندك نظام رسائل غير مقروءة حقيقي خله false
  useEffect(() => {
    if (user) setHasUnreadMessages(false);
  }, [user]);

  // إغلاق القائمة عند تغيير المسار (تنقل بين الصفحات)
  useEffect(() => {
    if (menuMounted) closeMenu(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // قفل سكرول الصفحة عندما تكون القائمة مفتوحة
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // تنظيف التايمر
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // إغلاق بالـ ESC
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const openMenu = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    setMenuMounted(true);
    // نخليها تفتح بعد mount عشان الـ CSS transition يشتغل
    requestAnimationFrame(() => setMenuOpen(true));
  };

  /**
   * @param {boolean} immediate إذا true يقفل مباشرة بدون انتظار أنيميشن
   */
  const closeMenu = (immediate = false) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    if (immediate) {
      setMenuOpen(false);
      setMenuMounted(false);
      return;
    }

    setMenuOpen(false);
    // نفس مدة transition في CSS (0.3s)
    closeTimerRef.current = setTimeout(() => {
      setMenuMounted(false);
    }, 320);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      closeMenu(true);
    } catch (e) {
      console.error('خطأ في تسجيل الخروج:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-inner">
          {/* Mobile */}
          <div className="mobile-nav">
            <button className="menu-btn" onClick={openMenu} aria-label="فتح القائمة">
              <span className="menu-icon">☰</span>
            </button>

            <Link href="/" className="site-title">
              سوق اليمن
            </Link>

            <Link href="/add" className="add-btn-mobile" aria-label="أضف إعلان جديد">
              + إعلان
            </Link>
          </div>

          {/* Desktop */}
          <div className="desktop-nav">
            <Link href="/" className="logo">
              سوق اليمن
            </Link>

            <nav className="nav-links">
              <Link href="/" className="nav-link">
                الرئيسية
              </Link>

              <Link href="/listings" className="nav-link">
                الإعلانات
              </Link>

              {isAdmin && (
                <Link href="/admin" className="nav-link admin-link">
                  لوحة الإدارة
                </Link>
              )}
            </nav>

            <div className="user-actions">
              {loading ? (
                <div className="loading-text">جاري التحميل…</div>
              ) : user ? (
                <>
                  <Link href="/add" className="add-btn-desktop">
                    + أضف إعلان
                  </Link>

                  <div className="user-menu">
                    <span className="user-greeting">
                      أهلاً، {user.name || user.email?.split('@')[0]}
                    </span>

                    <div className="dropdown">
                      <Link href="/my-listings" className="dropdown-item">
                        📋 إعلاناتي
                      </Link>

                      <Link href="/my-chats" className="dropdown-item">
                        💬 محادثاتي
                        {hasUnreadMessages && <span className="unread-dot" />}
                      </Link>

                      <Link href="/profile" className="dropdown-item">
                        👤 الملف الشخصي
                      </Link>

                      <div className="dropdown-divider" />

                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="dropdown-item logout-item"
                      >
                        {isLoggingOut ? 'جاري الخروج…' : '🚪 تسجيل الخروج'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/add" className="add-btn-desktop">
                    + أضف إعلان
                  </Link>

                  <div className="auth-buttons">
                    <Link href="/login" className="login-btn">
                      تسجيل الدخول
                    </Link>
                    <Link href="/register" className="register-btn">
                      إنشاء حساب
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer لأن الهيدر fixed */}
      <div className="header-spacer" />

      {/* ✅ أهم تغيير: ما نرندر القائمة/الخلفية إلا إذا كانت Mounted */}
      {menuMounted && (
        <>
          <div
            className={`side-menu-backdrop ${menuOpen ? 'open' : ''}`}
            onClick={() => closeMenu()}
            aria-hidden="true"
          />

          <aside className={`side-menu ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
            <div className="side-menu-header">
              <div className="side-menu-user">
                {loading ? (
                  <div className="guest-message">
                    <div className="guest-icon">⏳</div>
                    <div className="guest-text">جاري التحميل…</div>
                  </div>
                ) : user ? (
                  <div className="user-info">
                    <div className="user-avatar">👤</div>
                    <div className="user-details">
                      <div className="user-name">{user.name || 'مستخدم'}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                ) : (
                  <div className="guest-message">
                    <div className="guest-icon">👤</div>
                    <div className="guest-text">زائر - لم تقم بتسجيل الدخول</div>
                  </div>
                )}
              </div>

              <button
                className="close-menu-btn"
                onClick={() => closeMenu()}
                aria-label="إغلاق القائمة"
              >
                ✕
              </button>
            </div>

            <nav className="side-menu-nav">
              <div className="menu-section">
                <h3 className="section-title">التنقل الرئيسي</h3>

                <Link href="/" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">🏠</span>
                  <span className="item-text">الرئيسية</span>
                </Link>

                <Link href="/add" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">➕</span>
                  <span className="item-text">أضف إعلاناً</span>
                </Link>

                <Link href="/listings" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">📄</span>
                  <span className="item-text">جميع الإعلانات</span>
                </Link>

                {!loading && user && (
                  <>
                    <Link
                      href="/my-listings"
                      className="menu-item"
                      onClick={() => closeMenu(true)}
                    >
                      <span className="item-icon">📋</span>
                      <span className="item-text">إعلاناتي</span>
                    </Link>

                    <Link href="/my-chats" className="menu-item" onClick={() => closeMenu(true)}>
                      <span className="item-icon">💬</span>
                      <span className="item-text">
                        محادثاتي
                        {hasUnreadMessages && <span className="unread-dot" />}
                      </span>
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="menu-item admin-menu-item"
                    onClick={() => closeMenu(true)}
                  >
                    <span className="item-icon">🛡️</span>
                    <span className="item-text">لوحة الإدارة</span>
                  </Link>
                )}
              </div>

              <div className="menu-section">
                <h3 className="section-title">حسابك</h3>

                {loading ? (
                  <div className="loading-item">
                    <span className="loading-spinner" />
                    <span>جاري التحميل…</span>
                  </div>
                ) : user ? (
                  <>
                    <Link href="/profile" className="menu-item" onClick={() => closeMenu(true)}>
                      <span className="item-icon">👤</span>
                      <span className="item-text">الملف الشخصي</span>
                    </Link>

                    <button
                      className="menu-item logout-menu-item"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                    >
                      <span className="item-icon">{isLoggingOut ? '⏳' : '🚪'}</span>
                      <span className="item-text">
                        {isLoggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="menu-item" onClick={() => closeMenu(true)}>
                      <span className="item-icon">🔑</span>
                      <span className="item-text">تسجيل الدخول</span>
                    </Link>

                    <Link href="/register" className="menu-item" onClick={() => closeMenu(true)}>
                      <span className="item-icon">📝</span>
                      <span className="item-text">إنشاء حساب</span>
                    </Link>
                  </>
                )}
              </div>

              <div className="menu-section">
                <h3 className="section-title">المزيد</h3>

                <Link href="/help" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">❓</span>
                  <span className="item-text">مساعدة ودعم</span>
                </Link>

                <Link href="/privacy" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">🔒</span>
                  <span className="item-text">سياسة الخصوصية</span>
                </Link>

                <Link href="/terms" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">📄</span>
                  <span className="item-text">الشروط والأحكام</span>
                </Link>
              </div>
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
