import { toast } from 'sonner';

// Custom Zero-Dependency Supabase client that uses PostgREST REST API.
// Falls back to LocalStorage if SUPABASE_URL and SUPABASE_ANON_KEY are not configured.

const getEnvValue = (key: string): string => {
  // Vite strictly requires static references for import.meta.env during production build
  let value = '';
  if (key === 'VITE_SUPABASE_URL') value = import.meta.env.VITE_SUPABASE_URL;
  if (key === 'VITE_SUPABASE_ANON_KEY') value = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (value && value !== 'MY_SUPABASE_URL' && value !== 'MY_SUPABASE_ANON_KEY' && value !== '') {
    return value;
  }
  return '';
};

// Replace these placeholders with your actual Supabase URL & Anon Key or set them in .env.local
// Hardcoded connection for hosted environments to completely bypass missing .env injections.
const getSupabaseConfig = () => {
  let url = getEnvValue('VITE_SUPABASE_URL');
  if (url && !url.startsWith('http')) {
    url = `https://${url}`;
  }
  return {
    url: url,
    key: getEnvValue('VITE_SUPABASE_ANON_KEY')
  };
};

export const isSupabaseConfigured = () => {
  const { url, key } = getSupabaseConfig();
  const cleanKey = key.trim().replace(/^["']|["']$/g, '');
  const cleanUrl = url.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
  const isKeyValid = cleanKey.startsWith('ey');
  return cleanUrl !== '' && cleanKey !== '' && isKeyValid;
};

console.log(
  isSupabaseConfigured()
    ? `[Supabase] Live Sync Active targeting: ${getSupabaseConfig().url}`
    : '[Supabase] Credentials missing. Running in LocalStorage fallback mode.'
);

// Generic fetch wrapper for Supabase PostgREST API
export async function postgrestRequest(
  table: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    query?: string;
    body?: any;
    preferSingle?: boolean;
  } = {}
) {
  const { url: rawUrl, key: rawKey } = getSupabaseConfig();
  const supaUrl = rawUrl.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
  const supaKey = rawKey.trim().replace(/^["']|["']$/g, '');
  const method = options.method || 'GET';
  const query = options.query ? `?${options.query}` : '';
  const url = `${supaUrl}/rest/v1/${table}${query}`;

  const headers: Record<string, string> = {
    'apikey': supaKey,
    'Authorization': `Bearer ${supaKey}`,
    'Content-Type': 'application/json',
  };

  if (method === 'POST' || method === 'PATCH') {
    let preferHeader = options.preferSingle ? 'return=representation,holding=none' : 'return=representation';
    if (options.query && options.query.includes('on_conflict')) {
      preferHeader += ',resolution=merge-duplicates';
    }
    headers['Prefer'] = preferHeader;
  }

  const res = await fetch(url, {
    method,
    headers,
    cache: 'no-store',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let parsedError = errorText;
    try {
      const j = JSON.parse(errorText);
      parsedError = j.message || j.details || errorText;
    } catch(e) {}
    
    const errMsg = `Database Sync Failed: ${parsedError}`;
    console.error(`Supabase request failed: ${res.status} - ${errorText}`);
    toast.error(errMsg, { duration: 5000 });
    throw new Error(errMsg);
  }

  if (method === 'DELETE') {
    return true;
  }

  return res.json();
}

// ----------------------------------------------------
// LOCAL STORAGE FALLBACK HELPERS
// ----------------------------------------------------
const getLocal = (key: string, fallback: any) => {
  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      // ignore
    }
  }
  return fallback;
};

const setLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage (quota exceeded?), bypassing local cache:', e);
  }
};

