'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { db, firebase, storage } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { toYER, useRates } from '@/lib/rates';
import Link from 'next/link';

const LocationPicker = dynamic(
  () => import('@/components/Map/LocationPicker'),
  { ssr: false }
);

// ✅ الأقسام الافتراضية (تظهر لو فشل Firestore أو ما فيه أقسام)
const DEFAULT_CATEGORIES = [
  { slug: 'cars', name: 'سيارات' },
  { slug: 'real_estate', name: 'عقارات' },
  { slug: 'mobiles', name: 'جوالات' },
  { slug: 'jobs', name: 'وظائف' },
  { slug: 'solar', name: 'طاقة شمسية' },
  { slug: 'furniture', name: 'أثاث' },
  { slug: 'clothes', name: 'ملابس' },            // ✅ جديد
  { slug: 'motorcycles', name: 'دراجات نارية' }, // ✅ جديد
  { slug: 'animals', name: 'حيوانات وطيور' },
  { slug: 'networks', name: 'نت وشبكات' },
  { slug: 'electronics', name: 'إلكترونيات' },
  { slug: 'services', name: 'خدمات' },
  { slug: 'maintenance', name: 'صيانة' },
  { slug: 'other', name: 'أخرى / غير مصنف' },   // ✅ جديد
];

