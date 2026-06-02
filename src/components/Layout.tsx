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
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden md:pl-64">
        {/* Tightened desktop width to max-w-2xl so lists don't look awkwardly wide */}
        <div className="mx-auto w-full max-w-md md:max-w-2xl pb-24 md:pb-12 pt-0 md:pt-10">
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

      {/* Desktop FAB */}
      {!isInvoiceRoute && (
        <div className="hidden md:block print:hidden">
          <GlobalActionFab />
        </div>
      )}
    </div>
  );
}
