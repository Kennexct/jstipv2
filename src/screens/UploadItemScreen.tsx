import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Camera, 
  ArrowLeft, 
  Check, 
  Info,
  X,
  Save,
  Share2,
  Image as ImageIcon,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { WatermarkOverlay } from '../components/WatermarkOverlay';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMaster } from '../context/MasterContext';
import { useConfirm } from '../context/ConfirmContext';
import { isAiConfigured, analyzeProductImage } from '../lib/ai';
import imageCompression from 'browser-image-compression';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';

// Watermark is now applied via CSS overlay (WatermarkOverlay)

const resizeImageToMax = (originalImageSrc: string, maxDim: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    if (!originalImageSrc.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      } else {
        resolve(originalImageSrc);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        resolve(originalImageSrc);
      }
    };
    img.onerror = () => resolve(originalImageSrc);
    img.src = originalImageSrc;
  });
};

const drawPriceLabelOnImage = (originalImageSrc: string, priceText: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    if (!originalImageSrc.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        const canvasScale = Math.min(canvas.width, canvas.height);
        const fontSize = Math.max(14, Math.round(canvasScale * 0.035));
        const paddingX = Math.round(fontSize * 0.8);
        const paddingY = Math.round(fontSize * 0.4);
        const borderRadius = Math.round(fontSize * 0.5);
        
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
        
        const textMetrics = ctx.measureText(priceText);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;
        
        const pillWidth = textWidth + paddingX * 2;
        const pillHeight = textHeight + paddingY * 2;
        
        const margin = Math.max(10, Math.round(canvasScale * 0.04));
        const pillX = canvas.width - pillWidth - margin;
        const pillY = margin;
        
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(pillX, pillY, pillWidth, pillHeight, borderRadius);
        } else {
          ctx.rect(pillX, pillY, pillWidth, pillHeight);
        }
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const textX = pillX + paddingX;
        const textY = pillY + paddingY + textHeight / 2;
        ctx.fillText(priceText, textX, textY);
        
        ctx.restore();
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        resolve(originalImageSrc);
      }
    };
    img.onerror = () => {
      resolve(originalImageSrc);
    };
    img.src = originalImageSrc;
  });
};

