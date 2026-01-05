/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      // Firebase Storage
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      // Google user photos (أحيانًا تظهر في حسابات جوجل)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // لو عندك صور على دومين موقعك داخل public أو عبر CDN مستقبلًا
      {
        protocol: 'https',
        hostname: 'sooqyemen.com',
      },
      {
        protocol: 'https',
        hostname: 'www.sooqyemen.com',
      },
    ],
  },
};

export default nextConfig;
