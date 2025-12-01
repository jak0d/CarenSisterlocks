import DashboardLayout from '../../components/DashboardLayout';
import { LayoutDashboard, Calendar, Package } from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/worker', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'My Bookings', href: '/worker/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'My Services', href: '/worker/services', icon: <Package className="h-5 w-5" /> },
];

export default function WorkerDashboard() {
    return (
        <DashboardLayout title="Worker Dashboard" navigation={navigation}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Today's Appointments</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                </div>
                <div className="card">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">This Week</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                </div>
                <div className="card">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Total Earnings</h3>
                    <p className="text-3xl font-bold text-gray-900">KES 0</p>
                </div>
            </div>

            <div className="card">
                <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
                <p className="text-gray-600">No upcoming appointments.</p>
            </div>
        </DashboardLayout>
    );
}
