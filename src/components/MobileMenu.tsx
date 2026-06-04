import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, LayoutDashboard, PackageSearch, TrendingUp, ListTodo, BarChart2, Settings2, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMaster } from '../context/MasterContext';
import { useConfirm } from '../context/ConfirmContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { currentUser, logout } = useMaster();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: PackageSearch, label: 'Catalog', path: '/owner/inventory' },
    { icon: TrendingUp, label: 'Wishlist', path: '/explore' },
    { icon: ListTodo, label: 'Item Checklist', path: '/checklist' },
    { icon: BarChart2, label: 'Reports', path: '/reports' },
    { icon: Settings2, label: 'Settings', path: '/trip-settings' },
  ];

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Sign Out",
      message: "Are you sure you want to log out of your account?",
      isDestructive: true,
      confirmText: "Sign Out"
    });
    if (confirmed) {
      setOpen(false);
      logout();
      navigate('/login');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="md:hidden p-2 rounded-full bg-white/50 backdrop-blur-sm border border-slate-200/50 text-[#0D1B2E] shadow-sm hover:bg-slate-100 transition-colors">
          <Menu className="h-5 w-5" />
        </button>
      </DialogTrigger>
      {/* 
        Using DialogContent from Shadcn but customizing it to act like a slide-out drawer from the right.
        Since we might not have the Sheet component, we'll style DialogContent directly.
      */}
      <DialogContent className="md:hidden fixed inset-y-0 right-0 z-50 h-full w-[80%] max-w-sm flex flex-col p-0 gap-0 border-l border-none bg-white shadow-2xl rounded-l-3xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300 sm:max-w-sm transition-transform">
        <DialogHeader className="p-6 text-left border-b border-slate-100 shrink-0">
          <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-primary">JStip</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold text-sm uppercase tracking-wide",
                  isActive
                    ? "bg-[#0D1B2E] text-white shadow-md shadow-[#0D1B2E]/10"
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#0D1B2E]"
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 rounded-bl-3xl">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
              <AvatarFallback className="font-black bg-[#0D1B2E] text-white">
                {currentUser?.username?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#0D1B2E] truncate">{currentUser?.username || 'Merchant'}</p>
              <p className="text-[10px] font-medium text-slate-500 truncate">{currentUser?.email || 'Store Owner'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