export function UploadItemScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { loading, catalogItems, tripSettings, saveItem } = useMaster();
  const confirm = useConfirm();

  const [image, setImage] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [publishPrice, setPublishPrice] = useState('');
  const [settings, setSettings] = useState<any>({
    code: 'SGD',
    symbol: 'S$',
    manualRate: 13500,
    realtimeRate: 13050,
    updatedAt: new Date().toISOString()
  });
  const [costCurrency, setCostCurrency] = useState(settings.code);
  const itemSetRef = useRef(false);
  const [showShareBanner, setShowShareBanner] = useState(false);
  const [bannerColor, setBannerColor] = useState('bg-white');

  const bannerColors = [
    { name: 'White', class: 'bg-white', text: 'text-slate-900', border: 'border-slate-200' },
    { name: 'Blue', class: 'bg-blue-600', text: 'text-white', border: 'border-blue-400' },
    { name: 'Purple', class: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-400' },
    { name: 'Black', class: 'bg-slate-900', text: 'text-white', border: 'border-slate-700' },
    { name: 'Pink', class: 'bg-rose-500', text: 'text-white', border: 'border-rose-300' },
  ];

  useEffect(() => {
    if (!loading) {
      if (tripSettings && tripSettings.currency) {
        setSettings(tripSettings.currency);
        if (!isEdit && !itemSetRef.current) {
          setCostCurrency(tripSettings.currency.code);
          itemSetRef.current = true;
        }
      }

      if (isEdit && catalogItems) {
        const item = catalogItems.find((i: any) => i.id === id);
        if (item) {
          setImage(item.image);
          setRawImage(item.rawImage || item.image || null);
          setName(item.name);
          if (item.cost) setPrice(item.cost.toString());
          if (item.currency) setCostCurrency(item.currency);
          if (item.price) setPublishPrice(item.price.toString());
        }
      }
    }
  }, [id, isEdit, loading, catalogItems, tripSettings]);

  const basePriceIdr = 0; // Handled dynamically in render now
  const margin = 0; // Handled dynamically in render now



  const processImageWithAI = async (dataUrl: string) => {
    // Watermark is now handled via CSS Overlay, so we just use the raw resized dataUrl.
    setRawImage(dataUrl);
    setImage(dataUrl);
    if (!isAiConfigured() || isEdit) return;

    setIsAnalyzing(true);
    toast.info('AI is analyzing the product...', { icon: <Sparkles className="h-4 w-4 text-amber-500" /> });
    
    try {
      const result = await analyzeProductImage(dataUrl);
      if (result) {
        if (result.name) setName(result.name);
        if (result.price > 0) {
          setPrice(result.price.toString());
          // Auto-calculate a 20% margin for the publish price as a smart default
          const costIdr = result.price * settings.manualRate;
          const suggestedPublishPrice = Math.ceil((costIdr * 1.2) / 1000) * 1000;
          setPublishPrice(suggestedPublishPrice.toString());
        }
        toast.success('AI filled in product details!');
      } else {
        toast.error('AI could not identify the product.');
      }
    } catch (e) {
      console.error(e);
      toast.error('AI analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          try {
            const resizedUrl = await resizeImageToMax(dataUrl, 800);
            processImageWithAI(resizedUrl);
            toast.success('Photo optimized & uploaded!');
          } catch (e) {
            processImageWithAI(dataUrl);
          }
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Image compression error:', error);
        toast.error('Failed to optimize image, using original...');
        // Fallback to original
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          processImageWithAI(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    }
  };



  const handleSave = async () => {
    if (isSubmitting) return;
    if (!name.trim() || !price || !publishPrice) {
      toast.error('Please fill in all fields');
      return;
    }

    const confirmed = await confirm(isEdit ? "Are you sure you want to save changes to this catalog item?" : "Are you sure you want to add this item to the catalog?");
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    const baseImage = rawImage || image || '';
    let finalImage = baseImage;
    // We no longer burn the price label into the image during upload.
    // This is now handled dynamically during export via exportProductImage.

    let uploadedFinalImage = finalImage;
    let uploadedBaseImage = baseImage;
    try {
      const { db } = await import('../lib/supabase');
      toast.loading("Uploading image to cloud storage...", { id: 'upload-toast' });
      if (finalImage.startsWith('data:')) {
        uploadedFinalImage = await db.uploadImage(finalImage, 'catalog');
      }
      if (baseImage.startsWith('data:') && baseImage !== finalImage) {
        uploadedBaseImage = await db.uploadImage(baseImage, 'catalog');
      } else if (baseImage === finalImage) {
        uploadedBaseImage = uploadedFinalImage;
      }
      toast.dismiss('upload-toast');
    } catch (e) {
      console.error("Failed to upload image to bucket:", e);
      toast.dismiss('upload-toast');
    }

    const itemToSave = {
      id: id || 'item_' + Date.now(),
      name: name.trim(),
      price: Number(publishPrice),
      cost: Number(price),
      currency: costCurrency,
      image: uploadedFinalImage,
      rawImage: uploadedBaseImage,
      status: 'active'
    };

    try {
      await saveItem(itemToSave);
      toast.success(isEdit ? 'Changes saved!' : 'Item listed successfully!', {
        description: isEdit ? 'Your product catalog has been updated.' : 'Your item is now visible to matched customers.',
      });
      navigate(-1);
    } catch (e) {
      toast.error('Failed to save item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f5f7] pb-32">
      <header className="sticky top-0 z-50 bg-[#f2f5f7]/80 backdrop-blur-md pt-8 pb-4 border-none h-auto flex items-center px-4 gap-4">
        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-slate-50 shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-[#0D1B2E]" />
        </Button>
        <h2 className="text-xl font-black tracking-tight text-[#0D1B2E]">{isEdit ? 'Edit Item' : 'Add to Catalog'}</h2>
      </header>

      <div className="p-6 space-y-8">
        {/* Photo Upload Section */}
        <section className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Photo Reference</label>
          <input
            type="file"
            accept="image/*"
            id="product-photo-upload"
            className="hidden"
            onChange={handleFileChange}
          />
          {image ? (
            <div className="relative h-56 bg-slate-50 w-full rounded-2xl overflow-hidden shadow-sm border border-slate-100">
              <WatermarkOverlay />
              <img src={image} alt="Preview" className={`w-full h-full object-cover transition-all ${isAnalyzing ? 'blur-sm scale-105 brightness-50' : ''}`} />
              
              {isAnalyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 space-y-3">
                  <div className="relative">
                    <div className="absolute inset-0 blur-xl bg-primary/30 rounded-full animate-pulse" />
                    <Sparkles className="h-12 w-12 text-primary animate-bounce relative z-10" />
                  </div>
                  <div className="bg-background/80 backdrop-blur-md px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2 shadow-xl border border-primary/20">
                    <Loader2 className="h-3 w-3 animate-spin" /> AI Analyzing...
                  </div>
                </div>
              )}

              <div className="absolute top-4 right-4 flex gap-2 z-20">
                <button 
                  onClick={() => setShowShareBanner(true)}
                  className="h-10 w-10 rounded-full bg-primary/80 backdrop-blur-md text-white flex items-center justify-center transition-transform hover:scale-110"
                  title="Generate Share Banner"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <label 
                  htmlFor="product-photo-upload"
                  className="h-10 w-10 rounded-full bg-indigo-600 backdrop-blur-md text-white flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                  title="Change Photo"
                >
                  <Camera className="h-5 w-5" />
                </label>
                <button 
                  onClick={() => setImage(null)}
                  className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center transition-transform hover:scale-110"
                  title="Remove Photo"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {showShareBanner && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 gap-6"
                >
                  <div className={`${bannerColors.find(c => c.class === bannerColor)?.class || 'bg-white'} rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl relative transition-colors duration-300`}>
                    <div className="relative aspect-square">
                      <WatermarkOverlay />
                      <img src={image} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
                        <div className="space-y-1 text-left">
                          <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">Available for Request</p>
                          <h3 className="text-white text-2xl font-black leading-tight uppercase italic">{name || "Your Item"}</h3>
                        </div>
                      </div>
                      <div className="absolute top-4 right-4 bg-primary text-white font-black px-4 py-2 rounded-2xl shadow-xl rotate-3">
                        Rp {publishPrice ? Number(publishPrice).toLocaleString() : "0"}
                      </div>
                    </div>
                    <div className={`p-5 ${bannerColors.find(c => c.class === bannerColor)?.text || 'text-slate-900'} flex items-center justify-between`}>
                       <div className="flex items-center gap-3">
                           <div className={`h-10 w-10 rounded-full border ${bannerColors.find(c => c.class === bannerColor)?.border || 'border-slate-200'} flex items-center justify-center overflow-hidden bg-white`}>
                             <img src="/logo.png" alt="JStip" className="w-8 h-8 object-contain" />
                           </div>
                          <div className="space-y-0.5">
                            <span className="block text-[10px] font-black uppercase tracking-wider opacity-60">Fulfill via</span>
                            <span className="block text-sm font-black uppercase italic tracking-tighter">JStip Platform</span>
                          </div>
                       </div>
                       <ImageIcon className="h-5 w-5 opacity-30" />
                    </div>
                    <button 
                      onClick={() => setShowShareBanner(false)}
                      className="absolute top-2 left-2 h-8 w-8 rounded-full bg-black/20 text-white/50 hover:bg-black/40 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Color Selector */}
                  <div className="bg-white/10 backdrop-blur-xl p-2 rounded-2xl flex gap-2 border border-white/10">
                    {bannerColors.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setBannerColor(color.class)}
                        className={`h-8 w-8 rounded-xl ${color.class} border-2 transition-transform hover:scale-110 ${bannerColor === color.class ? 'border-primary ring-2 ring-primary/20' : 'border-white/20'}`}
                        title={color.name}
                      />
                    ))}
                  </div>

                  <div className="w-full max-w-sm px-4">
                    <Button variant="secondary" className="w-full h-14 rounded-2xl gap-2 font-black italic text-sm shadow-xl" onClick={() => {
                      toast.success('Banner ready to share!');
                      setShowShareBanner(false);
                    }}>
                      <Save className="h-5 w-5" /> DOWNLOAD FOR STORY
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <label htmlFor="product-photo-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
              <Camera className="h-6 w-6 text-slate-400 mb-2" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Add Photo Reference</span>
            </label>
          )}
        </section>

        {/* Product Details */}
        <section className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Product Details</label>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Product Name</label>
              <Input 
                placeholder="What are you selling?" 
                className="h-12 rounded-xl bg-muted/30 border-none px-4"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Pricing Information */}
        <section className="space-y-4">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pricing & Currency</label>
            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-none">Rate: 1 {settings.code} = Rp {settings.manualRate.toLocaleString()}</Badge>
          </div>
          
          {(() => {
            const basePriceIdr = costCurrency === settings.code 
              ? Number(price) * settings.manualRate 
              : Number(price);
            const margin = Number(publishPrice) - basePriceIdr;
            const marginPercentage = basePriceIdr > 0 ? (margin / basePriceIdr) * 100 : 0;
            
            return (
              <Card className="border-none bg-muted/30 overflow-hidden">
                <CardContent className="p-5 space-y-6">
                  {/* Foreign Price */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Cost Price</label>
                    </div>
                    <div className="relative">
                      <div 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold cursor-pointer hover:text-primary transition-colors flex items-center gap-1 z-10"
                        onClick={() => setCostCurrency(costCurrency === settings.code ? 'IDR' : settings.code)}
                        title="Click to switch currency"
                      >
                        {costCurrency === settings.code ? settings.symbol : 'Rp'}
                      </div>
                      <Input 
                        type="text"
                        placeholder="0.00" 
                        className="h-14 pl-10 rounded-2xl bg-background border-none text-lg font-bold"
                        value={price}
                        onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                        inputMode="decimal"
                      />
                    </div>
                    {basePriceIdr > 0 && costCurrency !== 'IDR' && (
                      <p className="text-[10px] font-medium text-muted-foreground px-1 uppercase">
                        = Rp {basePriceIdr.toLocaleString()} (Cost Base)
                      </p>
                    )}
                  </div>

                  {/* Publish Price */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold text-primary uppercase">Sell Price (IDR)</label>
                      {Number(publishPrice) > 0 && (
                        <span className={`text-[10px] font-bold uppercase ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Est. Margin: {margin > 0 ? '+' : ''}Rp {margin.toLocaleString('id-ID')} ({marginPercentage > 0 ? '+' : ''}{marginPercentage.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">Rp</div>
                      <Input 
                        type="text"
                        placeholder="Selling Price to Customer" 
                        className="h-14 pl-10 rounded-2xl bg-background border-2 border-primary/20 text-lg font-bold text-primary focus:border-primary"
                        value={publishPrice ? Number(publishPrice).toLocaleString('id-ID') : ''}
                        onChange={(e) => setPublishPrice(e.target.value.replace(/[^0-9]/g, ''))}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
            </CardContent>
          </Card>
          );
          })()}
        </section>


        <Button 
          className="w-full h-14 rounded-2xl font-bold text-lg gap-3 shadow-xl shadow-primary/20"
          onClick={handleSave}
          disabled={isSubmitting || !image || !price || !name}
        >
          {isSubmitting ? 'Saving...' : (isEdit ? <><Save className="h-6 w-6" /> Save Changes</> : <><Check className="h-6 w-6" /> Add to Catalog</>)}
        </Button>
      </div>

    </div>
  );
}
