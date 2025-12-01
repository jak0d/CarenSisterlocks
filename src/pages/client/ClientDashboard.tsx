import DashboardLayout from '../../components/DashboardLayout';
import { LayoutDashboard, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const navigation = [
    { name: 'Dashboard', href: '/client', icon: <LayoutDashboard className="h-5 w-5" /> },
];

export default function ClientDashboard() {
    return (
        <DashboardLayout title="My Dashboard" navigation={navigation}>
            <div className="card mb-6">
                <h2 className="text-xl font-semibold mb-4">Welcome!</h2>
                <p className="text-gray-600 mb-4">
                    Book your next appointment or view your booking history.
                </p>
                <Link to="/book" className="btn btn-primary">
                    <Calendar className="h-5 w-5 mr-2" />
                    Book Appointment
                </Link>
            </div>

            <div className="card">
                <h2 className="text-xl font-semibold mb-4">My Bookings</h2>
                <p className="text-gray-600">No bookings yet.</p>
            </div>
        </DashboardLayout>
    );
}
