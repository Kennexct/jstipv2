import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, TrendingUp, Receipt, Wallet, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useMaster } from '../context/MasterContext';

export function ReportsScreen() {
  const navigate = useNavigate();
  const { sales, expenses, catalogItems, tripSettings } = useMaster();
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');

  const currencySettings = tripSettings?.currency || { code: 'SGD', manualRate: 13500 };

  // Helper to resolve unit cost price in IDR if not saved in old invoices
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

  // Financial aggregates
  const totalSalesVal = sales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalExpensesVal = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  
  // Total cost valuation across all item lines of sales
  const totalCostVal = sales.reduce((acc, s) => {
    const saleCost = s.items.reduce((sAcc: number, item: any) => {
      const unitCost = item.cost || resolveItemCost(item.name);
      return sAcc + (unitCost * item.qty);
    }, 0);
    return acc + saleCost;
  }, 0);

  const netProfitVal = totalSalesVal - totalCostVal - totalExpensesVal;

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

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = "";

    const shoppingCode = currencySettings.code || 'SGD';

    if (activeTab === 'sales') {
      filename = `JStip_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = [
        "Date", 
        "Customer Name", 
        "Product Name", 
        "Qty", 
        `Cost Price Per Item (${shoppingCode})`, 
        `Total Cost Price (${shoppingCode})`, 
        "Publish Price Per Item (IDR)", 
        "Total Publish Price (IDR)", 
        "Profit Margin (IDR)",
        "Source Category"
      ];
      
      rows = sales.flatMap(sale => 
        sale.items.map((item: any) => {
          const catalogMatch = catalogItems.find(i => i.name.toLowerCase() === item.name.toLowerCase() || i.id === item.productId);
          
          let costPerItemInShopping = 0;
          if (catalogMatch) {
            costPerItemInShopping = catalogMatch.cost || 0;
          } else {
            const idrCost = item.cost || resolveItemCost(item.name);
            costPerItemInShopping = idrCost / (currencySettings.manualRate || 13500);
          }

          const formattedCostPerItem = Number(costPerItemInShopping.toFixed(2));
          const totalCostInShopping = Number((costPerItemInShopping * item.qty).toFixed(2));

          const itemCostIdr = item.cost || resolveItemCost(item.name);
          const totalCostIdr = itemCostIdr * item.qty;
          const totalPublishIdr = item.price * item.qty;
          const marginIdr = totalPublishIdr - totalCostIdr;

          return [
            sale.date || 'N/A',
            sale.customerName,
            item.name,
            item.qty,
            formattedCostPerItem,
            totalCostInShopping,
            item.price,
            totalPublishIdr,
            marginIdr,
            item.sourceCategory || 'Catalog'
          ];
        })
      );
    } else {
      filename = `JStip_Expenses_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = [
        "Date", 
        "Description", 
        "Category", 
        "Remarks", 
        "Amount (IDR)",
        "Amount (Other Currency)",
        "Currency (Other)"
      ];
      rows = expenses.map(exp => {
        const otherCurrency = getOriginalCurrencyCode(exp);
        const otherAmount = exp.originalAmount !== undefined ? exp.originalAmount : exp.amount;
        return [
          exp.date || 'N/A',
          exp.description,
          exp.category,
          exp.notes || '',
          exp.amount,
          otherAmount,
          otherCurrency
        ];
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel CSV Report exported successfully!");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f2f5f7] text-slate-900 pb-28 print:min-h-0 print:pb-0 print:bg-white">
      {/* Print Styles Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 10px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            display: block !important;
            margin-bottom: 20px !important;
            text-align: center !important;
          }
          .print-table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
            text-align: left !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
        }
      `}} />

      {/* Screen Header */}
      <header className="sticky top-0 z-50 bg-[#f2f5f7]/80 backdrop-blur-md pt-8 pb-4 border-none h-auto flex items-center px-4 gap-4 no-print">
        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-slate-50 shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-[#163300]" />
        </Button>
        <h2 className="text-xl font-black tracking-tight text-[#163300]">Ledger Reports</h2>
      </header>

      {/* Main Container */}
      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Printable Invoice Header (Hidden in UI, Visible on Print) */}
        <div className="hidden print-header text-center space-y-1">
          <h1 className="text-xl font-bold uppercase tracking-tight">JStip Ledger Statement</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Traveler Business Sourcing Records</p>
          <p className="text-[10px] text-slate-400">Generated on {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
          <div className="border-b-2 border-slate-900 my-4" />
        </div>

        {/* Aggregates Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="fintech-card bg-white">
            <CardContent className="p-3 space-y-1 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Gross Sales</span>
              <span className="text-sm font-black text-[#163300] block">Rp {totalSalesVal.toLocaleString()}</span>
            </CardContent>
          </Card>
          <Card className="fintech-card bg-white">
            <CardContent className="p-3 space-y-1 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Expenses</span>
              <span className="text-sm font-black text-red-600 block">Rp {totalExpensesVal.toLocaleString()}</span>
            </CardContent>
          </Card>
          <Card className="fintech-card bg-white">
            <CardContent className="p-3 space-y-1 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Net Margin</span>
              <span className="text-sm font-black text-emerald-600 block">Rp {netProfitVal.toLocaleString()}</span>
            </CardContent>
          </Card>
        </div>

        {/* Tab selection & export controls */}
        <div className="flex items-center justify-between no-print">
          <div className="bg-slate-200/50 p-1.5 rounded-2xl flex gap-1.5">
            <button
              onClick={() => setActiveTab('sales')}
              className={`h-10 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'sales' ? 'bg-white text-[#163300] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="h-4 w-4" /> Sales
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`h-10 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'expenses' ? 'bg-white text-[#163300] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="h-4 w-4" /> Expenses
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl bg-white border-none shadow-sm"
              onClick={handleExportCSV}
              title="Export Excel (CSV)"
            >
              <FileSpreadsheet className="h-5 w-5 text-[#163300]" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl bg-white border-none shadow-sm"
              onClick={handlePrint}
              title="Print PDF"
            >
              <Printer className="h-5 w-5 text-[#163300]" />
            </Button>
          </div>
        </div>

        {/* Sales Report Table Section */}
        {activeTab === 'sales' && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1 text-left print:block hidden">Sales Ledger Breakdown</h3>
            <div className="bg-white rounded-3xl overflow-hidden fintech-card no-print">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Recorded Sales Transactions</span>
                <Badge className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 hover:bg-slate-200">{sales.length} records</Badge>
              </div>

              {sales.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">No sales recorded yet.</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
                  {sales.map((sale) => (
                    <div 
                      key={sale.id} 
                      className="p-5 space-y-4 cursor-pointer hover:bg-slate-50 transition-colors relative group"
                      onClick={() => navigate(`/invoice/${sale.id}`)}
                      title="Click to view full invoice"
                    >
                      <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none text-[9px] px-2 py-0.5 font-bold uppercase tracking-widest">View Invoice</Badge>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="text-left space-y-1">
                          <h4 className="text-sm font-bold text-[#163300]">{sale.customerName}</h4>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{sale.date || 'Today'}</span>
                        </div>
                        <span className="text-sm font-black text-[#163300]">Rp {sale.total.toLocaleString()}</span>
                      </div>

                      <div className="space-y-2 pl-3 border-l-2 border-slate-100">
                        {sale.items.map((item: any, idx: number) => {
                          const unitCost = item.cost || resolveItemCost(item.name);
                          const totalCost = unitCost * item.qty;
                          const totalPublish = item.price * item.qty;
                          const profit = totalPublish - totalCost;

                          return (
                            <div key={idx} className="flex flex-col gap-1">
                              <div className="flex justify-between font-bold text-[#163300] text-xs">
                                <span>
                                  {item.qty}x {item.name}
                                  {item.sourceCategory === 'Wishlist' && (
                                    <Badge className="ml-2 text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 hover:bg-purple-100 border-none">Wishlist</Badge>
                                  )}
                                </span>
                                <span>Rp {totalPublish.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-[10px] font-medium text-slate-500">
                                <span>Cost: Rp {totalCost.toLocaleString()}</span>
                                <span className={profit >= 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                                  Margin: Rp {profit.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Print Table (Only rendered when print is triggered) */}
            <table className="hidden print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Item Name</th>
                  <th>Source</th>
                  <th>Qty</th>
                  <th>Cost / Item</th>
                  <th>Total Cost</th>
                  <th>Publish / Item</th>
                  <th>Total Publish</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {sales.flatMap(sale => 
                  sale.items.map((item: any, idx: number) => {
                    const unitCost = item.cost || resolveItemCost(item.name);
                    const totalCost = unitCost * item.qty;
                    const totalPublish = item.price * item.qty;
                    const margin = totalPublish - totalCost;
                    return (
                      <tr key={`${sale.id}-${idx}`}>
                        <td>{sale.date || 'N/A'}</td>
                        <td>{sale.customerName}</td>
                        <td className="uppercase">{item.name}</td>
                        <td className="uppercase">{item.sourceCategory || 'Catalog'}</td>
                        <td className="font-mono">{item.qty}</td>
                        <td className="font-mono">Rp {unitCost.toLocaleString()}</td>
                        <td className="font-mono">Rp {totalCost.toLocaleString()}</td>
                        <td className="font-mono">Rp {item.price.toLocaleString()}</td>
                        <td className="font-mono">Rp {totalPublish.toLocaleString()}</td>
                        <td className="font-mono font-bold">Rp {margin.toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{textAlign: 'center', fontStyle: 'italic'}}>No sales recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* Expenses Report Table Section */}
        {activeTab === 'expenses' && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1 text-left print:block hidden">Expenses Ledger Breakdown</h3>
            <div className="bg-white rounded-3xl overflow-hidden fintech-card no-print">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Operational Expenses Ledger</span>
                <Badge className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 hover:bg-slate-200">{expenses.length} records</Badge>
              </div>

              {expenses.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">No expenses logged yet.</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
                  {expenses.map((exp) => (
                    <div key={exp.id} className="p-5 flex items-center justify-between gap-4">
                      <div className="text-left min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#163300] truncate">{exp.description}</h4>
                          <Badge className="text-[9px] font-bold bg-slate-100 text-slate-600 border-none px-1.5 py-0 uppercase">
                            {exp.category}
                          </Badge>
                        </div>
                        {exp.notes && (
                          <p className="text-[10px] text-slate-500 font-medium">
                            &ldquo;{exp.notes}&rdquo;
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 font-bold uppercase block pt-1">{exp.date || 'Today'}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-red-600">- Rp {exp.amount.toLocaleString()}</span>
                        {exp.originalAmount && (
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                            {exp.originalSymbol} {exp.originalAmount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Print Table (Only rendered when print is triggered) */}
            <table className="hidden print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Remarks / Notes</th>
                  <th>Amount (IDR)</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.date || 'N/A'}</td>
                    <td className="uppercase">{exp.category}</td>
                    <td className="uppercase">{exp.description}</td>
                    <td>{exp.notes || '-'}</td>
                    <td className="font-mono">Rp {exp.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{textAlign: 'center', fontStyle: 'italic'}}>No expenses logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