export default function AddPage() {
  const { user, loading } = useAuth();
  const rates = useRates();

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [city, setCity] = useState('');
  // ✅ مهم: لا يوجد قسم افتراضي
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(true);

  const [currency, setCurrency] = useState('YER');
  const [price, setPrice] = useState('');

  const [coords, setCoords] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [auctionEnabled, setAuctionEnabled] = useState(false);
  const [auctionMinutes, setAuctionMinutes] = useState('60');

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [cats, setCats] = useState(DEFAULT_CATEGORIES);
  const [catsLoading, setCatsLoading] = useState(true);
  const [catsSource, setCatsSource] = useState('loading'); // loading | firestore | fallback

  // ✅ تحميل الأقسام من Firestore
  useEffect(() => {
    const unsub = db.collection('categories').onSnapshot(
      (snap) => {
        const arr = snap.docs
          .map((d) => {
            const data = d.data() || {};
            return {
              slug: d.id,
              name: String(data.name || '').trim(),
              active: data.active,
            };
          })
          .filter((c) => c.slug && c.name && c.active !== false);

        // ترتيب عربي لطيف
        arr.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

        if (arr.length) {
          setCats(arr);
          setCatsSource('firestore');

          // ✅ لا تختار أول قسم تلقائيًا
          // فقط إذا القسم الحالي غير موجود (وكان المستخدم مختاره سابقًا)
          if (category && !arr.some((x) => x.slug === category)) {
            setCategory('');
          }
        } else {
          setCats(DEFAULT_CATEGORIES);
          setCatsSource('fallback');
          if (category && !DEFAULT_CATEGORIES.some((x) => x.slug === category)) {
            setCategory('');
          }
        }

        setCatsLoading(false);
      },
      (err) => {
        console.error('Failed to load categories:', err);
        setCats(DEFAULT_CATEGORIES);
        setCatsLoading(false);
        setCatsSource('fallback');

        // ✅ لا تفرض اختيار افتراضي
        if (category && !DEFAULT_CATEGORIES.some((x) => x.slug === category)) {
          setCategory('');
        }
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ معاينة الصور
  useEffect(() => {
    if (images.length === 0) {
      setImagePreviews([]);
      return;
    }

    const previews = [];
    images.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result);
        if (previews.length === images.length) {
          setImagePreviews([...previews]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [images]);

  // ✅ Helpers for rates (fallback إذا rates ما وصل)
  const getYerPerUSD = () => {
    const r = rates || {};
    return Number(
      r.USD ||
      r.usd ||
      r.usdRate ||
      r.usdToYer ||
      r.usd_yer ||
      1632 // fallback
    );
  };

  const getYerPerSAR = () => {
    const r = rates || {};
    return Number(
      r.SAR ||
      r.sar ||
      r.sarRate ||
      r.sarToYer ||
      r.sar_yer ||
      425 // fallback
    );
  };

  // ✅ التحقق من الأخطاء
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) newErrors.title = 'الرجاء إدخال عنوان للإعلان';
    else if (title.trim().length < 5) newErrors.title = 'العنوان يجب أن يكون 5 أحرف على الأقل';

    if (!desc.trim()) newErrors.desc = 'الرجاء إدخال وصف للإعلان';
    else if (desc.trim().length < 10) newErrors.desc = 'الوصف يجب أن يكون 10 أحرف على الأقل';

    if (!city.trim()) newErrors.city = 'الرجاء إدخال المدينة';

    // ✅ القسم إجباري
    if (!category) newErrors.category = 'الرجاء اختيار القسم';

    if (!price || isNaN(price) || Number(price) <= 0) newErrors.price = 'الرجاء إدخال سعر صحيح';

    if (phone && !/^[0-9]{9,15}$/.test(phone.replace(/\D/g, ''))) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
    }

    if (auctionEnabled && (!auctionMinutes || Number(auctionMinutes) < 1)) {
      newErrors.auctionMinutes = 'مدة المزاد يجب أن تكون دقيقة واحدة على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onPick = (c, lbl) => {
    setCoords(c);
    setLocationLabel(lbl || '');
    if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
  };

  const uploadImages = async () => {
    if (!images.length) return [];
    const out = [];

    for (const file of images) {
      const safeName = String(file.name || 'img').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `listings/${user.uid}/${Date.now()}_${safeName}`;
      const ref = storage.ref().child(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      out.push(url);
    }

    return out;
  };

  const handleRemoveImage = (index) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const submit = async () => {
    setSubmitAttempted(true);

    if (!user) {
      alert('يرجى تسجيل الدخول أولاً');
      return;
    }

    if (!validateForm()) {
      alert('يرجى تصحيح الأخطاء قبل المتابعة');
      return;
    }

    setBusy(true);
    try {
      const priceYER = toYER(price, currency, rates);

      const imageUrls = await uploadImages();

      const endAt = auctionEnabled
        ? firebase.firestore.Timestamp.fromMillis(
            Date.now() + Math.max(1, Number(auctionMinutes || 60)) * 60 * 1000
          )
        : null;

      await db.collection('listings').add({
        title: title.trim(),
        description: desc.trim(),
        city: city.trim(),
        category,

        phone: phone.trim() || null,
        isWhatsapp: !!isWhatsapp,

        priceYER: Number(priceYER),
        originalPrice: Number(price),
        originalCurrency: currency,
        currencyBase: 'YER',

        coords: coords ? [coords[0], coords[1]] : null,
        locationLabel: locationLabel || null,

        images: imageUrls,

        userId: user.uid,
        userEmail: user.email || null,
        userName: user.displayName || null,

        views: 0,
        likes: 0,
        isActive: true,

        auctionEnabled: !!auctionEnabled,
        auctionEndAt: endAt,
        currentBidYER: auctionEnabled ? Number(priceYER) : null,

        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      alert('🎉 تم نشر الإعلان بنجاح!');
      window.location.href = '/';
    } catch (e) {
      console.error(e);
      alert('❌ حدث خطأ أثناء النشر. يرجى المحاولة مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  // ✅ السعر المحول (صحيح)
  const convertedPrice = useMemo(() => {
    if (!price || isNaN(price)) return null;

    const yer = Number(toYER(price, currency, rates));
    if (!isFinite(yer) || yer <= 0) return null;

    const yerPerSAR = getYerPerSAR();
    const yerPerUSD = getYerPerUSD();

    const sar = yerPerSAR > 0 ? yer / yerPerSAR : null;
    const usd = yerPerUSD > 0 ? yer / yerPerUSD : null;

    return {
      YER: Math.round(yer).toLocaleString('ar-YE'),
      SAR: sar ? sar.toFixed(2) : null,
      USD: usd ? usd.toFixed(2) : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, currency, rates]);

  if (loading) {
    return (
      <div className="add-page-layout">
        <div className="loading-container">
          <div className="loading-spinner-large" />
          <p>جاري تحميل الصفحة...</p>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <div className="add-page-layout">
        <div className="auth-required-card">
          <div className="lock-icon-large">🔒</div>
          <h2>تسجيل الدخول مطلوب</h2>
          <p>يجب عليك تسجيل الدخول لإضافة إعلان جديد</p>
          <div className="auth-actions">
            <Link href="/login" className="btn-primary auth-btn">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="btn-secondary auth-btn">
              إنشاء حساب جديد
            </Link>
            <Link href="/" className="back-home-btn">
              ← العودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="add-page-layout">
      <div className="page-header add-page-header">
        <h1>إضافة إعلان جديد</h1>
        <p className="page-subtitle">أضف إعلانك ليجده الآلاف من المشترين</p>
      </div>



      <div className="form-tips">
        <div className="tip-item"><span className="tip-icon">📸</span><span>أضف صور واضحة وجودة عالية</span></div>
        <div className="tip-item"><span className="tip-icon">📝</span><span>اكتب وصفاً مفصلاً ودقيقاً</span></div>
        <div className="tip-item"><span className="tip-icon">💰</span><span>حدد سعراً مناسباً ومنافساً</span></div>
        <div className="tip-item"><span className="tip-icon">📍</span><span>اختر الموقع الدقيق لإعلانك</span></div>
      </div>

      <div className="form-grid">
        <div className="form-container">
          <h2 className="form-section-title">معلومات الإعلان</h2>

          {/* العنوان */}
          <div className="form-group">
            <label className="form-label required">عنوان الإعلان</label>
            <input
              className={`form-input ${errors.title ? 'error' : ''}`}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (submitAttempted) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="مثال: لابتوب ماك بوك برو 2023 بحالة ممتازة"
              maxLength={100}
            />
            <div className="form-helper">
              <span>أكتب عنواناً واضحاً وجذاباً</span>
              <span className="char-count">{title.length}/100</span>
            </div>
            {errors.title && <div className="form-error">{errors.title}</div>}
          </div>

          {/* الوصف */}
          <div className="form-group">
            <label className="form-label required">وصف الإعلان</label>
            <textarea
              className={`form-textarea ${errors.desc ? 'error' : ''}`}
              value={desc}
              onChange={(e) => {
                setDesc(e.target.value);
                if (submitAttempted) setErrors((prev) => ({ ...prev, desc: undefined }));
              }}
              placeholder="صف إعلانك بالتفصيل: الحالة، المواصفات، السبب البيع، إلخ..."
              rows={6}
              maxLength={2000}
            />
            <div className="form-helper">
              <span>التفاصيل تساعد على زيادة المبيعات</span>
              <span className="char-count">{desc.length}/2000</span>
            </div>
            {errors.desc && <div className="form-error">{errors.desc}</div>}
          </div>

          {/* المدينة والقسم */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">المدينة</label>
              <input
                className={`form-input ${errors.city ? 'error' : ''}`}
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, city: undefined }));
                }}
                placeholder="مثال: صنعاء"
              />
              {errors.city && <div className="form-error">{errors.city}</div>}
            </div>

            <div className="form-group">
              <label className="form-label required">القسم</label>
              <select
                className={`form-select ${errors.category ? 'error' : ''}`}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, category: undefined }));
                }}
                disabled={catsLoading}
              >
                <option value="" disabled>
                  اختر القسم
                </option>

                {catsLoading ? (
                  <option>جاري تحميل الأقسام...</option>
                ) : (
                  cats.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>

              {errors.category && <div className="form-error">{errors.category}</div>}
            </div>
          </div>

          {/* السعر والعملة */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">السعر</label>
              <input
                className={`form-input ${errors.price ? 'error' : ''}`}
                value={price}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  setPrice(value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                placeholder="مثال: 100000"
                inputMode="decimal"
              />
              {errors.price && <div className="form-error">{errors.price}</div>}
            </div>

            <div className="form-group">
              <label className="form-label required">العملة</label>
              <div className="currency-selector">
                {['YER', 'SAR', 'USD'].map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    className={`currency-btn ${currency === curr ? 'active' : ''}`}
                    onClick={() => setCurrency(curr)}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* السعر المحول */}
          {convertedPrice && (
            <div className="price-conversion">
              <span className="conversion-label">السعر المحول:</span>
              <div className="converted-prices">
                <span className="converted-price">
                  <strong>{convertedPrice.YER}</strong> ريال يمني
                </span>
                <span className="converted-price">≈ {convertedPrice.SAR} ريال سعودي</span>
                <span className="converted-price">≈ ${convertedPrice.USD} دولار أمريكي</span>
              </div>
            </div>
          )}

          {/* رقم الهاتف وواتساب */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">رقم الهاتف</label>
              <input
                className={`form-input ${errors.phone ? 'error' : ''}`}
                value={phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPhone(value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder="مثال: 770000000"
                inputMode="tel"
                maxLength={15}
              />
              {errors.phone && <div className="form-error">{errors.phone}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">طريقة التواصل</label>
              <div className="communication-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${isWhatsapp ? 'active' : ''}`}
                  onClick={() => setIsWhatsapp(true)}
                >
                  <span className="toggle-icon">💬</span>
                  واتساب
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${!isWhatsapp ? 'active' : ''}`}
                  onClick={() => setIsWhatsapp(false)}
                >
                  <span className="toggle-icon">📞</span>
                  مكالمة
                </button>
              </div>
            </div>
          </div>

          {/* الصور */}
          <div className="form-group">
            <label className="form-label">صور الإعلان (اختياري)</label>
            <div className="image-upload-area">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (images.length + files.length > 10) {
                    alert('يمكنك رفع 10 صور كحد أقصى');
                    return;
                  }
                  setImages((prev) => [...prev, ...files]);
                }}
                id="image-upload"
                className="image-upload-input"
              />
              <label htmlFor="image-upload" className="image-upload-label">
                <span className="upload-icon">📷</span>
                <span>اختر الصور</span>
                <span className="upload-hint">يمكنك رفع حتى 10 صور</span>
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="image-previews">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="image-preview">
                    <img src={preview} alt={`معاينة ${index + 1}`} className="preview-img" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => handleRemoveImage(index)}
                      aria-label="حذف الصورة"
                    >
                      ×
                    </button>
                    <span className="image-number">{index + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* المزاد */}
          <div className="auction-section">
            <div className="auction-header">
              <div className="auction-title">
                <span className="auction-icon">⚡</span>
                <span>تفعيل نظام المزاد</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={auctionEnabled}
                  onChange={(e) => setAuctionEnabled(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {auctionEnabled && (
              <div className="auction-details">
                <div className="form-group">
                  <label className="form-label">مدة المزاد</label>
                  <div className="auction-time-input">
                    <input
                      className={`form-input ${errors.auctionMinutes ? 'error' : ''}`}
                      value={auctionMinutes}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setAuctionMinutes(value);
                        if (submitAttempted) setErrors((prev) => ({ ...prev, auctionMinutes: undefined }));
                      }}
                      inputMode="numeric"
                      maxLength={4}
                    />
                    <span className="auction-unit">دقيقة</span>
                  </div>
                  {errors.auctionMinutes && <div className="form-error">{errors.auctionMinutes}</div>}
                  <div className="auction-note">⏱️ سينتهي المزاد بعد {auctionMinutes} دقيقة من النشر</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* الخريطة */}
        <div className="map-container">
          <div className="map-header">
            <h2 className="form-section-title">
              <span className="map-icon">📍</span>
              موقع الإعلان
            </h2>
            <p className="map-subtitle">اسحب المؤشر لتحديد الموقع الدقيق</p>
          </div>

          <div className="map-wrapper">
            <LocationPicker value={coords} onChange={onPick} />
          </div>

          {locationLabel && (
            <div className="location-info">
              <div className="location-label">
                <span className="location-icon">🏷️</span>
                {locationLabel}
              </div>
            </div>
          )}

          {!coords && (
            <div className="location-hint">
              <div className="hint-icon">💡</div>
              <p>تحديد الموقع يساعد المشترين في الوصول إليك بسهولة</p>
            </div>
          )}

          <div className="mobile-submit-section">
            <button className="submit-btn-large" onClick={submit} disabled={!user || busy}>
              {busy ? (
                <>
                  <span className="loading-spinner-small"></span>
                  جاري النشر...
                </>
              ) : (
                '📢 نشر الإعلان'
              )}
            </button>

            <div className="form-notes">
              <p className="note-item">✅ يمكنك تعديل الإعلان لاحقاً</p>
              <p className="note-item">🛡️ معلوماتك محمية وآمنة</p>
            </div>
          </div>
        </div>
      </div>

      <div className="desktop-submit-section">
        <div className="submit-actions">
          <button className="submit-btn-large" onClick={submit} disabled={!user || busy}>
            {busy ? (
              <>
                <span className="loading-spinner-small"></span>
                جاري النشر...
              </>
            ) : (
              '📢 نشر الإعلان الآن'
            )}
          </button>

          <Link href="/" className="cancel-link">
            ❌ إلغاء والعودة
          </Link>
        </div>

        <div className="final-notes">
          <p>
            بعد النشر، يمكنك متابعة إعلانك من قسم <strong>"إعلاناتي"</strong>
          </p>
        </div>
      </div>

      <style jsx>{`
        .add-page-layout {
          min-height: calc(100vh - 60px);
          padding: 20px 16px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .cats-note{
          margin: 10px 0 18px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #fde68a;
          background: #fffbeb;
          color: #92400e;
          font-weight: 700;
          font-size: 13px;
          line-height: 1.6;
        }

        .add-page-header {
          text-align: center;
          padding: 30px 20px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          margin-bottom: 20px;
          border-radius: 20px;
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.2);
        }

        .add-page-header h1 {
          font-size: 32px;
          margin-bottom: 10px;
          font-weight: 900;
        }

        .form-tips {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 30px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .tip-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 15px;
          background: white;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .tip-icon {
          font-size: 16px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }

        @media (max-width: 1024px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }

        .form-container {
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .form-section-title {
          font-size: 22px;
          color: #1e293b;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #1e293b;
          font-size: 15px;
        }

        .form-label.required::after {
          content: ' *';
          color: #dc2626;
        }

        .form-input,
        .form-textarea,
        .form-select {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 16px;
          transition: all 0.2s ease;
          background: #f8fafc;
          color: #1e293b;
        }

        .form-input:focus,
        .form-textarea:focus,
        .form-select:focus {
          outline: none;
          border-color: #4f46e5;
          background: white;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-input.error,
        .form-textarea.error,
        .form-select.error {
          border-color: #dc2626;
          background: #fef2f2;
        }

        .form-helper {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          font-size: 13px;
          color: #64748b;
        }

        .char-count {
          font-weight: 500;
        }

        .form-error {
          color: #dc2626;
          font-size: 13px;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .form-error::before {
          content: '⚠️';
        }

        .currency-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .currency-btn {
          padding: 10px 20px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 8px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
          text-align: center;
          min-width: 80px;
        }

        .currency-btn.active {
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
        }

        .price-conversion {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 15px 20px;
          border-radius: 10px;
          margin: 20px 0;
          border: 1px solid #e2e8f0;
        }

        .conversion-label {
          display: block;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .converted-prices {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .converted-price {
          color: #1e293b;
          font-size: 15px;
        }

        .converted-price strong {
          color: #4f46e5;
        }

        .communication-toggle {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }

        .toggle-btn {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 8px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .toggle-btn.active {
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
        }

        .toggle-icon {
          font-size: 18px;
        }

        .image-upload-input {
          display: none;
        }

        .image-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .upload-icon {
          font-size: 40px;
          margin-bottom: 10px;
          opacity: 0.6;
        }

        .upload-hint {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 5px;
        }

        .image-previews {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 10px;
          margin-top: 15px;
        }

        .image-preview {
          position: relative;
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #e2e8f0;
        }

        .preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-image-btn {
          position: absolute;
          top: 5px;
          left: 5px;
          width: 24px;
          height: 24px;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
        }

        .image-number {
          position: absolute;
          bottom: 5px;
          left: 5px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
        }

        .auction-section {
          background: #f8fafc;
          padding: 20px;
          border-radius: 12px;
          margin-top: 30px;
          border: 1px solid #e2e8f0;
        }

        .auction-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 30px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: 0.4s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: '';
          height: 22px;
          width: 22px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #4f46e5;
        }

        input:checked + .slider:before {
          transform: translateX(30px);
        }

        .map-container {
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
        }

        .map-wrapper {
          flex: 1;
          min-height: 400px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .mobile-submit-section {
          display: none;
          margin-top: 30px;
        }

        .desktop-submit-section {
          margin-top: 40px;
          padding-top: 30px;
          border-top: 2px solid #f1f5f9;
        }

        @media (max-width: 1024px) {
          .mobile-submit-section { display: block; }
          .desktop-submit-section { display: none; }
        }

        .submit-btn-large {
          width: 100%;
          max-width: 400px;
          padding: 18px 30px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .submit-btn-large:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .cancel-link {
          color: #64748b;
          text-decoration: none;
          font-weight: 700;
        }

        .final-notes, .form-notes{
          margin-top: 20px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .note-item {
          color: #475569;
          font-size: 14px;
          margin: 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 20px;
        }

        .loading-spinner-large {
          width: 60px;
          height: 60px;
          border: 4px solid #f1f5f9;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-spinner-small {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .auth-required-card {
          max-width: 500px;
          margin: 50px auto;
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .lock-icon-large {
          font-size: 70px;
          margin-bottom: 20px;
          opacity: 0.7;
        }

        .auth-actions {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-top: 25px;
        }

        .auth-btn {
          padding: 14px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 700;
          text-align: center;
        }

        .btn-primary.auth-btn {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
        }

        .btn-secondary.auth-btn {
          background: #f8fafc;
          color: #4f46e5;
          border: 2px solid #e2e8f0;
        }

        .back-home-btn {
          color: #64748b;
          text-decoration: none;
          font-size: 14px;
          margin-top: 10px;
          display: inline-block;
        }

        @media (max-width: 768px) {
          .add-page-header { padding: 25px 15px; border-radius: 16px; }
          .add-page-header h1 { font-size: 24px; }
          .form-container, .map-container { padding: 20px; border-radius: 16px; }
          .form-section-title { font-size: 18px; }
          .currency-btn { padding: 8px 12px; font-size: 14px; }
        }

        @media (max-width: 480px) {
          .form-row { grid-template-columns: 1fr; gap: 15px; }
          .currency-selector { flex-direction: column; }
          .communication-toggle { flex-direction: column; }
          .image-previews { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </div>
  );
}
