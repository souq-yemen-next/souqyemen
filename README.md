# Souq Yemen (Next.js + Firebase)

## تشغيل محليًا
```bash
npm install
npm run dev
```

## Firebase (ضروري)
1) Firebase Console → Authentication → Sign-in method
   - فعّل Email/Password
   - (اختياري) فعّل Google

2) Firebase Console → Authentication → Settings → Authorized domains
   أضف:
   - sooqyemen.com
   - www.sooqyemen.com
   - localhost

3) Firestore Database
   - أنشئ قاعدة بيانات Firestore
   - (للتجربة) Rules مؤقتة:
     - read: true
     - write: request.auth != null

بعد ما يشتغل الموقع نضبط القواعد بشكل آمن.
