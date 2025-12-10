import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';

// Pages
import HomePage from './pages/HomePage';
import BookAppointmentPage from './pages/client/BookAppointmentPage';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import UpdatePasswordPage from './pages/auth/UpdatePasswordPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ServicesPage from './pages/admin/ServicesPage';
import WorkersPage from './pages/admin/WorkersPage';
import ClientsPage from './pages/admin/ClientsPage';
import BookingsPage from './pages/admin/BookingsPage';
import SettingsPage from './pages/admin/SettingsPage';

// Worker Pages
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerBookingsPage from './pages/worker/WorkerBookingsPage';
import WorkerServicesPage from './pages/worker/WorkerServicesPage';
import WorkerSetupPage from './pages/worker/WorkerSetupPage';

// Client Pages
import ClientDashboard from './pages/client/ClientDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (user.is_active === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Deactivated</h2>
          <p className="text-gray-600 mb-4">Your account has been deactivated. Please contact the administrator.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={async () => {
                const toastId = toast.loading('Checking status...');
                try {
                  const { data, error } = await supabase.auth.getUser();
                  if (error || !data.user) throw new Error('Failed to refresh status');

                  // Force a reload to pick up new state if active
                  // checks for being active will happen on mount
                  window.location.reload();
                } catch (err) {
                  toast.error('Account is still deactivated', { id: toastId });
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
            >
              Check Status
            </button>
            <button
              onClick={() => {
                // Sign out to clear session
                supabase.auth.signOut().then(() => {
                  window.location.href = '/login';
                });
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
            >
              Sign Out
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            If you believe this is an error, try signing out and signing back in.
          </p>

        </div>
      </div>
    );
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/book" element={<BookAppointmentPage />} />
      <Route path="/login" element={user ? <Navigate to={`/${user.role}`} replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to={`/${user.role}`} replace /> : <SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />
      <Route path="/worker/setup" element={<WorkerSetupPage />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/services"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ServicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workers"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <WorkersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clients"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ClientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <BookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Worker Routes */}
      <Route
        path="/worker"
        element={
          <ProtectedRoute allowedRoles={['worker']}>
            <WorkerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/bookings"
        element={
          <ProtectedRoute allowedRoles={['worker']}>
            <WorkerBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/services"
        element={
          <ProtectedRoute allowedRoles={['worker']}>
            <WorkerServicesPage />
          </ProtectedRoute>
        }
      />

      {/* Client Routes */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
