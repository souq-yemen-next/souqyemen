'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebaseClient';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';

const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card">
      <div className="cardTop">
        <div className="icon">{icon}</div>
        <div className="meta">
          <div className="label">{label}</div>
          <div className="value">{value ?? '—'}</div>
        </div>
      </div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

function ActionCard({ title, desc, href, icon }) {
  return (
    <Link href={href} className="actionLink">
      <div className="action">
        <div className="actionIcon">{icon}</div>
        <div className="actionBody">
          <div className="actionTitle">{title}</div>
          <div className="actionDesc">{desc}</div>
        </div>
        <div className="actionArrow">←</div>
      </div>
    </Link>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return !!email && ADMIN_EMAILS.includes(email);
  }, [user]);

  const [stats, setStats] = useState({
    listingsTotal: null,
    listingsActive: null,
    usersTotal: null,
    chatsTotal: null,
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) return;

    let mounted = true;

    const load = async () => {
      setBusy(true);
      setErr('');

      try {
        const [listingsTotal, listingsActive, usersTotal, chatsTotal] = await Promise.all([
          getCountFromServer(collection(db, 'listings')),
          getCountFromServer(query(collection(db, 'listings'), where('isActive', '==', true))),
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'chats')),
        ]);

        if (!mounted) return;

        setStats({
          listingsTotal: listingsTotal.data().count,
          listingsActive: listingsActive.data().count,
          usersTotal: usersTotal.data().count,
          chatsTotal: chatsTotal.data().count,
        });
      } catch (e) {
        console.error('Admin stats error:', e);
        if (!mounted) return;
        setErr('تعذر تحميل الإحصائيات (قد تكون الصلاحيات في Firestore تمنع القراءة).');
      } finally {
        if (mounted) setBusy(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [loading, user, isAdmin]);

  if (loading || (!loading && !user)) {
    return (
      <div className="wrap">
        <div className="center">
          <div className="spinner" />
          <p>جاري التحميل…</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="wrap">
        <div className="panel">
          <div className="lock">🛑</div>
          <h1>غير مصرح</h1>
          <p>هذه الصفحة مخصصة للمدراء فقط.</p>
          <div className="row">
            <Link className="btn" href="/">العودة للرئيسية</Link>
            <Link className="btn ghost" href="/profile">الملف الشخصي</Link>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="hero">
        <div className="heroLeft">
          <h1>لوحة الإدارة</h1>
          <p>إدارة المنصة، متابعة الإحصائيات، وتنفيذ إجراءات سريعة.</p>

          <div className="chips">
            <span className="chip">👤 {user?.email}</span>
            <span className="chip subtle">{busy ? '⏳ تحديث الإحصائيات…' : '✅ جاهز'}</span>
          </div>
        </div>

        <div className="heroRight">
          <div className="quick">
            <Link className="qbtn" href="/add">➕ إضافة إعلان</Link>
            <Link className="qbtn ghost" href="/my-listings">📋 إعلاناتي</Link>
            <Link className="qbtn ghost" href="/my-chats">💬 محادثاتي</Link>
          </div>
        </div>
      </div>

      {err ? (
        <div className="alert">
          <span className="alertIcon">⚠️</span>
          <span>{err}</span>
        </div>
      ) : null}

      <div className="grid">
        <StatCard icon="📦" label="إجمالي الإعلانات" value={stats.listingsTotal} sub="عدد كل الإعلانات في قاعدة البيانات" />
        <StatCard icon="✅" label="الإعلانات النشطة" value={stats.listingsActive} sub="إعلانات isActive = true" />
        <StatCard icon="👥" label="المستخدمون" value={stats.usersTotal} sub="عدد حسابات المستخدمين" />
        <StatCard icon="💬" label="المحادثات" value={stats.chatsTotal} sub="عدد غرف/مستندات المحادثات" />
      </div>

      <div className="sectionTitle">
        <h2>إجراءات الإدارة</h2>
        <p>لوحات فعلية للمدير</p>
      </div>

      <div className="actions">
        <ActionCard title="إدارة الإعلانات" desc="تفعيل/إخفاء/حذف الإعلانات" href="/admin/listings" icon="🧰" />
        <ActionCard title="إدارة المستخدمين" desc="عرض/حظر/فك حظر المستخدمين" href="/admin/users" icon="🛡️" />
      </div>

      <div className="footer">
        <div className="note">
          💡 إذا الإحصائيات لا تظهر: راجع قواعد Firestore (Security Rules).
        </div>
        <div className="row">
          <Link className="btn ghost" href="/">الرئيسية</Link>
          <Link className="btn ghost" href="/privacy">الخصوصية</Link>
          <Link className="btn ghost" href="/terms">الشروط</Link>
        </div>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
/* نفس ستايلك بدون تغيير */
.wrap{min-height: calc(100vh - 60px);padding: 24px 16px 48px;max-width: 1100px;margin: 0 auto;}
.hero{display:flex;gap:16px;justify-content:space-between;align-items:stretch;padding:18px;border:1px solid rgba(0,0,0,.08);border-radius:16px;background: linear-gradient(135deg, rgba(15,52,96,.08), rgba(59,130,246,.08));}
.heroLeft h1{margin:0 0 8px;font-size: 1.75rem;font-weight: 800;color:#0f172a;}
.heroLeft p{margin:0 0 12px;color:#475569;line-height:1.6;max-width: 560px;}
.chips{display:flex; gap:10px; flex-wrap:wrap;}
.chip{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:#fff;border:1px solid rgba(0,0,0,.08);color:#0f172a;font-weight:600;font-size:.9rem;}
.chip.subtle{opacity:.85}
.heroRight{display:flex;align-items:center;}
.quick{display:flex;flex-direction:column;gap:10px;min-width: 220px;}
.qbtn{display:inline-flex;justify-content:center;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:#3b82f6;color:#fff;font-weight:700;text-decoration:none;border:1px solid rgba(0,0,0,.08);transition: transform .15s ease, box-shadow .15s ease;}
.qbtn:hover{ transform: translateY(-1px); box-shadow: 0 10px 22px rgba(59,130,246,.25); }
.qbtn.ghost{background:#fff;color:#0f172a;}
.alert{margin-top:14px;padding:12px 14px;border-radius:12px;border:1px solid rgba(220,38,38,.25);background: rgba(220,38,38,.08);color:#991b1b;display:flex;gap:10px;align-items:flex-start;}
.alertIcon{font-size:1.1rem;margin-top:2px;}
.grid{margin-top:16px;display:grid;grid-template-columns: repeat(4, minmax(0, 1fr));gap:12px;}
.card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:14px;box-shadow: 0 6px 18px rgba(0,0,0,.04);}
.cardTop{display:flex; gap:12px; align-items:center;}
.icon{width:46px; height:46px;border-radius:14px;display:flex; align-items:center; justify-content:center;background: rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.18);font-size:1.25rem;}
.meta .label{color:#64748b;font-weight:700;font-size:.9rem;margin-bottom:4px;}
.meta .value{color:#0f172a;font-weight:900;font-size:1.35rem;}
.sub{margin-top:10px;color:#64748b;font-size:.85rem;line-height:1.5;}
.sectionTitle{margin-top:22px;}
.sectionTitle h2{margin:0 0 6px;font-size:1.15rem;font-weight:900;color:#0f172a;}
.sectionTitle p{margin:0;color:#64748b;}
.actions{margin-top:12px;display:grid;grid-template-columns: repeat(2, minmax(0, 1fr));gap:12px;}
.actionLink{text-decoration:none;color:inherit;}
.action{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:14px;display:flex;gap:12px;align-items:center;transition: transform .15s ease, box-shadow .15s ease;}
.action:hover{transform: translateY(-1px);box-shadow: 0 10px 24px rgba(0,0,0,.06);}
.actionIcon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background: rgba(15,52,96,.08);border:1px solid rgba(0,0,0,.06);font-size:1.2rem;flex-shrink:0;}
.actionBody{flex:1;min-width:0;}
.actionTitle{font-weight:900;color:#0f172a;margin-bottom:4px;}
.actionDesc{color:#64748b;font-size:.9rem;line-height:1.5;}
.actionArrow{color:#94a3b8;font-weight:900;}
.footer{margin-top:18px;padding-top:14px;border-top:1px solid rgba(0,0,0,.08);display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;}
.note{color:#64748b;font-size:.9rem;max-width: 620px;line-height:1.6;}
.row{display:flex;gap:10px;flex-wrap:wrap;}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 12px;border-radius:12px;border:1px solid rgba(0,0,0,.10);background:#3b82f6;color:#fff;font-weight:800;text-decoration:none;}
.btn.ghost{background:#fff;color:#0f172a;}
.center{margin-top:60px;display:flex;flex-direction:column;align-items:center;gap:10px;color:#64748b;}
.spinner{width:40px;height:40px;border:3px solid rgba(0,0,0,.08);border-top:3px solid rgba(59,130,246,1);border-radius:50%;animation: spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.panel{margin-top:60px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:22px;text-align:center;box-shadow: 0 10px 26px rgba(0,0,0,.06);}
.lock{font-size:2.2rem;margin-bottom:10px;}
@media (max-width: 980px){.grid{grid-template-columns: repeat(2, minmax(0, 1fr));}.hero{flex-direction:column;}.quick{flex-direction:row;min-width: unset;flex-wrap:wrap;}}
@media (max-width: 560px){.grid{grid-template-columns: 1fr;}.actions{grid-template-columns: 1fr;}}
`;
