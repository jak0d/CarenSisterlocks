import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import {
    LayoutDashboard,
    Calendar,
    Package,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    Phone,
    Mail,
    User,
    FileText,
    DollarSign,
    X,
    CalendarDays,
    RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Booking } from '../../types';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/worker', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'My Bookings', href: '/worker/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'My Services', href: '/worker/services', icon: <Package className="h-5 w-5" /> },
];

type StatusFilter = 'all' | 'confirmed' | 'completed' | 'cancelled';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'upcoming';

interface BookingWithRelations extends Booking {
    service?: { name: string; duration_minutes: number } | null;
}

export default function WorkerBookingsPage() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [dateFilter, setDateFilter] = useState<DateFilter>('upcoming');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        if (user?.email) {
            fetchWorkerId();
        }
    }, [user]);

    useEffect(() => {
        if (workerId) {
            fetchBookings();
        }
    }, [workerId, statusFilter, dateFilter, currentPage, searchQuery]);

    const fetchWorkerId = async () => {
        try {
            const { data, error } = await supabase
                .from('workers')
                .select('id')
                .eq('email', user?.email)
                .single();

            if (error) throw error;
            setWorkerId(data?.id || null);
        } catch (error: any) {
            console.error('Error fetching worker ID:', error);
            toast.error('Could not fetch your worker profile');
            setLoading(false);
        }
    };

    const getDateRange = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (dateFilter) {
            case 'today':
                return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
            case 'week':
                const weekEnd = new Date(today);
                weekEnd.setDate(weekEnd.getDate() + 7);
                return { start: today.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] };
            case 'month':
                const monthEnd = new Date(today);
                monthEnd.setMonth(monthEnd.getMonth() + 1);
                return { start: today.toISOString().split('T')[0], end: monthEnd.toISOString().split('T')[0] };
            case 'upcoming':
                return { start: today.toISOString().split('T')[0], end: null };
            default:
                return null;
        }
    };

    const fetchBookings = async () => {
        if (!workerId) return;

        try {
            setLoading(true);

            let query = supabase
                .from('bookings')
                .select(`
                    *,
                    service:services(name, duration_minutes)
                `, { count: 'exact' })
                .eq('worker_id', workerId);

            // Apply status filter
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            // Apply date filter
            const dateRange = getDateRange();
            if (dateRange) {
                query = query.gte('booking_date', dateRange.start);
                if (dateRange.end) {
                    query = query.lte('booking_date', dateRange.end);
                }
            }

            // Apply search filter
            if (searchQuery.trim()) {
                query = query.or(`client_name.ilike.%${searchQuery}%,client_email.ilike.%${searchQuery}%,client_phone.ilike.%${searchQuery}%`);
            }

            // Apply pagination
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error, count } = await query
                .order('booking_date', { ascending: true })
                .order('start_time', { ascending: true })
                .range(from, to);

            if (error) throw error;

            setBookings(data || []);
            setTotalCount(count || 0);
        } catch (error: any) {
            console.error('Error fetching bookings:', error);
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    const updateBookingStatus = async (bookingId: string, newStatus: 'completed' | 'cancelled') => {
        try {
            setUpdatingStatus(bookingId);

            const updateData: any = { status: newStatus };
            if (newStatus === 'cancelled') {
                updateData.cancelled_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('bookings')
                .update(updateData)
                .eq('id', bookingId);

            if (error) throw error;

            toast.success(`Booking marked as ${newStatus}`);
            fetchBookings();

            if (selectedBooking?.id === bookingId) {
                setSelectedBooking(null);
            }
        } catch (error: any) {
            console.error('Error updating booking status:', error);
            toast.error('Failed to update booking');
        } finally {
            setUpdatingStatus(null);
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
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (timeString: string) => {
        const date = timeString.includes('T') ? new Date(timeString) : new Date(`2000-01-01T${timeString}`);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; text: string; icon: JSX.Element }> = {
            confirmed: {
                bg: 'bg-amber-100',
                text: 'text-amber-800',
                icon: <Clock className="h-3.5 w-3.5" />,
            },
            completed: {
                bg: 'bg-emerald-100',
                text: 'text-emerald-800',
                icon: <CheckCircle className="h-3.5 w-3.5" />,
            },
            cancelled: {
                bg: 'bg-red-100',
                text: 'text-red-800',
                icon: <XCircle className="h-3.5 w-3.5" />,
            },
        };
        return styles[status] || styles.confirmed;
    };

    const isToday = (dateString: string) => {
        const today = new Date().toISOString().split('T')[0];
        return dateString === today;
    };

    const isTomorrow = (dateString: string) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return dateString === tomorrow.toISOString().split('T')[0];
    };

    const getDayLabel = (dateString: string) => {
        if (isToday(dateString)) return 'Today';
        if (isTomorrow(dateString)) return 'Tomorrow';
        return null;
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (!workerId && !loading) {
        return (
            <DashboardLayout title="My Bookings" navigation={navigation}>
                <div className="card text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Worker Profile Not Found</h3>
                    <p className="text-gray-600">
                        Your worker profile could not be found. Please contact an administrator.
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="My Bookings" navigation={navigation}>
            {/* Header Section */}
            <div className="mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by client name, email, or phone..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="input pl-10"
                        />
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'} flex items-center gap-2`}
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                        </button>
                        <button
                            onClick={() => fetchBookings()}
                            className="btn btn-ghost flex items-center gap-2"
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-slideDown">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <div className="flex flex-wrap gap-2">
                                    {(['all', 'confirmed', 'completed', 'cancelled'] as StatusFilter[]).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => {
                                                setStatusFilter(status);
                                                setCurrentPage(1);
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${statusFilter === status
                                                    ? 'bg-rose-600 text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                                <div className="flex flex-wrap gap-2">
                                    {([
                                        { value: 'upcoming', label: 'Upcoming' },
                                        { value: 'today', label: 'Today' },
                                        { value: 'week', label: 'Next 7 Days' },
                                        { value: 'month', label: 'Next 30 Days' },
                                        { value: 'all', label: 'All Time' },
                                    ] as { value: DateFilter; label: string }[]).map(({ value, label }) => (
                                        <button
                                            key={value}
                                            onClick={() => {
                                                setDateFilter(value);
                                                setCurrentPage(1);
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${dateFilter === value
                                                    ? 'bg-rose-600 text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-700">
                                {bookings.filter(b => b.status === 'confirmed').length}
                            </p>
                            <p className="text-sm text-gray-600">Upcoming</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-emerald-700">
                                {bookings.filter(b => b.status === 'completed').length}
                            </p>
                            <p className="text-sm text-gray-600">Completed</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Calendar className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-700">{totalCount}</p>
                            <p className="text-sm text-gray-600">Total</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bookings List */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                        <p className="text-gray-600">
                            {searchQuery || statusFilter !== 'all' || dateFilter !== 'upcoming'
                                ? 'Try adjusting your filters to find bookings.'
                                : 'You have no upcoming bookings at the moment.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-gray-100">
                            {bookings.map((booking) => {
                                const statusStyle = getStatusBadge(booking.status);
                                const dayLabel = getDayLabel(booking.booking_date);

                                return (
                                    <div
                                        key={booking.id}
                                        className="p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                {/* Date and Time */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    {dayLabel && (
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${dayLabel === 'Today' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {dayLabel}
                                                        </span>
                                                    )}
                                                    <span className="text-sm text-gray-600">
                                                        {formatDate(booking.booking_date)}
                                                    </span>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                                    </span>
                                                </div>

                                                {/* Client and Service */}
                                                <h3 className="font-semibold text-gray-900 mb-1">
                                                    {booking.client_name}
                                                </h3>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    {booking.service?.name || 'N/A'}
                                                    {booking.service?.duration_minutes && (
                                                        <span className="text-gray-400"> • {booking.service.duration_minutes} min</span>
                                                    )}
                                                </p>

                                                {/* Contact Info */}
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="h-3.5 w-3.5" />
                                                        {booking.client_phone}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        {booking.client_email}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right Side - Status and Actions */}
                                            <div className="flex flex-col items-end gap-3">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                                                >
                                                    {statusStyle.icon}
                                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                </span>

                                                <p className="font-semibold text-gray-900">
                                                    {formatCurrency(booking.total_price || 0)}
                                                </p>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedBooking(booking)}
                                                        className="p-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    {booking.status === 'confirmed' && (
                                                        <button
                                                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                                                            disabled={updatingStatus === booking.id}
                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                                            title="Mark as Completed"
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} bookings
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <span className="text-sm text-gray-600">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Booking Details Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-scaleIn">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-pink-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
                                <p className="text-sm text-gray-600">
                                    {formatDate(selectedBooking.booking_date)} at {formatTime(selectedBooking.start_time)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                            {/* Status and Price */}
                            <div className="flex items-center justify-between mb-6">
                                {(() => {
                                    const style = getStatusBadge(selectedBooking.status);
                                    return (
                                        <span
                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${style.bg} ${style.text}`}
                                        >
                                            {style.icon}
                                            {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                                        </span>
                                    );
                                })()}
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(selectedBooking.total_price || 0)}
                                </p>
                            </div>

                            {/* Client Information */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Client Information
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-900">{selectedBooking.client_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <a href={`mailto:${selectedBooking.client_email}`} className="text-rose-600 hover:underline">
                                            {selectedBooking.client_email}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <a href={`tel:${selectedBooking.client_phone}`} className="text-rose-600 hover:underline">
                                            {selectedBooking.client_phone}
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Appointment Details */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    Appointment Details
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Service</p>
                                        <p className="text-gray-900 font-medium">{selectedBooking.service?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Duration</p>
                                        <p className="text-gray-900 font-medium">
                                            {selectedBooking.service?.duration_minutes
                                                ? `${selectedBooking.service.duration_minutes} min`
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Date</p>
                                        <p className="text-gray-900 font-medium">{formatDate(selectedBooking.booking_date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Time</p>
                                        <p className="text-gray-900 font-medium">
                                            {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Information */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Payment
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Total</p>
                                        <p className="text-gray-900 font-medium">{formatCurrency(selectedBooking.total_price || 0)}</p>
                                    </div>
                                    {selectedBooking.deposit_required && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Deposit</p>
                                            <p className={`font-medium ${selectedBooking.deposit_paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {formatCurrency(selectedBooking.deposit_amount || 0)}
                                                {selectedBooking.deposit_paid ? ' (Paid)' : ' (Pending)'}
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Balance Due</p>
                                        <p className="text-gray-900 font-medium">{formatCurrency(selectedBooking.balance_due || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedBooking.notes && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Notes
                                    </h3>
                                    <p className="text-gray-700 whitespace-pre-wrap">{selectedBooking.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="btn btn-ghost"
                            >
                                Close
                            </button>
                            {selectedBooking.status === 'confirmed' && (
                                <button
                                    onClick={() => updateBookingStatus(selectedBooking.id, 'completed')}
                                    disabled={updatingStatus === selectedBooking.id}
                                    className="btn bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    Mark Complete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
