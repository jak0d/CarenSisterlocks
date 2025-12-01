import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { LayoutDashboard, Package, Users, Calendar, Settings, UserCircle, Search, Mail, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { UserProfile } from '../../types';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Services', href: '/admin/services', icon: <Package className="h-5 w-5" /> },
    { name: 'Workers', href: '/admin/workers', icon: <Users className="h-5 w-5" /> },
    { name: 'Clients', href: '/admin/clients', icon: <UserCircle className="h-5 w-5" /> },
    { name: 'Bookings', href: '/admin/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
];

interface ClientWithBookings extends UserProfile {
    total_bookings?: number;
    total_spent?: number;
    last_booking_date?: string;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<ClientWithBookings[]>([]);
    const [filteredClients, setFilteredClients] = useState<ClientWithBookings[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClientWithBookings | null>(null);
    const [clientBookings, setClientBookings] = useState<any[]>([]);

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        // Filter clients based on search query
        if (searchQuery.trim() === '') {
            setFilteredClients(clients);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = clients.filter(client =>
                client.full_name?.toLowerCase().includes(query) ||
                client.email.toLowerCase().includes(query)
            );
            setFilteredClients(filtered);
        }
    }, [searchQuery, clients]);

    const fetchClients = async () => {
        try {
            setLoading(true);

            // Fetch all users with role 'client'
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'client')
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;

            // For each client, fetch their booking stats
            const clientsWithStats = await Promise.all(
                (usersData || []).map(async (client) => {
                    // Get bookings for this client by email
                    const { data: bookingsData } = await supabase
                        .from('bookings')
                        .select('total_price, booking_date, status')
                        .eq('client_email', client.email);

                    const totalBookings = bookingsData?.length || 0;
                    const totalSpent = bookingsData?.reduce((sum, booking) =>
                        sum + (booking.status === 'completed' ? (booking.total_price || 0) : 0), 0
                    ) || 0;
                    const lastBooking = bookingsData?.[0]?.booking_date || null;

                    return {
                        ...client,
                        total_bookings: totalBookings,
                        total_spent: totalSpent,
                        last_booking_date: lastBooking,
                    };
                })
            );

            setClients(clientsWithStats);
            setFilteredClients(clientsWithStats);
        } catch (error: any) {
            console.error('Error fetching clients:', error);
            toast.error('Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (client: ClientWithBookings) => {
        setSelectedClient(client);

        // Fetch client's bookings
        try {
            const { data: bookingsData, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    service:services(name),
                    worker:workers(name)
                `)
                .eq('client_email', client.email)
                .order('booking_date', { ascending: false });

            if (error) throw error;
            setClientBookings(bookingsData || []);
        } catch (error: any) {
            console.error('Error fetching client bookings:', error);
            toast.error('Failed to load client bookings');
        }

        setShowDetailsModal(true);
    };

    const handleDeleteClient = async (clientId: string, clientEmail: string) => {
        if (!confirm('Are you sure you want to delete this client? This will also remove all their bookings.')) return;

        try {
            // First delete all bookings associated with this client
            const { error: bookingsError } = await supabase
                .from('bookings')
                .delete()
                .eq('client_email', clientEmail);

            if (bookingsError) throw bookingsError;

            // Then delete the user
            const { error: userError } = await supabase
                .from('users')
                .delete()
                .eq('id', clientId);

            if (userError) throw userError;

            toast.success('Client deleted successfully');
            fetchClients();
        } catch (error: any) {
            console.error('Error deleting client:', error);
            toast.error('Failed to delete client');
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

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
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
            <DashboardLayout title="Clients Management" navigation={navigation}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Clients Management" navigation={navigation}>
            {/* Header with Search */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p className="text-gray-600">Manage your client database</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Total Clients: <span className="font-semibold">{clients.length}</span>
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="input pl-10 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Total Clients</h3>
                    <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
                </div>
                <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Total Bookings</h3>
                    <p className="text-3xl font-bold text-gray-900">
                        {clients.reduce((sum, client) => sum + (client.total_bookings || 0), 0)}
                    </p>
                </div>
                <div className="card bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Total Revenue</h3>
                    <p className="text-3xl font-bold text-gray-900">
                        {formatCurrency(clients.reduce((sum, client) => sum + (client.total_spent || 0), 0))}
                    </p>
                </div>
            </div>

            {/* Clients Table */}
            {filteredClients.length === 0 ? (
                <div className="card text-center py-12">
                    <UserCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                        {searchQuery ? 'No clients found matching your search.' : 'No clients yet. Clients will appear here when they make bookings.'}
                    </p>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contact</th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Bookings</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Spent</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Last Booking</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Joined</th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-semibold">
                                                    {client.full_name?.charAt(0).toUpperCase() || client.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {client.full_name || 'No name'}
                                                    </p>
                                                    <p className="text-sm text-gray-600">{client.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Mail className="h-4 w-4" />
                                                <span>{client.email}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                                                {client.total_bookings || 0}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                                            {formatCurrency(client.total_spent || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {formatDate(client.last_booking_date || null)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {formatDate(client.created_at)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleViewDetails(client)}
                                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                    title="View Details"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClient(client.id, client.email)}
                                                    className="text-red-600 hover:text-red-700 p-1"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Client Details Modal */}
            {showDetailsModal && selectedClient && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-semibold text-lg">
                                    {selectedClient.full_name?.charAt(0).toUpperCase() || selectedClient.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">{selectedClient.full_name || 'Client Details'}</h2>
                                    <p className="text-sm text-gray-600">{selectedClient.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Client Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="card bg-blue-50 border-blue-200">
                                    <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
                                    <p className="text-2xl font-bold text-gray-900">{selectedClient.total_bookings || 0}</p>
                                </div>
                                <div className="card bg-green-50 border-green-200">
                                    <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedClient.total_spent || 0)}</p>
                                </div>
                                <div className="card bg-purple-50 border-purple-200">
                                    <p className="text-sm text-gray-600 mb-1">Member Since</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatDate(selectedClient.created_at)}</p>
                                </div>
                            </div>

                            {/* Booking History */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Booking History</h3>
                                {clientBookings.length === 0 ? (
                                    <p className="text-gray-600 text-center py-8">No bookings yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {clientBookings.map((booking) => (
                                            <div key={booking.id} className="card hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h4 className="font-semibold text-gray-900">
                                                                {booking.service?.name || 'Service'}
                                                            </h4>
                                                            <span className={`badge ${getStatusBadge(booking.status)}`}>
                                                                {booking.status}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-1 text-sm text-gray-600">
                                                            <p>Worker: {booking.worker?.name || 'Any Worker'}</p>
                                                            <p>Date: {formatDateTime(booking.start_time)}</p>
                                                            {booking.notes && <p>Notes: {booking.notes}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-gray-900">
                                                            {formatCurrency(booking.total_price || 0)}
                                                        </p>
                                                        {booking.deposit_paid && (
                                                            <p className="text-xs text-green-600 mt-1">
                                                                Deposit: {formatCurrency(booking.deposit_amount || 0)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
