import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { GlobalActionFab } from './GlobalActionFab';

export function Layout() {
  const location = useLocation();
  const isInvoiceRoute = location.pathname.startsWith('/invoice');

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      {!isInvoiceRoute && <Sidebar />}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden md:pl-64">
        {/* On mobile: max-w-md. On desktop: expand nicely but cap at 3xl to prevent ultra-wide stretching */}
        <div className="mx-auto w-full max-w-md md:max-w-3xl pb-24 md:pb-8 pt-0 md:pt-4">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav & FAB Wrapper */}
      {!isInvoiceRoute && (
        <div className="print:hidden md:hidden">
          <BottomNav />
          <GlobalActionFab />
        </div>
      )}

      {/* Desktop FAB (Visible only on desktop, floats over content) */}
      {!isInvoiceRoute && (
        <div className="hidden md:block print:hidden">
          <GlobalActionFab />
        </div>
      )}
    </div>
  );
}
