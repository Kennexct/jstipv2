import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Check, 
  MapPin, 
  Globe,
  Settings2,
  Edit2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useMaster } from '../context/MasterContext';
import { useConfirm } from '../context/ConfirmContext';
import { fetchLiveExchangeRate } from '../lib/currency';
import { cn } from '@/lib/utils';
import { MobileMenu } from '../components/MobileMenu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const CURRENCY_SYMBOLS: Record<string, string> = {
  SGD: 'S$',
  KRW: '₩',
  JPY: '¥',
  THB: '฿',
  USD: '$',
  EUR: '€',
  IDR: 'Rp',
  MYR: 'RM',
  AUD: 'A$',
  GBP: '£',
  CNY: '¥',
  HKD: 'HK$',
  TWD: 'NT$',
  CAD: 'C$',
  PHP: '₱',
  VND: '₫',
  INR: '₹'
};

const CURRENCIES = [
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'TWD', name: 'New Taiwan Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'INR', name: 'Indian Rupee' }
];

const COUNTRIES = [
  { name: 'Singapore', currencyCode: 'SGD', currencySymbol: 'S$', defaultRate: 12100 },
  { name: 'South Korea', currencyCode: 'KRW', currencySymbol: '₩', defaultRate: 11.7 },
  { name: 'Japan', currencyCode: 'JPY', currencySymbol: '¥', defaultRate: 104.5 },
  { name: 'Thailand', currencyCode: 'THB', currencySymbol: '฿', defaultRate: 442.0 },
  { name: 'United States', currencyCode: 'USD', currencySymbol: '$', defaultRate: 16100 },
  { name: 'Europe', currencyCode: 'EUR', currencySymbol: '€', defaultRate: 17400 },
  { name: 'Indonesia', currencyCode: 'IDR', currencySymbol: 'Rp', defaultRate: 1.0 },
  { name: 'Malaysia', currencyCode: 'MYR', currencySymbol: 'RM', defaultRate: 3600 },
  { name: 'Australia', currencyCode: 'AUD', currencySymbol: 'A$', defaultRate: 10600 },
  { name: 'United Kingdom', currencyCode: 'GBP', currencySymbol: '£', defaultRate: 20300 },
  { name: 'China', currencyCode: 'CNY', currencySymbol: '¥', defaultRate: 2200 },
  { name: 'Hong Kong', currencyCode: 'HKD', currencySymbol: 'HK$', defaultRate: 2050 },
  { name: 'Taiwan', currencyCode: 'TWD', currencySymbol: 'NT$', defaultRate: 495 },
  { name: 'Canada', currencyCode: 'CAD', currencySymbol: 'C$', defaultRate: 11700 },
  { name: 'Philippines', currencyCode: 'PHP', currencySymbol: '₱', defaultRate: 275 },
  { name: 'Vietnam', currencyCode: 'VND', currencySymbol: '₫', defaultRate: 0.65 },
  { name: 'India', currencyCode: 'INR', currencySymbol: '₹', defaultRate: 192 }
];

