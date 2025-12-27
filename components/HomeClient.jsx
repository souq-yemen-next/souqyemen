"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import firebase, { auth, db } from "@/lib/firebase";
import { Icons } from "@/components/Icons";

let L = null;
if (typeof window !== "undefined") {
  L = require("leaflet");
  require("leaflet.markercluster");

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

const YEMEN_CENTER = [15.5527, 48.5164];
const DEFAULT_ZOOM = 6;

const formatNumber = (num) => {
  const n = Number(num || 0);
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
};

const CATEGORIES = [
  { id: "all", name: "الكل", icon: Icons.Grid },
  { id: "cars", name: "سيارات", icon: Icons.Car },
  { id: "real_estate", name: "عقارات", icon: Icons.Home },
  { id: "mobiles", name: "جوالات", icon: Icons.Smartphone },
  { id: "solar", name: "طاقة", icon: Icons.Zap },
  { id: "electronics", name: "إلكترونيات", icon: Icons.Monitor },
  { id: "furniture", name: "أثاث", icon: Icons.Armchair },
  { id: "fashion", name: "ملابس", icon: Icons.Shirt },
  { id: "motorcycles", name: "دراجات نارية", icon: Icons.Motorcycle },
  { id: "internet", name: "نت وشبكات", icon: Icons.Wifi },
  { id: "jobs", name: "وظائف", icon: Icons.Briefcase },
  { id: "maintenance", name: "صيانة", icon: Icons.Wrench },
  { id: "books", name: "كتب", icon: Icons.BookOpen },
  { id: "livestock", name: "مواشي", icon: Icons.PawPrint },
  { id: "yemeni_products", name: "منتجات يمنية", icon: Icons.ShoppingBag },
  { id: "others", name: "أخرى", icon: Icons.Grid },
];

const CITIES = ["صنعاء","عدن","تعز","الحديدة","إب","المكلا","حضرموت","ذمار","مأرب","عمران","الضالع","حجة","البيضاء","المهرة","سقطرى"];

const Logo = () => (
  <div className="flex items-center gap-2">
    <div className="bg-white p-1 rounded-lg shadow-sm">
      <span className="text-blue-700 font-black text-xl px-2">ي</span>
    </div>
    <h1 className="text-lg font-black text-white">سوق اليمن</h1>
  </div>
);

function InnerMap({ items }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined" || !L) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView(YEMEN_CENTER, DEFAULT_ZOOM);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(mapInstance.current);
      markers.current = L.markerClusterGroup ? L.markerClusterGroup() : L.featureGroup();
      markers.current.addTo(mapInstance.current);
    }

    if (markers.current) {
      markers.current.clearLayers();
      (items || []).forEach((item) => {
        if (item.coords && Array.isArray(item.coords) && item.coords.length === 2) {
          const m = L.marker(item.coords);
          const title = String(item.title || "");
          const city = String(item.city || "");
          const price = formatNumber(item.price);
          const currency = String(item.currency || "");
          m.bindPopup(`<b>${title}</b><br>${city}<br>${price} ${currency}`);
          markers.current.addLayer(m);
        }
      });
    }

    setTimeout(() => mapInstance.current?.invalidateSize(), 200);
  }, [items]);

  return <div ref={mapRef} className="w-full h-full min-h-[300px] rounded-xl z-0" />;
}

