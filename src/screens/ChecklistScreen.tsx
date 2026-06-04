import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft,
  CheckCircle2, 
  CheckSquare,
  Square,
  ListTodo
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMaster } from '../context/MasterContext';
import { useConfirm } from '../context/ConfirmContext';

export function ChecklistScreen() {
  const navigate = useNavigate();
  const {
    sales,
    wishlistItems: myWishlist,
    saveSale,
    boughtIds,
    toggleBoughtId,
  } = useMaster();

  const confirm = useConfirm();
  const [checklistViewMode, setChecklistViewMode] = useState<'transaction' | 'summary'>('transaction');
  const [invoiceModalSale, setInvoiceModalSale] = useState<any | null>(null);

  const handleToggleCustomChecklist = async (id: string, type: 'wishlist' | 'sale') => {
    const isCurrentlyBought = boughtIds.includes(id);
    const action = isCurrentlyBought ? 'uncheck this item' : 'confirm this item as bought';
    
    const confirmed = await confirm(`Are you sure you want to ${action}?`);
    if (!confirmed) return;

    // Auto generate sales record when a wishlist item is checked
    if (!isCurrentlyBought && type === 'wishlist') {
      const matchedWishlist = myWishlist.find(w => `chk_wishlist_${w.id}` === id);
      if (matchedWishlist) {
        try {
          const sellPrice = matchedWishlist.sellPrice || matchedWishlist.price;
          const newSale = {
            id: 'sale_' + Date.now(),
            customerName: matchedWishlist.requester,
            total: sellPrice,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            items: [{
              productId: matchedWishlist.id,
              name: matchedWishlist.name,
              price: sellPrice,
              qty: 1,
              cost: matchedWishlist.price,
              sourceCategory: 'Wishlist'
            }]
          };
          if (saveSale) {
            await saveSale(newSale);
            setInvoiceModalSale(newSale);
          }
        } catch (e) {
          console.error("Failed to generate automatic sale", e);
        }
      }
    }

    if (isCurrentlyBought) {
      toast.info('Marked item as pending purchase');
    } else {
      toast.success('Confirmed item as acquired');
    }
    toggleBoughtId(id);
  };

  const getMergedChecklistItems = () => {
    const wishlistFound = myWishlist
      .filter(item => item.status === 'confirm')
      .map(item => ({
        id: `chk_wishlist_${item.id}`,
        name: item.name,
        qty: item.qty || 1,
        price: item.sellPrice || item.price,
        requester: item.requester,
        location: item.location,
        type: 'wishlist' as const,
        sourceLabel: 'Wishlist (Confirmed)'
      }));

    const salesItems: any[] = [];
    sales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((it: any, index: number) => {
          const isWishlistDuplicate = wishlistFound.some(w => w.name.toLowerCase() === it.name.toLowerCase());
          if (!isWishlistDuplicate) {
            salesItems.push({
              id: `chk_sale_${sale.id}_${index}`,
              name: it.name,
              qty: it.qty || 1,
              price: it.price,
              requester: sale.customerName,
              location: 'Checkout Desk',
              type: 'sale' as const,
              sourceLabel: 'Logged Invoice Sale'
            });
          }
        });
      }
    });

    return [...wishlistFound, ...salesItems];
  };

  const checklistItems = getMergedChecklistItems();

  const isItemChecked = (itemId: string, itemType: 'wishlist' | 'sale') => {
    return boughtIds.includes(itemId);
  };

  const groupedChecklistItems = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; checkedQty: number; ids: string[] }>();
    checklistItems.forEach(item => {
      const key = (item.name || 'Unknown').toLowerCase().trim();
      const checked = isItemChecked(item.id, item.type);
      if (!map.has(key)) {
        map.set(key, { name: item.name, qty: item.qty, checkedQty: checked ? item.qty : 0, ids: [item.id] });
      } else {
        const existing = map.get(key)!;
        existing.qty += item.qty;
        if (checked) existing.checkedQty += item.qty;
        existing.ids.push(item.id);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [checklistItems, boughtIds]);

  const checkedCount = checklistItems.filter(item => isItemChecked(item.id, item.type)).length;
  const totalChecklistCount = checklistItems.length;
  const completionPercentage = totalChecklistCount > 0 ? Math.round((checkedCount / totalChecklistCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f2f5f7] pb-24">
      <header className="sticky top-0 z-50 bg-[#f2f5f7]/80 backdrop-blur-md px-4 pt-8 pb-4 flex items-center justify-between gap-3">
        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-slate-50 shrink-0" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5 text-[#0D1B2E]" />
        </Button>
        <h2 className="text-xl font-black text-[#0D1B2E] tracking-tight flex-1">Item Checklist</h2>
      </header>

      <div className="p-4 space-y-4">
        {/* Progress Overview */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="relative h-14 w-14 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className="stroke-primary"
                strokeWidth="4"
                strokeDasharray="100"
                strokeDashoffset={100 - completionPercentage}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-black text-primary">{completionPercentage}%</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Shopping Progress</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{checkedCount} of {totalChecklistCount} items acquired</p>
          </div>
        </div>

        {/* View Toggles */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-xl gap-1.5">
          <button
            type="button"
            onClick={() => setChecklistViewMode('transaction')}
            className={cn(
              "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all text-center",
              checklistViewMode === 'transaction' ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
            )}
          >
            By Transaction
          </button>
          <button
            type="button"
            onClick={() => setChecklistViewMode('summary')}
            className={cn(
              "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all text-center",
              checklistViewMode === 'summary' ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Aggregated Summary
          </button>
        </div>

        {checklistItems.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1">No Items Pending</h3>
            <p className="text-xs text-slate-500 font-medium">Any logged sales or confirmed wishlist items will appear here as a checklist for physical shopping.</p>
          </div>
        ) : checklistViewMode === 'transaction' ? (
          <div className="space-y-3">
            {checklistItems.map(item => {
              const isChecked = isItemChecked(item.id, item.type);
              return (
                <div 
                  key={item.id} 
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl transition-all cursor-pointer border",
                    isChecked ? "bg-emerald-50/50 border-emerald-100" : "bg-white border-slate-100 shadow-sm"
                  )}
                  onClick={() => handleToggleCustomChecklist(item.id, item.type)}
                >
                  <button type="button" className="shrink-0 p-1">
                    {isChecked ? (
                      <CheckSquare className="h-6 w-6 text-emerald-500" />
                    ) : (
                      <Square className="h-6 w-6 text-slate-300" />
                    )}
                  </button>
                  <div className={cn("flex-1 min-w-0 transition-opacity", isChecked ? "opacity-60" : "")}>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={cn("text-sm font-bold truncate", isChecked ? "text-slate-500 line-through" : "text-[#0D1B2E]")}>
                        {item.name}
                      </h4>
                      <span className="text-xs font-black text-[#0D1B2E] shrink-0 bg-[#f2f5f7] px-2 py-0.5 rounded-md">x{item.qty}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-bold tracking-widest uppercase">
                      <span className={cn(item.type === 'wishlist' ? "text-blue-600" : "text-amber-600")}>{item.sourceLabel}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 truncate">For: {item.requester}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {groupedChecklistItems.map(group => {
              const isFullyChecked = group.checkedQty === group.qty;
              return (
                <div 
                  key={group.name}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all",
                    isFullyChecked ? "bg-emerald-50/50 border-emerald-100 opacity-70" : "bg-white shadow-sm border-slate-100"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className={cn("text-sm font-bold truncate", isFullyChecked ? "line-through text-slate-500" : "text-[#0D1B2E]")}>
                      {group.name}
                    </h4>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mt-1">
                      {group.checkedQty} of {group.qty} Acquired
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {group.ids.map((id, i) => {
                      const itemObj = checklistItems.find(c => c.id === id);
                      const isChecked = isItemChecked(id, itemObj?.type || 'sale');
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleToggleCustomChecklist(id, itemObj?.type || 'sale')}
                          className="p-0.5 transition-transform active:scale-90 hover:scale-110"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-6 w-6 text-emerald-500" />
                          ) : (
                            <Square className="h-6 w-6 text-slate-300" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {invoiceModalSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100"
          >
            <div className="p-6 text-center space-y-3 bg-[#f2f5f7]">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Auto-Sale Logged</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                A sales record for <strong className="text-slate-800">{invoiceModalSale.customerName}</strong> was automatically generated from this confirmed wishlist item.
              </p>
            </div>
            <div className="p-6">
              <Button 
                onClick={() => setInvoiceModalSale(null)}
                className="w-full h-12 rounded-xl font-black uppercase tracking-widest"
              >
                Got It
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
