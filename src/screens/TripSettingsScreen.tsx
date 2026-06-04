import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Check, 
  MapPin, 
  Globe,
  Settings2,
  Edit2
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
  const { loading, tripSettings, saveSettings } = useMaster();
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Sync inputs with master context once loaded
  useEffect(() => {
    if (!loading && tripSettings) {
      if (tripSettings.trip) {
        setOrigin(tripSettings.trip.origin || 'Seoul');
        setDestination(tripSettings.trip.destination || 'Jakarta');
        setReadyAt(tripSettings.trip.date || '');
        setLimit((tripSettings.trip.weightLimit || 15).toString());
      }
      if (tripSettings.currency) {
        const curCode = tripSettings.currency.code || 'SGD';
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
      }
    }
  }, [loading, tripSettings]);

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
        opacity: watermarkOpacity
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
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl pt-8 pb-4 border-none h-auto flex items-center px-4 gap-4">
        <Button variant="ghost" size="icon" className="rounded-full bg-card shadow-sm hover:bg-muted shrink-0" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Button>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Trip Settings</h2>
      </header>

      <div className="p-6 space-y-8">
        {/* Route Details */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
             <MapPin className="h-3 w-3" /> Route Details
          </div>
          <div className="space-y-4 text-left">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground ml-1">FROM (Origin Country)</label>
                <button type="button" onClick={() => setEditingField(editingField === 'origin' ? null : 'origin')} className="p-1.5 bg-white shadow-sm rounded-lg text-primary hover:bg-slate-50 transition-colors">
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
              <select 
                disabled={editingField !== 'origin'}
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
                className="w-full h-12 rounded-xl bg-muted/30 border-none px-4 font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Origin Country</option>
                {COUNTRIES.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground ml-1">TO (Destination Country)</label>
                <button type="button" onClick={() => setEditingField(editingField === 'destination' ? null : 'destination')} className="p-1.5 bg-white shadow-sm rounded-lg text-primary hover:bg-slate-50 transition-colors">
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
              <select 
                disabled={editingField !== 'destination'}
                value={destination} 
                onChange={(e) => {
                  const newDest = e.target.value;
                  setDestination(newDest);
                  const matched = COUNTRIES.find(c => c.name === newDest);
                  if (matched) {
                    setPayoutCurrency(matched.currencyCode);
                  }
                }}
                className="w-full h-12 rounded-xl bg-muted/30 border-none px-4 font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Destination Country</option>
                {COUNTRIES.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground ml-1">READY AT DESTINATION (DEPARTURE DATE) *</label>
                <button type="button" onClick={() => setEditingField(editingField === 'readyAt' ? null : 'readyAt')} className="p-1.5 bg-white shadow-sm rounded-lg text-primary hover:bg-slate-50 transition-colors">
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
              <Input 
                disabled={editingField !== 'readyAt'}
                type="date"
                value={readyAt}
                onChange={(e) => setReadyAt(e.target.value)}
                className="w-full h-12 rounded-xl bg-muted/30 border-none px-4 font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
        </section>

        <Separator />
        
        {/* Currency & Finance */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
             <Globe className="h-3 w-3" /> Currency & Exchange Rate
          </div>
          <div className="space-y-4">
             <div className="p-4 rounded-2xl bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center font-bold text-xs ring-4 ring-primary/5 shadow-sm">{settings.code}</div>
                    <div className="text-left">
                      <p className="text-sm font-bold">Shopping Currency</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                        {getCurrencyName(settings.code)}
                      </p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger render={<Button variant="ghost" size="sm" className="text-primary font-bold text-xs h-8 px-3 rounded-lg hover:bg-primary/10" />}>
                      Change
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-none bg-background shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-left font-bold text-xl text-foreground">Select Shopping Currency</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 gap-2 mt-4">
                        {CURRENCIES.filter(c => c.code !== 'IDR').map(curr => (
                          <Button 
                            key={curr.code}
                            variant={settings.code === curr.code ? 'default' : 'ghost'}
                            className="justify-between h-12 px-4 rounded-xl font-bold"
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
                               <span className="opacity-40">{curr.code}</span>
                               {curr.name}
                            </span>
                            {settings.code === curr.code && <Check className="h-4 w-4" />}
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <Separator className="bg-background" />

                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Manual Rate (1 {settings.code} to IDR)</label>
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-none px-2">Realtime: {settings.realtimeRate.toLocaleString()}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">Rp</div>
                      <Input 
                        type="text" 
                        value={settings.manualRate === 0 ? '' : settings.manualRate.toLocaleString()} 
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^0-9]/g, '');
                          setSettings({...settings, manualRate: Number(cleaned) || 0});
                        }}
                        inputMode="numeric"
                        className="h-12 pl-10 rounded-xl bg-background border-none font-bold text-lg"
                      />
                    </div>
                    <div className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">
                      +{((settings.manualRate / settings.realtimeRate - 1) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic px-1">Tip: Set a higher rate to cover bank conversion fees and rounding.</p>
                </div>
             </div>

             <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center font-bold text-xs ring-4 ring-primary/5">{payoutCurrency}</div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Payout Currency</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{getCurrencyName(payoutCurrency)}</p>
                  </div>
                </div>
                  <Dialog>
                    <DialogTrigger render={<Button variant="ghost" size="sm" className="text-primary font-bold text-xs h-8 px-3 rounded-lg hover:bg-primary/10" />}>
                      Change
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-none bg-background shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-left font-bold text-xl text-foreground">Select Payout Currency</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 gap-2 mt-4">
                        {CURRENCIES.map(curr => (
                          <Button 
                            key={curr.code}
                            variant={payoutCurrency === curr.code ? 'default' : 'ghost'}
                            className="justify-between h-12 px-4 rounded-xl font-bold"
                            onClick={async () => {
                              const confirmed = await confirm(`Are you sure you want to set the settlement payout currency to ${curr.code}?`);
                              if (!confirmed) {
                                return;
                              }
                              setPayoutCurrency(curr.code);
                            }}
                          >
                            <span className="flex items-center gap-3">
                               <span className="opacity-40">{curr.code}</span>
                               {curr.name}
                            </span>
                            {payoutCurrency === curr.code && <Check className="h-4 w-4" />}
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
             </div>
          </div>
        </section>

        <Separator />

        {/* Photo Watermark Settings */}
        <section className="space-y-4 text-left">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
             <Settings2 className="h-3 w-3" /> Photo Watermark
          </div>
          <div className="p-4 rounded-2xl bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 text-left">
                <p className="text-sm font-bold">Enable Photo Watermark</p>
                <p className="text-[10px] text-muted-foreground font-medium">Overlay watermark logo on catalog product photos</p>
              </div>
              <button
                type="button"
                onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                className={cn(
                  "h-6 w-11 rounded-full relative p-1 cursor-pointer transition-colors shrink-0",
                  watermarkEnabled ? "bg-primary" : "bg-slate-300"
                )}
              >
                <div className={cn(
                  "h-4 w-4 bg-white rounded-full transition-all",
                  watermarkEnabled ? "ml-auto" : "ml-0"
                )} />
              </button>
            </div>

            {watermarkEnabled && (
              <div className="space-y-3 pt-2 border-t border-background">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Upload Watermark Image</label>
                <div className="flex items-center gap-4">
                  {watermarkImage ? (
                    <div className="relative h-16 w-16 rounded-xl border overflow-hidden shrink-0 bg-white shadow-sm flex items-center justify-center p-1">
                      <img src={watermarkImage} alt="Watermark Preview" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setWatermarkImage(null)}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] shadow-md border border-white"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="h-16 w-16 rounded-xl border border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors shrink-0 bg-background">
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
                      <span className="text-[10px] font-bold text-muted-foreground">Upload</span>
                    </label>
                  )}
                  <p className="text-[10px] text-muted-foreground leading-normal font-medium text-left">
                    Upload a transparent PNG logo. When toggle is ON, this logo will be automatically overlaid on the bottom right corner of product photos.
                  </p>
                </div>
                
                {/* Opacity Slider */}
                <div className="space-y-3 pt-4 mt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Watermark Opacity</label>
                    <span className="text-xs font-bold text-primary">{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Adjust how transparent the watermark appears on your photos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* Operational Status */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
             <Settings2 className="h-3 w-3" /> Operational Status
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="space-y-1 text-left">
              <p className="text-sm font-bold text-primary">Accepting Requests</p>
              <p className="text-[10px] text-primary/60 font-medium">Toggle this if you're no longer taking orders</p>
            </div>
            <div className="h-6 w-11 bg-primary rounded-full relative p-1 cursor-pointer">
              <div className="h-4 w-4 bg-white rounded-full ml-auto" />
            </div>
          </div>
        </section>

        <Button 
          className="w-full h-14 rounded-2xl font-bold gap-3 shadow-lg shadow-primary/20" 
          onClick={handleSave}
          disabled={isSubmitting}
        >
          <Check className="h-5 w-5" />
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
