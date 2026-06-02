import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

import { GlobalActionFab } from './GlobalActionFab';

export function Layout() {
  const location = useLocation();
  const isInvoiceRoute = location.pathname.startsWith('/invoice');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 overflow-x-hidden pb-24">
        <div className="mx-auto w-full max-w-md">
          <Outlet />
        </div>
      </main>
      {!isInvoiceRoute && (
        <div className="print:hidden">
          <BottomNav />
          <GlobalActionFab />
        </div>
      )}
    </div>
  );
}
