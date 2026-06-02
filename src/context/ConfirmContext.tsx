import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const [resolver, setResolver] = useState<(value: boolean) => void>();

  const confirm = (opts: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(typeof opts === 'string' ? { message: opts } : opts);
      setResolver(() => resolve);
      setIsOpen(true);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver) resolver(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver) resolver(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleCancel();
      }}>
        <DialogContent>
          <DialogHeader className="text-left pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${options.isDestructive ? 'bg-red-50' : 'bg-amber-50'}`}>
                <AlertCircle className={`h-5 w-5 ${options.isDestructive ? 'text-red-500' : 'text-amber-500'}`} />
              </div>
              <DialogTitle className="text-xl font-black text-[#0D1B2E]">
                {options.title || 'Are you sure?'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-500 font-medium">
              {options.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl h-12 font-bold text-slate-600 border-slate-200 hover:bg-slate-50"
              onClick={handleCancel}
            >
              {options.cancelText || 'Cancel'}
            </Button>
            <Button 
              className={`flex-1 rounded-2xl h-12 font-bold text-white shadow-sm ${
                options.isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-[#0D1B2E] hover:bg-[#162847]'
              }`}
              onClick={handleConfirm}
            >
              {options.confirmText || 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};
