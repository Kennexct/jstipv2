import { LayoutDashboard, PackageSearch, TrendingUp, PackagePlus, BarChart2, Settings2, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useMaster } from '../context/MasterContext';
import { useConfirm } from '../context/ConfirmContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function Sidebar() {
  const { currentUser, logout } = useMaster();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const navItems = [
    { icon: LayoutDashboard, label: 'Hub', path: '/' },
    { icon: TrendingUp, label: 'Wishlist', path: '/explore' },
    { icon: PackageSearch, label: 'Catalog', path: '/owner/inventory' },
    { icon: BarChart2, label: 'Reports', path: '/reports' },
    { icon: Settings2, label: 'Settings', path: '/trip-settings' },
  ];

  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "Sign Out",
      message: "Are you sure you want to log out of your account?",
      isDestructive: true,
      confirmText: "Sign Out"
    });
    if (confirmed) {
      logout();
      navigate('/login');
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r bg-secondary z-40">
      {/* Branding Header */}
      <div className="h-20 flex items-center px-6 border-b border-white/10 shrink-0">
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-primary">JStip</h2>
      </div>

      {/* Primary Action Button - MOVED TO TOP */}
      <div className="p-4 shrink-0">
        <NavLink
          to="/owner/list-item"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
        >
          <PackagePlus className="h-5 w-5" />
          <span>Add Product</span>
        </NavLink>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto scrollbar-hide">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative font-bold text-sm uppercase tracking-wide",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary"
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

      {/* Profile and Logout Section */}
      <div className="p-4 border-t border-white/10 shrink-0">
        <div 
          className="flex items-center gap-3 px-2 py-2 rounded-2xl transition-colors"
        >
          <Avatar className="h-10 w-10 border-2 border-transparent">
            <AvatarFallback className="font-black bg-primary text-primary-foreground">
              {currentUser?.username?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{currentUser?.username || 'Merchant'}</p>
            <p className="text-[10px] font-medium text-slate-400 truncate">{currentUser?.email || 'Store Owner'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
