// lib/rates.js
'use client';

import { useEffect, useState } from 'react';
import { db } from './firebaseClient';

// القيم الافتراضية (في حال ما قدرنا نقرأ من Firestore)
const DEFAULT_SAR = 425;   // 1 SAR = 425 YER
const DEFAULT_USD = 1632;  // 1 USD = 1632 YER

// دالة توحّد شكل البيانات القادمة من Firestore أو من أي مكان آخر
function normalizeRates(raw) {
  const sar =
    raw && raw.sar != null
      ? Number(raw.sar)
      : raw && raw.sarToYer != null
        ? Number(raw.sarToYer)
        : DEFAULT_SAR;

  const usd =
    raw && raw.usd != null
      ? Number(raw.usd)
      : raw && raw.usdToYer != null
        ? Number(raw.usdToYer)
        : DEFAULT_USD;

  return {
    sar: sar > 0 ? sar : DEFAULT_SAR,
    usd: usd > 0 ? usd : DEFAULT_USD,
  };
}

// هوك لقراءة الأسعار من Firestore (settings/rates)
export function useRates() {
  const [rates, setRates] = useState(() => normalizeRates(null));

  useEffect(() => {
    if (!db) return;

    const unsub = db
      .collection('settings')
      .doc('rates')
      .onSnapshot(
        (snap) => {
          if (snap.exists) {
            setRates(normalizeRates(snap.data()));
          }
        },
        (err) => {
          console.error('rates:onSnapshot error', err);
        }
      );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  return rates; // { sar, usd }
}

// تحويل أي عملة إلى ريال يمني
export function toYER(amount, currency, ratesInput) {
  const value = Number(amount || 0);
  if (!value) return 0;

  const { sar, usd } = normalizeRates(ratesInput);

  switch (currency) {
    case 'SAR':
      return Math.round(value * sar);
    case 'USD':
      return Math.round(value * usd);
    case 'YER':
    default:
      return Math.round(value);
  }
}
