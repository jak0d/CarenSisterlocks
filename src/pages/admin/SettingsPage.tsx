import DashboardLayout from '../../components/DashboardLayout';
import { LayoutDashboard, Package, Users, Calendar, Settings } from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Services', href: '/admin/services', icon: <Package className="h-5 w-5" /> },
    { name: 'Workers', href: '/admin/workers', icon: <Users className="h-5 w-5" /> },
    { name: 'Bookings', href: '/admin/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
];

export default function SettingsPage() {
    return (
        <DashboardLayout title="Settings" navigation={navigation}>
            <div className="card">
                <p className="text-gray-600">Settings coming soon...</p>
            </div>
        </DashboardLayout>
    );
}
