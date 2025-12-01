import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { LayoutDashboard, Package, Users, Calendar, Settings, DollarSign, UserCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Booking, DashboardStats } from '../../types';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Services', href: '/admin/services', icon: <Package className="h-5 w-5" /> },
    { name: 'Workers', href: '/admin/workers', icon: <Users className="h-5 w-5" /> },
    { name: 'Clients', href: '/admin/clients', icon: <UserCircle className="h-5 w-5" /> },
    { name: 'Bookings', href: '/admin/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
];

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        total_bookings: 0,
        total_revenue: 0,
        total_deposits: 0,
        active_services: 0,
        active_workers: 0,
        today_appointments: 0,
    });
    const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch total bookings
            const { count: totalBookings } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true });

            // Fetch total revenue
            const { data: bookingsData } = await supabase
                .from('bookings')
                .select('total_price')
                .eq('status', 'completed');

            const totalRevenue = bookingsData?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;

            // Fetch total deposits
            const { data: depositsData } = await supabase
                .from('bookings')
                .select('deposit_amount')
                .eq('deposit_paid', true);

            const totalDeposits = depositsData?.reduce((sum, booking) => sum + (booking.deposit_amount || 0), 0) || 0;

            // Fetch active services
            const { count: activeServices } = await supabase
                .from('services')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .eq('status', 'active');

            // Fetch active workers
            const { count: activeWorkers } = await supabase
                .from('workers')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Fetch today's appointments
            const today = new Date().toISOString().split('T')[0];
            const { count: todayAppointments } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('booking_date', today)
                .neq('status', 'cancelled');

            // Fetch recent bookings
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    *,
                    worker:workers(name),
                    service:services(name)
                `)
                .order('created_at', { ascending: false })
                .limit(5);

            if (bookingsError) throw bookingsError;

            setStats({
                total_bookings: totalBookings || 0,
                total_revenue: totalRevenue,
                total_deposits: totalDeposits,
                active_services: activeServices || 0,
                active_workers: activeWorkers || 0,
                today_appointments: todayAppointments || 0,
            });

            setRecentBookings(bookings || []);
        } catch (error: any) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const getStatusBadge = (status: string) => {
        const statusStyles = {
            confirmed: 'badge-warning',
            completed: 'badge-success',
            cancelled: 'badge-error',
        };
        return statusStyles[status as keyof typeof statusStyles] || 'badge';
    };

    if (loading) {
        return (
            <DashboardLayout title="Admin Dashboard" navigation={navigation}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Admin Dashboard" navigation={navigation}>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Total Bookings</h3>
                        <Calendar className="h-5 w-5 text-rose-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_bookings}</p>
                    <p className="text-sm text-gray-600 mt-1">
                        {stats.today_appointments} today
                    </p>
                </div>

                <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
                        <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.total_revenue)}</p>
                    <p className="text-sm text-gray-600 mt-1">
                        {formatCurrency(stats.total_deposits)} in deposits
                    </p>
                </div>

                <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Active Services</h3>
                        <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.active_services}</p>
                    <p className="text-sm text-gray-600 mt-1">Available to book</p>
                </div>

                <div className="card bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Active Workers</h3>
                        <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.active_workers}</p>
                    <p className="text-sm text-gray-600 mt-1">Ready to serve</p>
                </div>
            </div>

            {/* Recent Bookings */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Recent Bookings</h2>
                    <a href="/admin/bookings" className="text-rose-600 hover:text-rose-700 text-sm font-medium">
                        View all →
                    </a>
                </div>

                {recentBookings.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No bookings yet. Set up your services and workers to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Service</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Worker</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date & Time</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentBookings.map((booking) => (
                                    <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{booking.client_name}</p>
                                                <p className="text-sm text-gray-600">{booking.client_email}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-900">
                                            {booking.service?.name || 'N/A'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-900">
                                            {booking.worker?.name || 'Any Worker'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="text-gray-900">{formatDate(booking.booking_date)}</p>
                                                <p className="text-sm text-gray-600">{formatTime(booking.start_time)}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`badge ${getStatusBadge(booking.status)}`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                                            {formatCurrency(booking.total_price || 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
