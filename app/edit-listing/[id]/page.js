// app/edit-listing/[id]/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { db, firebase, storage } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { toYER, useRates } from '@/lib/rates';

const LocationPicker = dynamic(
  () => import('@/components/Map/LocationPicker'),
  { ssr: false }
);

// ✅ إيميلات المدراء (نفس الهيدر)
const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

const MAX_IMAGES = 10;

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const rates = useRates();

  const userEmail = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);

  const [docLoading, setDocLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [data, setData] = useState(null);
  const isOwner = !!user?.uid && !!data?.userId && user.uid === data.userId;
  const canEdit = !!user && (isAdmin || isOwner);

  // ====== Form State ======
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('solar');
  const [phone, setPhone] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(true);

  const [currency, setCurrency] = useState('YER');
  const [price, setPrice] = useState('');

  const [coords, setCoords] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');

  // صور موجودة + صور جديدة
  const [existingImages, setExistingImages] = useState([]); // urls
  const [removedExisting, setRemovedExisting] = useState([]); // urls to delete
  const [newImages, setNewImages] = useState([]); // File[]
  const [newPreviews, setNewPreviews] = useState([]); // dataUrl[]

  // حالة الإعلان (اختياري)
  const [status, setStatus] = useState('active'); // active | sold

  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // ====== Load doc ======
  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setDocLoading(true);

    db.collection('listings')
      .doc(id)
      .get()
      .then((snap) => {
        if (!mounted) return;

        if (!snap.exists) {
          alert('الإعلان غير موجود');
          router.replace('/my-listings');
          return;
        }

        const d = { id, ...snap.data() };
        setData(d);

        setTitle(String(d.title || ''));
        setDesc(String(d.description || ''));
        setCity(String(d.city || ''));
        setCategory(String(d.category || 'solar'));
        setPhone(String(d.phone || ''));
        setIsWhatsapp(d.isWhatsapp !== false);

        // عملة + سعر أصلي
        const origCur = String(d.originalCurrency || 'YER');
        const origPrice = d.originalPrice ?? '';
        setCurrency(['YER', 'SAR', 'USD'].includes(origCur) ? origCur : 'YER');
        setPrice(origPrice !== '' ? String(origPrice) : (d.priceYER ? String(d.priceYER) : ''));

        // موقع
        const c = d.coords;
        if (Array.isArray(c) && c.length === 2) {
          setCoords([Number(c[0]), Number(c[1])]);
        } else {
          setCoords(null);
        }
        setLocationLabel(String(d.locationLabel || ''));

        // صور
        setExistingImages(Array.isArray(d.images) ? d.images.filter(Boolean) : []);
        setRemovedExisting([]);
        setNewImages([]);
        setNewPreviews([]);

        // حالة
        setStatus(String(d.status || 'active') === 'sold' ? 'sold' : 'active');

        setDocLoading(false);
      })
      .catch((e) => {
        console.error('Load listing error:', e);
        alert('تعذر تحميل الإعلان');
        setDocLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, router]);

  // ====== Previews for new images ======
  useEffect(() => {
    if (!newImages.length) {
      setNewPreviews([]);
      return;
    }
    const previews = [];
    newImages.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result);
        if (previews.length === newImages.length) setNewPreviews([...previews]);
      };
      reader.readAsDataURL(file);
    });
  }, [newImages]);

  // ====== Validation ======
  const validate = () => {
    const e = {};

    if (!title.trim()) e.title = 'الرجاء إدخال عنوان للإعلان';
    else if (title.trim().length < 5) e.title = 'العنوان يجب أن يكون 5 أحرف على الأقل';

    if (!desc.trim()) e.desc = 'الرجاء إدخال وصف للإعلان';
    else if (desc.trim().length < 10) e.desc = 'الوصف يجب أن يكون 10 أحرف على الأقل';

    if (!city.trim()) e.city = 'الرجاء إدخال المدينة';

    if (!price || isNaN(price) || Number(price) <= 0) e.price = 'الرجاء إدخال سعر صحيح';

    if (phone && !/^[0-9]{9,15}$/.test(String(phone).replace(/\D/g, ''))) {
      e.phone = 'رقم الهاتف غير صحيح';
    }

    const keptExisting = existingImages.length;
    const total = keptExisting + newImages.length;
    if (total > MAX_IMAGES) e.images = `الحد الأقصى للصور هو ${MAX_IMAGES}`;

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ====== Helpers ======
  const onPick = (c, lbl) => {
    setCoords(c);
    setLocationLabel(lbl || '');
    if (errors.location) setErrors((p) => ({ ...p, location: undefined }));
  };

  const handleRemoveExistingImage = (url) => {
    setExistingImages((prev) => prev.filter((x) => x !== url));
    setRemovedExisting((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };

  const handleRemoveNewImage = (index) => {
    setNewImages((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  const uploadNewImages = async () => {
    if (!newImages.length) return [];
    const out = [];

    for (const file of newImages) {
      const safeName = String(file.name || 'img').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `listings/${user.uid}/${Date.now()}_${safeName}`;
      const ref = storage.ref().child(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      out.push(url);
    }

    return out;
  };

  const bestEffortDeleteStorageUrl = async (url) => {
    try {
      // ✅ compat: storage.refFromURL
      const ref = storage.refFromURL(url);
      await ref.delete();
    } catch (e) {
      // لا نوقف العملية لو فشل الحذف (قد تكون الصورة قديمة/صلاحيات)
      console.warn('Storage delete failed:', url, e);
    }
  };

  // ====== Save ======
  const save = async () => {
    setSubmitAttempted(true);

    if (!user) {
      alert('يرجى تسجيل الدخول');
      return;
    }
    if (!canEdit) {
      alert('ليست لديك صلاحية تعديل هذا الإعلان');
      return;
    }
    if (!validate()) {
      alert('يرجى تصحيح الأخطاء قبل الحفظ');
      return;
    }

    setSaving(true);
    try {
      const priceYER = toYER(price, currency, rates);

      const uploaded = await uploadNewImages();
      const finalImages = [...existingImages, ...uploaded].slice(0, MAX_IMAGES);

      const payload = {
        title: title.trim(),
        description: desc.trim(),
        city: city.trim(),
        category: String(category || 'solar'),
        phone: phone.trim() || null,
        isWhatsapp: !!isWhatsapp,

        priceYER: Number(priceYER),
        originalPrice: Number(price),
        originalCurrency: currency,
        currencyBase: 'YER',

        coords: coords ? [Number(coords[0]), Number(coords[1])] : null,
        locationLabel: locationLabel || null,

        images: finalImages,

        // ✅ status (مفيد لملفك الشخصي + إعلاناتي)
        status: status === 'sold' ? 'sold' : 'active',

        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('listings').doc(id).update(payload);

      // بعد حفظ الدوك: نحاول نحذف الصور التي أزلتها من التخزين
      if (removedExisting.length) {
        await Promise.all(removedExisting.map(bestEffortDeleteStorageUrl));
        setRemovedExisting([]);
      }

      // نظّف صور جديدة
      setNewImages([]);
      setNewPreviews([]);

      alert('✅ تم حفظ التعديلات');
      router.push(isAdmin ? '/admin' : '/my-listings');
    } catch (e) {
      console.error('Save error:', e);
      alert('❌ فشل الحفظ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  // ====== Delete listing (حقيقي) ======
  const deleteListing = async () => {
    if (!user) return;
    if (!canEdit) return;

    const ok = confirm('⚠️ هل أنت متأكد من حذف الإعلان نهائياً؟ سيتم حذف الصور أيضاً إن أمكن.');
    if (!ok) return;

    setDeleting(true);
    try {
      const urls = Array.isArray(existingImages) ? existingImages : [];
      await db.collection('listings').doc(id).delete();

      // Best effort delete all images
      await Promise.all(urls.map(bestEffortDeleteStorageUrl));

      alert('🗑️ تم حذف الإعلان نهائياً');
      router.push(isAdmin ? '/admin' : '/my-listings');
    } catch (e) {
      console.error('Delete listing error:', e);
      alert('❌ تعذر حذف الإعلان (قد تكون الصلاحيات تمنع ذلك)');
    } finally {
      setDeleting(false);
    }
  };

  const convertedPrice = useMemo(() => {
    if (!price || isNaN(price)) return null;
    if (currency === 'YER') return null;
    try {
      const yer = toYER(price, currency, rates);
      return Math.round(yer).toLocaleString('ar-YE');
    } catch {
      return null;
    }
  }, [price, currency, rates]);

  // ====== Guards ======
  if (authLoading || docLoading) {
    return (
      <div className="wrap">
        <div className="card center">
          <div className="spinner" />
          <p>جاري تحميل الإعلان…</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wrap">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>🔒 تسجيل الدخول مطلوب</h2>
          <p>يجب تسجيل الدخول لتعديل الإعلان.</p>
          <div className="row">
            <Link className="btn primary" href="/login">تسجيل الدخول</Link>
            <Link className="btn" href="/">العودة للرئيسية</Link>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="wrap">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>غير موجود</h2>
          <p>الإعلان غير موجود.</p>
          <Link className="btn" href="/my-listings">إعلاناتي</Link>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="wrap">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>🛑 غير مصرح</h2>
          <p>ليست لديك صلاحية تعديل هذا الإعلان.</p>
          <div className="row">
            <Link className="btn" href="/">الرئيسية</Link>
            <Link className="btn" href="/my-listings">إعلاناتي</Link>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  // ====== UI ======
  return (
    <div className="wrap">
      <div className="hero">
        <div>
          <h1>تعديل الإعلان</h1>
          <p className="muted">
            عدّل بيانات إعلانك، الصور، والموقع بسهولة.
          </p>
        </div>
        <div className="heroActions">
          <button className="btn" onClick={() => router.back()}>← رجوع</button>
          <button
            className="btn danger"
            onClick={deleteListing}
            disabled={deleting}
            title="حذف نهائي"
          >
            {deleting ? 'جاري الحذف…' : '🗑️ حذف نهائي'}
          </button>
        </div>
      </div>

      <div className="grid">
        {/* Form */}
        <div className="card">
          <h2 className="secTitle">معلومات الإعلان</h2>

          <div className="field">
            <label className="label req">العنوان</label>
            <input
              className={`input ${errors.title ? 'err' : ''}`}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (submitAttempted) setErrors((p) => ({ ...p, title: undefined }));
              }}
              maxLength={100}
              placeholder="عنوان الإعلان"
            />
            {errors.title && <div className="errMsg">{errors.title}</div>}
          </div>

          <div className="field">
            <label className="label req">الوصف</label>
            <textarea
              className={`input ${errors.desc ? 'err' : ''}`}
              value={desc}
              onChange={(e) => {
                setDesc(e.target.value);
                if (submitAttempted) setErrors((p) => ({ ...p, desc: undefined }));
              }}
              rows={6}
              maxLength={2000}
              placeholder="وصف الإعلان"
            />
            {errors.desc && <div className="errMsg">{errors.desc}</div>}
          </div>

          <div className="row2">
            <div className="field">
              <label className="label req">المدينة</label>
              <input
                className={`input ${errors.city ? 'err' : ''}`}
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (submitAttempted) setErrors((p) => ({ ...p, city: undefined }));
                }}
                placeholder="مثال: صنعاء"
              />
              {errors.city && <div className="errMsg">{errors.city}</div>}
            </div>

            <div className="field">
              <label className="label">القسم</label>
              <input
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="مثال: solar"
              />
              <div className="help">نفس قيمة القسم في إضافة الإعلان</div>
            </div>
          </div>

          <div className="row2">
            <div className="field">
              <label className="label req">السعر</label>
              <input
                className={`input ${errors.price ? 'err' : ''}`}
                value={price}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, '');
                  setPrice(v);
                  if (submitAttempted) setErrors((p) => ({ ...p, price: undefined }));
                }}
                inputMode="decimal"
                placeholder="مثال: 100000"
              />
              {errors.price && <div className="errMsg">{errors.price}</div>}
            </div>

            <div className="field">
              <label className="label req">العملة</label>
              <div className="pillRow">
                {['YER', 'SAR', 'USD'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`pill ${currency === c ? 'active' : ''}`}
                    onClick={() => setCurrency(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {convertedPrice && (
                <div className="help">سيتم الحفظ كـ <b>{convertedPrice}</b> ريال يمني (priceYER)</div>
              )}
            </div>
          </div>

          <div className="row2">
            <div className="field">
              <label className="label">رقم الجوال</label>
              <input
                className={`input ${errors.phone ? 'err' : ''}`}
                value={phone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setPhone(v);
                  if (submitAttempted) setErrors((p) => ({ ...p, phone: undefined }));
                }}
                inputMode="tel"
                maxLength={15}
                placeholder="مثال: 770000000"
              />
              {errors.phone && <div className="errMsg">{errors.phone}</div>}
            </div>

            <div className="field">
              <label className="label">طريقة التواصل</label>
              <div className="pillRow">
                <button
                  type="button"
                  className={`pill ${isWhatsapp ? 'active' : ''}`}
                  onClick={() => setIsWhatsapp(true)}
                >
                  💬 واتساب
                </button>
                <button
                  type="button"
                  className={`pill ${!isWhatsapp ? 'active' : ''}`}
                  onClick={() => setIsWhatsapp(false)}
                >
                  📞 مكالمة
                </button>
              </div>
            </div>
          </div>

          <div className="row2">
            <div className="field">
              <label className="label">حالة الإعلان</label>
              <div className="pillRow">
                <button
                  type="button"
                  className={`pill ${status === 'active' ? 'active' : ''}`}
                  onClick={() => setStatus('active')}
                >
                  ✅ نشط
                </button>
                <button
                  type="button"
                  className={`pill ${status === 'sold' ? 'active' : ''}`}
                  onClick={() => setStatus('sold')}
                >
                  💰 تم البيع
                </button>
              </div>
              <div className="help">هذه تضيف/تحدث الحقل <b>status</b> داخل الإعلان</div>
            </div>

            <div className="field">
              <label className="label">وصف الموقع</label>
              <input
                className="input"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="مثال: بجوار المستشفى…"
              />
            </div>
          </div>

          {/* Images */}
          <div className="field">
            <label className="label">الصور</label>

            {errors.images && <div className="errMsg">{errors.images}</div>}

            {!!existingImages.length && (
              <>
                <div className="subTitle">الصور الحالية</div>
                <div className="imgs">
                  {existingImages.map((url) => (
                    <div key={url} className="imgBox">
                      <img src={url} alt="صورة" className="img" />
                      <button
                        type="button"
                        className="x"
                        onClick={() => handleRemoveExistingImage(url)}
                        aria-label="حذف"
                        title="حذف من الإعلان"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="subTitle">إضافة صور جديدة</div>
            <div className="upload">
              <input
                id="upl"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const remain = MAX_IMAGES - existingImages.length - newImages.length;
                  if (files.length > remain) {
                    alert(`يمكنك إضافة ${remain} صور فقط (الحد ${MAX_IMAGES})`);
                    return;
                  }
                  setNewImages((prev) => [...prev, ...files]);
                }}
              />
              <label htmlFor="upl" className="uploadBtn">📷 اختر صور</label>
              <div className="help">حد أقصى {MAX_IMAGES} صور للإعلان</div>
            </div>

            {!!newPreviews.length && (
              <div className="imgs">
                {newPreviews.map((p, idx) => (
                  <div key={idx} className="imgBox">
                    <img src={p} alt={`new-${idx}`} className="img" />
                    <button
                      type="button"
                      className="x"
                      onClick={() => handleRemoveNewImage(idx)}
                      aria-label="حذف"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="footerRow">
            <button className="btn" onClick={() => router.back()}>إلغاء</button>
            <button className="btn primary" onClick={save} disabled={saving}>
              {saving ? 'جاري الحفظ…' : '💾 حفظ التعديلات'}
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="card">
          <h2 className="secTitle">📍 موقع الإعلان</h2>
          <p className="muted">اسحب المؤشر لتحديد الموقع الدقيق</p>
          <div className="map">
            <LocationPicker value={coords} onChange={onPick} />
          </div>
          <div className="help">
            {coords ? `Lat: ${coords[0]} — Lng: ${coords[1]}` : 'لم يتم تحديد موقع بعد'}
          </div>
        </div>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.wrap{
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 14px 40px;
}
.hero{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
  padding:16px;
  border:1px solid rgba(0,0,0,.08);
  border-radius:16px;
  background: linear-gradient(135deg, rgba(79,70,229,.08), rgba(124,58,237,.08));
  margin-bottom: 14px;
}
.hero h1{margin:0 0 6px; font-size:1.4rem; font-weight:900; color:#0f172a;}
.muted{color:#64748b; margin:0; line-height:1.6;}
.heroActions{display:flex; gap:10px; flex-wrap:wrap;}

.grid{
  display:grid;
  grid-template-columns: 1.2fr .8fr;
  gap:14px;
}
@media (max-width: 980px){
  .grid{grid-template-columns: 1fr;}
}

.card{
  background:#fff;
  border:1px solid rgba(0,0,0,.08);
  border-radius:16px;
  padding:16px;
  box-shadow: 0 8px 26px rgba(0,0,0,.05);
}
.center{display:flex; flex-direction:column; align-items:center; gap:10px; padding:28px;}
.spinner{
  width:44px; height:44px;
  border:3px solid rgba(0,0,0,.08);
  border-top:3px solid rgba(79,70,229,1);
  border-radius:50%;
  animation: spin 1s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

.secTitle{margin:0 0 10px; font-size:1.05rem; font-weight:900; color:#0f172a;}

.field{margin-top:12px;}
.label{display:block; font-weight:700; color:#0f172a; margin-bottom:8px;}
.label.req::after{content:" *"; color:#dc2626;}
.input{
  width:100%;
  padding:12px 12px;
  border-radius:12px;
  border:2px solid #e2e8f0;
  background:#f8fafc;
  outline:none;
  transition:.15s ease;
  font-size:15px;
}
.input:focus{
  border-color:#4f46e5;
  background:#fff;
  box-shadow:0 0 0 3px rgba(79,70,229,.12);
}
.input.err{border-color:#dc2626; background:#fef2f2;}
.errMsg{
  margin-top:8px;
  color:#dc2626;
  font-weight:600;
  font-size:13px;
}
.help{margin-top:8px; font-size:13px; color:#64748b; line-height:1.6;}
.row2{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:12px;
}
@media (max-width: 640px){
  .row2{grid-template-columns: 1fr;}
}

.pillRow{display:flex; gap:10px; flex-wrap:wrap;}
.pill{
  padding:10px 14px;
  border-radius:999px;
  border:2px solid #e2e8f0;
  background:#f8fafc;
  color:#64748b;
  font-weight:800;
  cursor:pointer;
  transition:.15s ease;
}
.pill.active{
  background:#4f46e5;
  border-color:#4f46e5;
  color:#fff;
}
.pill:hover{transform: translateY(-1px);}

.subTitle{margin-top:10px; font-weight:900; color:#0f172a; font-size:.95rem;}
.imgs{
  margin-top:10px;
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap:10px;
}
.imgBox{
  position:relative;
  border-radius:12px;
  overflow:hidden;
  border:1px solid rgba(0,0,0,.08);
  aspect-ratio: 1;
}
.img{width:100%; height:100%; object-fit:cover; display:block;}
.x{
  position:absolute;
  top:6px; left:6px;
  width:26px; height:26px;
  border-radius:999px;
  border:none;
  background: rgba(239,68,68,.92);
  color:#fff;
  font-size:18px;
  font-weight:900;
  cursor:pointer;
  display:flex; align-items:center; justify-content:center;
}
.x:hover{background:#dc2626}

.upload{margin-top:10px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;}
.upload input{display:none;}
.uploadBtn{
  padding:10px 14px;
  border-radius:12px;
  background:#0f172a;
  color:#fff;
  font-weight:900;
  cursor:pointer;
}
.uploadBtn:hover{opacity:.92}

.map{
  margin-top:10px;
  height: 420px;
  border-radius:14px;
  overflow:hidden;
  border:1px solid rgba(0,0,0,.08);
}

.footerRow{
  margin-top:16px;
  display:flex;
  gap:10px;
  justify-content:flex-end;
  flex-wrap:wrap;
}

.btn{
  padding:10px 14px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,.12);
  background:#fff;
  font-weight:900;
  cursor:pointer;
  text-decoration:none;
  color:#0f172a;
}
.btn.primary{
  background:#4f46e5;
  color:#fff;
  border-color:#4f46e5;
}
.btn.primary:disabled{opacity:.75; cursor:not-allowed;}
.btn.danger{
  background:#fef2f2;
  border-color:#fecaca;
  color:#dc2626;
}
.btn.danger:disabled{opacity:.7; cursor:not-allowed;}
`;
