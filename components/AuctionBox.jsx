// components/AuctionBox.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import Price from '@/components/Price';

function msToClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

export default function AuctionBox({ listingId, listing }) {
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now());
  const [bidYER, setBidYER] = useState('');
  const [bids, setBids] = useState([]);
  const endAtMs = useMemo(() => {
    const t = listing?.auctionEndAt;
    if (!t) return null;
    // firestore Timestamp
    if (typeof t?.toMillis === 'function') return t.toMillis();
    // number fallback
    return Number(t) || null;
  }, [listing?.auctionEndAt]);

  useEffect(() => {
    if (!listingId) return;
    const unsub = db.collection('listings').doc(listingId)
      .collection('bids').orderBy('createdAt', 'desc').limit(10)
      .onSnapshot((snap) => {
        setBids(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    return () => unsub();
  }, [listingId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeLeftMs = endAtMs ? (endAtMs - now) : null;
  const ended = endAtMs ? timeLeftMs <= 0 : false;

  const currentYER = Number(listing?.currentBidYER || listing?.priceYER || 0);

  const placeBid = async () => {
    if (!user) {
      alert('سجل دخول أولاً للمزايدة');
      return;
    }
    if (!listingId) return;
    const v = Number(bidYER || 0);
    if (!v || v <= currentYER) {
      alert('يجب أن تكون المزايدة أعلى من السعر الحالي');
      return;
    }
    if (ended) {
      alert('انتهى المزاد');
      return;
    }

    const ref = db.collection('listings').doc(listingId);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const data = doc.data() || {};
      const cur = Number(data.currentBidYER || data.priceYER || 0);
      if (v <= cur) throw new Error('bid-too-low');

      tx.update(ref, { currentBidYER: v, lastBidAt: firebase.firestore.FieldValue.serverTimestamp() });

      const bidRef = ref.collection('bids').doc();
      tx.set(bidRef, {
        amountYER: v,
        uid: user.uid,
        email: user.email || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    setBidYER('');
  };

  if (!listing?.auctionEnabled) return null;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent:'space-between' }}>
        <div>
          <div style={{ fontWeight:900 }}>🔨 المزاد</div>
          <div className="muted" style={{ fontSize:12 }}>
            {endAtMs ? (ended ? 'انتهى المزاد' : `الوقت المتبقي: ${msToClock(timeLeftMs)}`) : '—'}
          </div>
        </div>
        <span className="badge">{ended ? 'مغلق' : 'مفتوح'}</span>
      </div>

      <div style={{ marginTop:10 }}>
        <div className="muted" style={{ fontSize:12, marginBottom:4 }}>السعر الحالي</div>
        <Price priceYER={currentYER} />
      </div>

      <div className="row" style={{ marginTop:10 }}>
        <input
          className="input"
          value={bidYER}
          onChange={(e) => setBidYER(e.target.value)}
          placeholder="اكتب مبلغ المزايدة (YER)"
          inputMode="numeric"
        />
        <button className="btn btnPrimary" onClick={placeBid} disabled={ended}>تأكيد المزايدة</button>
      </div>

      <hr />

      <div style={{ fontWeight:800, marginBottom:6 }}>أعلى المزايدات</div>
      <div style={{ display:'grid', gap:8 }}>
        {bids.length === 0 ? <div className="muted">لا توجد مزايدات بعد</div> : bids.map(b => (
          <div key={b.id} className="row" style={{ justifyContent:'space-between' }}>
            <span className="muted" style={{ fontSize:12 }}>{b.email || b.uid}</span>
            <span style={{ fontWeight:800 }}>{Math.round(Number(b.amountYER || 0)).toLocaleString('en-US')} YER</span>
          </div>
        ))}
      </div>
    </div>
  );
}
