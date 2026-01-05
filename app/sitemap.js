import { db } from '@/lib/firebaseClient';

export const revalidate = 3600; // تحديث الخريطة كل ساعة

export default async function sitemap() {
  const baseUrl = 'https://www.sooqyemen.com';
  
  // 1. تعريف الصفحات الثابتة والأقسام (مأخوذة من كودك القديم)
  const staticRoutes = [
    { url: '', priority: 1.0, freq: 'daily' },           // الرئيسية
    { url: '/login', priority: 0.8, freq: 'monthly' },   // دخول
    { url: '/register', priority: 0.8, freq: 'monthly' },// تسجيل
    { url: '/add', priority: 0.8, freq: 'monthly' },     // إضافة إعلان
    
    // الأقسام الرئيسية
    { url: '/cars', priority: 0.8, freq: 'weekly' },
    { url: '/real_estate', priority: 0.8, freq: 'weekly' }, // تأكد هل الرابط realestate أم real_estate حسب مجلداتك
    { url: '/phones', priority: 0.8, freq: 'weekly' },
    { url: '/electronics', priority: 0.8, freq: 'weekly' },
    { url: '/solar', priority: 0.8, freq: 'weekly' },
    { url: '/furniture', priority: 0.8, freq: 'weekly' },
    { url: '/services', priority: 0.8, freq: 'weekly' },
  ].map((route) => ({
    url: `${baseUrl}${route.url}`,
    lastModified: new Date(),
    changeFrequency: route.freq,
    priority: route.priority,
  }));

  // 2. جلب الإعلانات من قاعدة البيانات
  let listingRoutes = [];
  try {
    // نستخدم db العادية (Client SDK) التي لا تسبب مشاكل
    const snapshot = await db.collection('listings') // تأكد أن اسم المجموعة listings وليس ads كما في كودك القديم
      .orderBy('createdAt', 'desc')
      .limit(1000)
      .get();

    listingRoutes = snapshot.docs.map((doc) => ({
      url: `${baseUrl}/listing/${doc.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Sitemap Generation Error:', error);
  }

  // دمج الكل وإرجاع النتيجة بتنسيق Next.js الجديد
  return [...staticRoutes, ...listingRoutes];
}
