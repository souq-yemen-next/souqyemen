// lib/viewed.js
const KEY = 'seen_listings_v1';

export function getSeenIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function hasSeen(id) {
  return getSeenIds().has(String(id));
}

export function markSeen(id) {
  if (typeof window === 'undefined') return;
  const set = getSeenIds();
  set.add(String(id));
  localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
}
