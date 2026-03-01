import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useScrollPosition } from '../../hooks/useScrollPosition';
import { Search, ShoppingBag, User, Menu, X, MessageCircle, Scale } from 'lucide-react';
import { getCompareIds } from '../../pages/ComparePage';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getRoleHomePath } from '../../utils/auth';

export default function Navbar({ onOpenAIChat }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { isAuthenticated, role, logout } = useAuth();
  const scrollY = useScrollPosition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [compareCount, setCompareCount] = useState(() => getCompareIds().length);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (location.pathname === '/products') {
      const q = searchParams.get('search') || '';
      setSearchQuery(q);
    }
  }, [location.pathname, location.search, searchParams]);
  const isScrolled = scrollY > 20;
  const accountPath = isAuthenticated ? (role === 'BUYER' ? '/account' : getRoleHomePath(role)) : '/login';

  const handleSearch = (e) => {
    e?.preventDefault();
    const q = (searchQuery || '').trim();
    if (q) navigate(`/products?search=${encodeURIComponent(q)}`);
    else navigate('/products');
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    const syncCartCount = () => {
      try {
        const raw = localStorage.getItem('cart');
        if (!raw) return setCartCount(0);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const total = parsed.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
          setCartCount(total);
          return;
        }
      } catch {
        setCartCount(0);
      }
      return setCartCount(0);
    };
    syncCartCount();
    window.addEventListener('storage', syncCartCount);
    window.addEventListener('cart-updated', syncCartCount);
    return () => {
      window.removeEventListener('storage', syncCartCount);
      window.removeEventListener('cart-updated', syncCartCount);
    };
  }, []);

  const syncCompareCount = () => setCompareCount(getCompareIds().length);
  useEffect(() => {
    syncCompareCount();
    window.addEventListener('compare-updated', syncCompareCount);
    return () => window.removeEventListener('compare-updated', syncCompareCount);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'glass border-b border-black/5' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-360 mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="inline-flex items-center gap-2 font-serif text-xl md:text-2xl font-semibold tracking-[0.14em] text-primary">
            <svg width="24" height="14" viewBox="0 0 90 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <ellipse cx="23" cy="22" rx="15" ry="11" stroke="currentColor" strokeWidth="2" />
              <ellipse cx="67" cy="22" rx="15" ry="11" stroke="currentColor" strokeWidth="2" />
              <path d="M38 22L52 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            KÍNH TỐT
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/products" className="text-xs uppercase tracking-[0.22em] text-primary/80 hover:text-accent transition-colors shrink-0">
              Sản phẩm
            </Link>
            <form onSubmit={handleSearch} className="flex items-center gap-0 rounded-full border border-black/15 bg-white/70 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all min-w-[180px] max-w-[240px]">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm sản phẩm..."
                className="w-full bg-transparent py-2 pl-4 pr-10 text-sm text-primary placeholder:text-primary/50 outline-none rounded-l-full"
                aria-label="Tìm sản phẩm"
              />
              <button type="submit" className="p-2 text-primary/70 hover:text-primary shrink-0 rounded-r-full" aria-label="Tìm kiếm">
                <Search size={18} strokeWidth={1.5} />
              </button>
            </form>
            <Link to="/cart" className="relative p-2 text-primary/80 hover:text-accent transition-colors" aria-label="Giỏ hàng">
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] leading-4 text-white bg-primary text-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              ) : null}
            </Link>
            {compareCount >= 2 ? (
              <Link to="/compare" className="relative p-2 text-primary/80 hover:text-accent transition-colors" aria-label="So sánh sản phẩm">
                <Scale size={20} strokeWidth={1.5} />
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] leading-4 text-white bg-primary text-center">
                  {compareCount}
                </span>
              </Link>
            ) : null}
            <button type="button" onClick={onOpenAIChat} className="p-2 text-primary/80 hover:text-accent transition-colors" aria-label="AI Stylist">
              <MessageCircle size={20} strokeWidth={1.5} />
            </button>
            <Link to={accountPath} className="p-2 text-primary/80 hover:text-accent transition-colors" aria-label="Tài khoản">
              <User size={20} strokeWidth={1.5} />
            </Link>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs uppercase tracking-[0.14em] px-4 h-9 rounded-full border border-black/20 hover:bg-white/70 transition-colors"
              >
                Đăng xuất
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className="md:hidden p-2 text-primary/90"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.24 }}
              className="md:hidden py-4 border-t border-black/10 glass rounded-2xl mb-4"
            >
              <div className="flex flex-col gap-4 px-4">
                <form onSubmit={(e) => { handleSearch(e); setMenuOpen(false); }} className="flex items-center gap-0 rounded-full border border-black/15 bg-white/80 min-w-0">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm sản phẩm..."
                    className="w-full bg-transparent py-2.5 pl-4 pr-10 text-sm text-primary placeholder:text-primary/50 outline-none rounded-l-full"
                    aria-label="Tìm sản phẩm"
                  />
                  <button type="submit" className="p-2 text-primary/70 shrink-0 rounded-r-full" aria-label="Tìm kiếm">
                    <Search size={18} strokeWidth={1.5} />
                  </button>
                </form>
                <Link to="/products" className="text-sm uppercase tracking-[0.18em] text-primary/85 hover:text-accent" onClick={() => setMenuOpen(false)}>
                  Sản phẩm
                </Link>
                <Link to="/cart" className="text-sm uppercase tracking-[0.18em] text-primary/85 hover:text-accent" onClick={() => setMenuOpen(false)}>
                  Giỏ hàng
                </Link>
                {compareCount >= 2 ? (
                  <Link to="/compare" className="text-sm uppercase tracking-[0.18em] text-primary/85 hover:text-accent" onClick={() => setMenuOpen(false)}>
                    So sánh ({compareCount})
                  </Link>
                ) : null}
                <button type="button" onClick={() => { setMenuOpen(false); onOpenAIChat?.(); }} className="text-left text-sm uppercase tracking-[0.18em] text-primary/85 hover:text-accent">
                  AI Stylist
                </button>
                <Link to={accountPath} className="text-sm uppercase tracking-[0.18em] text-primary/85 hover:text-accent" onClick={() => setMenuOpen(false)}>
                  {isAuthenticated ? 'Tài khoản' : 'Đăng nhập'}
                </Link>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-left text-sm uppercase tracking-[0.18em] text-primary/85 hover:text-accent"
                  >
                    Đăng xuất
                  </button>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </nav>
    </header>
  );
}
