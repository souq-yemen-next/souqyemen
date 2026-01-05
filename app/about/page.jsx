'use client';

export default function AboutPage() {
  return (
    <div className="about-page">
      <div className="page-header">
        <h1>عن منصة سوق اليمن</h1>
        <p className="page-subtitle">منصتك الأولى للبيع والشراء في اليمن</p>
      </div>

      <div className="page-content">
        <section className="about-section">
          <h2>🎯 رؤيتنا</h2>
          <p>
            نسعى لأن نكون المنصة الرائدة في تسهيل عمليات البيع والشراء في اليمن، 
            من خلال توفير بيئة آمنة وموثوقة تربط بين البائعين والمشترين في جميع أنحاء الجمهورية.
          </p>
        </section>

        <section className="about-section">
          <h2>🚀 مهمتنا</h2>
          <p>
            تمكين الأفراد والشركات من عرض منتجاتهم وخدماتهم بسهولة، 
            وتوفير وسيلة فعالة للتواصل المباشر بين الطرفين، 
            مع الحفاظ على أعلى معايير الجودة والأمان.
          </p>
        </section>

        <section className="about-section">
          <h2>⭐ مميزات المنصة</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>آمنة وموثوقة</h3>
              <p>نراقب الإعلانات للتأكد من جودتها وصحتها</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>سهلة الاستخدام</h3>
              <p>واجهة بسيطة ومباشرة تناسب جميع المستخدمين</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>مجانية تماماً</h3>
              <p>إضافة وتصفح الإعلانات مجاني بالكامل</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>متوافقة مع الجوال</h3>
              <p>تعمل بشكل ممتاز على جميع الأجهزة</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>📞 تواصل معنا</h2>
          <div className="contact-info">
            <p>
              <strong>البريد الإلكتروني:</strong>{' '}
              <a href="mailto:info@sooqyemen.com">info@sooqyemen.com</a>
            </p>
            <p>
              <strong>للشكاوى والمقترحات:</strong>{' '}
              <a href="mailto:support@sooqyemen.com">support@sooqyemen.com</a>
            </p>
            <p>
              <strong>ساعات العمل:</strong> الأحد - الخميس، 9 صباحاً - 5 مساءً
            </p>
          </div>
        </section>

        <section className="about-section">
          <h2>🤝 فريق العمل</h2>
          <p>
            نعمل بجد لتطوير وتحسين المنصة باستمرار. فريقنا مكون من مبرمجين ومصممين 
            وخبراء في التسويق الإلكتروني، جميعنا نهدف لخدمة المجتمع اليمني.
          </p>
        </section>
      </div>
    </div>
  );
}
