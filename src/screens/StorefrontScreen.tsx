import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  ShieldCheck, 
  Check, 
  Package, 
  Share2, 
  MessageSquare,
  Globe,
  Coins,
  Send,
  Sparkles,
  Shield,
  Phone,
  Mail,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WatermarkOverlay } from '../components/WatermarkOverlay';
import { Input } from '@/components/ui/input';
import { useMaster } from '../context/MasterContext';
import { useConfirm } from '../context/ConfirmContext';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { db } from '../lib/supabase';

export function StorefrontScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  // Sourcing request dialog states
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'contact' | 'otp' | 'order'>('contact');
  const [clientName, setClientName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [expectedOtp, setExpectedOtp] = useState('');
  const [orderQty, setOrderQty] = useState('1');
  const [clientBudget, setClientBudget] = useState('');
  const [clientLocation, setClientLocation] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { catalogItems, saveWishlist, currentUser, tripSettings } = useMaster();
  const confirm = useConfirm();

  useEffect(() => {
    async function loadData() {
      try {
        const items = await db.getItems();

        const foundItem = items.find(i => i.id === id);
        if (foundItem) {
          setItem(foundItem);
          setClientBudget(foundItem.price.toString());
          setClientLocation(tripSettings?.trip?.origin || 'Seoul');
        }
      } catch (e) {
        console.error('Failed to load storefront data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const savedAvatar = localStorage.getItem('jastip_profile_avatar');
    if (savedAvatar) {
      setAvatar(savedAvatar);
    }
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Storefront link copied!', {
      description: 'You can now share this direct storefront link with your customer.'
    });
  };

  const handleSendOtp = async () => {
    if (!clientName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      toast.error('Please fill in all contact details');
      return;
    }

    setSubmitting(true);
    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setExpectedOtp(generatedOtp);
      
      const response = await fetch('/api/sendOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerEmail, otp: generatedOtp })
      });

      if (!response.ok) {
        let errMsg = 'Failed to send email';
        try {
          const errData = await response.json();
          errMsg = errData.message || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }
      
      toast.success('OTP sent to your email!');
      setStep('otp');
    } catch (err: any) {
      toast.error(`Failed to send OTP: ${err.message || 'Network Error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = () => {
    if (otp !== expectedOtp) {
      toast.error('Invalid OTP. Please check your email.');
      return;
    }
    setStep('order');
  };

  const handleSubmitOrder = async (paymentMethod: 'cash' | 'stripe') => {
    const qty = parseInt(orderQty) || 1;
    const finalPrice = qty * (item?.price || 0);

    const confirmed = await confirm({
      title: paymentMethod === 'stripe' ? 'Pay Now with Stripe' : 'Submit Request',
      description: `Submit sourcing request for ${qty}x "${item.name}"?`
    });
    if (!confirmed) return;

    setSubmitting(true);
    const merchantId = item?.merchant_id || item?.merchantId;
    const newRequest = {
      id: 'wish_' + Date.now(),
      name: `[${qty}x] ${item.name}`,
      requester: `${clientName.trim()} (${customerEmail})`,
      status: 'pending',
      price: finalPrice, 
      location: tripSettings?.trip?.origin || 'Seoul',
      image: item.image,
      note: clientNotes.trim() || undefined,
      merchantId: merchantId,
      merchant_id: merchantId,
      paymentMethod,
      paymentStatus: 'unpaid'
    };

    try {
      await db.saveWishlist(newRequest, merchantId);

      if (paymentMethod === 'stripe') {
        const stripeRes = await fetch('/api/create-stripe-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderDetails: {
              name: newRequest.name,
              price: finalPrice,
              quantity: 1,
              image: newRequest.image,
              notes: newRequest.note,
              customerEmail,
              customerId: customerEmail,
              merchantId: merchantId
            },
            successUrl: window.location.href,
            cancelUrl: window.location.href
          })
        });
        
        const stripeData = await stripeRes.json();
        if (stripeData.url) {
          window.location.href = stripeData.url;
          return;
        } else {
          throw new Error(stripeData.error || 'Failed to create Stripe session');
        }
      }

      toast.success('Sourcing request submitted successfully!', {
        description: `Your request has been routed to the traveler's pending checklist.`
      });
      setIsOpen(false);
      // Reset flow
      setTimeout(() => {
        setStep('contact');
        setClientName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setClientNotes('');
        setOrderQty('1');
        setOtp('');
      }, 500);
    } catch (err: any) {
      toast.error('Failed to submit request', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Storefront...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <Package className="h-16 w-16 text-muted-foreground opacity-40 mb-4 animate-bounce" />
        <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-800">Product Not Listed</h2>
        <p className="text-xs text-muted-foreground max-w-xs mt-2 leading-relaxed">
          The requested item catalog link is invalid or the traveler has removed this listing.
        </p>
        <Button className="mt-6 rounded-2xl font-bold gap-2 px-6" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" /> Go to Hub
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-slate-50/80 backdrop-blur-md pt-8 pb-4 border-none h-auto flex items-center justify-between px-4">
        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-slate-50 shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Button>
        <span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Storefront Product</span>
        <div className="w-10 h-10" />
      </header>

      <div className="max-w-5xl mx-auto md:py-8 px-0 md:px-6 flex flex-col md:flex-row gap-0 md:gap-12">
        {/* Hero Image Section */}
        <div className="w-full md:w-1/2 relative aspect-square bg-white md:rounded-[2rem] overflow-hidden shrink-0 border-b md:border border-slate-100 shadow-sm">
          <WatermarkOverlay />
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 bg-emerald-500 text-white font-black px-3.5 py-1.5 rounded-xl shadow-lg text-[10px] tracking-wider uppercase flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            Live Sourcing Request
          </div>
        </div>

        <div className="w-full md:w-1/2 p-6 md:p-0 space-y-6">
        {/* Title & Price Card */}
        <section className="space-y-3">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-2.5 py-1 rounded-full inline-block">
              Matched Sourcing Catalog
            </span>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800 leading-tight">
              {item.name}
            </h2>
          </div>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5 text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Publish Sourcing Price</p>
                <p className="text-2xl font-black text-primary font-mono">Rp {item.price.toLocaleString()}</p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100/60 font-bold px-3 py-1.5 rounded-xl text-[10px] leading-none uppercase shrink-0">
                100% Genuine Guarantee
              </Badge>
            </CardContent>
          </Card>
        </section>

        {/* Traveler details block */}
        <section className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sourcing Traveler</label>
          <Card className="border-none shadow-sm bg-white rounded-3xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/10">
                  {avatar ? (
                    <AvatarImage src={avatar} alt="Jane Doe" />
                  ) : (
                    <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" />
                  )}
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="space-y-0.5 text-left">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-800">{currentUser?.businessName || currentUser?.username || 'Star Traveler'}</h4>
                    <Badge variant="ghost" className="h-4 text-[7px] font-black uppercase bg-primary/10 text-primary border-none px-1 rounded-md">
                      Star Traveler
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                    <span className="flex items-center gap-0.5 text-slate-700"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> 4.98</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3 text-red-500" /> {tripSettings?.trip?.origin || 'Seoul'} → {tripSettings?.trip?.destination || 'Jakarta'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Trip Ledger details */}
        <section className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Trip Sourcing Route Specifications</label>
          <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
              <div className="space-y-1 text-left">
                <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Departure Date</p>
                <p className="text-xs font-bold uppercase tracking-tight">{tripSettings?.trip?.date || '22 May 2026'}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Sourcing Currency</p>
                <p className="text-xs font-bold uppercase tracking-tight">{tripSettings?.currency?.code || 'SGD'} ({tripSettings?.currency?.symbol || 'S$'})</p>
              </div>
            </div>
            
            <Separator className="bg-slate-800" />
            
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-2 text-left">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Sourcing Origin</p>
                  <p className="text-xs font-bold uppercase tracking-tight">{tripSettings?.trip?.origin || 'Seoul'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-right justify-end">
                <div>
                  <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Destination</p>
                  <p className="text-xs font-bold uppercase tracking-tight">{tripSettings?.trip?.destination || 'Jakarta'}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-red-400" />
                </div>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full -mr-12 -mt-12 blur-2xl opacity-60" />
          </div>
        </section>

        {/* CTA Sourcing Request button */}
        <div className="pt-4">
          <Button 
            className="w-full h-14 rounded-2xl font-black uppercase italic text-sm gap-3 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all"
            onClick={() => setIsOpen(true)}
          >
            <Sparkles className="h-5 w-5" /> Request Traveler to Settle Sourcing
          </Button>
        </div>
      </div>
      </div>

      {/* Sourcing Request Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          // Soft reset if they close it
          setTimeout(() => setStep('contact'), 500);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-left pb-2">
            <DialogTitle className="text-lg font-black tracking-tight uppercase italic text-primary flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Order Sourcing Request
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-semibold">
              {step === 'contact' ? "Enter your contact details to begin." :
               step === 'otp' ? "Verify your email address." :
               "Specify your exact order requirements."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {step === 'contact' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input 
                      placeholder="e.g. Jane Andrews" 
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="h-11 pl-11 rounded-xl bg-muted/30 border-none font-bold text-sm text-slate-800" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input 
                      type="email"
                      placeholder="e.g. jane@email.com" 
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      className="h-11 pl-11 rounded-xl bg-muted/30 border-none font-bold text-sm text-slate-800" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phone Number / WhatsApp *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input 
                      type="tel"
                      placeholder="e.g. +628123456789" 
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="h-11 pl-11 rounded-xl bg-muted/30 border-none font-bold text-sm text-slate-800" 
                    />
                  </div>
                </div>

                <Button 
                  disabled={submitting}
                  className="w-full h-12 rounded-2xl font-black uppercase italic shadow-lg shadow-primary/10 gap-2 mt-2"
                  onClick={handleSendOtp}
                >
                  {submitting ? 'Sending OTP...' : 'Send Verification OTP'}
                </Button>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="text-center space-y-2 mb-4">
                  <Shield className="h-8 w-8 text-primary mx-auto" />
                </div>
                <Input 
                  placeholder="6-digit OTP" 
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="off"
                  className="h-14 rounded-xl bg-muted border-none font-black text-xl text-center text-slate-800 tracking-widest mx-auto max-w-[200px] focus-visible:ring-primary/20" 
                />
                <Button 
                  disabled={otp.length < 6}
                  className="w-full h-12 rounded-2xl font-black uppercase italic shadow-lg shadow-primary/10 gap-2 mt-2"
                  onClick={handleVerifyOtp}
                >
                  Verify
                </Button>
                <button 
                  onClick={() => setStep('contact')}
                  className="w-full text-xs font-bold text-muted-foreground uppercase tracking-widest pt-2 hover:text-slate-800"
                >
                  Change Email
                </button>
              </motion.div>
            )}

            {step === 'order' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 text-left col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quantity</label>
                    <Input 
                      type="number"
                      min="1"
                      value={orderQty}
                      onChange={e => setOrderQty(e.target.value)}
                      autoComplete="off"
                      className="h-11 rounded-xl bg-muted border-none font-bold text-sm text-center text-slate-800 focus-visible:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                  </div>

                  <div className="space-y-1.5 text-left col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">Rp</span>
                      <Input 
                        disabled
                        value={(item ? ((parseInt(orderQty) || 1) * item.price) : 0).toLocaleString()}
                        className="h-11 pl-9 rounded-xl bg-muted border-none font-bold text-sm text-slate-800 disabled:opacity-100" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Additional Products & Notes</label>
                  <Input 
                    placeholder="Want to add another product? Type here!" 
                    value={clientNotes}
                    onChange={e => setClientNotes(e.target.value)}
                    className="h-11 rounded-xl bg-muted/30 border-none font-bold text-sm text-slate-800" 
                  />
                </div>

                <div className="pt-4 space-y-2">
                  <Button 
                    disabled={submitting}
                    variant="outline"
                    className="w-full h-12 rounded-2xl font-black uppercase italic gap-2 text-slate-500 hover:text-slate-700"
                    onClick={() => handleSubmitOrder('cash')}
                  >
                    <Send className="h-4 w-4" /> {submitting ? 'Submitting...' : 'Pay with Cash'}
                  </Button>
                  <Button 
                    disabled={submitting}
                    className="w-full h-12 rounded-2xl font-black uppercase italic shadow-lg shadow-primary/10 gap-2"
                    onClick={() => handleSubmitOrder('stripe')}
                  >
                    <DollarSign className="h-4 w-4" /> {submitting ? 'Redirecting...' : 'Pay Now (Stripe)'}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
