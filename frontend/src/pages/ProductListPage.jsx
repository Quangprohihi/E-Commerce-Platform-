import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, SlidersHorizontal, X, Search } from 'lucide-react';
import ProductCard from '../components/ui/ProductCard';
import { ProductCardSkeleton } from '../components/ui/SkeletonLoader';
import api from '../services/api';
import { filterMockProducts, mockProducts, sortProducts } from '../data/mockProducts';
import { addToCompare } from './ComparePage';
import { ATTR_TRANSLATIONS, translateAttr } from '../utils/translations';

export default function ProductListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], total: 0, isFallback: false });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '');

  const filters = {
    frameShape: searchParams.get('frameShape') || '',
    frameMaterial: searchParams.get('frameMaterial') || '',
    lensType: searchParams.get('lensType') || '',
    gender: searchParams.get('gender') || '',
    condition: searchParams.get('condition') || '',
    categoryId: searchParams.get('categoryId') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    search: searchParams.get('search') || '',
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.frameShape) params.set('frameShape', filters.frameShape);
    if (filters.frameMaterial) params.set('frameMaterial', filters.frameMaterial);
    if (filters.lensType) params.set('lensType', filters.lensType);
    if (filters.gender) params.set('gender', filters.gender);
    if (filters.condition) params.set('condition', filters.condition);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.search) params.set('search', filters.search);
    setLoading(true);
    api.get(`/products?${params}`)
      .then((res) => {
        const items = res.data?.data?.items || [];
        if (!items.length) {
          const fallback = sortProducts(filterMockProducts(mockProducts, filters), sortBy);
          setData({ items: fallback, total: fallback.length, isFallback: true });
          return;
        }
        const sorted = sortProducts(items, sortBy);
        setData({ items: sorted, total: sorted.length, isFallback: false });
      })
      .catch(() => {
        const fallback = sortProducts(filterMockProducts(mockProducts, filters), sortBy);
        setData({ items: fallback, total: fallback.length, isFallback: true });
      })
      .finally(() => setLoading(false));
  }, [searchParams, sortBy]);

  useEffect(() => {
    setLocalSearch(searchParams.get('search') || '');
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (localSearch.trim()) {
      params.set('search', localSearch.trim());
    } else {
      params.delete('search');
    }
    navigate(`/products?${params.toString()}`);
  };

  const filterOptions = [
    { key: 'frameShape', label: 'Hình dáng gọng', values: Object.keys(ATTR_TRANSLATIONS.frameShape) },
    { key: 'frameMaterial', label: 'Chất liệu gọng', values: Object.keys(ATTR_TRANSLATIONS.frameMaterial) },
    { key: 'lensType', label: 'Loại tròng kính', values: Object.keys(ATTR_TRANSLATIONS.lensType) },
    { key: 'gender', label: 'Giới tính', values: Object.keys(ATTR_TRANSLATIONS.gender) },
    { key: 'condition', label: 'Tình trạng', values: Object.keys(ATTR_TRANSLATIONS.condition) },
  ];

  const FilterContent = () => (
    <div className="space-y-6">
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search size={16} className="text-[#a8a196]" />
        </div>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Tìm sản phẩm..."
          className="w-full bg-white/70 border border-black/10 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/30"
        />
      </form>

      {filterOptions.map((group) => (
        <div key={group.key}>
          <p className="text-xs uppercase tracking-[0.18em] text-[#7f786f] mb-3">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.values.map((value) => {
              const active = filters[group.key] === value;
              const params = new URLSearchParams(searchParams);
              params.set(group.key, value);
              return (
                <Link
                  key={value}
                  to={`/products?${params.toString()}`}
                  className={`px-3 py-1.5 text-xs uppercase tracking-[0.12em] rounded-full border transition-colors ${
                    active
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white/60 border-black/10 text-primary hover:border-black/25'
                  }`}
                >
                  {translateAttr(group.key, value)}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#7f786f] mb-3">Khoảng giá</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Dưới 1tr', min: '', max: '1000000' },
            { label: '1tr - 1.5tr', min: '1000000', max: '1500000' },
            { label: '1.5tr - 2tr', min: '1500000', max: '2000000' },
            { label: 'Trên 2tr', min: '2000000', max: '' },
          ].map((item) => {
            const params = new URLSearchParams(searchParams);
            if (item.min) params.set('minPrice', item.min); else params.delete('minPrice');
            if (item.max) params.set('maxPrice', item.max); else params.delete('maxPrice');
            const active = filters.minPrice === item.min && filters.maxPrice === item.max;
            return (
              <Link
                key={item.label}
                to={`/products?${params.toString()}`}
                className={`px-3 py-1.5 text-xs rounded-full border text-center ${
                  active ? 'bg-primary text-white border-primary' : 'bg-white/60 border-black/10'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      <Link
        to="/products"
        className="inline-flex items-center justify-center w-full px-4 py-2 rounded-full border border-black/20 text-xs uppercase tracking-[0.16em] hover:bg-white/60 transition-colors"
      >
        Xóa bộ lọc
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-360 mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#7f786f] mb-5">
          <Link to="/" className="hover:text-primary">Trang chủ</Link>
          <span>/</span>
          <span className="text-primary">Sản phẩm</span>
        </div>

        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl md:text-5xl font-semibold text-primary">Sản phẩm</h1>
            <p className="text-sm text-text-muted mt-2">
              {loading ? 'Đang tải...' : `${data.total} sản phẩm`}
              {data.isFallback ? ' (demo mode)' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs uppercase tracking-[0.14em]"
            >
              <Filter size={14} />
              Bộ lọc
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-black/10 bg-white/65">
              <SlidersHorizontal size={14} />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent text-xs uppercase tracking-[0.12em] focus:outline-none"
              >
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="name-asc">Tên A-Z</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          <aside className="hidden lg:block glass rounded-2xl p-5 h-fit sticky top-24">
            <FilterContent />
          </aside>

          <div>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7">
                {data.items?.map((p) => (
                  <ProductCard key={p.id} product={p} onAddToCompare={(p) => addToCompare(p.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
        {!loading && (!data.items || data.items.length === 0) ? (
          <p className="text-text-muted mt-6">Chưa có sản phẩm phù hợp bộ lọc.</p>
        ) : null}
      </div>

      {mobileFiltersOpen ? (
        <div className="lg:hidden fixed inset-0 z-70 bg-black/30 backdrop-blur-sm p-4">
          <div className="glass-strong rounded-2xl p-4 h-full overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7f786f]">Bộ lọc</p>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="p-2 rounded-full hover:bg-white/60">
                <X size={16} />
              </button>
            </div>
            <FilterContent />
          </div>
        </div>
      ) : null}
    </div>
  );
}
