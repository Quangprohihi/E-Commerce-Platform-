import { Menu } from 'lucide-react';

export default function DashboardHeader({ onOpenSidebar }) {
  return (
    <header className="dashboard-header border-b border-black/10 lg:hidden">
      <div className="h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="h-9 w-9 rounded-lg border border-black/10 bg-white/70 flex items-center justify-center"
            onClick={onOpenSidebar}
            aria-label="Mở menu dashboard"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
