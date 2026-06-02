import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Filter, ShoppingCart, Wallet, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useMaster } from '../context/MasterContext';
import { Badge } from '@/components/ui/badge';
import { postgrestRequest } from '../lib/supabase';

interface LedgerEntry {
  id: string;
  created_at: string;
  action_type: string;
  entity_id: string;
  description: string;
  amount: number;
  currency: string;
}

export function LedgerScreen() {
  const navigate = useNavigate();
  const { currentUser } = useMaster();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'SALE' | 'EXPENSE' | 'WISHLIST_BOUGHT'>('ALL');

  useEffect(() => {
    const fetchLedger = async () => {
      if (!currentUser?.id) return;
      try {
        setLoading(true);
        // We bypass local storage for the ledger as it should be the single source of truth from the server
        const data = await postgrestRequest('jstip_ledger', {
          query: `merchant_id=eq.${currentUser.id}&order=created_at.desc`
        });
        if (Array.isArray(data)) {
          setEntries(data);
        }
      } catch (e) {
        console.error('Failed to fetch ledger:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [currentUser?.id]);

  const filteredEntries = entries.filter(e => filter === 'ALL' || e.action_type === filter);

  return (
    <div className="min-h-screen bg-[#f2f5f7] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f2f5f7]/80 backdrop-blur-md pt-8 pb-4 border-none h-auto flex flex-col px-4 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-slate-50 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 text-[#0D1B2E]" />
          </Button>
          <h2 className="text-xl font-black tracking-tight text-[#0D1B2E]">Financial Ledger</h2>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            onClick={() => setFilter('ALL')}
            className={`h-8 px-4 rounded-full text-xs font-bold transition-all ${filter === 'ALL' ? 'bg-[#0D1B2E] text-white' : 'bg-white text-slate-500 shadow-sm hover:bg-slate-50'}`}
          >
            All Activity
          </Button>
          <Button
            onClick={() => setFilter('SALE')}
            className={`h-8 px-4 rounded-full text-xs font-bold transition-all ${filter === 'SALE' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 shadow-sm hover:bg-slate-50'}`}
          >
            Sales
          </Button>
          <Button
            onClick={() => setFilter('EXPENSE')}
            className={`h-8 px-4 rounded-full text-xs font-bold transition-all ${filter === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-white text-slate-500 shadow-sm hover:bg-slate-50'}`}
          >
            Expenses
          </Button>
        </div>
      </header>

      <div className="px-4 mt-2 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-slate-400 font-bold text-sm">Syncing Ledger...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-3xl shadow-sm text-slate-400 flex flex-col items-center gap-4">
            <ClipboardCheck className="h-8 w-8 opacity-20" />
            <p className="text-sm font-bold">No ledger entries found</p>
            <Button 
              onClick={() => navigate('/owner/inventory')}
              className="mt-2 bg-[#0D1B2E] hover:bg-[#162847] text-white rounded-full px-6"
            >
              Record First Sale
            </Button>
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div key={entry.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                  entry.action_type === 'SALE' ? 'bg-blue-50 text-blue-600' :
                  entry.action_type === 'EXPENSE' ? 'bg-red-50 text-red-500' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  {entry.action_type === 'SALE' ? <ShoppingCart className="h-5 w-5" /> :
                   entry.action_type === 'EXPENSE' ? <Wallet className="h-5 w-5" /> :
                   <ClipboardCheck className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[#0D1B2E] truncate">{entry.description}</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {new Date(entry.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`flex items-center justify-end gap-1 font-black ${entry.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {entry.amount > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  Rp {Math.abs(entry.amount).toLocaleString()}
                </div>
                <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none px-2 h-5 mt-1 rounded text-[8px] font-black uppercase tracking-widest leading-none">
                  {entry.action_type}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
