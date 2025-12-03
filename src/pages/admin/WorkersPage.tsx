import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { LayoutDashboard, Package, Users, Calendar, Settings, UserCircle, Plus, Edit, Trash2, X, CheckCircle, XCircle, Key, Copy, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Worker, WorkerFormData, Service } from '../../types';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Services', href: '/admin/services', icon: <Package className="h-5 w-5" /> },
    { name: 'Workers', href: '/admin/workers', icon: <Users className="h-5 w-5" /> },
    { name: 'Clients', href: '/admin/clients', icon: <UserCircle className="h-5 w-5" /> },
    { name: 'Bookings', href: '/admin/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
];

interface WorkerWithServices extends Worker {
    user_id?: string;
    services?: Service[];
    service_count?: number;
}

interface CreatedWorkerInfo {
    email: string;
    password: string;
    name: string;
}

export default function WorkersPage() {
    const [workers, setWorkers] = useState<WorkerWithServices[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showServicesModal, setShowServicesModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [createdWorkerInfo, setCreatedWorkerInfo] = useState<CreatedWorkerInfo | null>(null);
    const [editingWorker, setEditingWorker] = useState<WorkerWithServices | null>(null);
    const [selectedWorkerForServices, setSelectedWorkerForServices] = useState<WorkerWithServices | null>(null);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [formData, setFormData] = useState<WorkerFormData>({
        name: '',
        email: '',
        dashboard_permission: 'worker',
        is_active: true,
    });

    useEffect(() => {
        fetchWorkers();
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setServices(data || []);
        } catch (error: any) {
            console.error('Error fetching services:', error);
        }
    };

    const fetchWorkers = async () => {
        try {
            setLoading(true);
            // Fetch workers with their service count
            const { data: workersData, error: workersError } = await supabase
                .from('workers')
                .select(`
                    *,
                    worker_services(count)
                `)
                .order('created_at', { ascending: false });

            if (workersError) throw workersError;

            // Transform the data to include service_count
            const workersWithCount = (workersData || []).map(worker => ({
                ...worker,
                service_count: worker.worker_services?.[0]?.count || 0
            }));

            setWorkers(workersWithCount);
        } catch (error: any) {
            console.error('Error fetching workers:', error);
            toast.error('Failed to load workers');
        } finally {
            setLoading(false);
        }
    };

    const generateSecurePassword = () => {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingWorker) {
                // Update existing worker
                const { error } = await supabase
                    .from('workers')
                    .update({
                        name: formData.name,
                        dashboard_permission: formData.dashboard_permission,
                        is_active: formData.is_active
                    })
                    .eq('id', editingWorker.id);

                if (error) throw error;
                toast.success('Worker updated successfully');
                setShowModal(false);
                setEditingWorker(null);
                resetForm();
                fetchWorkers();
            } else {
                // Create new worker with invitation email
                // Note: Supabase's inviteUserByEmail requires admin privileges
                // For now, we'll use signUp with email confirmation

                // Generate a secure temporary password
                const temporaryPassword = generateSecurePassword();

                // 1. Create auth user with email confirmation
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: temporaryPassword,
                    options: {
                        data: {
                            full_name: formData.name,
                            role: 'worker'
                        },
                        emailRedirectTo: `${window.location.origin}/worker/setup`
                    }
                });

                if (authError) throw authError;
                if (!authData.user) throw new Error('Failed to send invitation');

                // 2. Create worker profile
                const { error: workerError } = await supabase
                    .from('workers')
                    .insert([{
                        user_id: authData.user.id,
                        name: formData.name,
                        email: formData.email,
                        dashboard_permission: formData.dashboard_permission,
                        is_active: formData.is_active,
                        calendar_connected: false
                    }]);

                if (workerError) {
                    // If worker creation fails, we should ideally delete the auth user
                    // but for now, just throw the error
                    throw workerError;
                }

                // Show invitation info to admin
                setCreatedWorkerInfo({
                    email: formData.email,
                    password: temporaryPassword,
                    name: formData.name
                });
                setShowPasswordModal(true);

                toast.success('Worker invitation sent! They will receive an email to set up their account.');
                setShowModal(false);
                resetForm();
                fetchWorkers();
            }
        } catch (error: any) {
            console.error('Error saving worker:', error);
            toast.error(error.message || 'Failed to save worker');
        }
    };

    const handleEdit = (worker: WorkerWithServices) => {
        setEditingWorker(worker);
        setFormData({
            name: worker.name,
            email: worker.email,
            dashboard_permission: worker.dashboard_permission,
            is_active: worker.is_active,
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this worker? This will also remove their user account and all bookings.')) return;

        try {
            // Get the worker to find user_id
            const { data: worker } = await supabase
                .from('workers')
                .select('user_id')
                .eq('id', id)
                .single();

            // Delete worker (cascade will handle worker_services and bookings)
            const { error: workerError } = await supabase
                .from('workers')
                .delete()
                .eq('id', id);

            if (workerError) throw workerError;

            // Delete user account if exists
            if (worker?.user_id) {
                const { error: userError } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', worker.user_id);

                if (userError) console.error('Error deleting user:', userError);
            }

            toast.success('Worker deleted successfully');
            fetchWorkers();
        } catch (error: any) {
            console.error('Error deleting worker:', error);
            toast.error('Failed to delete worker');
        }
    };

    const toggleActive = async (worker: WorkerWithServices) => {
        try {
            const { error } = await supabase
                .from('workers')
                .update({ is_active: !worker.is_active })
                .eq('id', worker.id);

            if (error) throw error;
            toast.success(`Worker ${!worker.is_active ? 'activated' : 'deactivated'}`);
            fetchWorkers();
        } catch (error: any) {
            console.error('Error toggling worker:', error);
            toast.error('Failed to update worker');
        }
    };

    const handleManageServices = async (worker: WorkerWithServices) => {
        setSelectedWorkerForServices(worker);

        // Fetch current services for this worker
        try {
            const { data, error } = await supabase
                .from('worker_services')
                .select('service_id')
                .eq('worker_id', worker.id);

            if (error) throw error;
            setSelectedServiceIds(data?.map(ws => ws.service_id) || []);
            setShowServicesModal(true);
        } catch (error: any) {
            console.error('Error fetching worker services:', error);
            toast.error('Failed to load worker services');
        }
    };

    const handleSaveServices = async () => {
        if (!selectedWorkerForServices) return;

        try {
            // Delete all existing services for this worker
            const { error: deleteError } = await supabase
                .from('worker_services')
                .delete()
                .eq('worker_id', selectedWorkerForServices.id);

            if (deleteError) throw deleteError;

            // Insert new services
            if (selectedServiceIds.length > 0) {
                const workerServices = selectedServiceIds.map(serviceId => ({
                    worker_id: selectedWorkerForServices.id,
                    service_id: serviceId,
                    custom_price: null
                }));

                const { error: insertError } = await supabase
                    .from('worker_services')
                    .insert(workerServices);

                if (insertError) throw insertError;
            }

            toast.success('Worker services updated successfully');
            setShowServicesModal(false);
            setSelectedWorkerForServices(null);
            setSelectedServiceIds([]);
            fetchWorkers();
        } catch (error: any) {
            console.error('Error saving worker services:', error);
            toast.error('Failed to update worker services');
        }
    };

    const toggleServiceSelection = (serviceId: string) => {
        setSelectedServiceIds(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            dashboard_permission: 'worker',
            is_active: true,
        });
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingWorker(null);
        resetForm();
    };

    if (loading) {
        return (
            <DashboardLayout title="Workers Management" navigation={navigation}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Workers Management" navigation={navigation}>
            <div className="mb-6 flex justify-between items-center">
                <p className="text-gray-600">Manage your team members and their permissions</p>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    Add Worker
                </button>
            </div>

            {workers.length === 0 ? (
                <div className="card text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No workers yet. Add your first team member to get started.</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Add Worker
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workers.map((worker) => (
                        <div key={worker.id} className="card hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{worker.name}</h3>
                                    <p className="text-sm text-gray-600">{worker.email}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(worker)}
                                        className="text-blue-600 hover:text-blue-700 p-1"
                                        title="Edit"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(worker.id)}
                                        className="text-red-600 hover:text-red-700 p-1"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Services:</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900">
                                            {worker.service_count || 0} assigned
                                        </span>
                                        <button
                                            onClick={() => handleManageServices(worker)}
                                            className="text-rose-600 hover:text-rose-700 p-1"
                                            title="Manage Services"
                                        >
                                            <Briefcase className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Calendar:</span>
                                    <div className="flex items-center gap-1">
                                        {worker.calendar_connected ? (
                                            <>
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                <span className="text-sm font-medium text-green-600">Connected</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-600">Not Connected</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Permission:</span>
                                    <span className="text-sm font-medium text-gray-900 capitalize">
                                        {worker.dashboard_permission}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                <span className={`badge ${worker.is_active ? 'badge-success' : 'badge-error'}`}>
                                    {worker.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                    onClick={() => toggleActive(worker)}
                                    className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                                >
                                    {worker.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Worker Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full">
                        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">
                                {editingWorker ? 'Edit Worker' : 'Add New Worker'}
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
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Jane Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        className="input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="jane@example.com"
                                        disabled={!!editingWorker}
                                    />
                                    {editingWorker && (
                                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed after creation</p>
                                    )}
                                    {!editingWorker && (
                                        <p className="text-xs text-gray-500 mt-1">An invitation email will be sent to this address</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Dashboard Permission *
                                    </label>
                                    <select
                                        required
                                        className="input"
                                        value={formData.dashboard_permission}
                                        onChange={(e) => setFormData({ ...formData, dashboard_permission: e.target.value as 'none' | 'view' | 'worker' })}
                                    >
                                        <option value="none">None - No dashboard access</option>
                                        <option value="view">View - Can view bookings only</option>
                                        <option value="worker">Worker - Full worker dashboard access</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Controls what the worker can access in the dashboard
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                        Active (available for bookings)
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
                                    {editingWorker ? 'Update Worker' : 'Create Worker'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invitation Sent Modal */}
            {showPasswordModal && createdWorkerInfo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-6 w-6" />
                                <h2 className="text-xl font-semibold">Invitation Sent!</h2>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <div className="flex items-start gap-2">
                                    <Key className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-800 mb-1">
                                            Email Invitation Sent
                                        </p>
                                        <p className="text-xs text-blue-700">
                                            {createdWorkerInfo.name} will receive an email at {createdWorkerInfo.email} to set up their account and create their own password.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Worker Name
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={createdWorkerInfo.name}
                                            className="input flex-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={createdWorkerInfo.email}
                                            className="input flex-1"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(createdWorkerInfo.email)}
                                            className="btn-outline px-3"
                                            title="Copy email"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-yellow-800 mb-2">
                                        Temporary Password (Backup)
                                    </p>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={createdWorkerInfo.password}
                                            className="input flex-1 font-mono text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(createdWorkerInfo.password)}
                                            className="btn-outline px-3"
                                            title="Copy password"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-yellow-700">
                                        Save this password as a backup. The worker can use it to log in if they don't receive the email, but they should change it immediately after logging in.
                                    </p>
                                </div>

                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <p className="text-xs text-gray-700">
                                        <strong>Next steps:</strong>
                                    </p>
                                    <ul className="text-xs text-gray-700 mt-2 space-y-1 list-disc list-inside">
                                        <li>Worker will receive an email invitation</li>
                                        <li>They'll click the link to set up their password</li>
                                        <li>After setup, they can log in at the login page</li>
                                        <li>If no email arrives, share the backup password above</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setCreatedWorkerInfo(null);
                                    }}
                                    className="btn-primary w-full"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Services Modal */}
            {showServicesModal && selectedWorkerForServices && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">
                                Manage Services - {selectedWorkerForServices.name}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowServicesModal(false);
                                    setSelectedWorkerForServices(null);
                                    setSelectedServiceIds([]);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <p className="text-sm text-gray-600 mb-4">
                                Select the services this worker can provide. Selected services will be available for booking.
                            </p>

                            {services.length === 0 ? (
                                <div className="text-center py-8">
                                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-600">No services available. Create services first.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {services.map((service) => (
                                        <div
                                            key={service.id}
                                            className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedServiceIds.includes(service.id)
                                                ? 'border-rose-500 bg-rose-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            onClick={() => toggleServiceSelection(service.id)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedServiceIds.includes(service.id)}
                                                    onChange={() => toggleServiceSelection(service.id)}
                                                    className="mt-1 h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
                                                />
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900">{service.name}</h4>
                                                    {service.description && (
                                                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                                                    )}
                                                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                                        <span>KES {service.base_price?.toLocaleString() || 'N/A'}</span>
                                                        <span>•</span>
                                                        <span>{service.duration_minutes} min</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowServicesModal(false);
                                    setSelectedWorkerForServices(null);
                                    setSelectedServiceIds([]);
                                }}
                                className="btn-outline flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveServices}
                                className="btn-primary flex-1"
                            >
                                Save Services ({selectedServiceIds.length} selected)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
