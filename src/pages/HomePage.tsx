import { Link } from 'react-router-dom';
import { Calendar, Clock, CreditCard, Shield, Sparkles, Users, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
            {/* Modern Navigation Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-[72px]">
                        {/* Logo */}
                        <Link
                            to="/"
                            className="flex items-center space-x-2.5 group transition-transform hover:scale-[1.02]"
                        >
                            <div className="relative">
                                <Sparkles className="h-7 w-7 text-primary-600 transition-colors group-hover:text-primary-500" />
                                <div className="absolute inset-0 bg-primary-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                CarenSisterlocks
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-3">
                            <Link
                                to="/login"
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-200"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/book"
                                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                Book Appointment
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200"
                            aria-label="Toggle mobile menu"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                <div
                    className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                    <div className="bg-white border-t border-gray-100 px-4 py-4 space-y-2">
                        <Link
                            to="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-200 font-medium"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/book"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-4 py-3 text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 rounded-xl text-center font-medium transition-all duration-200"
                        >
                            Book Appointment
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="container-custom py-20">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 text-balance">
                        Beautiful Sisterlocks,
                        <span className="text-primary-600"> Simplified Booking</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 text-balance">
                        Book your appointment in under 2 minutes. No signup required. Professional sisterlocks services in Nairobi.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/book" className="btn btn-primary text-lg px-8 py-3">
                            Book Now
                        </Link>
                        <a href="#services" className="btn btn-outline text-lg px-8 py-3">
                            View Services
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="container-custom py-20">
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="card card-hover text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-primary-100 rounded-full">
                                <Calendar className="h-8 w-8 text-primary-600" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Easy Booking</h3>
                        <p className="text-gray-600">
                            Book your appointment in minutes without creating an account. Simple and fast.
                        </p>
                    </div>

                    <div className="card card-hover text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-secondary-100 rounded-full">
                                <Clock className="h-8 w-8 text-secondary-600" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Real-Time Availability</h3>
                        <p className="text-gray-600">
                            See available time slots in real-time and choose what works best for you.
                        </p>
                    </div>

                    <div className="card card-hover text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-green-100 rounded-full">
                                <CreditCard className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Secure M-Pesa Payments</h3>
                        <p className="text-gray-600">
                            Pay deposits securely via M-Pesa for guaranteed appointments.
                        </p>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section id="services" className="container-custom py-20 bg-white rounded-3xl shadow-sm">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
                    <p className="text-xl text-gray-600">Professional sisterlocks and hair care services</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary-300 transition-colors">
                        <h3 className="text-2xl font-semibold mb-2">Reties</h3>
                        <p className="text-gray-600 mb-4">
                            Maintain your sisterlocks with professional retightening services.
                        </p>
                        <p className="text-sm text-gray-500">Duration varies • Price varies</p>
                    </div>

                    <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary-300 transition-colors">
                        <h3 className="text-2xl font-semibold mb-2">Micro Locks</h3>
                        <p className="text-gray-600 mb-4">
                            Beautiful micro locks installation and maintenance.
                        </p>
                        <p className="text-sm text-gray-500">Duration varies • Price varies</p>
                    </div>

                    <div className="border-2 border-primary-300 rounded-xl p-6 bg-primary-50">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-2xl font-semibold">Sisterlocks Installation</h3>
                            <span className="badge badge-info">Deposit Required</span>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Complete sisterlocks installation by certified professionals.
                        </p>
                        <p className="text-sm text-gray-500">4-8 hours • From KES 15,000 • Deposit: KES 5,000</p>
                    </div>

                    <div className="border-2 border-primary-300 rounded-xl p-6 bg-primary-50">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-2xl font-semibold">Undoing Dreadlocks</h3>
                            <span className="badge badge-info">Deposit Required</span>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Professional dreadlock removal with care for your natural hair.
                        </p>
                        <p className="text-sm text-gray-500">3-6 hours • Price varies • Deposit: KES 5,000</p>
                    </div>
                </div>

                <div className="text-center mt-12">
                    <Link to="/book" className="btn btn-primary text-lg px-8 py-3">
                        Book Your Appointment
                    </Link>
                </div>
            </section>

            {/* Why Choose Us Section */}
            <section className="container-custom py-20">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Us</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <Users className="h-12 w-12 text-primary-600" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Expert Stylists</h3>
                        <p className="text-gray-600">
                            Our team of 3 certified professionals brings years of experience in sisterlocks and natural hair care.
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <Shield className="h-12 w-12 text-primary-600" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Quality Guaranteed</h3>
                        <p className="text-gray-600">
                            We use only the best products and techniques to ensure beautiful, long-lasting results.
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <Clock className="h-12 w-12 text-primary-600" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Flexible Hours</h3>
                        <p className="text-gray-600">
                            Open Monday-Saturday with extended hours to fit your schedule. Book up to 30 days in advance.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="container-custom py-20">
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-12 text-center text-white">
                    <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
                    <p className="text-xl mb-8 opacity-90">
                        Book your appointment today and experience the best sisterlocks service in Nairobi.
                    </p>
                    <Link to="/book" className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3">
                        Book Appointment Now
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="container-custom py-12 border-t border-gray-200">
                <div className="flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <Sparkles className="h-6 w-6 text-primary-600" />
                        <span className="text-lg font-semibold text-gray-900">CarenSisterlocks</span>
                    </div>
                    <div className="text-gray-600">
                        <p>© 2025 CarenSisterlocks. All rights reserved.</p>
                    </div>
                    <div className="flex items-center space-x-6 mt-4 md:mt-0">
                        <a href="tel:+254700123456" className="text-gray-600 hover:text-primary-600">
                            +254 700 123 456
                        </a>
                        <a href="mailto:info@carensisterlocks.com" className="text-gray-600 hover:text-primary-600">
                            Contact Us
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
