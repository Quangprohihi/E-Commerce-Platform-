import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Search, ShieldCheck, CheckCircle, Award, Sun, Glasses, RefreshCw, Monitor, Circle, Wrench } from 'lucide-react';
import ProductCard from '../components/ui/ProductCard';
import api from '../services/api';
import { mockProducts } from '../data/mockProducts';

export default function HomePage() {
  const heroRef = useRef(null);
  const featuredRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const imageY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const [featured, setFeatured] = useState([]);
  const [usedProducts, setUsedProducts] = useState([]);
  const [isFallback, setIsFallback] = useState(false);
  const [homeStats, setHomeStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const usedRef = useRef(null);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e?.preventDefault();
    const q = (searchQuery || '').trim();
    if (q) navigate(`/products?search=${encodeURIComponent(q)}`);
    else navigate('/products');
  };

  useEffect(() => {
    api.get('/stats/home').then((res) => setHomeStats(res.data?.data ?? null)).catch(() => setHomeStats(null));
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/products?limit=8').catch(() => ({ data: { data: { items: [] } } })),
      api.get('/products?condition=USED&limit=8').catch(() => ({ data: { data: { items: [] } } }))
    ]).then(([featRes, usedRes]) => {
      const featData = featRes.data?.data?.items || [];
      const usedData = usedRes.data?.data?.items || [];
      if (!featData.length) {
        setFeatured(mockProducts.slice(0, 6));
        setUsedProducts(mockProducts.slice(0, 6));
        setIsFallback(true);
      } else {
        setFeatured(featData);
        setUsedProducts(usedData.length ? usedData : featData.slice(0, 4));
        setIsFallback(false);
      }
    });
  }, []);

  const scrollFeatured = (dir = 1) => {
    if (!featuredRef.current) return;
    featuredRef.current.scrollBy({ left: dir * 360, behavior: 'smooth' });
  };

  const scrollUsed = (dir = 1) => {
    if (!usedRef.current) return;
    usedRef.current.scrollBy({ left: dir * 360, behavior: 'smooth' });
  };

  const openAI = () => {
    window.dispatchEvent(new CustomEvent('open-ai-chat'));
  };

  const ticker = 'KÍNH RÂM  •  GỌNG KÍNH  •  KÍNH CẬN  •  KÍNH THỜI TRANG  •  AI STYLIST  •  ';

  return (
    <div className="bg-background">
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden bg-background-alt pt-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(201,169,110,0.2),transparent_44%)]" aria-hidden />
        <div className="absolute -top-20 right-[12%] w-56 h-56 rounded-full glass animate-float hidden lg:block" aria-hidden />
        <div className="absolute bottom-12 left-[8%] w-36 h-36 rounded-full glass animate-float hidden lg:block" aria-hidden />
        <motion.div style={{ y }} className="absolute inset-0 flex items-center">
          <div className="max-w-360 mx-auto w-full px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <motion.div style={{ opacity }} className="lg:col-span-6 space-y-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[#7f786f]">Premium Eyewear Marketplace</p>
              <h1 className="font-serif text-[54px] sm:text-7xl md:text-8xl lg:text-[128px] font-semibold text-primary tracking-wide flex flex-col gap-4 sm:gap-6 md:gap-8 lg:gap-10">
                <span className="leading-[0.85]">KÍNH</span>
                <span className="leading-[0.85] pt-1">TỐT</span>
              </h1>
              <div className="h-px w-24 bg-black/20" />
              <p className="max-w-xl text-[#6f6961] text-base md:text-lg">
                Định hình phong cách cùng bộ sưu tập kính mắt thời thượng. Từ gọng kính thanh lịch đến kính râm sành điệu, Kính Tốt mang đến cho bạn diện mạo hoàn hảo và tự tin tỏa sáng mỗi ngày.
              </p>
              <form onSubmit={handleSearch} className="relative max-w-xl mt-6">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search size={18} className="text-[#a8a196]" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm kính râm, gọng kính..."
                  className="w-full pl-12 pr-32 py-4 rounded-full bg-white border border-black/5 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
                />
                <div className="absolute inset-y-1.5 right-1.5 flex items-center">
                  <button type="submit" className="h-full px-6 bg-accent hover:bg-[#c46c2d] text-white rounded-full text-xs uppercase tracking-wider font-semibold transition-colors">
                    Tìm kiếm
                  </button>
                </div>
              </form>
              <div className="flex flex-wrap items-center gap-4 md:gap-8 pt-4">
                <div className="flex items-center gap-2 text-[#7f786f]">
                  <ShieldCheck size={16} strokeWidth={1.5} />
                  <span className="text-xs font-medium tracking-wide">Xác thực người mua</span>
                </div>
                <div className="flex items-center gap-2 text-[#7f786f]">
                  <CheckCircle size={16} strokeWidth={1.5} />
                  <span className="text-xs font-medium tracking-wide">Bảo hành dài hạn</span>
                </div>
                <div className="flex items-center gap-2 text-[#7f786f]">
                  <Award size={16} strokeWidth={1.5} />
                  <span className="text-xs font-medium tracking-wide">Đánh giá minh bạch</span>
                </div>
              </div>
            </motion.div>
            <motion.div style={{ imageY }} className="lg:col-span-6 relative">
              <div className="aspect-4/5 md:aspect-5/4 rounded-4xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.15)]">
                <img
                  src="https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1600&q=80"
                  alt="Kính cao cấp"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 glass-strong rounded-2xl px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[#7f786f]">Đánh giá trung bình</p>
                <p className="font-serif text-2xl">4.9/5</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="overflow-hidden py-6 border-y border-black/5 bg-white/55">
        <motion.div
          className="whitespace-nowrap text-2xl md:text-4xl font-serif text-primary/35 tracking-[0.14em]"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        >
          <span>{ticker.repeat(3)}</span>
        </motion.div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-360 mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-end justify-between mb-10 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9a96e] mb-2">NỔI BẬT</p>
              <h2 className="font-serif text-3xl md:text-5xl font-semibold text-primary">
                Sản phẩm được yêu thích
              </h2>
              <div className="w-16 h-0.5 bg-accent mt-3" />
            </div>
            <div className="flex items-center gap-6">
              <Link to="/products" className="text-sm font-medium text-[#7f786f] hover:text-primary transition-colors hidden sm:block">
                Xem tất cả &rarr;
              </Link>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => scrollFeatured(-1)} className="w-10 h-10 rounded-full glass hover:bg-white/75 transition-colors">
                  <ArrowLeft size={16} className="mx-auto" />
                </button>
                <button type="button" onClick={() => scrollFeatured(1)} className="w-10 h-10 rounded-full glass hover:bg-white/75 transition-colors">
                  <ArrowRight size={16} className="mx-auto" />
                </button>
              </div>
            </div>
          </div>
          {isFallback ? (
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f786f] mb-4">Đang dùng dữ liệu demo</p>
          ) : null}
          <div ref={featuredRef} className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
            <div className="flex gap-6 md:gap-8 pb-4 snap-x snap-mandatory min-w-0">
              {featured.map((item) => (
                <div
                  key={item.id}
                  className="shrink-0 w-70 sm:w-80 snap-start"
                >
                  <ProductCard product={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background-alt">
        <div className="max-w-360 mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { to: '/products?category=kinh-ram', label: 'Kính râm', icon: Sun, getCount: (s) => s?.categories?.[0]?.count ?? '–' },
              { to: '/products?category=gong-kinh', label: 'Gọng kính', icon: Glasses, getCount: (s) => s?.categories?.[1]?.count ?? '–' },
              { to: '/products?condition=USED', label: 'Kính cũ', icon: RefreshCw, getCount: (s) => s?.usedCount ?? '–' },
              { to: '/products?lens=blue-light', label: 'Chống ánh sáng xanh', icon: Monitor, getCount: (s) => s?.blueLightCount ?? '–' },
              { to: '/products?category=trong-kinh', label: 'Tròng kính', icon: Circle, getCount: (s) => s?.categories?.[2]?.count ?? '–' },
              { to: '/products?category=phu-kien', label: 'Phụ kiện', icon: Wrench, getCount: (s) => s?.categories?.[3]?.count ?? '–' },
            ].map(({ to, label, icon: Icon, getCount }) => (
              <Link key={to} to={to} className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-background-alt flex items-center justify-center text-[#7f786f]">
                  <Icon size={24} strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-[#a8a196] mt-1">{typeof getCount(homeStats) === 'number' ? `${getCount(homeStats)} SP` : getCount(homeStats)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7f786f]">Sản phẩm</p>
              <p className="font-serif text-4xl mt-2">{homeStats?.totalProducts != null ? homeStats.totalProducts.toLocaleString('vi-VN') + (homeStats.totalProducts >= 1000 ? '+' : '') : '–'}</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7f786f]">Khách hàng</p>
              <p className="font-serif text-4xl mt-2">{homeStats?.totalCustomers != null ? homeStats.totalCustomers.toLocaleString('vi-VN') + (homeStats.totalCustomers >= 1000 ? '+' : '') : '–'}</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7f786f]">Đánh giá tích cực</p>
              <p className="font-serif text-4xl mt-2">{homeStats?.positiveReviewPercent != null ? `${homeStats.positiveReviewPercent}%` : '–'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="max-w-360 mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-end justify-between mb-10 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9a96e] mb-2">MARKETPLACE</p>
              <h2 className="font-serif text-3xl md:text-5xl font-semibold text-primary">
                Kính cũ chất lượng
              </h2>
              <div className="w-16 h-0.5 bg-accent mt-3" />
            </div>
            <div className="flex items-center gap-6">
              <Link to="/products?condition=USED" className="text-sm font-medium text-[#7f786f] hover:text-primary transition-colors hidden sm:block">
                Xem tất cả &rarr;
              </Link>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => scrollUsed(-1)} className="w-10 h-10 rounded-full glass hover:bg-white/75 transition-colors">
                  <ArrowLeft size={16} className="mx-auto" />
                </button>
                <button type="button" onClick={() => scrollUsed(1)} className="w-10 h-10 rounded-full glass hover:bg-white/75 transition-colors">
                  <ArrowRight size={16} className="mx-auto" />
                </button>
              </div>
            </div>
          </div>
          <div ref={usedRef} className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
            <div className="flex gap-6 md:gap-8 pb-4 snap-x snap-mandatory min-w-0">
              {usedProducts.map((item) => (
                <div key={item.id} className="shrink-0 w-70 sm:w-80 snap-start">
                  <ProductCard product={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
