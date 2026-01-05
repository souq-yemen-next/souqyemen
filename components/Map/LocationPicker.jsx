'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const YEMEN_BOUNDS = [
  [12.0, 41.0],
  [19.5, 54.7],
];
const DEFAULT_CENTER = [15.3694, 44.1910];

// يجيب اسم المكان من OSM
async function reverseName(lat, lng) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar`;
    const res = await fetch(url, {
      headers: {
        // مهم: بعض الأحيان Nominatim يحتاج User-Agent
        'User-Agent': 'sooqyemen/1.0 (contact: sooqyemen.com)',
      },
    });
    if (!res.ok) throw new Error('reverse failed');
    const data = await res.json();

    const a = data.address || {};
    const best =
      a.city ||
      a.town ||
      a.village ||
      a.suburb ||
      a.county ||
      a.state ||
      a.region ||
      a.country ||
      data.display_name;

    return best || '';
  } catch {
    return '';
  }
}

function ClickPicker({ value, onChange }) {
  const [loadingName, setLoadingName] = useState(false);

  useMapEvents({
    async click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      const inYemen =
        lat >= YEMEN_BOUNDS[0][0] &&
        lat <= YEMEN_BOUNDS[1][0] &&
        lng >= YEMEN_BOUNDS[0][1] &&
        lng <= YEMEN_BOUNDS[1][1];

      if (!inYemen) {
        alert('اختر موقع داخل اليمن فقط 🇾🇪');
        return;
      }

      setLoadingName(true);
      const name = await reverseName(lat, lng);
      setLoadingName(false);

      // لو ما قدر يجيب اسم، نرجع للإحداثيات
      const label =
        name?.trim() ||
        `Lat: ${lat.toFixed(5)} , Lng: ${lng.toFixed(5)}`;

      onChange([lat, lng], label);
    },
  });

  // تلميح صغير (اختياري)
  useEffect(() => {
    if (!loadingName) return;
  }, [loadingName]);

  return value ? <Marker position={value} /> : null;
}

export default function LocationPicker({ value, onChange }) {
  const wrapRef = useRef(null);
  const [map, setMap] = useState(null);

  const center = useMemo(() => {
    if (Array.isArray(value) && value.length === 2) return value;
    return DEFAULT_CENTER;
  }, [value]);

  // إصلاح المقاسات (منع التقطيع)
  useEffect(() => {
    if (!map) return;

    const fix = () => {
      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 500);
    };

    fix();

    let ro;
    if (wrapRef.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => fix());
      ro.observe(wrapRef.current);
    }

    window.addEventListener('resize', fix);

    return () => {
      window.removeEventListener('resize', fix);
      if (ro) ro.disconnect();
    };
  }, [map]);

  return (
    <div className="card" style={{ minHeight: 520 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>
        📍 اختر موقع الإعلان
      </div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        اضغط على الخريطة لتحديد الموقع (داخل اليمن)
      </div>

      <div
        ref={wrapRef}
        style={{
          height: 440,
          borderRadius: 14,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <MapContainer
          center={center}
          zoom={7}
          minZoom={6}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
          maxBounds={YEMEN_BOUNDS}
          maxBoundsViscosity={1.0}
          whenCreated={setMap}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <ClickPicker value={value} onChange={onChange} />
        </MapContainer>
      </div>

      {value ? (
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          ✅ {value[0].toFixed(5)} , {value[1].toFixed(5)}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          لم يتم اختيار موقع بعد
        </div>
      )}
    </div>
  );
}
