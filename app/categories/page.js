// /app/categories/page.js
'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { db } from '@/lib/firebaseClient';

// قائمة الفئات الافتراضية
const DEFAULT_CATEGORIES = [
  { id: 'cars', name: 'سيارات', icon: '🚗', color: '#3b82f6' },
  { id: 'real_estate', name: 'عقارات', icon: '🏠', color: '#10b981' },
  { id: 'mobiles', name: 'موبايلات', icon: '📱', color: '#8b5cf6' },
  { id: 'electronics', name: 'إلكترونيات', icon: '💻', color: '#f59e0b' },
  { id: 'home', name: 'أثاث منزل', icon: '🛋️', color: '#ef4444' },
  { id: 'jobs', name: 'وظائف', icon: '💼', color: '#06b6d4' },
  { id: 'services', name: 'خدمات', icon: '🔧', color: '#84cc16' },
  { id: 'animals', name: 'حيوانات', icon: '🐕', color: '#f97316' },
  { id: 'clothing', name: 'ملابس', icon: '👕', color: '#8b5cf6' },
  { id: 'education', name: 'تعليم', icon: '🎓', color: '#06b6d4' },
  { id: 'health', name: 'صحة', icon: '🏥', color: '#ef4444' },
  { id: 'sports', name: 'رياضة', icon: '⚽', color: '#84cc16' },
];

export default function CategoriesPage() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // جلب عدد الإعلانات لكل فئة
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const promises = DEFAULT_CATEGORIES.map(async (cat) => {
          const snapshot = await db
            .collection('listings')
            .where('category', '==', cat.id)
            .where('isActive', '!=', false)
            .where('hidden', '!=', true)
            .get();
          return { [cat.id]: snapshot.size };
        });

        const results = await Promise.all(promises);
        const countsObj = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setCounts(countsObj);
      } catch (error) {
        console.error('Error fetching counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return (
    <>
      <Header />
      
      <div className="container" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        <div className="page-header">
          <div>
            <h1>تصفح حسب الفئة</h1>
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              اختر الفئة التي تريد استعراض إعلاناتها
            </p>
          </div>
          <Link href="/listings" className="btn">
            عرض جميع الإعلانات
          </Link>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>جاري تحميل الفئات...</p>
          </div>
        ) : (
          <div className="categories-grid">
            {DEFAULT_CATEGORIES.map((category) => (
              <Link
                key={category.id}
                href={`/listings?category=${category.id}`}
                className="category-card"
                style={{ 
                  '--category-color': category.color,
                  textDecoration: 'none'
                }}
              >
                <div className="category-icon" style={{ background: category.color + '20', color: category.color }}>
                  {category.icon}
                </div>
                <div className="category-info">
                  <h3 className="category-name">{category.name}</h3>
                  <div className="category-stats">
                    <span className="category-count">
                      {counts[category.id] || 0} إعلان
                    </span>
                  </div>
                </div>
                <div className="category-arrow">→</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          margin-top: 2rem;
        }
        
        .category-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .category-card:hover {
          border-color: var(--category-color);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }
        
        .category-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .category-info {
          flex: 1;
        }
        
        .category-name {
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 0.25rem 0;
        }
        
        .category-stats {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .category-count {
          font-size: 0.875rem;
          color: #64748b;
        }
        
        .category-arrow {
          color: #94a3b8;
          font-size: 1.25rem;
          opacity: 0;
          transform: translateX(-5px);
          transition: all 0.2s ease;
        }
        
        .category-card:hover .category-arrow {
          opacity: 1;
          transform: translateX(0);
          color: var(--category-color);
        }
        
        @media (max-width: 768px) {
          .categories-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 0.75rem;
          }
          
          .category-card {
            padding: 1rem;
          }
        }
      `}</style>
    </>
  );
}
