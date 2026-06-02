import { useParams, useNavigate } from 'react-router-dom';
import { useMaster } from '../context/MasterContext';
import { ArrowLeft, Printer, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function InvoiceScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sales, currentUser } = useMaster();
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    const sale = sales.find(s => s.id === id);
    if (sale) {
      setInvoice(sale);
    }
  }, [id, sales]);

  if (!invoice) return <div className="p-8 text-center text-muted-foreground">Invoice not found or loading...</div>;

  return (
    <div className="min-h-screen bg-[#f2f5f7] p-4 pb-24">
      <header className="flex items-center justify-between mb-6 sticky top-0 z-50 bg-[#f2f5f7]/80 backdrop-blur-md py-4 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="bg-white shadow-sm rounded-full">
          <ArrowLeft className="h-5 w-5 text-[#163300]" />
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 rounded-xl border-primary text-primary hover:bg-primary/5">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="default" size="sm" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Invoice link copied to clipboard!");
          }} className="gap-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <Share2 className="h-4 w-4" /> Share Link
          </Button>
        </div>
      </header>

      <Card className="max-w-2xl mx-auto bg-white shadow-xl overflow-hidden print:shadow-none print:max-w-full rounded-3xl">
        <CardContent className="p-8 space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="h-16 w-16 mb-4 flex items-center justify-center">
                <img src="/logo.png" alt="JStip" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">INVOICE</h1>
              <p className="text-xs text-muted-foreground mt-1">#{invoice.id}</p>
            </div>
            <div className="text-right">
              <h3 className="font-black text-slate-800 uppercase tracking-tight">{currentUser?.businessName || 'Jastip Store'}</h3>
              <p className="text-xs text-muted-foreground">{invoice.date}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 relative">
            {invoice.paymentStatus === 'paid' && (
              <div className="absolute top-2 right-4 transform rotate-12 opacity-80 pointer-events-none">
                <div className="border-4 border-emerald-500 text-emerald-500 px-4 py-1 rounded-xl text-2xl font-black uppercase tracking-widest inline-block shadow-sm">
                  PAID IN FULL
                </div>
                <div className="text-center text-[10px] font-black text-emerald-600 mt-1 uppercase tracking-widest">
                  VIA {invoice.paymentMethod === 'stripe' ? 'STRIPE' : 'CASH'}
                </div>
              </div>
            )}
            <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-2">Billed To</h4>
            <p className="font-black text-lg text-slate-800 uppercase tracking-tight w-2/3">{invoice.customerName || 'Walk-in Customer'}</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-slate-100 pb-2">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-4 text-right">Amount (IDR)</div>
            </div>
            
            {(invoice.items || []).map((item: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center text-sm py-2">
                <div className="col-span-6 font-bold uppercase tracking-tight text-slate-700">{item.name || 'Misc Item'}</div>
                <div className="col-span-2 text-center text-muted-foreground font-medium">{item.qty || 1}</div>
                <div className="col-span-4 text-right font-black">Rp {(item.price || 0).toLocaleString()}</div>
              </div>
            ))}
            {(!invoice.items || invoice.items.length === 0) && (
              <div className="grid grid-cols-12 gap-2 items-center text-sm py-2">
                <div className="col-span-6 font-bold uppercase tracking-tight text-slate-700">General Items</div>
                <div className="col-span-2 text-center text-muted-foreground font-medium">1</div>
                <div className="col-span-4 text-right font-black">Rp {(invoice.total || 0).toLocaleString()}</div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-6 flex justify-end">
            <div className="w-2/3 md:w-1/2 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subtotal</span>
                <span className="font-black">Rp {(invoice.total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xl font-black pt-3 border-t-2 border-dashed border-slate-200">
                <span className="text-sm font-black uppercase tracking-widest self-end">Total Due</span>
                <span className="text-primary text-3xl tracking-tighter">
                  Rp {invoice.paymentStatus === 'paid' ? '0' : (invoice.total || 0).toLocaleString()}
                </span>
              </div>
              {invoice.paymentStatus === 'paid' && (
                <div className="flex justify-end pt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">
                    Already Paid via {invoice.paymentMethod === 'stripe' ? 'Stripe' : 'Cash'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-16 pb-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <p>Thank you for shopping with us!</p>
            <p className="mt-1 opacity-50">Generated by JStip Network</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
