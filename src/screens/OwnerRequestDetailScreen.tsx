import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMaster } from '../context/MasterContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ShoppingBag, 
  MoreHorizontal,
  Share2,
  Receipt,
  Trash2,
  Edit2,
  Clock,
  Package,
  DollarSign,
  MapPin,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useConfirm } from '../context/ConfirmContext';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WishlistItem {
  id: string;
  name: string;
  price: number; // Publish Price (IDR)
  cost: number;  // Foreign Cost
  currency: string;
  shippingCost: number;
  status: 'pending' | 'found' | 'confirm' | 'out_of_stock' | 'cancelled';
  logs?: string[];
}

export function OwnerRequestDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { saveSale } = useMaster();
  
  const isNew = id === 'new';
  
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const savedAvatar = localStorage.getItem('jastip_profile_avatar');
    if (savedAvatar) {
      setAvatar(savedAvatar);
    }
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemData, setNewItemData] = useState({ name: '', cost: 0, price: 0, currency: 'SGD' });
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid' | 'partial'>('unpaid');

  const updateItemStatus = async (itemId: string, status: WishlistItem['status']) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (status === 'found' || status === 'confirm') {
      if (!item.cost || item.cost <= 0 || !item.price || item.price <= 0) {
        toast.error(`Please input exact Foreign Cost and Publish Price before updating status.`);
        return;
      }
    }

    const itemName = item.name || 'this item';
    const confirmed = await confirm({
      title: 'Update Status',
      description: `Are you sure you want to change the status of "${itemName}" to ${status.toUpperCase().replace('_', ' ')}?`
    });
    if (!confirmed) {
      return;
    }
    setItems(items.map(item => item.id === itemId ? { ...item, status, logs: [...(item.logs || []), `Status: ${status} at ${new Date().toLocaleTimeString()}`] } : item));
    toast.success(`Item status updated to ${status.replace('_', ' ')}`);
  };

  const updateItemField = (itemId: string, field: keyof WishlistItem, value: any) => {
    setItems(items.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const handleAddItem = async () => {
    if (!newItemData.name) {
      toast.error('Please enter an item name');
      return;
    }
    const confirmed = await confirm({
      title: 'Add Item',
      description: `Are you sure you want to add "${newItemData.name}" to this request?`
    });
    if (!confirmed) {
      return;
    }
    const newItem: WishlistItem = {
      id: Date.now().toString(),
      name: newItemData.name,
      price: newItemData.price || 0,
      cost: newItemData.cost || 0,
      currency: newItemData.currency,
      shippingCost: 0,
      status: 'pending',
      logs: ['Manually added via Hub']
    };
    setItems([...items, newItem]);
    setNewItemData({ name: '', cost: 0, price: 0, currency: 'SGD' });
    setIsAddModalOpen(false);
    toast.success('Added new item to list');
  };

  const totalPublish = items.reduce((sum, item) => item.status === 'cancelled' ? sum : sum + item.price, 0);
  const totalCostIdr = items.reduce((sum, item) => item.status === 'cancelled' ? sum : sum + (item.cost * 12500), 0); // Assuming 12500 for SGD for report margin
  const totalShipping = items.reduce((sum, item) => item.status === 'cancelled' ? sum : sum + item.shippingCost, 0);
  const grandTotal = totalPublish + totalShipping;
  const totalProfit = totalPublish - totalCostIdr;

  const handleGenerateInvoice = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to generate an invoice.');
      return;
    }
    
    const itemsToBill = items.filter(i => selectedItems.includes(i.id));
    const total = itemsToBill.reduce((sum, item) => sum + item.price + (item.shippingCost || 0), 0);
    
    const salePayload = {
      id: `INV_${Date.now()}`,
      customerName: "Jane Doe",
      total: total,
      items: itemsToBill.map(i => ({ productId: i.id, name: i.name, price: i.price + (i.shippingCost || 0), qty: 1 }))
    };

    try {
      await saveSale(salePayload);
      toast.success('Invoice generated successfully!');
      navigate(`/invoice/${salePayload.id}`);
    } catch (e) {
      toast.error('Failed to generate invoice');
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f5f7] pb-24">
      <header className="sticky top-0 z-50 bg-[#f2f5f7]/80 backdrop-blur-md pt-8 pb-4 border-none h-auto flex items-center px-4 gap-4">
        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-slate-50 shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-[#0D1B2E]" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-black tracking-tight text-[#0D1B2E]">{isNew ? 'New Request' : `Request #${id}`}</h2>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* CTO Improvement 1: Visual Order Lifecycle Stepper */}
        <section className="px-1">
          <div className="flex justify-between mb-2">
            {['Inquiry', 'Purchase', 'Shipment', 'Complete'].map((step, idx) => (
              <div key={step} className="flex flex-col items-center gap-2 group">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500",
                  idx <= 1 ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "bg-muted text-muted-foreground",
                  idx === 1 && "animate-pulse ring-4 ring-primary/10"
                )}>
                  {idx === 0 ? <Clock className="h-4 w-4" /> : idx === 1 ? <Package className="h-4 w-4" /> : idx === 2 ? <MapPin className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  idx <= 1 ? "text-primary" : "text-muted-foreground opacity-50"
                )}>
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-muted rounded-full relative overflow-hidden mt-1">
             <motion.div 
               initial={{ width: 0 }} 
               animate={{ width: '40%' }} 
               className="absolute top-0 left-0 h-full bg-primary" 
             />
          </div>
        </section>

        {/* Customer Profile Quick Card */}
        <Card className="border-none shadow-sm bg-white rounded-3xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border ring-2 ring-primary/5">
                {avatar ? (
                  <AvatarImage src={avatar} alt="Jane Doe" />
                ) : (
                  <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" />
                )}
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold">Jane Doe</h4>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-50 text-blue-700 border-none text-[8px] h-4 uppercase font-bold tracking-tight">Reg. Customer</Badge>
                  <span className="text-[10px] text-muted-foreground">Joined 2024</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wishlist Items Management */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Wishlist Items</h3>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), "h-7 text-primary text-[10px] font-bold")}>
              <Plus className="h-3 w-3 mr-1" /> ADD ITEM
            </DialogTrigger>
              <DialogContent>
                <DialogHeader className="text-left">
                  <DialogTitle className="font-black uppercase italic text-2xl tracking-tighter">New Item Record</DialogTitle>
                  <DialogDescription className="text-xs font-medium">Record a localized item find or a specific customer request detail.</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Product Description</label>
                    <div className="relative">
                      <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      <Input 
                        placeholder="e.g. Aesop Hand Balm 75ml" 
                        value={newItemData.name}
                        onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                        className="h-14 pl-12 rounded-2xl bg-muted/30 border-none font-bold placeholder:font-medium" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Foreign Cost ({newItemData.currency})</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                        <Input 
                          type="number"
                          placeholder="0.00" 
                          value={newItemData.cost || ''}
                          onChange={(e) => setNewItemData({ ...newItemData, cost: Number(e.target.value) })}
                          inputMode="decimal"
                          className="h-14 pl-12 rounded-2xl bg-muted/30 border-none font-bold" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Publish Price (IDR)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary">Rp</span>
                        <Input 
                          type="number"
                          placeholder="0" 
                          value={newItemData.price || ''}
                          onChange={(e) => setNewItemData({ ...newItemData, price: Number(e.target.value) })}
                          inputMode="numeric"
                          className="h-14 pl-12 rounded-2xl bg-muted/30 border-none font-bold" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button onClick={handleAddItem} className="w-full h-14 rounded-2xl font-black uppercase italic shadow-xl shadow-primary/20">
                      Record to List
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`border-none shadow-sm overflow-hidden ${item.status === 'cancelled' ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="pt-1">
                          <input 
                            type="checkbox"
                            disabled={item.status !== 'confirm'}
                            checked={selectedItems.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedItems([...selectedItems, item.id]);
                              else setSelectedItems(selectedItems.filter(id => id !== item.id));
                            }}
                            className="h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-3 flex-1 opacity-100 transition-opacity" style={{ opacity: item.status === 'cancelled' ? 0.5 : 1 }}>
                          <input 
                            className="text-sm font-black bg-transparent border-none focus:ring-0 w-full p-0 leading-tight uppercase tracking-tight"
                            defaultValue={item.name}
                            onChange={(e) => updateItemField(item.id, 'name', e.target.value)}
                          />
                          
                           <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-muted-foreground uppercase opacity-70">Foreign Cost ({item.currency})</label>
                              <div className="flex items-center gap-1.5 h-8 bg-blue-50/50 rounded-lg px-2 border border-blue-100">
                                <span className="text-[10px] font-bold text-blue-600 opacity-60">{item.currency}</span>
                                <input 
                                  type="number"
                                  className="text-xs font-bold bg-transparent border-none focus:ring-0 w-full p-0 text-blue-700"
                                  defaultValue={item.cost}
                                  onChange={(e) => updateItemField(item.id, 'cost', Number(e.target.value))}
                                  inputMode="decimal"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-muted-foreground uppercase opacity-70">Publish Price (IDR)</label>
                              <div className="flex items-center gap-1.5 h-8 bg-primary/5 border border-primary/10 rounded-lg px-2">
                                <span className="text-[10px] font-bold text-primary opacity-60">Rp</span>
                                <input 
                                  type="number"
                                  className="text-xs font-black text-primary bg-transparent border-none focus:ring-0 w-full p-0"
                                  defaultValue={item.price}
                                  onChange={(e) => updateItemField(item.id, 'price', Number(e.target.value))}
                                  inputMode="numeric"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-muted-foreground uppercase opacity-70">Shipping Cost</label>
                              <div className="flex items-center gap-1.5 h-8 bg-muted/30 rounded-lg px-2">
                                <span className="text-[10px] font-bold opacity-40">Rp</span>
                                <input 
                                  type="number"
                                  placeholder="0"
                                  className="text-xs font-bold bg-transparent border-none focus:ring-0 w-full p-0"
                                  defaultValue={item.shippingCost}
                                  onChange={(e) => updateItemField(item.id, 'shippingCost', Number(e.target.value))}
                                  inputMode="numeric"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-muted-foreground uppercase opacity-70">Item Settlement</label>
                              <div className="flex items-center h-8 bg-slate-900 rounded-lg px-2 text-white">
                                <span className="text-[9px] font-bold tabular-nums">Rp {(item.price + item.shippingCost).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-400 hover:bg-red-50 rounded-full" 
                            onClick={async () => {
                              const confirmed = await confirm({
                                message: `Are you sure you want to remove "${item.name}" from the request?`,
                                isDestructive: true
                              });
                              if (confirmed) {
                                setItems(items.filter(i => i.id !== item.id));
                                toast.success('Removed item from request');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {item.logs && item.logs.length > 0 && (
                             <Badge variant="ghost" className="text-[7px] p-0 font-medium opacity-50 px-1 truncate max-w-[40px] uppercase">Logs {item.logs.length}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Status Selector */}
                      <div className="flex gap-2 pt-1 overflow-x-auto pb-1 scrollbar-hide">
                        <StatusButton 
                          active={item.status === 'found'} 
                          onClick={() => updateItemStatus(item.id, 'found')}
                          icon={CheckCircle2} 
                          label="Found" 
                          color="blue" 
                        />
                        <StatusButton 
                          active={item.status === 'confirm'} 
                          onClick={() => updateItemStatus(item.id, 'confirm')}
                          icon={ShieldCheck} 
                          label="Confirm" 
                          color="green" 
                        />
                        <StatusButton 
                          active={item.status === 'out_of_stock'} 
                          onClick={() => updateItemStatus(item.id, 'out_of_stock')}
                          icon={AlertCircle} 
                          label="OOS" 
                          color="yellow" 
                        />
                        <StatusButton 
                          active={item.status === 'cancelled'} 
                          onClick={() => updateItemStatus(item.id, 'cancelled')}
                          icon={XCircle} 
                          label="Cancel" 
                          color="red" 
                        />
                      </div>

                      {/* Log History */}
                      {item.logs && item.logs.length > 0 && (
                        <div className="mt-3 p-3 bg-muted/20 rounded-xl border border-dashed">
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 opacity-60 flex items-center gap-1.5">
                             <Clock className="h-2.5 w-2.5" /> History Log
                          </p>
                          <div className="space-y-1">
                             {item.logs.map((log, li) => (
                               <div key={li} className="flex gap-2 text-[9px] font-medium text-muted-foreground leading-tight italic">
                                  <span>•</span>
                                  <span>{log}</span>
                               </div>
                             ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Transaction Report */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Financial Settlement Report</h3>
            <div className="px-2 py-0.5 rounded-md bg-muted/50 border border-dashed flex items-center gap-2">
               <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-70">Audited breakdown</span>
            </div>
          </div>
          <Card className="border-none shadow-xl bg-slate-900 text-slate-100 rounded-3xl overflow-hidden relative">
            <CardContent className="p-6 space-y-6 relative z-10">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Gross Sales (Publish)</p>
                    <p className="text-sm font-bold">Rp {totalPublish.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Cost of Goods (Est.)</p>
                    <p className="text-sm font-bold text-blue-300">Rp {totalCostIdr.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Base Margin</p>
                      <Badge variant="ghost" className="h-3 text-[6px] p-0 font-bold px-1 bg-primary/20 text-blue-300">Net 85%</Badge>
                    </div>
                    <p className="text-xs font-medium text-emerald-400">+Rp {(totalPublish - totalCostIdr).toLocaleString()}</p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Logistics Fee</p>
                    <p className="text-xs font-medium text-blue-400">Rp {totalShipping.toLocaleString()}</p>
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Total to Collect</p>
                       <ShoppingBag className="h-3 w-3 opacity-20" />
                    </div>
                    <p className="text-4xl font-black tabular-nums tracking-tighter">Rp {grandTotal.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`h-6 px-3 font-black uppercase tracking-tight border-none rounded-lg text-[9px] ${
                      paymentStatus === 'paid' ? 'bg-green-500' : 
                      paymentStatus === 'partial' ? 'bg-blue-500' : 'bg-orange-500'
                    }`}>
                      {paymentStatus === 'paid' ? 'SETTLED' : 
                       paymentStatus === 'partial' ? 'PARTIAL' : 'OUTSTANDING'}
                    </Badge>
                  </div>
                </div>
                
                <div className="pt-2">
                   <div className="bg-green-500/10 border border-green-500/20 p-2.5 rounded-2xl flex justify-between items-center group">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest leading-none">Net Trip Margin</span>
                      </div>
                      <span className="text-sm font-black text-green-400">+ Rp {totalProfit.toLocaleString()}</span>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                 <Button 
                   variant="ghost"
                   className="h-12 rounded-2xl bg-white/5 text-white font-black text-[9px] gap-1 border border-white/10 hover:bg-white/10"
                   onClick={handleGenerateInvoice}
                 >
                   <Receipt className="h-3.5 w-3.5" /> INVOICE ({selectedItems.length})
                 </Button>
                 <Button 
                    variant="ghost"
                    className={`h-12 rounded-2xl font-black text-[9px] gap-1 border-none ${paymentStatus === 'partial' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white'}`}
                    onClick={async () => {
                      const confirmed = await confirm("Are you sure you want to change the payment status to PARTIAL PAY?");
                      if (confirmed) {
                        setPaymentStatus('partial');
                        toast.success('Payment status updated to partial');
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> PARTIAL PAY
                  </Button>
                  <Button 
                    className={`h-12 rounded-2xl font-black text-[9px] gap-1 border-none transition-all ${paymentStatus === 'paid' ? 'bg-slate-800 text-slate-500' : 'bg-primary text-primary-foreground shadow-xl shadow-primary/30'}`}
                    onClick={async () => {
                      const confirmed = await confirm("Are you sure you want to change the payment status to FULL PAYMENT (Settled)?");
                      if (confirmed) {
                        setPaymentStatus('paid');
                        toast.success('Payment status updated to settled');
                      }
                    }}
                  >
                    <Receipt className="h-3.5 w-3.5" /> FULL PAYMENT
                  </Button>
              </div>
            </CardContent>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full -ml-12 -mb-12 blur-3xl opacity-30" />
          </Card>
        </section>
      </div>
    </div>
  );
}

function StatusButton({ active, icon: Icon, label, color, onClick }: any) {
  const colors = {
    green: active ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600',
    blue: active ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600',
    yellow: active ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-600',
    red: active ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600',
  };

  return (
    <button 
      onClick={onClick}
      className={`h-8 px-3 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shrink-0 ${colors[color as keyof typeof colors]}`}
    >
      <Icon className="h-3 w-3" />
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </button>
  );
}
