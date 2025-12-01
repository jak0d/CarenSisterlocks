import DashboardLayout from '../../components/DashboardLayout';
import { LayoutDashboard, Calendar, Package } from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/worker', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'My Bookings', href: '/worker/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'My Services', href: '/worker/services', icon: <Package className="h-5 w-5" /> },
];

export default function WorkerBookingsPage() {
    return (
        <DashboardLayout title="My Bookings" navigation={navigation}>
            <div className="card">
                <p className="text-gray-600">No bookings yet.</p>
            </div>
        </DashboardLayout>
    );
}
