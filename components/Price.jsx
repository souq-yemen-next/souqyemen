// components/Price.jsx
'use client';

export default function Price({ priceYER = 0 }) {
  // أسعار الصرف التي ذكرتها:
  // 1 ريال سعودي = 425 ريال يمني
  // 1 دولار أمريكي = 1632 ريال يمني
  const RATE_SAR = 425;
  const RATE_USD = 1632;

  const base = Number(priceYER || 0);

  // نحسب بالقسمة (وليس الضرب!)
  const sar = base / RATE_SAR;
  const usd = base / RATE_USD;

  // دالة تنسيق الأرقام
  const format = (n) =>
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(isFinite(n) ? Math.round(n) : 0);

  return (
    <div>
      {/* السعر الأساسي */}
      <div style={{ fontWeight: 900, fontSize: 18 }}>
        {format(base)} <span style={{ fontWeight: 400 }}>ريال يمني</span>
      </div>

      {/* العملات */}
      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
        SAR : {format(sar)} &nbsp;&nbsp; USD : {format(usd)}
      </div>
    </div>
  );
}
