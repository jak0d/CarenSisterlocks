import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

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
