import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, KeyRound, User, Sparkles } from 'lucide-react';
import { useMaster } from '../context/MasterContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { getCleanErrorMessage } from '../lib/error';
import { isSupabaseConfigured } from '../lib/supabase';

export function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useMaster();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Please enter both username and password');
      return;
    }
    
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err: any) {
      toast.error(getCleanErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1B2E] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="h-20 w-20 mx-auto shadow-xl shadow-primary/20 rounded-[2rem] overflow-hidden bg-white flex items-center justify-center mb-2">
            <img src="/logo.png" alt="JStip Logo" className="h-full w-full object-cover" />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">JStip</h2>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Traveler Sourcing Ledger</p>
        </div>

        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input 
                    placeholder="Enter your username" 
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
                    placeholder="Enter your password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-12 pl-12 rounded-xl bg-muted/30 border-none font-bold text-sm text-slate-800" 
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={submitting}
                className="w-full h-12 rounded-2xl font-black uppercase italic shadow-lg shadow-primary/20 gap-2 mt-2"
              >
                {submitting ? 'Authenticating...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">
            New traveler merchant?{' '}
            <Link to="/signup" className="text-primary font-bold hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
