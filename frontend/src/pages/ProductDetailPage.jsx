import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ui/ProductCard';
import { ProductCardSkeleton } from '../components/ui/SkeletonLoader';
import { mockProducts } from '../data/mockProducts';
import { addToCompare } from './ComparePage';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFallback, setIsFallback] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`/products/${slug}`)
      .then((res) => {
        const item = res.data?.data;
        if (!item) throw new Error('not-found');
        setProduct(item);
        setIsFallback(false);
      })
      .catch(() => {
        const fallback = mockProducts.find((item) => item.slug === slug) || null;
        setProduct(fallback);
        setIsFallback(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    setActiveImage(0);
    setQuantity(1);
    const categoryId = product.categoryId || product.category?.id;
    api.get(`/products?categoryId=${categoryId}&limit=4`)
      .then((res) => {
        const items = (res.data?.data?.items || []).filter((item) => item.slug !== product.slug);
        if (!items.length) throw new Error('empty');
        setRelated(items.slice(0, 4));
      })
      .catch(() => {
        const fallback = mockProducts
          .filter((item) => item.slug !== product.slug && item.categoryId === categoryId)
          .slice(0, 4);
        setRelated(fallback);
      });
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
          <div className="h-4 w-40 bg-primary/10 rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="aspect-4/3 bg-primary/10 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 bg-primary/10 rounded" />
              <div className="h-5 w-1/3 bg-primary/10 rounded" />
              <div className="h-28 w-full bg-primary/10 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <p className="text-text-muted">Không tìm thấy sản phẩm.</p>
      </div>
    );
  }

  const images = Array.isArray(product.images) ? product.images : product.images ? [product.images] : [];
  const imageUrl = images[0] || 'https://placehold.co/800x600';
  const price = product.salePrice ?? product.price;
  const displayPrice = typeof price === 'number' ? price : Number(price);
  const categoryId = product.categoryId || product.category?.id;
  const stock = Number(product.stock || 0);
  const mainImage = images[activeImage] || imageUrl;

  const handleAddToCart = () => {
    if (stock === 0) return;
    try {
      const raw = localStorage.getItem('cart');
      const cart = raw ? JSON.parse(raw) : [];
      const normalized = Array.isArray(cart) ? cart : [];
      const found = normalized.find((item) => item.id === product.id);
      if (found) {
        found.quantity = (Number(found.quantity) || 1) + quantity;
      } else {
        normalized.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          images: product.images,
          price: Number(product.price),
          salePrice: product.salePrice != null ? Number(product.salePrice) : null,
          quantity,
        });
      }
      localStorage.setItem('cart', JSON.stringify(normalized));
      window.dispatchEvent(new Event('cart-updated'));
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1300);
    } catch {
      // Silent fail for local demo mode
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#7f786f] mb-6">
          <Link to="/" className="hover:text-primary">Trang chủ</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-primary">Sản phẩm</Link>
          <span>/</span>
          <span className="text-primary">{product.name}</span>
        </div>

        {isFallback ? (
          <p className="text-xs uppercase tracking-[0.14em] text-[#7f786f] mb-4">Đang dùng dữ liệu demo</p>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-[1.12fr_0.88fr] gap-10 md:gap-14 items-start">
          <div className="space-y-4">
            <div className="aspect-4/3 overflow-hidden rounded-[1.75rem] glass-shine bg-[#ece7df]">
              <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
            </div>
            {images.length > 1 ? (
              <div className="grid grid-cols-4 gap-3">
                {images.map((img, index) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`aspect-square overflow-hidden rounded-xl border ${
                      activeImage === index ? 'border-primary' : 'border-black/10'
                    }`}
                  >
                    <img src={img} alt={`${product.name}-${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="md:sticky md:top-24 space-y-6">
            <h1 className="font-serif text-3xl md:text-[42px] font-semibold text-primary leading-tight tracking-tight">
              {product.name}
            </h1>
            <p className="text-2xl font-medium text-accent">
              {new Intl.NumberFormat('vi-VN').format(displayPrice)} đ
            </p>
            {product.description && (
              <p className="text-text-muted whitespace-pre-wrap">{product.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Frame Shape', product.frameShape || '-'],
                ['Frame Material', product.frameMaterial || '-'],
                ['Lens Type', product.lensType || '-'],
                ['Condition', product.condition || '-'],
                ['Gender', product.gender || '-'],
                ['Stock', stock > 0 ? `${stock} sản phẩm` : 'Hết hàng'],
              ].map(([label, value]) => (
                <div key={label} className="glass rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#7f786f]">{label}</p>
                  <p className="text-sm mt-1">{value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center rounded-full border border-black/15 bg-white/70">
                <button
                  type="button"
                  className="w-10 h-10 inline-flex items-center justify-center"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center text-sm">{quantity}</span>
                <button
                  type="button"
                  className="w-10 h-10 inline-flex items-center justify-center"
                  onClick={() => setQuantity((q) => Math.min(stock || 99, q + 1))}
                >
                  <Plus size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-primary text-white text-xs uppercase tracking-[0.16em] hover:bg-primary-soft transition-colors disabled:opacity-60"
                disabled={stock === 0}
              >
                {justAdded ? 'Đã thêm' : 'Thêm vào giỏ'}
              </button>
              <button
                type="button"
                onClick={() => addToCompare(product.id)}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-black/15 bg-white/70 text-xs uppercase tracking-[0.16em] hover:bg-white transition-colors"
              >
                Thêm vào so sánh
              </button>
            </div>
          </div>
        </div>

        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl md:text-3xl">Sản phẩm liên quan</h2>
            <Link to={`/products?categoryId=${categoryId || ''}`} className="text-xs uppercase tracking-[0.14em] text-[#7f786f] hover:text-primary">
              Xem tất cả
            </Link>
          </div>
          {related.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} onAddToCompare={(p) => addToCompare(p.id)} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-7">
              {[1, 2, 3, 4].map((id) => (
                <ProductCardSkeleton key={id} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
