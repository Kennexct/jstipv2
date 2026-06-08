import { create } from 'zustand';
import { db, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'sonner';

export interface WishlistItem {
  id: string;
  name: string;
  requester: string;
  price: number;
  sellPrice?: number;
  location: string;
  image?: string;
  status: 'find' | 'found' | 'out of stock' | 'cancel' | 'hold';
  note?: string;
  qty?: number;
}

export interface MasterState {
  loading: boolean;
  currentUser: any | null;
  expenses: any[];
  sales: any[];
  catalogItems: any[];
  wishlistItems: any[];
  tripSettings: any;
  boughtIds: string[];
  
  // Actions
  setLoading: (loading: boolean) => void;
  setCurrentUser: (user: any | null) => void;
  
  login: (username: string, password: string) => Promise<any>;
  signUp: (username: string, password: string, businessName: string) => Promise<any>;
  logout: () => void;
  refreshData: () => Promise<void>;
  saveSettings: (settings: any) => Promise<void>;
  saveItem: (item: any) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  saveWishlist: (item: any) => Promise<void>;
  saveSale: (sale: any) => Promise<void>;
  saveExpense: (expense: any) => Promise<void>;
  removeSale: (id: string) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  toggleBoughtId: (id: string) => void;
  resetAllData: () => Promise<void>;
}

const getInitialUser = () => {
  const saved = localStorage.getItem('jastip_session');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return null;
};

const getInitialBoughtIds = () => {
  const saved = localStorage.getItem('jastip_checklist_bought_states');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
};

export const useStore = create<MasterState>((set, get) => ({
  loading: true,
  currentUser: getInitialUser(),
  expenses: [],
  sales: [],
  catalogItems: [],
  wishlistItems: [],
  tripSettings: {
    trip: { origin: 'Seoul', destination: 'Jakarta', weightLimit: 15, date: '' },
    currency: { code: 'SGD', symbol: 'S$', manualRate: 13500 }
  },
  boughtIds: getInitialBoughtIds(),

  setLoading: (loading) => set({ loading }),
  setCurrentUser: (user) => set({ currentUser: user }),

  login: async (username, password) => {
    set({ loading: true });
    try {
      const user = await db.getMerchantByUsername(username);
      if (!user || user.password !== password) {
        throw new Error('Invalid username or password');
      }
      set({ currentUser: user });
      localStorage.setItem('jastip_session', JSON.stringify(user));
      toast.success(`Welcome back, ${user.businessName || user.username}!`);
      get().refreshData();
      return user;
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (username, password, businessName) => {
    set({ loading: true });
    try {
      const existing = await db.getMerchantByUsername(username);
      if (existing) {
        throw new Error('Username already taken');
      }
      const newMerchant = {
        id: 'merchant_' + Date.now(),
        username,
        password,
        businessName,
        role: 'merchant' as const,
        paid: true,
        createdAt: new Date().toISOString()
      };
      await db.saveMerchant(newMerchant);
      set({ currentUser: newMerchant });
      localStorage.setItem('jastip_session', JSON.stringify(newMerchant));
      toast.success(`Account created successfully! Welcome, ${businessName || username}!`);
      get().refreshData();
      return newMerchant;
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    set({
      currentUser: null,
      expenses: [],
      sales: [],
      catalogItems: [],
      wishlistItems: []
    });
    localStorage.removeItem('jastip_session');
    toast.success('Logged out successfully');
  },

  refreshData: async () => {
    const { currentUser } = get();
    if (!currentUser) {
      set({ loading: false });
      return;
    }
    set({ loading: true });
    try {
      if (isSupabaseConfigured()) {
        try {
          const remoteMerchant = await db.getMerchantByUsername(currentUser.username);
          if (!remoteMerchant) {
            await db.saveMerchant(currentUser);
          }
        } catch (err) {}
      }

      // PHASE 1: Fast load
      const [loadedExpenses, loadedSales, loadedSettings] = await Promise.all([
        db.getExpenses(currentUser.id),
        db.getSales(currentUser.id),
        db.getSettings(currentUser.id)
      ]);
      
      const updates: Partial<MasterState> = {
        expenses: loadedExpenses || [],
        sales: loadedSales || [],
        loading: false
      };

      if (loadedSettings) {
        updates.tripSettings = loadedSettings;
        if (loadedSettings.boughtIds && Array.isArray(loadedSettings.boughtIds)) {
          updates.boughtIds = loadedSettings.boughtIds;
          localStorage.setItem('jastip_checklist_bought_states', JSON.stringify(loadedSettings.boughtIds));
        }
      }
      set(updates);

      // PHASE 2: Background heavy fetch
      Promise.all([
        db.getItems(currentUser.id),
        db.getWishlist(currentUser.id)
      ]).then(([loadedItems, loadedWishlist]) => {
        set({
          catalogItems: loadedItems || [],
          wishlistItems: loadedWishlist || []
        });
      }).catch(err => console.error("Background heavy data fetch failed:", err));
      
    } catch (e) {
      toast.error('Failed to sync live data with database');
      set({ loading: false });
    }
  },

  saveSettings: async (data: any) => {
    const { currentUser } = get();
    await db.saveSettings(data, currentUser?.id);
    set({ tripSettings: data });
  },

  saveItem: async (item: any) => {
    const { catalogItems, currentUser } = get();
    const isEdit = catalogItems.some(i => i.id === item.id);
    const updated = isEdit ? catalogItems.map(i => i.id === item.id ? item : i) : [item, ...catalogItems];
    set({ catalogItems: updated });
    try {
      await db.saveItem(item, currentUser?.id);
    } catch (err: any) {
      toast.error(`Cloud sync failed: ${err.message || 'Unknown error'}`);
    }
  },

  removeItem: async (id: string) => {
    const { catalogItems } = get();
    await db.removeItem(id);
    set({ catalogItems: catalogItems.filter(i => i?.id !== id) });
  },

  saveWishlist: async (wish: any) => {
    const { wishlistItems, currentUser } = get();
    const isEdit = wishlistItems.some(w => w.id === wish.id);
    const updated = isEdit ? wishlistItems.map(w => w.id === wish.id ? wish : w) : [wish, ...wishlistItems];
    set({ wishlistItems: updated });
    db.saveWishlist(wish, currentUser?.id).catch(err => console.error(err));
  },

  saveSale: async (sale: any) => {
    const { sales, currentUser } = get();
    const isEdit = sales.some(s => s.id === sale.id);
    const updated = isEdit ? sales.map(s => s.id === sale.id ? sale : s) : [sale, ...sales];
    set({ sales: updated });
    db.saveSale(sale, currentUser?.id).catch(err => console.error(err));
  },

  saveExpense: async (expense: any) => {
    const { expenses, currentUser } = get();
    const isEdit = expenses.some(e => e.id === expense.id);
    const updated = isEdit ? expenses.map(e => e.id === expense.id ? expense : e) : [expense, ...expenses];
    set({ expenses: updated });
    db.saveExpense(expense, currentUser?.id).catch(err => console.error(err));
  },

  removeSale: async (id: string) => {
    const { sales } = get();
    await db.removeSale(id);
    set({ sales: sales.filter(s => s.id !== id) });
  },

  removeExpense: async (id: string) => {
    const { expenses } = get();
    await db.removeExpense(id);
    set({ expenses: expenses.filter(e => e.id !== id) });
  },

  toggleBoughtId: (id: string) => {
    const { boughtIds, tripSettings, currentUser } = get();
    const updated = boughtIds.includes(id) ? boughtIds.filter(x => x !== id) : [...boughtIds, id];
    set({ boughtIds: updated });
    localStorage.setItem('jastip_checklist_bought_states', JSON.stringify(updated));
    if (currentUser) {
      db.saveSettings({ ...tripSettings, boughtIds: updated }, currentUser.id).catch();
    }
  },

  resetAllData: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    
    set({ loading: true });
    try {
      await db.deleteAllData(currentUser.id);
      
      // Reset local state but keep user logged in
      set({
        expenses: [],
        sales: [],
        catalogItems: [],
        wishlistItems: [],
        boughtIds: [],
        tripSettings: {
          trip: { origin: 'Seoul', destination: 'Jakarta', weightLimit: 15, date: '' },
          currency: { code: 'SGD', symbol: 'S$', manualRate: 13500 }
        }
      });
      
      toast.success('All data has been successfully reset.');
    } catch (e) {
      toast.error('Failed to reset data. Please try again.');
      throw e;
    } finally {
      set({ loading: false });
    }
  }
}));