export default function HomeClient() {
  const [view, setView] = useState("home");
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = db.collection("listings").orderBy("createdAt", "desc").onSnapshot(
      (snapshot) => {
        setListings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching listings:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let res = listings;
    if (activeCat !== "all") res = res.filter((i) => i.category === activeCat);
    if (search) {
      const s = search.toLowerCase();
      res = res.filter((i) => String(i.title || "").toLowerCase().includes(s) || String(i.city || "").includes(search));
    }
    return res;
  }, [listings, activeCat, search]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await auth.signInWithEmailAndPassword(e.target.email.value, e.target.password.value);
      setShowAuthModal(false);
    } catch (err) {
      alert("فشل الدخول: " + err.message);
    }
  };

  const handleAddListing = async (e) => {
    e.preventDefault();
    if (!user) return alert("يرجى تسجيل الدخول أولاً");

    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());

    try {
      await db.collection("listings").add({
        title: data.title,
        price: Number(data.price || 0),
        currency: data.currency,
        category: data.category,
        city: data.city,
        phone: data.phone,
        coords: null,
        userId: user.uid,
        userName: user.displayName || user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        views: 0,
        likes: 0,
        image: "https://via.placeholder.com/800x500?text=Souq+Yemen",
      });
      setShowAddModal(false);
      alert("تم نشر الإعلان بنجاح!");
      e.target.reset();
    } catch (err) {
      alert("حدث خطأ: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 text-right" dir="rtl">
      <header className="bg-blue-700 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <button onClick={() => setView("home")} className="cursor-pointer"><Logo /></button>

            <div className="flex gap-2 items-center">
              {user ? (
                <>
                  <button onClick={() => setShowAddModal(true)} className="bg-yellow-400 text-blue-900 p-2 rounded-full shadow hover:bg-yellow-300" title="إضافة إعلان">
                    <Icons.Plus size={20} />
                  </button>
                  <img alt="user" src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || "user")}`} className="w-8 h-8 rounded-full border border-white" />
                </>
              ) : (
                <button onClick={() => setShowAuthModal(true)} className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-bold">دخول</button>
              )}

              <button onClick={() => setView(view === "map" ? "home" : "map")} className="bg-white/10 p-2 rounded-full" title={view === "map" ? "القائمة" : "الخريطة"}>
                {view === "map" ? <Icons.List size={20} /> : <Icons.Map size={20} />}
              </button>
            </div>
          </div>

          <div className="relative">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..." className="w-full bg-white/10 border border-white/20 text-white py-2 px-10 rounded-xl outline-none placeholder-blue-200 focus:bg-white focus:text-black transition" />
            <span className="absolute right-3 top-2.5 text-blue-200"><Icons.Search size={18} /></span>
          </div>
        </div>
      </header>

      {view !== "map" && (
        <nav className="bg-white border-b sticky top-[110px] z-40 shadow-sm overflow-x-auto hide-scrollbar">
          <div className="flex gap-4 p-3 min-w-max">
            {CATEGORIES.map((cat) => {
              const ActiveIcon = cat.icon;
              const active = activeCat === cat.id;
              return (
                <button key={cat.id} onClick={() => setActiveCat(cat.id)} className={`flex flex-col items-center min-w-[60px] gap-1 ${active ? "opacity-100 scale-105" : "opacity-60"}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${active ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-500"}`}>
                    <ActiveIcon size={24} />
                  </div>
                  <span className="text-[10px] font-bold">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <main className="container mx-auto px-4 py-4">
        {view === "map" ? (
          <div className="h-[75vh] bg-gray-200 rounded-xl overflow-hidden shadow border-4 border-white relative">
            <InnerMap items={filtered} />
            <button onClick={() => setView("home")} className="absolute top-4 right-4 bg-white px-4 py-2 rounded-lg shadow font-bold z-[1000]">القائمة</button>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="text-center py-20 text-gray-400">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-500">لا توجد إعلانات</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition overflow-hidden group cursor-pointer" onClick={() => alert("صفحة تفاصيل الإعلان: سنضيفها لاحقاً")}>
                    <div className="h-48 bg-gray-200 relative overflow-hidden">
                      <img alt={item.title || "ad"} src={item.image || "https://via.placeholder.com/800x500?text=Souq+Yemen"} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                        <Icons.MapPin size={10} /> {item.city || "-"}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-gray-900 line-clamp-1 mb-1">{item.title || "-"}</h3>
                      <div className="text-blue-600 font-bold">{formatNumber(item.price)} {item.currency || ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">تسجيل الدخول</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input name="email" type="email" placeholder="البريد" required className="w-full p-3 border rounded-xl" />
              <input name="password" type="password" placeholder="كلمة المرور" required className="w-full p-3 border rounded-xl" />
              <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">دخول</button>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">إضافة إعلان</h2>
            <form onSubmit={handleAddListing} className="space-y-4">
              <input name="title" placeholder="العنوان" required className="w-full p-3 border rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <input name="price" type="number" placeholder="السعر" required className="w-full p-3 border rounded-xl" />
                <select name="currency" className="w-full p-3 border rounded-xl">
                  <option value="YER">ريال يمني</option>
                  <option value="SAR">ريال سعودي</option>
                  <option value="USD">دولار</option>
                </select>
              </div>

              <select name="category" className="w-full p-3 border rounded-xl" defaultValue="cars">
                {CATEGORIES.filter((c) => c.id !== "all").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select name="city" className="w-full p-3 border rounded-xl" defaultValue={CITIES[0]}>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <input name="phone" placeholder="رقم الهاتف" required className="w-full p-3 border rounded-xl" />
              <button className="w-full bg-yellow-400 text-blue-900 py-3 rounded-xl font-bold">نشر</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
