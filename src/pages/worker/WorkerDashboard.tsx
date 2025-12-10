import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import GoogleCalendarConnect from '../../components/GoogleCalendarConnect';
import { LayoutDashboard, Calendar, Package, Clock, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const navigation = [
    { name: 'Dashboard', href: '/worker', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'My Bookings', href: '/worker/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'My Services', href: '/worker/services', icon: <Package className="h-5 w-5" /> },
];

interface WorkerStats {
    todayAppointments: number;
    weekAppointments: number;
    totalEarnings: number;
    completedBookings: number;
}

interface WorkerCalendarInfo {
    calendar_connected: boolean;
    google_calendar_id: string | null;
}

interface UpcomingBooking {
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    client_name: string;
    client_phone: string;
    status: string;
    service?: {
        name: string;
    } | { name: string }[] | null;
}

export default function WorkerDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<WorkerStats>({
        todayAppointments: 0,
        weekAppointments: 0,
        totalEarnings: 0,
        completedBookings: 0,
    });
    const [calendarInfo, setCalendarInfo] = useState<WorkerCalendarInfo>({
        calendar_connected: false,
        google_calendar_id: null,
    });
    const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);

    useEffect(() => {
        if (user) {
            fetchWorkerData();
        }
    }, [user]);

    const fetchWorkerData = async () => {
        try {
            setLoading(true);

            // Get worker profile
            const { data: workerData, error: workerError } = await supabase
                .from('workers')
                .select('id, calendar_connected, google_calendar_id')
                .eq('user_id', user?.id)
                .single();

            if (workerError) {
                console.error('Error fetching worker:', workerError);
                return;
            }

            setCalendarInfo({
                calendar_connected: workerData.calendar_connected,
                google_calendar_id: workerData.google_calendar_id,
            });

            const workerId = workerData.id;
            const today = new Date().toISOString().split('T')[0];
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() + 7);
            const weekEndStr = weekEnd.toISOString().split('T')[0];

            // Get today's appointments
            const { count: todayCount } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('worker_id', workerId)
                .eq('booking_date', today)
                .neq('status', 'cancelled');

            // Get this week's appointments
            const { count: weekCount } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('worker_id', workerId)
                .gte('booking_date', today)
                .lte('booking_date', weekEndStr)
                .neq('status', 'cancelled');

            // Get total earnings from completed bookings
            const { data: earningsData } = await supabase
                .from('bookings')
                .select('total_price')
                .eq('worker_id', workerId)
                .eq('status', 'completed');

            const totalEarnings = earningsData?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

            // Get completed bookings count
            const { count: completedCount } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('worker_id', workerId)
                .eq('status', 'completed');

            setStats({
                todayAppointments: todayCount || 0,
                weekAppointments: weekCount || 0,
                totalEarnings,
                completedBookings: completedCount || 0,
            });

            // Get upcoming bookings
            const { data: bookings } = await supabase
                .from('bookings')
                .select(`
                    id,
                    booking_date,
                    start_time,
                    end_time,
                    client_name,
                    client_phone,
                    status,
                    service:services(name)
                `)
                .eq('worker_id', workerId)
                .gte('booking_date', today)
                .neq('status', 'cancelled')
                .order('booking_date', { ascending: true })
                .order('start_time', { ascending: true })
                .limit(5);

            setUpcomingBookings((bookings as UpcomingBooking[]) || []);
        } catch (error) {
            console.error('Error fetching worker data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCalendarConnectionChange = (connected: boolean) => {
        setCalendarInfo(prev => ({ ...prev, calendar_connected: connected }));
    };

    const formatTime = (timeStr: string) => {
        const date = new Date(timeStr);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <DashboardLayout title="Worker Dashboard" navigation={navigation}>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Worker Dashboard" navigation={navigation}>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Today's Appointments</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.todayAppointments}</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">This Week</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.weekAppointments}</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Total Earnings</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                        KES {stats.totalEarnings.toLocaleString()}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-rose-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Completed</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.completedBookings}</p>
                </div>
            </div>

            {/* Google Calendar Connection */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar Integration</h2>
                <GoogleCalendarConnect
                    isConnected={calendarInfo.calendar_connected}
                    calendarId={calendarInfo.google_calendar_id}
                    onConnectionChange={handleCalendarConnectionChange}
                />
            </div>

            {/* Upcoming Appointments */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>

                {upcomingBookings.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No upcoming appointments.</p>
                ) : (
                    <div className="space-y-4">
                        {upcomingBookings.map((booking) => (
                            <div
                                key={booking.id}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500">{formatDate(booking.booking_date)}</p>
                                        <p className="font-semibold text-gray-900">
                                            {formatTime(booking.start_time)}
                                        </p>
                                    </div>
                                    <div className="h-10 w-px bg-gray-200"></div>
                                    <div>
                                        <p className="font-medium text-gray-900">{booking.client_name}</p>
                                        <p className="text-sm text-gray-500">
                                            {Array.isArray(booking.service)
                                                ? booking.service[0]?.name || 'Service'
                                                : booking.service?.name || 'Service'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.status === 'confirmed'
                                        ? 'bg-green-100 text-green-800'
                                        : booking.status === 'completed'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">{booking.client_phone}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
