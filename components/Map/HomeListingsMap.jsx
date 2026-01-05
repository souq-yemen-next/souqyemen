// components/Map/HomeListingsMap.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import Price from '@/components/Price';

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

function normalizeCoords(listing) {
  // coords: [lat,lng]
  if (Array.isArray(listing?.coords) && listing.coords.length === 2) return listing.coords;

  // coords: {lat,lng}
  if (listing?.coords?.lat && listing?.coords?.lng) return [listing.coords.lat, listing.coords.lng];

  return null;
}

export default function HomeListingsMap({ listings = [] }) {
  const wrapRef = useRef(null);
  const [map, setMap] = useState(null);

  const points = useMemo(() => {
    return listings
      .map((l) => {
        const c = normalizeCoords(l);
        if (!c) return null;
        return { ...l, _coords: c };
      })
      .filter(Boolean);
  }, [listings]);

  // اختيار مركز مناسب
  const center = useMemo(() => {
    if (points.length) return points[0]._coords;
    return DEFAULT_CENTER;
  }, [points]);

  // إصلاح مشكلة الخريطة المقطعة
  useEffect(() => {
    if (!map) return;

    const fix = () => {
      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 500);

      // لو عندنا نقاط، خليه يزوم عليها
      if (points.length) {
        try {
          const b = L.latLngBounds(points.map((p) => p._coords));
          map.fitBounds(b.pad(0.2));
        } catch {}
      }
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
  }, [map, points]);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>🗺️ عرض الإعلانات على الخريطة</div>

      <div
        ref={wrapRef}
        style={{
          width: '100%',
          height: 520,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
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

          {points.map((l) => (
            <Marker key={l.id} position={l._coords}>
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>
                    {l.title || 'إعلان'}
                  </div>

                  <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                    📍 {l.city || l.locationLabel || 'غير محدد'}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <Price priceYER={l.currentBidYER || l.priceYER || 0} />
                  </div>

                  <Link className="btn btnPrimary" href={`/listing/${l.id}`}>
                    فتح الإعلان
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        تظهر على الخريطة فقط الإعلانات التي فيها إحداثيات (coords).
      </div>
    </div>
  );
}
