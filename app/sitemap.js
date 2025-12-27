export default function sitemap() {
  const baseUrl = "https://sooqyemen.com";
  return [{ url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 }];
}
