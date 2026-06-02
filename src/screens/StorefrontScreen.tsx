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
  User,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { WatermarkOverlay } from '../components/WatermarkOverlay';
import { useMaster } from '../context/MasterContext';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { db } from '../lib/supabase';

export function StorefrontScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  const { currentUser, tripSettings } = useMaster();

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
          <ArrowLeft className="h-4 w-4" /> Go to Dashboard
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
        <div className="w-full md:w-1/3 xl:w-1/2 relative aspect-square bg-white md:rounded-[2rem] overflow-hidden shrink-0 border-b md:border border-slate-100 shadow-sm">
          <WatermarkOverlay />
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />

        </div>

        <div className="w-full md:w-2/3 xl:w-1/2 p-6 md:p-0 flex flex-col gap-6">
          
          {/* View Only Catalog */}
              {/* Title & Price Card */}
              <section className="space-y-3 animate-in slide-in-from-left-4 fade-in duration-300">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-2.5 py-1 rounded-full inline-block">
              Product Details
            </span>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800 leading-tight">
              {item.name}
            </h2>
          </div>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5 text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Price</p>
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
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Traveler</label>
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
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Trip Route</label>
          <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
              <div className="space-y-1 text-left">
                <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Departure Date</p>
                <p className="text-xs font-bold uppercase tracking-tight">{tripSettings?.trip?.date || '22 May 2026'}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Currency</p>
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
                  <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Origin</p>
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

        </div>
      </div>
    </div>
  );
}
