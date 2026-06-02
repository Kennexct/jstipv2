import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Mail, Phone, User, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
}

export function CustomerAuthModal({ isOpen, onClose, onSuccess }: CustomerAuthModalProps) {
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill in all details');
      return;
    }

    setLoading(true);
    // Generate a random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);

    try {
      // Call our Vercel Serverless Function to send the email via Resend API
      const res = await fetch('/api/sendOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: code })
      });

      if (res.ok) {
        toast.success('Verification code sent to your email!');
        setStep('otp');
      } else {
        const errorData = await res.json();
        toast.error('Failed to send OTP. Please try again.');
        console.error('OTP Send Error:', errorData);
      }
    } catch (e) {
      toast.error('Network error while sending OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== generatedOtp && otp !== '123456') { // 123456 as backdoor for testing
      toast.error('Invalid verification code');
      return;
    }

    setLoading(true);
    // Simulate saving to DB and logging in
    setTimeout(() => {
      const customerSession = {
        id: crypto.randomUUID(),
        ...formData
      };
      
      // Save session locally
      localStorage.setItem('jstip_customer_session', JSON.stringify(customerSession));
      
      toast.success('Successfully logged in!');
      setLoading(false);
      onSuccess(customerSession);
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none bg-white">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="h-12 w-12 bg-muted rounded-2xl mx-auto flex items-center justify-center mb-3">
              {step === 'details' ? <User className="h-6 w-6 text-foreground" /> : <ShieldCheck className="h-6 w-6 text-emerald-600" />}
            </div>
            <DialogTitle className="text-xl font-black text-foreground">
              {step === 'details' ? 'Create Account to Continue' : 'Verify Your Email'}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500 mt-1">
              {step === 'details' 
                ? 'We need your details to ensure the seller can process your request.' 
                : `We sent a 6-digit code to ${formData.email}`}
            </DialogDescription>
          </div>

          <AnimatePresence mode="wait">
            {step === 'details' ? (
              <motion.form 
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendOtp} 
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      required
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="pl-9 h-12 rounded-xl bg-muted border-none font-semibold text-foreground placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">WhatsApp / Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      required
                      type="tel"
                      placeholder="e.g. 081234567890"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="pl-9 h-12 rounded-xl bg-muted border-none font-semibold text-foreground placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      required
                      type="email"
                      placeholder="e.g. john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="pl-9 h-12 rounded-xl bg-muted border-none font-semibold text-foreground placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-14 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 font-black uppercase tracking-widest mt-2 shadow-xl"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send OTP Code'}
                </Button>
              </motion.form>
            ) : (
              <motion.form 
                key="otp"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleVerifyOtp} 
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center block">Enter 6-Digit Code</label>
                  <Input 
                    required
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="h-16 text-center text-3xl tracking-[0.5em] font-black rounded-xl bg-muted border-none text-foreground placeholder:text-slate-300"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || otp.length !== 6}
                  className="w-full h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest mt-2 shadow-xl"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Continue'}
                </Button>
                
                <button 
                  type="button"
                  onClick={() => setStep('details')}
                  className="w-full text-xs font-bold text-slate-400 hover:text-foreground pt-2"
                >
                  Wrong email? Go back
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
