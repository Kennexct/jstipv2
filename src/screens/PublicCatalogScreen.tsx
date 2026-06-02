import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  SlidersHorizontal, 
  Heart, 
  Bell,
  ShoppingBag,
  Share2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { WatermarkOverlay } from '../components/WatermarkOverlay';
import { Input } from '@/components/ui/input';
import { db } from '../lib/supabase';
import { toast } from 'sonner';

export function PublicCatalogScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  
  const filters = ['All', 'Newest', 'Price: Low', 'Price: High'];

  useEffect(() => {
    async function loadCatalog() {
      try {
        const catalogItems = await db.getItems();
        setItems(catalogItems.filter((item: any) => item.status === 'active'));
      } catch (e) {
        console.error('Failed to load public catalog:', e);
        toast.error('Failed to load catalog');
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const getFilteredItems = () => {
    let result = [...items];
    
    // Search
    if (searchQuery) {
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort / Filter
    switch (activeFilter) {
      case 'Newest':
        // Assuming newer items are added at the end, or we can reverse.
        // For now just reverse the array as a proxy for newest
        result.reverse(); 
        break;
      case 'Price: Low':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'Price: High':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        break;
    }
    
    return result;
  };

  const filteredItems = getFilteredItems();

  const handleProductClick = (id: string) => {
    navigate(`/items/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f5f7] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-slate-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f5f7] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f2f5f7]/80 backdrop-blur-md pt-8 pb-4 border-none h-auto flex items-center px-6 gap-4">
        <h1 className="text-xl font-black tracking-tight text-[#163300] flex-1">Catalog</h1>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Catalog link copied!', { description: 'Share this link with your customers to shop directly.' });
          }}
          className="h-10 px-4 rounded-full bg-white flex items-center gap-2 shadow-sm relative hover:scale-105 transition-transform text-xs font-bold text-[#163300]"
        >
          <Share2 className="h-4 w-4" /> Share Catalog
        </button>
      </header>

      {/* Search & Filters */}
      <div className="px-6 space-y-5 sticky top-[88px] bg-[#f2f5f7]/90 backdrop-blur-md z-30 pb-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-5 w-5" />
          </div>
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search" 
            className="h-14 w-full pl-12 pr-12 rounded-full border-none bg-white shadow-sm text-base font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center">
            <SlidersHorizontal className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${
                  isActive 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-6 pt-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 opacity-50 flex flex-col items-center">
            <ShoppingBag className="h-12 w-12 mb-4" />
            <p className="font-bold">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleProductClick(item.id)}
                  className="bg-white rounded-[2rem] p-4 flex flex-col items-center relative cursor-pointer hover:shadow-xl transition-shadow shadow-sm group"
                >
                  {/* Discount Badge Mock (can be dynamic if needed) */}
                  {index % 3 === 0 && (
                    <div className="absolute top-4 right-4 z-10 bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      -5%
                    </div>
                  )}

                  {/* Product Image Area */}
                  <div className="w-full aspect-square relative flex items-center justify-center mb-4">
                    {/* Circle Backdrop */}
                    <div className="absolute inset-2 bg-[#f2f5f7] rounded-full opacity-50 group-hover:scale-105 transition-transform" />
                    <WatermarkOverlay />
                    <img 
                      src={item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80'} 
                      alt={item.name}
                      className="relative z-10 w-full h-full object-contain drop-shadow-xl p-2 group-hover:-translate-y-2 transition-transform duration-300"
                    />
                  </div>

                  {/* Details */}
                  <div className="text-center w-full space-y-1 mb-2">
                    <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="font-black text-slate-900">
                      Rp {item.price?.toLocaleString()}
                    </p>
                  </div>

                  {/* Heart Button */}
                  <button className="mt-2 h-10 w-10 rounded-full border-2 border-slate-100 flex items-center justify-center hover:bg-rose-50 hover:border-rose-100 hover:text-rose-500 transition-colors text-slate-300">
                    <Heart className="h-5 w-5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Fake Bottom Navigation to mimic UI Reference */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-8 border border-slate-100 z-50">
        <button className="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-white">
          <ShoppingBag className="h-5 w-5" />
        </button>
        <button className="text-slate-400 hover:text-slate-800 relative">
          <Heart className="h-6 w-6" />
          <span className="absolute -top-1 -right-2 text-[8px] font-black bg-slate-900 text-white h-4 w-4 rounded-full flex items-center justify-center">4</span>
        </button>
        <button className="text-slate-400 hover:text-slate-800">
          <Bell className="h-6 w-6" />
        </button>
        <button className="text-slate-400 hover:text-slate-800">
          <div className="h-6 w-6 rounded-full bg-slate-200 border-2 border-slate-300" />
        </button>
      </div>
    </div>
  );
}
