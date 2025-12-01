import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { LayoutDashboard, Package, Users, Calendar, Settings, UserCircle, Plus, Edit, Trash2, X, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Worker, WorkerFormData } from '../../types';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Services', href: '/admin/services', icon: <Package className="h-5 w-5" /> },
    { name: 'Workers', href: '/admin/workers', icon: <Users className="h-5 w-5" /> },
    { name: 'Clients', href: '/admin/clients', icon: <UserCircle className="h-5 w-5" /> },
    { name: 'Bookings', href: '/admin/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
];

export default function WorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
    const [formData, setFormData] = useState<WorkerFormData>({
        name: '',
        email: '',
        dashboard_permission: 'worker',
        is_active: true,
    });

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('workers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setWorkers(data || []);
        } catch (error: any) {
            console.error('Error fetching workers:', error);
            toast.error('Failed to load workers');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingWorker) {
                // Update existing worker
                const { error } = await supabase
                    .from('workers')
                    .update(formData)
                    .eq('id', editingWorker.id);

                if (error) throw error;
                toast.success('Worker updated successfully');
            } else {
                // Create new worker
                const { error } = await supabase
                    .from('workers')
                    .insert([formData]);

                if (error) throw error;
                toast.success('Worker created successfully');
            }

            setShowModal(false);
            setEditingWorker(null);
            resetForm();
            fetchWorkers();
        } catch (error: any) {
            console.error('Error saving worker:', error);
            toast.error(error.message || 'Failed to save worker');
        }
    };

    const handleEdit = (worker: Worker) => {
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
        if (!confirm('Are you sure you want to delete this worker? This will also remove all their bookings.')) return;

        try {
            const { error } = await supabase
                .from('workers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Worker deleted successfully');
            fetchWorkers();
        } catch (error: any) {
            console.error('Error deleting worker:', error);
            toast.error('Failed to delete worker');
        }
    };

    const toggleActive = async (worker: Worker) => {
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

            {/* Modal */}
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
        </DashboardLayout>
    );
}
