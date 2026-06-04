import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { MasterProvider, useMaster } from './context/MasterContext';
import { Toaster } from 'sonner';

// Lazy load all major components and screens
const Layout = lazy(() => import('./components/Layout').then(m => ({ default: m.Layout })));
const ExploreScreen = lazy(() => import('./screens/ExploreScreen').then(m => ({ default: m.ExploreScreen })));
const OwnerDashboard = lazy(() => import('./screens/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const UploadItemScreen = lazy(() => import('./screens/UploadItemScreen').then(m => ({ default: m.UploadItemScreen })));
const TripSettingsScreen = lazy(() => import('./screens/TripSettingsScreen').then(m => ({ default: m.TripSettingsScreen })));
const OwnerInventoryScreen = lazy(() => import('./screens/OwnerInventoryScreen').then(m => ({ default: m.OwnerInventoryScreen })));
const OwnerRequestDetailScreen = lazy(() => import('./screens/OwnerRequestDetailScreen').then(m => ({ default: m.OwnerRequestDetailScreen })));
const StorefrontScreen = lazy(() => import('./screens/StorefrontScreen').then(m => ({ default: m.StorefrontScreen })));
const PublicCatalogScreen = lazy(() => import('./screens/PublicCatalogScreen').then(m => ({ default: m.PublicCatalogScreen })));
const LoginScreen = lazy(() => import('./screens/LoginScreen').then(m => ({ default: m.LoginScreen })));
const SignUpScreen = lazy(() => import('./screens/SignUpScreen').then(m => ({ default: m.SignUpScreen })));
const ReportsScreen = lazy(() => import('./screens/ReportsScreen').then(m => ({ default: m.ReportsScreen })));
const LedgerScreen = lazy(() => import('./screens/LedgerScreen').then(m => ({ default: m.LedgerScreen })));
const InvoiceScreen = lazy(() => import('./screens/InvoiceScreen').then(m => ({ default: m.InvoiceScreen })));

function RequireAuth() {
  const { currentUser, loading } = useMaster();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4]">
    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

import { ConfirmProvider } from './context/ConfirmContext';
import { ChecklistScreen } from './screens/ChecklistScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <MasterProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Storefront Route */}
              <Route path="catalog/:username" element={<PublicCatalogScreen />} />
              <Route path="items/:id" element={<StorefrontScreen />} />

              {/* Auth routes */}
              <Route path="login" element={<LoginScreen />} />
              <Route path="signup" element={<SignUpScreen />} />

              {/* Protect merchant routes */}
              <Route element={<RequireAuth />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<OwnerDashboard />} />
                  <Route path="explore" element={<ExploreScreen />} />
                  <Route path="owner/inventory" element={<OwnerInventoryScreen />} />
                  <Route path="owner/list-item" element={<UploadItemScreen />} />
                  <Route path="owner/edit-item/:id" element={<UploadItemScreen />} />
                  <Route path="owner/request/:id" element={<OwnerRequestDetailScreen />} />
                  <Route path="trip-settings" element={<TripSettingsScreen />} />
                  <Route path="reports" element={<ReportsScreen />} />
                  <Route path="ledger" element={<LedgerScreen />} />
                  <Route path="checklist" element={<ChecklistScreen />} />
                  <Route path="invoice/:id" element={<InvoiceScreen />} />
                </Route>
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
            <Toaster position="top-center" />
          </BrowserRouter>
        </ConfirmProvider>
      </MasterProvider>
    </ErrorBoundary>
  );
}
