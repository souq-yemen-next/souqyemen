'use client';

import { useAuth } from '@/lib/useAuth';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

function formatJoinedDate(user, userDocData) {
  // الأفضل: createdAt من users/{uid} لو موجود
  const ts = userDocData?.createdAt;
  const d1 = ts?.toDate ? ts.toDate() : null;

  // بديل: من Firebase Auth
  const creation = user?.metadata?.creationTime ? new Date(user.metadata.creationTime) : null;

  const d = d1 || creation;
  if (!d || Number.isNaN(d.getTime())) return 'غير معروف';

  return d.toLocaleDateString('ar-YE', { year: 'numeric', month: 'long' });
}

export default function ProfilePage() {
  const { user, loading } = useAuth();

  const [activeTab, setActiveTab] = useState('info');
  const [editMode, setEditMode] = useState(false);

  const [busySave, setBusySave] = useState(false);
  const [busyStats, setBusyStats] = useState(false);
  const [err, setErr] = useState('');

  const [userDocData, setUserDocData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: 'صنعاء',
    bio: '',
  });

  const [stats, setStats] = useState({
    listings: null,
    sold: null,
    active: null,
    rating: null,
    joinedDate: null,
  });

  // تحميل بيانات المستخدم من Firestore (users/{uid})
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const loadUserDoc = async () => {
      setErr('');
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);

        if (!mounted) return;

        if (snap.exists()) {
          const data = snap.data();
          setUserDocData(data);

          setFormData({
            name: data?.name || user?.name || '',
            email: user?.email || data?.email || '',
            phone: data?.phone || '',
            city: data?.city || 'صنعاء',
            bio: data?.bio || '',
          });

          setStats((s) => ({
            ...s,
            rating: typeof data?.ratingAvg === 'number' ? data.ratingAvg : null,
            joinedDate: formatJoinedDate(user, data),
          }));
        } else {
          // إنشاء وثيقة مستخدم لأول مرة
          const initial = {
            email: user?.email || '',
            name: user?.name || '',
            phone: '',
            city: 'صنعاء',
            bio: '',
            ratingAvg: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await setDoc(ref, initial, { merge: true });

          if (!mounted) return;

          setUserDocData(initial);
          setFormData({
            name: initial.name || user?.email?.split('@')?.[0] || '',
            email: user?.email || '',
            phone: '',
            city: 'صنعاء',
            bio: '',
          });

          setStats((s) => ({
            ...s,
            rating: null,
            joinedDate: formatJoinedDate(user, initial),
          }));
        }
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr('تعذر تحميل بيانات المستخدم.');
      }
    };

    loadUserDoc();
    return () => {
      mounted = false;
    };
  }, [user]);

  // تحميل الإحصائيات الحقيقية من Firestore
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const loadStats = async () => {
      setBusyStats(true);
      setErr('');

      try {
        const uid = user.uid;

        const qAll = query(collection(db, 'listings'), where('userId', '==', uid));
        const qActive = query(
          collection(db, 'listings'),
          where('userId', '==', uid),
          where('isActive', '==', true)
        );

        // "تم البيع": ندعم طريقتين حسب مشروعك:
        // 1) status == 'sold'
        // 2) isSold == true
        // إذا ما عندك أي واحد، سيظهر 0 (أو —)
        let soldCount = 0;

        const allCountPromise = getCountFromServer(qAll);
        const activeCountPromise = getCountFromServer(qActive);

        // نجرب status أولاً
        let soldPromise1 = null;
        try {
          const qSoldStatus = query(
            collection(db, 'listings'),
            where('userId', '==', uid),
            where('status', '==', 'sold')
          );
          soldPromise1 = getCountFromServer(qSoldStatus);
        } catch {
          soldPromise1 = null;
        }

        // نجرب isSold
        let soldPromise2 = null;
        try {
          const qSoldFlag = query(
            collection(db, 'listings'),
            where('userId', '==', uid),
            where('isSold', '==', true)
          );
          soldPromise2 = getCountFromServer(qSoldFlag);
        } catch {
          soldPromise2 = null;
        }

        const [allCountRes, activeCountRes, soldRes1, soldRes2] = await Promise.all([
          allCountPromise,
          activeCountPromise,
          soldPromise1,
          soldPromise2,
        ]);

        const sold1 = soldRes1?.data?.().count ?? 0;
        const sold2 = soldRes2?.data?.().count ?? 0;

        // لو عندك الطريقتين معاً، نخليها أكبر واحد (بدون مضاعفة)
        soldCount = Math.max(sold1, sold2);

        if (!mounted) return;

        setStats((s) => ({
          ...s,
          listings: allCountRes.data().count,
          active: activeCountRes.data().count,
          sold: soldCount,
        }));
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr('تعذر تحميل الإحصائيات (تأكد من حقول الإعلانات/الصلاحيات).');
      } finally {
        if (mounted) setBusyStats(false);
      }
    };

    loadStats();
    return () => {
      mounted = false;
    };
  }, [user]);

  const joinedDate = useMemo(() => {
    if (!user) return '';
    return stats.joinedDate || formatJoinedDate(user, userDocData);
  }, [stats.joinedDate, user, userDocData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setBusySave(true);
    setErr('');

    try {
      const ref = doc(db, 'users', user.uid);

      await setDoc(
        ref,
        {
          name: formData.name || '',
          phone: formData.phone || '',
          city: formData.city || 'صنعاء',
          bio: formData.bio || '',
          email: user.email || formData.email || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setEditMode(false);
    } catch (e) {
      console.error(e);
      setErr('تعذر حفظ البيانات. حاول مرة أخرى.');
    } finally {
      setBusySave(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner" />
        <p>جاري تحميل بيانات الملف الشخصي...</p>

        <style jsx>{`
          .profile-loading{
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            min-height:60vh;gap:18px;color:#64748b;
          }
          .loading-spinner{
            width:50px;height:50px;border:4px solid #f1f5f9;border-top-color:#4f46e5;border-radius:50%;
            animation:spin 1s linear infinite;
          }
          @keyframes spin{to{transform:rotate(360deg)}}
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-not-signed-in">
        <div className="not-signed-in-content">
          <div className="lock-icon">🔒</div>
          <h2>لم تقم بتسجيل الدخول</h2>
          <p>يجب عليك تسجيل الدخول لعرض الملف الشخصي</p>
          <div className="auth-buttons">
            <Link href="/login" className="login-btn">تسجيل الدخول</Link>
            <Link href="/register" className="register-btn">إنشاء حساب جديد</Link>
          </div>
        </div>

        <style jsx>{`
          .profile-not-signed-in{display:flex;align-items:center;justify-content:center;min-height:70vh;padding:20px;text-align:center;}
          .not-signed-in-content{max-width:420px;background:#fff;padding:38px;border-radius:18px;box-shadow:0 10px 28px rgba(0,0,0,.08);}
          .lock-icon{font-size:56px;margin-bottom:14px;opacity:.75}
          h2{margin:0 0 8px;color:#1e293b}
          p{margin:0 0 18px;color:#64748b}
          .auth-buttons{display:flex;flex-direction:column;gap:10px}
          .login-btn,.register-btn{padding:12px;border-radius:10px;text-decoration:none;font-weight:800}
          .login-btn{background:#f8fafc;color:#4f46e5;border:2px solid #e2e8f0}
          .register-btn{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff}
        `}</style>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-banner">
          <div className="banner-overlay">
            <h1>الملف الشخصي</h1>
            <p>إدارة معلوماتك وتفضيلاتك</p>
          </div>
        </div>

        <div className="profile-main-info">
          <div className="avatar-section">
            <div className="profile-avatar">
              {formData.name?.charAt(0) || user.email?.charAt(0) || '👤'}
            </div>

            {/* أزرار الصور (قريباً) */}
            <div className="avatar-actions">
              <button className="remove-avatar-btn" type="button" disabled>
                تغيير الصورة (قريباً)
              </button>
            </div>
          </div>

          <div className="profile-info">
            <div className="profile-name-section">
              {editMode ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="edit-name-input"
                  placeholder="الاسم الكامل"
                />
              ) : (
                <h2>{formData.name || user.email?.split('@')?.[0]}</h2>
              )}

              <div className="profile-badges">
                <span className="badge verified">✓ حساب</span>
                <span className="badge member">عضو منذ {joinedDate}</span>
                {busyStats ? <span className="badge member">⏳ تحديث الإحصائيات…</span> : null}
              </div>
            </div>

            <div className="profile-actions">
              {editMode ? (
                <>
                  <button onClick={handleSave} className="save-btn" type="button" disabled={busySave}>
                    {busySave ? '⏳ جاري الحفظ…' : '💾 حفظ التغييرات'}
                  </button>
                  <button onClick={() => setEditMode(false)} className="cancel-btn" type="button" disabled={busySave}>
                    ❌ إلغاء
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditMode(true)} className="edit-btn" type="button">
                    ✏️ تعديل الملف الشخصي
                  </button>
                  <Link href="/my-listings" className="my-listings-btn">📋 إعلاناتي</Link>
                  <Link href="/my-chats" className="my-chats-btn">💬 محادثاتي</Link>
                </>
              )}
            </div>

            {err ? <div className="err">{err}</div> : null}
          </div>
        </div>
      </div>

      {/* إحصائيات حقيقية */}
      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-number">{stats.listings ?? '—'}</span>
            <span className="stat-label">إعلاناتي</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-number">{stats.sold ?? 0}</span>
            <span className="stat-label">تم البيع</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-info">
            <span className="stat-number">{stats.active ?? '—'}</span>
            <span className="stat-label">نشطة حالياً</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <span className="stat-number">
              {typeof stats.rating === 'number' ? stats.rating.toFixed(1) : '—'}
            </span>
            <span className="stat-label">التقييم</span>
          </div>
        </div>
      </div>

      {/* تبويبات (نفس تصميمك، تركتها كما هي تقريباً) */}
      <div className="profile-tabs">
        <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')} type="button">
          ℹ️ المعلومات الشخصية
        </button>
        <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} type="button">
          ⚙️ الإعدادات
        </button>
        <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')} type="button">
          🔒 الأمان
        </button>
        <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')} type="button">
          📊 النشاطات
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'info' && (
          <div className="info-tab">
            <h3>المعلومات الشخصية</h3>
            <div className="info-grid">
              <div className="info-field">
                <label>الاسم الكامل</label>
                {editMode ? (
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="أدخل اسمك الكامل" />
                ) : (
                  <p>{formData.name || 'لم يتم إضافة اسم'}</p>
                )}
              </div>

              <div className="info-field">
                <label>البريد الإلكتروني</label>
                <p>{user.email}</p>
                <span className="email-note">(لا يمكن تغيير البريد الإلكتروني)</span>
              </div>

              <div className="info-field">
                <label>رقم الجوال</label>
                {editMode ? (
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="أدخل رقم جوالك" />
                ) : (
                  <p>{formData.phone || 'لم يتم إضافة رقم جوال'}</p>
                )}
              </div>

              <div className="info-field">
                <label>المدينة</label>
                {editMode ? (
                  <select name="city" value={formData.city} onChange={handleInputChange}>
                    <option value="صنعاء">صنعاء</option>
                    <option value="عدن">عدن</option>
                    <option value="تعز">تعز</option>
                    <option value="حضرموت">حضرموت</option>
                    <option value="المكلا">المكلا</option>
                    <option value="إب">إب</option>
                    <option value="ذمار">ذمار</option>
                    <option value="الحديدة">الحديدة</option>
                  </select>
                ) : (
                  <p>{formData.city}</p>
                )}
              </div>

              <div className="info-field full-width">
                <label>نبذة عني</label>
                {editMode ? (
                  <textarea name="bio" value={formData.bio} onChange={handleInputChange} placeholder="أخبرنا عن نفسك..." rows="4" />
                ) : (
                  <p>{formData.bio || 'لم يتم إضافة نبذة'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* تركت تبويباتك كما هي (تقدر لاحقاً نربطها بميزات حقيقية) */}
        {activeTab === 'settings' && <div className="settings-tab"><h3>إعدادات الحساب</h3><p className="muted">قريباً…</p></div>}
        {activeTab === 'security' && <div className="security-tab"><h3>أمان الحساب</h3><p className="muted">قريباً…</p></div>}
        {activeTab === 'activity' && <div className="activity-tab"><h3>نشاطاتك الأخيرة</h3><p className="muted">قريباً…</p></div>}
      </div>

      <div className="quick-links">
        <h3>روابط سريعة</h3>
        <div className="links-grid">
          <Link href="/add" className="quick-link"><span className="link-icon">➕</span><span className="link-text">إضافة إعلان جديد</span></Link>
          <Link href="/favorites" className="quick-link"><span className="link-icon">❤️</span><span className="link-text">المفضلة</span></Link>
          <Link href="/help" className="quick-link"><span className="link-icon">❓</span><span className="link-text">مساعدة ودعم</span></Link>
          <Link href="/privacy" className="quick-link"><span className="link-icon">🔒</span><span className="link-text">سياسة الخصوصية</span></Link>
        </div>
      </div>

      <style jsx>{`
        .profile-page{max-width:1200px;margin:0 auto;padding:20px;}
        .profile-banner{background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:20px 20px 0 0;height:200px;position:relative;overflow:hidden;}
        .banner-overlay{position:absolute;inset:0;background:rgba(0,0,0,.2);display:flex;flex-direction:column;justify-content:center;padding:40px;color:#fff;}
        .banner-overlay h1{font-size:32px;margin:0 0 8px;font-weight:900;}
        .banner-overlay p{margin:0;opacity:.9}
        .profile-main-info{background:#fff;border-radius:0 0 20px 20px;padding:30px;display:flex;gap:40px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,.08);}
        .profile-avatar{width:120px;height:120px;background:linear-gradient(135deg,#8b5cf6,#6366f1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:48px;color:#fff;font-weight:900;border:5px solid #fff;box-shadow:0 8px 25px rgba(0,0,0,.1);}
        .avatar-actions{display:flex;gap:10px}
        .remove-avatar-btn{padding:8px 14px;border-radius:10px;border:2px solid #e2e8f0;background:#f8fafc;color:#64748b;font-weight:800}
        .profile-info{flex:1}
        .profile-name-section h2{font-size:28px;color:#1e293b;margin:0 0 10px;}
        .edit-name-input{width:100%;padding:12px;font-size:24px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc;font-weight:900}
        .profile-badges{display:flex;gap:10px;flex-wrap:wrap}
        .badge{padding:6px 12px;border-radius:20px;font-size:12px;font-weight:900}
        .badge.verified{background:#d1fae5;color:#065f46}
        .badge.member{background:#dbeafe;color:#1e40af}
        .profile-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px}
        .edit-btn,.save-btn,.cancel-btn,.my-listings-btn,.my-chats-btn{padding:12px 18px;border-radius:12px;font-weight:900;text-decoration:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-size:14px}
        .edit-btn{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff}
        .save-btn{background:#10b981;color:#fff}
        .cancel-btn{background:#f1f5f9;color:#64748b}
        .my-listings-btn{background:#f8fafc;color:#4f46e5;border:2px solid #e2e8f0}
        .my-chats-btn{background:#fef3c7;color:#92400e;border:2px solid #fde68a}
        .err{margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.25);color:#991b1b;font-weight:800}

        .profile-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:24px 0 40px;}
        .stat-card{background:#fff;padding:22px;border-radius:15px;display:flex;align-items:center;gap:18px;box-shadow:0 4px 15px rgba(0,0,0,.05);}
        .stat-icon{font-size:36px;width:56px;height:56px;background:#f8fafc;border-radius:12px;display:flex;align-items:center;justify-content:center;}
        .stat-number{font-size:30px;font-weight:950;color:#1e293b;line-height:1}
        .stat-label{font-size:14px;color:#64748b;margin-top:4px}

        .profile-tabs{display:flex;gap:10px;margin-bottom:20px;overflow-x:auto;padding-bottom:8px}
        .tab-btn{padding:14px 18px;background:#f8fafc;border:none;border-radius:12px;font-weight:900;color:#64748b;cursor:pointer;white-space:nowrap;display:flex;gap:10px;align-items:center}
        .tab-btn.active{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff}

        .tab-content{background:#fff;border-radius:20px;padding:30px;margin-bottom:30px;box-shadow:0 4px 20px rgba(0,0,0,.08);}
        .tab-content h3{margin:0 0 20px;color:#1e293b;font-size:22px;padding-bottom:12px;border-bottom:2px solid #f1f5f9;}

        .info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px}
        .info-field{display:flex;flex-direction:column;gap:8px}
        .info-field label{font-weight:900;color:#475569;font-size:14px}
        .info-field p{padding:12px;background:#f8fafc;border-radius:10px;color:#1e293b;min-height:46px;display:flex;align-items:center}
        .info-field input,.info-field select,.info-field textarea{padding:12px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc}
        .info-field.full-width{grid-column:1/-1}
        .email-note{font-size:12px;color:#94a3b8}

        .quick-links{background:#fff;border-radius:20px;padding:30px;box-shadow:0 4px 20px rgba(0,0,0,.08);}
        .quick-links h3{margin:0 0 20px;color:#1e293b;font-size:22px}
        .links-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px}
        .quick-link{display:flex;align-items:center;gap:14px;padding:18px;background:#f8fafc;border-radius:12px;text-decoration:none;color:#1e293b;font-weight:900}
        .quick-link:hover{background:#4f46e5;color:#fff}

        .muted{color:#64748b;font-weight:800}

        @media (max-width:768px){
          .profile-page{padding:10px}
          .profile-main-info{flex-direction:column;text-align:center;gap:18px;padding:20px}
          .profile-actions{justify-content:center}
        }
      `}</style>
    </div>
  );
}
