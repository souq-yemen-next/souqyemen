// app/edit-listing/[id]/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

// ✅ نفس إعدادات الأدمن
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const STATIC_ADMINS = [
  'mansouralbarout@gmail.com',
  'aboramez965@gmail.com', // احذف السطر لو ما تريده أدمن
];

const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const idRaw = params?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;

  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [err, setErr] = useState('');

  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const userEmail = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);
  const isOwner = !!user?.uid && !!data?.userId && user.uid === data.userId;

  const canEdit = useMemo(() => {
    if (!user) return false;
    return isAdmin || isOwner;
  }, [isAdmin, isOwner, user]);

  // ✅ جلب بيانات الإعلان
  useEffect(() => {
    const run = async () => {
      setErr('');
      if (!id) {
        setErr('معرّف الإعلان غير موجود بالرابط.');
        setPageLoading(false);
        return;
      }

      try {
        setPageLoading(true);
        const ref = doc(db, 'listings', String(id));
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setErr('الإعلان غير موجود أو تم حذفه.');
          setData(null);
          setPageLoading(false);
          return;
        }

        const d = { id: snap.id, ...snap.data() };
        setData(d);

        // coords: إمّا [lat,lng] أو {lat,lng}
        if (Array.isArray(d.coords) && d.coords.length === 2) {
          setLat(String(d.coords[0] ?? ''));
          setLng(String(d.coords[1] ?? ''));
        } else if (d.coords?.lat != null && d.coords?.lng != null) {
          setLat(String(d.coords.lat));
          setLng(String(d.coords.lng));
        } else {
          setLat('');
          setLng('');
        }
      } catch (e) {
        console.error('Fetch listing error:', e);
        setErr('حدث خطأ أثناء تحميل بيانات الإعلان.');
      } finally {
        setPageLoading(false);
      }
    };

    run();
  }, [id]);

  const save = async () => {
    if (!id || !data) return;

    if (!canEdit) {
      alert('ليست لديك صلاحية تعديل هذا الإعلان');
      return;
    }

    try {
      setSaving(true);
      setErr('');

      // coords
      let coords = data.coords ?? null;
      const numLat = parseFloat(lat);
      const numLng = parseFloat(lng);
      if (!Number.isNaN(numLat) && !Number.isNaN(numLng)) {
        coords = [numLat, numLng];
      }

      const ref = doc(db, 'listings', String(id));

      await updateDoc(ref, {
        title: String(data.title || ''),
        description: String(data.description || ''),
        priceYER: Number(data.priceYER || 0),
        city: String(data.city || ''),
        locationLabel: String(data.locationLabel || ''),
        coords: coords || null,
        updatedAt: serverTimestamp(),
      });

      alert('تم حفظ التعديلات بنجاح ✅');
      router.push(isAdmin ? '/admin' : '/my-listings');
    } catch (e) {
      console.error('Save listing error:', e);
      alert('فشل حفظ التعديلات. غالبًا الصلاحيات تمنع التعديل أو هناك خطأ بالشبكة.');
    } finally {
      setSaving(false);
    }
  };

  // ✅ ملاحظة مهمة:
  // لا نضع <Header /> هنا لأن الهيدر موجود أصلًا في layout.js
  // وضعه هنا سيكرر الهيدر ويعمل لخبطة في الصفحة.

  if (authLoading || pageLoading) {
    return (
      <div className="container" style={{ marginTop: 20 }}>
        <div className="card muted">جاري تحميل بيانات الإعلان...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ marginTop: 20 }}>
        <div className="card">
          يجب تسجيل الدخول لتعديل الإعلان.
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn btnPrimary" onClick={() => router.push('/login')}>
              تسجيل الدخول
            </button>
            <button className="btn" onClick={() => router.push('/')}>
              الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container" style={{ marginTop: 20 }}>
        <div className="card">{err}</div>
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => router.back()}>رجوع</button>
          <button className="btn btnPrimary" onClick={() => window.location.reload()}>إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container" style={{ marginTop: 20 }}>
        <div className="card">الإعلان غير موجود</div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="container" style={{ marginTop: 20 }}>
        <div className="card">ليست لديك صلاحية تعديل هذا الإعلان.</div>
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => router.push('/')}>الرئيسية</button>
          <button className="btn btnPrimary" onClick={() => router.push('/my-listings')}>إعلاناتي</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ marginTop: 20, maxWidth: 720 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>تعديل الإعلان</h2>
        <button
          className="btn"
          onClick={() => router.push(isAdmin ? '/admin' : '/my-listings')}
        >
          ← رجوع
        </button>
      </div>

      <label className="muted" style={{ fontSize: 13, marginTop: 16 }}>
        العنوان
      </label>
      <input
        className="input"
        style={{ marginBottom: 10 }}
        value={data.title || ''}
        onChange={(e) => setData({ ...data, title: e.target.value })}
        placeholder="عنوان الإعلان"
      />

      <label className="muted" style={{ fontSize: 13 }}>
        الوصف
      </label>
      <textarea
        className="input"
        style={{ height: 160, marginBottom: 10 }}
        value={data.description || ''}
        onChange={(e) => setData({ ...data, description: e.target.value })}
        placeholder="وصف الإعلان"
      />

      <label className="muted" style={{ fontSize: 13 }}>
        السعر (بالريال اليمني)
      </label>
      <input
        className="input"
        style={{ marginBottom: 10 }}
        type="number"
        value={data.priceYER ?? ''}
        onChange={(e) => setData({ ...data, priceYER: e.target.value })}
        placeholder="مثال: 1500000"
      />

      <label className="muted" style={{ fontSize: 13 }}>
        المدينة
      </label>
      <input
        className="input"
        style={{ marginBottom: 10 }}
        value={data.city || ''}
        onChange={(e) => setData({ ...data, city: e.target.value })}
        placeholder="مثال: صنعاء، عدن..."
      />

      <label className="muted" style={{ fontSize: 13 }}>
        وصف الموقع (مثال: بجوار المستشفى، الحي...)
      </label>
      <input
        className="input"
        style={{ marginBottom: 10 }}
        value={data.locationLabel || ''}
        onChange={(e) => setData({ ...data, locationLabel: e.target.value })}
        placeholder="وصف مختصر لمكان الإعلان"
      />

      <div className="row" style={{ gap: 8, alignItems: 'center', marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <label className="muted" style={{ fontSize: 13 }}>
            خط العرض (Latitude)
          </label>
          <input
            className="input"
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="مثال: 15.3694"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="muted" style={{ fontSize: 13 }}>
            خط الطول (Longitude)
          </label>
          <input
            className="input"
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="مثال: 44.1910"
          />
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <button
          className="btn"
          onClick={() => router.push(isAdmin ? '/admin' : '/my-listings')}
        >
          إلغاء
        </button>
        <button className="btn btnPrimary" onClick={save} disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        </button>
      </div>
    </div>
  );
}
