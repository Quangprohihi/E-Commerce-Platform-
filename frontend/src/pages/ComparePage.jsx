import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Scale, ShoppingBag, ArrowLeft, X, Trash2 } from 'lucide-react';
import api from '../services/api';

const COMPARE_IDS_KEY = 'compareIds';

export function getCompareIds() {
  try {
    const raw = sessionStorage.getItem(COMPARE_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function addToCompare(productId) {
  const ids = getCompareIds();
  if (ids.includes(productId) || ids.length >= 3) return ids;
  const next = [...ids, productId];
  sessionStorage.setItem(COMPARE_IDS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('compare-updated'));
  return next;
}

export function removeFromCompare(productId) {
  const ids = getCompareIds().filter((id) => id !== productId);
  sessionStorage.setItem(COMPARE_IDS_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event('compare-updated'));
  return ids;
}

export function clearCompare() {
  sessionStorage.removeItem(COMPARE_IDS_KEY);
  window.dispatchEvent(new Event('compare-updated'));
}

export default function ComparePage() {
  const [searchParams] = useSearchParams();
  const [ids, setIds] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fromUrl = searchParams.get('ids');
    const list = fromUrl ? fromUrl.split(',').filter(Boolean) : getCompareIds();
    setIds(list.slice(0, 3));
  }, [searchParams]);

  useEffect(() => {
    if (ids.length < 2) return;
    setLoading(true);
    setError(null);
    api
      .post('/ai/compare', { productIds: ids })
      .then((res) => {
        setData(res.data?.data || null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Không thể so sánh. Vui lòng thử lại.');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [ids.join(',')]);

  const addToCart = (product) => {
    try {
      const raw = localStorage.getItem('cart');
      const cart = raw ? JSON.parse(raw) : [];
      const normalized = Array.isArray(cart) ? cart : [];
      const found = normalized.find((item) => item.id === product.id);
      if (found) {
        found.quantity = (Number(found.quantity) || 0) + 1;
      } else {
        normalized.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          images: product.images,
          price: Number(product.price),
          salePrice: product.salePrice != null ? Number(product.salePrice) : null,
          quantity: 1,
        });
      }
      localStorage.setItem('cart', JSON.stringify(normalized));
      window.dispatchEvent(new Event('cart-updated'));
    } catch {
      // silent
    }
  };

  if (ids.length < 2) {
    const hasOne = ids.length === 1;
    const handleRemoveLast = () => {
      if (ids[0]) removeFromCompare(ids[0]);
      setIds(getCompareIds());
    };
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
            <Scale size={32} strokeWidth={1.5} />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-primary mb-2">So sánh sản phẩm</h1>
          <p className="text-text-muted mb-6">Chọn 2 hoặc 3 sản phẩm để so sánh bằng AI.</p>
          {hasOne ? (
            <p className="text-sm text-primary/80 mb-4">Bạn đang có 1 sản phẩm trong danh sách so sánh. Gỡ để so sánh bộ khác.</p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3">
            {hasOne ? (
              <button
                type="button"
                onClick={handleRemoveLast}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/15 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
                Gỡ sản phẩm này
              </button>
            ) : null}
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-soft transition-colors"
            >
              <ArrowLeft size={18} strokeWidth={1.5} />
              Xem sản phẩm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-48 bg-primary/10 rounded" />
            <div className="h-24 w-full bg-primary/10 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].slice(0, ids.length).map((i) => (
                <div key={i} className="h-64 bg-primary/10 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary mb-4">{error}</p>
          <Link to="/products" className="text-primary underline hover:no-underline">Quay lại danh sách sản phẩm</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, prosCons, products } = data;
  const getProsCons = (productId) => prosCons.find((c) => c.productId === productId) || { pros: '', cons: '', bestFor: '' };

  const handleRemoveOne = (productId) => {
    removeFromCompare(productId);
    setIds(getCompareIds());
  };

  const handleClearAll = () => {
    clearCompare();
    setIds([]);
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-full bg-primary/10 text-primary">
              <Scale size={22} strokeWidth={1.5} />
            </span>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-primary">So sánh bằng AI</h1>
              <p className="text-sm text-text-muted">Gợi ý từ chuyên gia Kính Tốt</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/15 text-sm text-primary hover:bg-primary/5 transition-colors"
          >
            <Trash2 size={16} strokeWidth={1.5} />
            Xóa hết và so sánh bộ mới
          </button>
        </div>

        {summary && (
          <div className="glass rounded-2xl p-5 mb-8">
            <p className="text-primary leading-relaxed">{summary}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const pc = getProsCons(product.id);
            const images = Array.isArray(product.images) ? product.images : product.images ? [product.images] : [];
            const imageUrl = images[0] || 'https://placehold.co/800x600?text=Kinh+Tot';
            const price = product.salePrice ?? product.price;
            const displayPrice = typeof price === 'number' ? price : Number(price);

            return (
              <div key={product.id} className="glass rounded-2xl overflow-hidden relative">
                <button
                  type="button"
                  onClick={() => handleRemoveOne(product.id)}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  title="Gỡ khỏi so sánh"
                  aria-label="Gỡ khỏi so sánh"
                >
                  <X size={16} strokeWidth={2} />
                </button>
                <Link to={`/products/${product.slug}`} className="block p-4 border-b border-black/10">
                  <div className="aspect-4/3 rounded-xl bg-[#efebe5] overflow-hidden mb-3">
                    <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-medium text-primary truncate">{product.name}</h3>
                  <p className="text-accent font-medium mt-1">{new Intl.NumberFormat('vi-VN').format(displayPrice)} đ</p>
                </Link>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-[#7f786f] mb-1">Ưu điểm</p>
                    <p className="text-sm text-primary">{pc.pros || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-[#7f786f] mb-1">Nhược điểm</p>
                    <p className="text-sm text-primary">{pc.cons || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-[#7f786f] mb-1">Phù hợp với</p>
                    <p className="text-sm text-primary">{pc.bestFor || '—'}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link
                      to={`/products/${product.slug}`}
                      className="flex-1 text-center py-2.5 text-sm font-medium rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                    >
                      Xem chi tiết
                    </Link>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-full bg-primary text-white hover:bg-primary-soft transition-colors"
                    >
                      <ShoppingBag size={16} strokeWidth={1.5} />
                      Thêm giỏ
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/15 text-primary text-sm hover:bg-primary/5 transition-colors"
          >
            <Trash2 size={18} strokeWidth={1.5} />
            Xóa hết và so sánh bộ mới
          </button>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
            Thêm sản phẩm khác để so sánh
          </Link>
        </div>
      </div>
    </div>
  );
}
