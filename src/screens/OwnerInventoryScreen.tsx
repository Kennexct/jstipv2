import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Search, MoreVertical, Edit2, Trash2, 
  ExternalLink, Share2, Download, Package, LayoutGrid, 
  List, ArrowDownUp, Filter, Percent, DollarSign, TrendingUp,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '../components/EmptyState';
import { WatermarkOverlay } from '../components/WatermarkOverlay';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { FileText, Image as ImageIcon, DownloadCloud } from 'lucide-react';
import { exportProductImage } from '../lib/exportImage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useMaster } from '../context/MasterContext';
import { useConfirm } from '../context/ConfirmContext';
import { cn } from '@/lib/utils';
import { MobileMenu } from '../components/MobileMenu';

export function OwnerInventoryScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc' | 'margin' | 'sold'>('recent');
  const [filterBy, setFilterBy] = useState<'all' | 'high_margin' | 'low_margin' | 'no_sales'>('all');
  
  const { catalogItems: inventory, removeItem, sales, tripSettings, currentUser } = useMaster();
  const confirm = useConfirm();

  const conversionRate = tripSettings?.currency?.manualRate || 13500;
  const shoppingCurrency = tripSettings?.currency?.code || 'SGD';

  // 1. Enrich inventory data with sales and margin insights
  const enrichedInventory = useMemo(() => {
    return inventory.map(item => {
      let timesSold = 0;
      let revenue = 0;
      
      sales.forEach(s => {
        s.items.forEach((saleItem: any) => {
          if (saleItem.name.toLowerCase() === item.name.toLowerCase()) {
            timesSold += saleItem.qty;
            revenue += saleItem.price * saleItem.qty;
          }
        });
      });

      const costInIDR = (item.cost || 0) * conversionRate;
      const profit = item.price - costInIDR;
      const marginPct = item.price > 0 ? (profit / item.price) * 100 : 0;

      return {
        ...item,
        timesSold,
        revenue,
        costInIDR,
        profit,
        marginPct
      };
    });
  }, [inventory, sales, conversionRate]);

  // 2. Summary Stats
  const totalCatalogValue = enrichedInventory.reduce((sum, item) => sum + item.price, 0);
  const avgMargin = enrichedInventory.length > 0 
    ? enrichedInventory.reduce((sum, item) => sum + item.marginPct, 0) / enrichedInventory.length 
    : 0;

  // 3. Filter & Sort
  const processedInventory = useMemo(() => {
    let result = [...enrichedInventory];

    // Search
    if (searchQuery) {
      result = result.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Filter
    if (filterBy === 'high_margin') result = result.filter(item => item.marginPct >= 30);
    if (filterBy === 'low_margin') result = result.filter(item => item.marginPct < 15);
    if (filterBy === 'no_sales') result = result.filter(item => item.timesSold === 0);

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price_desc': return b.price - a.price;
        case 'price_asc': return a.price - b.price;
        case 'margin': return b.marginPct - a.marginPct;
        case 'sold': return b.timesSold - a.timesSold;
        case 'recent': 
        default:
          return parseInt(b.id) - parseInt(a.id); // Assuming ID correlates to recency
      }
    });

    return result;
  }, [enrichedInventory, searchQuery, filterBy, sortBy]);

  const handleShareCatalog = () => {
    const username = currentUser?.username || 'store';
    const url = `${window.location.origin}/catalog/${username}`;
    navigator.clipboard.writeText(url);
    toast.success('Public catalog link copied!', {
      description: `Your customers can now browse your listings at /catalog/${username}.`
    });
  };

  const handleRemove = async (id: string) => {
    const confirmed = await confirm({
      message: "Are you sure you want to remove this item from the catalog?",
      isDestructive: true,
      confirmText: "Remove"
    });
    if (!confirmed) return;
    try {
      await removeItem(id);
      toast.success('Item removed from catalog');
    } catch (e) {
      toast.error('Failed to remove item.');
    }
  };

  const handleDownloadCatalogText = () => {
    try {
      const heading = `=========================================\n`;
      const title   = `        JS-TIP PRODUCT CATALOG           \n`;
      const dateStr = `   Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
      const line    = `-----------------------------------------\n`;
      
      let content = heading + title + dateStr + heading + `\n`;
      
      processedInventory.forEach((item, index) => {
        content += `${index + 1}. ${item.name.toUpperCase()}\n`;
        content += `   💵 Publish Price: Rp ${item.price.toLocaleString()}\n`;
        content += `   📍 Status       : ACTIVE\n`;
        content += `   ✏️ Reference ID : #00${item.id}\n`;
        content += `${line}\n`;
      });
      
      content += `Thank you for shopping with us!\nContact us for custom pre-orders.\n`;
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Product_Catalog_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Catalog downloaded successfully!');
    } catch (e) {
      toast.error('Failed to download catalog.');
    }
  };

  const handleBatchExportPhotos = async () => {
    const itemsWithImages = processedInventory.filter(item => item.image);
    if (itemsWithImages.length === 0) {
      toast.error("No items with photos to export.");
      return;
    }
    
    toast.loading(`Exporting ${itemsWithImages.length} photos...`, { id: 'batch-export' });
    
    let successCount = 0;
    for (const item of itemsWithImages) {
      try {
        const dataUrl = await exportProductImage({
          item: { name: item.name, price: item.price, image: item.image },
          watermark: {
            enabled: tripSettings?.watermark?.enabled || false,
            image: tripSettings?.watermark?.image || '',
            opacity: tripSettings?.watermark?.opacity !== undefined ? tripSettings?.watermark?.opacity : 0.5,
            badgePosition: tripSettings?.watermark?.badgePosition || 'bottom-right'
          }
        });
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Catalog_${item.name.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        successCount++;
        
        // Small delay to prevent browser crash/blocking
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error("Export failed for", item.name, e);
      }
    }
    
    if (successCount > 0) {
      toast.success(`Successfully exported ${successCount} photos!`, { id: 'batch-export' });
    } else {
      toast.error("Failed to export photos.", { id: 'batch-export' });
    }
  };

  const handleSingleExportPhoto = async (item: any) => {
    if (!item.image) {
      toast.error("This item doesn't have a photo.");
      return;
    }
    toast.loading("Exporting photo...", { id: 'single-export' });
    try {
      const dataUrl = await exportProductImage({
        item: { name: item.name, price: item.price, image: item.image },
        watermark: {
          enabled: tripSettings?.watermark?.enabled || false,
          image: tripSettings?.watermark?.image || '',
          opacity: tripSettings?.watermark?.opacity !== undefined ? tripSettings?.watermark?.opacity : 0.5,
          badgePosition: tripSettings?.watermark?.badgePosition || 'bottom-right'
        }
      });
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Product_${item.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Photo exported!", { id: 'single-export' });
    } catch (e) {
      toast.error("Failed to export photo.", { id: 'single-export' });
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return "text-emerald-600 bg-emerald-50";
    if (margin >= 15) return "text-[#C9A84C] bg-[#C9A84C]/10";
    return "text-red-500 bg-red-50";
  };

  const getMarginBadgeStyle = (margin: number) => {
    if (margin >= 30) return "bg-emerald-500 text-white";
    if (margin >= 15) return "bg-[#C9A84C] text-[#0D1B2E]";
    return "bg-red-500 text-white";
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F4F6F9]/80 backdrop-blur-md px-4 pt-8 pb-4 flex items-center justify-between gap-3 border-b border-slate-200/50">
        <div className="flex items-center gap-2">
          <MobileMenu />
          <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-slate-50 shrink-0" onClick={() => navigate('/owner')}>
            <ArrowLeft className="h-5 w-5 text-[#0D1B2E]" />
          </Button>
        </div>
        <h2 className="text-xl font-black text-[#0D1B2E] tracking-tight flex-1">Catalog</h2>
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline"
            className="hidden sm:flex rounded-full h-10 px-4 bg-white text-xs font-bold text-[#0D1B2E] shadow-sm items-center gap-2" 
            onClick={handleShareCatalog}
          >
            <Share2 className="h-4 w-4" /> Share Catalog
          </Button>
          <Button size="icon" className="rounded-full h-10 w-10 bg-[#0D1B2E] text-white hover:bg-[#162847]" onClick={() => navigate('/owner/list-item')}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* KPI Stats Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Package className="h-3 w-3" /> Total Items</p>
            <p className="text-base sm:text-lg font-black text-[#0D1B2E] mt-0.5">{enrichedInventory.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><DollarSign className="h-3 w-3" /> Catalog Value</p>
            <p className="text-base sm:text-lg font-black text-[#0D1B2E] mt-0.5 truncate">Rp {(totalCatalogValue / 1000).toFixed(0)}k</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Percent className="h-3 w-3" /> Avg Margin</p>
            <p className={cn("text-base sm:text-lg font-black mt-0.5", getMarginColor(avgMargin).split(' ')[0])}>
              {avgMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Search & Export */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 bg-white border-none shadow-sm rounded-full font-semibold" 
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="h-12 rounded-full bg-white border-none shadow-sm font-bold text-xs gap-2 px-4 flex items-center justify-center text-[#0D1B2E] hover:bg-slate-50 shrink-0"
              >
                <Download className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl shadow-xl border-slate-100 p-2 min-w-[200px]">
              <DropdownMenuItem className="gap-3 text-sm font-bold text-[#0D1B2E] p-3 rounded-xl cursor-pointer" onClick={handleDownloadCatalogText}>
                <FileText className="h-4 w-4 text-slate-400" /> Export Text Catalog
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 text-sm font-bold text-[#0D1B2E] p-3 rounded-xl cursor-pointer" onClick={handleBatchExportPhotos}>
                <ImageIcon className="h-4 w-4 text-slate-400" /> Export All Photos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters & View Toggle */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8 rounded-full bg-white border-slate-200 text-xs font-bold text-slate-600 px-3 gap-1.5 shrink-0">
                  <ArrowDownUp className="h-3 w-3" />
                  {sortBy === 'recent' ? 'Recent' : sortBy === 'margin' ? 'Top Margin' : sortBy === 'sold' ? 'Best Sellers' : sortBy === 'price_desc' ? 'Price: High' : 'Price: Low'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-2xl">
                <DropdownMenuItem className="text-sm font-bold" onClick={() => setSortBy('recent')}>Recently Added</DropdownMenuItem>
                <DropdownMenuItem className="text-sm font-bold" onClick={() => setSortBy('sold')}>Best Sellers</DropdownMenuItem>
                <DropdownMenuItem className="text-sm font-bold" onClick={() => setSortBy('margin')}>Highest Margin</DropdownMenuItem>
                <DropdownMenuItem className="text-sm font-bold" onClick={() => setSortBy('price_desc')}>Price: High to Low</DropdownMenuItem>
                <DropdownMenuItem className="text-sm font-bold" onClick={() => setSortBy('price_asc')}>Price: Low to High</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn(
                  "h-8 rounded-full text-xs font-bold px-3 gap-1.5 shrink-0",
                  filterBy !== 'all' ? "bg-[#0D1B2E] text-white border-[#0D1B2E]" : "bg-white border-slate-200 text-slate-600"
                )}>
                  <Filter className="h-3 w-3" />
                  {filterBy === 'all' ? 'All Items' : filterBy === 'high_margin' ? 'High Margin' : filterBy === 'low_margin' ? 'Low Margin' : 'No Sales'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-2xl">
                <DropdownMenuItem className="text-sm font-bold" onClick={() => setFilterBy('all')}>All Items</DropdownMenuItem>
                <DropdownMenuItem className="text-sm font-bold" onClick={() => setFilterBy('high_margin')}>High Margin (\u003e30%)</DropdownMenuItem>
                <DropdownMenuItem className="text-sm font-bold" onClick={() => setFilterBy('low_margin')}>Low Margin (\u003c15%)</DropdownMenuItem>
                <DropdownMenuItem className="text-sm font-bold" onClick={() => setFilterBy('no_sales')}>No Sales Yet</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center bg-white rounded-full p-1 border border-slate-200 shadow-sm shrink-0">
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-1.5 rounded-full transition-colors", viewMode === 'list' ? "bg-[#F4F6F9] text-[#0D1B2E]" : "text-slate-400")}
            >
              <List className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-full transition-colors", viewMode === 'grid' ? "bg-[#F4F6F9] text-[#0D1B2E]" : "text-slate-400")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Inventory List/Grid */}
        {processedInventory.length === 0 ? (
          <EmptyState 
            type="catalog"
            title="No products found"
            description="Adjust your search or filters, or add new items to your catalog."
            actionLabel={filterBy !== 'all' || searchQuery ? 'Clear Filters' : 'Add First Item'}
            onAction={() => {
              if (filterBy !== 'all' || searchQuery) {
                setFilterBy('all');
                setSearchQuery('');
              } else {
                navigate('/owner/list-item');
              }
            }}
          />
        ) : (
          <div className={cn("pb-24", viewMode === 'grid' ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3")}>
            <AnimatePresence mode="popLayout">
              {processedInventory.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                >
                  <Card 
                    className={cn(
                      "cursor-pointer group overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow relative",
                      viewMode === 'list' ? "fintech-card" : "bg-white rounded-[2rem]"
                    )}
                    onClick={() => setSelectedItem(item)}
                  >
                    {/* ENHANCED LIST VIEW */}
                    {viewMode === 'list' && (
                      <CardContent className="p-4 flex gap-4 items-center">
                        <div className="relative h-20 w-20 rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                          <WatermarkOverlay />
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-8 w-8 text-slate-300 absolute inset-0 m-auto" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
                          <h4 className="text-base font-black text-[#0D1B2E] truncate pr-8">{item.name}</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-500 line-through decoration-slate-300">
                              {item.cost} {item.currency}
                            </span>
                            <span className="text-[10px] font-black text-[#0D1B2E]">→ Rp {item.price.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cn("px-1.5 py-0 text-[9px] uppercase font-black border-none h-4", getMarginColor(item.marginPct))}>
                              {item.marginPct.toFixed(0)}% Margin
                            </Badge>
                            {item.timesSold > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                                <TrendingUp className="h-3 w-3" /> Sold {item.timesSold}x
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400">0 Sales</span>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger 
                            onClick={(e) => e.stopPropagation()} 
                            className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 transition-colors outline-none shrink-0"
                          >
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl shadow-xl border-slate-100 p-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem className="gap-3 text-sm font-bold text-[#0D1B2E] p-3 rounded-xl cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/owner/edit-item/${item.id}`); }}>
                              <Edit2 className="h-4 w-4 text-slate-400" /> Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-3 text-sm font-bold text-[#0D1B2E] p-3 rounded-xl cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.success('Product link copied!', { description: 'Share this link with your customers.' });
                              }}
                            >
                              <ExternalLink className="h-4 w-4 text-slate-400" /> Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-3 text-sm font-bold text-red-600 p-3 rounded-xl cursor-pointer hover:bg-red-50 hover:text-red-700"
                              onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                            >
                              <Trash2 className="h-4 w-4" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardContent>
                    )}

                    {/* ENHANCED GRID VIEW */}
                    {viewMode === 'grid' && (
                      <div className="flex flex-col h-full relative">
                        <Badge className={cn("absolute top-2 left-2 z-10 border-none font-black text-[9px] px-1.5 py-0 h-4 uppercase shadow-sm", getMarginBadgeStyle(item.marginPct))}>
                          {item.marginPct.toFixed(0)}% Mrg
                        </Badge>
                        <div className="relative aspect-square w-full bg-slate-100 overflow-hidden rounded-t-[2rem]">
                          <WatermarkOverlay />
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          ) : (
                            <Package className="h-8 w-8 text-slate-300 absolute inset-0 m-auto" />
                          )}
                        </div>
                        <div className="p-3 flex flex-col flex-1 justify-between gap-1.5">
                          <h4 className="text-xs font-black text-[#0D1B2E] line-clamp-2 leading-tight">{item.name}</h4>
                          <div>
                            <p className="text-sm font-black text-[#0D1B2E] tracking-tight">Rp {(item.price / 1000).toLocaleString()}k</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                              {item.timesSold > 0 ? <span className="text-emerald-600">{item.timesSold} sold</span> : '0 sales'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Catalog Product Detail Enhanced Modal */}
      <Dialog open={selectedItem !== null} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-md w-[95%] border-none rounded-[2rem] max-h-[85dvh] overflow-y-auto">
          {selectedItem && (
            <div className="space-y-5 text-left">
              <DialogHeader className="text-left pb-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-slate-100 text-slate-600 border-none font-bold uppercase tracking-widest text-[10px]">
                    Catalog Item
                  </Badge>
                  <Badge className="bg-[#C9A84C] text-[#0D1B2E] border-none font-bold uppercase tracking-widest text-[10px]">
                    LIVE
                  </Badge>
                </div>
                <DialogTitle className="text-2xl font-black text-[#0D1B2E] mt-3 leading-tight tracking-tight">
                  {selectedItem.name}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                  Item ID <span className="text-[#0D1B2E] font-bold">#00{selectedItem.id.replace(/\D/g, '').slice(0,3) || '1'}</span>
                </DialogDescription>
              </DialogHeader>

              {/* Product picture rendering */}
              <div className="space-y-1">
                {selectedItem.image ? (
                  <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-[#f2f5f7]">
                    <WatermarkOverlay />
                    <img src={selectedItem.image} className="h-full w-full object-cover" alt={selectedItem.name} referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4 bg-[#f2f5f7] text-slate-500 gap-2 text-center">
                    <Package className="h-8 w-8 text-slate-300" />
                  </div>
                )}
              </div>

              {/* Price */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selling Price</p>
                <p className="text-2xl font-black text-[#0D1B2E] tracking-tight mt-1">Rp {selectedItem.price.toLocaleString()}</p>
              </div>

              {/* Margins & Sales Analytics */}
              <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Financial Insights</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-[#F4F6F9] space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Base Cost</p>
                      <p className="text-sm font-black text-[#0D1B2E]">{selectedItem.cost} {selectedItem.currency}</p>
                      <p className="text-[9px] text-slate-400 font-medium">~Rp {selectedItem.costInIDR.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F4F6F9] space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Est. Profit / Item</p>
                      <p className={cn("text-sm font-black", selectedItem.profit > 0 ? "text-emerald-600" : "text-red-500")}>
                        Rp {selectedItem.profit.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium">Margin: {selectedItem.marginPct.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Margin Visual Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Margin Health</span>
                      <span className={getMarginColor(selectedItem.marginPct).split(' ')[0]}>{selectedItem.marginPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all rounded-full", getMarginBadgeStyle(selectedItem.marginPct).split(' ')[0])}
                        style={{ width: `${Math.min(Math.max(selectedItem.marginPct, 0), 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Sales Performance */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F4F6F9] border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <TrendingUp className="h-4 w-4 text-[#0D1B2E]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Sales</p>
                        <p className="text-sm font-black text-[#0D1B2E]">{selectedItem.timesSold} Units</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Revenue</p>
                      <p className="text-sm font-black text-[#0D1B2E]">Rp {selectedItem.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button 
                    className="pill-button h-14 bg-white border-2 border-[#0D1B2E] text-[#0D1B2E] hover:bg-slate-50"
                    onClick={() => handleSingleExportPhoto(selectedItem)}
                  >
                    <DownloadCloud className="h-4 w-4 mr-2" /> Export Photo
                  </Button>
                  <Button 
                    className="pill-button h-14 bg-white border border-slate-200 text-[#0D1B2E] hover:bg-slate-50 shadow-sm"
                    onClick={() => {
                      toast.success('Product link copied!');
                      navigator.clipboard.writeText(`${window.location.origin}/items/${selectedItem.id}`);
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" /> Share Link
                  </Button>
                  <Button 
                    className="pill-button h-14 col-span-2 bg-[#0D1B2E] text-white hover:bg-[#162847]"
                    onClick={() => {
                      const id = selectedItem.id;
                      setSelectedItem(null);
                      navigate(`/owner/edit-item/${id}`);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" /> Edit Details
                  </Button>
                  <Button 
                    variant="ghost"
                    className="col-span-2 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 hover:text-red-600 mt-2"
                    onClick={() => {
                      const id = selectedItem.id;
                      setSelectedItem(null);
                      handleRemove(id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove from Catalog
                  </Button>
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
