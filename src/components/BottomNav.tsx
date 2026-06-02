import { LayoutDashboard, PackageSearch, TrendingUp, PackagePlus, Settings2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const navItemsLeft = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: TrendingUp, label: 'Wishlist', path: '/explore' },
  ];

  const navItemsRight = [
    { icon: PackageSearch, label: 'Catalog', path: '/owner/inventory' },
    { icon: Settings2, label: 'Settings', path: '/trip-settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#0D1B2E]/10 bg-[#0D1B2E]/95 backdrop-blur-lg pb-safe">
      <div className="flex h-16 items-center justify-between px-4 max-w-md mx-auto relative">
        <div className="flex flex-1 justify-around">
          {navItemsLeft.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 transition-colors w-16 ${
                  isActive ? 'text-[#C9A84C]' : 'text-slate-500 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium tracking-tight">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute -top-1 h-1 w-8 rounded-full bg-[#C9A84C]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Center Prominent FAB for Add Product */}
        <div className="relative -top-5 flex justify-center w-20">
          <NavLink to="/owner/list-item" className="group">
            {({ isActive }) => (
              <div className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 border-4 border-[#0D1B2E]/20 bg-[#C9A84C] text-[#0D1B2E]",
                isActive ? "scale-105 shadow-xl" : "hover:scale-105"
              )}>
                <PackagePlus className="h-6 w-6" />
              </div>
            )}
          </NavLink>
        </div>

        <div className="flex flex-1 justify-around">
          {navItemsRight.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 transition-colors w-16 ${
                  isActive ? 'text-[#C9A84C]' : 'text-slate-500 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium tracking-tight">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute -top-1 h-1 w-8 rounded-full bg-[#C9A84C]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
