export const metadata = {
  title: "سوق اليمن | بيع وشراء كل شيء",
  description: "سوق اليمن - منصة إعلانات للبيع والشراء في اليمن",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
