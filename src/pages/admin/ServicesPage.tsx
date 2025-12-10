import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { LayoutDashboard, Package, Users, Calendar, Settings, UserCircle, Plus, Edit, Trash2, X, CheckCircle, XCircle, Clock, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Service, ServiceFormData } from '../../types';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Services', href: '/admin/services', icon: <Package className="h-5 w-5" /> },
    { name: 'Workers', href: '/admin/workers', icon: <Users className="h-5 w-5" /> },
    { name: 'Clients', href: '/admin/clients', icon: <UserCircle className="h-5 w-5" /> },
    { name: 'Bookings', href: '/admin/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
];

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [pendingServices, setPendingServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState<ServiceFormData>({
        name: '',
        description: '',
        base_price: null,
        duration_minutes: 60,
        requires_deposit: false,
        deposit_amount: null,
        is_active: true,
    });

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Separate pending suggestions from active/inactive services
            const pending = (data || []).filter(s => s.status === 'pending');
            const regular = (data || []).filter(s => s.status !== 'pending');

            setPendingServices(pending);
            setServices(regular);
        } catch (error: any) {
            console.error('Error fetching services:', error);
            toast.error('Failed to load services');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingService) {
                // Update existing service
                const { error } = await supabase
                    .from('services')
                    .update({
                        ...formData,
                        status: 'active',
                    })
                    .eq('id', editingService.id);

                if (error) throw error;
                toast.success('Service updated successfully');
            } else {
                // Create new service
                const { error } = await supabase
                    .from('services')
                    .insert([{
                        ...formData,
                        status: 'active',
                    }]);

                if (error) throw error;
                toast.success('Service created successfully');
            }

            setShowModal(false);
            setEditingService(null);
            resetForm();
            fetchServices();
        } catch (error: any) {
            console.error('Error saving service:', error);
            toast.error('Failed to save service');
        }
    };

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            description: service.description || '',
            base_price: service.base_price,
            duration_minutes: service.duration_minutes,
            requires_deposit: service.requires_deposit,
            deposit_amount: service.deposit_amount,
            is_active: service.is_active,
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service?')) return;

        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Service deleted successfully');
            fetchServices();
        } catch (error: any) {
            console.error('Error deleting service:', error);
            toast.error('Failed to delete service');
        }
    };

    const toggleActive = async (service: Service) => {
        try {
            const { error } = await supabase
                .from('services')
                .update({ is_active: !service.is_active })
                .eq('id', service.id);

            if (error) throw error;
            toast.success(`Service ${!service.is_active ? 'activated' : 'deactivated'}`);
            fetchServices();
        } catch (error: any) {
            console.error('Error toggling service:', error);
            toast.error('Failed to update service');
        }
    };

    const handleApprove = async (service: Service) => {
        try {
            const { error } = await supabase
                .from('services')
                .update({
                    status: 'active',
                    is_active: true
                })
                .eq('id', service.id);

            if (error) throw error;
            toast.success(`"${service.name}" approved and activated!`);
            fetchServices();
        } catch (error: any) {
            console.error('Error approving service:', error);
            toast.error('Failed to approve service');
        }
    };

    const handleReject = async (service: Service) => {
        if (!confirm(`Are you sure you want to reject "${service.name}"? This will delete the suggestion.`)) return;

        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', service.id);

            if (error) throw error;
            toast.success('Suggestion rejected and removed');
            fetchServices();
        } catch (error: any) {
            console.error('Error rejecting service:', error);
            toast.error('Failed to reject service');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            base_price: null,
            duration_minutes: 60,
            requires_deposit: false,
            deposit_amount: null,
            is_active: true,
        });
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingService(null);
        resetForm();
    };

    const formatCurrency = (amount: number | null) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    if (loading) {
        return (
            <DashboardLayout title="Services Management" navigation={navigation}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Services Management" navigation={navigation}>
            <div className="mb-6 flex justify-between items-center">
                <p className="text-gray-600">Manage your services and pricing</p>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    Add Service
                </button>
            </div>

            {/* Pending Suggestions Section */}
            {pendingServices.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            Pending Suggestions
                        </h2>
                        <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {pendingServices.length}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingServices.map((service) => (
                            <div
                                key={service.id}
                                className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 hover:shadow-lg transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="h-4 w-4 text-amber-600" />
                                            <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                                                Pending Review
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                                    </div>
                                </div>

                                {service.description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                        {service.description}
                                    </p>
                                )}

                                <div className="flex gap-4 text-sm text-gray-600 mb-4">
                                    <span className="font-medium">
                                        {formatCurrency(service.base_price)}
                                    </span>
                                    <span>•</span>
                                    <span>{formatDuration(service.duration_minutes)}</span>
                                </div>

                                <div className="flex gap-2 pt-3 border-t border-amber-200">
                                    <button
                                        onClick={() => handleApprove(service)}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleEdit(service)}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleReject(service)}
                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Services Section */}
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">All Services</h2>
            </div>

            {services.length === 0 ? (
                <div className="card text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No services yet. Create your first service to get started.</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Add Service
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                        <div key={service.id} className="card hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{service.name}</h3>
                                    <p className="text-sm text-gray-600 line-clamp-2">{service.description || 'No description'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(service)}
                                        className="text-blue-600 hover:text-blue-700 p-1"
                                        title="Edit"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(service.id)}
                                        className="text-red-600 hover:text-red-700 p-1"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Price:</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(service.base_price)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Duration:</span>
                                    <span className="font-semibold text-gray-900">{service.duration_minutes} min</span>
                                </div>
                                {service.requires_deposit && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Deposit:</span>
                                        <span className="font-semibold text-gray-900">{formatCurrency(service.deposit_amount)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                <span className={`badge ${service.is_active ? 'badge-success' : 'badge-error'}`}>
                                    {service.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                    onClick={() => toggleActive(service)}
                                    className={`text-sm font-medium ${service.is_active ? 'text-rose-600 hover:text-rose-700' : 'text-green-600 hover:text-green-700'}`}
                                >
                                    {service.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">
                                {editingService ? 'Edit Service' : 'Add New Service'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Service Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Sisterlocks Installation"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        className="input"
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Describe the service..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Base Price (KES)
                                        </label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={formData.base_price || ''}
                                            onChange={(e) => setFormData({ ...formData, base_price: e.target.value ? parseFloat(e.target.value) : null })}
                                            placeholder="0"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Duration (minutes) *
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            className="input"
                                            value={formData.duration_minutes}
                                            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                            placeholder="60"
                                            min="15"
                                            step="15"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="requires_deposit"
                                        checked={formData.requires_deposit}
                                        onChange={(e) => setFormData({ ...formData, requires_deposit: e.target.checked })}
                                        className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="requires_deposit" className="text-sm font-medium text-gray-700">
                                        Requires Deposit
                                    </label>
                                </div>

                                {formData.requires_deposit && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Deposit Amount (KES)
                                        </label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={formData.deposit_amount || ''}
                                            onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value ? parseFloat(e.target.value) : null })}
                                            placeholder="0"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                        Active (available for booking)
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="btn-outline flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1"
                                >
                                    {editingService ? 'Update Service' : 'Create Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
