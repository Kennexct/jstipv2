import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Printer, TrendingUp, Receipt, FileSpreadsheet,
  Package, BarChart2, History, LayoutDashboard, Star, Users,
  ShoppingBag, ArrowUpRight, ArrowDownRight, Percent, ChevronDown, ChevronUp,
  Award, AlertTriangle, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMaster } from '../context/MasterContext';
import { cn } from '@/lib/utils';
import { MobileMenu } from '../components/MobileMenu';

type ReportTab = 'overview' | 'sales' | 'expenses' | 'products' | 'history';

const NAVY = '#0D1B2E';
const GOLD = '#C9A84C';

export function ReportsScreen() {
  const navigate = useNavigate();
  const { sales, expenses, catalogItems, tripSettings } = useMaster();
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [salesSort, setSalesSort] = useState<'date' | 'amount' | 'customer'>('date');
  const [salesSourceFilter, setSalesSourceFilter] = useState<'all' | 'catalog' | 'wishlist'>('all');
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  const currencySettings = tripSettings?.currency || { code: 'SGD', manualRate: 13500 };

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const resolveItemCost = (itemName: string): number => {
    const match = catalogItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    if (match) {
      const itemCost = match.cost || 0;
      const itemCurrency = match.currency || 'IDR';
      const rate = currencySettings.code === itemCurrency ? (currencySettings.manualRate || 13500) : 1;
      return Math.round(itemCost * rate);
    }
    return 0;
  };

  const getOriginalCurrencyCode = (exp: any): string => {
    if (exp.originalCurrency) return exp.originalCurrency;
    const sym = exp.originalSymbol;
    if (!sym) return 'IDR';
    if (sym === 'S$') return 'SGD';
    if (sym === '₩') return 'KRW';
    if (sym === '¥') return 'JPY';
    if (sym === '฿') return 'THB';
    if (sym === '$') return 'USD';
    if (sym === '€') return 'EUR';
    return sym;
  };

  // ─── Core Financial Aggregates ───────────────────────────────────────────────
  const totalSalesVal = useMemo(() => sales.reduce((acc, s) => acc + (s.total || 0), 0), [sales]);
  const totalExpensesVal = useMemo(() => expenses.reduce((acc, e) => acc + (e.amount || 0), 0), [expenses]);
  const totalCostVal = useMemo(() => sales.reduce((acc, s) => {
    const saleCost = s.items.reduce((sAcc: number, item: any) => {
      const unitCost = item.cost || resolveItemCost(item.name);
      return sAcc + (unitCost * item.qty);
    }, 0);
    return acc + saleCost;
  }, 0), [sales, catalogItems]);

  const grossProfit = totalSalesVal - totalCostVal;
  const netProfit = grossProfit - totalExpensesVal;
  const marginPct = totalSalesVal > 0 ? ((netProfit / totalSalesVal) * 100).toFixed(1) : '0.0';
  const expenseRatePct = totalSalesVal > 0 ? ((totalExpensesVal / totalSalesVal) * 100).toFixed(1) : '0.0';
  const avgOrderValue = sales.length > 0 ? Math.round(totalSalesVal / sales.length) : 0;

  // ─── Top Customer ─────────────────────────────────────────────────────────
  const customerMap = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      map[s.customerName] = (map[s.customerName] || 0) + s.total;
    });
    return map;
  }, [sales]);

  const topCustomer = useMemo(() => {
    const entries = Object.entries(customerMap);
    if (!entries.length) return null;
    return entries.sort((a, b) => b[1] - a[1])[0];
  }, [customerMap]);

  // ─── Product Analytics ────────────────────────────────────────────────────
  const productStats = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number; cost: number }> = {};
    sales.forEach(s => {
      s.items.forEach((item: any) => {
        const key = item.name.toLowerCase();
        if (!map[key]) map[key] = { name: item.name, qty: 0, revenue: 0, cost: 0 };
        const unitCost = item.cost || resolveItemCost(item.name);
        map[key].qty += item.qty;
        map[key].revenue += item.price * item.qty;
        map[key].cost += unitCost * item.qty;
      });
    });
    return Object.values(map)
      .map(p => ({ ...p, profit: p.revenue - p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue * 100) : 0 }))
      .sort((a, b) => b.profit - a.profit);
  }, [sales, catalogItems]);

  const bestSeller = productStats[0] ?? null;

  // ─── Expense Category Breakdown ────────────────────────────────────────────
  const expenseCategoryMap = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  // ─── Trip/Date History ─────────────────────────────────────────────────────
  const historyByDate = useMemo(() => {
    const map: Record<string, { date: string; sales: any[]; expenses: any[] }> = {};
    sales.forEach(s => {
      const d = s.date ? s.date.split(' ')[0] : 'Today';
      if (!map[d]) map[d] = { date: d, sales: [], expenses: [] };
      map[d].sales.push(s);
    });
    expenses.forEach(e => {
      const d = e.date ? e.date.split(' ')[0] : 'Today';
      if (!map[d]) map[d] = { date: d, sales: [], expenses: [] };
      map[d].expenses.push(e);
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, expenses]);

  // ─── Filtered & Sorted Sales ──────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    let result = [...sales];
    if (salesSourceFilter === 'wishlist') {
      result = result.filter(s => s.items.some((i: any) => i.sourceCategory === 'Wishlist'));
    } else if (salesSourceFilter === 'catalog') {
      result = result.filter(s => s.items.every((i: any) => i.sourceCategory !== 'Wishlist'));
    }
    if (salesSort === 'amount') result.sort((a, b) => b.total - a.total);
    else if (salesSort === 'customer') result.sort((a, b) => a.customerName.localeCompare(b.customerName));
    return result;
  }, [sales, salesSort, salesSourceFilter]);

  // ─── CSV Export ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const shoppingCode = currencySettings.code || 'SGD';
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (activeTab === 'sales' || activeTab === 'overview') {
      filename = `JStip_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Date', 'Customer', 'Product', 'Qty', `Cost/Item (${shoppingCode})`, `Total Cost (${shoppingCode})`, 'Sell/Item (IDR)', 'Total Sell (IDR)', 'Margin (IDR)', 'Source'];
      rows = sales.flatMap(sale => sale.items.map((item: any) => {
        const cat = catalogItems.find(i => i.name.toLowerCase() === item.name.toLowerCase() || i.id === item.productId);
        const costInShopping = cat ? (cat.cost || 0) : (item.cost || resolveItemCost(item.name)) / (currencySettings.manualRate || 13500);
        const unitCostIdr = item.cost || resolveItemCost(item.name);
        const totalCostIdr = unitCostIdr * item.qty;
        const totalSellIdr = item.price * item.qty;
        return [sale.date || 'N/A', sale.customerName, item.name, item.qty, +costInShopping.toFixed(2), +(costInShopping * item.qty).toFixed(2), item.price, totalSellIdr, totalSellIdr - totalCostIdr, item.sourceCategory || 'Catalog'];
      }));
    } else if (activeTab === 'expenses') {
      filename = `JStip_Expenses_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Date', 'Description', 'Category', 'Notes', 'Amount (IDR)', 'Amount (Other)', 'Other Currency'];
      rows = expenses.map(exp => {
        const otherCurrency = getOriginalCurrencyCode(exp);
        const otherAmount = exp.originalAmount !== undefined ? exp.originalAmount : exp.amount;
        return [exp.date || 'N/A', exp.description, exp.category, exp.notes || '', exp.amount, otherAmount, otherCurrency];
      });
    } else if (activeTab === 'products') {
      filename = `JStip_Products_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Product', 'Units Sold', 'Total Revenue (IDR)', 'Total Cost (IDR)', 'Gross Profit (IDR)', 'Margin %'];
      rows = productStats.map(p => [p.name, p.qty, p.revenue, p.cost, p.profit, p.margin.toFixed(1) + '%']);
    }

    const csv = 'data:text/csv;charset=utf-8,' + [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  // ─── KPI Card Component ────────────────────────────────────────────────────
  const KpiCard = ({ label, value, sub, positive, icon: Icon }: { label: string; value: string; sub?: string; positive?: boolean; icon?: any }) => (
    <Card className="fintech-card bg-white">
      <CardContent className="p-4 space-y-2">
        {Icon && <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: GOLD + '20' }}><Icon className="h-4 w-4" style={{ color: GOLD }} /></div>}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
          <p className={cn('text-lg font-black leading-tight mt-0.5', positive === true ? 'text-[#0D1B2E]' : positive === false ? 'text-red-500' : '')} style={positive === undefined ? { color: NAVY } : {}}>{value}</p>
          {sub && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );

  // ─── Tab Config ───────────────────────────────────────────────────────────
  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-900 pb-28 print:min-h-0 print:pb-0 print:bg-white">
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; color: black !important; font-size: 10px !important; }
          .no-print { display: none !important; }
          .print-header { display: block !important; margin-bottom: 20px !important; text-align: center !important; }
          .print-table { display: table !important; width: 100% !important; border-collapse: collapse !important; }
          .print-table th, .print-table td { border: 1px solid #cbd5e1 !important; padding: 6px 8px !important; text-align: left !important; }
          .print-table th { background-color: #f1f5f9 !important; font-weight: bold !important; }
        }
      `}} />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F4F6F9]/90 backdrop-blur-md pt-8 pb-4 px-4 flex items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <MobileMenu />
          <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-slate-50 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" style={{ color: NAVY }} />
          </Button>
          <div>
            <h2 className="text-xl font-black tracking-tight" style={{ color: NAVY }}>Analytics</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Business Intelligence</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white border-none shadow-sm" onClick={handleExportCSV} title="Export CSV">
            <FileSpreadsheet className="h-5 w-5" style={{ color: NAVY }} />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white border-none shadow-sm" onClick={() => window.print()} title="Print">
            <Printer className="h-5 w-5" style={{ color: NAVY }} />
          </Button>
        </div>
      </header>

      {/* Print Header */}
      <div className="hidden print-header space-y-1">
        <h1 className="text-xl font-bold uppercase">JStip Business Report</h1>
        <p className="text-xs text-slate-500 uppercase tracking-widest">Analytics Statement</p>
        <p className="text-[10px] text-slate-400">Generated {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
        <div className="border-b-2 border-slate-900 my-4" />
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-5">

        {/* Tab Navigation */}
        <div className="no-print overflow-x-auto -mx-4 px-4">
          <div className="flex gap-1.5 bg-slate-200/60 p-1.5 rounded-2xl w-max min-w-full">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap',
                  activeTab === id ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                )}
                style={activeTab === id ? { color: NAVY } : {}}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ TAB 1: OVERVIEW ════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Hero Net Profit Banner */}
            <Card className="border-none overflow-hidden shadow-xl rounded-3xl">
              <CardContent className="p-0">
                <div className="p-6 text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a2d4a 100%)` }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Net Profit (This Trip)</p>
                    <Badge className="text-[9px] border-none font-black" style={{ backgroundColor: GOLD + '30', color: GOLD }}>
                      {netProfit >= 0 ? '+' : ''}{marginPct}% margin
                    </Badge>
                  </div>
                  <p className={cn('text-4xl font-black leading-none', netProfit >= 0 ? 'text-[#C9A84C]' : 'text-red-400')}>
                    Rp {netProfit.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {netProfit >= 0
                      ? <><ArrowUpRight className="h-3.5 w-3.5 text-[#C9A84C]" /><span className="text-[10px] text-white/60">Profitable trip</span></>
                      : <><ArrowDownRight className="h-3.5 w-3.5 text-red-400" /><span className="text-[10px] text-white/60">Expenses exceed income</span></>
                    }
                  </div>
                </div>
                {/* Mini stats bar */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
                  {[
                    { label: 'Gross Sales', value: `Rp ${totalSalesVal.toLocaleString()}` },
                    { label: 'Total Cost', value: `Rp ${totalCostVal.toLocaleString()}` },
                    { label: 'Expenses', value: `Rp ${totalExpensesVal.toLocaleString()}` },
                  ].map((s) => (
                    <div key={s.label} className="p-3 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                      <p className="text-xs font-black mt-0.5" style={{ color: NAVY }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Gross Profit" value={`Rp ${grossProfit.toLocaleString()}`} sub="Revenue minus cost" positive={grossProfit >= 0} icon={TrendingUp} />
              <KpiCard label="Avg Order Value" value={`Rp ${avgOrderValue.toLocaleString()}`} sub={`${sales.length} transactions`} icon={ShoppingBag} />
              <KpiCard label="Net Margin %" value={`${marginPct}%`} sub="Of gross sales" positive={parseFloat(marginPct) > 0} icon={Percent} />
              <KpiCard label="Expense Rate" value={`${expenseRatePct}%`} sub="Of gross sales" positive={parseFloat(expenseRatePct) < 20} icon={AlertTriangle} />
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="fintech-card bg-white">
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" style={{ color: GOLD }} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Top Customer</p>
                  </div>
                  {topCustomer ? (
                    <>
                      <p className="text-sm font-black truncate w-full" title={topCustomer[0]} style={{ color: NAVY }}>{topCustomer[0]}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Rp {topCustomer[1].toLocaleString()} total</p>
                    </>
                  ) : <p className="text-xs text-slate-400">No sales yet</p>}
                </CardContent>
              </Card>
              <Card className="fintech-card bg-white">
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4" style={{ color: GOLD }} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Best Seller</p>
                  </div>
                  {bestSeller ? (
                    <>
                      <p className="text-sm font-black truncate w-full" title={bestSeller.name} style={{ color: NAVY }}>{bestSeller.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{bestSeller.qty} units sold · {bestSeller.margin.toFixed(0)}% margin</p>
                    </>
                  ) : <p className="text-xs text-slate-400">No sales yet</p>}
                </CardContent>
              </Card>
            </div>

            {/* Customer Revenue Table */}
            {Object.keys(customerMap).length > 0 && (
              <Card className="fintech-card">
                <CardContent className="p-0">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" style={{ color: GOLD }} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Customer Leaderboard</span>
                    </div>
                    <Badge className="text-[9px] bg-slate-100 text-slate-600 hover:bg-slate-200 border-none">{Object.keys(customerMap).length} customers</Badge>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {Object.entries(customerMap).sort((a, b) => b[1] - a[1]).map(([name, total], i) => (
                      <div key={name} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: i === 0 ? GOLD + '20' : '#f1f5f9', color: i === 0 ? GOLD : '#64748b' }}>
                            {i + 1}
                          </div>
                          <p className="text-sm font-bold truncate" title={name} style={{ color: NAVY }}>{name}</p>
                        </div>
                        <p className="text-sm font-black shrink-0 ml-2" style={{ color: NAVY }}>Rp {total.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ TAB 2: SALES ═══════════════════════════════════════════════════ */}
        {activeTab === 'sales' && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1">
                {(['all', 'catalog', 'wishlist'] as const).map(f => (
                  <button key={f} onClick={() => setSalesSourceFilter(f)} className={cn('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all', salesSourceFilter === f ? 'bg-white shadow-sm' : 'text-slate-500')} style={salesSourceFilter === f ? { color: NAVY } : {}}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1">
                {(['date', 'amount', 'customer'] as const).map(s => (
                  <button key={s} onClick={() => setSalesSort(s)} className={cn('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all', salesSort === s ? 'bg-white shadow-sm' : 'text-slate-500')} style={salesSort === s ? { color: NAVY } : {}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <Card className="fintech-card">
              <CardContent className="p-0">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sales Transactions</span>
                  <Badge className="text-[9px] bg-slate-100 text-slate-600 border-none">{filteredSales.length} records</Badge>
                </div>
                {filteredSales.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No sales matching filter.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSales.map(sale => {
                      const isExpanded = expandedSale === sale.id;
                      return (
                        <div key={sale.id} className="cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="p-4 flex justify-between items-center" onClick={() => setExpandedSale(isExpanded ? null : sale.id)}>
                            <div className="space-y-0.5">
                              <p className="text-sm font-black" style={{ color: NAVY }}>{sale.customerName}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{sale.date || 'Today'} · {sale.items.length} item(s)</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black" style={{ color: NAVY }}>Rp {sale.total.toLocaleString()}</p>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-2 border-t border-slate-50 pt-3">
                              {sale.items.map((item: any, idx: number) => {
                                const unitCost = item.cost || resolveItemCost(item.name);
                                const totalCost = unitCost * item.qty;
                                const totalRevenue = item.price * item.qty;
                                const profit = totalRevenue - totalCost;
                                return (
                                  <div key={idx} className="flex flex-col gap-1 pl-3 border-l-2 border-slate-100">
                                    <div className="flex justify-between font-bold text-xs" style={{ color: NAVY }}>
                                      <span>{item.qty}x {item.name}{item.sourceCategory === 'Wishlist' && <Badge className="ml-1.5 text-[8px] px-1.5 py-0 bg-purple-50 text-purple-700 border-none">Wishlist</Badge>}</span>
                                      <span>Rp {totalRevenue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-500">
                                      <span>Cost: Rp {totalCost.toLocaleString()}</span>
                                      <span className={profit >= 0 ? 'text-[#0D1B2E] font-bold' : 'text-red-500 font-bold'}>Margin: Rp {profit.toLocaleString()}</span>
                                    </div>
                                  </div>
                                );
                              })}
                              <button onClick={() => navigate(`/invoice/${sale.id}`)} className="w-full mt-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90" style={{ backgroundColor: NAVY }}>
                                View Invoice →
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Footer */}
            <Card className="fintech-card border-none" style={{ backgroundColor: NAVY }}>
              <CardContent className="p-4 flex justify-between items-center">
                <p className="text-xs font-black uppercase tracking-widest text-white/60">Total Revenue</p>
                <p className="text-xl font-black text-white">Rp {totalSalesVal.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB 3: EXPENSES ════════════════════════════════════════════════ */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {/* Category Breakdown */}
            {expenseCategoryMap.length > 0 && (
              <Card className="fintech-card">
                <CardContent className="p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Breakdown by Category</p>
                  {expenseCategoryMap.map(([cat, amount]) => {
                    const pct = totalExpensesVal > 0 ? (amount / totalExpensesVal * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-bold" style={{ color: NAVY }}>{cat}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-500 font-medium">{pct.toFixed(0)}%</p>
                            <p className="text-xs font-black" style={{ color: NAVY }}>Rp {amount.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: GOLD }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Expense List */}
            <Card className="fintech-card">
              <CardContent className="p-0">
                <div className="p-4 border-b border-slate-100 flex justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operational Expenses</span>
                  <Badge className="text-[9px] bg-slate-100 text-slate-600 border-none">{expenses.length} records</Badge>
                </div>
                {expenses.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No expenses logged.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {expenses.map(exp => (
                      <div key={exp.id} className="p-4 flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{exp.description}</p>
                            <Badge className="text-[9px] bg-slate-100 text-slate-500 border-none uppercase shrink-0">{exp.category}</Badge>
                          </div>
                          {exp.notes && <p className="text-[10px] text-slate-400">"{exp.notes}"</p>}
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{exp.date || 'Today'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-red-500">-Rp {exp.amount.toLocaleString()}</p>
                          {exp.originalAmount && <p className="text-[10px] text-slate-400 font-bold">{exp.originalSymbol} {exp.originalAmount.toLocaleString()}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="fintech-card border-none" style={{ backgroundColor: NAVY }}>
              <CardContent className="p-4 flex justify-between items-center">
                <p className="text-xs font-black uppercase tracking-widest text-white/60">Total Expenses</p>
                <p className="text-xl font-black text-red-400">Rp {totalExpensesVal.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB 4: PRODUCTS ════════════════════════════════════════════════ */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <Card className="fintech-card">
              <CardContent className="p-0">
                <div className="p-4 border-b border-slate-100 flex justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" style={{ color: GOLD }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Product Performance</span>
                  </div>
                  <Badge className="text-[9px] bg-slate-100 text-slate-600 border-none">sorted by profit</Badge>
                </div>
                {productStats.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No products sold yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {productStats.map((p, i) => (
                      <div key={p.name} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0" style={{ backgroundColor: i === 0 ? GOLD + '20' : '#f1f5f9', color: i === 0 ? GOLD : '#64748b' }}>
                              #{i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-black" style={{ color: NAVY }}>{p.name}</p>
                              <p className="text-[10px] text-slate-400">{p.qty} units sold</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-[#0D1B2E]">+Rp {p.profit.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400">{p.margin.toFixed(1)}% margin</p>
                          </div>
                        </div>
                        <div className="flex gap-3 text-[10px] text-slate-500 pl-10">
                          <span>Revenue: Rp {p.revenue.toLocaleString()}</span>
                          <span>·</span>
                          <span>Cost: Rp {p.cost.toLocaleString()}</span>
                        </div>
                        {/* Margin bar */}
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden pl-10 ml-10">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(p.margin, 100)}%`, backgroundColor: p.margin > 30 ? '#10b981' : p.margin > 10 ? GOLD : '#ef4444' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unsold catalog items */}
            {catalogItems.filter(ci => !productStats.some(ps => ps.name.toLowerCase() === ci.name.toLowerCase())).length > 0 && (
              <Card className="fintech-card border-dashed">
                <CardContent className="p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Sales Yet</p>
                  {catalogItems.filter(ci => !productStats.some(ps => ps.name.toLowerCase() === ci.name.toLowerCase())).map(ci => (
                    <div key={ci.id} className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-500">{ci.name}</p>
                      <Badge className="text-[9px] bg-amber-50 text-amber-600 border-none">Not sold</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ TAB 5: HISTORY ═════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyByDate.length === 0 ? (
              <Card className="fintech-card">
                <CardContent className="p-8 text-center">
                  <Calendar className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No activity recorded yet</p>
                </CardContent>
              </Card>
            ) : (
              historyByDate.map(day => {
                const daySales = day.sales.reduce((acc: number, s: any) => acc + s.total, 0);
                const dayExpenses = day.expenses.reduce((acc: number, e: any) => acc + e.amount, 0);
                const dayNet = daySales - dayExpenses;
                return (
                  <Card key={day.date} className="fintech-card">
                    <CardContent className="p-0">
                      {/* Day header */}
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between" style={{ backgroundColor: NAVY + '05' }}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" style={{ color: GOLD }} />
                          <p className="text-xs font-black uppercase tracking-widest" style={{ color: NAVY }}>{day.date}</p>
                        </div>
                        <p className={cn('text-sm font-black', dayNet >= 0 ? 'text-[#0D1B2E]' : 'text-red-500')}>
                          {dayNet >= 0 ? '+' : ''}Rp {dayNet.toLocaleString()}
                        </p>
                      </div>
                      {/* Day stats */}
                      <div className="grid grid-cols-3 divide-x divide-slate-100">
                        <div className="p-3 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sales</p>
                          <p className="text-xs font-black mt-0.5" style={{ color: NAVY }}>{day.sales.length}</p>
                        </div>
                        <div className="p-3 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Revenue</p>
                          <p className="text-xs font-black mt-0.5 text-[#0D1B2E]">Rp {daySales.toLocaleString()}</p>
                        </div>
                        <div className="p-3 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Expenses</p>
                          <p className="text-xs font-black mt-0.5 text-red-500">Rp {dayExpenses.toLocaleString()}</p>
                        </div>
                      </div>
                      {/* Transactions list */}
                      {day.sales.length > 0 && (
                        <div className="divide-y divide-slate-50 border-t border-slate-100">
                          {day.sales.map((s: any) => (
                            <div key={s.id} className="px-4 py-2.5 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/invoice/${s.id}`)}>
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: GOLD + '15' }}>
                                  <TrendingUp className="h-3 w-3" style={{ color: GOLD }} />
                                </div>
                                <p className="text-xs font-bold" style={{ color: NAVY }}>{s.customerName}</p>
                              </div>
                              <p className="text-xs font-black text-[#0D1B2E]">+Rp {s.total.toLocaleString()}</p>
                            </div>
                          ))}
                          {day.expenses.map((e: any) => (
                            <div key={e.id} className="px-4 py-2.5 flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-lg bg-red-50 flex items-center justify-center">
                                  <Receipt className="h-3 w-3 text-red-400" />
                                </div>
                                <p className="text-xs font-bold text-slate-500">{e.description}</p>
                              </div>
                              <p className="text-xs font-black text-red-500">-Rp {e.amount.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Print tables (hidden in UI) */}
        <table className="hidden print-table">
          <thead>
            <tr><th>Date</th><th>Customer</th><th>Item</th><th>Qty</th><th>Cost</th><th>Sell</th><th>Margin</th></tr>
          </thead>
          <tbody>
            {sales.flatMap(sale => sale.items.map((item: any, idx: number) => {
              const uc = item.cost || resolveItemCost(item.name);
              const tc = uc * item.qty;
              const ts = item.price * item.qty;
              return (
                <tr key={`${sale.id}-${idx}`}>
                  <td>{sale.date || 'N/A'}</td><td>{sale.customerName}</td>
                  <td className="uppercase">{item.name}</td><td>{item.qty}</td>
                  <td>Rp {tc.toLocaleString()}</td><td>Rp {ts.toLocaleString()}</td>
                  <td>Rp {(ts - tc).toLocaleString()}</td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
