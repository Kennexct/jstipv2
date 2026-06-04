import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, KeyRound, User, Briefcase, ChevronLeft } from 'lucide-react';
import { useMaster } from '../context/MasterContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { getCleanErrorMessage } from '../lib/error';
import { motion, AnimatePresence } from 'motion/react';

export function SignUpScreen() {
  const navigate = useNavigate();
  const { signUp } = useMaster();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [otp, setOtp] = useState('');
  const [expectedOtp, setExpectedOtp] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || !businessName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    // Send email via Resend API
    setSubmitting(true);
    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setExpectedOtp(generatedOtp);
      
      const response = await fetch('/api/resend/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer re_N7HfBNXN_DvwtMr5CqfVxBJ4yRYhfUm93`
        },
        body: JSON.stringify({
          from: 'JStip <onboarding@resend.dev>',
          to: [username],
          subject: 'Your JStip Verification Code',
          html: `<div style="font-family: sans-serif; text-align: center; padding: 20px; background-color: #f2f5f7; border-radius: 12px;">
                  <h2 style="color: #0D1B2E; margin-bottom: 8px;">Welcome to JStip!</h2>
                  <p style="color: #64748b; font-size: 14px;">Use the following code to verify your email address:</p>
                  <h1 style="font-size: 36px; letter-spacing: 8px; color: #0D1B2E; margin: 24px 0;">${generatedOtp}</h1>
                  <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
                 </div>`
        })
      });

      if (!response.ok) {
        let errMsg = 'Failed to send email';
        try {
          const errData = await response.json();
          errMsg = errData.message || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }
      
      toast.success('OTP sent to your email!', { description: 'Please check your inbox.' });
      setStep('otp');
    } catch (err: any) {
      toast.error(`Failed to send OTP: ${err.message || 'Network Error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== expectedOtp) {
      toast.error('Invalid OTP. Please check your email and try again.');
      return;
    }

    setSubmitting(true);
    try {
      await signUp(username.trim(), password, businessName.trim());
      navigate('/trip-settings');
    } catch (err: any) {
      toast.error(getCleanErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 shadow-xl shadow-[#0D1B2E]/20 rounded-2xl overflow-hidden bg-white flex items-center justify-center">
            <img src="/logo.png" alt="JStip Logo" className="h-full w-full object-cover" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#0D1B2E]">Register Merchant</h2>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Join JStip Network</p>
        </div>

        <Card className="border-none bg-white rounded-3xl overflow-hidden fintech-card">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {step === 'details' ? (
                <motion.form 
                  key="details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSendOtp} 
                  className="space-y-4"
                >
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Traveler / Business Name</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      <Input 
                        placeholder="e.g. Jane Doe (Seoul Express)" 
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-muted/30 border-none font-bold text-sm text-slate-800" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email Address</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      <Input 
                        type="email"
                        placeholder="johndoe@email.com" 
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-muted/30 border-none font-bold text-sm text-slate-800" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      <Input 
                        type="password"
                        placeholder="Choose a password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-muted/30 border-none font-bold text-sm text-slate-800" 
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="pill-button w-full h-14 bg-[#0D1B2E] text-white hover:bg-[#162847] gap-2 mt-4"
                  >
                    {submitting ? 'Sending OTP...' : 'Send Verification OTP'}
                  </Button>
                </motion.form>
              ) : (
                <motion.form 
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleVerifyOtp} 
                  className="space-y-4"
                >
                  <div className="text-center space-y-2 mb-6">
                    <h3 className="text-lg font-black text-slate-800">Check your email</h3>
                    <p className="text-xs text-muted-foreground font-medium">We sent a 6-digit verification code to <br/><span className="font-bold text-slate-800">{username}</span></p>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verification Code</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      <Input 
                        placeholder="Enter 6-digit OTP" 
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="h-14 pl-12 rounded-xl bg-muted/30 border-none font-black text-xl text-center text-slate-800 tracking-widest" 
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={submitting || otp.length < 6}
                    className="pill-button w-full h-14 bg-[#0D1B2E] text-white hover:bg-[#162847] gap-2 mt-4"
                  >
                    {submitting ? 'Verifying...' : 'Verify & Create Account'}
                  </Button>
                  
                  <button 
                    type="button" 
                    onClick={() => setStep('details')}
                    className="w-full text-xs font-bold text-muted-foreground hover:text-slate-800 uppercase tracking-widest pt-2"
                  >
                    Change Email
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
            <ChevronLeft className="h-4 w-4" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
