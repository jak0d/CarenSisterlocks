import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface NavigationItem {
    name: string;
    href: string;
    icon: React.ReactNode;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    title: string;
    navigation: NavigationItem[];
}

export default function DashboardLayout({ children, title, navigation }: DashboardLayoutProps) {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
    const displayRole = user?.role || 'User';

    const handleSignOut = async () => {
        try {
            await signOut();
            toast.success('Signed out successfully');
            navigate('/');
        } catch (error) {
            toast.error('Failed to sign out');
        }
    };

    const isActiveLink = (href: string) => {
        // Exact match for dashboard root, prefix match for other pages
        if (href === '/admin' || href === '/worker' || href === '/client') {
            return location.pathname === href;
        }
        return location.pathname === href || location.pathname.startsWith(href + '/');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Modern Navigation Header */}
            <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-[72px]">

                        {/* Left Section - Brand/Logo */}
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

                        {/* Center Section - Navigation Links (Desktop) */}
                        <nav className="hidden md:flex items-center space-x-1">
                            {navigation.map((item) => {
                                const isActive = isActiveLink(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={`
                                            flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm
                                            transition-all duration-200 ease-out
                                            ${isActive
                                                ? 'bg-primary-50 text-primary-700 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <span className={`transition-colors ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
                                            {item.icon}
                                        </span>
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Right Section - User Profile & Sign Out */}
                        <div className="flex items-center space-x-3 md:space-x-4">
                            {/* User Profile Info (Desktop) */}
                            <div className="hidden md:flex items-center space-x-3">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                                        {displayName}
                                    </p>
                                    <p className="text-xs text-gray-500 capitalize leading-tight">
                                        {displayRole}
                                    </p>
                                </div>

                                {/* User Avatar */}
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-sm">
                                    <span className="text-sm font-semibold text-white uppercase">
                                        {displayName.charAt(0)}
                                    </span>
                                </div>
                            </div>

                            {/* Divider (Desktop) */}
                            <div className="hidden md:block h-8 w-px bg-gray-200" />

                            {/* Sign Out Button (Desktop) */}
                            <button
                                onClick={handleSignOut}
                                className="
                                    hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg
                                    text-gray-500 hover:text-gray-700 hover:bg-gray-50
                                    transition-all duration-200 group
                                "
                            >
                                <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                                <span className="text-sm font-medium">Sign Out</span>
                            </button>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="
                                    md:hidden flex items-center justify-center h-10 w-10 rounded-lg
                                    text-gray-500 hover:text-gray-700 hover:bg-gray-50
                                    transition-all duration-200
                                "
                                aria-label="Toggle mobile menu"
                            >
                                {mobileMenuOpen ? (
                                    <X className="h-5 w-5" />
                                ) : (
                                    <Menu className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                <div
                    className={`
                        md:hidden overflow-hidden transition-all duration-300 ease-in-out
                        ${mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                    `}
                >
                    <div className="bg-white border-t border-gray-100 shadow-inner">
                        <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
                            {/* Mobile User Info */}
                            <div className="flex items-center space-x-3 px-3 py-3 mb-3 bg-gray-50 rounded-xl">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-sm">
                                    <span className="text-sm font-semibold text-white uppercase">
                                        {displayName.charAt(0)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                                    <p className="text-xs text-gray-500 capitalize">{displayRole}</p>
                                </div>
                            </div>

                            {/* Mobile Navigation Links */}
                            {navigation.map((item) => {
                                const isActive = isActiveLink(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`
                                            flex items-center space-x-3 px-3 py-3 rounded-xl font-medium
                                            transition-all duration-200
                                            ${isActive
                                                ? 'bg-primary-50 text-primary-700'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <span className={isActive ? 'text-primary-600' : 'text-gray-400'}>
                                            {item.icon}
                                        </span>
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}

                            {/* Mobile Sign Out */}
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    handleSignOut();
                                }}
                                className="
                                    flex items-center space-x-3 w-full px-3 py-3 rounded-xl font-medium
                                    text-gray-600 hover:text-gray-900 hover:bg-gray-50
                                    transition-all duration-200 mt-2 border-t border-gray-100 pt-4
                                "
                            >
                                <LogOut className="h-4 w-4 text-gray-400" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">{title}</h1>
                {children}
            </main>
        </div>
    );
}
