import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus, 
  Settings, 
  TrendingUp, 
  Package, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Wallet,
  MoreVertical,
  ChevronRight,
  Sparkles,
  MapPin,
  Receipt,
  ShoppingCart,
  X,
  Trash2,
  ClipboardCheck,
  DollarSign,
  PlusCircle,
  PackageCheck,
  Search,
  LogOut
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useMaster } from '../context/MasterContext';
import { useConfirm } from '../context/ConfirmContext';

const EXPENSE_CURRENCIES = [
  { code: 'KRW', symbol: '₩', rate: 11.7 },
  { code: 'IDR', symbol: 'Rp', rate: 1.0 },
  { code: 'SGD', symbol: 'S$', rate: 13500 },
  { code: 'USD', symbol: '$', rate: 16000 },
];

export function OwnerDashboard() {
  const navigate = useNavigate();

  const {
    loading,
    currentUser,
    expenses,
    sales,
    catalogItems,
    wishlistItems,
    tripSettings,
    saveExpense,
    saveSale,
    saveWishlist,
    saveItem,
    removeSale,
    removeExpense,
    logout
  } = useMaster();

  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [editActivityForm, setEditActivityForm] = useState({
    customerName: '',
    total: 0,
    description: '',
    amount: 0
  });

  const confirm = useConfirm();

  // Compute stats dynamically
  const totalSales = sales.reduce((acc, sale) => acc + (sale.total || 0), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
  const netEarnings = totalSales - totalExpenses;
  const expectedRevenue = wishlistItems.reduce((acc, item) => acc + ((item.sellPrice || item.price || 0) * (item.qty || 1)), 0);

  // Combine and sort activities (newest first based on timestamp in ID)
  const allActivities = [
    ...sales.map(s => ({ ...s, type: 'sale' as const })),
    ...expenses.map(e => ({ ...e, type: 'expense' as const }))
  ].sort((a, b) => {
    const timeA = parseInt(a.id.split('_')[1] || '0');
    const timeB = parseInt(b.id.split('_')[1] || '0');
    return timeB - timeA;
  });

  const activeTrip = {
    origin: tripSettings?.trip?.origin || 'Seoul',
    destination: tripSettings?.trip?.destination || 'Jakarta',
    date: tripSettings?.trip?.date || '22 May 2026',
    weightUsed: 5.2,
    weightLimit: tripSettings?.trip?.weightLimit || 15,
    requests: sales.length,
    revenue: expectedRevenue,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/5">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Hub Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f5f7] pb-24 font-sans">
      
      {/* 1. Header & Profile */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between">
        <Dialog>
          <DialogTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer group">
              <Avatar className="h-11 w-11 border-2 border-transparent ring-2 ring-primary/20 transition-all group-hover:ring-primary/50">
                <AvatarFallback className="font-black bg-[#e2e8f0] text-[#163300]">
                  {(currentUser?.businessName || currentUser?.username || 'JF').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account</span>
                <span className="text-sm font-black text-[#163300] leading-none">
                  {currentUser?.businessName || currentUser?.username}
                </span>
              </div>
            </div>
          </DialogTrigger>
          <DialogContent>
              <DialogHeader className="text-left pb-2">
                <DialogTitle className="text-xl font-black text-[#163300]">
                  Account Details
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 font-medium">
                  Manage your merchant profile and settings.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#f2f5f7]">
                  <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                    <AvatarFallback className="font-black text-xl bg-[#e2e8f0] text-[#163300]">
                      {(currentUser?.businessName || currentUser?.username || 'JF').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-[#163300] leading-none">
                      {currentUser?.businessName || currentUser?.username}
                    </h3>
                    <p className="text-sm font-semibold text-slate-500">@{currentUser?.username}</p>
                    <Badge className="mt-1 bg-[#163300] text-white hover:bg-[#163300] border-none font-bold">
                      Active
                    </Badge>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={async () => {
                      const confirmed = await confirm({
                        message: "Are you sure you want to log out?",
                        isDestructive: true,
                        confirmText: "Sign Out"
                      });
                      if (confirmed) {
                        logout();
                        navigate('/login');
                      }
                    }} 
                    className="pill-button w-full h-14 bg-red-50 text-red-600 hover:bg-red-100 font-bold gap-2"
                  >
                    <LogOut className="h-5 w-5" /> Sign Out
                  </Button>
                </div>
              </div>
          </DialogContent>
        </Dialog>

      </header>

      {/* 2. Massive Balance Section */}
      <section className="px-6 py-6 space-y-1">
        <p className="text-sm font-bold text-slate-500 tracking-wide">Net Earnings</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-[#163300]">Rp</span>
          <h1 className="text-[2.75rem] font-black text-[#163300] tracking-tight leading-none">
            {netEarnings.toLocaleString()}
          </h1>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Badge className="bg-[#9fe870] text-[#163300] hover:bg-[#9fe870] border-none font-bold text-xs py-1 px-3 shadow-sm">
            <TrendingUp className="h-3.5 w-3.5 mr-1" />
            Active Trip: {activeTrip.origin}
          </Badge>
        </div>
      </section>

      {/* 3. Quick Action Pills (Horizontal Scroll) */}
      <section className="px-6 py-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
          <Button 
            onClick={() => navigate('/owner/inventory')}
            className="pill-button h-14 px-6 bg-[#9fe870] text-[#163300] hover:bg-[#8ade60] shadow-sm shrink-0"
          >
            <Package className="h-5 w-5" />
            Catalog
          </Button>
          <Button 
            onClick={() => navigate('/explore')}
            className="pill-button h-14 px-6 bg-[#163300] text-white hover:bg-[#1f4700] shadow-sm shrink-0"
          >
            <Sparkles className="h-5 w-5" />
            Wishlist Requests
          </Button>
          <Button 
            onClick={() => navigate('/reports')}
            className="pill-button h-14 px-6 bg-white text-[#163300] hover:bg-slate-50 border border-slate-200 shadow-sm shrink-0"
          >
            <Receipt className="h-5 w-5" />
            Analytics
          </Button>
          <Button 
            onClick={() => navigate('/ledger')}
            className="pill-button h-14 px-6 bg-white text-[#163300] hover:bg-slate-50 border border-slate-200 shadow-sm shrink-0"
          >
            <ClipboardCheck className="h-5 w-5" />
            Ledger
          </Button>
          <Button 
            onClick={() => navigate('/trip-settings')}
            className="pill-button h-14 px-6 bg-white text-[#163300] hover:bg-slate-50 border border-slate-200 shadow-sm shrink-0"
          >
            <Settings className="h-5 w-5" />
            Trip Settings
          </Button>
        </div>
      </section>

      {/* 4. Combined Activity Feed */}
      <main className="px-6 pt-2 space-y-6">
        
        {/* Active Trip Info Card */}
        <div className="fintech-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-[#163300] text-lg">Trip Status</h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{activeTrip.date}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manual Rate</p>
              <p className="font-black text-[#163300] text-lg">Rp {tripSettings?.currency?.manualRate?.toLocaleString() || '13,500'}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orders</p>
              <p className="font-black text-[#163300] text-lg">{activeTrip.requests}</p>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#163300] px-1">Recent Activity</h3>
          
          <div className="space-y-3">
            {allActivities.length === 0 && (
              <p className="text-xs font-semibold text-slate-400 text-center py-4">No recent activity.</p>
            )}
            
            {allActivities.slice(0, 5).map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-center justify-between p-4 fintech-card cursor-pointer hover:border-[#9fe870] transition-colors"
                onClick={() => {
                  if (activity.type === 'sale') {
                    navigate(`/invoice/${activity.id}`);
                  } else {
                    setEditingActivity(activity);
                    setEditActivityForm({ ...editActivityForm, description: activity.description, amount: activity.amount });
                  }
                }}
              >
                {activity.type === 'sale' ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-[#9fe870]/20 flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-5 w-5 text-[#163300]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-[#163300] truncate">Sale: {activity.customerName}</h4>
                        <p className="text-xs font-semibold text-slate-500 truncate">
                          {activity.items?.map((it: any) => `${it.qty}x ${it.name}`).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-[#163300]">+Rp {activity.total?.toLocaleString()}</p>
                      <p className="text-xs font-semibold text-slate-400">{activity.date}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <Receipt className="h-5 w-5 text-slate-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-[#163300] truncate">{activity.description}</h4>
                        <p className="text-xs font-semibold text-slate-500 truncate">{activity.category}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-red-600">-Rp {activity.amount?.toLocaleString()}</p>
                      <p className="text-xs font-semibold text-slate-400">{activity.date}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          
          <div className="pt-2">
            <Button variant="ghost" className="w-full text-[#163300] font-bold text-sm bg-slate-200/50 hover:bg-slate-200 rounded-2xl h-12" onClick={() => navigate('/reports')}>
              View All Transactions
            </Button>
          </div>
        </div>
      </main>

      {/* EDIT ACTIVITY MODAL */}
      <Dialog open={editingActivity !== null} onOpenChange={(open) => { if (!open) setEditingActivity(null); }}>
        <DialogContent>
          {editingActivity && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-[#163300]">
                  Edit Expense
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500">
                  Update the details or delete this expense completely.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Description</label>
                    <Input 
                      value={editActivityForm.description}
                      onChange={e => setEditActivityForm({ ...editActivityForm, description: e.target.value })}
                      className="h-12 rounded-xl bg-[#f2f5f7] border-none font-bold text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Amount (IDR)</label>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      value={editActivityForm.amount}
                      onChange={e => setEditActivityForm({ ...editActivityForm, amount: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                      className="h-12 rounded-xl bg-[#f2f5f7] border-none font-bold text-sm" 
                    />
                  </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-3">
                <Button 
                  variant="outline" 
                  className="h-12 rounded-xl border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 flex-1"
                  onClick={async () => {
                    const confirmed = await confirm(`Are you sure you want to completely delete this expense? This cannot be undone.`);
                    if (!confirmed) return;
                    
                    await removeExpense(editingActivity.id);
                    setEditingActivity(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
                
                <Button 
                  className="h-12 rounded-xl bg-[#163300] text-white hover:bg-[#1f4700] flex-1"
                  onClick={async () => {
                    await saveExpense({
                      ...editingActivity,
                      description: editActivityForm.description,
                      amount: editActivityForm.amount
                    });
                    setEditingActivity(null);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
