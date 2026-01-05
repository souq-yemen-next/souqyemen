'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth, googleProvider } from '@/lib/firebaseClient';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = (() => {
    const n = searchParams?.get('next') || '/';
    // حماية بسيطة: لا نسمح بروابط خارجية
    return n.startsWith('/') ? n : '/';
  })();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [debug, setDebug] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const normalizeEmail = (v) => String(v || '').trim().toLowerCase();

  const mapAuthError = (err) => {
    const code = err?.code || '';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password') return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    if (code === 'auth/invalid-email') return 'البريد الإلكتروني غير صحيح';
    if (code === 'auth/too-many-requests') return 'تم تعطيل المحاولة مؤقتاً بسبب كثرة المحاولات الفاشلة';
    if (code === 'auth/operation-not-allowed') return 'تسجيل الدخول بالبريد غير مفعّل في إعدادات Firebase';
    if (code === 'auth/unauthorized-domain') return 'الدومين غير مسموح في إعدادات Firebase (Authorized domains)';
    if (code === 'auth/invalid-api-key') return 'مشكلة في إعدادات Firebase (API Key)';
    if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    return 'حدث خطأ غير متوقع، حاول لاحقاً';
  };

  const goNext = () => {
    // replace أفضل عشان ما يرجع للّوجن بزر الرجوع
    router.replace(nextPath);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setDebug('');

    const em = normalizeEmail(email);
    if (!em) return setError('اكتب البريد الإلكتروني');
    if (!password || password.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

    setLoading(true);
    try {
      await auth.signInWithEmailAndPassword(em, password);
      goNext();
    } catch (err) {
      console.error('LOGIN_ERROR', err);
      setError(mapAuthError(err));
      setDebug(`${err?.code || 'no-code'}: ${err?.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setDebug('');
    setLoading(true);
    try {
      await auth.signInWithPopup(googleProvider);
      goNext();
    } catch (err) {
      console.error('GOOGLE_LOGIN_ERROR', err);
      setError(mapAuthError(err) || 'فشل تسجيل الدخول بواسطة Google');
      setDebug(`${err?.code || 'no-code'}: ${err?.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrap" dir="rtl">
      <div className="card">
        <div className="head">
          <div className="logo">🛒</div>
          <h1>تسجيل الدخول</h1>
          <p className="sub">أهلاً بك مجدداً في سوق اليمن</p>
        </div>

        {error ? (
          <div className="alert">
            <span className="alertIcon">⚠️</span>
            <div className="alertText">{error}</div>
          </div>
        ) : null}

        {debug ? (
          <div className="debug">
            <span>Debug:</span> {debug}
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="form">
          <label className="lbl">البريد الإلكتروني</label>
          <div className="field">
            <span className="icon">✉️</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              inputMode="email"
              required
            />
          </div>

          <label className="lbl">كلمة المرور</label>
          <div className="field">
            <span className="icon">🔒</span>
            <input
              className="input"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="eye"
              onClick={() => setShowPass((s) => !s)}
              aria-label="إظهار/إخفاء كلمة المرور"
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          <button className="btnPrimary" type="submit" disabled={loading}>
            {loading ? 'جاري التحقق…' : 'دخول'}
          </button>
        </form>

        <div className="sep">
          <div className="line" />
          <span>أو</span>
          <div className="line" />
        </div>

        <button type="button" className="btnGoogle" onClick={handleGoogleLogin} disabled={loading}>
          <span className="gIcon">G</span>
          الدخول بواسطة Google
        </button>

        <div className="foot">
          <div className="muted">
            ليس لديك حساب؟{' '}
            <Link className="link" href={`/register?next=${encodeURIComponent(nextPath)}`}>
              إنشاء حساب جديد
            </Link>
          </div>

          <Link className="link2" href={nextPath}>
            ← العودة
          </Link>
        </div>
      </div>

      <style jsx>{`
        .wrap{
          min-height: calc(100vh - 60px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 24px 14px;
          background: #f8fafc;
        }
        .card{
          width:100%;
          max-width: 420px;
          background:#fff;
          border:1px solid rgba(0,0,0,.08);
          border-radius: 18px;
          box-shadow: 0 14px 36px rgba(0,0,0,.08);
          padding: 18px;
        }
        .head{ text-align:center; padding: 8px 8px 14px; }
        .logo{
          width:56px;height:56px;border-radius: 16px;
          display:flex;align-items:center;justify-content:center;
          margin: 0 auto 10px;
          background: linear-gradient(135deg, rgba(255,107,53,.15), rgba(26,26,46,.08));
          border:1px solid rgba(0,0,0,.06);
          font-size: 26px;
        }
        h1{ margin:0; font-size: 1.35rem; font-weight: 900; color:#0f172a; }
        .sub{ margin: 6px 0 0; color:#64748b; font-size: .92rem; line-height:1.6; }

        .alert{
          margin-top: 10px;
          display:flex; gap:10px; align-items:flex-start;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(220,38,38,.25);
          background: rgba(220,38,38,.08);
          color:#991b1b;
        }
        .alertIcon{ margin-top:2px; }
        .alertText{ font-size: .92rem; line-height:1.6; }

        .debug{ margin-top: 8px; font-size: 11px; color:#64748b; word-break: break-word; }
        .debug span{ font-weight: 800; color:#475569; }

        .form{ margin-top: 14px; display:flex; flex-direction: column; gap: 10px; }
        .lbl{ font-size: .9rem; font-weight: 800; color:#0f172a; margin-top: 4px; }
        .field{
          display:flex; align-items:center; gap:10px;
          border:1px solid rgba(0,0,0,.10);
          background:#f8fafc;
          border-radius: 12px;
          padding: 10px 10px;
        }
        .icon{
          width: 32px;height: 32px;border-radius: 10px;
          display:flex;align-items:center;justify-content:center;
          background:#fff;border:1px solid rgba(0,0,0,.06);
          flex-shrink: 0;
        }
        .input{ border:0; outline:0; background: transparent; width:100%; font-size: 15px; color:#0f172a; }
        .eye{ border:0; background: transparent; cursor:pointer; font-size: 18px; padding: 4px 6px; opacity:.85; }

        .btnPrimary{
          margin-top: 8px; width:100%;
          border:0; border-radius: 12px;
          padding: 12px 14px;
          background: linear-gradient(135deg, #0F3460, #1A1A2E);
          color:#fff; font-weight: 900; font-size: 15px;
          cursor:pointer;
          transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
        }
        .btnPrimary:hover{ transform: translateY(-1px); box-shadow: 0 10px 22px rgba(15,52,96,.22); }
        .btnPrimary:disabled{ opacity: .7; cursor:not-allowed; transform:none; box-shadow:none; }

        .sep{
          display:flex; align-items:center; gap:10px;
          margin: 14px 0;
          color:#94a3b8; font-weight:800; font-size: .85rem;
        }
        .line{ height:1px; background: rgba(0,0,0,.10); flex:1; }

        .btnGoogle{
          width:100%;
          border-radius: 12px;
          padding: 11px 12px;
          border:1px solid rgba(0,0,0,.10);
          background:#fff;
          color:#0f172a;
          font-weight: 900;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .btnGoogle:hover{ transform: translateY(-1px); box-shadow: 0 10px 20px rgba(0,0,0,.06); }
        .btnGoogle:disabled{ opacity:.7; cursor:not-allowed; transform:none; box-shadow:none; }
        .gIcon{
          width:26px;height:26px;border-radius: 10px;
          background: #f1f5f9;
          display:flex;align-items:center;justify-content:center;
          font-weight: 900;
        }

        .foot{ margin-top: 14px; display:flex; flex-direction: column; gap: 10px; align-items:center; }
        .muted{ color:#64748b; font-size: .92rem; }
        .link{ color:#0F3460; font-weight: 900; text-decoration:none; }
        .link:hover{ text-decoration: underline; }
        .link2{ color:#94a3b8; text-decoration:none; font-weight: 800; font-size: .9rem; }
        .link2:hover{ color:#64748b; }

        @media (min-width: 768px) {
          .card { max-width: 460px; padding: 24px; }
          .head { padding: 12px 12px 18px; }
          h1 { font-size: 1.5rem; }
          .sub { font-size: 1rem; }
          .btnPrimary, .btnGoogle { padding: 14px 16px; font-size: 16px; }
          .field { padding: 12px 14px; }
        }
        @media (max-width: 360px) {
          .wrap { padding: 16px 10px; }
          .card { padding: 16px; }
          .head { padding: 6px 6px 12px; }
          .logo { width: 50px; height: 50px; font-size: 22px; }
          h1 { font-size: 1.25rem; }
          .field { padding: 8px 10px; }
          .btnPrimary, .btnGoogle { padding: 10px 12px; font-size: 14px; }
        }
      `}</style>
    </div>
  );
}
