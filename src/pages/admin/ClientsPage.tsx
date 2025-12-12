import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import {
    LayoutDashboard,
    Package,
    Users,
    Calendar,
    Settings,
    UserCircle,
    Search,
    Mail,
    Phone,
    Trash2,
    X,
    Eye,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    TrendingUp,
    Clock,
    CheckCircle,
    DollarSign,
    CalendarDays,
    Filter,
    Star,
    XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Services', href: '/admin/services', icon: <Package className="h-5 w-5" /> },
    { name: 'Workers', href: '/admin/workers', icon: <Users className="h-5 w-5" /> },
    { name: 'Clients', href: '/admin/clients', icon: <UserCircle className="h-5 w-5" /> },
    { name: 'Bookings', href: '/admin/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
];

interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    total_spent: number;
    first_booking_date: string | null;
    last_booking_date: string | null;
    is_registered: boolean;
}

interface BookingDetails {
    id: string;
    service_name: string;
    worker_name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: string;
    total_price: number;
    deposit_paid: boolean;
    deposit_amount: number;
    notes: string | null;
}

type SortField = 'name' | 'total_bookings' | 'total_spent' | 'last_booking_date';
type SortOrder = 'asc' | 'desc';

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('last_booking_date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [clientBookings, setClientBookings] = useState<BookingDetails[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);

            // Fetch all unique clients from bookings
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    id,
                    client_name,
                    client_email,
                    client_phone,
                    booking_date,
                    status,
                    total_price
                `)
                .order('booking_date', { ascending: false });

            if (bookingsError) throw bookingsError;

            // Aggregate client data from bookings
            const clientMap = new Map<string, Client>();

            (bookingsData || []).forEach((booking) => {
                const email = booking.client_email.toLowerCase();

                if (!clientMap.has(email)) {
                    clientMap.set(email, {
                        id: email, // Use email as unique ID
                        name: booking.client_name,
                        email: booking.client_email,
                        phone: booking.client_phone,
                        total_bookings: 0,
                        completed_bookings: 0,
                        cancelled_bookings: 0,
                        total_spent: 0,
                        first_booking_date: booking.booking_date,
                        last_booking_date: booking.booking_date,
                        is_registered: false,
                    });
                }

                const client = clientMap.get(email)!;
                client.total_bookings += 1;

                if (booking.status === 'completed') {
                    client.completed_bookings += 1;
                    client.total_spent += booking.total_price || 0;
                } else if (booking.status === 'cancelled') {
                    client.cancelled_bookings += 1;
                }

                // Update first and last booking dates
                if (booking.booking_date < client.first_booking_date!) {
                    client.first_booking_date = booking.booking_date;
                }
                if (booking.booking_date > client.last_booking_date!) {
                    client.last_booking_date = booking.booking_date;
                }

                // Update name and phone if this is a more recent booking
                if (booking.booking_date === client.last_booking_date) {
                    client.name = booking.client_name;
                    client.phone = booking.client_phone;
                }
            });

            // Check which clients are registered users
            const emails = Array.from(clientMap.keys());
            if (emails.length > 0) {
                const { data: usersData } = await supabase
                    .from('users')
                    .select('email')
                    .in('email', emails);

                (usersData || []).forEach((user) => {
                    const client = clientMap.get(user.email.toLowerCase());
                    if (client) {
                        client.is_registered = true;
                    }
                });
            }

            setClients(Array.from(clientMap.values()));
        } catch (error: any) {
            console.error('Error fetching clients:', error);
            toast.error('Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    const fetchClientBookings = async (email: string) => {
        try {
            setLoadingBookings(true);

            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id,
                    booking_date,
                    start_time,
                    end_time,
                    status,
                    total_price,
                    deposit_paid,
                    deposit_amount,
                    notes,
                    service:services(name),
                    worker:workers(name)
                `)
                .eq('client_email', email)
                .order('booking_date', { ascending: false });

            if (error) throw error;

            const bookings: BookingDetails[] = (data || []).map((booking: any) => ({
                id: booking.id,
                service_name: booking.service?.name || 'N/A',
                worker_name: booking.worker?.name || 'Any Worker',
                booking_date: booking.booking_date,
                start_time: booking.start_time,
                end_time: booking.end_time,
                status: booking.status,
                total_price: booking.total_price || 0,
                deposit_paid: booking.deposit_paid,
                deposit_amount: booking.deposit_amount || 0,
                notes: booking.notes,
            }));

            setClientBookings(bookings);
        } catch (error: any) {
            console.error('Error fetching client bookings:', error);
            toast.error('Failed to load booking history');
        } finally {
            setLoadingBookings(false);
        }
    };

    const handleViewDetails = (client: Client) => {
        setSelectedClient(client);
        fetchClientBookings(client.email);
        setShowDetailsModal(true);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
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

    // Filter and sort clients
    const filteredClients = clients
        .filter((client) => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
                client.name.toLowerCase().includes(query) ||
                client.email.toLowerCase().includes(query) ||
                client.phone.includes(query)
            );
        })
        .sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'total_bookings':
                    comparison = a.total_bookings - b.total_bookings;
                    break;
                case 'total_spent':
                    comparison = a.total_spent - b.total_spent;
                    break;
                case 'last_booking_date':
                    comparison = (a.last_booking_date || '').localeCompare(b.last_booking_date || '');
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

    // Pagination
    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const paginatedClients = filteredClients.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Stats
    const totalClients = clients.length;
    const totalBookings = clients.reduce((sum, c) => sum + c.total_bookings, 0);
    const totalRevenue = clients.reduce((sum, c) => sum + c.total_spent, 0);
    const registeredClients = clients.filter((c) => c.is_registered).length;

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    if (loading) {
        return (
            <DashboardLayout title="Clients Management" navigation={navigation}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Clients Management" navigation={navigation}>
            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <p className="text-gray-600">Manage your client database</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Total Clients: <span className="font-semibold">{totalClients}</span>
                            {registeredClients > 0 && (
                                <span className="ml-2">
                                    ({registeredClients} registered)
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Search and Refresh */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 lg:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="input pl-10 w-full"
                            />
                        </div>
                        <button
                            onClick={fetchClients}
                            className="btn btn-ghost flex items-center gap-2"
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
                            <p className="text-sm text-gray-600">Total Clients</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Calendar className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
                            <p className="text-sm text-gray-600">Total Bookings</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-purple-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {totalClients > 0 ? (totalBookings / totalClients).toFixed(1) : '0'}
                            </p>
                            <p className="text-sm text-gray-600">Avg. Bookings/Client</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Clients Table */}
            <div className="card overflow-hidden">
                {paginatedClients.length === 0 ? (
                    <div className="text-center py-12">
                        <UserCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
                        <p className="text-gray-600">
                            {searchQuery
                                ? 'Try adjusting your search to find clients.'
                                : 'Clients will appear here when they make bookings.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left py-4 px-4">
                                            <button
                                                onClick={() => handleSort('name')}
                                                className="text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1"
                                            >
                                                Client {getSortIcon('name')}
                                            </button>
                                        </th>
                                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Contact</th>
                                        <th className="text-center py-4 px-4">
                                            <button
                                                onClick={() => handleSort('total_bookings')}
                                                className="text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1 mx-auto"
                                            >
                                                Bookings {getSortIcon('total_bookings')}
                                            </button>
                                        </th>
                                        <th className="text-right py-4 px-4">
                                            <button
                                                onClick={() => handleSort('total_spent')}
                                                className="text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1 ml-auto"
                                            >
                                                Total Spent {getSortIcon('total_spent')}
                                            </button>
                                        </th>
                                        <th className="text-left py-4 px-4">
                                            <button
                                                onClick={() => handleSort('last_booking_date')}
                                                className="text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1"
                                            >
                                                Last Booking {getSortIcon('last_booking_date')}
                                            </button>
                                        </th>
                                        <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedClients.map((client) => (
                                        <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-semibold shadow-sm">
                                                        {client.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 flex items-center gap-2">
                                                            {client.name}
                                                            {client.is_registered && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                                    Registered
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-gray-500">{client.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        <a href={`mailto:${client.email}`} className="hover:text-rose-600">
                                                            {client.email}
                                                        </a>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Phone className="h-3.5 w-3.5" />
                                                        <a href={`tel:${client.phone}`} className="hover:text-rose-600">
                                                            {client.phone}
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                                                        {client.total_bookings}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className="text-emerald-600" title="Completed">
                                                            ✓{client.completed_bookings}
                                                        </span>
                                                        {client.cancelled_bookings > 0 && (
                                                            <span className="text-red-500" title="Cancelled">
                                                                ✗{client.cancelled_bookings}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <p className="font-semibold text-gray-900">
                                                    {formatCurrency(client.total_spent)}
                                                </p>
                                                {client.total_bookings > 0 && (
                                                    <p className="text-xs text-gray-500">
                                                        avg. {formatCurrency(client.total_spent / client.completed_bookings || 0)}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                <p className="text-gray-900">{formatDate(client.last_booking_date)}</p>
                                                <p className="text-xs text-gray-500">
                                                    First: {formatDate(client.first_booking_date)}
                                                </p>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center justify-center">
                                                    <button
                                                        onClick={() => handleViewDetails(client)}
                                                        className="p-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredClients.length)} of{' '}
                                    {filteredClients.length} clients
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${currentPage === pageNum
                                                            ? 'bg-rose-600 text-white'
                                                            : 'text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
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

            {/* Client Details Modal */}
            {showDetailsModal && selectedClient && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-scaleIn">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-pink-50">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                    {selectedClient.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        {selectedClient.name}
                                        {selectedClient.is_registered && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                Registered
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-sm text-gray-600">{selectedClient.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                            {/* Client Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                    <p className="text-xs text-gray-600 mb-1">Total Bookings</p>
                                    <p className="text-2xl font-bold text-gray-900">{selectedClient.total_bookings}</p>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                    <p className="text-xs text-gray-600 mb-1">Completed</p>
                                    <p className="text-2xl font-bold text-emerald-700">{selectedClient.completed_bookings}</p>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                                    <p className="text-xs text-gray-600 mb-1">Total Spent</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedClient.total_spent)}</p>
                                </div>
                                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                    <p className="text-xs text-gray-600 mb-1">Member Since</p>
                                    <p className="text-lg font-bold text-gray-900">{formatDate(selectedClient.first_booking_date)}</p>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-xs text-gray-500">Email</p>
                                            <a href={`mailto:${selectedClient.email}`} className="text-rose-600 hover:underline">
                                                {selectedClient.email}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-xs text-gray-500">Phone</p>
                                            <a href={`tel:${selectedClient.phone}`} className="text-rose-600 hover:underline">
                                                {selectedClient.phone}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Booking History */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    Booking History
                                </h3>

                                {loadingBookings ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
                                    </div>
                                ) : clientBookings.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No bookings found.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {clientBookings.map((booking) => {
                                            const statusStyle = getStatusBadge(booking.status);
                                            return (
                                                <div
                                                    key={booking.id}
                                                    className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h4 className="font-semibold text-gray-900">
                                                                    {booking.service_name}
                                                                </h4>
                                                                <span
                                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                                                                >
                                                                    {statusStyle.icon}
                                                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                                                <p>
                                                                    <span className="text-gray-400">Worker:</span>{' '}
                                                                    {booking.worker_name}
                                                                </p>
                                                                <p>
                                                                    <span className="text-gray-400">Date:</span>{' '}
                                                                    {formatDate(booking.booking_date)}
                                                                </p>
                                                                <p>
                                                                    <span className="text-gray-400">Time:</span>{' '}
                                                                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                                                </p>
                                                            </div>
                                                            {booking.notes && (
                                                                <p className="text-sm text-gray-500 mt-2 italic">
                                                                    "{booking.notes}"
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <p className="font-semibold text-gray-900">
                                                                {formatCurrency(booking.total_price)}
                                                            </p>
                                                            {booking.deposit_paid && (
                                                                <p className="text-xs text-emerald-600">
                                                                    Deposit: {formatCurrency(booking.deposit_amount)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="btn btn-ghost"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
