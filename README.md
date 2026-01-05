Gemini
🇾🇪 Souq Yemen (سوق اليمن)
منصة إعلانات ومزادات إلكترونية حديثة، مصممة خصيصاً للسوق اليمني لتكون سريعة، خفيفة، وتعمل بكفاءة على الهواتف المحمولة.

🌟 نبذة عن المشروع
سوق اليمن هو تطبيق ويب (Web App) مبني بأحدث تقنيات الويب، يهدف إلى تسهيل عمليات البيع والشراء والمزادات داخل اليمن. يدعم النظام تعدد العملات (الريال اليمني، الريال السعودي، الدولار) ويعتمد على الخرائط المفتوحة لتحديد المواقع بدقة.

🛠️ التقنيات المستخدمة (Tech Stack)
🧠 الواجهة الأمامية (Frontend)

Framework: Next.js 14+ (App Router)

Language: JavaScript / React 18

Styling: CSS-in-JS (Styled JSX) - لا نستخدم Tailwind أو MUI.

Maps: OpenStreetMap (Leaflet)

Components: Client Components ('use client') مفضلة للتفاعلية.

☁️ الخدمات الخلفية (Backend as a Service)

Platform: Google Firebase

Database: Cloud Firestore (NoSQL)

Authentication: Firebase Auth (Google Sign-In only)

Storage: Firebase Storage (لصور المنتجات)

📂 بنية المشروع (Project Structure)
يجب الالتزام الصارم بالهيكلة التالية:

/app
  ├── page.jsx                 # الصفحة الرئيسية
  ├── add/page.js              # صفحة إضافة إعلان جديد
  ├── listing/[id]/page.js     # صفحة تفاصيل الإعلان
  ├── chat/[id]/page.js        # صفحة المحادثة الخاصة
  ├── my-chats/page.js         # قائمة محادثات المستخدم
  └── layout.js                # التخطيط العام (Header/Footer)
/components
  ├── Header.jsx               # القائمة العلوية والجانبية
  ├── Price.jsx                # مكون عرض السعر وتحويل العملات
  ├── AuctionBox.jsx           # صندوق المزايدة والعداد
  ├── CommentsBox.jsx          # نظام التعليقات
  ├── Chat/
  │   ├── ChatBox.jsx          # واجهة الدردشة
  │   └── ChatList.jsx         # قائمة المحادثات
  └── Map/
      ├── HomeMapView.jsx      # خريطة الرئيسية
      ├── ListingMap.jsx       # خريطة تفاصيل الإعلان
      └── LocationPicker.jsx   # محدد الموقع عند الإضافة
/lib
  ├── firebaseClient.js        # تهيئة Firebase (Client SDK)
  ├── firebaseAdmin.js         # (Server-side only)
  ├── useAuth.js               # React Context للمصادقة
  └── rates.js                 # منطق تحويل العملات (YER/SAR/USD)

🗂️ هيكلة البيانات (Database Schema)
1. Listings Collection (listings)

يتم تخزين جميع الإعلانات والمزادات هنا. ملاحظة: لا يوجد حقل status أو published.

{
  title: string,
  description: string,
  city: string,
  category: string, // e.g., 'cars', 'real_estate', 'mobiles'
  priceYER: number,          // العملة الأساسية للتخزين
  originalPrice: number,
  originalCurrency: 'YER' | 'SAR' | 'USD',
  images: string[],          // Array of URLs
  coords: [number, number] | null, // [lat, lng]
  locationLabel: string | null,

  // إحصائيات
  views: number,
  likes: number,

  // حالة الإعلان
  isActive: boolean,   // Default: true
  hidden: boolean,     // Default: false (للإخفاء الإداري)

  // نظام المزاد
  auctionEnabled: boolean,
  auctionEndAt: Timestamp | null,
  currentBidYER: number | null,

  // بيانات المالك
  userId: string,
  userEmail: string | null,

  createdAt: Timestamp
}

2. Chats Collection (chats)

المحادثات بين البائع والمشتري.

{
  participants: [uid1, uid2],
  listingId: string,
  lastMessageText: string,
  lastMessageBy: uid,
  updatedAt: Timestamp,
  unread: {
    uid1: number,
    uid2: number
  }
}

⚠️ قواعد التطوير (Development Rules)
لضمان استقرار النظام، يُمنع منعاً باتاً:

❌ إضافة حقول مثل status, published, featured.

❌ استخدام مكتبات UI خارجية (مثل Bootstrap, Tailwind) - نعتمد على CSS الخاص بنا.

❌ استخدام Google Maps (التكلفة عالية) - نعتمد على OpenStreetMap.

❌ إجراء استعلامات معقدة في Firestore (مثل where متعدد الشروط). الفلترة تتم في جانب العميل (Client-side).

🚀 التشغيل المحلي (Setup)
قم بنسخ المستودع:

git clone [https://github.com/username/souq-yemen.git](https://github.com/username/souq-yemen.git)

ثبت الحزم:

npm install

أنشئ ملف .env.local وأضف مفاتيح Firebase.

شغل السيرفر:

npm run dev

Souq Yemen Team © 2024

الإبلاغ عن محتوى غير آمنيفتح الرابط في نافذة جديدة.
