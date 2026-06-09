import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, Wallet, Zap, Plus, Search, Trash2, X, PlusCircle, PackageCheck, Package, CheckCircle2, PackagePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMaster } from '../context/MasterContext';
import { motion, AnimatePresence } from 'motion/react';

export function GlobalActionFab({ variant = 'mobile' }: { variant?: 'mobile' | 'desktop' }) {
  const navigate = useNavigate();
  const {
    catalogItems,
    tripSettings,
    saveExpense,
    saveSale,
    saveWishlist,
    saveItem,
  } = useMaster();

  const [isOpen, setIsOpen] = useState(false);

  // Form States for Expense Dialog
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState('KRW');
  const [expenseCategory, setExpenseCategory] = useState('Transport');
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    'Transport', 'Accommodation', 'Tax/Duty', 'Food', 'Others'
  ]);
  const [showNewCatField, setShowNewCatField] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Form States for Sale Dialog
  const [customerName, setCustomerName] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [productSearchText, setProductSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedQty, setSelectedQty] = useState<number | ''>('');
  const [draftSaleItems, setDraftSaleItems] = useState<any[]>([]);
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  useEffect(() => {
    if (isSaleOpen) {
      setCustomerName('');
      setSelectedItemId('');
      setProductSearchText('');
      setDraftSaleItems([]);
      setSelectedQty('');
      setIsOpen(false);
    }
  }, [isSaleOpen]);

  useEffect(() => {
    if (isExpenseOpen) {
      setIsOpen(false);
    }
  }, [isExpenseOpen]);

  const currencySettings = tripSettings?.currency || {
    code: 'SGD',
    symbol: 'S$',
    manualRate: 13500,
  };

  const shoppingCurrencyCode = tripSettings?.currency?.code || 'SGD';
  const payoutCurrencyCode = tripSettings?.currency?.payout || 'IDR';

  useEffect(() => {
    if (shoppingCurrencyCode) {
      setExpenseCurrency(shoppingCurrencyCode);
    }
  }, [shoppingCurrencyCode]);

  const handleCycleExpenseCurrency = () => {
    const nextCurrency = expenseCurrency === shoppingCurrencyCode ? payoutCurrencyCode : shoppingCurrencyCode;
    setExpenseCurrency(nextCurrency);
  };

  const getCurrencySymbol = (code: string) => {
    if (code === 'IDR') return 'Rp';
    if (code === 'SGD') return 'S$';
    if (code === 'KRW') return '₩';
    if (code === 'JPY') return '¥';
    if (code === 'THB') return '฿';
    if (code === 'USD') return '$';
    if (code === 'EUR') return '€';
    return '$';
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const cleanCat = newCatName.trim();
    if (expenseCategories.map(c => c.toLowerCase()).includes(cleanCat.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }
    setExpenseCategories([...expenseCategories, cleanCat]);
    setExpenseCategory(cleanCat);
    setNewCatName('');
    setShowNewCatField(false);
  };

  const handleSaveExpense = async () => {
    if (isSubmittingExpense) return;
    if (!expenseDesc.trim() || !expenseAmount) return;
    
    setIsSubmittingExpense(true);
    const enteredAmount = parseFloat(expenseAmount.replace(/[^0-9.]/g, '')) || 0;
    const amountInIdr = expenseCurrency === shoppingCurrencyCode
      ? Math.round(enteredAmount * (tripSettings?.currency?.manualRate || 13500))
      : enteredAmount;

    const newExpense = {
      id: 'exp_' + Date.now(),
      description: expenseDesc.trim(),
      amount: amountInIdr,
      category: expenseCategory,
      notes: expenseNotes.trim() || undefined,
      originalAmount: expenseCurrency !== 'IDR' ? enteredAmount : undefined,
      originalSymbol: expenseCurrency !== 'IDR' ? (expenseCurrency === shoppingCurrencyCode ? (tripSettings?.currency?.symbol || 'S$') : getCurrencySymbol(payoutCurrencyCode)) : undefined,
      originalCurrency: expenseCurrency,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      await saveExpense(newExpense);
      toast.success(`Recorded expense under ${expenseCategory}`);
      setExpenseDesc('');
      setExpenseAmount('');
      setIsExpenseOpen(false);
    } catch (e) {
      toast.error('Failed to save expense');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleAddDraftItem = () => {
    const matchedProduct = catalogItems.find(p => p.id === selectedItemId);
    if (!matchedProduct) return;

    const itemCurrency = matchedProduct.currency || currencySettings.code;
    const rate = currencySettings.code === itemCurrency ? (currencySettings.manualRate || 13500) : 1;
    const costInIdr = Math.round((matchedProduct.cost || 0) * rate);
    const finalQty = typeof selectedQty === 'number' && selectedQty > 0 ? selectedQty : 1;

    const alreadyInDraftIdx = draftSaleItems.findIndex(i => i.productId === selectedItemId);
    if (alreadyInDraftIdx > -1) {
      const updated = [...draftSaleItems];
      updated[alreadyInDraftIdx].qty += finalQty;
      setDraftSaleItems(updated);
    } else {
      setDraftSaleItems([
        ...draftSaleItems,
        {
          productId: selectedItemId,
          name: matchedProduct.name,
          price: matchedProduct.price,
          cost: costInIdr,
          qty: finalQty
        }
      ]);
    }
    setSelectedQty('');
    setSelectedItemId('');
    setProductSearchText('');
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftSaleItems(draftSaleItems.filter((_, i) => i !== index));
  };

  const handleSaveSale = async () => {
    if (isSubmittingSale) return;
    if (!customerName.trim()) return;
    
    let finalDraft = [...draftSaleItems];
    if (finalDraft.length === 0) {
      const matchedProduct = catalogItems.find(p => p.id === selectedItemId);
      if (matchedProduct) {
        const finalQty = typeof selectedQty === 'number' && selectedQty > 0 ? selectedQty : 1;
        finalDraft.push({
          productId: selectedItemId,
          name: matchedProduct.name,
          price: matchedProduct.price,
          qty: finalQty
        });
      } else {
        toast.error('Please add at least one item');
        return;
      }
    }

    setIsSubmittingSale(true);
    const totalRevenue = finalDraft.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const newSale = {
      id: 'sale_' + Date.now(),
      customerName: customerName.trim(),
      items: finalDraft,
      total: totalRevenue,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      await saveSale(newSale);
      toast.success('Sale successfully logged!');
      setIsSaleOpen(false);
    } catch (e) {
      toast.error('Failed to log sale');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  if (variant === 'desktop') {
    return (
      <>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            className="h-11 rounded-xl gap-2 font-bold bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm"
            onClick={() => setIsExpenseOpen(true)}
          >
            <Wallet className="h-4 w-4 text-blue-500" /> Record Expense
          </Button>
          <Button 
            className="h-11 rounded-xl gap-2 font-bold bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm"
            onClick={() => setIsSaleOpen(true)}
          >
            <Banknote className="h-4 w-4 text-emerald-500" /> Record Sale
          </Button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <Button 
            className="h-11 px-5 rounded-xl gap-2 font-black uppercase tracking-wide bg-[#0D1B2E] text-white hover:bg-[#162847] shadow-lg hover:shadow-xl transition-all"
            onClick={() => navigate('/owner/list-item')}
          >
            <PackagePlus className="h-4 w-4 text-[#C9A84C]" /> Add Product
          </Button>
        </div>
        {/* Modals placed here for desktop so they don't break when variant changes */}
        {renderModals()}
      </>
    );
  }

  return (
    <>
      <div className="fixed bottom-[80px] md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="flex flex-col gap-3 mb-2"
            >
              <div className="flex items-center gap-3 justify-end group">
                <span className="bg-white px-3 py-1.5 rounded-lg shadow text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Record Operational Expense
                </span>
                <Button 
                  size="icon" 
                  onClick={() => setIsExpenseOpen(true)}
                  className="h-12 w-12 rounded-full shadow-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
                >
                  <Wallet className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex items-center gap-3 justify-end group">
                <span className="bg-white px-3 py-1.5 rounded-lg shadow text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Record Customer Sale
                </span>
                <Button 
                  size="icon" 
                  onClick={() => setIsSaleOpen(true)}
                  className="h-12 w-12 rounded-full shadow-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200"
                >
                  <Banknote className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button 
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-14 w-14 rounded-full shadow-xl transition-all duration-300 border-none",
            isOpen ? "bg-slate-800 hover:bg-slate-900 text-white" : "bg-[#C9A84C] hover:bg-[#b8943d] text-[#0D1B2E]"
          )}
        >
          <Zap className={cn("h-6 w-6 transition-all", isOpen ? "rotate-45" : "")} />
        </Button>
      </div>

      {renderModals()}
    </>
  );

  function renderModals() {
    return (
      <>

      {/* Expenses Dialog */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent>
          <DialogHeader className="text-left pb-2">
            <DialogTitle className="text-lg font-black tracking-tight uppercase italic text-primary flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Record Operational Expense
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description *</label>
              <Input 
                value={expenseDesc}
                onChange={e => setExpenseDesc(e.target.value)}
                className="h-11 rounded-xl bg-muted/30 border-none font-bold text-sm text-slate-800" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount *</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={handleCycleExpenseCurrency}
                  className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-primary bg-primary/10 px-2 py-1 rounded"
                >
                  {expenseCurrency}
                </button>
                <Input 
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  inputMode="decimal"
                  className="h-11 pl-16 rounded-xl bg-muted/30 border-none font-bold text-sm text-slate-800" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
              <div className="grid grid-cols-3 gap-1.5">
                {expenseCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setExpenseCategory(cat)}
                    className={cn(
                      "h-9 rounded-xl border text-[10px] font-bold uppercase transition-all tracking-tight",
                      expenseCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted/10 text-slate-700"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button 
                className="w-full h-12 rounded-2xl font-black uppercase" 
                onClick={handleSaveExpense}
                disabled={isSubmittingExpense}
              >
                {isSubmittingExpense ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Sale Dialog */}
      <Dialog open={isSaleOpen} onOpenChange={setIsSaleOpen}>
        <DialogContent>
          <DialogHeader className="text-left pb-2">
            <DialogTitle className="text-lg font-black tracking-tight uppercase italic text-primary flex items-center gap-2">
              <Banknote className="h-5 w-5" /> Record Customer Sale
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!showSuggestions && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer Name *</label>
                <Input 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="h-11 rounded-xl bg-muted/30 border-none font-bold text-sm text-slate-800" 
                />
              </div>
            )}

            <div className={cn("rounded-3xl bg-[#f2f5f7] border-none flex flex-col transition-all", showSuggestions ? "p-0 h-[65vh] bg-transparent md:h-auto md:p-4 md:rounded-3xl" : "p-4 space-y-3")}>
              {showSuggestions && (
                <div className="flex items-center gap-2 p-2 pb-2 md:hidden">
                  <Button variant="ghost" size="icon" onClick={() => setShowSuggestions(false)} className="rounded-full shrink-0">
                    <X className="h-5 w-5" />
                  </Button>
                  <span className="font-bold text-foreground">Select Product</span>
                </div>
              )}
              
              <div className={cn("relative", showSuggestions ? "px-4 md:px-0" : "")}>
                {!showSuggestions && (
                  <>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Select Catalog Product</p>
                    <div 
                      className="absolute inset-0 z-10 cursor-pointer" 
                      onClick={() => setShowSuggestions(true)}
                    />
                  </>
                )}
                <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400", showSuggestions ? "left-8 md:left-4" : "mt-3")} />
                <Input 
                  placeholder="Search product by name..." 
                  value={productSearchText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProductSearchText(val);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="h-12 pl-11 rounded-2xl bg-white border-none font-bold text-xs shadow-sm" 
                />
              </div>

              {showSuggestions && (
                <div className="flex-1 overflow-y-auto px-4 pb-20 pt-4 md:p-0 md:max-h-64 space-y-1.5 mt-1">
                  {catalogItems.filter(i => i.name.toLowerCase().includes(productSearchText.toLowerCase())).map(item => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setProductSearchText(item.name);
                        setShowSuggestions(false);
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-colors border shadow-sm",
                        selectedItemId === item.id ? "bg-[#163300] border-[#163300] text-white" : "hover:bg-slate-50 bg-white border-slate-100"
                      )}
                    >
                      <div className="h-14 w-14 rounded-xl bg-[#f2f5f7] flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {item.image ? (
                           <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                           <Package className="h-6 w-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate pr-2">{item.name}</div>
                        <div className={cn("text-[11px] font-black mt-0.5", selectedItemId === item.id ? "text-[#C9A84C]" : "text-slate-500")}>
                          Rp {item.price.toLocaleString()}
                        </div>
                      </div>
                      {selectedItemId === item.id && (
                        <CheckCircle2 className="h-6 w-6 text-[#C9A84C] shrink-0 mr-1" />
                      )}
                    </button>
                  ))}
                  {catalogItems.filter(i => i.name.toLowerCase().includes(productSearchText.toLowerCase())).length === 0 && (
                     <div className="p-8 text-center text-sm font-bold text-slate-400">No matching products found</div>
                  )}
                </div>
              )}

              {!showSuggestions && (
                <div className="flex items-end justify-between gap-3 pt-2">
                  <div className="space-y-1.5 flex-[0.5]">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Quantity</label>
                    <Input 
                      type="number" 
                      placeholder="e.g. 1" 
                      value={selectedQty} 
                      onChange={e => setSelectedQty(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))} 
                      className="h-12 w-full rounded-2xl bg-white border-none font-black text-sm shadow-sm px-4" 
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleAddDraftItem} 
                    disabled={!selectedItemId}
                    className="h-12 rounded-2xl font-black text-xs gap-2 shadow-xl bg-[#C9A84C] text-[#0D1B2E] hover:bg-[#b8943d] px-5"
                  >
                    <PlusCircle className="h-4 w-4" /> Add Item
                  </Button>
                </div>
              )}
            </div>

            {!showSuggestions && draftSaleItems.length > 0 && (
              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-2xl border">
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {draftSaleItems.map((draft, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-white border shadow-sm">
                      <div className="text-xs font-bold truncate pr-2">
                        {draft.qty}x {draft.name} <br />
                        <span className="text-[10px] text-slate-500 font-medium">Rp {(draft.price * draft.qty).toLocaleString()}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveDraftItem(idx)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="font-black text-xs pt-2 border-t">
                  Total: Rp {draftSaleItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0).toLocaleString()}
                </div>
              </div>
            )}

            {!showSuggestions && (
              <div className="pt-1">
                <Button 
                  className="w-full h-12 rounded-2xl font-black uppercase" 
                  onClick={handleSaveSale}
                  disabled={isSubmittingSale}
                >
                  {isSubmittingSale ? 'Submitting...' : 'Submit Sale Record'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </>
    );
  }
}