export function TripSettingsScreen() {
  const navigate = useNavigate();
  const { loading, tripSettings, saveSettings, currentUser, resetAllData, logout } = useMaster();
  const confirm = useConfirm();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [readyAt, setReadyAt] = useState('');
  const [limit, setLimit] = useState('15');
  const [settings, setSettings] = useState({
    code: 'SGD',
    symbol: 'S$',
    manualRate: 13500,
    realtimeRate: 13050,
    updatedAt: new Date().toISOString()
  });
  const [payoutCurrency, setPayoutCurrency] = useState('IDR');
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.5);
  const [showPriceBadge, setShowPriceBadge] = useState(true);
  const [badgePosition, setBadgePosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'none'>('bottom-right');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track initial state to detect unsaved changes
  const [initialState, setInitialState] = useState<any>(null);

  // Reset Dialog States
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetData = async () => {
    if (!currentUser || resetPassword !== currentUser.password) {
      toast.error('Incorrect password');
      return;
    }
    
    setIsResetting(true);
    try {
      await resetAllData();
      setResetDialogOpen(false);
      setResetPassword('');
      setResetConfirmText('');
      toast.success('All data has been wiped.');
      navigate('/');
    } catch (e) {
      toast.error('Reset failed');
    } finally {
      setIsResetting(false);
    }
  };

  // Sync inputs with master context once loaded
  useEffect(() => {
    if (!loading && tripSettings) {
      let curCode = 'SGD';
      
      if (tripSettings.trip) {
        setOrigin(tripSettings.trip.origin || 'Seoul');
        setDestination(tripSettings.trip.destination || 'Jakarta');
        setReadyAt(tripSettings.trip.date || '');
        setLimit((tripSettings.trip.weightLimit || 15).toString());
      }
      if (tripSettings.currency) {
        curCode = tripSettings.currency.code || 'SGD';
        setSettings({
          code: curCode,
          symbol: tripSettings.currency.symbol || 'S$',
          manualRate: tripSettings.currency.manualRate || 13500,
          realtimeRate: tripSettings.currency.realtimeRate || 13050,
          updatedAt: tripSettings.currency.updatedAt || new Date().toISOString()
        });
        setPayoutCurrency(tripSettings.currency.payout || 'IDR');

        // Fetch fresh rate on mount
        fetchLiveExchangeRate(curCode).then(rate => {
          setSettings(prev => ({
            ...prev,
            realtimeRate: rate
          }));
        });
      }
      if (tripSettings.watermark) {
        setWatermarkEnabled(!!tripSettings.watermark.enabled);
        setWatermarkImage(tripSettings.watermark.image || null);
        setWatermarkOpacity(tripSettings.watermark.opacity !== undefined ? tripSettings.watermark.opacity : 0.5);
        setShowPriceBadge(tripSettings.watermark.showPriceBadge !== false);
        setBadgePosition(tripSettings.watermark.badgePosition || 'bottom-right');
      }

      // Save initial state for dirtiness tracking
      setInitialState({
        origin: tripSettings.trip?.origin || 'Seoul',
        destination: tripSettings.trip?.destination || 'Jakarta',
        readyAt: tripSettings.trip?.date || '',
        limit: (tripSettings.trip?.weightLimit || 15).toString(),
        settings: {
          code: curCode,
          manualRate: tripSettings.currency?.manualRate || 13500,
        },
        payoutCurrency: tripSettings.currency?.payout || 'IDR',
        watermarkEnabled: !!tripSettings.watermark?.enabled,
        watermarkImage: tripSettings.watermark?.image || null,
        watermarkOpacity: tripSettings.watermark?.opacity !== undefined ? tripSettings.watermark?.opacity : 0.5,
        showPriceBadge: tripSettings.watermark?.showPriceBadge !== false,
        badgePosition: tripSettings.watermark?.badgePosition || 'bottom-right'
      });
    }
  }, [loading, tripSettings]);

  const isDirty = initialState && (
    origin !== initialState.origin ||
    destination !== initialState.destination ||
    readyAt !== initialState.readyAt ||
    limit !== initialState.limit ||
    settings.code !== initialState.settings.code ||
    settings.manualRate !== initialState.settings.manualRate ||
    payoutCurrency !== initialState.payoutCurrency ||
    watermarkEnabled !== initialState.watermarkEnabled ||
    watermarkImage !== initialState.watermarkImage ||
    watermarkOpacity !== initialState.watermarkOpacity ||
    showPriceBadge !== initialState.showPriceBadge ||
    badgePosition !== initialState.badgePosition
  );

  const handleBack = async () => {
    if (isDirty) {
      const confirmed = await confirm("You have unsaved changes. Are you sure you want to discard them?");
      if (confirmed) navigate('/');
    } else {
      navigate('/');
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    const confirmed = await confirm("Are you sure you want to save these trip settings?");
    if (!confirmed) {
      return;
    }
    
    setIsSubmitting(true);
    const updated = {
      trip: {
        origin,
        destination,
        date: readyAt,
        weightLimit: parseInt(limit) || 15
      },
      currency: {
        ...settings,
        payout: payoutCurrency
      },
      notifs: { push: true, email: false, orders: true, chat: true },
      watermark: {
        enabled: watermarkEnabled,
        image: watermarkImage || '',
        opacity: watermarkOpacity,
        showPriceBadge: showPriceBadge,
        badgePosition: badgePosition
      }
    };
    try {
      await saveSettings(updated);
      toast.success('Trip settings updated!');
      navigate('/');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrencyName = (code: string) => CURRENCIES.find(c => c.code === code)?.name || code;

  return (
    <div className="min-h-screen bg-white pb-28">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl pt-8 pb-4 border-none h-auto flex items-center px-4 gap-4">
        <MobileMenu />
        <Button variant="ghost" size="icon" className="rounded-full bg-[#f2f5f7] shadow-sm hover:bg-slate-200 shrink-0" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5 text-[#0D1B2E]" />
        </Button>
        <h2 className="text-xl font-bold tracking-tight text-[#0D1B2E] flex-1">Trip Settings</h2>
      </header>

      <div className="p-6 space-y-8">
        {/* Route Details */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
             <MapPin className="h-4 w-4" /> Route Details
          </div>
          <div className="space-y-4 text-left p-4 rounded-3xl bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-100/60">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">From (Origin Country)</label>
              <select 
                value={origin} 
                onChange={async (e) => {
                  const newOrigin = e.target.value;
                  setOrigin(newOrigin);
                  const matched = COUNTRIES.find(c => c.name === newOrigin);
                  if (matched) {
                    toast.info(`Origin country changed to ${newOrigin}. Changing shopping currency to ${matched.currencyCode} and fetching rate...`);
                    try {
                      const rate = await fetchLiveExchangeRate(matched.currencyCode);
                      const symbol = matched.currencySymbol;
                      const manualDefault = Math.round(rate * 1.03);
                      setSettings({
                        code: matched.currencyCode,
                        symbol: symbol,
                        realtimeRate: rate,
                        manualRate: manualDefault,
                        updatedAt: new Date().toISOString()
                      });
                    } catch (err) {
                      setSettings({
                        code: matched.currencyCode,
                        symbol: matched.currencySymbol,
                        realtimeRate: matched.defaultRate,
                        manualRate: Math.round(matched.defaultRate * 1.03),
                        updatedAt: new Date().toISOString()
                      });
                    }
                  }
                }}
                className="w-full h-14 rounded-2xl bg-[#f2f5f7] border-none px-4 font-bold text-sm text-[#0D1B2E] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Origin Country</option>
                {COUNTRIES.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">To (Destination Country)</label>
              <select 
                value={destination} 
                onChange={(e) => {
                  const newDest = e.target.value;
                  setDestination(newDest);
                  const matched = COUNTRIES.find(c => c.name === newDest);
                  if (matched) {
                    setPayoutCurrency(matched.currencyCode);
                  }
                }}
                className="w-full h-14 rounded-2xl bg-[#f2f5f7] border-none px-4 font-bold text-sm text-[#0D1B2E] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Destination Country</option>
                {COUNTRIES.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">Ready at Destination (Departure Date)</label>
              <Input 
                type="date"
                value={readyAt}
                onChange={(e) => setReadyAt(e.target.value)}
                className="w-full h-14 rounded-2xl bg-[#f2f5f7] border-none px-4 font-bold text-sm text-[#0D1B2E] focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
        </section>

        <Separator className="opacity-50" />
        
        {/* Currency & Finance */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
             <Globe className="h-4 w-4" /> Currency & Exchange Rate
          </div>
          <div className="space-y-4">
             <div className="p-4 rounded-3xl bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-100/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-[1rem] bg-[#f2f5f7] flex items-center justify-center font-black text-sm text-[#0D1B2E] shadow-sm">{settings.code}</div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#0D1B2E]">Shopping Currency</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        {getCurrencyName(settings.code)}
                      </p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger render={<Button variant="outline" size="sm" className="font-bold text-[10px] uppercase tracking-widest h-8 px-4 rounded-xl border-dashed hover:bg-slate-50" />}>
                      Change
                    </DialogTrigger>
                    <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="sm:max-w-md rounded-[2rem] p-6 border-none bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-left font-black text-xl text-[#0D1B2E]">Select Shopping Currency</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 gap-2 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {CURRENCIES.filter(c => c.code !== 'IDR').map(curr => (
                          <Button 
                            key={curr.code}
                            variant={settings.code === curr.code ? 'default' : 'ghost'}
                            className={cn(
                              "justify-between h-14 px-4 rounded-2xl font-bold transition-all",
                              settings.code === curr.code ? "bg-[#0D1B2E] text-white hover:bg-[#162847]" : "hover:bg-[#f2f5f7] text-slate-600"
                            )}
                            onClick={async () => {
                              const confirmed = await confirm(`Are you sure you want to change the shopping currency to ${curr.code}? This will fetch and calculate a new exchange rate.`);
                              if (!confirmed) {
                                  return;
                              }
                              const rate = await fetchLiveExchangeRate(curr.code);
                              const symbol = CURRENCY_SYMBOLS[curr.code] || '$';
                              const manualDefault = Math.round(rate * 1.03);
                              setSettings({
                                code: curr.code,
                                symbol: symbol,
                                realtimeRate: rate,
                                manualRate: manualDefault,
                                updatedAt: new Date().toISOString()
                              });
                            }}
                          >
                            <span className="flex items-center gap-3">
                               <span className={cn("text-[10px] uppercase tracking-widest w-8 text-left", settings.code === curr.code ? "text-white/70" : "text-slate-400")}>{curr.code}</span>
                               {curr.name}
                            </span>
                            {settings.code === curr.code && <Check className="h-5 w-5" />}
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <Separator className="opacity-50" />

                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manual Rate (1 {settings.code} to IDR)</label>
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-600 border-none px-2 uppercase tracking-widest font-black">Realtime: {settings.realtimeRate.toLocaleString()}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</div>
                      <Input 
                        type="text" 
                        value={settings.manualRate === 0 ? '' : settings.manualRate} 
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                          setSettings({...settings, manualRate: Number(cleaned) || 0});
                        }}
                        inputMode="decimal"
                        className="h-14 pl-12 rounded-2xl bg-[#f2f5f7] border-none font-black text-lg text-[#0D1B2E] focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary px-4 py-2 h-14 flex items-center justify-center bg-primary/10 rounded-2xl shrink-0">
                      +{((settings.manualRate / settings.realtimeRate - 1) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium px-1">Tip: Set a higher rate to cover bank conversion fees and rounding.</p>
                </div>
             </div>

             <div className="flex items-center justify-between p-4 rounded-3xl bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-100/60">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-[1rem] bg-[#f2f5f7] flex items-center justify-center font-black text-sm text-[#0D1B2E] shadow-sm">{payoutCurrency}</div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#0D1B2E]">Payout Currency</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{getCurrencyName(payoutCurrency)}</p>
                  </div>
                </div>
                  <Dialog>
                    <DialogTrigger render={<Button variant="outline" size="sm" className="font-bold text-[10px] uppercase tracking-widest h-8 px-4 rounded-xl border-dashed hover:bg-slate-50" />}>
                      Change
                    </DialogTrigger>
                    <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="sm:max-w-md rounded-[2rem] p-6 border-none bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-left font-black text-xl text-[#0D1B2E]">Select Payout Currency</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 gap-2 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {CURRENCIES.map(curr => (
                          <Button 
                            key={curr.code}
                            variant={payoutCurrency === curr.code ? 'default' : 'ghost'}
                            className={cn(
                              "justify-between h-14 px-4 rounded-2xl font-bold transition-all",
                              payoutCurrency === curr.code ? "bg-[#0D1B2E] text-white hover:bg-[#162847]" : "hover:bg-[#f2f5f7] text-slate-600"
                            )}
                            onClick={async () => {
                              const confirmed = await confirm(`Are you sure you want to set the settlement payout currency to ${curr.code}?`);
                              if (!confirmed) {
                                return;
                              }
                              setPayoutCurrency(curr.code);
                            }}
                          >
                            <span className="flex items-center gap-3">
                               <span className={cn("text-[10px] uppercase tracking-widest w-8 text-left", payoutCurrency === curr.code ? "text-white/70" : "text-slate-400")}>{curr.code}</span>
                               {curr.name}
                            </span>
                            {payoutCurrency === curr.code && <Check className="h-5 w-5" />}
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
             </div>
          </div>
        </section>

        <Separator className="opacity-50" />

        {/* Photo Export & Watermark */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
             <Settings2 className="h-4 w-4" /> Photo Export & Watermark
          </div>
          <div className="space-y-6 text-left p-4 rounded-3xl bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-100/60">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 text-left">
                <p className="text-sm font-bold text-[#0D1B2E]">Enable Photo Watermark</p>
                <p className="text-[10px] text-slate-400 font-medium leading-snug pr-4">Overlay watermark logo on catalog product photos</p>
              </div>
              <button
                type="button"
                onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                className={cn(
                  "h-8 w-14 rounded-full relative p-1.5 cursor-pointer transition-colors shrink-0 shadow-inner",
                  watermarkEnabled ? "bg-[#0D1B2E]" : "bg-[#f2f5f7] border border-slate-200"
                )}
              >
                <div className={cn(
                  "h-5 w-5 bg-white rounded-full transition-all shadow-sm",
                  watermarkEnabled ? "ml-auto" : "ml-0"
                )} />
              </button>
            </div>

            {watermarkEnabled && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upload Watermark Image</label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    {watermarkImage ? (
                      <div className="relative h-20 w-20 rounded-[1.25rem] border border-slate-100 overflow-hidden shrink-0 bg-[#f2f5f7] flex items-center justify-center p-2">
                        <img src={watermarkImage} alt="Watermark Preview" className="h-full w-full object-contain mix-blend-multiply" />
                        <button
                          type="button"
                          onClick={() => setWatermarkImage(null)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-md border-2 border-white transition-transform hover:scale-110 active:scale-95"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label className="h-20 w-20 rounded-[1.25rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all shrink-0 bg-[#f2f5f7]/50">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                toast.loading('Uploading watermark...', { id: 'watermark-upload' });
                                const base64Image = reader.result as string;
                                let uploadedImage = base64Image;

                                try {
                                  const { db } = await import('../lib/supabase');
                                  uploadedImage = await db.uploadImage(base64Image, 'catalog');
                                } catch (e) {
                                  console.error("Failed to upload watermark image:", e);
                                }

                                setWatermarkImage(uploadedImage);
                                toast.success('Watermark uploaded!', { id: 'watermark-upload' });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload</span>
                      </label>
                    )}
                    <p className="text-[10px] text-slate-400 leading-normal font-medium text-left flex-1">
                      Upload a transparent PNG logo. When toggle is ON, this logo will be automatically overlaid on the bottom right corner of product photos.
                    </p>
                  </div>
                </div>
                
                {/* Opacity Slider */}
                <div className="space-y-4 pt-4 mt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Watermark Opacity</label>
                    <span className="text-xs font-black text-[#0D1B2E] bg-[#f2f5f7] px-3 py-1 rounded-lg">{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full accent-[#0D1B2E] h-2 bg-[#f2f5f7] rounded-full appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    Adjust how transparent the watermark appears on your photos.
                  </p>
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Enable Sell Price Badge</label>
                  <p className="text-[10px] text-slate-400 font-medium px-1">Display sell price on catalog and exported photos.</p>
                </div>
                <div 
                  className={cn("h-8 w-14 rounded-full relative p-1.5 cursor-pointer shadow-inner transition-colors", showPriceBadge ? "bg-emerald-500" : "bg-slate-200")}
                  onClick={() => setShowPriceBadge(!showPriceBadge)}
                >
                  <div className={cn("h-5 w-5 bg-white rounded-full shadow-sm transition-transform", showPriceBadge ? "ml-auto" : "ml-0")} />
                </div>
              </div>

              {showPriceBadge && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Sell Price Badge Position</label>
                  <select 
                    value={badgePosition} 
                    onChange={(e) => setBadgePosition(e.target.value as any)}
                    className="w-full h-14 bg-[#f2f5f7] border-none rounded-2xl px-4 text-sm font-bold text-[#0D1B2E] appearance-none cursor-pointer outline-none ring-0"
                    style={{ WebkitAppearance: 'none' }}
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                  </select>
                  <p className="text-[10px] text-slate-400 font-medium px-2">Position of the price badge when exporting photos.</p>
                </div>
              )}
            </div>

            </div>
          </div>
        </section>

        <Separator className="opacity-50" />

        {/* Operational Status */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
             <Settings2 className="h-4 w-4" /> Operational Status
          </div>
          <div className="flex items-center justify-between p-5 rounded-3xl bg-amber-50/50 border border-amber-100/50">
            <div className="space-y-1 text-left">
              <p className="text-sm font-bold text-amber-700">Accepting Requests</p>
              <p className="text-[10px] text-amber-700/60 font-medium pr-4">Toggle this if you're no longer taking orders for this trip</p>
            </div>
            <div className="h-8 w-14 bg-amber-500 rounded-full relative p-1.5 cursor-pointer shadow-inner">
              <div className="h-5 w-5 bg-white rounded-full ml-auto shadow-sm" />
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <Separator className="opacity-50 mt-4" />
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-500 ml-1">
             <AlertTriangle className="h-4 w-4" /> Danger Zone
          </div>
          <div className="p-5 rounded-3xl bg-red-50/50 border border-red-100/50 space-y-3">
             <div className="space-y-1 text-left">
                <p className="text-sm font-bold text-red-700">Factory Reset</p>
                <p className="text-[10px] text-red-700/60 font-medium pr-4">Permanently delete all sales, expenses, catalogs, and wishlists. This action cannot be undone.</p>
             </div>
             <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
               <DialogTrigger asChild>
                 <Button variant="outline" className="w-full bg-white text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-xl h-12 font-bold mt-2 shadow-sm">
                   Reset All Data
                 </Button>
               </DialogTrigger>
               <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="sm:max-w-md rounded-[2rem] p-6 border-none bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
                 <DialogHeader>
                   <DialogTitle className="text-xl font-black text-red-600 flex items-center gap-2">
                     <AlertTriangle className="h-5 w-5" /> Reset Data
                   </DialogTitle>
                 </DialogHeader>
                 <div className="space-y-5 py-2">
                   <div className="space-y-2">
                     <p className="text-xs text-slate-500 font-medium leading-relaxed">
                       This will permanently delete all your records. To confirm, please type <strong className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded select-all">delete my data</strong> below.
                     </p>
                     <Input 
                       placeholder="delete my data" 
                       value={resetConfirmText}
                       onChange={e => setResetConfirmText(e.target.value)}
                       className="bg-slate-50 border-slate-200 h-12 rounded-xl font-bold text-slate-800"
                     />
                   </div>
                   <div className="space-y-2">
                     <p className="text-xs text-slate-500 font-medium">Please enter your account password to verify.</p>
                     <Input 
                       type="password" 
                       placeholder="Your password" 
                       value={resetPassword}
                       onChange={e => setResetPassword(e.target.value)}
                       className="bg-slate-50 border-slate-200 h-12 rounded-xl font-bold text-slate-800"
                     />
                   </div>
                   <Button 
                     className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-red-600/20"
                     disabled={resetConfirmText !== 'delete my data' || !resetPassword || isResetting}
                     onClick={handleResetData}
                   >
                     {isResetting ? 'Resetting...' : 'Delete Everything'}
                   </Button>
                 </div>
               </DialogContent>
             </Dialog>
          </div>
        </section>

        <div className="pt-4 pb-8 space-y-3">
          {isDirty && (
            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Unsaved Changes
            </div>
          )}
          <Button 
            className={cn(
              "w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl transition-all",
              isDirty ? "bg-[#C9A84C] text-[#0D1B2E] hover:bg-[#b09341] shadow-[#C9A84C]/20" : "bg-[#0D1B2E] text-white hover:bg-[#162847] shadow-[#0D1B2E]/10"
            )}
            onClick={handleSave}
            disabled={isSubmitting}
          >
            <Check className="h-5 w-5" />
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
