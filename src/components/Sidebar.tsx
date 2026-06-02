import { LayoutDashboard, PackageSearch, TrendingUp, PackagePlus, BarChart2, Settings2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const navItems = [
    { icon: LayoutDashboard, label: 'Hub', path: '/' },
    { icon: TrendingUp, label: 'Wishlist', path: '/explore' },
    { icon: PackageSearch, label: 'Catalog', path: '/owner/inventory' },
    { icon: BarChart2, label: 'Reports', path: '/reports' },
    { icon: Settings2, label: 'Settings', path: '/trip-settings' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r bg-[#0D1B2E] z-40">
      {/* Branding Header */}
      <div className="h-20 flex items-center px-6 border-b border-white/10">
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-[#C9A84C]">JStip</h2>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative font-bold text-sm uppercase tracking-wide",
                isActive
                  ? "bg-[#C9A84C]/15 text-[#C9A84C]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-[#C9A84C]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className="h-5 w-5" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Primary Action Button */}
      <div className="p-4 border-t border-white/10">
        <NavLink
          to="/owner/list-item"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-[#C9A84C] text-[#0D1B2E] font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
        >
          <PackagePlus className="h-5 w-5" />
          <span>Add Product</span>
        </NavLink>
      </div>
    </aside>
  );
}

