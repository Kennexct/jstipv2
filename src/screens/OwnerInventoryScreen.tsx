import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, MoreVertical, Edit2, Trash2, ExternalLink, Share2, Eye, Download, Info, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WatermarkOverlay } from '../components/WatermarkOverlay';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useMaster } from '../context/MasterContext';
import { useConfirm } from '../context/ConfirmContext';

export function OwnerInventoryScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  
  const { catalogItems: inventory, removeItem, loading } = useMaster();
  const confirm = useConfirm();

  const handleShareCatalog = () => {
    const url = `${window.location.origin}/catalog`;
    navigator.clipboard.writeText(url);
    toast.success('Public catalog link copied!', {
      description: 'Your customers can now browse your active listings at /catalog.'
    });
  };

  const handlePreviewItem = (id: string) => {
    navigate(`/items/${id}`);
  };

  const handleRemove = async (id: string) => {
    const confirmed = await confirm({
      message: "Are you sure you want to remove this item from the catalog?",
      isDestructive: true,
      confirmText: "Remove"
    });
    if (!confirmed) {
      return;
    }
    try {
      await removeItem(id);
      toast.success('Item removed from catalog');
    } catch (e) {
      toast.error('Failed to remove item. Please try again.');
    }
  };

  const handleDownloadCatalog = () => {
    try {
      const heading = `=========================================\n`;
      const title   = `        JS-TIP PRODUCT CATALOG           \n`;
      const dateStr = `   Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
      const line    = `-----------------------------------------\n`;
      
      let content = heading + title + dateStr + heading + `\n`;
      
      inventory.forEach((item, index) => {
        content += `${index + 1}. ${item.name.toUpperCase()}\n`;
        content += `   💵 Publish Price: Rp ${item.price.toLocaleString()}\n`;
        content += `   📍 Status       : ${item.status.toUpperCase()}\n`;
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
      
      toast.success('Catalog downloaded successfully!', {
        description: 'Every active item catalog is attached with publish price.'
      });
    } catch (e) {
      toast.error('Failed to download catalog.');
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f2f5f7] pb-24">
      <header className="sticky top-0 z-50 bg-[#f2f5f7]/80 backdrop-blur-md px-4 pt-8 pb-4 flex items-center justify-between gap-3">
        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-slate-50 shrink-0" onClick={() => navigate('/owner')}>
          <ArrowLeft className="h-5 w-5 text-[#0D1B2E]" />
        </Button>
        <h2 className="text-xl font-black text-[#0D1B2E] tracking-tight flex-1">Inventory</h2>
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline"
            className="hidden rounded-full h-10 px-4 bg-white text-xs font-bold text-[#0D1B2E] shadow-sm items-center gap-2" 
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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search your products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 bg-white border-none shadow-sm rounded-full font-semibold" 
            />
          </div>
          <Button 
            variant="outline" 
            className="h-12 rounded-full bg-white border-none shadow-sm font-bold text-xs gap-2 px-4 flex items-center justify-center text-[#0D1B2E] hover:bg-slate-50 shrink-0"
            onClick={handleDownloadCatalog}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 pb-24">
          {filteredInventory.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card 
                className="fintech-card cursor-pointer group"
                onClick={() => setSelectedItem(item)}
              >
                <CardContent className="p-4 flex gap-4 items-center">
                  {/* Left: Image */}
                  <div className="relative h-20 w-20 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                    <WatermarkOverlay />
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-8 w-8 text-slate-300 absolute inset-0 m-auto" />
                    )}
                  </div>
                  
                  {/* Middle: Name & Badge */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1.5">
                    <h4 className="text-base font-black text-[#0D1B2E] truncate">{item.name}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#C9A84C]/20 text-[#0D1B2E] hover:bg-[#C9A84C]/30 border-none px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">
                        Active
                      </Badge>
                      <span className="text-xs font-bold text-slate-400">#00{item.id.replace(/\D/g, '').slice(0,3) || '1'}</span>
                    </div>
                  </div>

                  {/* Right: Dropdown & Price */}
                  <div className="shrink-0 flex flex-col items-end justify-between h-20 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        onClick={(e) => e.stopPropagation()} 
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 transition-colors outline-none shrink-0"
                      >
                        <MoreVertical className="h-5 w-5 text-slate-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl shadow-xl border-slate-100 p-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem className="gap-3 text-sm font-bold text-[#0D1B2E] p-3 rounded-xl cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/owner/edit-item/${item.id}`); }}>
                          <Edit2 className="h-4 w-4 text-slate-400" /> Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-3 text-sm font-bold text-[#0D1B2E] p-3 rounded-xl cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.success('Product link copied!', {
                              description: 'Share this link with your customers.'
                            });
                          }}
                        >
                          <ExternalLink className="h-4 w-4 text-slate-400" /> Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-3 text-sm font-bold text-red-600 p-3 rounded-xl cursor-pointer hover:bg-red-50 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <p className="text-lg font-black text-[#0D1B2E] tracking-tight">Rp {item.price.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Catalog Product Detail Popup Modal */}
      <Dialog open={selectedItem !== null} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        <DialogContent>
          {selectedItem && (
            <div className="space-y-6">
              <DialogHeader className="text-left">
                <DialogTitle className="text-xl font-black text-[#0D1B2E] tracking-tight">
                  Product Details
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 font-medium">
                  Reference ID: #00{selectedItem.id}
                </DialogDescription>
              </DialogHeader>

              {/* Cover Image & Name block */}
              <div className="space-y-4">
                <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-[#f2f5f7]">
                  <div className="h-48 w-full bg-slate-100 overflow-hidden relative">
                    <WatermarkOverlay />
                    {selectedItem.image ? (
                      <img src={selectedItem.image} alt={selectedItem.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-10 w-10 text-slate-300 absolute inset-0 m-auto" />
                    )}
                  </div>
                  <Badge className="absolute top-3 left-3 bg-[#C9A84C] text-[#0D1B2E] border-none font-bold">Live</Badge>
                </div>
                <h3 className="text-lg font-black text-[#0D1B2E] leading-tight">{selectedItem.name}</h3>
              </div>

              {/* Financial Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[#f2f5f7] space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Publish Price</p>
                  <p className="text-base font-black text-[#0D1B2E]">Rp {selectedItem.price.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#f2f5f7] space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Est. Cost</p>
                  <p className="text-base font-black text-[#0D1B2E]">{selectedItem.cost} {selectedItem.currency}</p>
                </div>
              </div>

              {/* Action Buttons inside custom popup modal details */}
              <div className="space-y-3 pt-2">
                <Button 
                  className="pill-button w-full h-14 bg-[#0D1B2E] text-white hover:bg-[#162847]"
                  onClick={() => {
                    const id = selectedItem.id;
                    setSelectedItem(null);
                    navigate(`/owner/edit-item/${id}`);
                  }}
                >
                  <Edit2 className="h-5 w-5" /> Edit Product
                </Button>



                <Button 
                  variant="ghost"
                  className="w-full h-10 rounded-xl text-[10px] font-bold uppercase text-red-500 hover:bg-red-50"
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
