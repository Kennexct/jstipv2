import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, SlidersHorizontal, Heart, Bell, ShoppingBag, Share2, Store, User, Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { db } from '../lib/supabase';
import { toast } from 'sonner';
import { WatermarkOverlay } from '../components/WatermarkOverlay';
import { CustomerAuthModal } from '../components/CustomerAuthModal';
import { cn } from '@/lib/utils';

export function PublicCatalogScreen() {
  const { username } = useParams();
  const navigate = useNavigate();
  
  const [merchant, setMerchant] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingWishlistItem, setPendingWishlistItem] = useState<any>(null);

  const filters = ['All', 'Newest', 'Price: Low', 'Price: High'];

  useEffect(() => {
    async function loadStore() {
      if (!username) {
        setLoading(false);
        return;
      }
      
      try {
        const foundMerchant = await db.getMerchantByUsername(username);
        if (!foundMerchant) {
          setLoading(false);
          return;
        }
        
        setMerchant(foundMerchant);
        
        // Fetch only items for this merchant
        const catalogItems = await db.getItems(foundMerchant.id);
        setItems(catalogItems.filter((item: any) => item.status === 'active'));
      } catch (e) {
        console.error('Failed to load store:', e);
        toast.error('Failed to load store catalog');
      } finally {
        setLoading(false);
      }
    }
    loadStore();
  }, [username]);

  const getFilteredItems = () => {
    let result = [...items];
    if (searchQuery) {
      result = result.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    switch (activeFilter) {
      case 'Newest':
        result.reverse(); 
        break;
      case 'Price: Low':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'Price: High':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
    }
    return result;
  };

  const filteredItems = getFilteredItems();

  const proceedWithWishlist = async (item: any, customer: any) => {
    try {
       const wishItem = {
         ...item,
         id: crypto.randomUUID(), 
         requester: customer.name,
         customer_id: customer.id,
         status: 'find',
         merchant_id: merchant.id
       };
       await db.saveWishlist(wishItem, merchant.id);
       toast.success(`${item.name} added to your wishlist!`);
    } catch(e) {
       toast.error('Failed to add to wishlist');
    }
  };

  const handleAddToWishlist = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const sessionStr = localStorage.getItem('jstip_customer_session');
    if (!sessionStr) {
       setPendingWishlistItem(item);
       setAuthModalOpen(true);
       return;
    }
    const session = JSON.parse(sessionStr);
    proceedWithWishlist(item, session);
  };

  const handleAuthSuccess = (customer: any) => {
    if (pendingWishlistItem) {
      proceedWithWishlist(pendingWishlistItem, customer);
      setPendingWishlistItem(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#0D1B2E] animate-spin" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center px-6">
        <Store className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-black text-[#0D1B2E]">Store Not Found</h2>
        <p className="text-slate-500 text-center mt-2">The store you are looking for does not exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* ─── DESKTOP TOP NAVBAR ─── */}
      <nav className="hidden md:flex sticky top-0 z-50 bg-white border-b border-slate-200 h-20 items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#0D1B2E] flex items-center justify-center">
            <span className="text-xl font-black text-[#C9A84C] uppercase">{merchant.username.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[#0D1B2E] tracking-tight leading-none">{merchant.businessName || merchant.username}</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Official Catalog</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => {
              const session = localStorage.getItem('jstip_customer_session');
              if (!session) setAuthModalOpen(true);
              else toast('Customer Dashboard (Wishlist) coming soon!');
            }}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#0D1B2E]"
          >
            <Heart className="h-5 w-5" /> Wishlist
          </button>
          <button 
            onClick={() => toast('Notifications coming soon!')}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#0D1B2E]"
          >
            <Bell className="h-5 w-5" /> Notifications
          </button>
          <div className="h-8 w-px bg-slate-200" />
          <button 
            onClick={() => {
              const session = localStorage.getItem('jstip_customer_session');
              if (!session) setAuthModalOpen(true);
              else toast(`Logged in as ${JSON.parse(session).name}`);
            }}
            className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-[#0D1B2E] hover:bg-slate-200"
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto pb-24">
        {/* ─── MOBILE HEADER ─── */}
        <header className="md:hidden sticky top-0 z-40 bg-[#F4F6F9]/90 backdrop-blur-md pt-8 pb-4 border-none h-auto flex flex-col px-6 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0D1B2E]">{merchant.businessName || merchant.username}</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Official Catalog</p>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Store link copied!');
              }}
              className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#0D1B2E]"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ─── SEARCH & FILTERS ─── */}
        <div className="px-6 md:px-8 pt-4 sticky top-[88px] md:top-20 bg-[#F4F6F9]/90 backdrop-blur-md z-30 pb-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:max-w-md lg:max-w-xl shrink-0">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..." 
              className="h-14 w-full pl-12 pr-12 rounded-full border-none bg-white shadow-sm text-base font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 bg-[#F4F6F9] rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors">
              <SlidersHorizontal className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 w-full md:w-auto -mx-6 px-6 md:mx-0 md:px-0">
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "shrink-0 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm border",
                    isActive ? "bg-[#0D1B2E] text-white border-[#0D1B2E]" : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── PRODUCT GRID ─── */}
        <div className="px-6 md:px-8 pt-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 opacity-50 flex flex-col items-center">
              <ShoppingBag className="h-12 w-12 mb-4 text-slate-400" />
              <p className="font-bold text-slate-600">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              <AnimatePresence>
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/items/${item.id}`)}
                    className="bg-white rounded-[2rem] flex flex-col relative cursor-pointer hover:shadow-2xl transition-all shadow-sm group border border-slate-100 overflow-hidden"
                  >
                    <div className="w-full aspect-[4/5] relative bg-slate-50 flex items-center justify-center overflow-hidden">
                      <WatermarkOverlay />
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="relative z-10 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <ShoppingBag className="relative z-10 h-10 w-10 text-slate-300" />
                      )}
                    </div>

                    <div className="w-full space-y-1 flex-1 flex flex-col justify-end text-center">
                      <h3 className="font-bold text-slate-800 text-xs md:text-sm leading-tight line-clamp-2">
                        {item.name}
                      </h3>
                      <p className="font-black text-[#0D1B2E] text-sm md:text-base">
                        Rp {item.price?.toLocaleString()}
                      </p>
                    </div>

                    <button 
                      onClick={(e) => handleAddToWishlist(e, item)}
                      className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/80 backdrop-blur-md border border-slate-100 flex items-center justify-center hover:bg-rose-50 hover:border-rose-100 hover:text-rose-500 transition-colors text-slate-400 z-20 shadow-sm group-hover:scale-110"
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ─── MOBILE BOTTOM NAV ─── */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0D1B2E]/95 backdrop-blur-lg rounded-full px-6 py-3 shadow-2xl flex items-center gap-8 border border-white/10 z-50">
        <button className="h-10 w-10 bg-[#C9A84C] rounded-full flex items-center justify-center text-[#0D1B2E] shadow-md">
          <ShoppingBag className="h-5 w-5" />
        </button>
        <button className="text-white/50 hover:text-white relative transition-colors">
          <Heart className="h-6 w-6" />
        </button>
        <button className="text-white/50 hover:text-white transition-colors">
          <Bell className="h-6 w-6" />
        </button>
        <button className="text-white/50 hover:text-white transition-colors">
          <User className="h-6 w-6" />
        </button>
      </div>

      <CustomerAuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
