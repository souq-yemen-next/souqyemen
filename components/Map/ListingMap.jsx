// components/Map/ListingMap.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths (works on Next.js)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// حدود اليمن تقريبية (لمنع التمادي بالخريطة بعيد)
const YEMEN_BOUNDS = [
  [12.0, 41.0],
  [19.5, 54.7],
];

// مركز افتراضي (صنعاء تقريباً)
const DEFAULT_CENTER = [15.3694, 44.1910];

export default function ListingMap({ coords, label }) {
  const wrapRef = useRef(null);
  const [map, setMap] = useState(null);

  const center = useMemo(() => {
    return Array.isArray(coords) && coords.length === 2 ? coords : DEFAULT_CENTER;
  }, [coords]);

  const zoom = coords ? 13 : 7;

  // إصلاح مشكلة البلاطات المقطعة / التحجيم داخل Grid/Responsive
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
    <div className="card">
      <div style={{ fontWeight: 800, marginBottom: 8 }}>الموقع على الخريطة</div>

      <div
        ref={wrapRef}
        style={{
          height: 320,
          borderRadius: 14,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <MapContainer
          center={center}
          zoom={zoom}
          minZoom={6}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
          whenCreated={setMap}
          maxBounds={YEMEN_BOUNDS}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {coords ? (
            <Marker position={center}>
              <Popup>{label || 'موقع الإعلان'}</Popup>
            </Marker>
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
