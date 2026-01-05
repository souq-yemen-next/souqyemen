'use client';

import { useState } from 'react';

const faqItems = [
  {
    question: "كيف أضيف إعلاناً جديداً؟",
    answer: "انقر على زر 'أضف إعلان' في أعلى الصفحة، ثم املأ جميع الحقول المطلوبة (العنوان، الوصف، السعر، إلخ) وانقر على 'نشر الإعلان'."
  },
  {
    question: "كيف أتواصل مع البائع؟",
    answer: "بعد العثور على إعلان يعجبك، انقر على الزر 'تواصل مع البائع' وسيظهر رقم الهاتف أو وسائل التواصل الأخرى."
  },
  {
    question: "هل يمكنني تعديل إعلان بعد نشره؟",
    answer: "نعم، يمكنك تعديل إعلانك في أي وقت من خلال الذهاب إلى 'إعلاناتي' ثم اختيار الإعلان وتعديله."
  },
  {
    question: "ما هي مدة بقاء الإعلان؟",
    answer: "الإعلانات تبقى لمدة 30 يوماً، ويمكنك تجديدها قبل انتهاء المدة."
  },
  {
    question: "هل هناك رسوم على إضافة الإعلانات؟",
    answer: "لا، إضافة وتصفح الإعلانات مجاني تماماً. نحن لا نطلب أي رسوم."
  },
  {
    question: "كيف أبلغ عن إعلان مخالف؟",
    answer: "في كل إعلان يوجد زر 'تبليغ'، يمكنك استخدامه للإبلاغ عن أي إعلان مخالف للشروط."
  }
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="help-page">
      <div className="page-header">
        <h1>مركز المساعدة والدعم</h1>
        <p className="page-subtitle">دليل شامل لاستخدام المنصة وحل المشكلات</p>
      </div>

      <div className="page-content">
        {/* قسم الأسئلة الشائعة */}
        <section className="help-section">
          <h2>❓ الأسئلة الشائعة</h2>
          <div className="faq-list">
            {faqItems.map((item, index) => (
              <div key={index} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={openIndex === index}
                >
                  {item.question}
                  <span className="faq-icon">
                    {openIndex === index ? '−' : '+'}
                  </span>
                </button>
                {openIndex === index && (
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* قسم دليل الاستخدام */}
        <section className="help-section">
          <h2>📖 دليل الاستخدام السريع</h2>
          <div className="guide-steps">
            <div className="guide-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>إنشاء حساب</h3>
                <p>سجل حسابك مجاناً للتمتع بميزات إعلاناتك ومحادثاتك</p>
              </div>
            </div>
            
            <div className="guide-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>إضافة إعلان</h3>
                <p>انقر على "أضف إعلان" واملأ المعلومات بدقة مع صور واضحة</p>
              </div>
            </div>
            
            <div className="guide-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>متابعة الإعلان</h3>
                <p>تابع إعلاناتك ورد على رسائل المشترين من قسم "محادثاتي"</p>
              </div>
            </div>
            
            <div className="guide-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>إتمام الصفقة</h3>
                <p>تواصل مع المشتري واتفق على طريقة التسليم والدفع</p>
              </div>
            </div>
          </div>
        </section>

        {/* قسم الدعم المباشر */}
        <section className="help-section">
          <h2>🆘 الدعم الفني المباشر</h2>
          <div className="support-cards">
            <div className="support-card">
              <div className="support-icon">📧</div>
              <h3>البريد الإلكتروني</h3>
              <p>support@sooqyemen.com</p>
              <p>نرد خلال 24 ساعة</p>
            </div>
            
            <div className="support-card">
              <div className="support-icon">💬</div>
              <h3>الدردشة المباشرة</h3>
              <p>متاحة خلال ساعات العمل</p>
              <p>من 9 صباحاً إلى 5 مساءً</p>
            </div>
            
            <div className="support-card">
              <div className="support-icon">📞</div>
              <h3>الدعم الهاتفي</h3>
              <p>متوفر للقضايا المستعجلة</p>
              <p>+967 123 456 789</p>
            </div>
          </div>
        </section>

        {/* قسم المشاكل الشائعة */}
        <section className="help-section">
          <h2>🔧 حل المشاكل الشائعة</h2>
          <div className="troubleshooting">
            <div className="problem-solution">
              <h4>لا أستطيع تسجيل الدخول</h4>
              <ul>
                <li>تأكد من صحة البريد الإلكتروني وكلمة المرور</li>
                <li>جرب استعادة كلمة المرور إذا نسيتها</li>
                <li>تأكد من اتصالك بالإنترنت</li>
              </ul>
            </div>
            
            <div className="problem-solution">
              <h4>لم يظهر إعلاني في النتائج</h4>
              <ul>
                <li>تأكد من نشر الإعلان بنجاح</li>
                <li>تحقق من فئة الإعلان ومدينتك</li>
                <li>الإعلانات تحتاج بضع دقائق لتظهر</li>
              </ul>
            </div>
            
            <div className="problem-solution">
              <h4>لا أتلقى رسائل المشترين</h4>
              <ul>
                <li>تأكد من صحة رقم هاتفك</li>
                <li>تحقق من قسم "محادثاتي" في الموقع</li>
                <li>قد تكون الرسائل في صندوق البريد المزعج</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
