// lib/analytics.js
import { firebase, db } from '@/lib/firebaseClient';

// نفس منطق visitorId الموجود في النسخة القديمة
export function getVisitorId() {
  try {
    let id = localStorage.getItem('sy_visitor_id');
    if (!id) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 15);
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        navigator.platform
      ].join('|');

      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }

      id = `visitor_${timestamp}_${random}_${Math.abs(hash).toString(36)}`;
      localStorage.setItem('sy_visitor_id', id);
    }
    return id;
  } catch {
    return 'temp_visitor_' + Date.now().toString(36);
  }
}

export async function registerSiteVisit(authUser) {
  const visitorId = getVisitorId();
  try {
    await db.collection('site_views').add({
      visitorId,
      uid: authUser ? authUser.uid : null,
      email: authUser ? (authUser.email || null) : null,
      path: (typeof window !== 'undefined' ? (window.location.pathname + window.location.search + window.location.hash) : null),
      referrer: (typeof document !== 'undefined' ? (document.referrer || null) : null),
      userAgent: (typeof navigator !== 'undefined' ? (navigator.userAgent || null) : null),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.warn('site view log failed:', e);
  }
}

export async function logListingView(listingId, authUser) {
  if (!listingId) return;
  const visitorId = getVisitorId();
  try {
    await db.collection('listings').doc(listingId).update({
      views: firebase.firestore.FieldValue.increment(1)
    });

    await db.collection('listings').doc(listingId).collection('views').add({
      visitorId,
      uid: authUser ? authUser.uid : null,
      email: authUser ? (authUser.email || null) : null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    });
  } catch (e) {
    console.warn('listing view log failed:', e);
  }
}
