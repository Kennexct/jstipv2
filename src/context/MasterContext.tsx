import { ReactNode, useEffect } from 'react';
import { useStore } from '../store/useStore';

// Re-export type since other components might import it from here
export type { WishlistItem } from '../store/useStore';

export const useMaster = () => useStore();

export function MasterProvider({ children }: { children: ReactNode }) {
  const refreshData = useStore(state => state.refreshData);
  const currentUser = useStore(state => state.currentUser);

  useEffect(() => {
    refreshData();
  }, [currentUser, refreshData]);

  return <>{children}</>;
}
