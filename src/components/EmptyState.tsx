import { SearchX, PackageOpen, LayoutList } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  type: 'catalog' | 'wishlist' | 'sales' | 'search';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ type, title, description, actionLabel, onAction }: EmptyStateProps) {
  
  const getIcon = () => {
    switch(type) {
      case 'catalog': return <PackageOpen className="w-16 h-16 text-slate-300" />;
      case 'wishlist': return <LayoutList className="w-16 h-16 text-slate-300" />;
      case 'search': return <SearchX className="w-16 h-16 text-slate-300" />;
      case 'sales': return <PackageOpen className="w-16 h-16 text-slate-300" />;
      default: return <PackageOpen className="w-16 h-16 text-slate-300" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6 relative">
        <div className="absolute inset-0 bg-slate-200/50 rounded-full animate-pulse blur-xl" />
        {getIcon()}
      </div>
      
      <h3 className="text-xl font-black text-[#0D1B2E] tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 font-medium mb-8 max-w-[280px]">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="rounded-full bg-[#0D1B2E] text-white hover:bg-[#162847] px-8 h-12 font-bold shadow-xl shadow-slate-200"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