// ----------------------------------------------------
// PUBLIC API INTERFACE
// ----------------------------------------------------
export const db = {
  // 0. Storage (Image Upload)
  async uploadImage(base64Data: string, bucketName: string = 'catalog'): Promise<string> {
    if (!isSupabaseConfigured()) {
      return base64Data; // Fallback to storing raw base64 locally if offline
    }

    try {
      const { url: rawUrl, key: rawKey } = getSupabaseConfig();
      const supaUrl = rawUrl.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
      const supaKey = rawKey.trim().replace(/^["']|["']$/g, '');
      
      // Extract content type and raw base64
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return base64Data; // Not a valid base64 image, return as is
      }
      
      const contentType = matches[1];
      const b64 = matches[2];
      
      // Convert base64 to Blob
      const byteCharacters = atob(b64);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      const blob = new Blob(byteArrays, { type: contentType });
      
      const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${contentType.split('/')[1]}`;
      const uploadUrl = `${supaUrl}/storage/v1/object/${bucketName}/${fileName}`;

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': supaKey,
          'Authorization': `Bearer ${supaKey}`,
          'Content-Type': contentType,
        },
        body: blob,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      // Return the public URL
      return `${supaUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
    } catch (e) {
      console.error('Supabase image upload failed, falling back to base64:', e);
      return base64Data; // Fallback gracefully
    }
  },

  // 1. Settings (Trip and Currency)
  async getSettings(merchantId?: string) {
    const suffix = merchantId ? `_${merchantId}` : '';
    const defaultSettings = { 
      trip: { origin: 'Seoul', destination: 'Jakarta', weightLimit: 15 },
      currency: { code: 'SGD', symbol: 'S$', manualRate: 13500, realtimeRate: 13050, updatedAt: new Date().toISOString() },
      notifs: { push: true, email: false, orders: true, chat: true }
    };
    
    if (isSupabaseConfigured() && merchantId) {
      try {
        const rows = await postgrestRequest('jstip_settings', { query: `merchant_id=eq.${merchantId}` });
        if (Array.isArray(rows)) {
          if (rows.length > 0) {
            return rows[0].settings_data;
          }
          // Supabase successfully returned empty. Do not fallback to local storage.
          return defaultSettings;
        }
      } catch (e) {
        console.error('Supabase settings load error:', e);
      }
    }
    // Fallback only if offline/not configured
    const trip = getLocal(`jastip_trip_settings${suffix}`, defaultSettings.trip);
    const currency = getLocal(`jastip_currency_settings${suffix}`, defaultSettings.currency);
    const notifs = getLocal(`jastip_notification_settings${suffix}`, defaultSettings.notifs);
    return { trip, currency, notifs };
  },

  async saveSettings(data: { trip: any; currency: any; notifs: any }, merchantId?: string) {
    const suffix = merchantId ? `_${merchantId}` : '';
    setLocal(`jastip_trip_settings${suffix}`, data.trip);
    setLocal(`jastip_currency_settings${suffix}`, data.currency);
    setLocal(`jastip_notification_settings${suffix}`, data.notifs);

    if (isSupabaseConfigured() && merchantId) {
      try {
        await postgrestRequest('jstip_settings', {
          method: 'POST',
          body: { id: `settings_${merchantId}`, merchant_id: merchantId, settings_data: data },
          query: 'on_conflict=id'
        });
      } catch (e) {
        console.error('Supabase settings save error:', e);
        throw e;
      }
    }
    return data;
  },

  // 2. Catalog Items
  async getItems(merchantId?: string): Promise<any[]> {
    if (isSupabaseConfigured()) {
      try {
        const query = merchantId ? `merchant_id=eq.${merchantId}&order=id.desc` : 'order=id.desc';
        const list = await postgrestRequest('jstip_items', { query });
        if (Array.isArray(list)) {
          // Cloud is the single source of truth. Sync to local and return immediately.
          setLocal('jastip_items', list);
          return list;
        }
      } catch (e) {
        console.error('Supabase get items error:', e);
      }
    }
    const allItems = getLocal('jastip_items', []);
    return merchantId ? allItems.filter((i: any) => i.merchantId === merchantId) : allItems;
  },

  async saveItem(item: any, merchantId?: string) {
    if (merchantId) {
      item.merchantId = merchantId;
      item.merchant_id = merchantId;
    }
    const items = await getLocal('jastip_items', []);
    let updated;
    const isEdit = items.some((i: any) => i.id === item.id);
    if (isEdit) {
      updated = items.map((i: any) => i.id === item.id ? item : i);
    } else {
      updated = [item, ...items];
    }
    setLocal('jastip_items', updated);

    if (isSupabaseConfigured()) {
      try {
        const dbPayload = {
          id: item.id,
          name: item.name,
          price: item.price || 0,
          cost: item.cost || 0,
          currency: item.currency,
          image: item.image || '',
          status: item.status || 'active',
          merchant_id: merchantId || null
        };
        await postgrestRequest('jstip_items', {
          method: 'POST',
          body: dbPayload,
          query: 'on_conflict=id'
        });
      } catch (e) {
        console.error('Supabase save item error:', e);
        throw e;
      }
    }
    return item;
  },

  async removeItem(id: string) {
    const items = await getLocal('jastip_items', []);
    const updated = items.filter((i: any) => i.id !== id);
    setLocal('jastip_items', updated);

    if (isSupabaseConfigured()) {
      try {
        await postgrestRequest('jstip_items', {
          method: 'DELETE',
          query: `id=eq.${id}`
        });
      } catch (e) {
        console.error('Supabase remove item error:', e);
      }
    }
    return true;
  },

  // 3. Wishlist / Sourced Tasks
  async getWishlist(merchantId?: string): Promise<any[]> {
    let remoteList: any[] = [];
    if (isSupabaseConfigured()) {
      try {
        const query = merchantId ? `merchant_id=eq.${merchantId}&order=id.desc` : 'order=id.desc';
        const list = await postgrestRequest('jstip_wishlist', { query });
        if (Array.isArray(list)) {
          const remoteList = list.map((item: any) => {
            let secureStatus = item.status;
            if (secureStatus === 'searching') {
              secureStatus = 'find';
            }
            return { ...item, status: secureStatus, sellPrice: item.sell_price || 0 };
          });
          setLocal('jastip_wishlist_items', remoteList);
          return remoteList;
        }
      } catch (e) {
        console.error('Supabase get wishlist error:', e);
      }
    }
    const allList = getLocal('jastip_wishlist_items', []);
    return merchantId ? allList.filter((i: any) => i.merchantId === merchantId) : allList;
  },

  async saveWishlist(item: any, merchantId?: string) {
    if (merchantId) {
      item.merchantId = merchantId;
      item.merchant_id = merchantId;
    }
    const list = await getLocal('jastip_wishlist_items', []);
    let updated;
    const isEdit = list.some((l: any) => l.id === item.id);
    if (isEdit) {
      updated = list.map((l: any) => l.id === item.id ? item : l);
    } else {
      updated = [item, ...list];
    }
    setLocal('jastip_wishlist_items', updated);

    if (isSupabaseConfigured()) {
      try {
        const dbPayload = {
          id: item.id,
          name: item.name,
          requester: item.requester,
          price: item.price || 0,
          sell_price: item.sellPrice || 0,
          location: item.location || 'External Chat',
          image: item.image || '',
          status: item.status || 'find',
          note: item.note || '',
          qty: item.qty || 1,
          merchant_id: merchantId || null,
          payment_method: item.paymentMethod || 'cash',
          payment_status: item.paymentStatus || 'unpaid'
        };
        await postgrestRequest('jstip_wishlist', {
          method: 'POST',
          body: dbPayload,
          query: 'on_conflict=id'
        });
      } catch (e) {
        console.error('Supabase save wishlist error:', e);
        throw e;
      }
    }
    return item;
  },

  // 4. Sales Records
  async getSales(merchantId?: string): Promise<any[]> {
    if (isSupabaseConfigured()) {
      try {
        const query = merchantId ? `merchant_id=eq.${merchantId}&order=id.desc` : 'order=id.desc';
        const list = await postgrestRequest('jstip_sales', { query });
        if (Array.isArray(list)) {
          setLocal('jastip_sales', list);
          return list;
        }
      } catch (e) {
        console.error('Supabase get sales error:', e);
      }
    }
    const allList = getLocal('jastip_sales', []);
    return merchantId ? allList.filter((s: any) => s.merchantId === merchantId) : allList;
  },

  async saveSale(sale: any, merchantId?: string) {
    if (merchantId) {
      sale.merchantId = merchantId;
      sale.merchant_id = merchantId;
    }
    const sales = await getLocal('jastip_sales', []);
    const isEdit = sales.some((s: any) => s.id === sale.id);
    let updated;
    if (isEdit) {
      updated = sales.map((s: any) => s.id === sale.id ? sale : s);
    } else {
      updated = [sale, ...sales];
    }
    setLocal('jastip_sales', updated);

    if (isSupabaseConfigured()) {
      try {
        const dbPayload = {
          id: sale.id,
          customerName: sale.customerName,
          total: sale.total || 0,
          date: sale.date || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          items: sale.items || [],
          merchant_id: merchantId || null
        };
        await postgrestRequest('jstip_sales', {
          method: 'POST',
          body: dbPayload,
          query: 'on_conflict=id'
        });
      } catch (e) {
        console.error('Supabase save sale error:', e);
        throw e;
      }
    }
    return sale;
  },

  async removeSale(id: string) {
    const sales = await getLocal('jastip_sales', []);
    const updated = sales.filter((s: any) => s.id !== id);
    setLocal('jastip_sales', updated);

    if (isSupabaseConfigured()) {
      try {
        await postgrestRequest('jstip_sales', {
          method: 'DELETE',
          query: `id=eq.${id}`
        });
      } catch (e) {
        console.error('Supabase remove sale error:', e);
      }
    }
    return true;
  },

  // 5. Operational Expenses
  async getExpenses(merchantId?: string): Promise<any[]> {
    if (isSupabaseConfigured()) {
      try {
        const query = merchantId ? `merchant_id=eq.${merchantId}&order=id.desc` : 'order=id.desc';
        const list = await postgrestRequest('jstip_expenses', { query });
        if (Array.isArray(list)) {
          const remoteList = list.map((item: any) => ({
            ...item,
            originalAmount: item.originalAmount || item.original_amount,
            originalSymbol: item.originalSymbol || item.original_symbol,
            originalCurrency: item.originalCurrency || item.original_currency,
          }));
          setLocal('jastip_expenses', remoteList);
          return remoteList;
        }
      } catch (e) {
        console.error('Supabase get expenses error:', e);
      }
    }
    const allList = getLocal('jastip_expenses', []);
    return merchantId ? allList.filter((e: any) => e.merchantId === merchantId) : allList;
  },

  async saveExpense(expense: any, merchantId?: string) {
    if (merchantId) {
      expense.merchantId = merchantId;
      expense.merchant_id = merchantId;
    }
    const expenses = await getLocal('jastip_expenses', []);
    const isEdit = expenses.some((e: any) => e.id === expense.id);
    let updated;
    if (isEdit) {
      updated = expenses.map((e: any) => e.id === expense.id ? expense : e);
    } else {
      updated = [expense, ...expenses];
    }
    setLocal('jastip_expenses', updated);

    if (isSupabaseConfigured()) {
      try {
        const dbPayload = {
          id: expense.id,
          description: expense.description,
          amount: expense.amount || 0,
          category: expense.category || 'Others',
          notes: expense.notes || '',
          originalAmount: expense.originalAmount || null,
          originalSymbol: expense.originalSymbol || null,
          originalCurrency: expense.originalCurrency || null,
          merchant_id: merchantId || null,
          date: expense.date || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        await postgrestRequest('jstip_expenses', {
          method: 'POST',
          body: dbPayload,
          query: 'on_conflict=id'
        });
      } catch (e) {
        console.error('Supabase save expense error:', e);
        throw e;
      }
    }
    return expense;
  },

  async removeExpense(id: string) {
    const expenses = await getLocal('jastip_expenses', []);
    const updated = expenses.filter((e: any) => e.id !== id);
    setLocal('jastip_expenses', updated);

    if (isSupabaseConfigured()) {
      try {
        await postgrestRequest('jstip_expenses', {
          method: 'DELETE',
          query: `id=eq.${id}`
        });
      } catch (e) {
        console.error('Supabase remove expense error:', e);
      }
    }
    return true;
  },

  // 6. Ledger Logging
  async logLedger(entry: { action_type: string, entity_id: string, description: string, amount: number, currency?: string, metadata?: any }, merchantId?: string) {
    if (!isSupabaseConfigured()) return null;
    try {
      const dbPayload = {
        action_type: entry.action_type,
        entity_id: entry.entity_id,
        description: entry.description,
        amount: entry.amount,
        currency: entry.currency || 'IDR',
        metadata: entry.metadata || {},
        merchant_id: merchantId || null
      };
      await postgrestRequest('jstip_ledger', {
        method: 'POST',
        body: dbPayload
      });
      return true;
    } catch (e) {
      console.error('Supabase ledger logging error:', e);
      return false;
    }
  },

  // 7. Merchants (Auth)
  async getMerchants(): Promise<any[]> {
    let remoteMerchants: any[] = [];
    if (isSupabaseConfigured()) {
      try {
        const rows = await postgrestRequest('jstip_merchants', { query: 'order=id.asc' });
        if (Array.isArray(rows)) {
          remoteMerchants = rows.map((r: any) => ({
            id: r.id || '',
            username: r.username || '',
            password: r.password || '',
            businessName: r.business_name || r.businessName || '',
            role: r.role || 'merchant',
            paid: r.paid !== undefined ? r.paid : true,
            createdAt: r.created_at || r.createdAt || ''
          }));
        }
      } catch (e) {
        console.error('Supabase get merchants error:', e);
      }
    }
    const localMerchants = getLocal('jastip_merchants', []);
    // Merge local and remote, prioritizing remote
    const merged = [...remoteMerchants];
    for (const lm of localMerchants) {
      if (!merged.some(rm => rm.username.toLowerCase() === lm.username.toLowerCase())) {
        merged.push(lm);
      }
    }
    return merged;
  },

  async saveMerchant(merchant: any) {
    const merchants = await this.getMerchants();
    let updated;
    const isEdit = merchants.some((m: any) => m.id === merchant.id);
    if (isEdit) {
      updated = merchants.map((m: any) => m.id === merchant.id ? merchant : m);
    } else {
      updated = [merchant, ...merchants];
    }
    setLocal('jastip_merchants', updated);

    if (isSupabaseConfigured()) {
      try {
        const dbPayload = {
          id: merchant.id,
          username: merchant.username,
          password: merchant.password,
          business_name: merchant.businessName || merchant.business_name || '',
          role: merchant.role,
          paid: merchant.paid,
          created_at: merchant.createdAt || merchant.created_at || new Date().toISOString()
        };
        await postgrestRequest('jstip_merchants', {
          method: 'POST',
          body: dbPayload,
          query: 'on_conflict=id'
        });
      } catch (e) {
        console.error('Supabase save merchant error:', e);
        throw e;
      }
    }
    return merchant;
  },

  async getMerchantByUsername(username: string): Promise<any | null> {
    if (!username) return null;
    const merchants = await this.getMerchants();
    return merchants.find((m: any) => m && m.username && m.username.toLowerCase() === username.toLowerCase()) || null;
  },

  async deleteAllData(merchantId: string) {
    if (!merchantId) return;
    
    // Clear local storage for this merchant
    const keys = [
      'jastip_items', 'jastip_wishlist', 'jastip_sales', 'jastip_expenses',
      'jastip_checklist_bought_states', 'jastip_trip_settings', 'jastip_currency_settings', 'jastip_notification_settings'
    ];
    
    keys.forEach(k => {
      localStorage.removeItem(k);
      localStorage.removeItem(`${k}_${merchantId}`);
    });

    if (isSupabaseConfigured()) {
      try {
        await Promise.all([
          postgrestRequest('jstip_items', { method: 'DELETE', query: `merchant_id=eq.${merchantId}` }),
          postgrestRequest('jstip_wishlist', { method: 'DELETE', query: `merchant_id=eq.${merchantId}` }),
          postgrestRequest('jstip_sales', { method: 'DELETE', query: `merchant_id=eq.${merchantId}` }),
          postgrestRequest('jstip_expenses', { method: 'DELETE', query: `merchant_id=eq.${merchantId}` }),
          postgrestRequest('jstip_ledger', { method: 'DELETE', query: `merchant_id=eq.${merchantId}` }),
          postgrestRequest('jstip_settings', { method: 'DELETE', query: `merchant_id=eq.${merchantId}` })
        ]);
      } catch (e) {
        console.error('Failed to delete remote data:', e);
        throw e;
      }
    }
  }
};
