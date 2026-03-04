import { Link, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

function SidebarItems({ items, accent, onNavigate }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, index) => {
        if (item.section) {
          return (
            <p key={`${item.section}-${index}`} className="sidebar-section">
              {item.section}
            </p>
          );
        }

        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            end={item.to === '/account' || item.to === '/seller' || item.to === '/staff' || item.to === '/admin'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
            style={({ isActive }) => (isActive
              ? {
                background: `${accent}18`,
                color: accent,
                borderColor: `${accent}4d`,
              }
              : undefined)}
          >
            <Icon size={17} strokeWidth={1.7} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}

export default function Sidebar({ isOpen, onClose, items, roleLabel, accent, user }) {
  const panel = (
    <aside className="dashboard-sidebar glass">
      <div className="p-4 border-b border-black/8">
        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{roleLabel} Panel</p>
        <p className="font-serif text-2xl text-primary mt-1">Kính Tốt</p>
        <div className="mt-3 rounded-xl border border-black/10 bg-white/55 px-3 py-2">
          <p className="text-xs text-text-muted">Đăng nhập</p>
          <p className="text-sm text-primary truncate">{user?.fullName || 'Người dùng'}</p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto scrollbar-thin">
        <SidebarItems items={items} accent={accent} onNavigate={onClose} />
      </div>

      <div className="p-4 border-t border-black/8">
        <Link to="/" className="sidebar-link">
          <span>Về trang chủ</span>
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block">{panel}</div>

      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.button
              type="button"
              className="sidebar-overlay lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-label="Đóng menu dashboard"
            />
            <motion.div
              className="fixed top-0 left-0 bottom-0 z-71 w-70 lg:hidden"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'tween', duration: 0.24 }}
            >
              {panel}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
