import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { GlobalActionFab } from './GlobalActionFab';

export function Layout() {
  const location = useLocation();
  const isInvoiceRoute = location.pathname.startsWith('/invoice');

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#F4F6F9]">
      {/* Desktop Sidebar */}
      {!isInvoiceRoute && <Sidebar />}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden md:pl-64 relative">
        {/* Desktop Header Top Bar */}
        {!isInvoiceRoute && (
          <header className="hidden md:flex h-20 w-full items-center justify-end px-8 sticky top-0 z-30 bg-[#F4F6F9]/80 backdrop-blur-md">
            <GlobalActionFab variant="desktop" />
          </header>
        )}

        {/* Tightened desktop width to max-w-2xl so lists don't look awkwardly wide */}
        <div className="mx-auto w-full max-w-md md:max-w-2xl pb-24 md:pb-12 pt-0 md:pt-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav & FAB Wrapper */}
      {!isInvoiceRoute && (
        <div className="print:hidden md:hidden">
          <BottomNav />
          <GlobalActionFab variant="mobile" />
        </div>
      )}
    </div>
  );
}
