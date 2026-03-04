import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import { DASHBOARD_MENUS, ROLE_META } from './sidebarMenus';

function resolveRole(pathname, fallbackRole) {
  if (pathname.startsWith('/account')) return 'buyer';
  if (pathname.startsWith('/seller')) return 'seller';
  if (pathname.startsWith('/staff')) return 'staff';
  if (pathname.startsWith('/admin')) return 'admin';

  if (fallbackRole === 'SELLER') return 'seller';
  if (fallbackRole === 'STAFF') return 'staff';
  if (fallbackRole === 'ADMIN') return 'admin';
  return 'buyer';
}

export default function DashboardLayout({ title, subtitle, children }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const roleKey = useMemo(() => resolveRole(location.pathname, user?.role), [location.pathname, user?.role]);
  const roleMeta = ROLE_META[roleKey];
  const menuItems = DASHBOARD_MENUS[roleKey] || [];

  return (
    <div className="dashboard-shell min-h-screen pt-24 pb-16">
      <div className="max-w-360 mx-auto px-4 sm:px-6 lg:px-10">
        <div className="dashboard-grid">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
            items={menuItems}
            roleLabel={roleMeta.label}
            accent={roleMeta.accent}
            user={user}
          />

          <div className="dashboard-main min-w-0">
            <DashboardHeader onOpenSidebar={() => setSidebarOpen(true)} />
            <div className="pt-4 lg:pt-0">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
