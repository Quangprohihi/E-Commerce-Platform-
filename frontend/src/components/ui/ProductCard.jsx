import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Scale } from 'lucide-react';
import { formatDisplayProductName } from '../../utils/productDisplay';

export default function ProductCard({ product, onAddToCompare }) {
  if (!product) return null;
  const images = Array.isArray(product.images) ? product.images : product.images ? [product.images] : [];
  const imageUrl = images[0] || 'https://placehold.co/800x600?text=Kinh+Tot';
  const price = product.salePrice ?? product.price;
  const hasSale = product.salePrice != null && product.salePrice < product.price;
  const displayPrice = typeof price === 'number' ? price : Number(price);
  const salePercent = hasSale
    ? Math.round(((Number(product.price) - Number(product.salePrice)) / Number(product.price)) * 100)
    : 0;
  const conditionLabel =
    product.condition === 'USED'
      ? 'Đã dùng'
      : product.condition === 'LIKE_NEW'
        ? 'Like new'
        : 'Mới';
  const showConditionPill = product.condition === 'USED' || product.condition === 'LIKE_NEW';
  const displayName = formatDisplayProductName(product.name);

  const addToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const raw = localStorage.getItem('cart');
      const cart = raw ? JSON.parse(raw) : [];
      const normalized = Array.isArray(cart) ? cart : [];
      const found = normalized.find((item) => item.id === product.id);
      if (found) {
        found.quantity = (Number(found.quantity) || 1) + 1;
      } else {
        normalized.push({
          id: product.id,
          name: displayName,
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
      // Silent fail for local demo mode
    }
  };

  return (
    <motion.article
      className="group relative glass rounded-2xl p-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36 }}
    >
      <Link to={`/products/${product.slug}`} className="block space-y-3">
        <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-stone-100">
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start max-w-[calc(100%-1.5rem)]">
            {hasSale ? (
              <span className="inline-flex items-center px-2.5 py-1 text-[11px] tracking-[0.12em] uppercase bg-primary text-white rounded-full">
                -{salePercent}%
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 text-[11px] tracking-[0.12em] uppercase bg-white/80 text-primary rounded-full border border-white/60">
                {conditionLabel}
              </span>
            )}
            {hasSale && showConditionPill ? (
              <span className="inline-flex items-center px-2.5 py-1 text-[11px] tracking-[0.12em] uppercase bg-white/80 text-primary rounded-full border border-white/60">
                {conditionLabel}
              </span>
            ) : null}
          </div>
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/20 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-contain object-center will-change-transform"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className="absolute left-4 right-4 bottom-4 z-20 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex gap-2">
            <button
              type="button"
              onClick={addToCart}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs uppercase tracking-[0.16em] bg-white/82 backdrop-blur-md border border-white/70 text-primary rounded-full hover:bg-white transition-colors"
            >
              <ShoppingBag size={14} strokeWidth={1.8} />
              Thêm giỏ
            </button>
            {onAddToCompare ? (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCompare(product); }}
                className="inline-flex items-center justify-center p-2.5 rounded-full bg-white/82 backdrop-blur-md border border-white/70 text-primary hover:bg-white transition-colors"
                title="So sánh"
                aria-label="So sánh"
              >
                <Scale size={14} strokeWidth={1.8} />
              </button>
            ) : null}
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="font-medium text-primary text-sm md:text-[15px] tracking-tight leading-snug truncate">
            {displayName}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-[#8f8a83] min-w-0">
            <span className="truncate min-w-0">
              {product.seller?.shopName || product.seller?.fullName || 'Kính Tốt'}
            </span>
            {product.seller?.location ? (
              <>
                <span className="shrink-0">•</span>
                <span className="truncate min-w-0">{product.seller.location}</span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-accent font-medium text-[15px]">
              {new Intl.NumberFormat('vi-VN').format(displayPrice)} đ
            </p>
            {hasSale ? (
              <span className="text-[#8f8a83] line-through text-sm">
                {new Intl.NumberFormat('vi-VN').format(Number(product.price))} đ
              </span>
            ) : null}
          </div>
          <div className="flex items-center pt-1 gap-1">
            <svg className="w-3.5 h-3.5 text-orange-400 fill-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span className="text-[13px] font-medium text-primary">{product.rating || '4.9'}</span>
            <span className="text-[13px] text-[#8f8a83]">({product.reviewCount || Math.floor(product.price / 10000) % 200 + 15})</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
