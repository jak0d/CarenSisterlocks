import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function BookAppointmentPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
            {/* Header */}
            <header className="container-custom py-6">
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-2">
                        <Sparkles className="h-8 w-8 text-primary-600" />
                        <span className="text-2xl font-bold text-gray-900">CarenSisterlocks</span>
                    </Link>
                    <Link to="/" className="btn btn-ghost">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="container-custom py-12">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">Book Your Appointment</h1>
                        <p className="text-xl text-gray-600">
                            Choose your service and preferred time slot. No signup required.
                        </p>
                    </div>

                    <div className="card">
                        <div className="text-center py-12">
                            <p className="text-gray-600 mb-4">
                                Booking system coming soon...
                            </p>
                            <p className="text-sm text-gray-500">
                                We're setting up the database and booking flow. Check back soon!
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
