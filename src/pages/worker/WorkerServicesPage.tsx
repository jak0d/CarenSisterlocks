import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { LayoutDashboard, Calendar, Package, Clock, DollarSign, CheckCircle, AlertCircle, Sparkles, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Service, WorkerService } from '../../types';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/worker', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'My Bookings', href: '/worker/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'My Services', href: '/worker/services', icon: <Package className="h-5 w-5" /> },
];

interface AssignedService extends WorkerService {
    service: Service;
}

export default function WorkerServicesPage() {
    const { user } = useAuth();
    const [assignedServices, setAssignedServices] = useState<AssignedService[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    const [suggestForm, setSuggestForm] = useState({
        name: '',
        description: '',
        base_price: '',
        duration_minutes: '60',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            fetchAssignedServices();
        }
    }, [user]);

    const fetchAssignedServices = async () => {
        try {
            setLoading(true);

            // First get the worker record for this user
            const { data: workerData, error: workerError } = await supabase
                .from('workers')
                .select('id')
                .eq('user_id', user?.id)
                .maybeSingle();

            if (workerError) throw workerError;
            if (!workerData) {
                console.warn('No worker profile found for user');
                setAssignedServices([]);
                setLoading(false);
                return;
            }

            // Get assigned services with service details
            const { data, error } = await supabase
                .from('worker_services')
                .select(`
                    *,
                    service:services(*)
                `)
                .eq('worker_id', workerData.id);

            if (error) throw error;

            // Filter to only include services that exist and are active
            const validServices = (data || []).filter(
                (ws: any) => ws.service && ws.service.is_active
            ) as AssignedService[];

            setAssignedServices(validServices);
        } catch (error: any) {
            console.error('Error fetching services:', error);
            toast.error('Failed to load services');
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestService = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Insert service with pending status
            const { error } = await supabase
                .from('services')
                .insert([{
                    name: suggestForm.name,
                    description: suggestForm.description || null,
                    base_price: suggestForm.base_price ? parseFloat(suggestForm.base_price) : null,
                    duration_minutes: parseInt(suggestForm.duration_minutes),
                    requires_deposit: false,
                    deposit_amount: null,
                    is_active: false, // Will be activated upon admin approval
                    status: 'pending'
                }]);

            if (error) throw error;

            toast.success('Service suggestion submitted! Admin will review it.');
            setShowSuggestModal(false);
            setSuggestForm({
                name: '',
                description: '',
                base_price: '',
                duration_minutes: '60',
            });
        } catch (error: any) {
            console.error('Error suggesting service:', error);
            toast.error(error.message || 'Failed to submit suggestion');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    if (loading) {
        return (
            <DashboardLayout title="My Services" navigation={navigation}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="My Services" navigation={navigation}>
            {/* Header with Suggest Button */}
            <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <p className="text-gray-600">
                        Services you're qualified to provide. Contact admin to update your service list.
                    </p>
                </div>
                <button
                    onClick={() => setShowSuggestModal(true)}
                    className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
                >
                    <Sparkles className="h-4 w-4" />
                    Suggest New Service
                </button>
            </div>

            {assignedServices.length === 0 ? (
                <div className="card text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Assigned Yet</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        You haven't been assigned any services yet. Contact your administrator to get services assigned to your profile.
                    </p>
                    <button
                        onClick={() => setShowSuggestModal(true)}
                        className="btn-outline inline-flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Suggest a Service
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignedServices.map((ws) => (
                        <div
                            key={ws.id}
                            className="card hover:shadow-lg transition-all duration-300 border-l-4 border-l-rose-500"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                        {ws.service.name}
                                    </h3>
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                        <CheckCircle className="h-3 w-3" />
                                        Active
                                    </span>
                                </div>
                            </div>

                            {ws.service.description && (
                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                    {ws.service.description}
                                </p>
                            )}

                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <DollarSign className="h-4 w-4" />
                                        <span className="text-sm">Price</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">
                                        {ws.custom_price
                                            ? `KES ${ws.custom_price.toLocaleString()}`
                                            : ws.service.base_price
                                                ? `KES ${ws.service.base_price.toLocaleString()}`
                                                : 'Contact for quote'
                                        }
                                        {ws.custom_price && (
                                            <span className="text-xs text-rose-600 ml-1">(Custom)</span>
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-sm">Duration</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">
                                        {formatDuration(ws.service.duration_minutes)}
                                    </span>
                                </div>

                                {ws.service.requires_deposit && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <AlertCircle className="h-4 w-4" />
                                            <span className="text-sm">Deposit Required</span>
                                        </div>
                                        <span className="font-semibold text-amber-700">
                                            KES {ws.service.deposit_amount?.toLocaleString() || 'N/A'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary Stats */}
            {assignedServices.length > 0 && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-rose-500 text-white p-2 rounded-lg">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-rose-700">Total Services</p>
                                <p className="text-2xl font-bold text-rose-900">{assignedServices.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500 text-white p-2 rounded-lg">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-emerald-700">Price Range</p>
                                <p className="text-lg font-bold text-emerald-900">
                                    KES {Math.min(...assignedServices.map(s => s.custom_price || s.service.base_price || 0)).toLocaleString()}
                                    {' - '}
                                    {Math.max(...assignedServices.map(s => s.custom_price || s.service.base_price || 0)).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500 text-white p-2 rounded-lg">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-blue-700">Avg Duration</p>
                                <p className="text-2xl font-bold text-blue-900">
                                    {formatDuration(Math.round(assignedServices.reduce((acc, s) => acc + s.service.duration_minutes, 0) / assignedServices.length))}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Suggest Service Modal */}
            {showSuggestModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full">
                        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-rose-500" />
                                <h2 className="text-xl font-semibold">Suggest New Service</h2>
                            </div>
                            <button
                                onClick={() => setShowSuggestModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSuggestService} className="p-6">
                            <p className="text-sm text-gray-600 mb-4">
                                Suggest a service you'd like to offer. The admin will review and approve it.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Service Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="input"
                                        value={suggestForm.name}
                                        onChange={(e) => setSuggestForm({ ...suggestForm, name: e.target.value })}
                                        placeholder="e.g., Sisterlocks Retightening"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        className="input"
                                        rows={3}
                                        value={suggestForm.description}
                                        onChange={(e) => setSuggestForm({ ...suggestForm, description: e.target.value })}
                                        placeholder="Describe the service..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Suggested Price (KES)
                                        </label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={suggestForm.base_price}
                                            onChange={(e) => setSuggestForm({ ...suggestForm, base_price: e.target.value })}
                                            placeholder="5000"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Duration (minutes) *
                                        </label>
                                        <select
                                            required
                                            className="input"
                                            value={suggestForm.duration_minutes}
                                            onChange={(e) => setSuggestForm({ ...suggestForm, duration_minutes: e.target.value })}
                                        >
                                            <option value="30">30 minutes</option>
                                            <option value="60">1 hour</option>
                                            <option value="90">1.5 hours</option>
                                            <option value="120">2 hours</option>
                                            <option value="180">3 hours</option>
                                            <option value="240">4 hours</option>
                                            <option value="300">5 hours</option>
                                            <option value="360">6 hours</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowSuggestModal(false)}
                                    className="btn-outline flex-1"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Submitting...' : 'Submit Suggestion'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
